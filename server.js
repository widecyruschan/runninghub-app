const http = require('http');
const fs = require('fs');
const path = require('path');
const { createDatabase } = require('./src/database');
const { createToolRepository } = require('./src/toolRepository');
const { createCategoryRepository } = require('./src/categoryRepository');

const PUBLIC_DIR = path.join(__dirname, 'frontend');
const DEFAULT_PORT = 3000;
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024;

loadEnvFile(path.join(__dirname, '.env'));

const runningHubApiKey = process.env.RUNNINGHUB_API_KEY;
const runningHubApiBaseUrl = process.env.RUNNINGHUB_API_BASE_URL || 'https://www.runninghub.cn/openapi/v2';
const runningHubTaskApiBaseUrl = process.env.RUNNINGHUB_TASK_API_BASE_URL || 'https://www.runninghub.cn/task/openapi';
const port = Number(process.env.PORT || DEFAULT_PORT);
const host = process.env.HOST || '0.0.0.0';
const database = createDatabase();
const toolRepository = createToolRepository(database);
const categoryRepository = createCategoryRepository(database);

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

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/api/admin/')) {
      await handleAdminApi(request, response);
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
    console.error('伺服器錯誤:', error);
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
  const runningHubResponse = await fetch(`${runningHubApiBaseUrl}/media/upload/binary`, {
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
  const runningHubResponse = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runningHubApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  await pipeRunningHubResponse(response, runningHubResponse);
}

async function pipeRunningHubResponse(response, runningHubResponse) {
  const responseText = await runningHubResponse.text();
  response.writeHead(runningHubResponse.status, {
    'Content-Type': runningHubResponse.headers.get('content-type') || 'application/json; charset=utf-8'
  });
  response.end(responseText);
}

async function readJsonBody(request) {
  const bodyBuffer = await readRequestBody(request, 1024 * 1024);
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

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
