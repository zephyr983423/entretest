# 部署指南：本地开发 vs Vercel 生产部署

本项目是一个前后端分离的 monorepo 架构。以下是两种运行方式的完整指南。

## 部署架构总览

| 组件 | 技术 | 本地开发 | 生产部署（全免费） |
|------|------|----------|-------------------|
| 前端 (`apps/web`) | Next.js 14 | localhost:3000 | **Vercel** (免费) |
| 后端 (`apps/api`) | NestJS | localhost:3001 | **Render** (免费) |
| 数据库 | PostgreSQL | Docker Compose | **Neon** (免费) |
| 队列 | Redis + BullMQ | Docker Compose | 可选（不配也能跑） |

> Redis 已改为**可选依赖**。不配置 Redis 时，应用完全正常运行，只是没有自动清理过期 token 的定时任务。

---

## 一、本地开发

### 前置条件

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Docker Desktop (用于 PostgreSQL 和 Redis)

### 启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量（首次运行）
cp .env.example .env

# 3. 启动 PostgreSQL 和 Redis
pnpm db:up

# 4. 运行数据库迁移 + 种子数据（首次运行）
pnpm db:migrate
pnpm seed

# 5. 启动前后端开发服务器
pnpm dev
```

访问地址：
- 前端: http://localhost:3000
- 后端 API: http://localhost:3001

### 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 店主 | owner@example.com | password123 |
| 员工 | staff@example.com | password123 |
| 客户 | customer@example.com | password123 |

### 停止服务

```bash
pnpm db:down
```

---

## 二、免费部署到线上（Vercel + Render + Neon）

只需注册 3 个免费服务，全程不用花钱。

### 第 1 步：创建云数据库 — Neon (免费 PostgreSQL)

1. 打开 https://neon.tech ，用 GitHub 登录
2. 点击 **Create a project**，地区选 **Singapore**（离国内最近）
3. 创建完成后，在 Dashboard 复制 **Connection string**，格式类似：
   ```
   postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. 保存好这个连接字符串，后面会用到

### 第 2 步：部署后端 API — Render (免费)

1. 打开 https://render.com ，用 GitHub 登录
2. 点击 **New** → **Web Service**
3. 连接你的 GitHub 仓库
4. 填写以下配置：

| 配置项 | 值 |
|--------|------|
| **Name** | `repair-api`（随意取名） |
| **Region** | Singapore |
| **Runtime** | Node |
| **Build Command** | `pnpm install && pnpm --filter @repo/shared build && pnpm --filter @repo/api prisma generate && pnpm --filter @repo/api build` |
| **Start Command** | `node apps/api/dist/main.js` |
| **Instance Type** | **Free** |

5. 在 **Environment Variables** 中添加：

| 变量 | 值 |
|------|------|
| `DATABASE_URL` | 第 1 步 Neon 的连接字符串 |
| `JWT_SECRET` | 随便填一个长字符串，如 `my-super-secret-key-2024-repair` |
| `JWT_EXPIRES_IN` | `8h` |
| `API_PORT` | `3001` |
| `STORAGE_PATH` | `./storage` |
| `STORAGE_TYPE` | `local` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | 先填 `*`，等前端部署好再改 |

6. 点击 **Create Web Service**，等待构建完成
7. 构建成功后，Render 会给你一个 URL，如 `https://repair-api-xxxx.onrender.com`
8. **运行数据库迁移**：在本地终端执行（将 DATABASE_URL 替换为你的 Neon 连接字符串）：

```bash
DATABASE_URL="你的Neon连接字符串" npx prisma migrate deploy --schema=./prisma/schema.prisma
```

9. **（可选）导入种子数据**：

```bash
DATABASE_URL="你的Neon连接字符串" pnpm seed
```

> **注意**：Render 免费层在 15 分钟无请求后会休眠，下次访问需约 30 秒冷启动。这对测试完全够用。

### 第 3 步：部署前端 — Vercel (免费)

1. 打开 https://vercel.com ，用 GitHub 登录
2. 点击 **Add New** → **Project**
3. **Import** 你的 GitHub 仓库
4. Vercel 会自动读取 `vercel.json`，确认以下设置：

| 配置项 | 值（应已自动填充） |
|--------|------|
| **Framework Preset** | Next.js |
| **Build Command** | `pnpm turbo run build --filter=@repo/web` |
| **Output Directory** | `apps/web/.next` |
| **Install Command** | `pnpm install` |

5. 在 **Environment Variables** 中添加：

| 变量 | 值 |
|------|------|
| `NEXT_PUBLIC_API_URL` | `https://repair-api-xxxx.onrender.com`（第 2 步 Render 的 URL） |

6. 点击 **Deploy**，等待构建完成
7. 部署成功后，Vercel 给你的 URL 就是网站地址，如 `https://repair-workflow-xxx.vercel.app`

### 第 4 步：回填 CORS 地址

回到 Render 的后端服务：

1. 打开 **Environment** 标签页
2. 将 `FRONTEND_URL` 的值从 `*` 改为 Vercel 给你的前端 URL：
   ```
   https://repair-workflow-xxx.vercel.app
   ```
3. Render 会自动重新部署

**完成！** 现在你可以通过 Vercel 的 URL 访问你的网站了。

---

## 三、日常开发工作流

### 本地开发（改代码 + 调试）

```bash
pnpm db:up       # 启动本地数据库（如果没启动）
pnpm dev          # 启动前后端
```

`.env` 保持本地配置不需要动：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/repair_workflow?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

### 推送到线上（Vercel + Render 自动部署）

```bash
git add .
git commit -m "你的改动描述"
git push origin main
```

推送到 GitHub 后：
- **Vercel** 自动检测到更新，重新构建前端
- **Render** 自动检测到更新，重新构建后端
- 无需手动操作

---

## 四、常见问题

### Q: 线上访问时 API 请求失败 / CORS 错误

1. 确认 Vercel 中 `NEXT_PUBLIC_API_URL` 的值是 Render 后端 URL（不要带末尾 `/`）
2. 确认 Render 中 `FRONTEND_URL` 的值是 Vercel 前端 URL
3. `NEXT_PUBLIC_` 开头的变量在**构建时**注入，修改后需在 Vercel 点 **Redeploy**

### Q: 打开网站要等很久才加载

Render 免费层在 15 分钟无访问后会休眠，首次请求需要约 30 秒唤醒后端。这是免费方案的限制，刷新一下就好。

### Q: Vercel 构建失败，找不到 `@repo/shared`

`vercel.json` 配置了 `pnpm turbo run build --filter=@repo/web`，Turbo 会自动先构建依赖包。如果仍失败，在 Vercel 设置中确认 **Install Command** 为 `pnpm install`。

### Q: 数据库连接失败

- 确认 Neon 连接字符串末尾有 `?sslmode=require`
- 在 Neon Dashboard 中确认数据库未暂停（免费层长时间不用会暂停，点击即可恢复）

### Q: 本地运行 `pnpm dev` 报错

```bash
docker compose ps          # 检查容器是否在运行
pnpm db:up                 # 启动数据库容器
pnpm db:migrate            # 运行迁移（首次）
pnpm seed                  # 导入种子数据（首次）
```

### Q: 如果以后想加 Redis 怎么办？

去 https://upstash.com 创建免费 Redis，然后在 Render 中添加环境变量：
```
REDIS_HOST=your-host.upstash.io
REDIS_PORT=6379
```
应用会自动启用 BullMQ 队列和定时任务。

---

## 五、免费额度参考

| 服务 | 免费额度 |
|------|----------|
| **Vercel** | 每月 100GB 带宽，无限次部署 |
| **Render** | 750 小时/月（足够 1 个服务 24/7 运行），不活跃时休眠 |
| **Neon** | 0.5 GB 存储，持续运行 |
