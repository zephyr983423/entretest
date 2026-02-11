'use client';

import { WorkOrderStatus, Role, editableFieldsByStatus } from '@repo/shared';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from './progress-bar';
import { SectionBasicInfo } from './section-basic-info';
import { SectionAssign } from './section-assign';
import { SectionVerify } from './section-verify';
import { SectionExternalDamage } from './section-external-damage';
import { SectionRecordDevice } from './section-record-device';
import { SectionDiagnose } from './section-diagnose';
import { SectionRepair } from './section-repair';
import { SectionStoreIn } from './section-store-in';
import { SectionReadyToShip } from './section-ready-to-ship';
import { SectionShip } from './section-ship';
import { SectionCustomerConfirm } from './section-customer-confirm';
import { SectionReopen } from './section-reopen';
import { SectionCloseAbnormal } from './section-close-abnormal';
import { EventTimeline } from './event-timeline';
import type { WorkOrderDetail } from './types';

interface WorkOrderFormProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function WorkOrderForm({ workOrder, onUpdated }: WorkOrderFormProps) {
  const { user } = useAuth();

  // Compute editable fields for basic info section
  const status = workOrder.status as WorkOrderStatus;
  const userRole = (user?.role || 'CUSTOMER') as Role;
  const editConfig = editableFieldsByStatus[status];
  const editableFields =
    editConfig && editConfig.roles?.includes(userRole) ? editConfig.allowed : [];

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar status={status} />

      {/* Main content in 2-column grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: Basic info + workflow sections */}
        <div className="space-y-4">
          <SectionBasicInfo
            workOrder={workOrder}
            editableFields={editableFields}
            onUpdated={onUpdated}
          />
          <SectionAssign workOrder={workOrder} onUpdated={onUpdated} />
          <SectionVerify workOrder={workOrder} onUpdated={onUpdated} />
          <SectionExternalDamage workOrder={workOrder} onUpdated={onUpdated} />
          <SectionRecordDevice workOrder={workOrder} onUpdated={onUpdated} />
        </div>

        {/* Right column: More workflow sections */}
        <div className="space-y-4">
          <SectionDiagnose workOrder={workOrder} onUpdated={onUpdated} />
          <SectionRepair workOrder={workOrder} onUpdated={onUpdated} />
          <SectionStoreIn workOrder={workOrder} onUpdated={onUpdated} />
          <SectionReadyToShip workOrder={workOrder} onUpdated={onUpdated} />
          <SectionShip workOrder={workOrder} onUpdated={onUpdated} />
          <SectionCustomerConfirm workOrder={workOrder} onUpdated={onUpdated} />
          <SectionReopen workOrder={workOrder} onUpdated={onUpdated} />
          <SectionCloseAbnormal workOrder={workOrder} onUpdated={onUpdated} />
        </div>
      </div>

      {/* Event Timeline - full width */}
      {workOrder.events.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">操作历史</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTimeline events={workOrder.events} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
