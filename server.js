const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'frontend');
const DEFAULT_PORT = 3000;
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024;

loadEnvFile(path.join(__dirname, '.env'));

const runningHubApiKey = process.env.RUNNINGHUB_API_KEY;
const runningHubApiBaseUrl = process.env.RUNNINGHUB_API_BASE_URL || 'https://www.runninghub.cn/openapi/v2';
const runningHubTaskApiBaseUrl = process.env.RUNNINGHUB_TASK_API_BASE_URL || 'https://www.runninghub.cn/task/openapi';
const port = Number(process.env.PORT || DEFAULT_PORT);

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

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/api/runninghub/')) {
      await handleRunningHubApi(request, response);
      return;
    }

    await serveStaticFile(request, response);
  } catch (error) {
    console.error('服务器错误:', error);
    sendJson(response, 500, {
      success: false,
      message: '服务器处理请求失败',
      error: { code: 'INTERNAL_SERVER_ERROR' }
    });
  }
});

server.listen(port, () => {
  console.log(`RunningHub demo server: http://127.0.0.1:${port}`);
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
      message: '后端未配置 RUNNINGHUB_API_KEY',
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
    message: '接口不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function proxyUploadImage(request, response) {
  const contentType = request.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    sendJson(response, 400, {
      success: false,
      message: '请使用 multipart/form-data 上传图片',
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
    const invalidJsonError = new Error('请求 JSON 格式不正确');
    invalidJsonError.statusCode = 400;
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
        reject(new Error('请求体超过大小限制'));
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
