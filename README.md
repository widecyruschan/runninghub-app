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
- 数据：SQLite、better-sqlite3、JSON fallback。
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
