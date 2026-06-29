# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是一个**功能完整的生产级** AI SaaS 应用模板,包含完整的用户认证、订阅计费、积分系统、AI 功能集成(对话/图像/视频生成)、管理后台和国际化支持。专为快速启动商业化 AI SaaS 产品而设计。

**核心特性**:
- ✅ 完整的用户认证系统 (Better Auth + Google OAuth)
- ✅ 基于积分的计费系统 + 订阅管理 (Creem 支付集成)
- ✅ AI 功能: 对话、图像生成、视频生成 (火山引擎/豆包 API)
- ✅ 管理后台 (用户管理、订阅管理、积分调整)
- ✅ 国际化支持 (中文/英文)
- ✅ 邮件系统 (Resend 集成,支持交易邮件和 Newsletter)
- ✅ 营销页面 (首页、定价、博客、隐私政策、退款政策等)
- ✅ 分析工具集成 (PostHog、Google Analytics、Microsoft Clarity)

## 技术栈

### 前端
- **框架**: Next.js 16.2.2 (App Router) + React 19
- **样式**: Tailwind CSS + Framer Motion 动画
- **UI 组件**: 自定义组件库 + Radix UI
- **表单**: React Hook Form + Zod 验证
- **主题**: next-themes (深色/浅色模式)
- **国际化**: next-intl (支持动态路由 `[locale]`)

### 后端
- **身份认证**: Better Auth (邮箱密码 + Google OAuth)
- **数据库**: PostgreSQL + Drizzle ORM
- **支付**: Creem (支持订阅和一次性购买)
- **AI 服务**: 火山引擎 (豆包 API)
  - 对话: `doubao-1-5-thinking-pro-250415`
  - 图像: `doubao-seededit-3-0-i2i-250628`
  - 视频: `doubao-seedance-1-0-pro-250528`
- **邮件**: Resend (交易邮件 + Newsletter)
- **存储**: AWS S3 兼容 (可选,用于文件上传)

### 开发工具
- **类型安全**: TypeScript (strict mode)
- **代码规范**: ESLint
- **包管理**: pnpm

## 项目结构

```
├── app/[locale]/              # 国际化路由
│   ├── (auth)/                # 认证页面 (登录、注册、忘记密码)
│   ├── (marketing)/           # 营销页面 (首页、定价、博客、联系)
│   ├── (protected)/           # 需要认证的页面 (仪表板、个人资料、积分页)
│   ├── (admin)/               # 管理后台 (用户管理、订阅管理、积分管理)
│   └── demo/                  # AI 功能演示页 (聊天、图像、视频)
│   └── docs/                  # 内置文档站点 (Fumadocs, 中英文)
├── app/api/                   # API 路由
│   ├── auth/                  # Better Auth API + 自定义认证端点
│   ├── payments/creem/        # Creem 支付 (checkout + webhook)
│   ├── chat/                  # 对话 API (含流式响应)
│   ├── image/generate/        # 图像生成 API
│   ├── video/                 # 视频生成 API (异步任务)
│   ├── user/                  # 用户信息 API
│   └── cron/                  # 定时任务 (积分发放等)
├── components/                # 可重用 UI 组件
├── features/                  # 功能模块 (auth、forms、marketing、navigation、admin)
├── lib/                       # 核心业务逻辑
│   ├── auth.ts                # Better Auth 配置
│   ├── auth/google-auth.ts    # Google OAuth 可选化开关
│   ├── db/                    # 数据库连接和 Schema
│   ├── credits.ts             # 积分系统核心逻辑
│   ├── payments/creem.ts      # Creem 支付集成
│   ├── billing/               # 订阅和积分发放调度
│   ├── volcano-engine/        # 火山引擎 API 封装
│   └── email.ts               # 邮件发送逻辑
├── content/docs/              # Docs MDX 源文件
├── constants/                 # 常量定义
│   ├── billing.ts             # 定价计划和积分包配置
│   ├── tier.ts                # 用户等级定义
│   └── website.ts             # 网站信息
├── messages/                  # 国际化翻译文件
│   ├── en.json                # 英文 UI 文案
│   ├── zh.json                # 中文 UI 文案
│   ├── seo.en.json            # 英文 SEO 文案
│   └── seo.zh.json            # 中文 SEO 文案
└── drizzle/                   # 数据库迁移文件
```

## 核心业务流程

### 1. 用户注册与积分赠送
- 用户通过邮箱或 Google OAuth 注册
- 系统自动赠送 **300 积分**新人礼包 (`lib/auth.ts:44-49`)
- 积分记录到 `creditLedger` 表,原因为 `registration_bonus`

### 2. 积分系统架构
**核心文件**: `lib/credits.ts`, `lib/db/schema.ts`

**表结构**:
- `user.credits`: 用户当前可用积分
- `creditLedger`: 积分变动账本 (可审计,记录每笔增减)
  - `delta`: 积分变化量 (正数为增加,负数为扣除)
  - `reason`: 变动原因 (如 `chat_usage`, `subscription_cycle`, `one_time_pack`, `registration_bonus`)
  - `paymentId`: 关联的支付记录 ID (如果有)

**核心 API**:
- `getUserCredits(userId)`: 查询用户积分
- `deductCredits(userId, amount, reason)`: 扣除积分 (事务性操作,同时更新 `user.credits` 和 `creditLedger`)
- `refundCredits(userId, amount, reason)`: 退还积分
- `canUserAfford(userId, creditsNeeded)`: 检查用户是否有足够积分

**积分消耗规则** (可在各 API 路由中调整):
- 对话: 10 积分/次 (`lib/credits.ts:5`)
- 图像生成: 参考 `app/api/image/route.ts`
- 视频生成: 参考 `app/api/video/generate/route.ts`

### 3. 订阅与支付流程 (Creem)
**核心文件**: `lib/payments/creem.ts`, `app/api/payments/creem/webhook/route.ts`, `constants/billing.ts`

#### 订阅计划配置 (`constants/billing.ts`)
```typescript
starter_monthly: $29/月 → 1000 积分
starter_yearly:  $290/年 → 12000 积分 (分 12 个月发放,每月 1000)
pro_monthly:     $99/月 → 10000 积分
pro_yearly:      $990/年 → 120000 积分 (分 12 个月发放,每月 10000)

一次性积分包:
pack_200:        $5 → 200 积分
```

#### 支付流程
1. **用户点击购买** → 前端调用 `/api/payments/creem/checkout`
2. **创建 Checkout Session** (`lib/payments/creem.ts:24-74`)
   - 调用 Creem API 创建支付会话
   - metadata 中携带 `userId`, `key` (计划标识), `kind` (subscription/one_time)
3. **用户完成支付** → Creem 发送 webhook 到 `/api/payments/creem/webhook`
4. **Webhook 处理** (`app/api/payments/creem/webhook/route.ts`)
   - ✅ 验证签名 (`verifyWebhookSignature`)
   - ✅ 幂等性检查 (通过 `providerPaymentId` 防止重复处理)
   - ✅ 插入 `payment` 记录
   - ✅ 创建/更新 `subscription` 记录 (如果是订阅)
   - ✅ 发放积分到 `user.credits` + 记录到 `creditLedger`
   - ✅ 设置积分发放调度 (`subscriptionCreditSchedule`,年付计划分期发放)
   - ✅ 发送购买确认邮件

#### 年付订阅的分期发放机制
- 年付计划不会一次性发放全部积分,而是分 12 个月发放
- 通过 `subscriptionCreditSchedule` 表管理调度
- 定时任务 (`app/api/cron/subscription-grants/route.ts`) 每小时检查并发放积分

### 4. AI 功能集成 (火山引擎)
**核心文件**: `lib/volcano-engine/`

#### 对话功能 (`app/api/chat/route.ts` + `/stream/route.ts`)
- 模型: `doubao-1-5-thinking-pro-250415`
- 支持流式响应 (Server-Sent Events)
- 每次对话扣除 10 积分
- 会话历史存储在 `chatSession` 和 `chatMessage` 表

#### 图像生成 (`app/api/image/generate/route.ts`)
- 模型: `doubao-seededit-3-0-i2i-250628` (图生图)
- 结果存储在 `generationHistory` 表

#### 视频生成 (`app/api/video/generate/route.ts` + `/status/route.ts`)
- 模型: `doubao-seedance-1-0-pro-250528`
- **异步任务流程**:
  1. 提交生成请求 → 返回 `taskId`
  2. 轮询 `/api/video/status?taskId=xxx` 检查状态
  3. 完成后结果存储在 `generationHistory.resultUrl`

### 5. 管理后台功能
**核心文件**: `app/[locale]/(admin)/admin/`, `app/api/admin/`

管理员权限通过 `user.role = 'admin'` 标识。

**功能**:
- **用户管理** (`admin/users/page.tsx`):
  - 查看所有用户
  - 查看用户订阅状态
  - 手动调整用户积分 (`/api/admin/users/[userId]/credits`)
  - 修改用户订阅 (`/api/admin/users/[userId]/subscription`)
- **订阅管理** (`admin/subscriptions/page.tsx`):
  - 查看所有活跃订阅
- **积分管理** (`admin/credits/page.tsx`):
  - 查看积分账本记录

**创建管理员账户**:
```bash
pnpm admin:setup
# 或手动在数据库中将 user.role 设为 'admin'
```

## 常用开发命令

```bash
# 启动开发服务器
pnpm dev
pnpm dev:webpack  # Turbopack 太重时的兜底方案

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# 数据库操作
pnpm db:generate    # 生成 Drizzle 迁移文件
pnpm db:migrate     # 执行数据库迁移
pnpm db:push        # 推送 schema 到数据库 (开发环境)
pnpm db:studio      # 启动 Drizzle Studio 数据库管理界面

# 管理员工具
pnpm admin:setup    # 创建管理员账户

# 博客清单生成
pnpm generate:blog-manifest
```

## 环境变量配置

**必需的环境变量** (参考 `.env.example`):

```env
# 数据库
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="至少32字符的随机密钥"
BETTER_AUTH_URL="http://localhost:3000"  # 生产环境改为实际域名

# Google OAuth (可选；同时配置两个值才会显示 Google 按钮)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# 火山引擎 (必需,用于 AI 功能)
VOLCANO_ENGINE_API_KEY="your-volcano-engine-api-key"
VOLCANO_ENGINE_API_URL="https://ark.cn-beijing.volces.com/api/v3"

# Creem 支付 (必需,用于订阅和支付)
CREEM_API_KEY="your-creem-api-key"
CREEM_WEBHOOK_SECRET="whsec_..."
# 测试环境可设置 CREEM_SIMULATE="true" 跳过实际支付

# Resend 邮件 (必需,用于认证和交易邮件)
RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="Your App <noreply@yourdomain.com>"

# 定时任务认证 (用于 cron 端点)
CRON_SECRET="your-cron-secret"

# 应用 URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**可选的环境变量**:
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog 分析
- `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`: Google Analytics
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: Microsoft Clarity
- `STORAGE_*`: S3 兼容存储配置 (用于文件上传)

## 数据库架构 (核心表)

```sql
-- 用户表
user (id, email, credits, planKey, role, banned, ...)

-- 认证表
session (id, userId, token, expiresAt, ...)
account (id, userId, providerId, accessToken, ...)

-- 支付和订阅
payment (id, userId, providerPaymentId, amountCents, status, creditsGranted, ...)
subscription (id, userId, providerSubId, planKey, status, currentPeriodEnd, ...)
creditLedger (id, userId, delta, reason, paymentId, createdAt)
subscriptionCreditSchedule (id, subscriptionId, nextGrantAt, grantsRemaining, ...)

-- AI 功能
chatSession (id, userId, model, totalCreditsUsed, ...)
chatMessage (id, sessionId, role, content, creditsUsed, ...)
generationHistory (id, userId, type, prompt, resultUrl, status, ...)

-- 其他
passwordResetToken (id, userId, token, expiresAt)
newsletterSubscription (id, email, status, ...)
```

完整 Schema 定义: `lib/db/schema.ts`

## 国际化 (i18n)

- 框架: `next-intl`
- 支持语言: 英文 (`en`), 中文 (`zh`)
- 翻译文件: `messages/en.json`, `messages/zh.json`, `messages/seo.en.json`, `messages/seo.zh.json`
- 路由格式: 默认语言采用 `as-needed`，因此常见路径是 `/docs`、`/pricing`、`/login`，中文为 `/zh/docs`、`/zh/pricing`、`/zh/login`
- 路由拦截: `proxy.ts`

**添加新语言**:
1. 复制 `messages/en.json` / `messages/seo.en.json` 为新的语言版本
2. 翻译所有 JSON 文案
3. 更新 `i18n.config.ts`、`proxy.ts` 和 docs i18n 配置

## 文档系统

- 文档站点由 Fumadocs 驱动，入口为 `/docs`（英文）和 `/zh/docs`（中文）
- MDX 源文件放在 `content/docs/`
- `lib/source.ts` 读取 `fumadocs-mdx` 生成的 `.source/*`
- `public/fumadocs-style.css` 是通过 `pnpm run sync:fumadocs-style` 生成的派生文件，不要手写编辑

## 路由权限控制

- **公开路由**: `(marketing)`, `(auth)`, `demo`
- **受保护路由**: `(protected)` - 需要登录,通过 `SessionGuard` 组件保护
- **管理员路由**: `(admin)` - 需要 `role='admin'`,通过 `features/admin/components/admin-guard.tsx` 保护

## 安全机制

1. **Webhook 签名验证**: Creem webhook 通过 HMAC-SHA256 验证 (`lib/payments/creem.ts:76-110`)
2. **支付幂等性**: 通过 `providerPaymentId` 防止重复处理
3. **Cron 端点保护**: 通过 `CRON_SECRET` 或 Basic Auth 验证
4. **用户封禁**: 支持临时/永久封禁 (`user.banned`, `banReason`, `banExpires`)
5. **SQL 注入防护**: 使用 Drizzle ORM 参数化查询

## 部署清单

### 1. 环境准备
- [ ] PostgreSQL 数据库 (推荐 Supabase/Neon/Vercel Postgres)
- [ ] 火山引擎 API Key (https://console.volcengine.com/ark)
- [ ] Creem 账号和 API Key (https://creem.io)
- [ ] Resend API Key (https://resend.com)
- [ ] (可选) Google OAuth 凭据
- [ ] (可选) S3 存储配置

### 2. 数据库迁移
```bash
pnpm db:push  # 首次部署
# 或
pnpm db:migrate  # 使用迁移文件
```

### 3. 配置 Creem Webhook
在 Creem Dashboard 中设置 Webhook URL:
```
https://your-domain.com/api/payments/creem/webhook
```
监听事件: `checkout.completed`, `subscription.paid`, `subscription.active`

### 4. 配置 Cron Job (用于年付积分发放)
在 Vercel/服务器上设置定时任务,每小时调用:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/subscription-grants
```

### 5. 创建管理员账户
```bash
pnpm admin:setup
```

### 6. 环境变量检查
确保生产环境的 `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `RESEND_FROM_EMAIL` 使用正确的域名。

## 自定义指南

### 修改定价计划
编辑 `constants/billing.ts`:
```typescript
starter_monthly: {
  priceCents: 2900,        // 修改价格
  creditsPerCycle: 1000,   // 修改积分数
  creemPriceId: "prod_xxx" // 对应 Creem 的产品 ID
}
```

### 修改积分消耗规则
编辑相应文件:
- 对话: `lib/credits.ts:5` (CHAT_CREDIT_COST)
- 图像: `app/api/image/route.ts`
- 视频: `app/api/video/generate/route.ts`

### 替换 AI 提供商
如需切换到 OpenAI/Anthropic:
1. 替换 `lib/volcano-engine/` 中的 API 调用逻辑
2. 更新环境变量
3. 调整模型配置

### 添加新的支付网关
参考 `lib/payments/creem.ts` 的结构,创建新的支付提供商集成。

## 故障排查

### Webhook 未触发
1. 检查 Creem Dashboard 中 Webhook URL 是否正确
2. 查看 Webhook 日志,确认签名验证通过
3. 检查 `CREEM_WEBHOOK_SECRET` 是否匹配

### 年付积分未自动发放
1. 检查 Cron Job 是否正常运行
2. 查看 `subscriptionCreditSchedule` 表中的 `nextGrantAt` 时间
3. 检查 Cron 端点的认证配置

### 用户无法访问管理后台
1. 确认 `user.role = 'admin'`
2. 检查 `features/admin/components/admin-guard.tsx` 逻辑

## 性能优化建议

1. **积分查询**: 高频操作,考虑使用 Redis 缓存 `user.credits`
2. **AI API 调用**: 添加速率限制 (Rate Limiting)
3. **数据库索引**: 已在关键字段添加索引 (如 `subscriptionCreditSchedule.nextGrantAt`)
4. **图片/视频**: 使用 CDN 分发生成的媒体文件

## 相关文档

- [内置部署文档](content/docs/deployment.mdx)
- [内置自定义文档](content/docs/customization.mdx)
- [Better Auth 文档](https://better-auth.com/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Next.js 文档](https://nextjs.org/docs)
- [火山引擎 API 文档](https://www.volcengine.com/docs/82379)
