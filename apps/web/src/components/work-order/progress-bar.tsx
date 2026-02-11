'use client';

import { WorkOrderStatus } from '@repo/shared';
import { PROGRESS_STEPS, STATUS_PROGRESS_INDEX, STATUS_LABELS_ZH } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  status: WorkOrderStatus;
}

export function ProgressBar({ status }: ProgressBarProps) {
  const currentIndex = STATUS_PROGRESS_INDEX[status];

  // For abnormal statuses, show a banner instead
  if (status === WorkOrderStatus.CLOSED_ABNORMAL) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">
        {STATUS_LABELS_ZH[status]}
      </div>
    );
  }

  if (status === WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-center text-sm font-medium text-orange-700">
        {STATUS_LABELS_ZH[status]} — 等待处理
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[700px]">
        {PROGRESS_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={step.status} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium border-2 transition-colors',
                    isCompleted && 'border-green-500 bg-green-500 text-white',
                    isCurrent && 'border-blue-500 bg-blue-500 text-white',
                    isFuture && 'border-gray-300 bg-white text-gray-400',
                  )}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={cn(
                    'mt-1 text-xs text-center whitespace-nowrap',
                    isCompleted && 'text-green-600 font-medium',
                    isCurrent && 'text-blue-600 font-medium',
                    isFuture && 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < PROGRESS_STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-full min-w-[20px]',
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
