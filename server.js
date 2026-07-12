const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createDatabase } = require('./src/database');
const { createToolRepository } = require('./src/toolRepository');
const { createCategoryRepository } = require('./src/categoryRepository');
const { createTaskRepository } = require('./src/taskRepository');

const PUBLIC_DIR = path.join(__dirname, 'frontend');
const DEFAULT_PORT = 3000;
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024;
const MAX_JSON_BODY_SIZE = 18 * 1024 * 1024;

loadEnvFile(path.join(__dirname, '.env'));

const runningHubApiKey = process.env.RUNNINGHUB_API_KEY;
const runningHubApiBaseUrl = process.env.RUNNINGHUB_API_BASE_URL || 'https://www.runninghub.cn/openapi/v2';
const runningHubTaskApiBaseUrl = process.env.RUNNINGHUB_TASK_API_BASE_URL || 'https://www.runninghub.cn/task/openapi';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const port = Number(process.env.PORT || DEFAULT_PORT);
const host = process.env.HOST || '0.0.0.0';
const database = createDatabase();
const toolRepository = createToolRepository(database);
const categoryRepository = createCategoryRepository(database);
const taskRepository = createTaskRepository(database);

toolRepository.seedDefaultTools();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const adminRoutePrefixes = [
  '/admin',
  '/admin/',
  '/admin/tools',
  '/admin/categories',
  '/admin/workflows',
  '/admin/memberships',
  '/admin/tasks',
  '/admin/content',
  '/admin/settings'
];

const frontendRoutePrefixes = [
  '/tools'
];
const adminSessions = new Map();
const ADMIN_SESSION_COOKIE = 'runninghub_admin_session';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/api/admin/')) {
      await handleAdminApi(request, response);
      return;
    }

    if (request.url.startsWith('/api/tasks')) {
      await handleTaskApi(request, response);
      return;
    }

    if (request.url.startsWith('/api/tools') || request.url.startsWith('/api/categories')) {
      await handlePublicApi(request, response);
      return;
    }

    if (request.url.startsWith('/api/runninghub/')) {
      await handleRunningHubApi(request, response);
      return;
    }

    await serveStaticFile(request, response);
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) {
      console.error('伺服器錯誤:', error);
    }

    sendJson(response, error.statusCode || 500, {
      success: false,
      message: error.statusCode ? error.message : '伺服器處理請求失敗',
      error: { code: error.code || 'INTERNAL_SERVER_ERROR' }
    });
  }
});

server.listen(port, host, () => {
  console.log(`RunningHub demo server: http://${host}:${port}`);
  console.log(`Local access URL: http://127.0.0.1:${port}`);
  console.log(`RUNNINGHUB_API_KEY: ${runningHubApiKey ? '已配置' : '未配置'}`);
  console.log(`ADMIN_USERNAME: ${adminUsername}`);
});

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

async function handleRunningHubApi(request, response) {
  if (!runningHubApiKey) {
    sendJson(response, 500, {
      success: false,
      message: '後端未配置 RUNNINGHUB_API_KEY',
      error: { code: 'RUNNINGHUB_API_KEY_MISSING' }
    });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === 'POST' && url.pathname === '/api/runninghub/upload') {
    await proxyUploadImage(request, response);
    return;
  }

  const workflowMatch = url.pathname.match(/^\/api\/runninghub\/workflow\/([^/]+)$/);
  if (request.method === 'POST' && workflowMatch) {
    const requestBody = await readJsonBody(request);
    await proxyJson(response, `${runningHubApiBaseUrl}/run/workflow/${workflowMatch[1]}`, requestBody);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/runninghub/status') {
    const requestBody = await readJsonBody(request);
    await proxyJson(response, `${runningHubTaskApiBaseUrl}/status`, {
      apiKey: runningHubApiKey,
      taskId: requestBody.taskId
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/runninghub/outputs') {
    const requestBody = await readJsonBody(request);
    await proxyJson(response, `${runningHubTaskApiBaseUrl}/outputs`, {
      apiKey: runningHubApiKey,
      taskId: requestBody.taskId
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: '介面不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function handleAdminApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/admin/auth/login' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const username = String(requestBody.username || '').trim();
    const password = String(requestBody.password || '');

    if (!isValidAdminCredential(username, password)) {
      sendJson(response, 401, {
        success: false,
        message: '帳號或密碼不正確',
        error: { code: 'ADMIN_LOGIN_FAILED' }
      });
      return;
    }

    const sessionId = createAdminSession(username);
    sendJson(response, 200, {
      success: true,
      message: '登入成功',
      data: { username }
    }, {
      'Set-Cookie': createSessionCookie(request, sessionId)
    });
    return;
  }

  if (url.pathname === '/api/admin/auth/logout' && request.method === 'POST') {
    const sessionId = getCookieValue(request, ADMIN_SESSION_COOKIE);
    if (sessionId) adminSessions.delete(sessionId);

    sendJson(response, 200, {
      success: true,
      message: '已登出',
      data: null
    }, {
      'Set-Cookie': createExpiredSessionCookie(request)
    });
    return;
  }

  if (url.pathname === '/api/admin/auth/me' && request.method === 'GET') {
    const session = getAdminSession(request);
    if (!session) {
      sendUnauthorized(response);
      return;
    }

    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: { username: session.username }
    });
    return;
  }

  if (!getAdminSession(request)) {
    sendUnauthorized(response);
    return;
  }

  if (url.pathname === '/api/admin/tools' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: toolRepository.listTools()
    });
    return;
  }

  if (url.pathname === '/api/admin/tools' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const savedTool = toolRepository.saveTool(requestBody);

    sendJson(response, requestBody.id ? 200 : 201, {
      success: true,
      message: '工具配置已儲存',
      data: savedTool
    });
    return;
  }

  const toolTestMatch = url.pathname.match(/^\/api\/admin\/tools\/([^/]+)\/test$/);
  if (toolTestMatch && request.method === 'POST') {
    const toolId = decodeURIComponent(toolTestMatch[1]);
    const requestBody = await readJsonBody(request);
    const result = await testAdminTool(toolId, requestBody);

    sendJson(response, 201, {
      success: true,
      message: '測試任務已建立',
      data: result
    });
    return;
  }

  const toolStatusMatch = url.pathname.match(/^\/api\/admin\/tools\/([^/]+)\/status$/);
  if (toolStatusMatch && request.method === 'PATCH') {
    const toolId = decodeURIComponent(toolStatusMatch[1]);
    const requestBody = await readJsonBody(request);
    const savedTool = toolRepository.updateToolStatus(toolId, String(requestBody.status || '').trim());

    sendJson(response, 200, {
      success: true,
      message: '工具狀態已更新',
      data: savedTool
    });
    return;
  }

  if (url.pathname === '/api/admin/categories' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: categoryRepository.listCategories()
    });
    return;
  }

  if (url.pathname === '/api/admin/categories' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const savedCategory = categoryRepository.saveCategory(requestBody);

    sendJson(response, requestBody.id ? 200 : 201, {
      success: true,
      message: '分類已儲存',
      data: savedCategory
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: '介面不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function handlePublicApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/tools' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: toolRepository.listActiveTools()
    });
    return;
  }

  const executeMatch = url.pathname.match(/^\/api\/tools\/([^/]+)\/execute$/);
  if (executeMatch && request.method === 'POST') {
    const idOrSlug = decodeURIComponent(executeMatch[1]);
    const requestBody = await readJsonBody(request);
    const result = await executeConfiguredTool(idOrSlug, requestBody);

    sendJson(response, 201, {
      success: true,
      message: '任務已建立',
      data: result
    });
    return;
  }

  const toolMatch = url.pathname.match(/^\/api\/tools\/([^/]+)$/);
  if (toolMatch && request.method === 'GET') {
    const slug = decodeURIComponent(toolMatch[1]);
    const tool = toolRepository.getActiveToolBySlug(slug);

    if (!tool) {
      sendJson(response, 404, {
        success: false,
        message: '工具不存在或未上線',
        error: { code: 'TOOL_NOT_FOUND' }
      });
      return;
    }

    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: tool
    });
    return;
  }

  if (url.pathname === '/api/categories' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: categoryRepository.listCategories().filter((category) => category.status === 'active')
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: '介面不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function handleTaskApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  const outputsMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/outputs$/);
  if (outputsMatch && request.method === 'GET') {
    const taskId = decodeURIComponent(outputsMatch[1]);
    const task = await getTaskOutputs(taskId);

    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: {
        task,
        outputs: task.outputValues,
        outputUrls: task.outputUrls
      }
    });
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && request.method === 'GET') {
    const taskId = decodeURIComponent(taskMatch[1]);
    const task = await syncTaskStatus(taskId);

    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: task
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: '介面不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function executeConfiguredTool(idOrSlug, requestBody) {
  ensureRunningHubConfigured();

  const tool = toolRepository.getActiveToolByIdOrSlug(idOrSlug);
  if (!tool) {
    throwHttpError('工具不存在或未上線', 'TOOL_NOT_FOUND', 404);
  }

  return executeToolWithConfig(tool, requestBody);
}

async function testAdminTool(toolId, requestBody) {
  ensureRunningHubConfigured();

  const tool = toolRepository.getToolById(toolId);
  if (!tool) {
    throwHttpError('工具不存在', 'TOOL_NOT_FOUND', 404);
  }

  toolRepository.saveToolTestResult(tool.id, {
    status: 'running',
    taskId: '',
    error: ''
  });

  try {
    const result = await executeToolWithConfig(tool, requestBody);
    const savedTool = toolRepository.saveToolTestResult(tool.id, {
      status: 'running',
      taskId: result.taskId,
      error: ''
    });

    return {
      ...result,
      status: 'RUNNING',
      outputUrls: [],
      tool: savedTool
    };
  } catch (error) {
    const savedTool = toolRepository.saveToolTestResult(tool.id, {
      status: 'failed',
      taskId: '',
      error: error.message || '工具測試失敗'
    });

    error.testTool = savedTool;
    throw error;
  }
}

async function executeToolWithConfig(tool, requestBody) {
  const rawInputValues = requestBody?.inputValues && typeof requestBody.inputValues === 'object'
    ? requestBody.inputValues
    : {};
  const normalizedInputValues = {};
  const task = taskRepository.createTask({
    tool,
    inputValues: sanitizeInputValues(tool, rawInputValues),
    nodeInfoList: []
  });

  try {
    const nodeInfoList = await buildNodeInfoList(tool, rawInputValues, normalizedInputValues);
    taskRepository.updateTaskPayload(task.id, normalizedInputValues, nodeInfoList);

    const runningHubResponse = await callRunningHubJson(`${runningHubApiBaseUrl}/run/workflow/${tool.workflowId}`, {
      addMetadata: true,
      nodeInfoList,
      instanceType: tool.instanceType || 'default',
      usePersonalQueue: false
    });
    const runningHubTaskId = extractRunningHubTaskId(runningHubResponse);

    if (!runningHubTaskId) {
      throwHttpError('任務建立失敗，未返回任務 ID', 'RUNNINGHUB_TASK_ID_MISSING', 502);
    }

    const savedTask = taskRepository.attachRunningHubTask(task.id, runningHubTaskId, 'QUEUED');

    return {
      taskId: savedTask.id,
      runningHubTaskId: savedTask.runningHubTaskId,
      status: savedTask.status,
      tool: {
        id: tool.id,
        slug: tool.slug,
        name: tool.name
      }
    };
  } catch (error) {
    taskRepository.markTaskStatus(task.id, 'FAILED', {
      code: error.code || 'TASK_CREATE_FAILED',
      message: error.message || '任務建立失敗'
    });
    throw error;
  }
}

async function buildNodeInfoList(tool, rawInputValues, normalizedInputValues) {
  const inputNodes = Array.isArray(tool.inputNodes) ? tool.inputNodes : [];

  if (!inputNodes.length) {
    throwHttpError('工具未配置輸入節點', 'INPUT_NODE_REQUIRED', 422);
  }

  const nodeInfoList = [];

  for (const node of inputNodes) {
    const value = await normalizeInputValue(node, rawInputValues);
    normalizedInputValues[node.key] = value;

    nodeInfoList.push({
      nodeId: node.nodeId,
      fieldName: node.fieldName,
      fieldValue: value
    });
  }

  return nodeInfoList;
}

function sanitizeInputValues(tool, rawInputValues) {
  const sanitizedInputValues = {};
  const inputNodes = Array.isArray(tool.inputNodes) ? tool.inputNodes : [];

  inputNodes.forEach((node) => {
    const value = rawInputValues[node.key];

    if (typeof value === 'string' && value.startsWith('data:')) {
      const dataUrlMatch = value.match(/^data:([^;,]+);base64,/);
      sanitizedInputValues[node.key] = {
        kind: 'data-url',
        mimeType: dataUrlMatch?.[1] || '',
        size: value.length
      };
      return;
    }

    sanitizedInputValues[node.key] = value ?? '';
  });

  return sanitizedInputValues;
}

async function normalizeInputValue(node, inputValues) {
  const rawValue = inputValues[node.key];
  const fallbackValue = node.defaultValue ?? '';
  const value = rawValue === undefined || rawValue === null || rawValue === '' ? fallbackValue : rawValue;

  if (node.required && (value === undefined || value === null || value === '')) {
    throwHttpError(`${node.label || node.key} 為必填`, 'INPUT_VALUE_REQUIRED', 422);
  }

  if (node.dataType === 'image' || node.dataType === 'video') {
    if (!value) return '';
    if (typeof value !== 'string') {
      throwHttpError(`${node.label || node.key} 必須是檔案 Data URL 或 URL`, 'UPLOAD_VALUE_INVALID', 422);
    }

    if (value.startsWith('data:')) {
      return uploadMediaDataUrl(value, node.dataType);
    }

    if (!isHttpUrl(value)) {
      throwHttpError(`${node.label || node.key} URL 格式不正確`, 'UPLOAD_URL_INVALID', 422);
    }

    return value;
  }

  if (node.dataType === 'number') {
    if (value === '') return '';

    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      throwHttpError(`${node.label || node.key} 必須是數字`, 'INPUT_NUMBER_INVALID', 422);
    }

    return numberValue;
  }

  if (node.dataType === 'select') {
    const optionValues = Array.isArray(node.options) ? node.options.map((option) => option.value) : [];
    if (value && optionValues.length && !optionValues.includes(String(value))) {
      throwHttpError(`${node.label || node.key} 選項不正確`, 'INPUT_SELECT_INVALID', 422);
    }
  }

  return String(value || '');
}

async function syncTaskStatus(taskId) {
  ensureRunningHubConfigured();

  const task = getExistingTask(taskId);
  if (!task.runningHubTaskId || ['SUCCESS', 'FAILED'].includes(task.status)) {
    return task;
  }

  const statusResponse = await callRunningHubJson(`${runningHubTaskApiBaseUrl}/status`, {
    apiKey: runningHubApiKey,
    taskId: task.runningHubTaskId
  });
  const runningHubStatus = extractRunningHubStatus(statusResponse);

  if (runningHubStatus === 'FAILED') {
    const failedTask = taskRepository.markTaskStatus(task.id, 'FAILED', {
      code: 'RUNNINGHUB_TASK_FAILED',
      message: statusResponse.msg || statusResponse.errorMessage || 'RunningHub 任務執行失敗'
    });
    syncToolTestResult(failedTask);
    return failedTask;
  }

  if (runningHubStatus === 'SUCCESS') {
    const successTask = taskRepository.markTaskStatus(task.id, 'SUCCESS');
    syncToolTestResult(successTask);
    return successTask;
  }

  return taskRepository.markTaskStatus(task.id, normalizeRunningStatus(runningHubStatus));
}

async function getTaskOutputs(taskId) {
  ensureRunningHubConfigured();

  const task = await syncTaskStatus(taskId);
  if (!task.runningHubTaskId) {
    throwHttpError('任務尚未建立 RunningHub taskId', 'RUNNINGHUB_TASK_ID_MISSING', 409);
  }

  if (task.outputUrls.length) {
    return task;
  }

  if (task.status !== 'SUCCESS') {
    throwHttpError('任務尚未完成，暫無輸出結果', 'TASK_NOT_FINISHED', 409);
  }

  const outputsResponse = await callRunningHubJson(`${runningHubTaskApiBaseUrl}/outputs`, {
    apiKey: runningHubApiKey,
    taskId: task.runningHubTaskId
  });
  const outputs = Array.isArray(outputsResponse.data) ? outputsResponse.data : [];
  const tool = toolRepository.getToolById(task.toolId);
  const outputUrls = extractOutputUrls(outputs, tool?.outputConfig);

  const completedTask = taskRepository.completeTask(task.id, outputs, outputUrls);
  syncToolTestResult(completedTask);

  return completedTask;
}

function syncToolTestResult(task) {
  const tool = toolRepository.getToolByLastTestTaskId(task.id);
  if (!tool) return;

  if (task.status === 'SUCCESS') {
    toolRepository.saveToolTestResult(tool.id, {
      status: 'success',
      taskId: task.id,
      error: ''
    });
    return;
  }

  if (task.status === 'FAILED') {
    toolRepository.saveToolTestResult(tool.id, {
      status: 'failed',
      taskId: task.id,
      error: task.errorMessage || '工具測試失敗'
    });
  }
}

async function proxyUploadImage(request, response) {
  const contentType = request.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    sendJson(response, 400, {
      success: false,
      message: '請使用 multipart/form-data 上傳檔案',
      error: { code: 'INVALID_UPLOAD_CONTENT_TYPE' }
    });
    return;
  }

  const bodyBuffer = await readRequestBody(request, MAX_UPLOAD_SIZE);
  const runningHubResponse = await fetchRunningHub(`${runningHubApiBaseUrl}/media/upload/binary`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runningHubApiKey}`,
      'Content-Type': contentType
    },
    body: bodyBuffer
  });

  await pipeRunningHubResponse(response, runningHubResponse);
}

async function proxyJson(response, targetUrl, payload) {
  const runningHubResponse = await fetchRunningHub(targetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runningHubApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  await pipeRunningHubResponse(response, runningHubResponse);
}

function ensureRunningHubConfigured() {
  if (!runningHubApiKey) {
    throwHttpError('後端未配置 RUNNINGHUB_API_KEY', 'RUNNINGHUB_API_KEY_MISSING', 500);
  }
}

async function callRunningHubJson(targetUrl, payload) {
  const runningHubResponse = await fetchRunningHub(targetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runningHubApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const responseText = await runningHubResponse.text();
  const responseData = parseJsonText(responseText);

  if (!runningHubResponse.ok) {
    throwHttpError(
      responseData?.message || responseData?.msg || 'RunningHub 服務調用失敗',
      responseData?.error?.code || responseData?.code || 'RUNNINGHUB_REQUEST_FAILED',
      502
    );
  }

  return responseData;
}

async function uploadMediaDataUrl(dataUrl, expectedType) {
  const parsedDataUrl = parseDataUrl(dataUrl);
  if (!parsedDataUrl.mimeType.startsWith(`${expectedType}/`)) {
    throwHttpError(`請上傳${expectedType === 'image' ? '圖片' : '影片'}檔案`, 'UPLOAD_TYPE_INVALID', 422);
  }

  if (parsedDataUrl.buffer.length > MAX_UPLOAD_SIZE) {
    throwHttpError('上傳檔案超過大小限制', 'UPLOAD_SIZE_EXCEEDED', 413);
  }

  const boundary = `----runninghub-form-${Date.now().toString(16)}`;
  const fileExtension = getExtensionFromMimeType(parsedDataUrl.mimeType, expectedType);
  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="input.${fileExtension}"\r\nContent-Type: ${parsedDataUrl.mimeType}\r\n\r\n`),
    parsedDataUrl.buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const runningHubResponse = await fetchRunningHub(`${runningHubApiBaseUrl}/media/upload/binary`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runningHubApiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });
  const responseText = await runningHubResponse.text();
  const responseData = parseJsonText(responseText);

  if (!runningHubResponse.ok) {
    throwHttpError(
      responseData?.message || responseData?.msg || '檔案上傳到 RunningHub 失敗',
      responseData?.error?.code || responseData?.code || 'RUNNINGHUB_UPLOAD_FAILED',
      502
    );
  }

  const uploadedUrl = responseData?.data?.download_url
    || responseData?.data?.fileUrl
    || responseData?.data?.url
    || responseData?.url;

  if (!uploadedUrl) {
    throwHttpError('檔案上傳失敗，未返回檔案位址', 'RUNNINGHUB_UPLOAD_URL_MISSING', 502);
  }

  return uploadedUrl;
}

async function fetchRunningHub(targetUrl, options) {
  try {
    return await fetch(targetUrl, options);
  } catch (error) {
    throwHttpError('RunningHub 服務暫時無法連線', 'RUNNINGHUB_NETWORK_ERROR', 502);
  }
}

function getExistingTask(taskId) {
  const task = taskRepository.getTaskById(taskId);
  if (!task) {
    throwHttpError('任務不存在', 'TASK_NOT_FOUND', 404);
  }

  return task;
}

function extractRunningHubTaskId(responseData) {
  return responseData?.taskId || responseData?.data?.taskId || responseData?.data?.id || '';
}

function extractRunningHubStatus(responseData) {
  if (responseData?.code !== undefined && responseData.code !== 0) {
    throwHttpError(
      responseData.msg || responseData.errorMessage || '查詢任務狀態失敗',
      responseData.code || 'RUNNINGHUB_STATUS_FAILED',
      502
    );
  }

  return responseData?.data?.status || responseData?.data || responseData?.status || 'RUNNING';
}

function normalizeRunningStatus(status) {
  const normalizedStatus = String(status || 'RUNNING').toUpperCase();
  if (['CREATED', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED'].includes(normalizedStatus)) {
    return normalizedStatus;
  }

  return 'RUNNING';
}

function extractOutputUrls(outputs, outputConfig) {
  const fallbackPaths = Array.isArray(outputConfig?.fallbackPaths) && outputConfig.fallbackPaths.length
    ? outputConfig.fallbackPaths
    : ['fileUrl', 'url', 'file_url', 'download_url'];

  return outputs
    .flatMap((output) => extractOutputUrlsFromValue(output, fallbackPaths))
    .filter(Boolean);
}

function extractOutputUrlsFromValue(value, fallbackPaths) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractOutputUrlsFromValue(item, fallbackPaths));
  }

  if (typeof value === 'object') {
    const directUrls = fallbackPaths
      .map((pathName) => value[pathName])
      .filter(Boolean);
    const nestedUrls = Object.values(value)
      .filter((item) => item && typeof item === 'object')
      .flatMap((item) => extractOutputUrlsFromValue(item, fallbackPaths));

    return [...directUrls, ...nestedUrls];
  }

  return [];
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throwHttpError('檔案 Data URL 格式不正確', 'DATA_URL_INVALID', 422);
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

function getExtensionFromMimeType(mimeType, fallbackType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
  };

  return extensions[mimeType] || (fallbackType === 'image' ? 'png' : 'mp4');
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function parseJsonText(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return { raw: value };
  }
}

function throwHttpError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  throw error;
}

function isValidAdminCredential(username, password) {
  return timingSafeEqual(username, adminUsername) && timingSafeEqual(password, adminPassword);
}

function timingSafeEqual(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue));
  const right = Buffer.from(String(rightValue));
  const maxLength = Math.max(left.length, right.length, 1);
  const paddedLeft = Buffer.alloc(maxLength);
  const paddedRight = Buffer.alloc(maxLength);

  left.copy(paddedLeft);
  right.copy(paddedRight);

  return crypto.timingSafeEqual(paddedLeft, paddedRight) && left.length === right.length;
}

function createAdminSession(username) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  pruneExpiredAdminSessions(now);

  adminSessions.set(sessionId, {
    username,
    expiresAt: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  });

  return sessionId;
}

function getAdminSession(request) {
  const sessionId = getCookieValue(request, ADMIN_SESSION_COOKIE);
  if (!sessionId) return null;

  const session = adminSessions.get(sessionId);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(sessionId);
    return null;
  }

  return session;
}

function pruneExpiredAdminSessions(now = Date.now()) {
  for (const [sessionId, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) {
      adminSessions.delete(sessionId);
    }
  }
}

function getCookieValue(request, cookieName) {
  const cookieHeader = request.headers.cookie || '';
  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim()).filter(Boolean);
  const cookiePrefix = `${cookieName}=`;
  const foundCookie = cookies.find((cookie) => cookie.startsWith(cookiePrefix));

  return foundCookie ? decodeURIComponent(foundCookie.slice(cookiePrefix.length)) : '';
}

function createSessionCookie(request, sessionId) {
  return [
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`,
    shouldUseSecureCookie(request) ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

function createExpiredSessionCookie(request) {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    shouldUseSecureCookie(request) ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

function shouldUseSecureCookie(request) {
  return request.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
}

function sendUnauthorized(response) {
  sendJson(response, 401, {
    success: false,
    message: '請先登入後台',
    error: { code: 'ADMIN_AUTH_REQUIRED' }
  });
}

async function pipeRunningHubResponse(response, runningHubResponse) {
  const responseText = await runningHubResponse.text();
  response.writeHead(runningHubResponse.status, {
    'Content-Type': runningHubResponse.headers.get('content-type') || 'application/json; charset=utf-8'
  });
  response.end(responseText);
}

async function readJsonBody(request) {
  const bodyBuffer = await readRequestBody(request, MAX_JSON_BODY_SIZE);
  if (!bodyBuffer.length) return {};

  try {
    return JSON.parse(bodyBuffer.toString('utf8'));
  } catch (error) {
    const invalidJsonError = new Error('請求 JSON 格式不正確');
    invalidJsonError.statusCode = 400;
    invalidJsonError.code = 'INVALID_JSON';
    throw invalidJsonError;
  }
}

function readRequestBody(request, maxSize) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    request.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        reject(new Error('請求內容超過大小限制'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function serveStaticFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (isAdminRoute(url.pathname)) {
    await sendStaticFile(response, path.join(PUBLIC_DIR, 'admin.html'));
    return;
  }

  if (isFrontendRoute(url.pathname)) {
    await sendStaticFile(response, path.join(PUBLIC_DIR, 'index.html'));
    return;
  }

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const requestedPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, requestedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  await sendStaticFile(response, filePath);
}

function isAdminRoute(pathname) {
  return adminRoutePrefixes.some((routePrefix) => (
    pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
  ));
}

function isFrontendRoute(pathname) {
  return frontendRoutePrefixes.some((routePrefix) => (
    pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
  ));
}

async function sendStaticFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream'
  });
  fs.createReadStream(filePath).pipe(response);
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}
