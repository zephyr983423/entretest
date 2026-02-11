# 开发文档

> 看完这个文件，你就知道每行代码在干什么、改哪里。

---

## 一、架构总览

```
┌─────────────┐    fetch    ┌─────────────┐   Prisma   ┌────────────┐
│  Next.js    │  ────────→  │   NestJS    │  ────────→ │ PostgreSQL │
│  apps/web   │  ←────────  │   apps/api  │  ←──────── │            │
└─────────────┘   JSON API  └──────┬──────┘            └────────────┘
                                   │ BullMQ (可选)
                                   ↓
                              ┌─────────┐
                              │  Redis  │
                              └─────────┘
```

- **前端** 纯客户端渲染（`'use client'`），通过 `NEXT_PUBLIC_API_URL` 调后端 REST API
- **后端** 所有响应格式统一：`{ data: ..., error: null }` 或 `{ data: null, error: { statusCode, message } }`
- **共享包** 前后端共用枚举、Zod schema、状态机逻辑，改一处两端生效

---

## 二、目录逐个击破

### `packages/shared/` — 共享代码（前后端都依赖它）

| 文件 | 做什么 | 改什么时候动它 |
|------|--------|---------------|
| `src/enums.ts` | 所有枚举：`Role`, `WorkOrderStatus`, `Action`, `AttachmentType` 等 | 加新角色、新状态、新操作类型 |
| `src/stateMachine.ts` | **核心：状态流转规则 + 权限控制** | 改工单流程、改谁能做什么操作 |
| `src/schemas.ts` | Zod 校验 schema，前后端共用 | 加/改 API 入参字段 |
| `src/index.ts` | 统一导出 | 加了新文件就在这里 re-export |

#### `stateMachine.ts` 详解（最重要的文件）

```typescript
// 1. allowedTransitions — 定义状态 A 经过操作 X 到达状态 B
allowedTransitions[SUBMITTED][VERIFY] = OWNER_VERIFIED

// 2. actionPermissions — 定义谁能执行操作 X
actionPermissions[VERIFY].roles = [OWNER, STAFF]

// 3. editableFieldsByStatus — 定义状态下哪些字段可编辑
editableFieldsByStatus[SUBMITTED].allowed = ['orderNo', 'customerName', ...]

// 4. 四个工具函数
canTransition(from, action)        // 这个操作能不能从当前状态执行？
canPerformAction(action, role, wo) // 这个用户有没有权限？
canEditField(status, field, role)  // 这个字段现在能不能改？
getAvailableActions(status, role)  // 当前有哪些按钮可以点？
```

**想加一个新的工单状态？**
1. `enums.ts` 加枚举值
2. `stateMachine.ts` 的 `allowedTransitions` 加流转规则
3. `stateMachine.ts` 的 `actionPermissions` 加权限
4. `stateMachine.ts` 的 `editableFieldsByStatus` 加字段编辑规则
5. `prisma/schema.prisma` 的 `WorkOrderStatus` 枚举加值，跑 migration
6. 前端 `constants.ts` 加中文标签和颜色

---

### `prisma/` — 数据库

| 文件 | 做什么 |
|------|--------|
| `schema.prisma` | 数据库表结构定义，10 个模型 |
| `seed.ts` | 种子数据：3 个测试用户 + 3 个不同阶段的工单 |
| `migrations/` | Prisma 自动生成的 SQL 迁移文件 |

**改数据库的流程：**
```bash
# 1. 改 schema.prisma
# 2. 生成并应用迁移
pnpm db:migrate:dev
# 3. 如果只需要重新生成 Prisma Client（没改表结构）
pnpm db:generate
```

**核心模型关系：**
```
User ──1:N──→ WorkOrder (customer / assignedTo)
WorkOrder ──1:N──→ Inspection, Repair, InventoryTxn, Attachment, WorkOrderEvent
WorkOrder ──1:1──→ Device, PublicConfirmToken
```

---

### `apps/api/` — 后端 (NestJS)

#### 启动入口

| 文件 | 做什么 |
|------|--------|
| `src/main.ts` | 启动 NestJS，配置 CORS、全局 ValidationPipe、异常过滤器 |
| `src/app.module.ts` | 根模块，组装所有子模块。Redis 不可用时自动跳过 BullMQ |

#### 基础设施层

| 文件 | 做什么 |
|------|--------|
| `src/prisma/prisma.module.ts` | `@Global()` 模块，全局注入 PrismaService |
| `src/prisma/prisma.service.ts` | Prisma Client 封装，管理连接生命周期 |
| `src/common/pipes/zod-validation.pipe.ts` | 用 Zod schema 校验请求体，校验失败返回 400 |
| `src/common/filters/http-exception.filter.ts` | 统一异常格式 `{ data: null, error: {...} }` |
| `src/common/decorators/roles.decorator.ts` | `@Roles(Role.OWNER)` 装饰器 |

#### 认证模块 `src/auth/`

| 文件 | 做什么 |
|------|--------|
| `auth.module.ts` | 配置 JWT（密钥从 `JWT_SECRET` 读取，有效期从 `JWT_EXPIRES_IN` 读取） |
| `auth.service.ts` | `login()` 方法：查用户 → bcrypt 比对密码 → 签发 JWT |
| `auth.controller.ts` | `POST /auth/login` 唯一入口 |
| `jwt.strategy.ts` | Passport JWT 策略：从 Bearer token 解析用户，查数据库确认存在 |
| `jwt-auth.guard.ts` | 全局守卫。标了 `@SetMetadata('isPublic', true)` 的路由跳过验证 |
| `roles.guard.ts` | 角色守卫。配合 `@Roles()` 装饰器使用 |

**认证流程：** 请求 → `JwtAuthGuard` 验 token → `RolesGuard` 验角色 → Controller

#### 用户模块 `src/users/`

| 文件 | 做什么 |
|------|--------|
| `users.controller.ts` | `POST /users`（创建）+ `GET /users`（列表），仅 OWNER 可用 |
| `users.service.ts` | `create()`（bcrypt 哈希密码）、`findAll()`、`findById()` |

#### 工单模块 `src/work-orders/` — 最复杂的模块

| 文件 | 做什么 |
|------|--------|
| `work-orders.controller.ts` | 14 个端点，每个操作对应一个 `POST /actions/xxx` 路由 |
| `work-orders.service.ts` | **575 行，核心业务逻辑** |

**`work-orders.service.ts` 关键方法：**

| 方法 | 做什么 |
|------|--------|
| `getWorkOrderWithAccess()` | 查询工单全量数据（含所有关联），校验访问权限 |
| `findAll()` | 分页列表，CUSTOMER 只看自己的 |
| `findOne()` | 详情，附带 `availableActions` 告诉前端当前能做什么操作 |
| `create()` | 创建工单，自动记录 SUBMIT 事件 |
| `executeAction()` | **通用操作执行器**：验状态机 → 验权限 → 在事务中执行操作 + 记录事件 |
| `verify/diagnose/repair/...` | 各状态操作，都调用 `executeAction()` |
| `customerConfirm()` | 特殊：满意→DELIVERED/COMPLETED，不满意→REOPENED |

#### 附件模块 `src/attachments/`

| 文件 | 做什么 |
|------|--------|
| `attachments.module.ts` | 配置 Multer（内存存储，10MB 上限） |
| `attachments.controller.ts` | 上传 + 下载（认证用户）、公开下载（token 验证） |
| `attachments.service.ts` | 上传逻辑（验权限 → 存文件 → 写数据库）、下载逻辑（验权限 → 返回路径） |
| `storage.service.ts` | 本地文件系统存储：`saveFile()`、`getFilePath()`、`deleteFile()` |

**文件存储路径结构：** `{STORAGE_PATH}/{workOrderId}/{uuid}.ext`

#### 公开确认模块 `src/public-confirm/`

| 文件 | 做什么 |
|------|--------|
| `public-confirm.controller.ts` | 生成 token（需登录） + 查看/提交确认（无需登录） |
| `public-confirm.service.ts` | 生成 32 字节随机 token，7 天过期，一次性使用 |

**场景**：店主给客户发一个确认链接，客户打开就能确认收货，不需要注册账号。

#### 队列模块 `src/queue/`（可选，无 Redis 时自动禁用）

| 文件 | 做什么 |
|------|--------|
| `queue.module.ts` | 注册 BullMQ 队列 `token-cleanup` |
| `token-cleanup.processor.ts` | 每小时清理过期的 PublicConfirmToken |

---

### `apps/web/` — 前端 (Next.js)

#### 核心文件

| 文件 | 做什么 |
|------|--------|
| `src/lib/api-client.ts` | **所有 API 调用都在这里**。统一处理 token 注入、401 跳转、错误格式化 |
| `src/lib/auth.ts` | localStorage 存取 `{ user, token }`，无服务端状态 |
| `src/lib/constants.ts` | 状态中文标签、操作中文标签、Badge 颜色映射、进度条步骤定义 |
| `src/lib/utils.ts` | `cn()` Tailwind 类名合并、`formatDate()` |

#### 路由结构

```
src/app/
├── layout.tsx              # 根布局：AuthProvider + ToastProvider
├── page.tsx                # / — 根据登录状态重定向
├── (auth)/
│   └── login/page.tsx      # /login — 登录页
├── (dashboard)/
│   ├── layout.tsx          # Dashboard 布局：验证登录 + Navbar
│   ├── work-orders/
│   │   ├── page.tsx        # /work-orders — 工单列表（搜索、筛选、新建）
│   │   └── [id]/page.tsx   # /work-orders/:id — 工单详情
│   └── my-work-orders/
│       └── page.tsx        # /my-work-orders — 我的工单
└── confirm/
    └── [token]/page.tsx    # /confirm/:token — 公开确认页（无需登录）
```

#### 组件结构

| 组件 | 做什么 |
|------|--------|
| `components/auth-provider.tsx` | `AuthContext` 提供 `user/login/logout`，管理路由守卫 |
| `components/navbar.tsx` | 顶部导航栏，角色中文标签，退出按钮 |
| `components/work-order/work-order-form.tsx` | **工单详情页主组件**：编排所有 section |
| `components/work-order/progress-bar.tsx` | 10 步进度条 |
| `components/work-order/event-timeline.tsx` | 操作历史时间线 |
| `components/work-order/types.ts` | 前端 TypeScript 类型定义（对应后端返回的 JSON 结构） |
| `components/work-order/section-*.tsx` | **12 个操作表单**，每个对应一个状态操作 |
| `components/ui/*.tsx` | shadcn/ui 基础组件 |

#### Section 组件的模式（所有 12 个都一样）

每个 `section-*.tsx` 组件的逻辑：
1. 检查 `workOrder.availableActions` 里有没有自己对应的 Action
2. 没有 → 显示只读信息或不渲染
3. 有 → 显示表单
4. 提交 → 调 `api-client.ts` 的对应方法 → 调 `onUpdated()` 刷新页面数据

**想加一个新的操作表单？**
1. 新建 `section-xxx.tsx`（复制一个现有的改）
2. 在 `work-order-form.tsx` 里引入并放到合适的位置
3. 在 `api-client.ts` 里加对应的 API 调用方法

---

## 三、核心设计模式

### 1. 统一响应格式

后端所有接口返回：
```json
// 成功
{ "data": { ... }, "error": null }
// 失败
{ "data": null, "error": { "statusCode": 400, "message": "xxx" } }
```
这由 `http-exception.filter.ts` 统一处理异常，Controller 手动包 `{ data: result, error: null }`。

### 2. 状态机 + 通用执行器

所有状态操作走同一个流程：
```
Controller → Service.xxxAction() → executeAction()
    1. getWorkOrderWithAccess() — 查数据 + 验身份
    2. canTransition() — 验状态流转合法性
    3. canPerformAction() — 验角色权限
    4. prisma.$transaction() — 在事务中执行操作 + 写事件日志
```
唯一例外是 `customerConfirm()`，因为满意/不满意会走不同分支。

### 3. 前端 availableActions 驱动 UI

后端 `findOne()` 返回 `availableActions: Action[]`，前端 section 组件根据这个数组决定渲染表单还是只读。前端不做权限判断，完全由后端告知。

---

## 四、角色权限详解

系统有三个角色：**OWNER（店主）**、**STAFF（员工）**、**CUSTOMER（客户）**。所有权限逻辑集中在 `packages/shared/src/stateMachine.ts`。

### 1. 三个角色定位

| 角色 | 定位 | 数据可见范围 |
|------|------|-------------|
| **OWNER** | 店主/管理员，拥有最高权限 | 所有工单 |
| **STAFF** | 员工/技术人员，负责具体操作 | 所有工单 |
| **CUSTOMER** | 客户/送修人 | **仅自己的工单**（`customerUserId === user.id`） |

### 2. 操作权限矩阵

下表列出每个操作（Action）哪些角色可以执行：

| 操作 | 中文 | OWNER | STAFF | CUSTOMER | 说明 |
|------|------|:-----:|:-----:|:--------:|------|
| `SUBMIT` | 提交工单 | ✅ | ✅ | ✅ | 所有人都能提交 |
| `ASSIGN` | 分配员工 | ✅ | ❌ | ❌ | 只有店主能指派员工 |
| `VERIFY` | 审核 | ✅ | ✅ | ❌ | 店主或员工审核工单 |
| `REPORT_EXTERNAL_DAMAGE` | 报告外损 | ✅ | ✅ | ❌ | 收到包裹发现外损 |
| `RECORD_DEVICE` | 录入设备 | ❌ | ✅ | ❌ | **仅员工**，拆包录入设备信息 |
| `DIAGNOSE` | 诊断 | ❌ | ✅ | ❌ | **仅员工**，检测设备问题 |
| `REPAIR` | 维修 | ❌ | ✅ | ❌ | **仅员工**，执行维修操作 |
| `STORE_IN` | 入库 | ❌ | ✅ | ❌ | **仅员工**，维修完成入库 |
| `READY_TO_SHIP` | 准备发货 | ✅ | ❌ | ❌ | **仅店主**，确认可以发货 |
| `SHIP` | 发货 | ✅ | ❌ | ❌ | **仅店主**，填写快递单号发出 |
| `CUSTOMER_CONFIRM` | 客户确认 | ✅ | ❌ | ✅ | 客户确认收货/满意度，店主也可代操作 |
| `REOPEN` | 重新打开 | ✅ | ❌ | ✅ | 客户不满意，重新进入流程 |
| `CLOSE_ABNORMAL` | 异常关闭 | ✅ | ❌ | ❌ | **仅店主**，任何状态都能异常关闭 |

### 3. 字段编辑权限

不同状态下，不同角色能编辑的工单字段不同：

| 状态 | 可编辑字段 | 允许的角色 |
|------|-----------|-----------|
| **DRAFT** | orderNo, customerName, customerPhone, customerAddress, notes | OWNER, STAFF, CUSTOMER |
| **SUBMITTED** | orderNo, customerName, customerPhone, customerAddress, notes | OWNER, CUSTOMER |
| **OWNER_VERIFIED** ~ **READY_TO_SHIP** | orderNo, notes | **仅 OWNER** |
| **SHIPPED** | orderNo | **仅 OWNER** |
| **REOPENED** | orderNo, notes | **仅 OWNER** |
| **DELIVERED / COMPLETED / CLOSED_ABNORMAL** | 无 | 无人可编辑 |

**规律**：越往后走，能编辑的字段越少；审核通过后，只有店主能改基本信息。

### 4. 数据访问控制

| 控制点 | 位置 | 规则 |
|--------|------|------|
| 工单列表过滤 | `work-orders.service.ts → findAll()` | CUSTOMER 只能查到 `customerUserId === 自己` 的工单；OWNER/STAFF 看全部 |
| 工单详情访问 | `work-orders.service.ts → getWorkOrderWithAccess()` | CUSTOMER 访问非自己的工单直接 403 |
| 用户管理 | `users.controller.ts` | `@Roles(Role.OWNER)` — 只有 OWNER 能创建/查看用户列表 |
| 生成确认链接 | `public-confirm.controller.ts → requestToken()` | 需要登录，实际上只有 OWNER 会用这个功能 |
| 公开确认页 | `public-confirm.controller.ts → getByToken() / confirm()` | 无需登录（`@SetMetadata('isPublic', true)`），凭 token 访问 |
| 附件上传/下载 | `attachments.controller.ts` | 需要登录；下载时内部校验工单访问权限 |
| 公开附件下载 | `PublicAttachmentsController` | 无需登录，凭 token 下载 |

### 5. 每个角色的完整能力总结

#### OWNER（店主）— 全局管理者

- **管理用户**：创建员工/客户账号，查看用户列表
- **管理工单全流程**：提交 → 审核 → 准备发货 → 发货 → 代客户确认
- **分配员工**：把工单指派给具体员工处理
- **异常处理**：任何状态都能异常关闭工单
- **编辑权限最大**：几乎所有状态都能改 orderNo 和 notes
- **生成确认链接**：给客户发无需登录的确认链接
- **看到所有工单**

#### STAFF（员工）— 操作执行者

- **核心操作**：录入设备 → 诊断 → 维修 → 入库（这四步只有员工能做）
- **辅助操作**：审核工单、报告外损
- **不能做的**：分配员工、发货、确认收货、异常关闭、重新打开
- **编辑受限**：只在 DRAFT 状态能编辑字段，之后不能改
- **看到所有工单**

#### CUSTOMER（客户）— 终端用户

- **提交工单**：填写基本信息提交
- **确认收货**：收到货后确认满意/不满意
- **重新打开**：不满意时要求重修
- **编辑受限**：只在 DRAFT / SUBMITTED 状态能改自己的信息
- **数据隔离**：**只能看到和操作自己的工单**
- **不能做的**：审核、录入设备、诊断、维修、入库、发货、异常关闭、分配员工

---

## 五、工单流转逻辑完整说明

> 所有状态流转规则定义在 `packages/shared/src/stateMachine.ts` 的 `allowedTransitions`。
> 所有操作的业务逻辑实现在 `apps/api/src/work-orders/work-orders.service.ts`。

### 1. 全部 14 个状态

| 状态 | 中文 | 性质 | 说明 |
|------|------|------|------|
| `DRAFT` | 草稿 | 虚拟状态 | 仅存在于事件记录中（`fromStatus`），实际创建后直接进入 SUBMITTED |
| `SUBMITTED` | 已提交 | 等待处理 | 工单入口状态，等待店主/员工审核 |
| `OWNER_VERIFIED` | 已审核 | 分支点 | 审核通过，接下来有两条路：正常录入设备 或 报告外损 |
| `EXTERNAL_DAMAGE_REPORTED` | 外损已报告 | 分支路径 | 收到包裹就发现外损，直接退回发货 |
| `DEVICE_INFO_RECORDED` | 设备已录入 | 正常流程 | 员工拆包、录入设备信息完成 |
| `DIAGNOSED` | 已诊断 | 分支点 | 检测完成，可以进入维修，也可以直接入库（无需维修的情况） |
| `REPAIRING` | 维修中 | 正常流程 | 维修操作已记录 |
| `STORED_IN` | 已入库 | 正常流程 | 设备已入仓库货架 |
| `READY_TO_SHIP` | 待发货 | 正常流程 | 店主确认可以发出 |
| `SHIPPED` | 已发货 | 等待确认 | 已发出快递，等客户确认收货 |
| `DELIVERED` | 已签收 | 等待确认 | 客户确认收到货，但还没确认满意 |
| `COMPLETED` | 已完成 | **终态** | 客户确认满意，流程正常结束 |
| `REOPENED` | 已重开 | 回到流程 | 客户不满意或未收到货，重新进入流程 |
| `CLOSED_ABNORMAL` | 异常关闭 | **终态** | 店主手动关闭，任何状态都可触发 |

### 2. 完整流转图

```
                                    ┌──────────────────────────────────────────────────┐
                                    │        任何非终态 → closeAbnormal → CLOSED_ABNORMAL│
                                    └──────────────────────────────────────────────────┘

  创建工单                          ┌── reportExternalDamage ──→ EXTERNAL_DAMAGE_REPORTED
  (DRAFT→SUBMITTED)                 │                                      │
        │                           │                                  ship │
        ↓                           │                                      ↓
    SUBMITTED ── verify ──→ OWNER_VERIFIED                              SHIPPED ←──────────┐
                                    │                                      │                │
                                    └── recordDevice ──→ DEVICE_INFO_RECORDED              │
                                                               │                            │
                                                          diagnose                          │
                                                               ↓                            │
                                                           DIAGNOSED                        │
                                                          ╱        ╲                        │
                                                   repair            storeIn                │
                                                    ↓                   ↓                   │
                                                REPAIRING ─ storeIn → STORED_IN             │
                                                                        │                   │
                                                                   readyToShip              │
                                                                        ↓                   │
                                                                  READY_TO_SHIP             │
                                                                        │                   │
                                                                      ship                  │
                                                                        ↓                   │
                                                                     SHIPPED ───────────────┘
                                                                        │                (已在上面)
                                                                customerConfirm
                                                               (delivered=true)
                                                                        ↓
                                                                    DELIVERED
                                                                        │
                                                                customerConfirm
                                                               (satisfied=true)
                                                                        ↓
                                                                    COMPLETED ← 终态

  ┌──────────────────── 不满意/未收到 ────────────────────────────┐
  │ SHIPPED  状态下：customerConfirm(delivered=false/satisfied=false) │
  │ DELIVERED 状态下：customerConfirm(satisfied=false)               │
  │ SHIPPED/DELIVERED 状态下：reopen                                 │
  └──────────────────────────────────────────────────────────────────┘
                                    ↓
                                REOPENED ── verify ──→ OWNER_VERIFIED（重新进入主流程）
```

### 3. 正常主线流程（Happy Path）

一个工单从提交到完成的标准路径，共经过 **10 个步骤**：

```
DRAFT → SUBMITTED → OWNER_VERIFIED → DEVICE_INFO_RECORDED → DIAGNOSED
  → REPAIRING → STORED_IN → READY_TO_SHIP → SHIPPED → DELIVERED → COMPLETED
```

| 步骤 | 操作 | 谁做 | 输入数据 | 写入的数据 |
|------|------|------|---------|-----------|
| 1 | 创建工单 | 任何人 | orderNo?, customerUserId?, customerName?, customerPhone?, customerAddress?, notes? | 创建 WorkOrder（状态 SUBMITTED）+ 记录 SUBMIT 事件 |
| 2 | 审核 `verify` | 店主/员工 | inboundTrackingNo（必填，入库快递单号） | 更新 inboundTrackingNo，状态→ OWNER_VERIFIED |
| 3 | 录入设备 `recordDevice` | 员工 | brand（必填）, model（必填）, imei?, serialNo?, conditionNotes? | 创建 Device 记录（自动生成 labelCode: `LBL-XXXXXXXX`），关联到工单，状态→ DEVICE_INFO_RECORDED |
| 4 | 诊断 `diagnose` | 员工 | result: NORMAL/ABNORMAL（必填）, checklistJson?, notes? | 创建 Inspection 记录，状态→ DIAGNOSED |
| 5 | 维修 `repair` | 员工 | result: FIXED/UNFIXED/NA（必填）, actionsJson?, cost?, notes? | 创建 Repair 记录，状态→ REPAIRING |
| 6 | 入库 `storeIn` | 员工 | location?, notes? | 创建 InventoryTxn（type=IN），状态→ STORED_IN |
| 7 | 准备发货 `readyToShip` | 店主 | （无输入） | 状态→ READY_TO_SHIP |
| 8 | 发货 `ship` | 店主 | outboundTrackingNo（必填，出库快递单号） | 创建 InventoryTxn（type=OUT），更新 outboundTrackingNo，状态→ SHIPPED |
| 9 | 客户确认收货 `customerConfirm` | 客户/店主 | delivered=true, satisfied=true | 状态→ DELIVERED |
| 10 | 客户确认满意 `customerConfirm` | 客户/店主 | delivered=true, satisfied=true | 状态→ COMPLETED（终态） |

> **注意**：步骤 9 和 10 用的是同一个 API 端点 `customerConfirm`，但从不同状态出发（SHIPPED → DELIVERED 是收货确认，DELIVERED → COMPLETED 是满意度确认）。

### 4. 分支路径详解

#### 4.1 外损分支（收到包裹就有外损，不拆包直接退回）

```
SUBMITTED → verify → OWNER_VERIFIED → reportExternalDamage → EXTERNAL_DAMAGE_REPORTED → ship → SHIPPED
```

| 操作 | 输入 | 说明 |
|------|------|------|
| `reportExternalDamage` | notes（必填）, attachmentIds?（外损照片） | 审核后发现快递外包装有损坏，不拆包。notes 追加到工单备注；可附带拍照凭证 |
| `ship` | outboundTrackingNo（必填） | 直接退回发货，跳过录入设备/诊断/维修/入库整个流程 |

**适用场景**：快递运输造成外包装损坏，无法正常处理，直接退还客户。

#### 4.2 诊断后直接入库（无需维修）

```
... → DIAGNOSED → storeIn → STORED_IN → ...
```

从 DIAGNOSED 状态，除了走 `repair → REPAIRING → storeIn → STORED_IN` 的标准路径，也可以直接走 `storeIn → STORED_IN`，跳过维修步骤。

**适用场景**：检测结果正常（NORMAL），不需要维修，直接入库准备退回。

#### 4.3 异常关闭（任何状态都可以）

```
任何非终态 → closeAbnormal → CLOSED_ABNORMAL
```

| 操作 | 输入 | 说明 |
|------|------|------|
| `closeAbnormal` | notes（必填，关闭原因） | notes 追加到工单备注（前缀 `Closed:`） |

**可触发的状态**：SUBMITTED、OWNER_VERIFIED、EXTERNAL_DAMAGE_REPORTED、DEVICE_INFO_RECORDED、DIAGNOSED、REPAIRING、STORED_IN、READY_TO_SHIP、REOPENED（共 9 个状态）

**不可触发的状态**：SHIPPED（已发出不能关闭）、DELIVERED、COMPLETED、CLOSED_ABNORMAL（终态不可操作）

**适用场景**：客户取消、设备遗失、纠纷等任何需要中止工单的情况。仅 OWNER 可操作。

#### 4.4 客户不满意 → 重开（Reopen）

客户不满意有**两种触发方式**：

**方式 A：通过 `customerConfirm` 操作，`delivered=false` 或 `satisfied=false`**

```
SHIPPED → customerConfirm(delivered=false) → REOPENED
DELIVERED → customerConfirm(satisfied=false) → REOPENED
```

内部逻辑（`work-orders.service.ts:456-470`）：
```typescript
if (!input.delivered || !input.satisfied) {
  targetAction = Action.REOPEN;    // 转换为 REOPEN 操作
  targetStatus = WorkOrderStatus.REOPENED;
} else if (workOrder.status === WorkOrderStatus.SHIPPED) {
  targetStatus = WorkOrderStatus.DELIVERED;    // 收货确认
} else {
  targetStatus = WorkOrderStatus.COMPLETED;    // 满意确认
}
```

**方式 B：通过 `reopen` 操作，需要填写原因**

```
SHIPPED → reopen(reason) → REOPENED
DELIVERED → reopen(reason) → REOPENED
```

| 操作 | 输入 | 说明 |
|------|------|------|
| `reopen` | reason（必填） | reason 追加到工单备注（前缀 `Reopened:`） |

**重开后**：REOPENED 状态可以通过 `verify` 重新回到 OWNER_VERIFIED，从而重新进入主流程。也可以被 `closeAbnormal` 关闭。

```
REOPENED → verify → OWNER_VERIFIED → recordDevice → ... （重走流程）
REOPENED → closeAbnormal → CLOSED_ABNORMAL
```

### 5. 分配员工（不改变状态的特殊操作）

`assign` 操作不在 `allowedTransitions` 中定义，因为它**不改变工单状态**：

```
任何状态 + assign → 同一状态（仅更新 assignedToUserId 字段）
```

| 操作 | 输入 | 说明 |
|------|------|------|
| `assign` | userId（必填，目标员工 ID） | 仅 OWNER 可操作。验证目标用户是 STAFF 角色。记录 ASSIGN 事件（fromStatus === toStatus） |

### 6. 字段编辑（不改变状态的 PATCH 操作）

`PATCH /work-orders/:id` 用于编辑工单基本信息，**不触发状态流转**：

- 逐字段检查 `canEditField(status, field, role)`
- 只更新通过检查的字段
- 不记录事件（不是状态操作）

### 7. 公开确认链接流程（无需登录）

这是一个独立的确认通道，让没有账号的客户也能确认收货：

```
1. 店主调 POST /public/confirm/request-token（需工单处于 SHIPPED 状态）
2. 系统生成 32 字节随机 token，7 天有效，一次性使用
3. 返回确认链接：{FRONTEND_URL}/confirm/{token}
4. 店主把链接发给客户（微信/短信等）
5. 客户打开链接 → GET /public/confirm/:token（无需登录，查看工单信息）
6. 客户提交确认 → POST /public/confirm/:token（无需登录）
```

**公开确认的特殊处理**（`public-confirm.service.ts`）：
- 不走 `canPerformAction()` 权限校验（因为没有登录用户）
- 事件记录的 `actorUserId` 使用工单的 `customerUserId`
- 事件 `metadataJson` 会标记 `viaToken: true` 以区分来源
- token 使用后标记 `usedAt`，不可重复使用
- 删除旧 token 再创建新 token（同一工单只有一个有效 token）

**公开确认的分支逻辑**（与登录确认完全一致）：

| 输入组合 | 结果 |
|---------|------|
| `delivered=true, satisfied=true`（从 SHIPPED） | → DELIVERED |
| `delivered=true, satisfied=true`（从 DELIVERED） | → COMPLETED |
| `delivered=false` 或 `satisfied=false` | → REOPENED |

### 8. 每个操作的副作用总结

每个操作除了改变状态，还会写入不同的数据库记录：

| 操作 | 状态变化 | 额外写入 |
|------|---------|---------|
| 创建工单 | → SUBMITTED | WorkOrder + WorkOrderEvent(SUBMIT) |
| `verify` | → OWNER_VERIFIED | 更新 inboundTrackingNo + Event |
| `reportExternalDamage` | → EXTERNAL_DAMAGE_REPORTED | 追加 notes + 可选关联附件 + Event |
| `recordDevice` | → DEVICE_INFO_RECORDED | 创建 Device（含自动 labelCode）+ Event |
| `diagnose` | → DIAGNOSED | 创建 Inspection + Event |
| `repair` | → REPAIRING | 创建 Repair + Event |
| `storeIn` | → STORED_IN | 创建 InventoryTxn(IN) + Event |
| `readyToShip` | → READY_TO_SHIP | Event |
| `ship` | → SHIPPED | 创建 InventoryTxn(OUT) + 更新 outboundTrackingNo + Event |
| `customerConfirm` | → DELIVERED/COMPLETED/REOPENED | 追加 notes + 可选关联附件 + Event |
| `reopen` | → REOPENED | 追加 notes + Event |
| `closeAbnormal` | → CLOSED_ABNORMAL | 追加 notes + Event |
| `assign` | 状态不变 | 更新 assignedToUserId + Event |

> 所有操作都在 `prisma.$transaction()` 中执行，保证操作和事件记录的原子性。

### 9. 终态说明

| 终态 | 如何到达 | 能否继续操作 |
|------|---------|-------------|
| `COMPLETED` | DELIVERED → customerConfirm(satisfied=true) | **不能**。`allowedTransitions[COMPLETED] = {}`，没有任何可执行的操作 |
| `CLOSED_ABNORMAL` | 任何非终态 → closeAbnormal | **不能**。`allowedTransitions[CLOSED_ABNORMAL] = {}`，没有任何可执行的操作 |

如果工单已完成但客户后续又有问题，只能创建新工单。

### 10. 状态流转完整速查表

| 当前状态 | 可执行的操作 → 目标状态 |
|---------|----------------------|
| **SUBMITTED** | `verify` → OWNER_VERIFIED · `closeAbnormal` → CLOSED_ABNORMAL |
| **OWNER_VERIFIED** | `reportExternalDamage` → EXTERNAL_DAMAGE_REPORTED · `recordDevice` → DEVICE_INFO_RECORDED · `closeAbnormal` → CLOSED_ABNORMAL |
| **EXTERNAL_DAMAGE_REPORTED** | `ship` → SHIPPED · `closeAbnormal` → CLOSED_ABNORMAL |
| **DEVICE_INFO_RECORDED** | `diagnose` → DIAGNOSED · `closeAbnormal` → CLOSED_ABNORMAL |
| **DIAGNOSED** | `repair` → REPAIRING · `storeIn` → STORED_IN · `closeAbnormal` → CLOSED_ABNORMAL |
| **REPAIRING** | `storeIn` → STORED_IN · `closeAbnormal` → CLOSED_ABNORMAL |
| **STORED_IN** | `readyToShip` → READY_TO_SHIP · `closeAbnormal` → CLOSED_ABNORMAL |
| **READY_TO_SHIP** | `ship` → SHIPPED · `closeAbnormal` → CLOSED_ABNORMAL |
| **SHIPPED** | `customerConfirm` → DELIVERED · `reopen` → REOPENED |
| **DELIVERED** | `customerConfirm` → COMPLETED · `reopen` → REOPENED |
| **COMPLETED** | （无，终态） |
| **REOPENED** | `verify` → OWNER_VERIFIED · `closeAbnormal` → CLOSED_ABNORMAL |
| **CLOSED_ABNORMAL** | （无，终态） |

> **注意**：SHIPPED 和 DELIVERED 状态下不能 `closeAbnormal`（快递已发出不可逆）。此外，`customerConfirm` 在 `delivered=false` 或 `satisfied=false` 时实际执行的是 REOPEN 逻辑。

---

## 六、常见改动指南

### 加一个新的 API 字段

1. `prisma/schema.prisma` — 加字段
2. `pnpm db:migrate:dev` — 生成迁移
3. `packages/shared/src/schemas.ts` — 加到对应的 Zod schema
4. 后端 Service — 处理新字段
5. 前端 `types.ts` — 加 TypeScript 类型
6. 前端 section 组件 — 加表单项

### 改权限（谁能做什么）

只改一个文件：`packages/shared/src/stateMachine.ts` 的 `actionPermissions`。

### 改工单流程（状态怎么流转）

只改一个文件：`packages/shared/src/stateMachine.ts` 的 `allowedTransitions`。

### 加一个新页面

1. `apps/web/src/app/` 下按 Next.js App Router 规则建目录
2. 需要登录保护？放在 `(dashboard)/` 下
3. 不需要登录？放在外面，Controller 路由加 `@SetMetadata('isPublic', true)`

### 改 UI 样式

- 全局颜色：`apps/web/src/app/globals.css` 的 CSS 变量
- Tailwind 配置：`apps/web/tailwind.config.ts`
- 状态颜色/标签：`apps/web/src/lib/constants.ts`

---

## 七、测试

```bash
# 前提：测试数据库运行中
docker compose up -d postgres

# 跑 E2E 测试
pnpm test:e2e
```

测试文件在 `apps/api/test/app.e2e-spec.ts`，覆盖了完整工单流程和权限校验。
