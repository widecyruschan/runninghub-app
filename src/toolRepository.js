const crypto = require('crypto');

const VALID_TOOL_STATUS = new Set(['draft', 'active', 'inactive']);
const VALID_INPUT_DATA_TYPES = new Set(['image', 'video', 'number', 'textarea', 'text', 'select']);

function createToolRepository(database) {
  const statements = {
    list: database.prepare(`
      SELECT
        tools.*,
        tool_categories.name AS category_name,
        tool_categories.category_key AS category_key
      FROM tools
      LEFT JOIN tool_categories
        ON tool_categories.id = tools.category_id
      ORDER BY tools.sort_order ASC, tools.created_at DESC
    `),
    findById: database.prepare(`
      SELECT
        tools.*,
        tool_categories.name AS category_name,
        tool_categories.category_key AS category_key
      FROM tools
      LEFT JOIN tool_categories
        ON tool_categories.id = tools.category_id
      WHERE tools.id = ?
    `),
    findBySlug: database.prepare(`
      SELECT
        tools.*,
        tool_categories.name AS category_name,
        tool_categories.category_key AS category_key
      FROM tools
      LEFT JOIN tool_categories
        ON tool_categories.id = tools.category_id
      WHERE tools.slug = ?
    `),
    findByIdOrSlug: database.prepare(`
      SELECT
        tools.*,
        tool_categories.name AS category_name,
        tool_categories.category_key AS category_key
      FROM tools
      LEFT JOIN tool_categories
        ON tool_categories.id = tools.category_id
      WHERE tools.id = ? OR tools.slug = ?
    `),
    findByLastTestTaskId: database.prepare(`
      SELECT
        tools.*,
        tool_categories.name AS category_name,
        tool_categories.category_key AS category_key
      FROM tools
      LEFT JOIN tool_categories
        ON tool_categories.id = tools.category_id
      WHERE tools.last_test_task_id = ?
    `),
    listActive: database.prepare(`
      SELECT
        tools.*,
        tool_categories.name AS category_name,
        tool_categories.category_key AS category_key
      FROM tools
      LEFT JOIN tool_categories
        ON tool_categories.id = tools.category_id
      WHERE tools.status = 'active'
      ORDER BY tools.sort_order ASC, tools.created_at DESC
    `),
    findByToolKey: database.prepare(`
      SELECT *
      FROM tools
      WHERE tool_key = ?
    `),
    insert: database.prepare(`
      INSERT INTO tools (
        id,
        tool_key,
        name,
        slug,
        category_id,
        short_description,
        top_detail_html,
        detail_html,
        preview_image_url,
        workflow_id,
        instance_type,
        status,
        sort_order,
        input_nodes_json,
        output_config_json,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @toolKey,
        @name,
        @slug,
        @categoryId,
        @shortDescription,
        @topDetailHtml,
        @detailHtml,
        @previewImageUrl,
        @workflowId,
        @instanceType,
        @status,
        @sortOrder,
        @inputNodesJson,
        @outputConfigJson,
        @createdAt,
        @updatedAt
      )
    `),
    update: database.prepare(`
      UPDATE tools
      SET
        tool_key = @toolKey,
        name = @name,
        slug = @slug,
        category_id = @categoryId,
        short_description = @shortDescription,
        top_detail_html = @topDetailHtml,
        detail_html = @detailHtml,
        preview_image_url = @previewImageUrl,
        workflow_id = @workflowId,
        instance_type = @instanceType,
        status = @status,
        sort_order = @sortOrder,
        input_nodes_json = @inputNodesJson,
        output_config_json = @outputConfigJson,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updateTestResult: database.prepare(`
      UPDATE tools
      SET
        last_test_status = @lastTestStatus,
        last_test_task_id = @lastTestTaskId,
        last_test_error = @lastTestError,
        last_tested_at = @lastTestedAt,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updateStatus: database.prepare(`
      UPDATE tools
      SET
        status = @status,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    count: database.prepare('SELECT COUNT(*) AS count FROM tools')
  };

  function listTools() {
    return statements.list.all().map(mapToolRecord);
  }

  function listActiveTools() {
    return statements.listActive.all().map(mapPublicToolRecord);
  }

  function getToolById(id) {
    const record = statements.findById.get(id);
    return record ? mapToolRecord(record) : null;
  }

  function getActiveToolBySlug(slug) {
    const record = statements.findBySlug.get(slug);
    if (!record || record.status !== 'active') return null;
    return mapPublicToolRecord(record);
  }

  function getActiveToolByIdOrSlug(idOrSlug) {
    const record = statements.findByIdOrSlug.get(idOrSlug, idOrSlug);
    if (!record || record.status !== 'active') return null;
    return mapPublicToolRecord(record);
  }

  function getToolByLastTestTaskId(taskId) {
    const record = statements.findByLastTestTaskId.get(taskId);
    return record ? mapToolRecord(record) : null;
  }

  function saveTool(rawTool) {
    const normalizedTool = normalizeToolPayload(rawTool);
    const now = new Date().toISOString();
    const existingTool = normalizedTool.id ? getToolById(normalizedTool.id) : null;
    const id = existingTool ? existingTool.id : crypto.randomUUID();

    const databasePayload = {
      ...normalizedTool,
      id,
      createdAt: existingTool?.createdAt || now,
      updatedAt: now,
      inputNodesJson: JSON.stringify(normalizedTool.inputNodes),
      outputConfigJson: JSON.stringify(normalizedTool.outputConfig)
    };

    try {
      if (existingTool) {
        statements.update.run(databasePayload);
      } else {
        statements.insert.run(databasePayload);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const conflictError = new Error('工具識別碼已存在');
        conflictError.statusCode = 409;
        conflictError.code = 'TOOL_KEY_EXISTS';
        throw conflictError;
      }

      throw error;
    }

    return getToolById(id);
  }

  function saveToolTestResult(id, testResult) {
    const now = new Date().toISOString();

    statements.updateTestResult.run({
      id,
      lastTestStatus: testResult.status,
      lastTestTaskId: testResult.taskId || '',
      lastTestError: testResult.error || '',
      lastTestedAt: now,
      updatedAt: now
    });

    return getToolById(id);
  }

  function updateToolStatus(id, status) {
    if (!VALID_TOOL_STATUS.has(status)) {
      throwValidationError('工具狀態不正確', 'TOOL_STATUS_INVALID');
    }

    const tool = getToolById(id);
    if (!tool) {
      const error = new Error('工具不存在');
      error.statusCode = 404;
      error.code = 'TOOL_NOT_FOUND';
      throw error;
    }

    if (status === 'active' && tool.lastTestStatus !== 'success') {
      const error = new Error('工具需測試成功後才能上線');
      error.statusCode = 409;
      error.code = 'TOOL_TEST_REQUIRED';
      throw error;
    }

    statements.updateStatus.run({
      id,
      status,
      updatedAt: new Date().toISOString()
    });

    return getToolById(id);
  }

  function seedDefaultTools() {
    const { count } = statements.count.get();
    if (count > 0) return;

    saveTool({
      toolKey: 'remove-background',
      name: '圖片背景移除',
      slug: 'remove-background',
      categoryId: 'image',
      shortDescription: '上傳圖片後自動移除背景，輸出透明 PNG。',
      detailHtml: '<h2>工具說明</h2><p>上傳圖片後，系統會自動移除背景並輸出透明 PNG，適合商品圖、頭像和素材處理。</p>',
      previewImageUrl: 'https://images.unsplash.com/photo-1520975682031-a87d82c5b6d8?auto=format&fit=crop&w=900&q=80',
      workflowId: '2075488908690935809',
      instanceType: 'default',
      status: 'active',
      sortOrder: 10,
      inputNodes: [
        {
          nodeId: '9',
          fieldName: 'image',
          key: 'sourceImage',
          dataType: 'image',
          label: '上傳圖片',
          placeholder: '請選擇 JPG、PNG 或 WebP 圖片',
          required: true,
          options: []
        }
      ],
      outputConfig: {
        outputType: 'image',
        previewMode: 'image',
        fallbackPaths: ['fileUrl', 'url', 'file_url', 'download_url']
      }
    });
  }

  return {
    getToolById,
    getToolByLastTestTaskId,
    getActiveToolByIdOrSlug,
    getActiveToolBySlug,
    listActiveTools,
    listTools,
    saveToolTestResult,
    saveTool,
    updateToolStatus,
    seedDefaultTools
  };
}

function normalizeToolPayload(rawTool) {
  const tool = rawTool && typeof rawTool === 'object' ? rawTool : {};
  const inputNodes = Array.isArray(tool.inputNodes) ? tool.inputNodes : [];
  const normalizedInputNodes = inputNodes.map(normalizeInputNode);
  const status = String(tool.status || 'draft').trim();

  if (!tool.name || !String(tool.name).trim()) {
    throwValidationError('工具名稱必填', 'TOOL_NAME_REQUIRED');
  }

  if (!tool.toolKey && !tool.key) {
    throwValidationError('工具識別碼必填', 'TOOL_KEY_REQUIRED');
  }

  if (!tool.workflowId || !String(tool.workflowId).trim()) {
    throwValidationError('workflowID 必填', 'WORKFLOW_ID_REQUIRED');
  }

  if (!normalizedInputNodes.length) {
    throwValidationError('至少需要一個輸入節點', 'INPUT_NODE_REQUIRED');
  }

  if (!VALID_TOOL_STATUS.has(status)) {
    throwValidationError('工具狀態不正確', 'TOOL_STATUS_INVALID');
  }

  const toolKey = slugify(String(tool.toolKey || tool.key));

  if (!toolKey) {
    throwValidationError('工具識別碼格式不正確', 'TOOL_KEY_INVALID');
  }

  return {
    id: tool.id ? String(tool.id) : '',
    toolKey,
    name: String(tool.name).trim(),
    slug: slugify(String(tool.slug || toolKey)),
    categoryId: String(tool.categoryId || tool.category_id || 'image').trim() || 'image',
    shortDescription: String(tool.shortDescription || tool.description || '').trim(),
    topDetailHtml: sanitizeDetailHtml(tool.topDetailHtml || tool.top_detail_html || ''),
    detailHtml: sanitizeDetailHtml(tool.detailHtml || tool.detail_html || ''),
    previewImageUrl: String(tool.previewImageUrl || tool.preview_image_url || '').trim(),
    workflowId: String(tool.workflowId).trim(),
    instanceType: String(tool.instanceType || 'default').trim(),
    status,
    sortOrder: toInteger(tool.sortOrder, 100),
    inputNodes: normalizedInputNodes,
    outputConfig: normalizeOutputConfig(tool.outputConfig)
  };
}

function normalizeInputNode(rawNode, index) {
  const node = rawNode && typeof rawNode === 'object' ? rawNode : {};
  const dataType = String(node.dataType || '').trim();

  if (!node.nodeId || !String(node.nodeId).trim()) {
    throwValidationError(`第 ${index + 1} 個輸入節點缺少 nodeId`, 'INPUT_NODE_ID_REQUIRED');
  }

  if (!node.fieldName || !String(node.fieldName).trim()) {
    throwValidationError(`第 ${index + 1} 個輸入節點缺少內容項欄位`, 'INPUT_FIELD_NAME_REQUIRED');
  }

  if (!VALID_INPUT_DATA_TYPES.has(dataType)) {
    throwValidationError(`第 ${index + 1} 個輸入節點資料類型不正確`, 'INPUT_DATA_TYPE_INVALID');
  }

  return {
    nodeId: String(node.nodeId).trim(),
    fieldName: String(node.fieldName).trim(),
    key: String(node.key || node.fieldName).trim(),
    dataType,
    label: String(node.label || '').trim(),
    placeholder: String(node.placeholder || '').trim(),
    defaultValue: node.defaultValue ?? '',
    required: Boolean(node.required),
    options: normalizeNodeOptions(node.options)
  };
}

function normalizeNodeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions
    .map((option) => ({
      label: String(option?.label || '').trim(),
      value: String(option?.value || '').trim()
    }))
    .filter((option) => option.label || option.value);
}

function normalizeOutputConfig(outputConfig) {
  if (!outputConfig || typeof outputConfig !== 'object') {
    return {
      outputType: 'image',
      previewMode: 'image',
      fallbackPaths: ['fileUrl', 'url', 'file_url', 'download_url']
    };
  }

  return outputConfig;
}

function mapToolRecord(record) {
  return {
    id: record.id,
    toolKey: record.tool_key,
    key: record.tool_key,
    name: record.name,
    slug: record.slug,
    categoryId: record.category_id,
    category_id: record.category_id,
    categoryKey: record.category_key || record.category_id,
    categoryName: record.category_name || getFallbackCategoryName(record.category_id),
    shortDescription: record.short_description,
    description: record.short_description,
    topDetailHtml: sanitizeDetailHtml(record.top_detail_html || ''),
    detailHtml: sanitizeDetailHtml(record.detail_html || ''),
    previewImageUrl: record.preview_image_url,
    preview_image_url: record.preview_image_url,
    workflowId: record.workflow_id,
    instanceType: record.instance_type,
    status: record.status,
    statusLabel: getStatusLabel(record.status),
    statusClass: getStatusClass(record.status),
    lastTestStatus: record.last_test_status || 'untested',
    lastTestStatusLabel: getTestStatusLabel(record.last_test_status || 'untested'),
    lastTestStatusClass: getTestStatusClass(record.last_test_status || 'untested'),
    lastTestTaskId: record.last_test_task_id || '',
    lastTestError: record.last_test_error || '',
    lastTestedAt: record.last_tested_at,
    sortOrder: record.sort_order,
    inputNodes: parseJson(record.input_nodes_json, []),
    outputConfig: parseJson(record.output_config_json, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapPublicToolRecord(record) {
  const tool = mapToolRecord(record);

  return {
    id: tool.id,
    toolKey: tool.toolKey,
    key: tool.toolKey,
    name: tool.name,
    slug: tool.slug,
    categoryId: tool.categoryId,
    categoryKey: tool.categoryKey,
    categoryName: tool.categoryName,
    shortDescription: tool.shortDescription,
    description: tool.shortDescription,
    topDetailHtml: tool.topDetailHtml,
    detailHtml: tool.detailHtml,
    previewImageUrl: tool.previewImageUrl,
    workflowId: tool.workflowId,
    instanceType: tool.instanceType,
    estimatedSeconds: 30,
    inputNodes: tool.inputNodes,
    outputConfig: tool.outputConfig
  };
}

function sanitizeDetailHtml(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
    .trim();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function getStatusLabel(status) {
  const labels = {
    active: '已上線',
    draft: '草稿',
    inactive: '已停用'
  };

  return labels[status] || status;
}

function getStatusClass(status) {
  const classes = {
    active: 'status-active',
    draft: 'status-draft',
    inactive: 'status-error'
  };

  return classes[status] || 'status-draft';
}

function getTestStatusLabel(status) {
  const labels = {
    success: '測試成功',
    failed: '測試失敗',
    running: '測試中',
    untested: '未測試'
  };

  return labels[status] || '未測試';
}

function getTestStatusClass(status) {
  const classes = {
    success: 'status-success',
    failed: 'status-error',
    running: 'status-processing',
    untested: 'status-draft'
  };

  return classes[status] || 'status-draft';
}

function getFallbackCategoryName(categoryId) {
  const names = {
    image: '圖像',
    video: '視頻',
    audio: '音頻',
    text: '文本'
  };

  return names[categoryId] || '未分類';
}

function throwValidationError(message, code) {
  const error = new Error(message);
  error.statusCode = 422;
  error.code = code;
  throw error;
}

module.exports = {
  createToolRepository
};
