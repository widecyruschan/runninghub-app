const crypto = require('crypto');

const VALID_TOOL_STATUS = new Set(['draft', 'active', 'inactive']);
const VALID_INPUT_DATA_TYPES = new Set(['image', 'video', 'audio', 'number', 'textarea', 'text', 'select', 'switch']);
const DEFAULT_REMOVE_BACKGROUND_PREVIEW_IMAGE_URL = 'https://lfs.creativefabrica.com/studio/images/lp/background-remover/slazzer-background-remover-1.webp';

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
        credit_cost,
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
        @creditCost,
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
        credit_cost = @creditCost,
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

  async function listTools() {
    const rows = await statements.list.all([]);
    return (rows || []).map(mapToolRecord);
  }

  async function listActiveTools() {
    const rows = await statements.listActive.all([]);
    return (rows || []).map(mapPublicToolRecord);
  }

  async function getToolById(id) {
    const record = await statements.findById.get(id);
    return record ? mapToolRecord(record) : null;
  }

  async function getActiveToolBySlug(slug) {
    const record = await statements.findBySlug.get(slug);
    if (!record || record.status !== 'active') return null;
    return mapPublicToolRecord(record);
  }

  async function getActiveToolByIdOrSlug(idOrSlug) {
    const record = await statements.findByIdOrSlug.get(idOrSlug, idOrSlug);
    if (!record || record.status !== 'active') return null;
    return mapPublicToolRecord(record);
  }

  async function getToolByLastTestTaskId(taskId) {
    const record = await statements.findByLastTestTaskId.get(taskId);
    return record ? mapToolRecord(record) : null;
  }

  async function saveTool(rawTool) {
    const normalizedTool = normalizeToolPayload(rawTool);
    const now = new Date().toISOString();
    const existingTool = normalizedTool.id ? await getToolById(normalizedTool.id) : null;
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
        await statements.update.run(databasePayload);
      } else {
        await statements.insert.run(databasePayload);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'ER_DUP_ENTRY') {
        const conflictError = new Error('工具識別碼已存在');
        conflictError.statusCode = 409;
        conflictError.code = 'TOOL_KEY_EXISTS';
        throw conflictError;
      }

      throw error;
    }

    return await getToolById(id);
  }

  async function saveToolTestResult(id, testResult) {
    const now = new Date().toISOString();

    await statements.updateTestResult.run({
      id,
      lastTestStatus: testResult.status,
      lastTestTaskId: testResult.taskId || '',
      lastTestError: testResult.error || '',
      lastTestedAt: now,
      updatedAt: now
    });

    return await getToolById(id);
  }

  async function updateToolStatus(id, status) {
    if (!VALID_TOOL_STATUS.has(status)) {
      throwValidationError('工具狀態不正確', 'TOOL_STATUS_INVALID');
    }

    const tool = await getToolById(id);
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

    await statements.updateStatus.run({
      id,
      status,
      updatedAt: new Date().toISOString()
    });

    return await getToolById(id);
  }

  async function seedDefaultTools() {
    const { count } = await statements.count.get();
    if (count === 0) {
      await saveTool({
        toolKey: 'remove-background',
        name: '圖片背景移除',
        slug: 'remove-background',
        categoryId: 'image',
        shortDescription: '上傳圖片後自動移除背景，輸出透明 PNG。',
        detailHtml: '<h2>工具說明</h2><p>上傳圖片後，系統會自動移除背景並輸出透明 PNG，適合商品圖、頭像和素材處理。</p>',
        previewImageUrl: DEFAULT_REMOVE_BACKGROUND_PREVIEW_IMAGE_URL,
        creditCost: 1,
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
    seedToolIfMissing({
      toolKey: 'google-nano-banana-pro',
      name: 'Google Nano Banana',
      slug: 'google-nano-banana-pro',
      categoryId: 'image',
      shortDescription: 'Choose Nano Banana, Nano Banana 2 Lite, or Nano Banana Pro to create banners, posters, and product visuals.',
      topDetailHtml: '<p>Choose a Nano Banana model, upload optional reference images, describe the banner or visual you want, then generate a new image.</p>',
      detailHtml: '<h2>Best for</h2><p>Marketing banners, product posters, social visuals, creative composites, and fast model comparison in one tool page.</p>',
      previewImageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=80',
      creditCost: 1,
      workflowId: 'kie:nano-banana',
      instanceType: 'default',
      status: 'active',
      sortOrder: 20,
      inputNodes: [
        createNanoBananaModelNode(),
        {
          nodeId: 'kie-input',
          fieldName: 'image_input',
          key: 'image_input',
          dataType: 'image',
          uploadMode: 'multiple',
          label: 'Reference Images',
          placeholder: 'Upload JPG, PNG, or WebP images',
          required: false,
          maxFiles: 8,
          uploadColumns: 4,
          maxFileSizeMb: 30,
          compressQuality: 90,
          acceptedFileTypes: ['image'],
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'prompt',
          key: 'prompt',
          dataType: 'textarea',
          label: 'Prompt',
          placeholder: 'Describe the banner, poster, layout, style, text, and details you want',
          defaultValue: 'Create a clean product banner with strong composition, polished lighting, readable headline space, premium commercial styling, and a professional advertising layout.',
          required: true,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'aspect_ratio',
          key: 'aspect_ratio',
          dataType: 'select',
          label: 'Aspect Ratio',
          defaultValue: '16:9',
          required: false,
          options: [
            { label: 'Auto', value: 'auto' },
            { label: '1:1', value: '1:1' },
            { label: '2:3', value: '2:3' },
            { label: '3:2', value: '3:2' },
            { label: '3:4', value: '3:4' },
            { label: '4:3', value: '4:3' },
            { label: '4:5', value: '4:5' },
            { label: '5:4', value: '5:4' },
            { label: '9:16', value: '9:16' },
            { label: '16:9', value: '16:9' },
            { label: '21:9', value: '21:9' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'resolution',
          key: 'resolution',
          dataType: 'select',
          label: 'Resolution',
          defaultValue: '1K',
          required: false,
          options: [
            { label: '1K', value: '1K' },
            { label: '2K', value: '2K' },
            { label: '4K', value: '4K' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'output_format',
          key: 'output_format',
          dataType: 'select',
          label: 'Output Format',
          defaultValue: 'png',
          required: false,
          options: [
            { label: 'PNG', value: 'png' },
            { label: 'JPG', value: 'jpg' }
          ]
        }
      ],
      outputConfig: {
        outputType: 'image',
        previewMode: 'image',
        fallbackPaths: ['url', 'fileUrl', 'file_url', 'download_url', 'resultUrls']
      }
    });
    await upgradeNanoBananaTool();

    seedToolIfMissing({
      toolKey: 'google-veo-3-1',
      name: 'Google Veo 3.1',
      slug: 'google-veo-3-1',
      categoryId: 'video',
      shortDescription: 'Generate cinematic videos with Veo 3.1 using text prompts, image frames, or reference images.',
      topDetailHtml: '<p>Choose a Veo 3.1 model and generation type, enter a prompt, then generate a cinematic AI video.</p>',
      detailHtml: '<h2>Best for</h2><p>Text-to-video clips, image-to-video motion, reference-driven video concepts, social ads, cinematic shots, and product scenes.</p>',
      previewImageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
      creditCost: 1,
      workflowId: 'kie:veo-3-1',
      instanceType: 'default',
      status: 'active',
      sortOrder: 30,
      inputNodes: [
        {
          nodeId: 'kie-input',
          fieldName: 'generationType',
          key: 'generationType',
          dataType: 'select',
          label: 'Generation Type',
          defaultValue: 'TEXT_2_VIDEO',
          required: true,
          options: [
            { label: 'Text to Video', value: 'TEXT_2_VIDEO' },
            { label: 'Image to Video', value: 'FIRST_AND_LAST_FRAMES_2_VIDEO' },
            { label: 'Reference to Video', value: 'REFERENCE_2_VIDEO' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'model',
          key: 'model',
          dataType: 'select',
          label: 'Model',
          defaultValue: 'veo3_fast',
          required: true,
          options: [
            { label: 'Veo 3.1 Lite', value: 'veo3_lite' },
            { label: 'Veo 3.1 Fast', value: 'veo3_fast' },
            { label: 'Veo 3.1 Quality', value: 'veo3' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'imageUrls',
          key: 'imageUrls',
          dataType: 'image',
          uploadMode: 'multiple',
          label: 'Reference Images',
          placeholder: 'Upload JPG, PNG, or WebP images for image or reference video',
          required: false,
          maxFiles: 3,
          uploadColumns: 3,
          maxFileSizeMb: 10,
          compressQuality: 90,
          acceptedFileTypes: ['image'],
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'prompt',
          key: 'prompt',
          dataType: 'textarea',
          label: 'Prompt',
          placeholder: 'Describe the scene, motion, camera movement, style, lighting, and audio mood',
          defaultValue: 'A cinematic product video with smooth camera movement, realistic lighting, natural motion, and polished commercial styling.',
          required: true,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'aspect_ratio',
          key: 'aspect_ratio',
          dataType: 'select',
          label: 'Video Ratio',
          defaultValue: '16:9',
          required: false,
          options: [
            { label: 'Auto', value: 'Auto' },
            { label: '16:9', value: '16:9' },
            { label: '9:16', value: '9:16' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'resolution',
          key: 'resolution',
          dataType: 'select',
          label: 'Resolution',
          defaultValue: '720p',
          required: false,
          options: [
            { label: '720p', value: '720p' },
            { label: '1080p', value: '1080p' },
            { label: '4K', value: '4k' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'duration',
          key: 'duration',
          dataType: 'select',
          label: 'Duration',
          defaultValue: '8',
          required: false,
          options: [
            { label: '4s', value: '4' },
            { label: '6s', value: '6' },
            { label: '8s', value: '8' }
          ]
        }
      ],
      outputConfig: {
        outputType: 'video',
        previewMode: 'video',
        fallbackPaths: ['url', 'fileUrl', 'file_url', 'download_url', 'resultUrls', 'fullResultUrls']
      }
    });

    seedToolIfMissing({
      toolKey: 'kie-suno-music',
      name: 'Kie AI Music',
      slug: 'kie-suno-music',
      categoryId: 'audio',
      shortDescription: '使用 Kie Suno API 生成高品質 AI 音樂與歌曲，支援多種 Suno 模型與自定義風格。',
      topDetailHtml: '<p>選擇 Suno 模型、輸入音樂描述或歌詞，啟用自定義模式設定風格與標題，生成高品質 AI 歌曲與音樂。</p>',
      detailHtml: '<h2>最佳用途</h2><p>AI 音樂創作、自定義風格歌曲生成、背景音樂製作、配樂生成、歌詞創作。</p>',
      previewImageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
      creditCost: 1,
      workflowId: 'kie:suno-music',
      instanceType: 'default',
      status: 'active',
      sortOrder: 40,
      inputNodes: [
        {
          nodeId: 'kie-input',
          fieldName: 'model',
          key: 'model',
          dataType: 'select',
          label: 'Model',
          defaultValue: 'V4_5',
          required: true,
          options: [
            { label: 'V3.5', value: 'V3_5' },
            { label: 'V4', value: 'V4' },
            { label: 'V4.5', value: 'V4_5' },
            { label: 'V4.5 Plus', value: 'V4_5PLUS' },
            { label: 'V4.5 All', value: 'V4_5ALL' },
            { label: 'V5', value: 'V5' },
            { label: 'V5.5', value: 'V5_5' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'prompt',
          key: 'prompt',
          dataType: 'textarea',
          label: 'Prompt（音樂描述）',
          placeholder: '描述你想要生成的音樂風格、情緒、節奏、樂器等...',
          defaultValue: 'An upbeat pop song with catchy melody, energetic drums, bright synthesizers, and a feel-good summer vibe.',
          required: true,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'customMode',
          key: 'customMode',
          dataType: 'switch',
          label: 'Custom Mode（自定義模式）',
          defaultValue: false,
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'instrumental',
          key: 'instrumental',
          dataType: 'switch',
          label: 'Instrumental（純音樂）',
          defaultValue: false,
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'style',
          key: 'style',
          dataType: 'text',
          label: 'Style（風格）',
          placeholder: '例如：Pop, Rock, Jazz, Classical, Electronic...',
          defaultValue: '',
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'title',
          key: 'title',
          dataType: 'text',
          label: 'Title（歌曲標題）',
          placeholder: '輸入歌曲標題（最多 80 字元）',
          defaultValue: '',
          required: false,
          options: []
        }
      ],
      outputConfig: {
        outputType: 'audio',
        previewMode: 'audio',
        fallbackPaths: ['url', 'audioUrl', 'streamAudioUrl', 'fileUrl', 'download_url']
      }
    });

    await upgradeSeedanceTool();

    seedToolIfMissing({
      toolKey: 'kie-seedance-2-0',
      name: 'Seedance 2.0',
      slug: 'kie-seedance-2-0',
      categoryId: 'video',
      shortDescription: 'Generate realistic videos with Seedance 2.0 — text-to-video, image-to-video, and multi-modal reference support.',
      topDetailHtml: '<p>Describe a scene, upload optional reference images, video clips, or audio, then generate a high-quality video with Seedance 2.0.</p>',
      detailHtml: '<h2>Best for</h2><p>Realistic human motion, multi-camera cinematic shots, music-synchronized clips, character videos, and creative storytelling.</p>',
      creditCost: 4,
      workflowId: 'kie:seedance-2-0',
      status: 'active',
      sortOrder: 50,
      inputNodes: [
        {
          nodeId: 'kie-input',
          fieldName: 'model',
          key: 'model',
          dataType: 'select',
          label: 'Model（模型）',
          placeholder: '',
          defaultValue: 'seedance-2',
          required: true,
          options: [
            { label: 'Seedance 2 Fast（快速版）', value: 'seedance-2-fast' },
            { label: 'Seedance 2（標準版）', value: 'seedance-2' },
            { label: 'Seedance 2.0 Pro', value: 'doubao-seedance-2-0-pro' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'prompt',
          key: 'prompt',
          dataType: 'textarea',
          label: 'Prompt（提示詞）',
          placeholder: '描述你想要生成的影片內容，例如：A cinematic shot of a dancer performing in a neon-lit street at night...',
          defaultValue: 'A cinematic shot of a dancer performing elegant moves in a neon-lit street at night, with reflections on wet pavement and smooth camera movement.',
          required: true,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'aspect_ratio',
          key: 'aspect_ratio',
          dataType: 'select',
          label: 'Aspect Ratio（畫面比例）',
          placeholder: '',
          defaultValue: '16:9',
          required: false,
          options: [
            { label: '16:9（橫向）', value: '16:9' },
            { label: '9:16（直向）', value: '9:16' },
            { label: '1:1（方形）', value: '1:1' },
            { label: '4:3', value: '4:3' },
            { label: '3:4', value: '3:4' },
            { label: '21:9（超寬）', value: '21:9' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'resolution',
          key: 'resolution',
          dataType: 'select',
          label: 'Resolution（解析度）',
          placeholder: '',
          defaultValue: '720p',
          required: false,
          options: [
            { label: '480p', value: '480p' },
            { label: '720p', value: '720p' },
            { label: '1080p', value: '1080p' },
            { label: '4K', value: '4K' }
          ]
        },
        {
          nodeId: 'kie-input',
          fieldName: 'duration',
          key: 'duration',
          dataType: 'number',
          label: 'Duration（影片長度，秒）',
          placeholder: '4 ~ 15',
          defaultValue: '4',
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'generate_audio',
          key: 'generate_audio',
          dataType: 'switch',
          label: 'Generate Audio（生成同步音頻）',
          placeholder: '',
          defaultValue: false,
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'first_frame_url',
          key: 'first_frame_url',
          dataType: 'image',
          label: 'First Frame（起始影格圖片）',
          placeholder: '上傳起始影格參考圖片',
          defaultValue: '',
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'last_frame_url',
          key: 'last_frame_url',
          dataType: 'image',
          label: 'Last Frame（結束影格圖片）',
          placeholder: '上傳結束影格參考圖片',
          defaultValue: '',
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'reference_image_urls',
          key: 'reference_image_urls',
          dataType: 'image',
          label: 'Reference Images（參考圖片，最多 9 張）',
          placeholder: '上傳參考圖片（可多選）',
          defaultValue: '',
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'reference_video_urls',
          key: 'reference_video_urls',
          dataType: 'video',
          label: 'Reference Videos（參考影片，最多 3 部）',
          placeholder: '上傳參考影片（每部最大 50MB，總長不超過 15 秒）',
          defaultValue: '',
          required: false,
          options: []
        },
        {
          nodeId: 'kie-input',
          fieldName: 'reference_audio_urls',
          key: 'reference_audio_urls',
          dataType: 'audio',
          label: 'Reference Audio（參考音訊，最多 3 段）',
          placeholder: '上傳參考音訊（每段最大 15MB）',
          defaultValue: '',
          required: false,
          options: []
        }
      ],
      outputConfig: {
        outputType: 'video',
        previewMode: 'video',
        fallbackPaths: ['url', 'videoUrl', 'streamVideoUrl', 'fileUrl', 'download_url']
      }
    });
  }

  async function seedToolIfMissing(tool) {
    if (await statements.findByToolKey.get(tool.toolKey)) return;
    await saveTool(tool);
  }

  async function upgradeNanoBananaTool() {
    const existingRecord = await statements.findByToolKey.get('google-nano-banana-pro');
    if (!existingRecord) return;

    const existingTool = mapToolRecord(existingRecord);
    const inputNodes = Array.isArray(existingTool.inputNodes) ? existingTool.inputNodes : [];
    const hasModelNode = inputNodes.some((node) => node.key === 'model' || node.fieldName === 'model');
    const nextTool = {
      ...existingTool,
      name: existingTool.name === 'Google Nano Banana Pro' ? 'Google Nano Banana' : existingTool.name,
      shortDescription: getUpgradedNanoBananaText(
        existingTool.shortDescription,
        'Use Nano Banana Pro to transform reference images into polished banners, posters, and product visuals.',
        'Choose Nano Banana, Nano Banana 2 Lite, or Nano Banana Pro to create banners, posters, and product visuals.'
      ),
      topDetailHtml: getUpgradedNanoBananaText(
        existingTool.topDetailHtml,
        '<p>Upload up to 8 reference images, describe the banner or visual you want, then generate a new image with Google Nano Banana Pro.</p>',
        '<p>Choose a Nano Banana model, upload optional reference images, describe the banner or visual you want, then generate a new image.</p>'
      ),
      detailHtml: getUpgradedNanoBananaText(
        existingTool.detailHtml,
        '<h2>Best for</h2><p>Marketing banners, product posters, social visuals, creative composites, and image-to-image reference generation.</p>',
        '<h2>Best for</h2><p>Marketing banners, product posters, social visuals, creative composites, and fast model comparison in one tool page.</p>'
      ),
      workflowId: 'kie:nano-banana',
      inputNodes: hasModelNode ? inputNodes : [createNanoBananaModelNode(), ...inputNodes]
    };

    await saveTool(nextTool);
  }

  async function upgradeSeedanceTool() {
    const existingRecord = await statements.findByToolKey.get('kie-seedance-2-0');
    if (!existingRecord) return;
    if (existingRecord.status === 'active') return;

    const existingTool = mapToolRecord(existingRecord);
    const nextTool = {
      ...existingTool,
      status: 'active',
      sortOrder: existingTool.sortOrder || 50
    };

    await saveTool(nextTool);
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
  const normalizedInputNodes = collapseTextInputNodes(inputNodes.map(normalizeInputNode));
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
    creditCost: toInteger(tool.creditCost ?? tool.credit_cost ?? 1, 1),
    workflowId: String(tool.workflowId).trim(),
    instanceType: String(tool.instanceType || 'default').trim(),
    status,
    sortOrder: toInteger(tool.sortOrder, 100),
    inputNodes: normalizedInputNodes,
    outputConfig: normalizeOutputConfig(tool.outputConfig)
  };
}

function getUpgradedNanoBananaText(currentValue, oldDefaultValue, newDefaultValue) {
  const normalizedCurrentValue = String(currentValue || '').trim();
  if (!normalizedCurrentValue || normalizedCurrentValue === oldDefaultValue) return newDefaultValue;
  return normalizedCurrentValue;
}

function createNanoBananaModelNode() {
  return {
    nodeId: 'kie-input',
    fieldName: 'model',
    key: 'model',
    dataType: 'select',
    label: 'Model',
    defaultValue: 'nano-banana-pro',
    required: true,
    options: [
      { label: 'Nano Banana', value: 'google/nano-banana' },
      { label: 'Nano Banana 2 Lite', value: 'nano-banana-2-lite' },
      { label: 'Nano Banana Pro', value: 'nano-banana-pro' }
    ]
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
    uploadMode: dataType === 'image' ? normalizeUploadMode(node.uploadMode) : 'single',
    label: String(node.label || '').trim(),
    placeholder: String(node.placeholder || '').trim(),
    defaultValue: node.defaultValue ?? '',
    minValue: dataType === 'number' ? getOptionalNumberBoundary(node, ['minValue', 'min', 'minimum']) : '',
    maxValue: dataType === 'number' ? getOptionalNumberBoundary(node, ['maxValue', 'max', 'maximum']) : '',
    maxFiles: dataType === 'image' && normalizeUploadMode(node.uploadMode) === 'multiple' ? normalizePositiveInteger(node.maxFiles, 4) : 1,
    uploadColumns: dataType === 'image' && normalizeUploadMode(node.uploadMode) === 'multiple' ? normalizePositiveInteger(node.uploadColumns, 3) : 1,
    maxFileSizeMb: dataType === 'image' ? normalizePositiveInteger(node.maxFileSizeMb, 10) : '',
    compressQuality: dataType === 'image' ? normalizePositiveInteger(node.compressQuality, 85) : '',
    required: Boolean(node.required),
    acceptedFileTypes: normalizeAcceptedFileTypes(node.acceptedFileTypes, dataType),
    options: normalizeNodeOptions(node.options)
  };
}

function getOptionalNumberBoundary(node, keys) {
  for (const key of keys) {
    const value = normalizeOptionalNumberValue(node[key]);
    if (value !== '') return value;
  }

  return '';
}

function normalizeOptionalNumberValue(value) {
  if (value === undefined || value === null || value === '') return '';
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : '';
}

function normalizePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : fallback;
}

function normalizeUploadMode(value) {
  return String(value || '').trim().toLowerCase() === 'multiple' ? 'multiple' : 'single';
}

function normalizeAcceptedFileTypes(rawTypes, dataType) {
  const validTypes = new Set(['image', 'video', 'audio']);
  if (!['image', 'video', 'audio'].includes(dataType)) return [];

  const acceptedTypes = Array.isArray(rawTypes)
    ? rawTypes.map((type) => String(type || '').trim()).filter((type) => validTypes.has(type))
    : [];
  return acceptedTypes.length ? Array.from(new Set(acceptedTypes)) : [dataType];
}

function normalizeNodeOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions
    .map((option) => ({
      label: String(option?.label || '').trim(),
      value: String(option?.value || '').trim(),
      icon: String(option?.icon || '').trim(),
      creditWeight: normalizeOptionWeight(option?.creditWeight)
    }))
    .filter((option) => option.label || option.value);
}

function normalizeOptionWeight(value) {
  if (value === undefined || value === null || value === '') return 1;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 1;
  return Math.floor(numberValue);
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

function collapseTextInputNodes(inputNodes) {
  if (!Array.isArray(inputNodes) || !inputNodes.length) return [];

  const textareaFieldNames = new Set(
    inputNodes
      .filter((node) => node && node.dataType === 'textarea')
      .map((node) => String(node.fieldName || node.key || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return inputNodes.filter((node) => {
    if (!node || node.dataType !== 'text') return true;
    const fieldName = String(node.fieldName || node.key || '').trim().toLowerCase();
    return !textareaFieldNames.has(fieldName);
  });
}

function mapToolRecord(record) {
  const inputNodes = collapseTextInputNodes(parseJson(record.input_nodes_json, []));

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
    creditCost: Number(record.credit_cost ?? 1),
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
    inputNodes,
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
    creditCost: tool.creditCost,
    workflowId: tool.workflowId,
    instanceType: tool.instanceType,
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
