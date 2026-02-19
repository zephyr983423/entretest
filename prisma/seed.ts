import { PrismaClient, Role, WorkOrderStatus, RepairType, Urgency, WarrantyStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPhone(): string {
  return `1${pick(['3', '5', '7', '8', '9'])}${Array.from({ length: 9 }, () => randInt(0, 9)).join('')}`;
}

const BRANDS_MODELS: [string, string[]][] = [
  ['Apple', ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14 Pro', 'iPhone 14', 'iPhone 13', 'iPhone SE']],
  ['Samsung', ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S23', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy A54']],
  ['Xiaomi', ['14 Pro', '14', '13 Ultra', 'Redmi Note 13', 'Redmi K70']],
  ['Huawei', ['Mate 60 Pro', 'Mate 60', 'P60 Pro', 'Nova 12']],
  ['OPPO', ['Find X7 Ultra', 'Find X7', 'Reno 11 Pro', 'A2 Pro']],
  ['vivo', ['X100 Pro', 'X100', 'S18 Pro', 'Y100']],
];

const CUSTOMER_NAMES = [
  '张伟', '李娜', '王芳', '刘洋', '陈明', '杨丽', '赵军', '黄秀英', '周强', '吴敏',
];

const STAFF_NAMES = ['赵师傅', '孙师傅', '李师傅'];

const CITIES = ['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区', '成都市武侯区', '南京市玄武区', '武汉市洪山区'];

const STREETS = ['建国路', '世纪大道', '天府大道', '中山路', '解放路', '人民路', '和平路'];

const REPAIR_TYPES = Object.values(RepairType);
const URGENCIES = Object.values(Urgency);
const WARRANTIES = Object.values(WarrantyStatus);

// Status distribution: target 100 work orders
const STATUS_DISTRIBUTION: [WorkOrderStatus, number][] = [
  [WorkOrderStatus.DRAFT, 1],
  [WorkOrderStatus.SUBMITTED, 8],
  [WorkOrderStatus.OWNER_VERIFIED, 8],
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED, 5],
  [WorkOrderStatus.DEVICE_INFO_RECORDED, 8],
  [WorkOrderStatus.DIAGNOSED, 8],
  [WorkOrderStatus.REPAIRING, 8],
  [WorkOrderStatus.STORED_IN, 8],
  [WorkOrderStatus.READY_TO_SHIP, 8],
  [WorkOrderStatus.SHIPPED, 10],
  [WorkOrderStatus.DELIVERED, 8],
  [WorkOrderStatus.COMPLETED, 8],
  [WorkOrderStatus.REOPENED, 5],
  [WorkOrderStatus.CLOSED_ABNORMAL, 5],
];

// Event chains for each target status
function getEventChain(targetStatus: WorkOrderStatus): Array<{
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  action: string;
  actorType: 'OWNER' | 'STAFF' | 'CUSTOMER';
}> {
  const chains: Record<string, Array<{ from: WorkOrderStatus; to: WorkOrderStatus; action: string; actorType: 'OWNER' | 'STAFF' | 'CUSTOMER' }>> = {
    DRAFT: [],
    SUBMITTED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
    ],
    OWNER_VERIFIED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
    ],
    EXTERNAL_DAMAGE_REPORTED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED, action: 'REPORT_EXTERNAL_DAMAGE', actorType: 'STAFF' },
    ],
    DEVICE_INFO_RECORDED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
    ],
    DIAGNOSED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
    ],
    REPAIRING: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
    ],
    STORED_IN: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
      { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actorType: 'STAFF' },
    ],
    READY_TO_SHIP: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
      { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actorType: 'STAFF' },
      { from: WorkOrderStatus.STORED_IN, to: WorkOrderStatus.READY_TO_SHIP, action: 'READY_TO_SHIP', actorType: 'OWNER' },
    ],
    SHIPPED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
      { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actorType: 'STAFF' },
      { from: WorkOrderStatus.STORED_IN, to: WorkOrderStatus.READY_TO_SHIP, action: 'READY_TO_SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.READY_TO_SHIP, to: WorkOrderStatus.SHIPPED, action: 'SHIP', actorType: 'OWNER' },
    ],
    DELIVERED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
      { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actorType: 'STAFF' },
      { from: WorkOrderStatus.STORED_IN, to: WorkOrderStatus.READY_TO_SHIP, action: 'READY_TO_SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.READY_TO_SHIP, to: WorkOrderStatus.SHIPPED, action: 'SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.SHIPPED, to: WorkOrderStatus.DELIVERED, action: 'CUSTOMER_CONFIRM', actorType: 'CUSTOMER' },
    ],
    COMPLETED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
      { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actorType: 'STAFF' },
      { from: WorkOrderStatus.STORED_IN, to: WorkOrderStatus.READY_TO_SHIP, action: 'READY_TO_SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.READY_TO_SHIP, to: WorkOrderStatus.SHIPPED, action: 'SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.SHIPPED, to: WorkOrderStatus.DELIVERED, action: 'CUSTOMER_CONFIRM', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.DELIVERED, to: WorkOrderStatus.COMPLETED, action: 'CUSTOMER_CONFIRM', actorType: 'CUSTOMER' },
    ],
    REOPENED: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actorType: 'OWNER' },
      { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actorType: 'STAFF' },
      { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actorType: 'STAFF' },
      { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actorType: 'STAFF' },
      { from: WorkOrderStatus.STORED_IN, to: WorkOrderStatus.READY_TO_SHIP, action: 'READY_TO_SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.READY_TO_SHIP, to: WorkOrderStatus.SHIPPED, action: 'SHIP', actorType: 'OWNER' },
      { from: WorkOrderStatus.SHIPPED, to: WorkOrderStatus.REOPENED, action: 'REOPEN', actorType: 'CUSTOMER' },
    ],
    CLOSED_ABNORMAL: [
      { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actorType: 'CUSTOMER' },
      { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.CLOSED_ABNORMAL, action: 'CLOSE_ABNORMAL', actorType: 'OWNER' },
    ],
  };
  return chains[targetStatus] || [];
}

// Statuses that need a device
const NEEDS_DEVICE_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.DEVICE_INFO_RECORDED,
  WorkOrderStatus.DIAGNOSED,
  WorkOrderStatus.REPAIRING,
  WorkOrderStatus.STORED_IN,
  WorkOrderStatus.READY_TO_SHIP,
  WorkOrderStatus.SHIPPED,
  WorkOrderStatus.DELIVERED,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.REOPENED,
]);

// Statuses that need an inspection
const NEEDS_INSPECTION_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.DIAGNOSED,
  WorkOrderStatus.REPAIRING,
  WorkOrderStatus.STORED_IN,
  WorkOrderStatus.READY_TO_SHIP,
  WorkOrderStatus.SHIPPED,
  WorkOrderStatus.DELIVERED,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.REOPENED,
]);

// Statuses that need a repair record
const NEEDS_REPAIR_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.REPAIRING,
  WorkOrderStatus.STORED_IN,
  WorkOrderStatus.READY_TO_SHIP,
  WorkOrderStatus.SHIPPED,
  WorkOrderStatus.DELIVERED,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.REOPENED,
]);

// Statuses that need inventory txn (store in)
const NEEDS_STORE_IN_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.STORED_IN,
  WorkOrderStatus.READY_TO_SHIP,
  WorkOrderStatus.SHIPPED,
  WorkOrderStatus.DELIVERED,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.REOPENED,
]);

// Statuses that need outbound tracking
const NEEDS_SHIP_STATUSES = new Set<WorkOrderStatus>([
  WorkOrderStatus.SHIPPED,
  WorkOrderStatus.DELIVERED,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.REOPENED,
]);

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.workOrderEvent.deleteMany();
  await prisma.publicConfirmToken.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.inventoryTxn.deleteMany();
  await prisma.repair.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.device.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create users
  const owner = await prisma.user.create({
    data: { email: 'owner@example.com', passwordHash, role: Role.OWNER, name: '张老板' },
  });

  const staffUsers = [];
  for (let i = 0; i < 3; i++) {
    const s = await prisma.user.create({
      data: {
        email: `staff${i + 1}@example.com`,
        passwordHash,
        role: Role.STAFF,
        name: STAFF_NAMES[i],
      },
    });
    staffUsers.push(s);
  }

  const customerUsers = [];
  for (let i = 0; i < 10; i++) {
    const c = await prisma.user.create({
      data: {
        email: `customer${i + 1}@example.com`,
        passwordHash,
        role: Role.CUSTOMER,
        name: CUSTOMER_NAMES[i],
      },
    });
    customerUsers.push(c);
  }

  console.log(`Created ${1 + staffUsers.length + customerUsers.length} users`);

  // Generate 100 work orders
  let woIndex = 0;
  for (const [targetStatus, count] of STATUS_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      woIndex++;
      const customer = pick(customerUsers);
      const staff = pick(staffUsers);
      const [brand, models] = pick(BRANDS_MODELS);
      const model = pick(models);
      const orderNo = `WO-2025-${String(woIndex).padStart(3, '0')}`;

      const needsAssignment = ([
        WorkOrderStatus.OWNER_VERIFIED,
        WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED,
        WorkOrderStatus.DEVICE_INFO_RECORDED,
        WorkOrderStatus.DIAGNOSED,
        WorkOrderStatus.REPAIRING,
        WorkOrderStatus.STORED_IN,
        WorkOrderStatus.READY_TO_SHIP,
        WorkOrderStatus.SHIPPED,
        WorkOrderStatus.DELIVERED,
        WorkOrderStatus.COMPLETED,
        WorkOrderStatus.REOPENED,
      ] as WorkOrderStatus[]).includes(targetStatus);

      // Create device if needed
      let deviceId: string | undefined;
      if (NEEDS_DEVICE_STATUSES.has(targetStatus)) {
        const device = await prisma.device.create({
          data: {
            brand,
            model,
            imei: `${randInt(100000000000000, 999999999999999)}`,
            serialNo: `SN-${woIndex}-${randInt(1000, 9999)}`,
            conditionNotes: pick(['轻微划痕', '外壳完好', '边角磕碰', '屏幕裂纹', '正常使用痕迹']),
            labelCode: `LBL-${String(woIndex).padStart(3, '0')}-${randInt(1000, 9999)}`,
          },
        });
        deviceId = device.id;
      }

      const wo = await prisma.workOrder.create({
        data: {
          orderNo,
          status: targetStatus,
          customerUserId: customer.id,
          customerName: customer.name,
          customerPhone: randPhone(),
          customerAddress: `${pick(CITIES)}${pick(STREETS)}${randInt(1, 200)}号`,
          inboundTrackingNo: targetStatus !== WorkOrderStatus.SUBMITTED && targetStatus !== WorkOrderStatus.DRAFT
            ? `YT${randInt(1000000000, 9999999999)}`
            : undefined,
          outboundTrackingNo: NEEDS_SHIP_STATUSES.has(targetStatus)
            ? `SF${randInt(1000000000, 9999999999)}`
            : undefined,
          assignedToUserId: needsAssignment ? staff.id : undefined,
          deviceId,
          notes: pick([
            '屏幕碎裂需要更换', '电池鼓包', '充电口松动', '进水需检修',
            '摄像头模糊', '扬声器无声', '系统频繁死机', '按键失灵',
            '信号问题', '触屏不灵敏', null,
          ]),
          repairType: pick(REPAIR_TYPES),
          urgency: pick(URGENCIES),
          warrantyStatus: pick(WARRANTIES),
        },
      });

      // Create event chain
      const events = getEventChain(targetStatus);
      for (const evt of events) {
        const actorId =
          evt.actorType === 'OWNER' ? owner.id :
          evt.actorType === 'STAFF' ? staff.id : customer.id;
        await prisma.workOrderEvent.create({
          data: {
            workOrderId: wo.id,
            fromStatus: evt.from,
            toStatus: evt.to,
            action: evt.action,
            actorUserId: actorId,
            actorRole: evt.actorType as Role,
          },
        });
      }

      // Create inspection if needed
      if (NEEDS_INSPECTION_STATUSES.has(targetStatus)) {
        await prisma.inspection.create({
          data: {
            workOrderId: wo.id,
            result: pick(['NORMAL', 'ABNORMAL']),
            checklistJson: {
              battery: pick(['normal', 'degraded', 'swollen']),
              screen: pick(['normal', 'cracked', 'dead_pixels']),
              camera: pick(['normal', 'blurry', 'broken']),
              waterDamage: pick([true, false]),
            },
            notes: pick(['电池健康度72%', '屏幕需更换', '主板短路', '正常', '充电口氧化']),
            createdByUserId: staff.id,
          },
        });
      }

      // Create repair record if needed
      if (NEEDS_REPAIR_STATUSES.has(targetStatus)) {
        await prisma.repair.create({
          data: {
            workOrderId: wo.id,
            actionsJson: pick([
              ['更换屏幕', '屏幕校准'],
              ['更换电池'],
              ['主板维修', '芯片焊接'],
              ['清洗主板', '吹干处理'],
              ['更换充电口'],
            ]),
            cost: randInt(50, 2000),
            result: pick(['FIXED', 'FIXED', 'FIXED', 'UNFIXED']),
            notes: pick(['维修完成', '已更换原装配件', '第三方配件', null]),
            createdByUserId: staff.id,
          },
        });
      }

      // Create inventory txns if needed
      if (NEEDS_STORE_IN_STATUSES.has(targetStatus)) {
        await prisma.inventoryTxn.create({
          data: {
            workOrderId: wo.id,
            type: 'IN',
            location: `${pick(['A', 'B', 'C'])}-${randInt(1, 5)}-${randInt(1, 20)}`,
            notes: '维修后入库',
            createdByUserId: staff.id,
          },
        });
      }

      if (NEEDS_SHIP_STATUSES.has(targetStatus)) {
        await prisma.inventoryTxn.create({
          data: {
            workOrderId: wo.id,
            type: 'OUT',
            notes: '发货出库',
            createdByUserId: owner.id,
          },
        });
      }
    }
  }

  console.log(`Created ${woIndex} work orders`);
  console.log('\nSeeding completed!');
  console.log('\nLogin credentials:');
  console.log('  OWNER:    owner@example.com    / password123');
  console.log('  STAFF:    staff1@example.com   / password123');
  console.log('  CUSTOMER: customer1@example.com / password123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
