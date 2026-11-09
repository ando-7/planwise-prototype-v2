import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/components/planner/planner-provider'
import { PersonAvatar } from '@/components/planner/person-avatar'
import { ReassignBadge } from '@/components/dashboard/task-badges'
import {
  addDays,
  formatDayMonth,
  formatWeekRange,
  isoWeekNumber,
  weekPlanGroups,
  weekStart,
  workWeek,
  WEEKDAY_SHORT,
  type GroupBy,
  type PlanRow,
} from '@/lib/planning'
import { findWorkItem, formatHours, isAssigned, isOwner, todayIso } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import { PlanEntryDialog, type PlanDraft } from './plan-entry-dialog'

const hours = (value: number) => (value > 0 ? formatHours(value) : '–')

export function WeekPlanner() {
  const { tasks, people, currentUser } = usePlanner()
  const today = todayIso()
  const currentMonday = weekStart(today)
  const [monday, setMonday] = useState(currentMonday)
  const [groupBy, setGroupBy] = useState<GroupBy>('person')
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const me = currentUser.id

  const days = useMemo(() => workWeek(monday), [monday])
  const groups = useMemo(() => weekPlanGroups(tasks, people, days, groupBy), [tasks, people, days, groupBy])
  const dayTotals = days.map((_, i) => groups.reduce((acc, g) => acc + g.dayTotals[i]!, 0))
  const weekTotal = groups.reduce((acc, g) => acc + g.total, 0)
  const flaggedCount = groups.reduce(
    (acc, g) => acc + g.rows.reduce((n, r) => n + r.cells.filter((c) => c.flagged).length, 0),
    0,
  )

  function canEditRow(row: PlanRow) {
    const found = findWorkItem(tasks, row)
    if (!found || !isAssigned(found.task, me)) return false
    return row.personId === me || isOwner(found.task, me)
  }

  function openCell(row: PlanRow, dayIndex: number) {
    const cell = row.cells[dayIndex]!
    const base = { taskId: row.taskId, subtaskId: row.subtaskId, personId: row.personId, date: days[dayIndex] }
    setDraft(
      cell.entry
        ? { ...base, id: cell.entry.id, hours: cell.entry.hours, needsReassignment: cell.entry.needsReassignment }
        : base,
    )
  }

  const isCurrentWeek = monday === currentMonday

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wochenplanung</h1>
          <p className="text-sm text-muted-foreground">Geplante Arbeitsstunden je Person und Aufgabe von Montag bis Freitag.</p>
        </div>
        <Button onClick={() => setDraft({ personId: me, date: days.includes(today) ? today : monday })}>
          <Plus data-icon="inline-start" aria-hidden="true" />
          Planeintrag hinzufügen
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {`KW ${isoWeekNumber(monday)}${isCurrentWeek ? ' · aktuelle Woche' : ''}`}
          </span>
          <span className="text-lg font-semibold tabular-nums text-card-foreground" aria-live="polite">
            {formatWeekRange(monday)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Woche wählen">
            <Button variant="outline" size="sm" onClick={() => setMonday(addDays(monday, -7))}>
              <ChevronLeft aria-hidden="true" />
              Vorherige Woche
            </Button>
            <Button variant={isCurrentWeek ? 'secondary' : 'outline'} size="sm" onClick={() => setMonday(currentMonday)} disabled={isCurrentWeek}>
              Aktuelle Woche
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonday(addDays(monday, 7))}>
              Nächste Woche
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Gruppierung">
            {(['person', 'task'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={groupBy === value}
                onClick={() => setGroupBy(value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors',
                  groupBy === value && 'bg-background text-foreground shadow-sm',
                )}
              >
                {value === 'person' ? 'Nach Person' : 'Nach Aufgabe'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {flaggedCount > 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-status-reassign/30 bg-status-reassign/10 px-4 py-2.5 text-sm text-foreground">
          <ReassignBadge />
          {`${flaggedCount} ${flaggedCount === 1 ? 'Planeintrag wurde' : 'Planeinträge wurden'} nach dem Entfernen einer mitwirkenden Person der verantwortlichen Person zugeordnet. Klicke darauf, um sie neu zuzuweisen.`}
        </p>
      )}

      <section aria-label="Wochenraster" className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="w-[30%] px-4 py-3 text-left font-medium">
                  {groupBy === 'person' ? 'Person / Aufgabe' : 'Aufgabe / Person'}
                </th>
                {days.map((day, i) => (
                  <th
                    key={day}
                    scope="col"
                    className={cn('w-[11%] px-2 py-3 text-center font-medium', day === today && 'text-primary')}
                  >
                    <span className="block text-sm font-semibold text-foreground">{WEEKDAY_SHORT[i]}</span>
                    <span className={cn('tabular-nums', day === today && 'font-semibold text-primary')}>{formatDayMonth(day)}</span>
                  </th>
                ))}
                <th scope="col" className="w-[15%] px-4 py-3 text-right font-medium">
                  Wochentotal
                </th>
              </tr>
            </thead>

            {groups.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    Für diese Woche sind keine Stunden geplant. Lege mit „Planeintrag hinzufügen“ den ersten an.
                  </td>
                </tr>
              </tbody>
            ) : (
              groups.map((group) => (
                <tbody key={group.key} className="border-b border-border last:border-b-0">
                  <tr className="bg-muted/50">
                    <th scope="rowgroup" className="px-4 py-2 text-left">
                      <span className="flex items-center gap-2">
                        {groupBy === 'person' && <PersonAvatar name={group.label} size="xs" />}
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {group.label}
                            {groupBy === 'person' && group.key === me && (
                              <span className="ml-1.5 font-normal text-muted-foreground">(du)</span>
                            )}
                          </span>
                          {group.sublabel && <span className="truncate text-xs font-normal text-muted-foreground">{group.sublabel}</span>}
                        </span>
                      </span>
                    </th>
                    {group.dayTotals.map((total, i) => (
                      <td key={days[i]} className="px-2 py-2 text-center text-xs font-medium tabular-nums text-muted-foreground">
                        {hours(total)}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums text-foreground">{formatHours(group.total)}</td>
                  </tr>
                  {group.rows.map((row) => {
                    const editable = canEditRow(row)
                    return (
                      <tr key={row.key} className="border-t border-border/60">
                        <th scope="row" className="px-4 py-1.5 pl-11 text-left font-normal">
                          <span className="block truncate text-sm text-foreground">{row.label}</span>
                          {row.sublabel && <span className="block truncate text-xs text-muted-foreground">{row.sublabel}</span>}
                        </th>
                        {row.cells.map((cell, i) => {
                          const label = `${row.label}, ${WEEKDAY_SHORT[i]} ${formatDayMonth(days[i]!)}: ${cell.hours > 0 ? formatHours(cell.hours) : 'nichts geplant'}`
                          return (
                            <td key={days[i]} className={cn('p-1 text-center', days[i] === today && 'bg-primary/5')}>
                              {editable ? (
                                <button
                                  type="button"
                                  onClick={() => openCell(row, i)}
                                  aria-label={`${label} – ${cell.entry ? 'bearbeiten' : 'hinzufügen'}`}
                                  className={cn(
                                    'group flex h-10 w-full flex-col items-center justify-center rounded-md text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    cell.hours > 0
                                      ? cell.flagged
                                        ? 'bg-status-reassign/15 font-medium text-status-reassign hover:bg-status-reassign/25'
                                        : 'bg-primary/10 font-medium text-primary hover:bg-primary/20'
                                      : 'text-muted-foreground/40 hover:bg-accent hover:text-foreground',
                                  )}
                                >
                                  {cell.hours > 0 ? (
                                    formatHours(cell.hours)
                                  ) : (
                                    <Plus className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                                  )}
                                  {cell.flagged && <span className="text-[0.6rem] leading-none font-medium">neu zuzuweisen</span>}
                                </button>
                              ) : (
                                <span
                                  aria-label={label}
                                  className={cn(
                                    'flex h-10 w-full flex-col items-center justify-center rounded-md text-sm tabular-nums',
                                    cell.hours > 0 ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground/40',
                                  )}
                                >
                                  {hours(cell.hours)}
                                  {cell.flagged && <span className="text-[0.6rem] leading-none text-status-reassign">neu zuzuweisen</span>}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-1.5 text-right text-sm font-medium tabular-nums text-foreground">{formatHours(row.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              ))
            )}

            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Summe
                </th>
                {dayTotals.map((total, i) => (
                  <td key={days[i]} className="px-2 py-3 text-center text-sm font-semibold tabular-nums text-foreground">
                    {hours(Math.round(total * 100) / 100)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatHours(Math.round(weekTotal * 100) / 100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Klicke auf einen Tag, um einen Planeintrag hinzuzufügen oder zu ändern. Du kannst deine eigenen Einträge bearbeiten; als verantwortliche Person auch die Einträge deiner Aufgaben.
      </p>

      <PlanEntryDialog draft={draft} onOpenChange={(open) => !open && setDraft(null)} />
    </>
  )
}
