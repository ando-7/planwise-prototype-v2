import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  addContributor as addContributorRule,
  applyProgress,
  syncStatus,
  deleteBlockReason,
  findWorkItem,
  isAssigned,
  isOwner,
  mapWorkItem,
  removeContributor as removeContributorRule,
  sampleTasks,
  samplePeople,
  todayIso,
  validateBooking,
  validatePlan,
  type Person,
  type PlanEntry,
  type Task,
  type TimeInput,
  type WorkItemRef,
} from '@/lib/tasks'
import { findPlanConflict } from '@/lib/planning'
import type { TaskFormValues } from '@/components/dashboard/task-form-dialog'

/** Fehlermeldung (Deutsch) oder null bei Erfolg. */
type ActionResult = string | null

export type PlanInput = WorkItemRef & { id?: string | undefined; personId: string; date: string; hours: number }

type PlannerContextValue = {
  tasks: Task[]
  people: Person[]
  currentUser: Person
  setCurrentUserId: (id: string) => void
  personName: (id: string) => string
  addTask: (values: TaskFormValues) => void
  editTask: (id: string, values: TaskFormValues) => ActionResult
  deleteTask: (id: string) => ActionResult
  addSubtask: (taskId: string, values: TaskFormValues) => ActionResult
  editSubtask: (taskId: string, subtaskId: string, values: TaskFormValues) => ActionResult
  toggleSubtask: (taskId: string, subtaskId: string) => ActionResult
  deleteSubtask: (taskId: string, subtaskId: string) => ActionResult
  setTaskProgress: (taskId: string, progress: number) => ActionResult
  addContributor: (taskId: string, personId: string) => ActionResult
  removeContributor: (taskId: string, personId: string) => ActionResult
  addBooking: (ref: WorkItemRef, input: TimeInput) => ActionResult
  savePlan: (input: PlanInput) => ActionResult
  deletePlan: (ref: WorkItemRef, planId: string) => ActionResult
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

const NOT_OWNER = 'Nur die verantwortliche Person darf diese Aktion ausführen.'
const NOT_ASSIGNED = 'Nur die verantwortliche Person und Mitwirkende dürfen Zeiten für diese Aufgabe erfassen.'

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks)
  const [currentUserId, setCurrentUserId] = useState(samplePeople[0]!.id)
  const people = samplePeople
  const currentUser = people.find((p) => p.id === currentUserId) ?? people[0]!

  const personName = useCallback((id: string) => people.find((p) => p.id === id)?.name ?? 'Unbekannt', [people])

  const value = useMemo<PlannerContextValue>(() => {
    const me = currentUser.id
    const taskById = (id: string) => tasks.find((t) => t.id === id)

    /** Führt eine Änderung nur aus, wenn die aktuelle Person verantwortlich ist. */
    const asOwner = (taskId: string, change: (task: Task) => Task | string): ActionResult => {
      const task = taskById(taskId)
      if (!task) return 'Aufgabe nicht gefunden.'
      if (!isOwner(task, me)) return NOT_OWNER
      const changed = change(task)
      if (typeof changed === 'string') return changed
      const next = syncStatus(changed)
      setTasks((current) => current.map((t) => (t.id === taskId ? next : t)))
      return null
    }

    return {
      tasks,
      people,
      currentUser,
      setCurrentUserId,
      personName,

      addTask(values) {
        setTasks((current) => [
          {
            id: crypto.randomUUID(),
            title: values.title,
            description: values.description || undefined,
            duration: values.duration,
            dueDate: values.dueDate,
            progress: 0,
            status: 'offen',
            ownerId: me,
            contributorIds: [],
            bookings: [],
            plans: [],
            subtasks: [],
          },
          ...current,
        ])
      },

      editTask: (id, values) =>
        asOwner(id, (task) => {
          const base = {
            ...task,
            title: values.title,
            description: values.description || undefined,
            duration: values.duration,
            dueDate: values.dueDate,
            status: values.status,
          }
          // Mit Subaufgaben wird der Fertigstellungsgrad berechnet (FA-FTU-1), sonst direkt gepflegt (FA-AM-7)
          return task.subtasks.length > 0 ? base : applyProgress(base, values.progress)
        }),

      deleteTask(id) {
        const task = taskById(id)
        if (!task) return 'Aufgabe nicht gefunden.'
        if (!isOwner(task, me)) return NOT_OWNER
        const blocked = deleteBlockReason(task)
        if (blocked) return blocked
        setTasks((current) => current.filter((t) => t.id !== id))
        return null
      },

      addSubtask: (taskId, values) =>
        asOwner(taskId, (task) => ({
          ...task,
          subtasks: [
            ...task.subtasks,
            {
              id: crypto.randomUUID(),
              title: values.title,
              description: values.description || undefined,
              duration: values.duration,
              dueDate: values.dueDate,
              progress: 0,
              status: 'offen',
              bookings: [],
              plans: [],
            },
          ],
        })),

      editSubtask: (taskId, subtaskId, values) =>
        asOwner(taskId, (task) => ({
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask.id === subtaskId
              ? applyProgress(
                  {
                    ...subtask,
                    title: values.title,
                    description: values.description || undefined,
                    duration: values.duration,
                    dueDate: values.dueDate,
                    status: values.status,
                  },
                  values.status === 'erledigt' ? 100 : values.progress,
                )
              : subtask,
          ),
        })),

      toggleSubtask: (taskId, subtaskId) =>
        asOwner(taskId, (task) => ({
          ...task,
          subtasks: task.subtasks.map((subtask) =>
            subtask.id === subtaskId
              ? subtask.status === 'erledigt'
                ? { ...subtask, status: 'offen' as const, progress: 0 }
                : applyProgress(subtask, 100)
              : subtask,
          ),
        })),

      deleteSubtask: (taskId, subtaskId) =>
        asOwner(taskId, (task) => {
          const subtask = task.subtasks.find((s) => s.id === subtaskId)
          if (!subtask) return 'Subaufgabe nicht gefunden.'
          const blocked = deleteBlockReason(subtask)
          if (blocked) return blocked
          return { ...task, subtasks: task.subtasks.filter((s) => s.id !== subtaskId) }
        }),

      setTaskProgress: (taskId, progress) =>
        asOwner(taskId, (task) =>
          task.subtasks.length > 0 ? 'Der Fertigstellungsgrad wird aus den Subaufgaben berechnet.' : applyProgress(task, progress),
        ),

      addContributor: (taskId, personId) =>
        asOwner(taskId, (task) => {
          const result = addContributorRule(task, personId)
          return result.ok ? result.value : result.error
        }),

      removeContributor: (taskId, personId) => asOwner(taskId, (task) => removeContributorRule(task, personId)),

      addBooking(ref, input) {
        const found = findWorkItem(tasks, ref)
        if (!found) return 'Aufgabe nicht gefunden.'
        if (!isAssigned(found.task, me)) return NOT_ASSIGNED
        const errors = validateBooking(input, { today: todayIso(), dueDate: found.item.dueDate })
        const first = errors.date ?? errors.hours
        if (first) return first
        setTasks((current) =>
          mapWorkItem(current, ref, (item) => ({
            ...item,
            bookings: [
              ...item.bookings,
              { id: crypto.randomUUID(), personId: me, date: input.date, hours: input.hours, note: input.note || undefined },
            ],
          })),
        )
        return null
      },

      savePlan(input) {
        const found = findWorkItem(tasks, input)
        if (!found) return 'Bitte eine Aufgabe wählen.'
        const ownerEditing = isOwner(found.task, me)
        if (!isAssigned(found.task, me)) return NOT_ASSIGNED
        if (!ownerEditing && input.personId !== me) return 'Du kannst nur deine eigenen Planeinträge erfassen.'
        if (!isAssigned(found.task, input.personId))
          return 'Die gewählte Person ist dieser Aufgabe nicht zugewiesen.'
        const errors = validatePlan(input, { dueDate: found.item.dueDate })
        const first = errors.date ?? errors.hours
        if (first) return first
        if (findPlanConflict(tasks, input, input.id))
          return 'Für diese Person, Aufgabe und diesen Tag existiert bereits ein Planeintrag.'

        let previous: PlanEntry | undefined
        let next = tasks
        if (input.id) {
          // Bestehenden Eintrag (ggf. aus einer anderen Aufgabe) entfernen
          next = next.map((task) => {
            const strip = (plans: PlanEntry[]) =>
              plans.filter((plan) => {
                if (plan.id !== input.id) return true
                previous = plan
                return false
              })
            return { ...task, plans: strip(task.plans), subtasks: task.subtasks.map((s) => ({ ...s, plans: strip(s.plans) })) }
          })
          if (!previous) return 'Planeintrag nicht gefunden.'
          if (previous.personId !== me && !isOwner(found.task, me)) return 'Du kannst nur deine eigenen Planeinträge ändern.'
        }

        const entry: PlanEntry = {
          id: input.id ?? crypto.randomUUID(),
          personId: input.personId,
          date: input.date,
          hours: input.hours,
          // Die Markierung bleibt, bis die verantwortliche Person den Eintrag zuweist (KR-2)
          needsReassignment: ownerEditing ? false : previous?.needsReassignment,
        }
        setTasks(mapWorkItem(next, input, (item) => ({ ...item, plans: [...item.plans, entry] })))
        return null
      },

      deletePlan(ref, planId) {
        const found = findWorkItem(tasks, ref)
        if (!found) return 'Aufgabe nicht gefunden.'
        const plan = found.item.plans.find((p) => p.id === planId)
        if (!plan) return 'Planeintrag nicht gefunden.'
        if (plan.personId !== me && !isOwner(found.task, me)) return 'Du kannst nur deine eigenen Planeinträge löschen.'
        setTasks((current) => mapWorkItem(current, ref, (item) => ({ ...item, plans: item.plans.filter((p) => p.id !== planId) })))
        return null
      },
    }
  }, [tasks, people, currentUser, personName])

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const context = useContext(PlannerContext)
  if (!context) throw new Error('usePlanner muss innerhalb von PlannerProvider verwendet werden.')
  return context
}
