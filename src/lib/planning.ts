import type { Person, PlanEntry, Task } from './tasks'

const DAY_MS = 86_400_000

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`)
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number) {
  return toIso(new Date(toDate(iso).getTime() + days * DAY_MS))
}

/** Montag der Woche, in der `iso` liegt (Wochenende zählt zur laufenden Woche). */
export function weekStart(iso: string) {
  const weekday = toDate(iso).getUTCDay() // 0 = So
  return addDays(iso, weekday === 0 ? -6 : 1 - weekday)
}

/** Montag bis Freitag ab dem gegebenen Montag. */
export function workWeek(monday: string) {
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset))
}

/** ISO-8601-Kalenderwoche. */
export function isoWeekNumber(iso: string) {
  const date = toDate(iso)
  const weekday = date.getUTCDay() || 7
  const thursday = new Date(date.getTime() + (4 - weekday) * DAY_MS)
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7)
}

export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const

const dayMonth = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const fullDate = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

export function formatDayMonth(iso: string) {
  return dayMonth.format(toDate(iso))
}

/** z. B. „02.11. – 06.11.2026“ */
export function formatWeekRange(monday: string) {
  return `${formatDayMonth(monday)} – ${fullDate.format(toDate(addDays(monday, 4)))}`
}

export type GroupBy = 'person' | 'task'

export type PlanCell = { hours: number; entry?: PlanEntry | undefined; flagged: boolean }

export type PlanRow = {
  key: string
  label: string
  sublabel?: string | undefined
  personId: string
  taskId: string
  subtaskId?: string | undefined
  cells: PlanCell[]
  total: number
}

export type PlanGroup = {
  key: string
  label: string
  sublabel?: string | undefined
  rows: PlanRow[]
  dayTotals: number[]
  total: number
}

const round = (n: number) => Math.round(n * 100) / 100

type FlatEntry = {
  entry: PlanEntry
  task: Task
  subtaskId?: string | undefined
  itemTitle: string
}

function flatten(tasks: Task[]): FlatEntry[] {
  return tasks.flatMap((task) => [
    ...task.plans.map((entry) => ({ entry, task, itemTitle: task.title })),
    ...task.subtasks.flatMap((subtask) =>
      subtask.plans.map((entry) => ({ entry, task, subtaskId: subtask.id, itemTitle: subtask.title })),
    ),
  ])
}

/**
 * Raster für die Wochenansicht: Gruppen nach Person (Zeilen = Aufgaben) oder nach Aufgabe
 * (Zeilen = Personen). Zellen enthalten die Planstunden je Werktag.
 */
export function weekPlanGroups(tasks: Task[], people: Person[], days: string[], groupBy: GroupBy): PlanGroup[] {
  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unbekannt'
  const groups = new Map<string, PlanGroup & { order: number }>()

  for (const flat of flatten(tasks)) {
    const dayIndex = days.indexOf(flat.entry.date)
    if (dayIndex === -1) continue

    const itemKey = `${flat.task.id}:${flat.subtaskId ?? ''}`
    const taskLabel = flat.itemTitle
    const taskSublabel = flat.subtaskId ? `Subaufgabe von „${flat.task.title}“` : flat.task.project
    const byPerson = groupBy === 'person'
    const groupKey = byPerson ? flat.entry.personId : itemKey

    let group = groups.get(groupKey)
    if (!group) {
      group = {
        key: groupKey,
        label: byPerson ? personName(flat.entry.personId) : taskLabel,
        sublabel: byPerson ? undefined : taskSublabel,
        rows: [],
        dayTotals: days.map(() => 0),
        total: 0,
        order: byPerson
          ? people.findIndex((p) => p.id === flat.entry.personId)
          : tasks.findIndex((t) => t.id === flat.task.id),
      }
      groups.set(groupKey, group)
    }

    const rowKey = `${flat.entry.personId}|${itemKey}`
    let row = group.rows.find((r) => r.key === rowKey)
    if (!row) {
      row = {
        key: rowKey,
        label: byPerson ? taskLabel : personName(flat.entry.personId),
        sublabel: byPerson ? taskSublabel : undefined,
        personId: flat.entry.personId,
        taskId: flat.task.id,
        subtaskId: flat.subtaskId,
        cells: days.map(() => ({ hours: 0, flagged: false })),
        total: 0,
      }
      group.rows.push(row)
    }

    const cell = row.cells[dayIndex]!
    cell.hours = round(cell.hours + flat.entry.hours)
    cell.entry ??= flat.entry
    cell.flagged ||= Boolean(flat.entry.needsReassignment)
    row.total = round(row.total + flat.entry.hours)
    group.dayTotals[dayIndex] = round(group.dayTotals[dayIndex]! + flat.entry.hours)
    group.total = round(group.total + flat.entry.hours)
  }

  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'de'))
    .map(({ order: _order, ...group }) => group)
}

/** Existiert bereits ein Planeintrag für dieselbe Person, (Sub-)Aufgabe und denselben Tag? */
export function findPlanConflict(
  tasks: Task[],
  target: { personId: string; taskId: string; subtaskId?: string | undefined; date: string },
  excludeId?: string,
) {
  return flatten(tasks).some(
    (flat) =>
      flat.task.id === target.taskId &&
      (flat.subtaskId ?? undefined) === (target.subtaskId ?? undefined) &&
      flat.entry.personId === target.personId &&
      flat.entry.date === target.date &&
      flat.entry.id !== excludeId,
  )
}
