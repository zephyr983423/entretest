import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  assignWorkOrderSchema,
  verifyActionSchema,
  recordDeviceSchema,
  diagnoseSchema,
  repairSchema,
  storeInSchema,
  shipSchema,
  closeAbnormalSchema,
  reopenSchema,
  customerConfirmSchema,
  reportExternalDamageSchema,
  workOrderQuerySchema,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  AssignWorkOrderInput,
  VerifyActionInput,
  RecordDeviceInput,
  DiagnoseInput,
  RepairInput,
  StoreInInput,
  ShipInput,
  CloseAbnormalInput,
  ReopenInput,
  CustomerConfirmInput,
  ReportExternalDamageInput,
  WorkOrderQueryInput,
} from '@repo/shared';

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query(new ZodValidationPipe(workOrderQuerySchema)) query: WorkOrderQueryInput,
  ) {
    const result = await this.workOrdersService.findAll(req.user, query);
    return { data: result, error: null };
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const result = await this.workOrdersService.findOne(id, req.user);
    return { data: result, error: null };
  }

  @Post()
  async create(
    @Request() req: any,
    @Body(new ZodValidationPipe(createWorkOrderSchema)) input: CreateWorkOrderInput,
  ) {
    const result = await this.workOrdersService.create(req.user, input);
    return { data: result, error: null };
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkOrderSchema)) input: UpdateWorkOrderInput,
  ) {
    const result = await this.workOrdersService.update(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/assign')
  async assign(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignWorkOrderSchema)) input: AssignWorkOrderInput,
  ) {
    const result = await this.workOrdersService.assign(id, req.user, input.userId);
    return { data: result, error: null };
  }

  @Post(':id/actions/verify')
  async verify(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(verifyActionSchema)) input: VerifyActionInput,
  ) {
    const result = await this.workOrdersService.verify(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/report-external-damage')
  async reportExternalDamage(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reportExternalDamageSchema)) input: ReportExternalDamageInput,
  ) {
    const result = await this.workOrdersService.reportExternalDamage(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/record-device')
  async recordDevice(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(recordDeviceSchema)) input: RecordDeviceInput,
  ) {
    const result = await this.workOrdersService.recordDevice(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/diagnose')
  async diagnose(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(diagnoseSchema)) input: DiagnoseInput,
  ) {
    const result = await this.workOrdersService.diagnose(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/repair')
  async repair(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(repairSchema)) input: RepairInput,
  ) {
    const result = await this.workOrdersService.repair(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/store-in')
  async storeIn(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(storeInSchema)) input: StoreInInput,
  ) {
    const result = await this.workOrdersService.storeIn(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/ready-to-ship')
  async readyToShip(@Request() req: any, @Param('id') id: string) {
    const result = await this.workOrdersService.readyToShip(id, req.user);
    return { data: result, error: null };
  }

  @Post(':id/actions/ship')
  async ship(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(shipSchema)) input: ShipInput,
  ) {
    const result = await this.workOrdersService.ship(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/close-abnormal')
  async closeAbnormal(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(closeAbnormalSchema)) input: CloseAbnormalInput,
  ) {
    const result = await this.workOrdersService.closeAbnormal(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/reopen')
  async reopen(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reopenSchema)) input: ReopenInput,
  ) {
    const result = await this.workOrdersService.reopen(id, req.user, input);
    return { data: result, error: null };
  }

  @Post(':id/actions/customer-confirm')
  async customerConfirm(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(customerConfirmSchema)) input: CustomerConfirmInput,
  ) {
    const result = await this.workOrdersService.customerConfirm(id, req.user, input);
    return { data: result, error: null };
  }
}
