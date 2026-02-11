# 手机维修工单系统 MVP

一个全栈 TypeScript monorepo 项目，用于管理手机维修/物流/仓储工作流程。

## 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: NestJS + TypeScript + Prisma ORM
- **数据库**: PostgreSQL
- **队列**: Redis + BullMQ（可选）
- **Monorepo**: pnpm workspaces + Turborepo

## 项目结构

```
repair-workflow/
├── apps/
│   ├── api/           # NestJS 后端 API
│   └── web/           # Next.js 前端
├── packages/
│   └── shared/        # 共享类型、枚举、状态机、Zod schemas
├── prisma/
│   ├── schema.prisma  # 数据库模型
│   └── seed.ts        # 种子数据
└── docker-compose.yml # Docker 编排
```

## 快速开始

```bash
pnpm install                  # 安装依赖
cp .env.example .env          # 配置环境变量
docker compose up -d postgres redis  # 启动数据库
pnpm db:migrate               # 运行迁移
pnpm seed                     # 导入种子数据
pnpm dev                      # 启动开发服务器
```

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001

## 测试账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 店主 (OWNER) | owner@example.com | password123 |
| 员工 (STAFF) | staff@example.com | password123 |
| 客户 (CUSTOMER) | customer@example.com | password123 |

## 工单状态流转

```
SUBMITTED (已提交)
    ↓ verify (店主/员工)
OWNER_VERIFIED (已审核)
    ├─→ reportExternalDamage → EXTERNAL_DAMAGE_REPORTED (外损已报告) → ship
    └─→ recordDevice (员工)
DEVICE_INFO_RECORDED (设备已录入)
    ↓ diagnose (员工)
DIAGNOSED (已诊断)
    ↓ repair (员工)
REPAIRING (维修中)
    ↓ storeIn (员工)
STORED_IN (已入库)
    ↓ readyToShip (店主)
READY_TO_SHIP (待发货)
    ↓ ship (店主)
SHIPPED (已发货)
    ↓ customerConfirm (客户/店主)
DELIVERED (已签收)
    ↓ customerConfirm (客户/店主)
COMPLETED (已完成)

任何状态 → closeAbnormal (店主) → CLOSED_ABNORMAL (异常关闭)
COMPLETED/DELIVERED → reopen (客户/店主) → REOPENED → verify → ...
```

## API 端点

### 认证
- `POST /auth/login` - 登录

### 用户
- `GET /users` - 获取用户列表 (OWNER)
- `POST /users` - 创建用户 (OWNER)

### 工单
- `GET /work-orders` - 获取工单列表（分页、搜索、状态筛选）
- `POST /work-orders` - 创建工单
- `GET /work-orders/:id` - 获取工单详情
- `PATCH /work-orders/:id` - 更新工单
- `POST /work-orders/:id/assign` - 分配员工
- `POST /work-orders/:id/actions/verify` - 审核
- `POST /work-orders/:id/actions/report-external-damage` - 报告外损
- `POST /work-orders/:id/actions/record-device` - 录入设备
- `POST /work-orders/:id/actions/diagnose` - 诊断
- `POST /work-orders/:id/actions/repair` - 维修
- `POST /work-orders/:id/actions/store-in` - 入库
- `POST /work-orders/:id/actions/ready-to-ship` - 准备发货
- `POST /work-orders/:id/actions/ship` - 发货
- `POST /work-orders/:id/actions/customer-confirm` - 客户确认
- `POST /work-orders/:id/actions/reopen` - 重新打开
- `POST /work-orders/:id/actions/close-abnormal` - 异常关闭

### 附件
- `POST /attachments/upload` - 上传附件
- `GET /attachments/:id/download` - 下载附件

### 公开确认（无需登录）
- `POST /public/confirm/request-token` - 生成确认链接 (OWNER)
- `GET /public/confirm/:token` - 获取确认信息
- `POST /public/confirm/:token` - 提交确认

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | - |
| `REDIS_HOST` | Redis 主机（可选，不配则禁用队列） | localhost |
| `REDIS_PORT` | Redis 端口 | 6379 |
| `JWT_SECRET` | JWT 密钥 | - |
| `API_PORT` | API 端口 | 3001 |
| `NEXT_PUBLIC_API_URL` | 前端访问后端的地址 | http://localhost:3001 |
| `FRONTEND_URL` | 后端生成确认链接的前端地址 | http://localhost:3000 |
| `STORAGE_PATH` | 文件存储路径 | ./storage |

## 其他文档

- [部署指南](./DEPLOYMENT.md) - 本地开发 / Vercel 生产部署
- [开发文档](./DEV.md) - 代码架构详解
