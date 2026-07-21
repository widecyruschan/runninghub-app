const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createDatabase } = require('./src/database');
const { createToolRepository } = require('./src/toolRepository');
const { createCategoryRepository } = require('./src/categoryRepository');
const { createMenuRepository } = require('./src/menuRepository');
const { createTaskRepository } = require('./src/taskRepository');
const { createUserRepository } = require('./src/userRepository');
const { createMemberSessionRepository } = require('./src/memberSessionRepository');
const { createKieClient } = require('./src/kieClient');

const PUBLIC_DIR = path.join(__dirname, 'frontend');
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
const DEFAULT_PORT = 3000;
const MAX_UPLOAD_SIZE = 12 * 1024 * 1024;
const MAX_JSON_BODY_SIZE = 18 * 1024 * 1024;
const MAX_RICH_EDITOR_UPLOAD_SIZE = 30 * 1024 * 1024;
const KIE_UPLOAD_PATH = 'runninghub-app/uploads';
const KIE_WORKFLOW_PREFIX = 'kie:';
const KIE_NANO_BANANA_MODEL = 'nano-banana-pro';
const RICH_EDITOR_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/flac'
]);

loadEnvFile(path.join(__dirname, '.env'));

const runningHubApiKey = process.env.RUNNINGHUB_API_KEY;
const runningHubApiBaseUrl = process.env.RUNNINGHUB_API_BASE_URL || 'https://www.runninghub.cn/openapi/v2';
const runningHubTaskApiBaseUrl = process.env.RUNNINGHUB_TASK_API_BASE_URL || 'https://www.runninghub.cn/task/openapi';
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
const googleOauthRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
const listenTarget = createListenTarget(process.env.PORT, process.env.HOST);
const database = createDatabase();
const toolRepository = createToolRepository(database);
const categoryRepository = createCategoryRepository(database);
const menuRepository = createMenuRepository(database);
const taskRepository = createTaskRepository(database);
const userRepository = createUserRepository(database);
const memberSessionRepository = createMemberSessionRepository(database);
const kieClient = createKieClient();

toolRepository.seedDefaultTools();
menuRepository.seedDefaultMenus();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const adminRoutePrefixes = [
  '/admin',
  '/admin/',
  '/admin/tools',
  '/admin/categories',
  '/admin/users',
  '/admin/members',
  '/admin/workflows',
  '/admin/memberships',
  '/admin/tasks',
  '/admin/content',
  '/admin/settings'
];

const frontendRoutePrefixes = [
  '/login',
  '/member',
  '/register',
  '/tools'
];
const adminSessions = new Map();
const ADMIN_SESSION_COOKIE = 'runninghub_admin_session';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const MEMBER_SESSION_COOKIE = 'runninghub_member_session';
const MEMBER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const GOOGLE_OAUTH_SCOPE = 'openid email profile';
const REGISTER_BONUS_CREDITS = 100;
const DAILY_LOGIN_BONUS_CREDITS = 50;
const ADMIN_ROLE_PERMISSIONS = {
  admin: new Set(['manage_tools', 'manage_users', 'manage_content', 'view_tasks', 'manage_credits']),
  content_editor: new Set(['manage_content']),
  free_user: new Set([]),
  member: new Set([])
};

const server = http.createServer(async (request, response) => {
  try {
    const requestPathname = getRequestPathname(request);

    if (requestPathname === '/api/health') {
      sendJson(response, 200, {
        success: true,
        message: '服務正常',
        data: {
          service: 'runninghub-app',
          commit: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || '',
          adminAuth: true
        }
      });
      return;
    }

    if (requestPathname.startsWith('/api/admin/')) {
      await handleAdminApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/api/auth/')) {
      await handleAuthApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/api/tasks')) {
      await handleTaskApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/api/me/')) {
      await handleMeApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/api/tools') || requestPathname.startsWith('/api/categories')) {
      await handlePublicApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/api/runninghub/')) {
      await handleRunningHubApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/api/kie/')) {
      await handleKieApi(request, response);
      return;
    }

    if (requestPathname.startsWith('/uploads/')) {
      await serveUploadedFile(request, response);
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

server.listen(...listenTarget.args, () => {
  console.log(`RunningHub demo server: ${listenTarget.url}`);
  console.log(`Local access URL: ${listenTarget.localUrl}`);
  console.log(`RUNNINGHUB_API_KEY: ${runningHubApiKey ? '已配置' : '未配置'}`);
  console.log(`ADMIN_USERNAME: ${adminUsername}`);
});

function createListenTarget(portValue, hostValue) {
  const rawPort = String(portValue || DEFAULT_PORT).trim();
  const host = String(hostValue || '0.0.0.0').trim();
  const numericPort = Number(rawPort);

  if (Number.isInteger(numericPort) && numericPort >= 0 && numericPort <= 65535) {
    return {
      args: [numericPort, host],
      url: `http://${host}:${numericPort}`,
      localUrl: `http://127.0.0.1:${numericPort}`
    };
  }

  return {
    args: [rawPort],
    url: rawPort,
    localUrl: rawPort
  };
}

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

function getRequestPathname(request) {
  return new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
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

async function handleKieApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/kie/health' && request.method === 'GET') {
    const memberSession = requireActiveMemberSession(request);
    const creditBalance = await kieClient.getCreditBalance();

    sendJson(response, 200, {
      success: true,
      message: 'KIE 服務正常',
      data: {
        configured: true,
        userId: memberSession.user.id,
        creditBalance
      }
    });
    return;
  }

  if (url.pathname === '/api/kie/egress-ip' && request.method === 'GET') {
    const memberSession = requireActiveMemberSession(request);
    const egressIp = await getCurrentEgressIp();

    sendJson(response, 200, {
      success: true,
      message: 'KIE 出站 IP 查詢成功',
      data: {
        userId: memberSession.user.id,
        egressIp
      }
    });
    return;
  }

  if (url.pathname === '/api/kie/upload' && request.method === 'POST') {
    requireActiveMemberSession(request);
    const requestBody = await readJsonBody(request);
    const uploadedFile = await uploadKieDataUrl(requestBody);

    sendJson(response, 201, {
      success: true,
      message: '檔案已上傳到 KIE',
      data: uploadedFile
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: '介面不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function getCurrentEgressIp() {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipPayload = await ipResponse.json();
    return String(ipPayload.ip || '').trim();
  } catch (error) {
    throwHttpError('出站 IP 查詢失敗', 'EGRESS_IP_QUERY_FAILED', 502);
  }
}

async function handleAdminApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/admin/auth/health' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '後台登入服務正常',
      data: {
        adminAuth: true
      }
    });
    return;
  }

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
      data: {
        username,
        role: 'admin',
        permissions: Array.from(ADMIN_ROLE_PERMISSIONS.admin)
      }
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
      data: {
        username: session.username,
        role: session.role,
        permissions: Array.from(getRolePermissions(session.role))
      }
    });
    return;
  }

  const adminSession = getAdminSession(request);
  if (!adminSession) {
    sendUnauthorized(response);
    return;
  }

  if (url.pathname.startsWith('/api/admin/tools') && !hasPermission(adminSession, 'manage_tools')) {
    sendForbidden(response);
    return;
  }

  if (url.pathname.startsWith('/api/admin/uploads') && !hasPermission(adminSession, 'manage_tools')) {
    sendForbidden(response);
    return;
  }

  if (url.pathname === '/api/admin/uploads/rich-editor' && request.method === 'POST') {
    const requestBody = await readJsonBody(request, Math.ceil(MAX_RICH_EDITOR_UPLOAD_SIZE * 1.4) + 1024);
    const uploadedFile = saveRichEditorUpload(requestBody);

    sendJson(response, 201, {
      success: true,
      message: '媒體已上傳',
      data: uploadedFile
    });
    return;
  }

  if (url.pathname.startsWith('/api/admin/categories') && !hasPermission(adminSession, 'manage_tools')) {
    sendForbidden(response);
    return;
  }

  if (url.pathname.startsWith('/api/admin/menus') && !hasPermission(adminSession, 'manage_tools')) {
    sendForbidden(response);
    return;
  }

  if (url.pathname.startsWith('/api/admin/users') && !hasPermission(adminSession, 'manage_users')) {
    sendForbidden(response);
    return;
  }

  if (url.pathname.startsWith('/api/admin/tasks') && !hasPermission(adminSession, 'view_tasks')) {
    sendForbidden(response);
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

  if (url.pathname === '/api/admin/menus' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: menuRepository.listMenus()
    });
    return;
  }

  if (url.pathname === '/api/admin/menus' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const savedMenu = menuRepository.saveMenu(requestBody);

    sendJson(response, requestBody.id ? 200 : 201, {
      success: true,
      message: '菜單已儲存',
      data: savedMenu
    });
    return;
  }

  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: userRepository.listUsers()
    });
    return;
  }

  if (url.pathname === '/api/admin/users' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const initialCreditBalance = Number(requestBody.creditBalance ?? requestBody.credit_balance ?? 0);
    const requestedRole = String(requestBody.role || '').trim();
    const canSetInitialCredits = requestedRole === 'free_user' || requestedRole === 'member';
    if (!requestBody.id && canSetInitialCredits) {
      throwHttpError('前台用戶需通過註冊流程新增，後台只允許瀏覽和修改', 'FRONTEND_USER_CREATE_FROM_ADMIN_FORBIDDEN', 403);
    }

    if (!requestBody.id && canSetInitialCredits && initialCreditBalance > 0 && !hasPermission(adminSession, 'manage_credits')) {
      sendForbidden(response);
      return;
    }

    const savedUser = userRepository.saveUser(requestBody);
    const responseUser = !requestBody.id && canSetInitialCredits && initialCreditBalance > 0
      ? userRepository.adjustCredits(savedUser.id, initialCreditBalance, '初始積分')
      : savedUser;

    sendJson(response, requestBody.id ? 200 : 201, {
      success: true,
      message: '用戶已儲存',
      data: responseUser
    });
    return;
  }

  const userCreditsMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/credits$/);
  if (userCreditsMatch && request.method === 'POST') {
    if (!hasPermission(adminSession, 'manage_credits')) {
      sendForbidden(response);
      return;
    }

    const userId = decodeURIComponent(userCreditsMatch[1]);
    const requestBody = await readJsonBody(request);
    const savedUser = userRepository.adjustCredits(
      userId,
      requestBody.amount,
      requestBody.reason || '後台調整',
      requestBody.relatedTaskId || ''
    );

    sendJson(response, 200, {
      success: true,
      message: '積分已調整',
      data: savedUser
    });
    return;
  }

  const userLedgerMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/ledger$/);
  if (userLedgerMatch && request.method === 'GET') {
    const userId = decodeURIComponent(userLedgerMatch[1]);
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: userRepository.listCreditLedgerByUser(userId)
    });
    return;
  }

  const userTasksMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/tasks$/);
  if (userTasksMatch && request.method === 'GET') {
    const userId = decodeURIComponent(userTasksMatch[1]);
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: taskRepository.listTasksByUser(userId)
    });
    return;
  }

  if (url.pathname === '/api/admin/tasks' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: taskRepository.listTasks()
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
    const result = await executeConfiguredTool(idOrSlug, requestBody, request);

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

async function handleAuthApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === '/api/auth/register' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const result = registerOrLoginMember(requestBody, 'email');

    sendJson(response, 201, {
      success: true,
      message: '註冊並登入成功',
      data: result.user
    }, {
      'Set-Cookie': createMemberSessionCookie(request, result.session.id)
    });
    return;
  }

  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    const requestBody = await readJsonBody(request);
    const result = registerOrLoginMember(requestBody, 'email');

    sendJson(response, 200, {
      success: true,
      message: '登入成功',
      data: result.user
    }, {
      'Set-Cookie': createMemberSessionCookie(request, result.session.id)
    });
    return;
  }

  if (url.pathname === '/api/auth/google' && request.method === 'GET') {
    ensureGoogleOAuthConfigured();
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', getGoogleRedirectUri(request));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPE);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    response.writeHead(302, {
      Location: authUrl.toString(),
      'Set-Cookie': createOAuthStateCookie(request, state)
    });
    response.end();
    return;
  }

  if (url.pathname === '/api/auth/google/callback' && request.method === 'GET') {
    await handleGoogleOAuthCallback(request, response, url);
    return;
  }

  if (url.pathname === '/api/auth/me' && request.method === 'GET') {
    const memberSession = getMemberSession(request);
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: memberSession ? memberSession.user : null
    });
    return;
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const sessionId = getCookieValue(request, MEMBER_SESSION_COOKIE);
    if (sessionId) memberSessionRepository.deleteSession(sessionId);

    sendJson(response, 200, {
      success: true,
      message: '已登出',
      data: null
    }, {
      'Set-Cookie': createExpiredCookie(request, MEMBER_SESSION_COOKIE)
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

async function handleMeApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const memberSession = requireActiveMemberSession(request);

  if (url.pathname === '/api/me/tasks' && request.method === 'GET') {
    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: taskRepository.listTasksByUser(memberSession.user.id)
    });
    return;
  }

  if (url.pathname === '/api/me/ledger' && request.method === 'GET') {
    const ledger = userRepository
      .listCreditLedgerByUser(memberSession.user.id)
      .map((record) => ({
        ...record,
        displayReason: formatFrontendLedgerReason(record.reason)
      }));

    sendJson(response, 200, {
      success: true,
      message: '操作成功',
      data: ledger
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: '介面不存在',
    error: { code: 'API_NOT_FOUND' }
  });
}

async function executeConfiguredTool(idOrSlug, requestBody, request) {
  const tool = toolRepository.getActiveToolByIdOrSlug(idOrSlug);
  if (!tool) {
    throwHttpError('工具不存在或未上線', 'TOOL_NOT_FOUND', 404);
  }

  ensureToolProviderConfigured(tool);

  const memberSession = requireActiveMemberSession(request);

  return executeToolWithConfig(tool, requestBody, {
    userId: memberSession.user.id,
    chargeCredits: true
  });
}

async function testAdminTool(toolId, requestBody) {
  const tool = toolRepository.getToolById(toolId);
  if (!tool) {
    throwHttpError('工具不存在', 'TOOL_NOT_FOUND', 404);
  }

  ensureToolProviderConfigured(tool);

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

async function executeToolWithConfig(tool, requestBody, options = {}) {
  const rawInputValues = requestBody?.inputValues && typeof requestBody.inputValues === 'object'
    ? requestBody.inputValues
    : {};
  const normalizedInputValues = {};
  const task = taskRepository.createTask({
    userId: options.userId || '',
    tool,
    inputValues: sanitizeInputValues(tool, rawInputValues),
    nodeInfoList: []
  });

  try {
    const nodeInfoList = await buildNodeInfoList(tool, rawInputValues, normalizedInputValues);
    taskRepository.updateTaskPayload(task.id, normalizedInputValues, nodeInfoList);

    if (isKieTool(tool)) {
      return await createKieToolTask(tool, task, normalizedInputValues);
    }

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

async function createKieToolTask(tool, task, inputValues) {
  const model = getKieModelName(tool);
  const kieInput = buildKieTaskInput(tool, inputValues);
  const kieResponse = await kieClient.createTask({
    model,
    input: kieInput
  });
  const kieTaskId = extractKieTaskId(kieResponse);

  if (!kieTaskId) {
    throwHttpError('任務建立失敗，未返回 KIE 任務 ID', 'KIE_TASK_ID_MISSING', 502);
  }

  const savedTask = taskRepository.attachRunningHubTask(task.id, kieTaskId, 'QUEUED');

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
}

function buildKieTaskInput(tool, inputValues) {
  if (getKieModelName(tool) !== KIE_NANO_BANANA_MODEL) {
    throwHttpError('不支援的 KIE 模型', 'KIE_MODEL_UNSUPPORTED', 422);
  }

  return {
    prompt: String(inputValues.prompt || ''),
    image_input: normalizeKieImageInput(inputValues.image_input),
    aspect_ratio: String(inputValues.aspect_ratio || '1:1'),
    resolution: String(inputValues.resolution || '1K'),
    output_format: String(inputValues.output_format || 'png')
  };
}

function normalizeKieImageInput(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
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

    if (Array.isArray(value)) {
      sanitizedInputValues[node.key] = value.map((item) => {
        if (typeof item !== 'string' || !item.startsWith('data:')) return item ?? '';
        const dataUrlMatch = item.match(/^data:([^;,]+);base64,/);
        return {
          kind: 'data-url',
          mimeType: dataUrlMatch?.[1] || '',
          size: item.length
        };
      });
      return;
    }

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

  if (node.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
    throwHttpError(`${node.label || node.key} 為必填`, 'INPUT_VALUE_REQUIRED', 422);
  }

  if (node.dataType === 'image' || node.dataType === 'video' || node.dataType === 'audio') {
    if (node.dataType === 'image' && isMultipleImageUploadNode(node)) {
      if (!value) return [];
      if (!Array.isArray(value)) {
        throwHttpError(`${node.label || node.key} 必須是檔案 Data URL 陣列`, 'UPLOAD_VALUE_INVALID', 422);
      }

      const uploadedUrls = [];
      for (const item of value) {
        if (typeof item !== 'string') {
          throwHttpError(`${node.label || node.key} 必須是檔案 Data URL 陣列`, 'UPLOAD_VALUE_INVALID', 422);
        }

        if (item.startsWith('data:')) {
          uploadedUrls.push(await uploadMediaDataUrl(item, node.dataType));
          continue;
        }

        if (!isHttpUrl(item)) {
          throwHttpError(`${node.label || node.key} URL 格式不正確`, 'UPLOAD_URL_INVALID', 422);
        }

        uploadedUrls.push(item);
      }

      return uploadedUrls;
    }

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
    if (isSeedField(node)) {
      return normalizeSeedValue(value, node);
    }

    if (value === '') return '';

    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      throwHttpError(`${node.label || node.key} 必須是數字`, 'INPUT_NUMBER_INVALID', 422);
    }

    validateNumberRange(node, numberValue);

    return numberValue;
  }

  if (node.dataType === 'select') {
    const optionValues = Array.isArray(node.options) ? node.options.map((option) => option.value) : [];
    if (value && optionValues.length && !optionValues.includes(String(value))) {
      throwHttpError(`${node.label || node.key} 選項不正確`, 'INPUT_SELECT_INVALID', 422);
    }
  }

  if (node.dataType === 'switch') {
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true' || String(value) === '1';
  }

  return String(value || '');
}

function isMultipleImageUploadNode(node) {
  return Boolean(node)
    && node.dataType === 'image'
    && String(node.uploadMode || '').trim().toLowerCase() === 'multiple';
}

function isSeedField(node) {
  const fieldName = String(node?.fieldName || node?.key || '').toLowerCase();
  return fieldName === 'seed' || fieldName === 'noise_seed';
}

function normalizeSeedValue(value, node) {
  const maxSeedValue = 18446744073709551615n;

  if (value === '' || value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throwHttpError(`${node.label || node.key} 必須是 0 到 18446744073709551615 之間的整數`, 'INPUT_SEED_INVALID', 422);
    }

    return String(value);
  }

  if (typeof value !== 'string') {
    throwHttpError(`${node.label || node.key} 必須是 0 到 18446744073709551615 之間的整數`, 'INPUT_SEED_INVALID', 422);
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throwHttpError(`${node.label || node.key} 必須是 0 到 18446744073709551615 之間的整數`, 'INPUT_SEED_INVALID', 422);
  }

  const seedValue = BigInt(trimmed);
  if (seedValue > maxSeedValue) {
    throwHttpError(`${node.label || node.key} 必須是 0 到 18446744073709551615 之間的整數`, 'INPUT_SEED_INVALID', 422);
  }

  return trimmed;
}

function validateNumberRange(node, value) {
  const minValue = normalizeOptionalNumberBoundary(node.minValue);
  const maxValue = normalizeOptionalNumberBoundary(node.maxValue);

  if (minValue !== null && value < minValue) {
    throwHttpError(`${node.label || node.key} 不可小於 ${minValue}`, 'INPUT_NUMBER_TOO_SMALL', 422);
  }

  if (maxValue !== null && value > maxValue) {
    throwHttpError(`${node.label || node.key} 不可大於 ${maxValue}`, 'INPUT_NUMBER_TOO_LARGE', 422);
  }
}

function normalizeOptionalNumberBoundary(value) {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function syncTaskStatus(taskId) {
  const task = getExistingTask(taskId);
  const tool = toolRepository.getToolById(task.toolId);
  if (isKieTool(tool)) {
    return syncKieTaskStatus(task, tool);
  }

  ensureRunningHubConfigured();
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
  const task = await syncTaskStatus(taskId);
  const tool = toolRepository.getToolById(task.toolId);
  if (isKieTool(tool)) {
    return getKieTaskOutputs(task, tool);
  }

  ensureRunningHubConfigured();
  if (!task.runningHubTaskId) {
    throwHttpError('任務尚未建立 RunningHub taskId', 'RUNNINGHUB_TASK_ID_MISSING', 409);
  }

  if (task.outputUrls.length || task.outputValues.length) {
    if (task.status === 'SUCCESS' && task.userId && task.chargedCredits <= 0) {
      const usage = extractTaskOutputUsage(task.outputValues);
      const chargedCredits = chargeTaskCredits(task, usage);
      if (chargedCredits > 0 || usage.consumeCoins > 0) {
        return taskRepository.completeTask(task.id, task.outputValues, task.outputUrls, usage, chargedCredits);
      }
    }

    return task;
  }

  if (task.status !== 'SUCCESS') {
    throwHttpError('任務尚未完成，暫無輸出結果', 'TASK_NOT_FINISHED', 409);
  }

  const outputsResponse = await callRunningHubJson(`${runningHubTaskApiBaseUrl}/outputs`, {
    apiKey: runningHubApiKey,
    taskId: task.runningHubTaskId
  });
  const outputs = extractRunningHubResults(outputsResponse);
  const usage = extractRunningHubUsage(outputsResponse);
  const chargedCredits = chargeTaskCredits(task, usage);
  const outputUrls = extractOutputUrls(outputs, tool?.outputConfig);

  const completedTask = taskRepository.completeTask(task.id, outputs, outputUrls, usage, chargedCredits);
  syncToolTestResult(completedTask);

  return completedTask;
}

async function syncKieTaskStatus(task, tool) {
  ensureKieConfiguredForTool(tool);

  if (!task.runningHubTaskId || ['SUCCESS', 'FAILED'].includes(task.status)) {
    return task;
  }

  const kieResponse = await kieClient.getTaskRecord(task.runningHubTaskId);
  const kieStatus = extractKieStatus(kieResponse);

  if (kieStatus === 'FAILED') {
    const failedTask = taskRepository.markTaskStatus(task.id, 'FAILED', {
      code: extractKieFailureCode(kieResponse),
      message: extractKieFailureMessage(kieResponse) || 'KIE 任務執行失敗'
    });
    syncToolTestResult(failedTask);
    return failedTask;
  }

  if (kieStatus === 'SUCCESS') {
    const successTask = taskRepository.markTaskStatus(task.id, 'SUCCESS');
    syncToolTestResult(successTask);
    return successTask;
  }

  return taskRepository.markTaskStatus(task.id, normalizeRunningStatus(kieStatus));
}

async function getKieTaskOutputs(task, tool) {
  ensureKieConfiguredForTool(tool);

  if (!task.runningHubTaskId) {
    throwHttpError('任務尚未建立 KIE taskId', 'KIE_TASK_ID_MISSING', 409);
  }

  if (task.outputUrls.length || task.outputValues.length) {
    return task;
  }

  if (task.status !== 'SUCCESS') {
    throwHttpError('任務尚未完成，暫無輸出結果', 'TASK_NOT_FINISHED', 409);
  }

  const kieResponse = await kieClient.getTaskRecord(task.runningHubTaskId);
  const outputs = extractKieResults(kieResponse);
  const outputUrls = extractOutputUrls(outputs, tool?.outputConfig);
  const usage = normalizeRunningHubUsage({});
  const completedTask = taskRepository.completeTask(task.id, outputs, outputUrls, usage, 0);
  syncToolTestResult(completedTask);

  return completedTask;
}

function chargeTaskCredits(task, usage) {
  if (!task.userId || task.chargedCredits > 0) return task.chargedCredits || 0;

  const existingCharge = userRepository
    .listCreditLedgerByUser(task.userId)
    .find((record) => record.relatedTaskId === task.id && record.amount < 0);
  if (existingCharge) return Math.abs(existingCharge.amount);

  const chargedCredits = calculateChargedCredits(usage.consumeCoins);
  if (chargedCredits <= 0) return 0;

  userRepository.spendCredits(
    task.userId,
    chargedCredits,
    `使用工具：${task.toolName}`,
    task.id
  );

  return chargedCredits;
}

function calculateChargedCredits(consumeCoins) {
  const numericConsumeCoins = Number(consumeCoins || 0);
  if (!Number.isFinite(numericConsumeCoins) || numericConsumeCoins <= 0) return 0;

  return Math.floor(numericConsumeCoins * 1.2);
}

function formatFrontendLedgerReason(reason) {
  const text = String(reason || '');
  if (text.startsWith('使用工具：')) {
    return `Tool usage: ${text.replace('使用工具：', '').split('，')[0]}`;
  }

  if (text.startsWith('每日登入贈送積分')) {
    return text.replace('每日登入贈送積分', 'Daily login bonus credits');
  }

  if (text === '註冊贈送積分') return 'Registration bonus credits';
  if (text === '後台調整') return 'Admin adjustment';
  return text || 'Credit update';
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

function ensureToolProviderConfigured(tool) {
  if (isKieTool(tool)) {
    ensureKieConfiguredForTool(tool);
    return;
  }

  ensureRunningHubConfigured();
}

function ensureKieConfiguredForTool(tool) {
  if (!kieClient.isConfigured) {
    throwHttpError('後端未配置 KIE_API_KEY', 'KIE_API_KEY_MISSING', 500);
  }

  if (!getKieModelName(tool)) {
    throwHttpError('KIE 工具未配置模型', 'KIE_MODEL_MISSING', 422);
  }
}

function isKieTool(tool) {
  return String(tool?.workflowId || '').trim().startsWith(KIE_WORKFLOW_PREFIX);
}

function getKieModelName(tool) {
  const workflowId = String(tool?.workflowId || '').trim();
  if (!workflowId.startsWith(KIE_WORKFLOW_PREFIX)) return '';
  return workflowId.slice(KIE_WORKFLOW_PREFIX.length).trim();
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
    throwHttpError(`請上傳${getUploadTypeLabel(expectedType)}檔案`, 'UPLOAD_TYPE_INVALID', 422);
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

function extractKieTaskId(responseData) {
  return responseData?.data?.taskId || responseData?.taskId || responseData?.data?.id || '';
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

function extractKieStatus(responseData) {
  const rawState = String(responseData?.data?.state || responseData?.state || '').trim().toLowerCase();
  if (rawState === 'success') return 'SUCCESS';
  if (rawState === 'fail' || rawState === 'failed') return 'FAILED';
  if (rawState === 'waiting' || rawState === 'queued') return 'QUEUED';
  if (rawState === 'running' || rawState === 'generating') return 'RUNNING';
  return 'RUNNING';
}

function extractKieFailureCode(responseData) {
  return responseData?.data?.failCode || responseData?.failCode || 'KIE_TASK_FAILED';
}

function extractKieFailureMessage(responseData) {
  return responseData?.data?.failMsg || responseData?.failMsg || responseData?.msg || '';
}

function extractRunningHubUsage(responseData) {
  const responsePayload = unwrapRunningHubPayload(responseData);
  const results = extractRunningHubResults(responseData);
  const outputUsage = results.find((item) => (
    item?.usage
    || item?.consumeCoins
    || item?.consumeMoney
    || item?.thirdPartyConsumeMoney
    || item?.taskCostTime
  ));
  const usage = responsePayload?.usage
    || responseData?.usage
    || outputUsage?.usage
    || outputUsage
    || {};

  return normalizeRunningHubUsage(usage);
}

function extractTaskOutputUsage(outputValues) {
  const outputUsage = Array.isArray(outputValues)
    ? outputValues.find((item) => item?.consumeCoins || item?.consumeMoney || item?.thirdPartyConsumeMoney || item?.taskCostTime)
    : null;

  return normalizeRunningHubUsage(outputUsage || {});
}

function extractRunningHubResults(responseData) {
  const responsePayload = unwrapRunningHubPayload(responseData);
  if (Array.isArray(responsePayload?.results)) return responsePayload.results;
  if (Array.isArray(responsePayload?.data?.results)) return responsePayload.data.results;
  if (Array.isArray(responsePayload?.data)) return responsePayload.data;
  if (Array.isArray(responsePayload)) return responsePayload;
  if (Array.isArray(responseData?.results)) return responseData.results;
  if (Array.isArray(responseData?.data?.results)) return responseData.data.results;
  if (Array.isArray(responseData?.data)) return responseData.data;

  return [];
}

function extractKieResults(responseData) {
  const resultJson = parseKieResultJson(responseData?.data?.resultJson || responseData?.resultJson || '');
  if (Array.isArray(resultJson?.resultUrls)) {
    return resultJson.resultUrls.map((url) => ({
      url,
      outputType: guessOutputTypeFromUrl(url)
    }));
  }

  if (resultJson?.resultObject) {
    return [resultJson.resultObject];
  }

  return [];
}

function parseKieResultJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  return parseJsonText(value);
}

function guessOutputTypeFromUrl(url) {
  const pathname = (() => {
    try {
      return new URL(String(url || '')).pathname.toLowerCase();
    } catch (error) {
      return String(url || '').toLowerCase();
    }
  })();

  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg';
  if (pathname.endsWith('.webp')) return 'webp';
  if (pathname.endsWith('.mp4')) return 'mp4';
  if (pathname.endsWith('.png')) return 'png';
  return 'image';
}

function unwrapRunningHubPayload(responseData) {
  return responseData?.eventData || responseData?.data?.eventData || responseData?.data || responseData || {};
}

function normalizeRunningHubUsage(usage) {
  return {
    thirdPartyConsumeMoney: String(usage?.thirdPartyConsumeMoney || ''),
    consumeMoney: String(usage?.consumeMoney || ''),
    consumeCoins: Number(usage?.consumeCoins || 0),
    taskCostTime: String(usage?.taskCostTime || '')
  };
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
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac'
  };

  if (extensions[mimeType]) return extensions[mimeType];
  if (fallbackType === 'image') return 'png';
  if (fallbackType === 'audio') return 'mp3';
  return 'mp4';
}

function getUploadTypeLabel(expectedType) {
  if (expectedType === 'image') return '圖片';
  if (expectedType === 'audio') return '音訊';
  return '影片';
}

function saveRichEditorUpload(payload) {
  const parsedDataUrl = parseDataUrl(payload?.dataUrl || '');
  if (!RICH_EDITOR_UPLOAD_MIME_TYPES.has(parsedDataUrl.mimeType)) {
    throwHttpError('僅支援上傳 JPG、PNG、WebP、GIF、MP4、WebM 或 MOV 檔案', 'RICH_EDITOR_UPLOAD_TYPE_INVALID', 422);
  }

  if (parsedDataUrl.buffer.length > MAX_RICH_EDITOR_UPLOAD_SIZE) {
    throwHttpError('媒體檔案超過大小限制', 'RICH_EDITOR_UPLOAD_SIZE_EXCEEDED', 413);
  }

  const fallbackType = parsedDataUrl.mimeType.startsWith('video/') ? 'video' : 'image';
  const extension = getExtensionFromMimeType(parsedDataUrl.mimeType, fallbackType);
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(filePath, parsedDataUrl.buffer);

  return {
    location: `/uploads/${fileName}`,
    fileName,
    mimeType: parsedDataUrl.mimeType,
    size: parsedDataUrl.buffer.length
  };
}

async function uploadKieDataUrl(payload) {
  const parsedDataUrl = parseDataUrl(payload?.dataUrl || '');
  const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]);

  if (!allowedMimeTypes.has(parsedDataUrl.mimeType)) {
    throwHttpError('僅支援上傳 JPG、PNG、WebP、MP4、WebM 或 MOV 檔案', 'KIE_UPLOAD_TYPE_INVALID', 422);
  }

  if (parsedDataUrl.buffer.length > MAX_UPLOAD_SIZE) {
    throwHttpError('上傳檔案超過大小限制', 'KIE_UPLOAD_SIZE_EXCEEDED', 413);
  }

  const fallbackType = parsedDataUrl.mimeType.startsWith('video/') ? 'video' : 'image';
  const extension = getExtensionFromMimeType(parsedDataUrl.mimeType, fallbackType);
  const uploadedFile = await kieClient.uploadBase64File({
    base64Data: parsedDataUrl.buffer.toString('base64'),
    uploadPath: KIE_UPLOAD_PATH,
    fileName: `${crypto.randomUUID()}.${extension}`
  });

  return {
    url: extractKieFileUrl(uploadedFile),
    response: uploadedFile
  };
}

function extractKieFileUrl(responseData) {
  return responseData?.data?.fileUrl
    || responseData?.data?.url
    || responseData?.data?.downloadUrl
    || responseData?.fileUrl
    || responseData?.url
    || '';
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

function ensureGoogleOAuthConfigured() {
  if (!googleClientId || !googleClientSecret) {
    throwHttpError('Google 登入尚未配置', 'GOOGLE_OAUTH_NOT_CONFIGURED', 500);
  }
}

async function handleGoogleOAuthCallback(request, response, url) {
  ensureGoogleOAuthConfigured();

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = getCookieValue(request, 'runninghub_google_oauth_state');

  if (!code || !state || !savedState || state !== savedState) {
    redirectWithExpiredOAuthState(request, response, '/login?oauth=invalid_state');
    return;
  }

  try {
    const tokenPayload = await exchangeGoogleCodeForToken(request, code);
    const googleProfile = await fetchGoogleUserProfile(tokenPayload.access_token);
    const memberUser = grantMemberLoginBonus(saveGoogleMemberUser(googleProfile).id);
    const memberSession = memberSessionRepository.createSession({
      userId: memberUser.id,
      provider: 'google',
      providerSubject: googleProfile.sub,
      maxAgeSeconds: MEMBER_SESSION_MAX_AGE_SECONDS
    });

    response.writeHead(302, {
      Location: '/member/files',
      'Set-Cookie': [
        createMemberSessionCookie(request, memberSession.id),
        createExpiredCookie(request, 'runninghub_google_oauth_state')
      ]
    });
    response.end();
  } catch (error) {
    console.error('Google 登入失敗:', error);
    redirectWithExpiredOAuthState(request, response, '/login?oauth=failed');
  }
}

async function exchangeGoogleCodeForToken(request, code) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: getGoogleRedirectUri(request),
      grant_type: 'authorization_code'
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const message = payload.error_description || payload.error || 'Google token 換取失敗';
    throwHttpError(message, 'GOOGLE_TOKEN_EXCHANGE_FAILED', 502);
  }

  return payload;
}

async function fetchGoogleUserProfile(accessToken) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const profile = await response.json().catch(() => ({}));
  if (!response.ok || !profile.email) {
    throwHttpError('Google 用戶資料讀取失敗', 'GOOGLE_PROFILE_FAILED', 502);
  }

  return profile;
}

function saveGoogleMemberUser(profile) {
  const email = String(profile.email || '').trim().toLowerCase();
  const existingUser = userRepository.getUserByEmail(email);
  const displayName = String(profile.name || profile.given_name || email.split('@')[0] || 'Member').trim();
  const userPayload = {
    id: existingUser?.id || '',
    email,
    displayName,
    role: existingUser?.role === 'member' ? 'member' : 'free_user',
    membershipGroup: existingUser?.membershipGroup || 'free',
    creditBalance: existingUser?.creditBalance || 0,
    status: 'active',
    notes: existingUser?.notes || 'Google 登入'
  };

  const savedUser = userRepository.saveUser(userPayload, {
    allowInitialCreditBalance: true
  });
  if (!existingUser) {
    return userRepository.grantRegisterBonus(savedUser.id);
  }

  return savedUser;
}

function registerOrLoginMember(payload, provider) {
  const email = String(payload?.email || '').trim().toLowerCase();
  const displayName = String(payload?.displayName || payload?.name || email.split('@')[0] || 'Member').trim();

  if (!email || !email.includes('@')) {
    throwHttpError('請輸入正確 Email', 'MEMBER_EMAIL_INVALID', 422);
  }

  const existingUser = userRepository.getUserByEmail(email);
  let memberUser = userRepository.saveUser({
    id: existingUser?.id || '',
    email,
    displayName: existingUser?.displayName || displayName,
    role: existingUser?.role === 'member' ? 'member' : 'free_user',
    membershipGroup: existingUser?.membershipGroup || 'free',
    creditBalance: existingUser?.creditBalance || 0,
    status: 'active',
    notes: existingUser?.notes || '前台會員'
  }, {
    allowInitialCreditBalance: true
  });

  if (!existingUser) {
    memberUser = userRepository.grantRegisterBonus(memberUser.id);
  }

  memberUser = grantMemberLoginBonus(memberUser.id);
  const memberSession = memberSessionRepository.createSession({
    userId: memberUser.id,
    provider: provider || 'email',
    providerSubject: email,
    maxAgeSeconds: MEMBER_SESSION_MAX_AGE_SECONDS
  });

  return {
    session: memberSession,
    user: memberSession.user
  };
}

function grantMemberLoginBonus(userId) {
  return userRepository.grantDailyLoginBonus(userId, getHongKongDateKey());
}

function getHongKongDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getGoogleRedirectUri(request) {
  if (googleOauthRedirectUri) return googleOauthRedirectUri;

  const protocol = request.headers['x-forwarded-proto'] || (shouldUseSecureCookie(request) ? 'https' : 'http');
  const hostHeader = request.headers.host || `127.0.0.1:${port}`;
  return `${protocol}://${hostHeader}/api/auth/google/callback`;
}

function redirectWithExpiredOAuthState(request, response, location) {
  response.writeHead(302, {
    Location: location,
    'Set-Cookie': createExpiredCookie(request, 'runninghub_google_oauth_state')
  });
  response.end();
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
    role: 'admin',
    expiresAt: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  });

  return sessionId;
}

function getRolePermissions(role) {
  return ADMIN_ROLE_PERMISSIONS[role] || new Set();
}

function hasPermission(session, permission) {
  return getRolePermissions(session.role).has(permission);
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

function getMemberSession(request) {
  const sessionId = getCookieValue(request, MEMBER_SESSION_COOKIE);
  if (!sessionId) return null;
  return memberSessionRepository.getSessionById(sessionId);
}

function requireActiveMemberSession(request) {
  const memberSession = getMemberSession(request);
  if (!memberSession || memberSession.user.status !== 'active') {
    throwHttpError('請先註冊或登入後再使用 AI 生成功能', 'AUTH_REQUIRED', 401);
  }

  return memberSession;
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

function createMemberSessionCookie(request, sessionId) {
  return [
    `${MEMBER_SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MEMBER_SESSION_MAX_AGE_SECONDS}`,
    shouldUseSecureCookie(request) ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

function createOAuthStateCookie(request, state) {
  return [
    `runninghub_google_oauth_state=${encodeURIComponent(state)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
    shouldUseSecureCookie(request) ? 'Secure' : ''
  ].filter(Boolean).join('; ');
}

function createExpiredSessionCookie(request) {
  return createExpiredCookie(request, ADMIN_SESSION_COOKIE);
}

function createExpiredCookie(request, cookieName) {
  return [
    `${cookieName}=`,
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

function sendForbidden(response) {
  sendJson(response, 403, {
    success: false,
    message: '沒有操作權限',
    error: { code: 'ADMIN_PERMISSION_DENIED' }
  });
}

async function pipeRunningHubResponse(response, runningHubResponse) {
  const responseText = await runningHubResponse.text();
  response.writeHead(runningHubResponse.status, {
    'Content-Type': runningHubResponse.headers.get('content-type') || 'application/json; charset=utf-8'
  });
  response.end(responseText);
}

async function readJsonBody(request, maxSize = MAX_JSON_BODY_SIZE) {
  const bodyBuffer = await readRequestBody(request, maxSize);
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
        const sizeError = new Error('請求內容超過大小限制');
        sizeError.statusCode = 413;
        sizeError.code = 'REQUEST_BODY_TOO_LARGE';
        reject(sizeError);
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

async function serveUploadedFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const uploadPrefix = `${UPLOAD_DIR}${path.sep}`;
  const requestedPath = path.normalize(decodeURIComponent(url.pathname.replace(/^\/uploads\//, ''))).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(UPLOAD_DIR, requestedPath);

  if (!filePath.startsWith(uploadPrefix) && filePath !== UPLOAD_DIR) {
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
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    ...(extension === '.html' ? { 'Cache-Control': 'no-store' } : {})
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
