# RunningHub AI 工具平台

## 项目简介

这是一个轻量级 AI 工具平台 MVP。项目包含前台工具市场、动态工具页面、中文管理后台、工具配置、分类管理、任务记录、会员中心雏形和本地数据持久化能力。

当前项目仍采用单仓库轻量架构，优先把工具配置、执行闭环、后台管理、用户与积分地基跑通；后续再逐步进入工程化重构、正式会员体系、支付、云盘和内容模块。

## 快速启动

本地启动：

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
cp .env.example .env
npm install
npm start
```

Docker Desktop 启动：

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
cp .env.example .env
docker compose up -d --build
```

访问地址：

```text
前台：http://127.0.0.1:3000
后台：http://127.0.0.1:3000/admin
```

常用检查：

```bash
npm test
docker compose ps
docker compose logs -f runninghub-app
```

## 已完成功能

- 前台工具市场首页、分类筛选、搜索和动态工具详情页。
- 图片、视频、文本、数字、多行文本等动态输入控件。
- 工具顶部说明、底部说明和后台 TinyMCE 富文本编辑。
- 工具执行任务记录、后台任务列表、用户执行历史地基。
- 后台中文管理页、工具管理、分类管理、工具测试执行和上下线流程。
- SQLite 数据持久化，并保留 JSON fallback。
- 前台会员注册页、会员菜单、会员中心页面雏形。
- Google 登录本地测试连接和本地会话存储地基。
- 顶部 Notifications 与 User menu 独立下拉。
- Docker Desktop 本地运行配置。

## 待开发重点

- 前台用户正式注册、登录、会话和权限闭环。
- 后台用户管理、管理员与文章录入员权限划分。
- 前台免费用户、会员用户、会员套餐分组。
- 积分冻结、扣除、返还和积分流水。
- 用户中心真实执行历史、文件、收藏和交易记录。
- I18N 数据结构与自动翻译 Provider。
- 内容管理、SEO、文章录入和发布流程。
- 部署环境配置、生产数据库和回滚流程。

## 技术栈

- 前端：Vue 3 CDN、Element Plus CDN、Axios、CSS3。
- 后端：Node.js 原生 HTTP 服务。
- 数据：SQLite、sqlite3、JSON fallback。
- 编辑器：TinyMCE。
- 本地运行：Docker Desktop、Docker Compose。

## 开发规范

- 前台所有用户可见文案必须使用英文，包括工具页、会员中心、交易记录、按钮、提示、空状态、Loading、错误提示、SEO 标题和描述。
- 后台管理界面保持中文，便于运营配置、任务管理和用户管理。
- 后端可继续保留中文管理消息和内部流水原因；前台展示时必须转换为英文，不允许回退显示中文。
- 积分和 RunningHub RH 币换算规则只属于后端内部计费规则，前台不得展示 `consumeCoins`、RH 币、120% 公式、向下取整规则或其他计费计算细节。

## 项目文档

| 文档 | 说明 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 产品需求、功能范围与验收标准 |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | 后续开发顺序、阶段依赖和验收点 |
| [`docs/MVP-REQUIREMENTS.md`](docs/MVP-REQUIREMENTS.md) | MVP 需求说明 |

## 开发记录

### 2026-07-26

- 會話的主要目的：移除 Remove Background 預覽圖片被後端寫死覆蓋，導致後台新圖和前台公開資料不同步的問題。
- 完成的主要任務：刪除 `src/database.js` 中針對 `remove-background` 空封面的硬編碼 migration；刪除 `src/toolRepository.js` 中自動把 Remove Background 舊圖替換成預設 Unsplash 圖的升級邏輯；新增工具 repository 回歸測試，確保重新 seed 預設工具不會覆蓋後台保存的自定義預覽圖。
- 關鍵決策和解決方案：只保留首次建立預設工具時的初始 preview 圖；工具一旦存在，預覽圖片完全以後台保存值為準，不再由 migration 或 seed upgrade 改寫。
- 使用的技術棧：Node.js 原生 HTTP、SQLite / JSON fallback、Node test runner。
- 新增或修改了哪些文件：修改 `src/database.js`、`src/toolRepository.js`、`package.json` 和 `README.md`，新增 `test/toolRepository.test.js`。
- 後續建議：部署後在後台重新保存 Remove Background 的預覽圖片，然後檢查 `https://api.imgkit.io/api/tools?_ts=...` 是否返回同一個新 URL。
- 會話的主要目的：修復後台修改工具預覽圖片後，前台工具市場仍顯示舊圖片資料的問題。
- 完成的主要任務：公開工具列表、工具詳情和分類 API 回應新增 no-store/no-cache headers；前台載入 `/api/tools`、`/api/tools/:slug` 和 `/api/categories` 時加入時間戳查詢參數，避免瀏覽器、CDN 或反向代理返回舊 JSON。
- 關鍵決策和解決方案：保留後台保存邏輯不變，因為後台列表已顯示新圖，問題集中在前台公開資料讀取；Remove Background 的預設封面升級只處理空值或舊壞 URL，不會覆蓋後台新配置。
- 使用的技術棧：Node.js 原生 HTTP、Vue 3 CDN、Axios、SQLite / JSON fallback。
- 新增或修改了哪些文件：修改 `server.js`、`frontend/index.html` 和 `README.md`。
- 後續建議：部署後重新保存 Remove Background，前台刷新後應立即看到後台新圖；如仍舊圖，需檢查部署層 CDN 是否另有圖片 URL 快取。
- 會話的主要目的：安裝 Google tag 以便前台網站接入 Google Analytics。
- 完成的主要任務：在前台 `frontend/index.html` 的 `<head>` 加入 Google tag `G-4WHJP9D5NM`；後台 `frontend/admin.html` 未加入追蹤碼，避免管理操作混入前台流量分析。
- 關鍵決策和解決方案：使用 Google 官方 `gtag.js` snippet，保持前台可見內容不變，不新增任何後端設定或敏感資訊。
- 使用的技術棧：HTML、Google tag、Vue 3 CDN 前台。
- 新增或修改了哪些文件：修改 `frontend/index.html` 和 `README.md`。
- 後續建議：部署後用 Google Analytics DebugView 或瀏覽器 Network 檢查 `G-4WHJP9D5NM` 是否有 page_view 事件。
- 會話的主要目的：檢查 RunningHub API 建立任務失敗時前台只顯示「未返回任務 ID」的問題。
- 完成的主要任務：對照 RunningHub 文檔中心後，RunningHub 工作流建立任務改為 `POST /task/openapi/create`，body 內帶 `apiKey`、`workflowId`、`nodeInfoList`、`instanceType` 和 `usePersonalQueue`；新增 RunningHub JSON 回應錯誤解析，當 API 以 HTTP 200 返回非 0 `code` 或 `success: false` 時，後端會直接回傳 RunningHub 的真實錯誤訊息與錯誤碼，不再誤判為 taskId 缺失；同時把 taskId 缺失 fallback 改為英文前台訊息並附回應字段摘要。
- 關鍵決策和解決方案：RunningHub 上傳仍使用 `/openapi/v2/media/upload/binary`，任務建立、狀態和輸出統一使用 `/task/openapi/*`；錯誤解析和 taskId 兼容抽到 `src/runningHubResponse.js` 並補單元測試，方便後續兼容更多 RunningHub 回應格式。
- 使用的技術棧：Node.js 原生 HTTP、RunningHub API、Vue 3 CDN、Node test runner。
- 新增或修改了哪些文件：修改 `server.js`、`src/runningHubResponse.js`、`test/runningHubResponse.test.js`、`docs/MVP-REQUIREMENTS.md` 和 `README.md`。
- 後續建議：部署後再次提交同一個 RunningHub 工具；若仍失敗，前台應顯示 RunningHub 真實錯誤，例如 workflowId、nodeId、fieldName、檔案 URL 或權限相關原因。
- 會話的主要目的：修復後台配置的工具預覽圖片在前台工具市場不顯示，並刪除前台預計時間顯示。
- 完成的主要任務：前台工具卡片的預覽圖改為透過資產 URL helper 解析，支援後台上傳返回的 `/uploads/...` 相對路徑在 `imgkit.io` 前台中正確指向 `api.imgkit.io`；公開工具 API 不再輸出固定 `estimatedSeconds`；工具市場卡片移除 `About 30s` 類預計時間；已知 404 的 Remove Background 預設封面會在啟動 seed 流程中自動替換。
- 關鍵決策和解決方案：只替換空封面或舊壞 URL，不覆蓋後台新配置的圖片；前台可見 fallback 文案保持英文；不新增前台計費或時間說明。
- 使用的技術棧：Node.js 原生 HTTP、Vue 3 CDN、SQLite / JSON fallback。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`src/toolRepository.js`、`src/database.js` 和 `README.md`。
- 後續建議：部署後在前台工具市場檢查後台上傳的 preview 圖是否從 `https://api.imgkit.io/uploads/...` 載入，並確認工具卡片不再顯示預計時間。
- 會話的主要目的：修復 KIE / Kit API 工具任務完成後沒有扣減用戶積分的問題。
- 完成的主要任務：KIE 任務取回輸出時改為抽取 API 回傳的消耗欄位，支援 `consumeCoins`、`creditsConsumed`、`credits_consumed`、`creditConsumed`、`consumedCredits` 和 `costCredits`；若 API 沒有返回消耗，則按後台工具 `creditCost` 扣減；已完成但未扣費的舊任務再次取結果時會補扣並更新任務記錄。
- 關鍵決策和解決方案：RunningHub 等返回實際消耗的工具仍按實際消耗 * 1.2 向下取整扣減；KIE Veo 文檔範例未展示消耗欄位，因此會使用後台配置值作兜底；前台不顯示任何扣費公式或 provider 消耗細節。
- 使用的技術棧：Node.js 原生 HTTP、KIE API、RunningHub usage、SQLite / JSON fallback。
- 新增或修改了哪些文件：修改 `server.js` 和 `README.md`。
- 後續建議：部署後分別測試 Google Nano Banana 與 Google Veo 3.1，確認任務完成後 Member Center 的 Transactions history 出現扣減流水，後台任務記錄有 charged credits。
- 會話的主要目的：修復會員登入像重新註冊、註冊當天重複派發登入獎勵，以及 RunningHub 工具建立任務時抽不到 taskId 的問題。
- 完成的主要任務：新增 `app_users.password_hash` 資料庫欄位，email 註冊改為保存密碼雜湊，email 登入改為驗證既有帳號；前台登入狀態以後端 session cookie 為準；新註冊只派發 100 註冊獎勵並標記當日登入獎勵已處理；RunningHub 建任務回應改為兼容 `taskId`、`task_id`、字串型 `data` 和嵌套 `eventData` 等格式。
- 關鍵決策和解決方案：註冊與登入分離，避免 `/api/auth/login` 自動建立新用戶；密碼雜湊不輸出到會員或後台 API；用最小獨立 helper 管理 RunningHub taskId 解析，並加入回歸測試。
- 使用的技術棧：Node.js 原生 HTTP、PBKDF2 SHA-256、SQLite / JSON fallback、Vue 3 CDN、Node test runner。
- 新增或修改了哪些文件：新增 `src/runningHubResponse.js`、`test/runningHubResponse.test.js`、`test/userCredits.test.js`；修改 `server.js`、`src/database.js`、`src/userRepository.js`、`frontend/index.html`、`package.json` 和 `README.md`。
- 後續建議：部署後用真實瀏覽器測試註冊、登出、登入、Google 登入，以及一個 RunningHub 工具任務；確認 Member Center 的 My Files / Transactions history 讀到同一個資料庫用戶記錄。

### 2026-07-25

- 會話的主要目的：推送前台 Aspect Ratio 選項樣式更新到 GitHub。
- 完成的主要任務：確認本地未提交更新，整理比例選項 CSS 縮排，保留更小尺寸的比例選項與只在已知比例中顯示 icon 的前台樣式。
- 關鍵決策和解決方案：不改動工具邏輯和 API，只提交現有前台樣式更新，避免影響剛新增的 KIE Veo 3.1 工具流程。
- 使用的技術棧：Vue 3 CDN、CSS、Node.js 原生 HTTP。
- 新增或修改了哪些文件：修改 `frontend/index.html` 和 `README.md`。
- 後續建議：部署後檢查 Aspect Ratio 選項在桌面與手機版是否維持緊湊且不重疊。

### 2026-07-24

- 會話的主要目的：接入 PayPal Sandbox 收款 API，并生成正确的 PayPal Webhook URL。
- 完成的主要任務：新增 PayPal Orders v2 创建订单、Capture 付款和 Webhook 接收接口；前台会员套餐按钮改为跳转 PayPal Checkout，付款返回后自动 capture 并刷新会员积分与交易记录；新增 `payment_orders` 表与 JSON fallback 支持。
- 關鍵決策和解決方案：PayPal Client ID、Secret、Webhook ID 仅通过环境变量配置，仓库只提交 `.env.example` 占位；付款发放积分以订单关联流水做幂等判断，避免重复入账；Capture 后校验金额、币种和订单引用；生产回跳地址使用 `PUBLIC_APP_BASE_URL`，不信任任意 Host Header；Webhook 在未配置 `PAYPAL_WEBHOOK_ID` 时只接收不改账，防止未验签请求修改积分。
- 使用的技術棧：Node.js 原生 HTTP、PayPal Orders v2 API、PayPal Webhook verify signature、SQLite、JSON fallback、Vue 3 CDN、Axios。
- 新增或修改了哪些文件：新增 `src/paypalClient.js`、`src/paymentRepository.js`、`src/paymentPlans.js`；修改 `server.js`、`src/database.js`、`frontend/index.html`、`.env.example`、`package.json` 和 `README.md`。
- 後續建議：在 PayPal Sandbox 后台将 Webhook URL 设置为 `https://api.imgkit.io/api/payments/paypal/webhook`，保存后把 PayPal Webhook ID 填入部署环境变量 `PAYPAL_WEBHOOK_ID`，再重建生产 Docker 服务。
- 會話的主要目的：修复浏览器直接打开 PayPal Webhook URL 时显示 404，避免误判 Webhook 未部署。
- 完成的主要任務：为 `GET /api/payments/paypal/webhook` 增加 readiness JSON 响应；PayPal 事件处理仍保持 `POST /api/payments/paypal/webhook`。
- 關鍵決策和解決方案：只增加只读健康响应，不改变 webhook 验签、capture、金额校验和积分入账逻辑；支付 API 未命中时返回英文错误，保持前台可见内容为英文。
- 使用的技術棧：Node.js 原生 HTTP、PayPal Webhook。
- 新增或修改了哪些文件：修改 `server.js` 和 `README.md`。
- 後續建議：部署后用浏览器打开 Webhook URL 应看到 ready JSON；PayPal 后台仍需配置同一个 URL，并使用 POST 事件通知。
- 會話的主要目的：排查 Google Nano Banana Pro 使用 KIE API 時仍被 IP 白名單拒絕的原因。
- 完成的主要任務：新增登入後可查詢的 `GET /api/kie/diagnostics` 診斷接口，返回後端出站 IP、KIE API Base URL、File API Base URL、KIE API Key 安全指紋與 credit check 結果；前台工具執行失敗 toast 改為顯示後端返回的具體英文錯誤訊息。
- 關鍵決策和解決方案：不輸出完整 KIE API Key，只用 SHA-256 前 12 位作安全指紋，方便比對線上服務實際使用的 Key 是否與 KIE 後台已設白名單的 Key 一致；不重試生成任務，避免在白名單未確認前再次消耗額度。
- 使用的技術棧：Node.js 原生 HTTP、KIE API、Vue 3 CDN、Element Plus。
- 新增或修改了哪些文件：修改 `src/kieClient.js`、`server.js`、`frontend/index.html`、`.env.example` 和 `README.md`。
- 後續建議：部署後登入會員並打開 `https://api.imgkit.io/api/kie/diagnostics`，確認 `egressIp` 是否仍為 `82.29.163.78`，以及 `apiKeyFingerprint` 是否對應 KIE 後台已配置白名單的同一把 API Key。
- 會話的主要目的：對照 KIE Nano Banana Pro 官方文檔，修正 API Key 已設白名單但仍被 IP 拒絕的問題。
- 完成的主要任務：確認 Nano Banana Pro 的 endpoint、Bearer Token、`model`、`prompt`、`image_input`、`aspect_ratio`、`resolution` 和 `output_format` 與官方文檔一致；將 KIE API HTTP client 改為 IPv4-only 請求；診斷接口新增 `ipv6EgressIpCheck`，方便部署後確認是否存在 IPv6 出站差異。
- 關鍵決策和解決方案：KIE 域名同時有 A 與 AAAA 記錄，而後台白名單只配置 IPv4 時可能被 IPv6 出站路徑拒絕；本次只限制 KIE provider 走 IPv4，不影響 RunningHub、PayPal 或其他 HTTP 請求。
- 使用的技術棧：Node.js 內建 `https`、`dns`、KIE API、Nano Banana Pro 官方文檔。
- 新增或修改了哪些文件：修改 `src/kieClient.js`、`server.js` 和 `README.md`。
- 後續建議：部署後重新打開 `https://api.imgkit.io/api/kie/diagnostics`，如 `creditCheck.success` 變為 `true`，即可再測 Google Nano Banana Pro；如仍為白名單錯誤，需把 `ipv6EgressIpCheck` 結果一併提供給 KIE 支援。
- 會話的主要目的：把 KIE 的 Nano Banana、Nano Banana 2 Lite 和 Nano Banana Pro 合併到同一個工具頁，透過下拉選單選擇模型。
- 完成的主要任務：為 Google Nano Banana 工具新增 `Model` 下拉欄位；後端按所選模型提交 `google/nano-banana`、`nano-banana-2-lite` 或 `nano-banana-pro`；依不同模型自動映射 `image_input` / `image_urls`、`resolution` 和 `output_format`；既有資料庫工具會在啟動時自動補入模型欄位。
- 關鍵決策和解決方案：保留原本 `/tools/google-nano-banana-pro` 路徑，避免破壞已配置入口；三個模型共用同一套前台表單，後端負責轉換成 KIE 官方文檔要求的不同 input 結構；KIE 工具的 Data URL 參考圖改為上傳到 KIE 文件接口，不再走 RunningHub 上傳。
- 使用的技術棧：Node.js 原生 HTTP、KIE API、Vue 3 CDN、SQLite / JSON fallback。
- 新增或修改了哪些文件：修改 `server.js`、`src/toolRepository.js` 和 `README.md`。
- 後續建議：部署後進入圖片工具內的 Google Nano Banana 頁面，確認 `Model` 下拉包含三個選項，再分別用不帶參考圖的小 prompt 做低成本測試。
- 會話的主要目的：參考 KIE Veo 3.1 官方文檔新增 Veo 3.1 視頻生成工具頁。
- 完成的主要任務：新增 `Google Veo 3.1` 工具配置，提供 Model、Generation Type、Prompt、Video Ratio、Resolution、Duration 和可選 Reference Images；後端新增 Veo 專用 `POST /api/v1/veo/generate` 建任務與 `GET /api/v1/veo/record-info` 輪詢解析；前台結果區沿用 video preview 顯示生成影片。
- 關鍵決策和解決方案：Veo 3.1 使用 KIE 獨立 Veo API，不走 Nano Banana 的 `jobs/createTask`；Text to Video 會忽略已上傳參考圖，Image to Video / Reference to Video 才把圖片 URL 傳入 `imageUrls`；Reference to Video 按文檔固定 8 秒。
- 使用的技術棧：Node.js 原生 HTTP、KIE Veo 3.1 API、Vue 3 CDN、SQLite / JSON fallback。
- 新增或修改了哪些文件：修改 `src/kieClient.js`、`server.js`、`src/toolRepository.js`、`frontend/index.html` 和 `README.md`。
- 後續建議：部署後進入 `/tools/google-veo-3-1`，先用 `Veo 3.1 Fast`、`Text to Video`、`720p`、`4s` 做小 prompt 測試，再測 Image to Video 和 Reference to Video。

### 2026-07-10

- 从单页演示逐步升级为 AI 工具平台方向。
- 完成图片处理演示页、后端代理、Docker Desktop 本地运行、管理后台首页和导航雏形。
- 多次补充 PRD，明确工具市场、会员、云盘批量、双语、推荐奖励、套餐和 Node.js 自研后台方向。
- 放弃 Cockpit POC，回到当前 Node.js 轻量后台路线。

### 2026-07-11

- 完成工具新增/编辑页的动态输入节点配置。
- 上传类输入统一为 image / video 类型。
- 明确后台中文显示规则。
- 梳理 PRD 开发顺序，确定先做数据持久化、后台配置、前台动态读取和任务记录闭环。
- 完成 SQLite 地基、工具配置保存、后台新增工具保存和 Docker 数据持久化。

### 2026-07-12

- 增加工具预览图片、工具分类管理和四个基础分类。
- 新增开发路线文档，明确后续按依赖链推进。
- 完成前台动态工具页、工具市场首页、分类菜单、侧边栏和工具执行闭环。
- 修复 GitHub Actions 构建流程。
- 增加后台工具测试执行、测试状态和上线限制。
- 根据部署反馈处理构建问题，并持续保持本地测试通过。

### 2026-07-13

- 完成工具页富文本、动态媒体输入、Before/After 结果区和前台排版修正。
- 规划 I18N 与自动翻译 Provider，但暂缓开发，优先完成基础闭环。
- 完成后台任务列表、用户执行历史和积分地基。
- 增加前台会员注册页、会员菜单、会员中心页面。
- 接入 Google 登录本地测试连接，并准备后续 D1/正式存储方案。
- 修正后台登录、用户分组思路和前后台用户角色边界。
- 拆分前台 Notifications 与 User menu，下拉菜单不再混用。
- 精简 README，移除临时调试细节，并将会话总结按天合并。

### 2026-07-14

- 将输出结果改为重叠式 Before/After 对比，支持鼠标或触控左右移动查看差异。
- 更新积分规则：注册赠送积分、每日登录奖励、登录奖励限期有效，并为工具增加单次消耗积分配置。
- 前台 AI 生成功能增加登录门槛，未登录用户需先注册或登录。
- 后台账号与前台注册会员拆分为独立页面，分别管理后台角色和会员资料。
- 会员设置页改为按月/按年订阅卡片选择，避免直接随意切换套餐。
- 增加 DeepL 翻译 Provider 配置地基，密钥仅通过本地环境变量配置。

### 2026-07-15

- 将前台页面现有静态文案统一改为英文，后台中文管理界面保持不变。
- 增加前台显示层英文兜底映射，让默认中文分类、默认工具名称、输入提示和默认工具说明在前台显示为英文。
- 本次仅调整前台展示文案和 README 记录，未写入任何密钥或敏感配置。
- 针对部署后 503 增加 Node 托管兼容入口，并兼容非数字端口监听场景，便于 Hostinger 等平台启动应用。
- 调整工具积分扣减规则：工具任务创建成功后不再按后台固定配置预扣积分，改为 RunningHub 任务成功并取得输出结果后，读取 `usage.consumeCoins`，按实际消耗的 120% 向下取整扣减用户积分。
- 为执行任务记录新增实际消耗与已扣积分字段，避免用户重复刷新结果时重复扣减积分，并保留积分流水与任务 ID 关联。
- 排查 Docker Desktop 本地访问 `localhost:3000` 顯示 `Not Found`：确认当前应用代码以本机 Node 方式启动可正常返回首页，但 Docker 容器、镜像 blob 与 metadata 多处出现 `input/output error`，判断为 Docker Desktop 存储层或旧容器状态异常，需重启或重置 Docker Desktop 后重建容器。
- 修复任务完成后不扣积分与会员中心不显示记录的问题：兼容 RunningHub 输出对象内的 `consumeCoins` 字段，成功结果已有输出时也会补做一次幂等扣分；新增 `/api/me/tasks`、`/api/me/ledger`，前台 My Files 与 Transactions history 改为读取真实任务和积分流水。
- 修复 JSON fallback 数据库的用户查询和登入奖励日期更新问题，避免在 Docker 或部署环境降级到 JSON 存储时把会员资料覆盖为空，导致会话、任务归属和会员记录读取失败。
- 对齐 RunningHub API 文档：查询结果以 `results` 保存输出文件，以 `usage.consumeCoins` 读取运行消耗的 RH 币；用户积分扣减规则明确为 `RH 幣消耗 × 120%` 向下取整。
- 积分扣减触发点明确为任务成功后获取输出结果接口 `/api/tasks/:taskId/outputs`，即前台准备显示结果时扣减用户积分；会员中心只读取已落库的文件和积分流水。
- 增加前台英文文案规则，并隐藏前台交易记录中的积分计算细节；Transactions history 会把中文内部流水原因转换为英文展示。
- 明确项目规则：前台所有用户可见内容只能显示英文；后台保持中文；积分与 RH 币换算规则仅在后端内部使用，不在前台页面、提示或 Transactions history 中展示。

### 2026-07-16

- 修改後台「新增 / 編輯工具配置」頁，增加搭建頁面模式，可上傳 ComfyUI API JSON 工作流並自動分析輸入節點和節點輸入參數。
- 後台頁面內置臨時工作流分析邏輯，不保存工作流文件；分析時會排除模型載入與節點連線類內部欄位，提取可配置字段並推斷 image、video、audio、number、textarea、text、select、switch 等資料類型。
- 搭建頁面新增組件庫、拖放畫布、屬性面板、工作流分析結果彈窗和 API 調用 JSON 預覽；分析出的節點可逐個加入或一鍵生成工具輸入配置。
- 驗證三個視頻工作流 JSON 均可解析：去水印/去字幕工作流識別 81 個可配置字段，Wan2.2 + SeedVR2 工作流識別 37 個字段，FlashVSR 工作流識別 42 個字段。
- 前台工具頁同步支持 audio 上傳與 switch 開關參數，後端工具輸入校驗和 RunningHub 參數轉換同步支持 audio 與 switch。
- 本次使用 Node.js 原生後端、Vue 3 CDN 後台頁、現有 inputNodes 結構完成，未引入新依賴；後續可再增加按節點 class 預設分組、字段白名單和更精準的枚舉選項來源。

### 2026-07-17

- 會話的主要目的：補強後台工具搭建頁右側屬性面板的 label 與字段說明，讓節點配置更清楚。
- 完成的主要任務：為組件標題、參數名稱、nodeId、fieldName、資料類型、可上傳文件類型、佔位提示、預設值與是否必填增加清晰標籤和輔助說明。
- 關鍵決策和解決方案：保持現有工作流分析與 inputNodes 保存結構不變，只調整屬性面板 UI；可上傳文件類型改為完整行標籤，避免白底界面中看不清文字。
- 使用的技術棧：Vue 3 CDN、原生 CSS、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/admin.html` 和 `README.md`。
- 後續建議：如需完全對齊參考圖，可再補充更細的屬性分組，例如基本屬性、節點綁定、文件限制和校驗規則。
- 會話的主要目的：讓搭建頁點選不同組件時，右側只顯示該組件相關屬性。
- 完成的主要任務：將右側屬性面板拆成組件信息、工作流綁定、類型專屬屬性和校驗規則；圖片/視頻/音頻顯示上傳設定，文字顯示文字設定，數字顯示數字設定，下拉顯示選項設定，開關顯示預設狀態。
- 關鍵決策和解決方案：沿用既有 selectedBuilderNode 和 inputNodes 結構，不新增保存字段；只按 dataType 控制屬性面板顯示內容，切換資料類型時同步修正預設值、上傳類型和下拉選項。
- 使用的技術棧：Vue 3 CDN、原生 CSS、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/admin.html` 和 `README.md`。
- 後續建議：可再加入數字最小值、最大值、步進值等更細校驗配置。
- 會話的主要目的：修復搭建頁新增第二個組件後無法點回第一個組件修改的問題。
- 完成的主要任務：將已存在的 `selectBuilderNode` 方法暴露給 Vue 模板，恢復畫布組件點選切換選中狀態。
- 關鍵決策和解決方案：不改動畫布排序、組件保存或屬性面板結構，只修復模板可調用方法缺失導致的點選報錯。
- 使用的技術棧：Vue 3 CDN、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/admin.html` 和 `README.md`。
- 後續建議：如再遇到前端點擊無反應，可優先查看瀏覽器 Console 是否有模板方法未暴露的錯誤。
- 會話的主要目的：將搭建頁左側圖片、視頻、音頻三個上傳組件合併為一個文件上傳組件。
- 完成的主要任務：組件庫只保留「文件上傳」，右側上傳設定中用可上傳文件類型勾選圖片、視頻或音頻；切換文件類型時同步底層 dataType，保持前台和後端現有執行鏈路兼容。
- 關鍵決策和解決方案：不移除 image/video/audio 底層資料類型，只合併手動搭建入口；自動分析工作流生成的媒體節點仍按原始字段類型保存。
- 使用的技術棧：Vue 3 CDN、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/admin.html` 和 `README.md`。
- 後續建議：可再為多選文件類型補充前台文案，如「Upload image, video or audio」。
- 會話的主要目的：調整 Seed 數值的生成和提交規則。
- 完成的主要任務：Seed 在前台改為獨立輸入區，支援掷骰與鎖定；未鎖定時每次提交自動換新隨機數，鎖定後保持不變；隨機範圍縮小到約 1/3 的區間以避免過大數值。
- 關鍵決策和解決方案：Seed 不再走一般 number 的浮點解析，前端和後端都按整數字符串處理，後端校驗 0 到 18446744073709551615；普通數字欄位保持原樣。
- 使用的技術棧：Vue 3 CDN、原生 CSS、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`server.js` 和 `README.md`。
- 後續建議：如果你要更接近示例圖，也可以再把 Seed 視覺做得更像一個單行數字卡片。
- 會話的主要目的：修復前台 Seed 未顯示投子按鈕和固定勾選的問題。
- 完成的主要任務：Seed 判斷改為同時識別 key、fieldName、label 和英文兜底文案；當默認值為 -1 時自動生成隨機數；投子按鈕在鎖定時禁用。
- 關鍵決策和解決方案：保留 Seed 專用 UI 和提交邏輯，只放寬識別條件，避免已配置工具因 key 不是 seed 而回退到普通數字輸入框。
- 使用的技術棧：Vue 3 CDN、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/index.html` 和 `README.md`。
- 後續建議：如需更明顯，可再把 Lock 改成只顯示圖標勾選框。
- 會話的主要目的：為自定義數字組件增加最小值、最大值和前台 slider 調整。
- 完成的主要任務：後台數字屬性面板新增最小值和最大值；工具配置保存 `minValue`、`maxValue`；前台普通數字字段顯示 slider 與數字輸入框，拖動時限制在兩個值之間。
- 關鍵決策和解決方案：Seed 保持專用隨機種子 UI，不使用普通數字 slider；普通 number 字段才使用 min/max slider，後端執行時也校驗數值範圍。
- 使用的技術棧：Vue 3 CDN、Node.js、SQLite JSON 配置。
- 新增或修改了哪些文件：修改 `frontend/admin.html`、`frontend/index.html`、`src/toolRepository.js`、`server.js` 和 `README.md`。
- 後續建議：可再加入 step 步進值配置，讓小數參數如 3.5 有更精準的滑動控制。
- 會話的主要目的：確認設計相關 skills 狀態，並按設計審查流程對前台工具頁和後台搭建頁做第一輪美化。
- 完成的主要任務：確認 `skill-installer`、`design-review`、`design-consultation`、`design-html` 等能力已可用，無需重複安裝；前台工具頁新增任務區和結果區標題層級，統一上傳、Seed、slider、表單焦點態和結果空狀態；後台搭建頁從深色混合樣式調整為淺色工作台，強化組件庫、畫布、選中態、屬性面板和工作流上傳彈窗可讀性。
- 關鍵決策和解決方案：因工作區已有未提交功能改動，未執行 `design-review` 要求的乾淨工作區與逐項 commit 流程，改採 best-effort CSS-first 美化；前台新增文案保持英文，且不展示任何積分計算規則。
- 使用的技術棧：Vue 3 CDN、原生 CSS、Node.js 語法檢查、gstack design skills。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`frontend/admin.html` 和 `README.md`。
- 後續建議：如需完整視覺審查，可先提交或暫存當前功能改動，再啟動本地服務做瀏覽器截圖審查與逐項修正。
- 會話的主要目的：按參考圖調整前台工具頁右側主工作區，左側工具 menu 保持不變。
- 完成的主要任務：將工具頁主內容改為兩欄工作區，左欄顯示上傳、Prompt、Seed、slider、開關和提交按鈕等功能組件，右欄顯示工具標題、說明和輸出結果；窄屏時自動改為上下排列。
- 關鍵決策和解決方案：不改動最左側工具 menu、任務提交、結果輪詢和扣分邏輯，只調整 `frontend/index.html` 的模板位置與 CSS grid；前台新增和保留文案均為英文，不展示積分計算規則。
- 使用的技術棧：Vue 3 CDN、原生 CSS、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/index.html` 和 `README.md`。
- 後續建議：可啟動本地服務後用桌面與手機寬度各截圖一次，微調左欄寬度和結果區圖片高度。
- 會話的主要目的：修復自定義數字組件在後台設置最大值、最小值後，前台 slider 範圍不生效的問題。
- 完成的主要任務：前台數字組件讀取範圍時兼容 `minValue`、`maxValue`、`min`、`max`、`minimum`、`maximum`；後台保存工具時會把數字組件的最大值、最小值規範化為數字；後端校驗數字範圍時不再把空字符串誤判為 0。
- 關鍵決策和解決方案：保留現有 inputNodes 結構，不新增字段；確認本地資料庫中已上線 `remove-background` 工具的舊數字節點尚未保存 `minValue/maxValue`，因此需要在後台重新保存該工具後前台才會得到新的 0-100 範圍。
- 使用的技術棧：Vue 3 CDN、Node.js、SQLite、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`frontend/admin.html`、`server.js` 和 `README.md`。
- 後續建議：後台編輯該工具並保存一次，再刷新前台工具頁確認 slider 右側最大值顯示為 100。
- 會話的主要目的：修復後台自定義數字最大值、最小值保存後，再次進入編輯頁顯示空白的問題。
- 完成的主要任務：編輯工具時會同步回填數字組件的 `minValue/maxValue`，並兼容舊字段 `min/max/minimum/maximum`；保存前再次同步數字範圍；保存成功後用後端返回的工具資料更新本地列表，避免立即重新進入編輯時讀到舊資料。
- 關鍵決策和解決方案：不改 inputNodes 資料結構，只補強後台回填與保存後刷新；用本地 Repository 模擬保存驗證 `minValue: 0`、`maxValue: 100` 可正確持久化並讀回。
- 使用的技術棧：Vue 3 CDN、Node.js、SQLite、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/admin.html` 和 `README.md`。
- 後續建議：部署或重啟本地服務後，重新保存該工具，再進入編輯頁確認最大值、最小值不再空白。
- 會話的主要目的：二次修復自定義數字組件最小值、最大值仍然無法保存的問題。
- 完成的主要任務：後端工具保存層新增數字範圍兜底，將 `minValue/min/minimum` 和 `maxValue/max/maximum` 統一保存為 `minValue/maxValue`；後台表單模式也補上最小值、最大值輸入框，並在切換為數字類型時初始化 `0~10`。
- 關鍵決策和解決方案：保留既有 inputNodes 結構，避免新增遷移；同時修復後端持久化兜底與後台兩個編輯入口不一致的問題，確保搭建頁面和表單模式都能保存數字範圍。
- 使用的技術棧：Vue 3 CDN、Node.js、SQLite、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/admin.html`、`src/toolRepository.js` 和 `README.md`。
- 後續建議：更新 Docker 或重啟 Node 服務後，在後台重新保存工具，再進入編輯頁確認最小值、最大值仍保留。
- 會話的主要目的：為工具編輯器增加多圖上傳組件與屬性欄動態配置。
- 完成的主要任務：後台圖片組件新增單圖/多圖模式、最大張數、每行數量、單張大小上限和壓縮品質；前台圖片輸入支援縮略圖網格、Add 卡片與單張刪除；提交時多圖會以陣列送出，後端與 repository 也同步兼容並保留配置。
- 關鍵決策和解決方案：沿用既有 image 組件擴展，不新增獨立多圖資料類型；前台執行層與後台編輯層共用 `uploadMode`，避免工作流 JSON 與儲存資料分叉。
- 使用的技術棧：Vue 3 CDN、Node.js、SQLite、Node.js 語法檢查。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`frontend/admin.html`、`server.js`、`src/toolRepository.js` 和 `README.md`。
- 後續建議：重新保存一次有圖片組件的工具，再到前台測試多圖新增、刪除與提交結果是否都正常。

### 2026-07-20

- 会话的主要目的：修复前台选择多行文字组件后，下面仍额外显示单行输入框的问题。
- 完成的主要任务：将前台动态字段模板调整为同一条互斥渲染链，`textarea` 渲染后不会再继续命中默认单行输入框。
- 关键决策和解决方案：只修复 `frontend/index.html` 中动态字段条件分支，不重构表单组件结构，避免影响 select、Aspect Ratio、Seed、number 等已有输入控件。
- 使用的技术栈：Vue 3 CDN、Node.js 语法检查。
- 新增或修改了哪些文件：修改 `frontend/index.html` 和 `README.md`。
- 后续建议：刷新前台工具页面后，选择多行文字配置的字段应只显示一个多行输入框。

### 2026-07-21

- 会话的主要目的：参考 Kie Nano Banana Pro 文档，使用已配置的 Kie API 制作 Google Nano Banana Pro 图生图工具页，并放入图片工具分类。
- 完成的主要任务：扩展 Kie client 支持创建任务和查询任务记录；后端工具执行链按 `kie:` 工作流标记分流到 Kie；新增 `google-nano-banana-pro` 默认工具，支持最多 8 张参考图、Prompt、Aspect Ratio、Resolution 和 Output Format。
- 关键决策和解决方案：不新增数据库字段，使用 `workflowId = kie:nano-banana-pro` 作为内部 provider 标记；继续复用现有前台工具页、任务轮询、输出展示和图片多上传组件。
- 使用的技术栈：Node.js、Kie API、Vue 3 CDN、SQLite/JSON repository。
- 新增或修改了哪些文件：修改 `src/kieClient.js`、`server.js`、`src/toolRepository.js` 和 `README.md`。
- 后续建议：重启服务后进入图片分类或 `/tools/google-nano-banana-pro`，用已登录会员账号上传参考图并测试生成结果。
- 会话的主要目的：在后台增加 Menu 管理功能，可手动添加 Kie API 等其它功能入口，并支持分级管理。
- 完成的主要任务：新增 `admin_menus` 持久化表与 JSON fallback；新增 `menuRepository`；提供 `/api/admin/menus` 读取和保存接口；后台侧栏显示自定义 Menu 树；后台新增 Menu 管理页，可编辑父级、目标类型、路径、排序和启停状态。
- 关键决策和解决方案：保留系统核心后台菜单为固定入口，避免误删导致后台不可用；自定义 Menu 作为可管理扩展入口，支持一、二级层级，可挂载后台路由、外部链接或 API / 功能占位。
- 使用的技术栈：Node.js、Vue 3 CDN、SQLite、JSON fallback。
- 新增或修改了哪些文件：新增 `src/menuRepository.js`，修改 `src/database.js`、`server.js`、`frontend/admin.html`、`package.json` 和 `README.md`。
- 后续建议：后续如果要把某个 API 功能做成完整页面，可直接复用自定义 Menu 的路径，并在后台路由区域增加对应功能面板。
- 会话的主要目的：排查 Kie API 白名单仍提示服务器 IP 不匹配的问题。
- 完成的主要任务：确认 `api.imgkit.io` 已解析到单一 A 记录 `82.29.163.78`，并新增 `/api/kie/egress-ip` 诊断接口，用于部署后查询生产 Node 后端真实出站公网 IP。
- 关键决策和解决方案：说明 Kie 白名单校验的是后端请求 Kie 时的出站 IP，不是前台域名或 DNS A 记录本身；如果服务器入站 IP与出站 NAT IP 不一致，需将诊断接口返回的 IP 加入 Kie 白名单。
- 使用的技术栈：Node.js、Kie API、DNS 查询。
- 新增或修改了哪些文件：修改 `server.js` 和 `README.md`。
- 后续建议：部署到 `82.29.163.78` 对应服务器后，用已登录会员访问 `/api/kie/egress-ip`，再把返回值加入 Kie 白名单。
- 会话的主要目的：将前台与后端 API 域名分离，避免前台 `imgkit.io` 动态/CDN 路由导致 Kie API 白名单无法绑定固定 IP。
- 完成的主要任务：通过 Hostinger DNS 将 `api.imgkit.io` 从 CDN ALIAS 调整为固定 A 记录 `82.29.163.78`；前台 Axios 请求在生产前台域名下统一走 `https://api.imgkit.io`；后端 `/api/*` 增加允许 `imgkit.io`、`www.imgkit.io`、`api.imgkit.io` 的跨域凭证支持；Google 登录回跳改回前台域名。
- 关键决策和解决方案：生产前台页面继续使用 `imgkit.io`，后端 API 固定使用 `api.imgkit.io`；浏览器页面应使用 HTTPS API，避免 HTTPS 前台调用 HTTP API 被 mixed content 拦截；`PUBLIC_APP_BASE_URL` 保持表示前台页面地址，API 跨域来源通过 `API_CORS_ALLOWED_ORIGINS` 配置。
- 使用的技术栈：Hostinger DNS MCP、Node.js 原生 HTTP、Vue 3 CDN、Axios、CORS。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`server.js`、`.env.example` 和 `README.md`。
- 后续建议：生产环境变量将 `PUBLIC_APP_BASE_URL` 设置为 `https://imgkit.io`，`API_CORS_ALLOWED_ORIGINS` 设置为 `https://imgkit.io,https://www.imgkit.io,https://api.imgkit.io`，然后重建部署容器。
- 会话的主要目的：修复前后端分域后 Google 登录失败，并确保登录状态至少 3 天内不需要重复登录。
- 完成的主要任务：OAuth state 增加后端 10 分钟临时存储兜底，不再只依赖单一子域临时 Cookie；会员、后台和 OAuth 临时 Cookie 支持 `.imgkit.io` 跨子域 Domain；会员 Session Cookie 保持 30 天有效；后端读取同名 Cookie 时会跳过旧的无效 Cookie，避免旧登录状态挡住新登录状态。
- 关键决策和解决方案：如果生产请求仍配置了 localhost/127.0.0.1 的旧 Google 回调地址，后端会自动忽略并改用当前 API 域名生成回调；前台显示 Google 登录失败提示后会清理 `oauth` 查询参数，避免刷新页面反复弹出旧错误。
- 使用的技术栈：Node.js 原生 HTTP、Google OAuth、Cookie Session、Vue 3 CDN、Axios。
- 新增或修改了哪些文件：修改 `server.js`、`frontend/index.html`、`.env.example` 和 `README.md`。
- 后续建议：生产环境建议设置 `SESSION_COOKIE_DOMAIN=.imgkit.io`，并在 Google Cloud OAuth 客户端中确认已授权 `https://api.imgkit.io/api/auth/google/callback`。
- 会话的主要目的：继续修复 Google 登录 `redirect_uri_mismatch` 和回到前台后只显示通用失败提示的问题。
- 完成的主要任务：新增 `PUBLIC_API_BASE_URL`，生产 Google OAuth 回调默认固定为 `https://api.imgkit.io/api/auth/google/callback`；除非明确设置 `GOOGLE_OAUTH_REDIRECT_URI_LOCKED=true`，否则不会让旧的 `GOOGLE_OAUTH_REDIRECT_URI` 覆盖生产回调；前台 Google 登录错误提示根据后端返回的 `oauth` 错误码显示更具体的英文说明。
- 关键决策和解决方案：API 域名负责 Google OAuth 回调和 token 换取，前台域名只作为最终登录成功/失败返回页面；这样回调地址与 Kie 固定后端域名策略一致，也避免 `PUBLIC_APP_BASE_URL` 把 Google 回调牵到前台 CDN 域名。
- 使用的技术栈：Node.js 原生 HTTP、Google OAuth、Vue 3 CDN。
- 新增或修改了哪些文件：修改 `server.js`、`frontend/index.html`、`.env.example` 和 `README.md`。
- 后续建议：Google Cloud OAuth 客户端必须授权 `https://api.imgkit.io/api/auth/google/callback`；部署后用 `curl -i https://api.imgkit.io/api/auth/google` 确认 Location 中的 `redirect_uri` 是该地址。

### 2026-07-16

- 会话的主要目的：根据用户提供的三个 ComfyUI 工作流 JSON（FlashVSR 视频超分、去水印/字幕/模糊 LTX2.3、视频高清修复 Wan2.2+SeedVR2）和参考截图，分析各工作流的输入节点，并确认后台已支持通过拖放方式调整不同工作流的 UI；同时按用户要求将 Ahrefs Analytics 脚本加入前台首页头部。
- 完成的主要任务：
  - 分析三个 ComfyUI API 格式工作流的可配置输入字段，排除模型/检查点加载节点，整理出每个工作流的核心用户输入节点（视频上传、种子、分辨率、放大倍率、帧率、CRF、提示词等）。
  - 确认 `frontend/admin.html` 的工具编辑页已内建「搭建页面」拖放式 UI 编辑器：支持表单模式与搭建页面模式切换、左侧组件库、中央画布拖放排序、右侧属性面板、上传 ComfyUI 工作流 JSON 并在浏览器端自动分析输入节点、一键全部加入画布、自动参数套用、API 调用 JSON 预览。
  - 在 `frontend/index.html` 的 `<head>` 中加入两段 Ahrefs Analytics 脚本（async script tag + JS 动态插入 fallback），仅影响前台页面，后台管理页保持不变。
- 关键决策和解决方案：
  - 后台拖放编辑器已在当前代码中完整实现，采用前端本地解析 ComfyUI 工作流 JSON 的方式识别输入节点，无需额外后端接口即可使用。
  - 由于沙箱环境限制无法启动本地服务器做完整端到端验证，已通过 `npm test` 语法检查确认 `server.js` 与 `frontend/index.html` 无语法错误。
- 使用的技术栈：Vue 3 CDN、HTML5 Drag and Drop API、ComfyUI API JSON。
- 新增或修改了哪些文件：修改 `frontend/index.html`、`README.md`。
- 后续建议：
  - 启动服务后进入后台 `/admin/workflows` 新增或编辑工具，切换到「搭建页面」模式，上传 ComfyUI API 格式工作流 JSON，测试左侧组件拖入画布、属性编辑与自动参数功能。
  - 若后续需要把分析逻辑复用到其他服务或改为后端接口，可再抽离为 `src/workflowAnalyzer.js` 并提供 `/api/admin/tools/analyze-workflow`。

## 會話總結 - 2026-08-08

### 主要目的
修復 Google 登入後用戶資料無法顯示的問題。登入流程成功（session 建立、redirect 到 /member/files），但前端無法載入用戶資料。

### 根本原因
`getMemberSession()` 函式呼叫了 async 的 `memberSessionRepository.getSessionById()` 但沒有 `await`，導致回傳的是 Promise 而非 session 物件。Promise 永遠是 truthy，所以 `memberSession ? memberSession.user : null` 總是走 `memberSession.user` 分支，但 Promise 上沒有 `.user` 屬性，值為 `undefined`。`JSON.stringify` 會省略 undefined 值，導致 `/api/auth/me` 回應缺少 `data` 欄位，前端無法識別已登入狀態。

### 完成的主要任務
- 修改 `getMemberSession()` 為 `async function`，加入 `await`
- 修改 `requireActiveMemberSession()` 為 `async function`，加入 `await`
- 在所有 12 個呼叫點加入 `await` 關鍵字
- 透過 Hostinger VPS MCP 重新部署 Docker 容器，環境變量直接嵌入 docker-compose.yml

### 關鍵決策和解決方案
- 診斷方式：用有效的 session ID 透過 curl 測試 `/api/auth/me`，觀察到 `data` 欄位缺失
- 分析回應格式：`{"success":true,"message":"操作成功"}` 缺少 `data` → `undefined` 被 JSON.stringify 省略
- 確認資料庫層面正常：session 記錄存在且有效
- 環境變量部署：透過 `VPS_createNewProjectV1` 將所有環境變量直接寫入 docker-compose.yml，不依賴 .env 檔案

### 修改的文件
- `server.js`：修復 getMemberSession / requireActiveMemberSession 的 async/await 問題

### 後續建議
- 考慮將 session 驗證邏輯重構為獨立中間件
- 加入整合測試覆蓋 OAuth 登入完整流程

## 會話總結 - 2026-08-08 (補充)

### 主要目的
修復 `/member/settings` 頁面兩個前端錯誤。

### 根本原因
1. **Ahrefs Analytics 重複載入**：`<head>` 中同時存在 `<script src="...analytics.js" async>` 標籤和一段 JS 程式碼動態建立第二個相同的 script 元素，導致 analytics.js 被載入兩次。
2. **`Cannot read properties of undefined (reading 'oldPassword')`**：`changePasswordForm`、`changePasswordLoading`、`changePasswordSuccess`、`changePasswordError`、`changeMemberPassword` 在 `setup()` 中有定義但沒有在 `return` 中暴露給模板，Vue 模板存取時得到 `undefined`。

### 修改的文件
- `frontend/index.html`：移除重複的 Ahrefs Analytics JS 區塊；在 return 中加入 5 個缺失的變數/函式

## 會話總結 - 2026-08-08 (定價頁修復)

### 主要目的
修復 `/pricing` 頁面顯示「Remove Background」工具內容而非套餐方案的問題。

### 根本原因
`frontend/index.html` 模板的 `v-if`/`v-else-if`/`v-else` 條件鏈有缺陷：
- `<div v-else class="tool-page">` 是 catch-all，會在所有非會員、非市集路徑渲染
- `/pricing` 路徑不是會員頁也不是市集頁，因此落入 `v-else` 分支，渲染了工具詳情頁
- 同時 `isPricingPage` 使用獨立的 `v-if`，導致工具頁和定價頁同時渲染

### 解決方案
新增 `isToolPage` computed，排除會員、市集、法律、定價頁面，僅在真正的工具詳情頁或未知路徑時返回 true。將 `<div v-else class="tool-page">` 改為 `<div v-else-if="isToolPage" class="tool-page">`。

### 修改的文件
- `frontend/index.html`：新增 `isToolPage` computed；修改模板 `v-else` 為 `v-else-if="isToolPage"`；在 setup return 中加入 `isToolPage`

### 部署
- 提交 commit `dac9ff9`，推送到 GitHub `main` 分支
- 通過 Hostinger VPS MCP `VPS_createNewProjectV1` 重新部署（VPS ID: 1307693）
- 部署成功，容器運行正常，線上 HTML 確認 `v-else-if="isToolPage"` 已生效

### 後續建議
- `getCurrentToolSlug()` 對非工具路徑預設返回 `'remove-background'`，建議改為返回空字串或 null
- 考慮清理 VPS 上大量的 `rankwoven-old-*` 廢棄專案

## 會話總結 - 2026-08-07 (Pricing 區塊回移)

### 主要目的
將原本 `Settings` 頁面下方的 `Membership Subscription` 區塊搬到 `/pricing` 頁面。

### 完成內容
- 以 Git 歷史中的舊版區塊為準，將 `Membership Subscription` 的會員面板樣式移回 `/pricing`
- 保留 billing toggle、PayPal / Creem 選項、訂閱卡片輪播與購買按鈕

### 關鍵決策
- 不重做新的 pricing 版型，直接沿用原本 settings 下方的區塊，避免樣式偏移
- 僅調整 `frontend/index.html` 的 pricing 區塊內容，保持其他會員頁邏輯不變

### 修改的文件
- `frontend/index.html`
- `README.md`

### 後續建議
- 若 `/pricing` 還需要更明確的頁面標題，可以再補一個簡短的 heading，但先維持原版區塊樣式

## 會話總結 - 2026-08-07 (Pricing 區塊回移實作)

### 主要目的
將 Git 歷史版本 `45f386f` 中 `/member/settings` 下半部的 `Membership Subscription` 區塊，直接搬到 `/pricing` 頁面。

### 完成內容
- 將 `frontend/index.html` 的 `/pricing` 模板替換為 `45f386f` 版本的會員訂閱卡片區塊
- 移除今次替換後不再使用的訂閱輪播與按鈕文案 helper，避免保留孤立前端程式碼
- 保留現有 `billingCycleOptions`、`subscriptionPlans` 與付款處理函式，讓頁面仍可沿用現有訂閱流程

### 關鍵決策
- 不重做新的 pricing 視覺稿，也不擴散修改到 `Settings`、`Orders` 或其他會員頁
- 只回退 `/pricing` 的模板結構，令版面與 `45f386f` 的原始區塊一致

### 修改的文件
- `frontend/index.html`
- `README.md`

### 驗證
- 執行 `npm test`，所有檢查與 11 個測試均已通過

### 後續建議
- 目前 `/pricing` 不再顯示 PayPal / Creem 切換 UI；如之後仍要保留多支付方式選擇，可再單獨補一輪前端交互調整

## 會話總結 - 2026-08-08 (Search Console 索引修復)

### 主要目的
修復 Google Search Console 回報的 `404`、`401` 與 `noindex` 相關索引問題，並明確阻止機器人抓取後台與會員頁面。

### 完成內容
- 新增 `robots.txt` 路由，明確封鎖 `/admin`、`/member`、登入註冊、重設密碼與 `/api/`
- 新增 `sitemap.xml` 路由，只輸出公開頁面與已上線工具頁
- 為後台頁、會員頁、登入註冊頁與 API 回應加入 `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- 前台 `index.html` 補上 route-aware `meta robots`；`admin.html` 補上靜態 `noindex`
- 修復 `/forgot-password` 與 `/reset-password` 未被前端路由白名單接住、直接訪問會返回 `404` 的問題

### 關鍵決策
- 不對公開工具頁與法律頁加 noindex，避免影響正常收錄
- 用 server header + robots.txt + sitemap 三層控制，而不是只靠前端 meta
- 只把真正可公開的 URL 放進 sitemap，避免再把私有頁面暴露給 Search Console

### 修改的文件
- `server.js`
- `frontend/index.html`
- `frontend/admin.html`
- `README.md`

### 驗證
- 執行 `npm test`，所有檢查與 11 個測試均已通過

### 後續建議
- 部署後到 Search Console 重新提交 `https://imgkit.io/sitemap.xml`
- 對 `/admin`、`/member/settings`、`/login` 用 URL Inspection 重新驗證，確認 Google 收到 `noindex`

## 會話總結 - 2026-08-08 (Pricing 頁品牌與 title 跟進)

### 主要目的
再次檢查 `/pricing` 的實際渲染狀態，並修正頁首品牌仍顯示 `Remove Background` 的路由 fallback 問題。

### 完成內容
- 用瀏覽器 CLI 重新驗證 `https://www.imgkit.io/pricing`，確認頁面內容其實已正常渲染，不再是純空白
- 將 `/pricing`、法律頁與會員頁的頁首品牌 fallback 改為 `ImgKit`
- 讓 `loadMarketplaceData()` 只在 marketplace 頁面更新 `document.title`，避免 `/pricing` 被覆寫回 `AI Tool Platform`

### 關鍵決策
- 不再把非工具頁 fallback 成 `Remove Background`
- 保留工具頁顯示工具名的行為，只讓非工具頁顯示站點品牌

### 修改的文件
- `frontend/index.html`
- `README.md`

### 驗證
- 以 `agent-browser` 重新打開 `https://www.imgkit.io/pricing`，確認頁面已有 `Membership Subscription` 區塊
- 以本地 VM 跑過前端腳本初始化，未見 runtime error

### 後續建議
- 把這次變更部署後，再用瀏覽器 hard refresh 一次確認頁首品牌已不再顯示 `Remove Background`

## 會話總結 - 2026-08-08 (Pricing 卡片箭頭與回頂修復)

### 主要目的
為 `/pricing` 的 `Membership Subscription` 區塊補回左右滾動箭頭，並減少頁面切換後出現的大段空白感。

### 完成內容
- 將 `Membership Subscription` 重新包回 `subscription-carousel`，補上左右滾動箭頭
- 重新加入 `subscriptionGrid` 與 `scrollSubscriptionCarousel()`，維持橫向捲動卡片行為
- 在路由切換時強制回到頁頂，避免 SPA 保留上一頁 scroll position 造成 pricing 區塊被頂下去

### 關鍵決策
- 保留現有 pricing 卡片樣式與訂閱邏輯，只補回舊版 carousel 交互
- 用 route change 回頂處理視覺空白，不額外改動 pricing 的內容密度

### 修改的文件
- `frontend/index.html`
- `README.md`

### 驗證
- 執行 `npm test`，所有檢查與 11 個測試均已通過

### 後續建議
- 部署後重新打開 `/pricing`，確認箭頭可左右捲動卡片，且頁面不再停在中間空白位置

## 會話總結 - 2026-08-08 (Pricing 區塊結構修正)

### 主要目的
修正 `/pricing` 頁面中 `Membership Subscription` 被撐到視口下方的大段空白問題。

### 完成內容
- 找出問題根因為 `</main>` 提早關閉，導致 `legal/pricing/footer` 跑到 `app-shell` 外面
- 把 `Membership Subscription`、法律頁與 footer 重新包回 `main.app-shell`
- 保留左右滾動箭頭與回頂行為，確認 pricing 區塊從 header 下方正常起始

### 關鍵決策
- 不靠額外 spacer 或硬編碼 margin 解空白
- 直接修正 HTML 結構，讓 `min-height: 100vh` 由正確的主容器接手

### 修改的文件
- `frontend/index.html`
- `README.md`

### 驗證
- 以本地 `agent-browser` 重新打開 `/pricing`，確認 section top 由 577 降到 70
- 截圖確認內容已回到 header 下方正常位置

### 後續建議
- 部署後再用瀏覽器檢查 `/pricing`，確認 live 版本已套用結構修正

## 會話總結 - 2026-08-08 (會員頁登入保護)

### 主要目的
確保所有會員頁面都必須登入後才能進入。

### 完成內容
- 未登入時，會員 dropdown 只保留公開的 `Pricing`，不再顯示 Dashboard / My Files / Orders 等會員入口
- `openMemberPage()` 加入登入檢查，未登入時會導向 `/login`
- `loadMemberSession()` 在偵測到未登入且位於會員頁時，會自動導向 `/login`
- `server.js` 對 `/member/*` 加入伺服器端 302 redirect，直接輸入網址也會被送回 `/login`
- 會員 dropdown 底部按鈕未登入時改為 `Log In`

### 關鍵決策
- 用前端與伺服器雙層保護，而不是只靠 UI 隱藏
- 保留 `Pricing` 為公開入口，其他會員頁一律視為需要登入

### 修改的文件
- `frontend/index.html`
- `server.js`
- `README.md`

### 驗證
- 本地 browser 直接開 `/member/dashboard`，會自動跳轉到 `/login`
- 未登入時打開 user menu，只會看到 `Pricing` 與 `Log In`

### 後續建議
- 部署後再用真實瀏覽器測一次 `/member/*` 與 user menu，確認 production 行為一致

## 會話總結 - 2026-08-08 (HYPIR workflow 修復)

### 主要目的
修正 RunningHub workflow `2067517634551304193` 在後台新增工具時測試失敗、無法上線的問題。

### 完成內容
- 讀取 `HYPIR-高清放大加二次修复_api.json` workflow 文件，確認真正的外部輸入只有 `LoadImage` 的圖片
- 在後台 workflow 分析器中忽略 `HYPIRImageRestoration` 的固定參數與 `rgthree_comparer` 這類 comparer 配置
- 在工具載入與儲存時，自動裁剪這些固定參數，避免舊的錯誤配置繼續被保存或測試

### 關鍵決策
- 不把 workflow 內部固定常數當成用戶可配置欄位
- 只保留真正需要由後台上傳的圖片輸入，讓測試任務只送必要的 `nodeInfoList`

### 修改的文件
- `frontend/admin.html`
- `README.md`

### 驗證
- 以腳本模擬 workflow 分析結果，確認最後只剩 `node 79 / image`
- `npm test` 全部通過

### 後續建議
- 在後台重新打開這個工具，重新分析後再測試一次，然後再上線
