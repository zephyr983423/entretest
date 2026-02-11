'use client';

import { WorkOrderStatus } from '@repo/shared';
import { STATUS_LABELS_ZH, ACTION_LABELS_ZH } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { WorkOrderEvent } from './types';

interface EventTimelineProps {
  events: WorkOrderEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-start gap-3 border-b pb-3 last:border-0"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
            {event.actor?.name?.charAt(0) || '系'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {ACTION_LABELS_ZH[event.action as keyof typeof ACTION_LABELS_ZH] || event.action}
              </Badge>
              <span className="text-sm text-gray-600">
                {STATUS_LABELS_ZH[event.fromStatus as WorkOrderStatus] || event.fromStatus}
                {' → '}
                {STATUS_LABELS_ZH[event.toStatus as WorkOrderStatus] || event.toStatus}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
              <span>{event.actor?.name || '系统'}</span>
              {event.actorRole && <span>({event.actorRole})</span>}
              <span>·</span>
              <span>{new Date(event.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {event.metadataJson && Object.keys(event.metadataJson).length > 0 && (
              <div className="mt-1 text-xs text-gray-400">
                {Object.entries(event.metadataJson).map(([k, v]) => (
                  <span key={k} className="mr-2">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
