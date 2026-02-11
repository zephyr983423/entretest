import { PrismaClient, Role, WorkOrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@example.com',
      passwordHash,
      role: Role.OWNER,
      name: 'Owner Admin',
    },
  });
  console.log('✅ Created OWNER: owner@example.com / password123');

  const staff = await prisma.user.create({
    data: {
      email: 'staff@example.com',
      passwordHash,
      role: Role.STAFF,
      name: 'Staff Member',
    },
  });
  console.log('✅ Created STAFF: staff@example.com / password123');

  const customer = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      passwordHash,
      role: Role.CUSTOMER,
      name: 'Customer User',
    },
  });
  console.log('✅ Created CUSTOMER: customer@example.com / password123');

  // Create sample work orders at different stages

  // 1. SUBMITTED work order
  const wo1 = await prisma.workOrder.create({
    data: {
      orderNo: 'WO-2024-001',
      status: WorkOrderStatus.SUBMITTED,
      customerUserId: customer.id,
      customerName: 'Customer User',
      customerPhone: '+1234567890',
      customerAddress: '123 Main St, City',
      notes: 'iPhone screen replacement needed',
    },
  });

  await prisma.workOrderEvent.create({
    data: {
      workOrderId: wo1.id,
      fromStatus: WorkOrderStatus.DRAFT,
      toStatus: WorkOrderStatus.SUBMITTED,
      action: 'SUBMIT',
      actorUserId: customer.id,
      actorRole: Role.CUSTOMER,
      metadataJson: { note: 'Work order created by customer' },
    },
  });
  console.log('✅ Created work order WO-2024-001 (SUBMITTED)');

  // 2. DIAGNOSED work order
  const device2 = await prisma.device.create({
    data: {
      brand: 'Samsung',
      model: 'Galaxy S23',
      imei: '123456789012345',
      serialNo: 'SN-2024-002',
      conditionNotes: 'Minor scratches on back',
      labelCode: 'LBL-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
  });

  const wo2 = await prisma.workOrder.create({
    data: {
      orderNo: 'WO-2024-002',
      status: WorkOrderStatus.DIAGNOSED,
      customerUserId: customer.id,
      customerName: 'Customer User',
      customerPhone: '+1234567890',
      customerAddress: '456 Oak Ave, Town',
      inboundTrackingNo: 'TRACK-IN-002',
      assignedToUserId: staff.id,
      deviceId: device2.id,
      notes: 'Battery drain issue',
    },
  });

  // Create events for WO2
  const wo2Events = [
    { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actor: customer.id, role: Role.CUSTOMER },
    { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actor: owner.id, role: Role.OWNER },
    { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actor: staff.id, role: Role.STAFF },
    { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actor: staff.id, role: Role.STAFF },
  ];

  for (const evt of wo2Events) {
    await prisma.workOrderEvent.create({
      data: {
        workOrderId: wo2.id,
        fromStatus: evt.from,
        toStatus: evt.to,
        action: evt.action,
        actorUserId: evt.actor,
        actorRole: evt.role,
      },
    });
  }

  await prisma.inspection.create({
    data: {
      workOrderId: wo2.id,
      result: 'ABNORMAL',
      checklistJson: {
        battery: 'degraded',
        screen: 'normal',
        camera: 'normal',
        waterDamage: false,
      },
      notes: 'Battery health at 72%',
      createdByUserId: staff.id,
    },
  });
  console.log('✅ Created work order WO-2024-002 (DIAGNOSED)');

  // 3. SHIPPED work order
  const device3 = await prisma.device.create({
    data: {
      brand: 'Apple',
      model: 'iPhone 14 Pro',
      imei: '987654321098765',
      serialNo: 'SN-2024-003',
      conditionNotes: 'Good condition after repair',
      labelCode: 'LBL-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
  });

  const wo3 = await prisma.workOrder.create({
    data: {
      orderNo: 'WO-2024-003',
      status: WorkOrderStatus.SHIPPED,
      customerUserId: customer.id,
      customerName: 'Customer User',
      customerPhone: '+1234567890',
      customerAddress: '789 Pine Rd, Village',
      inboundTrackingNo: 'TRACK-IN-003',
      outboundTrackingNo: 'TRACK-OUT-003',
      assignedToUserId: staff.id,
      deviceId: device3.id,
      notes: 'Screen replacement completed',
    },
  });

  // Create events for WO3
  const wo3Events = [
    { from: WorkOrderStatus.DRAFT, to: WorkOrderStatus.SUBMITTED, action: 'SUBMIT', actor: customer.id, role: Role.CUSTOMER },
    { from: WorkOrderStatus.SUBMITTED, to: WorkOrderStatus.OWNER_VERIFIED, action: 'VERIFY', actor: owner.id, role: Role.OWNER },
    { from: WorkOrderStatus.OWNER_VERIFIED, to: WorkOrderStatus.DEVICE_INFO_RECORDED, action: 'RECORD_DEVICE', actor: staff.id, role: Role.STAFF },
    { from: WorkOrderStatus.DEVICE_INFO_RECORDED, to: WorkOrderStatus.DIAGNOSED, action: 'DIAGNOSE', actor: staff.id, role: Role.STAFF },
    { from: WorkOrderStatus.DIAGNOSED, to: WorkOrderStatus.REPAIRING, action: 'REPAIR', actor: staff.id, role: Role.STAFF },
    { from: WorkOrderStatus.REPAIRING, to: WorkOrderStatus.STORED_IN, action: 'STORE_IN', actor: staff.id, role: Role.STAFF },
    { from: WorkOrderStatus.STORED_IN, to: WorkOrderStatus.READY_TO_SHIP, action: 'READY_TO_SHIP', actor: owner.id, role: Role.OWNER },
    { from: WorkOrderStatus.READY_TO_SHIP, to: WorkOrderStatus.SHIPPED, action: 'SHIP', actor: owner.id, role: Role.OWNER },
  ];

  for (const evt of wo3Events) {
    await prisma.workOrderEvent.create({
      data: {
        workOrderId: wo3.id,
        fromStatus: evt.from,
        toStatus: evt.to,
        action: evt.action,
        actorUserId: evt.actor,
        actorRole: evt.role,
      },
    });
  }

  await prisma.inspection.create({
    data: {
      workOrderId: wo3.id,
      result: 'ABNORMAL',
      checklistJson: {
        battery: 'normal',
        screen: 'cracked',
        camera: 'normal',
        waterDamage: false,
      },
      notes: 'Screen needs replacement',
      createdByUserId: staff.id,
    },
  });

  await prisma.repair.create({
    data: {
      workOrderId: wo3.id,
      actionsJson: ['Screen replacement', 'Screen calibration'],
      cost: 199.99,
      result: 'FIXED',
      notes: 'Original Apple screen installed',
      createdByUserId: staff.id,
    },
  });

  await prisma.inventoryTxn.create({
    data: {
      workOrderId: wo3.id,
      type: 'IN',
      location: 'Shelf A-1',
      notes: 'Stored after repair',
      createdByUserId: staff.id,
    },
  });

  await prisma.inventoryTxn.create({
    data: {
      workOrderId: wo3.id,
      type: 'OUT',
      location: 'Shelf A-1',
      notes: 'Shipped to customer',
      createdByUserId: owner.id,
    },
  });

  console.log('✅ Created work order WO-2024-003 (SHIPPED)');

  console.log('\n🎉 Seeding completed successfully!\n');
  console.log('Login credentials:');
  console.log('  OWNER:    owner@example.com    / password123');
  console.log('  STAFF:    staff@example.com    / password123');
  console.log('  CUSTOMER: customer@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
