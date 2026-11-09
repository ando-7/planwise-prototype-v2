import { useState } from 'react'
import { Clock, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/components/planner/planner-provider'
import { PersonAvatar } from '@/components/planner/person-avatar'
import { PlanEntryDialog, type PlanDraft } from '@/components/planning/plan-entry-dialog'
import { weekStart } from '@/lib/planning'
import { formatDate, formatHours, isAssigned, isOwner, sumHours, todayIso, type Task } from '@/lib/tasks'
import { BookingDialog } from './booking-dialog'
import { ReassignBadge } from './task-badges'

function itemsOf(task: Task) {
  return [
    { subtaskId: undefined as string | undefined, title: 'Hauptaufgabe', item: task },
    ...task.subtasks.map((subtask) => ({ subtaskId: subtask.id as string | undefined, title: subtask.title, item: subtask })),
  ]
}

/** Historie aller Buchungen einer Aufgabe inkl. Subaufgaben (FA-ZM-1, KR-2). */
export function BookingHistory({ task }: { task: Task }) {
  const { currentUser, personName } = usePlanner()
  const rows = itemsOf(task)
    .flatMap(({ title, item }) => item.bookings.map((booking) => ({ ...booking, itemTitle: title })))
    .sort((a, b) => b.date.localeCompare(a.date))
  const total = sumHours(rows)
  const canBook = isAssigned(task, currentUser.id)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{formatHours(total)}</span> gebucht ·{' '}
          <span className="tabular-nums">{formatHours(task.duration)}</span> Bearbeitungsdauer
        </p>
        {canBook ? (
          <BookingDialog
            trigger={<Button variant="outline" size="sm" />}
            target={{ taskId: task.id }}
            itemTitle={task.title}
            dueDate={task.dueDate}
          >
            <Clock aria-hidden="true" />
            Zeit buchen
          </BookingDialog>
        ) : (
          <p className="text-xs text-muted-foreground">Du bist dieser Aufgabe nicht zugewiesen und kannst keine Zeit buchen.</p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Noch keine Zeiten gebucht.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Wann</th>
                <th className="px-3 py-2 font-medium">Wer</th>
                <th className="px-3 py-2 font-medium">Bereich</th>
                <th className="px-3 py-2 text-right font-medium">Stunden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const stillAssigned = isAssigned(task, row.personId)
                return (
                  <tr key={row.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      <time dateTime={row.date}>{formatDate(row.date)}</time>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <PersonAvatar name={personName(row.personId)} size="xs" />
                        <span className="text-foreground">{personName(row.personId)}</span>
                      </span>
                      {!stillAssigned && <span className="mt-0.5 block text-xs text-muted-foreground">nicht mehr mitwirkend</span>}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {row.itemTitle}
                      {row.note && <span className="mt-0.5 block text-xs text-muted-foreground">{row.note}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-foreground">
                      {formatHours(row.hours)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Geplante Zeiten einer Aufgabe inkl. Subaufgaben; markierte Einträge nach KR-2. */
export function PlanList({ task }: { task: Task }) {
  const { currentUser, personName } = usePlanner()
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const rows = itemsOf(task)
    .flatMap(({ subtaskId, title, item }) => item.plans.map((plan) => ({ ...plan, subtaskId, itemTitle: title })))
    .sort((a, b) => a.date.localeCompare(b.date))
  const total = sumHours(rows)
  const me = currentUser.id
  const canPlan = isAssigned(task, me)
  const flagged = rows.filter((row) => row.needsReassignment).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{formatHours(total)}</span> geplant
          {flagged > 0 && <span className="text-status-reassign">{` · ${flagged} neu zuzuweisen`}</span>}
        </p>
        {canPlan && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = todayIso()
              const day = new Date(`${today}T00:00:00Z`).getUTCDay()
              setDraft({ taskId: task.id, personId: me, date: day === 0 || day === 6 ? weekStart(today) : today })
            }}
          >
            <Plus aria-hidden="true" />
            Planeintrag hinzufügen
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Noch keine Stunden geplant.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => {
            const canEdit = row.personId === me || isOwner(task, me)
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <time dateTime={row.date} className="w-28 shrink-0 text-muted-foreground">
                  {formatDate(row.date)}
                </time>
                <span className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={personName(row.personId)} size="xs" />
                  <span className="truncate text-foreground">{personName(row.personId)}</span>
                </span>
                {row.needsReassignment && <ReassignBadge />}
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{row.itemTitle}</span>
                <span className="font-medium tabular-nums text-foreground">{formatHours(row.hours)}</span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Planeintrag vom ${formatDate(row.date)} bearbeiten`}
                    onClick={() =>
                      setDraft({
                        id: row.id,
                        taskId: task.id,
                        subtaskId: row.subtaskId,
                        personId: row.personId,
                        date: row.date,
                        hours: row.hours,
                        needsReassignment: row.needsReassignment,
                      })
                    }
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <PlanEntryDialog draft={draft} onOpenChange={(open) => !open && setDraft(null)} />
    </div>
  )
}
