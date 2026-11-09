export type TaskStatus = 'offen' | 'in-bearbeitung' | 'erledigt'

export type Person = {
  id: string
  name: string
}

/** Tatsächlich geleistete Arbeitszeit (FA-ZM-1). */
export type TimeBooking = {
  id: string
  personId: string
  date: string
  hours: number
  note?: string | undefined
}

/** Geplante Arbeitszeit (FA-ZM-3). `needsReassignment` markiert Einträge nach KR-2 als „neu zuzuweisen“. */
export type PlanEntry = {
  id: string
  personId: string
  date: string
  hours: number
  needsReassignment?: boolean | undefined
}

export type Subtask = {
  id: string
  title: string
  description?: string | undefined
  /** Bearbeitungsdauer in Stunden (FA-AM-1) */
  duration: number
  dueDate: string
  progress: number
  status: TaskStatus
  bookings: TimeBooking[]
  plans: PlanEntry[]
}

export type Task = Subtask & {
  project?: string | undefined
  /** Verantwortliche Person (FA-AM-2) – gilt auch für die Subaufgaben. */
  ownerId: string
  /** Mitwirkende Personen (FA-AM-5) – nie die verantwortliche Person (KR-7). */
  contributorIds: string[]
  /** Nur gepflegt, solange keine Subaufgaben existieren (FA-AM-7); sonst siehe taskProgress() */
  progress: number
  subtasks: Subtask[]
}

/** Aufgabe oder Subaufgabe – beide tragen Buchungen, Planzeiten und Fortschritt. */
export type WorkItem = Subtask

/** Verweist auf eine Aufgabe (ohne subtaskId) oder eine ihrer Subaufgaben. */
export type WorkItemRef = { taskId: string; subtaskId?: string | undefined }

export const STATUS_LABELS: Record<TaskStatus, string> = {
  offen: 'Offen',
  'in-bearbeitung': 'In Bearbeitung',
  erledigt: 'Erledigt',
}

export const DELETE_BLOCKED_MESSAGE =
  'Löschen nicht möglich: Für diese Aufgabe existieren bereits gebuchte oder geplante Zeiten.'

export const OWNER_AS_CONTRIBUTOR_MESSAGE =
  'Die verantwortliche Person kann nicht gleichzeitig mitwirkend sein.'

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(`${iso}T00:00:00Z`))
}

const hoursFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

export function formatHours(hours: number) {
  return `${hoursFormatter.format(hours)} h`
}

/** Liest Stunden mit Komma oder Punkt, z. B. „1,5“ oder „1.5“. Leere Eingabe ergibt NaN. */
export function parseHours(raw: string) {
  const value = raw.trim().replace(',', '.')
  if (value === '') return Number.NaN
  return Number(value)
}

/** Latest end date among the subtasks, or undefined when there are none. ISO dates sort lexicographically. */
export function latestSubtaskDueDate(subtasks: Subtask[]) {
  return subtasks.reduce<string | undefined>(
    (latest, subtask) => (!latest || subtask.dueDate > latest ? subtask.dueDate : latest),
    undefined,
  )
}

/** Heutiges Datum (lokal) als ISO-String, z. B. 2026-11-03. */
export function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Fertigstellungsgrad: Mittelwert der direkten Subaufgaben (FA-FTU-1), sonst der direkt gepflegte Wert. */
export function taskProgress(task: Pick<Task, 'progress' | 'subtasks'>) {
  if (task.subtasks.length === 0) return task.progress
  const sum = task.subtasks.reduce((acc, subtask) => acc + subtask.progress, 0)
  return Math.round(sum / task.subtasks.length)
}

/**
 * Setzt den Fertigstellungsgrad (0–100, ganzzahlig). Bei 100 % wird der Status „erledigt“ (FA-AM-7);
 * fällt eine erledigte Aufgabe unter 100 %, ist sie wieder „in Bearbeitung“.
 */
export function applyProgress<T extends { progress: number; status: TaskStatus }>(item: T, progress: number): T {
  const value = Math.min(100, Math.max(0, Math.round(progress)))
  let status = item.status
  if (value === 100) status = 'erledigt'
  else if (status === 'erledigt') status = 'in-bearbeitung'
  return { ...item, progress: value, status }
}

/** Aufgabe mit Subaufgaben: 100 % (Mittelwert) → erledigt, darunter wieder in Bearbeitung (FA-AM-7). */
export function syncStatus(task: Task): Task {
  if (task.subtasks.length === 0) return task
  const progress = taskProgress(task)
  if (progress === 100 && task.status !== 'erledigt') return { ...task, status: 'erledigt' }
  if (progress < 100 && task.status === 'erledigt') return { ...task, status: 'in-bearbeitung' }
  return task
}

// ---------- Personen & Rollen ----------

export function isOwner(task: Pick<Task, 'ownerId'>, personId: string) {
  return task.ownerId === personId
}

/** Verantwortliche oder mitwirkende Person – nur diese dürfen buchen und planen (FA-ZM-1, FA-ZM-3). */
export function isAssigned(task: Pick<Task, 'ownerId' | 'contributorIds'>, personId: string) {
  return task.ownerId === personId || task.contributorIds.includes(personId)
}

/** Personen, die als Mitwirkende wählbar sind: weder verantwortlich (KR-7) noch bereits mitwirkend. */
export function selectableContributors(people: Person[], task: Pick<Task, 'ownerId' | 'contributorIds'>) {
  return people.filter((person) => person.id !== task.ownerId && !task.contributorIds.includes(person.id))
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export function addContributor(task: Task, personId: string): Result<Task> {
  if (task.ownerId === personId) return { ok: false, error: OWNER_AS_CONTRIBUTOR_MESSAGE }
  if (task.contributorIds.includes(personId)) return { ok: false, error: 'Diese Person wirkt bereits mit.' }
  return { ok: true, value: { ...task, contributorIds: [...task.contributorIds, personId] } }
}

/**
 * KR-2: Buchungen der entfernten Person bleiben unverändert. Ihre Planeinträge (Aufgabe und Subaufgaben)
 * gehen an die verantwortliche Person und werden als „neu zuzuweisen“ markiert.
 */
export function removeContributor(task: Task, personId: string): Task {
  const reassign = (plans: PlanEntry[]) =>
    plans.map((plan) =>
      plan.personId === personId ? { ...plan, personId: task.ownerId, needsReassignment: true } : plan,
    )
  return {
    ...task,
    contributorIds: task.contributorIds.filter((id) => id !== personId),
    plans: reassign(task.plans),
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, plans: reassign(subtask.plans) })),
  }
}

// ---------- Löschschutz (KR-1) ----------

type TimeCarrier = { bookings: TimeBooking[]; plans: PlanEntry[]; subtasks?: Subtask[] | undefined }

export function hasRecordedTime(item: TimeCarrier): boolean {
  if (item.bookings.length > 0 || item.plans.length > 0) return true
  return item.subtasks?.some(hasRecordedTime) ?? false
}

/** Grund, warum eine (Sub-)Aufgabe nicht gelöscht werden darf, oder undefined. */
export function deleteBlockReason(item: TimeCarrier) {
  return hasRecordedTime(item) ? DELETE_BLOCKED_MESSAGE : undefined
}

// ---------- Buchungen & Planzeiten ----------

export type TimeInput = { date: string; hours: number; note?: string | undefined }
export type TimeErrors = Partial<Record<'date' | 'hours', string>>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validateHours(hours: number, errors: TimeErrors) {
  if (!Number.isFinite(hours) || hours <= 0) errors.hours = 'Die Stundenanzahl muss größer als 0 sein.'
  else if (hours > 24) errors.hours = 'Pro Eintrag sind höchstens 24 Stunden möglich.'
}

/** FA-ZM-1: Stunden > 0, Datum nicht in der Zukunft; FA-ZM-3: nicht nach dem Enddatum. */
export function validateBooking(input: TimeInput, { today, dueDate }: { today: string; dueDate: string }) {
  const errors: TimeErrors = {}
  if (!ISO_DATE.test(input.date)) errors.date = 'Bitte ein Buchungsdatum wählen.'
  else if (input.date > today) errors.date = 'Das Buchungsdatum darf nicht in der Zukunft liegen.'
  else if (input.date > dueDate)
    errors.date = `Nach dem Enddatum (${formatDate(dueDate)}) kann keine Zeit gebucht werden.`
  validateHours(input.hours, errors)
  return errors
}

/** FA-ZM-3: Stunden > 0, nicht nach dem Enddatum; die Wochenplanung umfasst nur Werktage. */
export function validatePlan(input: TimeInput, { dueDate }: { dueDate: string }) {
  const errors: TimeErrors = {}
  if (!ISO_DATE.test(input.date)) errors.date = 'Bitte ein Datum wählen.'
  else {
    const weekday = new Date(`${input.date}T00:00:00Z`).getUTCDay()
    if (weekday === 0 || weekday === 6) errors.date = 'Bitte einen Werktag (Mo–Fr) wählen.'
    else if (input.date > dueDate)
      errors.date = `Nach dem Enddatum der Aufgabe (${formatDate(dueDate)}) kann nichts geplant werden.`
  }
  validateHours(input.hours, errors)
  return errors
}

export function sumHours(entries: { hours: number }[]) {
  return Math.round(entries.reduce((acc, entry) => acc + entry.hours, 0) * 100) / 100
}

/** Findet eine Aufgabe oder Subaufgabe. */
export function findWorkItem(tasks: Task[], ref: WorkItemRef) {
  const task = tasks.find((t) => t.id === ref.taskId)
  if (!task) return undefined
  if (!ref.subtaskId) return { task, item: task as WorkItem }
  const subtask = task.subtasks.find((s) => s.id === ref.subtaskId)
  return subtask ? { task, item: subtask } : undefined
}

/** Wendet `fn` auf die referenzierte Aufgabe bzw. Subaufgabe an. */
export function mapWorkItem(tasks: Task[], ref: WorkItemRef, fn: (item: WorkItem) => WorkItem): Task[] {
  return tasks.map((task) => {
    if (task.id !== ref.taskId) return task
    if (!ref.subtaskId) return { ...task, ...fn(task) }
    return {
      ...task,
      subtasks: task.subtasks.map((subtask) => (subtask.id === ref.subtaskId ? fn(subtask) : subtask)),
    }
  })
}

// ---------- Beispieldaten (keine echten Konten vorhanden) ----------

export const samplePeople: Person[] = [
  { id: 'p1', name: 'Anna Smith' },
  { id: 'p2', name: 'Tom Brown' },
  { id: 'p3', name: 'Maria Lopez' },
  { id: 'p4', name: 'Sam Lee' },
  { id: 'p5', name: 'Nina Novak' },
]

const sub = (s: Omit<Subtask, 'bookings' | 'plans'> & Partial<Pick<Subtask, 'bookings' | 'plans'>>): Subtask => ({
  bookings: [],
  plans: [],
  ...s,
})

export const sampleTasks: Task[] = [
  {
    id: 't1',
    title: 'Kick-off Workshop vorbereiten',
    project: 'Website Relaunch',
    ownerId: 'p1',
    contributorIds: ['p2'],
    duration: 6,
    dueDate: '2026-11-03',
    progress: 40,
    status: 'in-bearbeitung',
    bookings: [],
    plans: [{ id: 'pl1', personId: 'p2', date: '2026-11-02', hours: 3 }],
    subtasks: [],
  },
  {
    id: 't2',
    title: 'Wireframes für Startseite',
    project: 'Website Relaunch',
    ownerId: 'p1',
    contributorIds: ['p3', 'p2'],
    duration: 24,
    dueDate: '2026-11-07',
    progress: 0,
    status: 'in-bearbeitung',
    bookings: [{ id: 'b1', personId: 'p1', date: '2026-10-30', hours: 2.5, note: 'Abstimmung Seitenstruktur' }],
    plans: [{ id: 'pl2', personId: 'p2', date: '2026-11-05', hours: 2 }],
    subtasks: [
      sub({
        id: 't2-1',
        title: 'Hero-Bereich skizzieren',
        duration: 8,
        dueDate: '2026-10-29',
        progress: 100,
        status: 'erledigt',
        bookings: [{ id: 'b2', personId: 'p3', date: '2026-10-28', hours: 4, note: 'Erste Skizzen' }],
      }),
      sub({ id: 't2-2', title: 'Navigation definieren', duration: 6, dueDate: '2026-11-02', progress: 100, status: 'erledigt' }),
      sub({
        id: 't2-3',
        title: 'Feedback vom Team einholen',
        description: 'Review-Termin mit Design und Produkt',
        duration: 4,
        dueDate: '2026-11-06',
        progress: 30,
        status: 'in-bearbeitung',
        plans: [
          { id: 'pl3', personId: 'p3', date: '2026-11-03', hours: 3 },
          { id: 'pl4', personId: 'p3', date: '2026-11-04', hours: 2 },
        ],
      }),
    ],
  },
  {
    id: 't3',
    title: 'API-Schnittstelle dokumentieren',
    project: 'Kundenportal',
    ownerId: 'p2',
    contributorIds: ['p1'],
    duration: 16,
    dueDate: '2026-10-30',
    progress: 0,
    status: 'in-bearbeitung',
    bookings: [],
    plans: [],
    subtasks: [
      sub({
        id: 't3-1',
        title: 'Endpunkte auflisten',
        duration: 6,
        dueDate: '2026-10-26',
        progress: 100,
        status: 'erledigt',
        bookings: [{ id: 'b3', personId: 'p1', date: '2026-10-26', hours: 6 }],
      }),
      sub({ id: 't3-2', title: 'Beispiel-Requests ergänzen', duration: 8, dueDate: '2026-10-30', progress: 0, status: 'offen' }),
    ],
  },
  {
    id: 't4',
    title: 'Budgetplanung Q1 abstimmen',
    project: 'Finanzen',
    ownerId: 'p4',
    contributorIds: [],
    duration: 5,
    dueDate: '2026-10-24',
    progress: 100,
    status: 'erledigt',
    bookings: [{ id: 'b4', personId: 'p4', date: '2026-10-22', hours: 5 }],
    plans: [],
    subtasks: [],
  },
  {
    id: 't5',
    title: 'Testplan für Release 2.4',
    project: 'Kundenportal',
    ownerId: 'p1',
    contributorIds: ['p5'],
    duration: 12,
    dueDate: '2026-11-14',
    progress: 0,
    status: 'offen',
    bookings: [],
    plans: [
      { id: 'pl5', personId: 'p1', date: '2026-11-11', hours: 3 },
      { id: 'pl6', personId: 'p1', date: '2026-11-12', hours: 2, needsReassignment: true },
    ],
    subtasks: [
      sub({
        id: 't5-1',
        title: 'Testfälle sammeln',
        duration: 6,
        dueDate: '2026-11-09',
        progress: 0,
        status: 'offen',
        plans: [{ id: 'pl7', personId: 'p5', date: '2026-11-09', hours: 4 }],
      }),
    ],
  },
  {
    id: 't6',
    title: 'Onboarding-Mail Texte finalisieren',
    project: 'Marketing',
    ownerId: 'p1',
    contributorIds: [],
    duration: 3,
    dueDate: '2026-10-21',
    progress: 100,
    status: 'erledigt',
    bookings: [],
    plans: [],
    subtasks: [],
  },
  {
    id: 't7',
    title: 'Designsystem: Farbpalette',
    project: 'Website Relaunch',
    ownerId: 'p3',
    contributorIds: ['p1'],
    duration: 10,
    dueDate: '2026-11-10',
    progress: 80,
    status: 'in-bearbeitung',
    bookings: [{ id: 'b5', personId: 'p1', date: '2026-11-02', hours: 3 }],
    plans: [
      { id: 'pl8', personId: 'p1', date: '2026-11-04', hours: 2 },
      { id: 'pl9', personId: 'p1', date: '2026-11-05', hours: 3 },
      { id: 'pl10', personId: 'p3', date: '2026-11-09', hours: 2 },
    ],
    subtasks: [],
  },
]
