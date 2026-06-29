# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是 **Sistine Starter (`sistine-starter-vibe-to-production`)** —— 一个**功能完整的生产级 AI SaaS 应用模板**(仓库目录名为 `liu-xiao-pai-template`)。它面向"用 AI 助手快速搭建并上线商业化 AI SaaS"的场景,内置认证、订阅计费、积分系统、AI 功能(对话/图像/视频)、管理后台、邮件、国际化和内置文档站。

修改代码时请同时兼顾两个目标:
1. **保持模板可复用性**(面向购买者/学员),避免引入私有依赖或外部运行时 demo 资源。
2. **保持生产数据流正确性**:auth、billing、credits、subscription、generation 都是"一致性敏感"系统,严禁只改 UI 而让数据库状态漂移。

> 仓库根目录还有一份 `AGENTS.md`,内容与本文件高度重叠且更偏"约束清单";改动行为时两份文档都应保持与代码一致。

## 技术栈

- **框架**: Next.js **16.2.2** (App Router) + React 19 + TypeScript (strict)
- **样式**: Tailwind CSS **v3** + Framer Motion;UI 用自定义组件 + Radix UI(README 称 shadcn 风格)
- **认证**: Better Auth(邮箱密码 + 可选 Google OAuth)+ Drizzle adapter
- **数据库**: PostgreSQL + Drizzle ORM(`postgres` / `pg` 驱动)
- **支付**: Creem(订阅 + 一次性积分包)
- **AI**: 火山引擎 / 豆包(对话、图生图、文/图生视频)
- **邮件**: Resend(交易邮件 + Newsletter)
- **国际化**: next-intl(`en` / `zh`)
- **文档站**: Fumadocs(`fumadocs-mdx` + `fumadocs-ui`)
- **测试**: Vitest + Testing Library(jsdom)
- **包管理**: pnpm(`package.json` 声明 `packageManager: pnpm`,即使存在 `package-lock.json` 也用 pnpm)

## 常用命令

```bash
# 开发
pnpm dev              # 经 scripts/run-dev.mjs 启动:先同步 fumadocs 样式,再以净化环境跑 next dev
pnpm dev:webpack      # Turbopack 太重时的兜底(强制 webpack)
pnpm dev:turbopack    # 强制 turbopack

# 构建 / 生产
pnpm build            # = generate:blog-manifest + sync:fumadocs-style + next build
pnpm start

# 代码检查
pnpm lint             # eslint .

# 测试 (Vitest)
pnpm test             # 跑一遍全部测试
pnpm test:watch       # 监视模式
pnpm test:coverage    # 覆盖率 (v8, text + html)
pnpm test -- tests/lib/credit-compensation.test.ts   # 跑单个测试文件
pnpm test -- -t "关键字"                              # 按用例名过滤

# 数据库 (Drizzle Kit)
pnpm db:generate      # 生成迁移文件
pnpm db:migrate       # 执行迁移
pnpm db:push          # 直接把 schema 推到库(开发/首次部署常用)
pnpm db:studio        # Drizzle Studio

# 工具脚本
pnpm admin:setup              # 把 ADMIN_EMAIL 对应用户的 role 设为 admin(scripts/setup-admin.ts)
pnpm generate:blog-manifest   # 增删/重命名博客后必须重新生成清单
pnpm sync:fumadocs-style      # 同步 fumadocs 样式到 public/(predev/prebuild 自动调用)
```

**命令注意事项**:
- `pnpm dev` **不会**重新生成博客清单;只有 `pnpm build` 会。增删博客文章后请手动 `pnpm generate:blog-manifest` 再提交。
- 验证策略:改 UI/路由/翻译跑 `pnpm lint`;改 billing/auth/credits/email/session 等逻辑跑 `pnpm test`;改路由/中间件/auth/next 配置/环境敏感的 server 代码跑 `pnpm build`。

## 整体架构

### 路由结构 (`app/[locale]/`)

所有页面都在 `[locale]` 动态段下,按 route group 分类(括号目录不进 URL):
- `(marketing)` —— **公开**:首页、`pricing`、`blog`、`contact`、`privacy`/`terms`/`cookies`/`refund` 等法务页
- `(auth)` —— **公开**:`login`、`signup`、`forgot-password`、`reset-password`
- `(protected)` —— **需登录**:`dashboard`、`profile`、`settings`、`credits`
- `(admin)` —— **需 admin**:`admin`、`admin/users`、`admin/subscriptions`、`admin/credits`
- `demo` —— **公开**:`demo/chat`、`demo/image`、`demo/video`(AI 功能演示)
- `docs` —— Fumadocs 文档,catch-all `docs/[[...slug]]`

API 在 `app/api/`:`auth/`、`chat/`、`image/`、`video/`、`payments/creem/`、`admin/`、`cron/`、`upload/`、`newsletter/`、`user/`。

### 路由权限(分服务端 + 客户端两层)

- **服务端守卫(权威)**:`(protected)/layout.tsx` 和 `(admin)/layout.tsx` 在渲染前用 `getActiveSessionUser(await headers())`(`lib/auth/session.ts`)/ `requireAdmin()`(`lib/auth/admin.ts`)解析会话,失败则 `redirect`。这是真正的访问控制。
- **客户端守卫(体验)**:`features/auth/components/session-guard.tsx`(`useSession`)和 `email-verified-guard.tsx`(强制邮箱验证)用于加载态/未验证提示。**不要**把它们当作唯一的安全边界。
- API 路由统一靠 `getActiveSessionUser(req.headers)` 取 user,内部经 `isBanActive()` 处理封禁(`banned` + `banExpires` 临时/永久)。

### 积分系统(核心,一致性敏感)

**文件**:`lib/credits.ts`、`lib/credit-compensation.ts`、`lib/db/schema.ts`

- 两处状态必须同步,且应在**同一事务**内更新:
  - `user.credits` —— 快速余额
  - `credit_ledger`(Drizzle 变量 `creditLedger`)—— 审计账本,`delta` 正增负减,`reason` 记录原因
- 核心 API(均为事务性):`getUserCredits`、`canUserAfford` / `canUserChat`、`deductCredits(userId, amount, reason, referenceId)`、`refundCredits(...)`。
- 新用户注册赠送 **300 积分**:在 `lib/auth.ts` 的 Better Auth `after` hook 里,监听 `/sign-up` 后调用 `refundCredits(..., 300, "registration_bonus")`(邮箱与 OAuth 注册都覆盖)。

**积分消耗(写死在各路由,改价请同步)**:

| 操作 | 消耗 | 常量/位置 | ledger reason |
|------|------|-----------|---------------|
| 对话 | **10** | `lib/credits.ts` `CHAT_CREDIT_COST` | `chat_usage` |
| 图像生成 | **20** | `app/api/image/generate/route.ts` | `image_generation` |
| 视频生成 | **50** | `app/api/video/generate/route.ts` | `video_generation` |

其它 ledger reason:`registration_bonus`、`one_time_pack`、`subscription_cycle`(订阅首发)、`subscription_schedule`(年付分期)、`adjustment`(管理员调整)、`*_refund`(补偿退款)。

**关键不变量 —— 积分补偿模式**:付费 AI 路由先扣费、再调用 provider,用 `createCreditCompensation(...)`(`lib/credit-compensation.ts`)兜底:
1. 扣费成功后创建 compensation 对象(`settled = false`);
2. provider 成功 → `compensation.settle()`(标记已结算,**不退款**);
3. provider 抛错 → catch 中 `await compensation.compensate()` → 调 `refundCredits` 退还(内部 `settled` 标志保证最多退一次)。

新增/修改付费 AI 动作时**必须保留这个先扣费-失败补偿的模式**,否则会出现"扣了钱没产出"。

### 支付与订阅 (Creem)

**文件**:`lib/payments/creem.ts`、`app/api/payments/creem/checkout/route.ts`、`app/api/payments/creem/webhook/route.ts`、`constants/billing.ts`、`lib/billing/subscription.ts`

- **计划/积分包是唯一真相源**:`constants/billing.ts` 定义 `subscriptionPlans`(`starter_monthly` $29/1000、`starter_yearly` $290/12000、`pro_monthly` $99/10000、`pro_yearly` $990/120000)与 `oneTimePacks`(`pack_200` $5/200),含各自 `creemPriceId`。**绝不要凭空造 plan key**。
- **Checkout**:`POST /api/payments/creem/checkout` 取 session userId → 查 billing 配置拿 Creem 价格 ID → `createCheckoutSession()`。`CREEM_SIMULATE="true"` 时跳过真实支付,重定向到 `redirect-placeholder`(本地/测试用)。
- **Webhook**(`/api/payments/creem/webhook`)流程:`verifyWebhookSignature`(HMAC-SHA256 + timing-safe)→ 解析事件(`checkout.completed`/`subscription.paid`/`subscription.active`)→ **幂等检查**(`payment.providerPaymentId` 唯一)→ 计算积分(一次性=`pack.credits`;订阅=`computeInitialGrant` 算首发)→ 事务内写 `payment`、upsert `subscription`、增 `user.credits` + 写 ledger、更新 `user.planKey`、`resetSubscriptionSchedule`/`deleteSubscriptionSchedule` → 发购买确认邮件(失败不阻塞)。
- **年付分期发放**:年付计划不一次发全部,`constants/billing.ts` 里 `grantSchedule.mode = "installments"` 把积分拆成每月一笔。`subscription_credit_schedule` 表记录 `creditsPerGrant` / `grantsRemaining` / `totalCreditsRemaining` / `nextGrantAt`。
- **Cron 发放**:`GET|POST /api/cron/subscription-grants` 调 `processDueSchedules()`,用 `WHERE nextGrantAt <= NOW() AND grantsRemaining > 0 ... FOR UPDATE SKIP LOCKED` 取到期记录逐笔发放,`catchUp` 参数支持补发积压。**鉴权二选一**:Bearer `CRON_SECRET`,或 Basic Auth(`CRON_JOBS_USERNAME` + `CRON_JOBS_PASSWORD`)。两者都没配则返回 500。

> 改订阅逻辑时必须让这 5 处保持一致:`user.planKey`、`payment`、`subscription`、`credit_ledger`、`subscription_credit_schedule`。注意:`admin/users/[userId]/subscription` 端点目前**只改 `user.planKey`**,不是完整的订阅迁移,别误以为够用。

### AI 集成(火山引擎)

**封装**:`lib/volcano-engine/`(`index.ts` 导出统一 `volcanoEngine` 对象;`config.ts` 写死模型与 `getHeaders`;`chat.ts`/`image.ts`/`video.ts`/`types.ts`)。模型常量在 `config.ts`:
- 对话 `doubao-1-5-thinking-pro-250415` · 图生图 `doubao-seededit-3-0-i2i-250628` · 视频 `doubao-seedance-1-0-pro-250528`

各路由的统一套路:`getActiveSessionUser` 鉴权 → `canUserAfford` 预检 → 扣费 → `createCreditCompensation` → 调 provider → 成功 `settle()` / 失败 `compensate()`,产出记录入库。
- **对话**:`/api/chat`(非流式)与 `/api/chat/stream`(SSE 流式);用 `lib/chat-session.ts` 的 `getOrCreateOwnedChatSession`,消息存 `chat_session`/`chat_message`。
- **图像**:`/api/image/generate` 目前是**图生图**,`prompt` 与 `imageUrl` 都必填;结果存 `generation_history`。
- **视频**:**异步**。`/api/video/generate` 提交后返回 `taskId`(文生视频或图生视频),前端轮询 `/api/video/status?taskId=...&historyId=...` 查状态(provider 状态被 `normalizeStatus` 归一为 pending/processing/completed/failed,超 5 分钟判超时)。
- provider 产出会经 `lib/r2-storage.ts`(`uploadImageFromUrl`)镜像到 R2;**镜像失败时回退到 provider 原始 URL** 而非硬失败 —— 改这里要小心,demo/测试依赖这种优雅降级。

### 国际化 (i18n)

- 配置中枢 `i18n.config.ts`:`locales = ['en','zh']`,`defaultLocale = 'en'`,`localePrefix = 'as-needed'`。
- 因为 `as-needed`,默认语言路径不带前缀:`/pricing`、`/docs`、`/login`;中文为 `/zh/pricing` 等。
- 路由拦截用 **`proxy.ts`**(Next.js 16 把 `middleware` 约定重命名为 `proxy`;本仓库**没有** `middleware.ts`),内部 `createMiddleware`(next-intl)。
- 服务端消息加载在 `lib/i18n.ts`,合并 `messages/<locale>.json`(UI 文案)与 `messages/seo.<locale>.json`(SEO)。
- **改用户可见文案时,en 与 zh 都要更新;改 SEO 文案时 `seo.en.json` 与 `seo.zh.json` 都要更新。**

### 文档站 (Fumadocs)

- 源文件 `content/docs/**/*.mdx`(中英文按 `*.mdx` / `*.zh.mdx` 配对,目录有 `meta.json` 控制导航)。
- `source.config.ts` 配置目录;`lib/source.ts` 读取 `fumadocs-mdx` 生成的 `.source/*`;`lib/docs-i18n.ts` / `lib/docs-ui.ts` / `lib/docs-page-tree.ts` 负责多语言与页面树。
- 渲染入口 `app/[locale]/docs/`,线上路径 `/docs`(英)、`/zh/docs`(中)。

## 数据库(核心表,见 `lib/db/schema.ts`)

Drizzle 变量名 → 实际 SQL 表名:`user`、`session`、`account`、`verification`、`payment`、`subscription`、`creditLedger`→`credit_ledger`、`subscriptionCreditSchedule`→`subscription_credit_schedule`、`chatSession`→`chat_session`、`chatMessage`→`chat_message`、`generationHistory`→`generation_history`、`passwordResetToken`→`password_reset_token`、`newsletterSubscription`→`newsletter_subscription`。

幂等/索引要点:`payment.providerPaymentId`、`subscription.providerSubId` 唯一;`subscription_credit_schedule.nextGrantAt` 建有索引供 cron 查询。

## 生成文件 / 派生资源(不要手改)

- `lib/blog-manifest.generated.ts` —— 由 `generate:blog-manifest` 生成
- `public/fumadocs-style.css` —— 由 `sync:fumadocs-style` 从 `fumadocs-ui` 同步(Fumadocs 用 Tailwind v4 语法,故走 `<link>` 注入以避免与本项目 Tailwind v3/PostCSS 冲突)
- `.source/*` —— 由 `fumadocs-mdx` 生成
- `public/starter` —— 已本地化的 demo 资源;`.asset-sources/starter-demo` 为其源素材。**不要改回外部第三方运行时 URL**。

## 环境变量

以 `.env.example` 为准。关键分组:
- 数据库 `DATABASE_URL`
- Auth `BETTER_AUTH_SECRET`(≥32 字符)、`BETTER_AUTH_URL`、可选 `BETTER_AUTH_TRUSTED_ORIGINS`
- 可选 Google OAuth `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`(**两者都配齐**才启用,登录/注册页的 Google 按钮也据此显示)
- AI `VOLCANO_ENGINE_API_KEY`、`VOLCANO_ENGINE_API_URL`
- 支付 `CREEM_API_KEY`、`CREEM_WEBHOOK_SECRET`、可选 `CREEM_API_BASE`、`CREEM_SIMULATE`
- 邮件 `RESEND_API_KEY`、`RESEND_FROM_EMAIL`
- Cron `CRON_SECRET` 或 `CRON_JOBS_USERNAME` + `CRON_JOBS_PASSWORD`
- 应用 URL `NEXT_PUBLIC_APP_URL`;管理员脚本 `ADMIN_EMAIL`
- 可选:`STORAGE_*`(S3/R2)、`NEXT_PUBLIC_POSTHOG_KEY`、`NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`、`NEXT_PUBLIC_CLARITY_PROJECT_ID`

## 已知坑位

- 部分读取 `request.url`/headers/cookies/auth 的 API 路由在 `pnpm build` 时会有 "dynamic server usage" 警告(如 `/api/auth/verify-email`、`/api/newsletter/unsubscribe`、`/api/user/credits/history` 等)。改动这类路由时考虑显式标记 dynamic。
- `app/api/upload/simple/route.ts` 是 demo 用途,不是生产上传主路径(主路径 `app/api/upload/image/route.ts`)。存储未配置时上传路由可能返回 data URL、镜像可能回退 provider URL —— 这是有意的降级。
- 管理后台改动属高风险:改余额 ≠ 改 ledger;改 plan 标签 ≠ 改订阅状态。保持账本路径与状态一致。
- Turbopack 在部分 macOS 上偏重,可改用 `pnpm dev:webpack`。

## 测试约定

- 测试位于 `tests/components/*`(RTL)、`tests/constants/*`、`tests/lib/*`。配置见 `vitest.config.ts`(jsdom、`@` 别名指向根、globals、`vitest.setup.ts` 注入 jest-dom)。
- 改 billing / credits / auth / session / email / 工具函数等逻辑时,在 `tests/lib` 增补或更新测试。
