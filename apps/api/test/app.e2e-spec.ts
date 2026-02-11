import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, WorkOrderStatus } from '@repo/shared';

describe('Work Order System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let staffToken: string;
  let customerToken: string;

  let ownerId: string;
  let staffId: string;
  let customerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = app.get(PrismaService);
    await app.init();

    // Clean and seed test database
    await prisma.cleanDatabase();

    const passwordHash = await bcrypt.hash('password123', 10);

    const owner = await prisma.user.create({
      data: {
        email: 'owner-test@example.com',
        passwordHash,
        role: Role.OWNER,
        name: 'Test Owner',
      },
    });
    ownerId = owner.id;

    const staff = await prisma.user.create({
      data: {
        email: 'staff-test@example.com',
        passwordHash,
        role: Role.STAFF,
        name: 'Test Staff',
      },
    });
    staffId = staff.id;

    const customer = await prisma.user.create({
      data: {
        email: 'customer-test@example.com',
        passwordHash,
        role: Role.CUSTOMER,
        name: 'Test Customer',
      },
    });
    customerId = customer.id;

    // Login and get tokens
    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'owner-test@example.com', password: 'password123' });
    ownerToken = ownerLogin.body.data.accessToken;

    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'staff-test@example.com', password: 'password123' });
    staffToken = staffLogin.body.data.accessToken;

    const customerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'customer-test@example.com', password: 'password123' });
    customerToken = customerLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('Test 1: OWNER creates work order -> verify -> assign', () => {
    let workOrderId: string;

    it('OWNER creates a work order for customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          customerUserId: customerId,
          customerName: 'Test Customer',
          customerPhone: '+1234567890',
          notes: 'Test work order for e2e',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe(WorkOrderStatus.SUBMITTED);
      expect(response.body.data.customerUserId).toBe(customerId);
      workOrderId = response.body.data.id;
    });

    it('OWNER verifies the work order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/verify`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inboundTrackingNo: 'TRACK-TEST-001' })
        .expect(201);

      expect(response.body.data.status).toBe(WorkOrderStatus.OWNER_VERIFIED);
      expect(response.body.data.inboundTrackingNo).toBe('TRACK-TEST-001');
    });

    it('OWNER assigns work order to staff', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: staffId })
        .expect(201);

      expect(response.body.data.assignedToUserId).toBe(staffId);
    });

    it('STAFF cannot verify (not their permission)', async () => {
      // Create another work order to test
      const createRes = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerUserId: customerId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/work-orders/${createRes.body.data.id}/actions/verify`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ inboundTrackingNo: 'TRACK-TEST-FAIL' })
        .expect(403);
    });
  });

  describe('Test 2: STAFF record-device -> diagnose -> store-in', () => {
    let workOrderId: string;

    beforeAll(async () => {
      // Create and prepare work order
      const createRes = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerUserId: customerId, notes: 'Staff flow test' });
      workOrderId = createRes.body.data.id;

      // Verify
      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/verify`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inboundTrackingNo: 'TRACK-STAFF-001' });

      // Assign to staff
      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: staffId });
    });

    it('STAFF records device info', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/record-device`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          brand: 'Apple',
          model: 'iPhone 15 Pro',
          imei: '123456789012345',
          conditionNotes: 'Minor scratches',
        })
        .expect(201);

      expect(response.body.data.status).toBe(WorkOrderStatus.DEVICE_INFO_RECORDED);
      expect(response.body.data.device).toBeDefined();
      expect(response.body.data.device.brand).toBe('Apple');
      expect(response.body.data.device.labelCode).toMatch(/^LBL-/);
    });

    it('STAFF diagnoses the device', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/diagnose`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          result: 'ABNORMAL',
          checklistJson: {
            battery: 'degraded',
            screen: 'normal',
            camera: 'normal',
          },
          notes: 'Battery needs replacement',
        })
        .expect(201);

      expect(response.body.data.status).toBe(WorkOrderStatus.DIAGNOSED);
      expect(response.body.data.inspections.length).toBeGreaterThan(0);
    });

    it('STAFF stores device in inventory (skipping repair for normal flow)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/store-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          location: 'Shelf B-2',
          notes: 'Stored after diagnosis',
        })
        .expect(201);

      expect(response.body.data.status).toBe(WorkOrderStatus.STORED_IN);
      expect(response.body.data.inventoryTxn.length).toBeGreaterThan(0);
      expect(response.body.data.inventoryTxn[0].type).toBe('IN');
    });
  });

  describe('Test 3: Full flow -> ship -> customer confirm -> completed', () => {
    let workOrderId: string;
    let confirmToken: string;

    beforeAll(async () => {
      // Create and run through all steps
      const createRes = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerUserId: customerId, notes: 'Full flow test' });
      workOrderId = createRes.body.data.id;

      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/verify`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ inboundTrackingNo: 'TRACK-FULL-001' });

      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/assign`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: staffId });

      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/record-device`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ brand: 'Samsung', model: 'Galaxy S24' });

      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/diagnose`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ result: 'NORMAL', notes: 'All good' });

      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/store-in`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ location: 'Shelf C-1' });

      await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/ready-to-ship`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});
    });

    it('OWNER ships the work order', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/ship`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ outboundTrackingNo: 'TRACK-OUT-FULL-001' })
        .expect(201);

      expect(response.body.data.status).toBe(WorkOrderStatus.SHIPPED);
      expect(response.body.data.outboundTrackingNo).toBe('TRACK-OUT-FULL-001');
    });

    it('OWNER generates customer confirmation token', async () => {
      const response = await request(app.getHttpServer())
        .post('/public/confirm/request-token')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ workOrderId })
        .expect(201);

      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.url).toContain('/confirm/');
      confirmToken = response.body.data.token;
    });

    it('Customer confirms via public token (satisfied)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/public/confirm/${confirmToken}`)
        .send({
          delivered: true,
          satisfied: true,
          reason: 'Great service!',
        })
        .expect(201);

      expect(response.body.data.success).toBe(true);
      expect(response.body.data.status).toBe(WorkOrderStatus.DELIVERED);
    });

    it('Customer confirms again via logged-in endpoint to complete', async () => {
      const response = await request(app.getHttpServer())
        .post(`/work-orders/${workOrderId}/actions/customer-confirm`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          delivered: true,
          satisfied: true,
        })
        .expect(201);

      expect(response.body.data.status).toBe(WorkOrderStatus.COMPLETED);
    });

    it('Work order events timeline is complete', async () => {
      const response = await request(app.getHttpServer())
        .get(`/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const events = response.body.data.events;
      expect(events.length).toBeGreaterThanOrEqual(8);

      const actions = events.map((e: any) => e.action);
      expect(actions).toContain('SUBMIT');
      expect(actions).toContain('VERIFY');
      expect(actions).toContain('RECORD_DEVICE');
      expect(actions).toContain('DIAGNOSE');
      expect(actions).toContain('STORE_IN');
      expect(actions).toContain('READY_TO_SHIP');
      expect(actions).toContain('SHIP');
      expect(actions).toContain('CUSTOMER_CONFIRM');
    });
  });

  describe('Permission checks', () => {
    it('CUSTOMER cannot access other customers work orders', async () => {
      // Create another customer
      const passwordHash = await bcrypt.hash('password123', 10);
      const otherCustomer = await prisma.user.create({
        data: {
          email: 'other-customer@example.com',
          passwordHash,
          role: Role.CUSTOMER,
          name: 'Other Customer',
        },
      });

      // Create work order for other customer
      const createRes = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerUserId: otherCustomer.id });

      // Try to access with original customer
      await request(app.getHttpServer())
        .get(`/work-orders/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('STAFF cannot access unassigned work orders', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/work-orders')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerUserId: customerId });

      await request(app.getHttpServer())
        .get(`/work-orders/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });
  });
});
