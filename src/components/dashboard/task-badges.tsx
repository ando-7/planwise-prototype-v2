import { cn } from '@/lib/utils'
import { STATUS_LABELS, type TaskStatus } from '@/lib/tasks'

const statusStyles: Record<TaskStatus, string> = {
  offen: 'bg-muted text-muted-foreground',
  'in-bearbeitung': 'bg-status-progress/15 text-status-progress',
  erledigt: 'bg-status-done/15 text-status-done',
}

const dotStyles: Record<TaskStatus, string> = {
  offen: 'bg-muted-foreground',
  'in-bearbeitung': 'bg-status-progress',
  erledigt: 'bg-status-done',
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        statusStyles[status],
      )}
    >
      <span className={cn('size-1.5 rounded-full', dotStyles[status])} aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}

/** Fortschrittsbalken mit Prozentangabe (FA-FTU-1). */
export function ProgressBar({ value, size = 'sm', className }: { value: number; size?: 'sm' | 'lg'; className?: string }) {
  const done = value >= 100
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={`${value} % abgeschlossen`}
        className={cn('relative w-full min-w-12 overflow-hidden rounded-full bg-muted', size === 'lg' ? 'h-2.5' : 'h-1.5')}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', done ? 'bg-status-done' : 'bg-primary')}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          'shrink-0 text-right tabular-nums text-foreground',
          size === 'lg' ? 'w-12 text-sm font-semibold' : 'w-9 text-xs font-medium',
        )}
        aria-hidden="true"
      >
        {value} %
      </span>
    </div>
  )
}

/** KR-2: Planeintrag wurde nach Entfernen eines Mitwirkenden der verantwortlichen Person zugeordnet. */
export function ReassignBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-status-reassign/15 px-2 py-0.5 text-[0.7rem] font-medium text-status-reassign',
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-status-reassign" aria-hidden="true" />
      neu zuzuweisen
    </span>
  )
}
