import { useId, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePlanner } from '@/components/planner/planner-provider'
import { ReassignBadge } from '@/components/dashboard/task-badges'
import {
  findWorkItem,
  formatDate,
  formatHours,
  isAssigned,
  isOwner,
  parseHours,
  validatePlan,
  type TimeErrors,
} from '@/lib/tasks'
import { findPlanConflict } from '@/lib/planning'

export type PlanDraft = {
  id?: string | undefined
  taskId?: string | undefined
  subtaskId?: string | undefined
  personId?: string | undefined
  date?: string | undefined
  hours?: number | undefined
  needsReassignment?: boolean | undefined
}

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground'

const itemKey = (taskId: string, subtaskId?: string) => `${taskId}:${subtaskId ?? ''}`

/** Planeintrag hinzufügen oder bearbeiten (FA-ZM-3, FA-ZM-4). */
export function PlanEntryDialog({
  draft,
  onOpenChange,
}: {
  draft: PlanDraft | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {draft && <PlanForm draft={draft} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PlanForm({ draft, onDone }: { draft: PlanDraft; onDone: () => void }) {
  const { tasks, currentUser, savePlan, deletePlan, personName } = usePlanner()
  const id = useId()
  const me = currentUser.id
  const editing = Boolean(draft.id)

  // Nur Aufgaben, denen die angemeldete Person zugewiesen ist
  const options = useMemo(
    () =>
      tasks
        .filter((task) => isAssigned(task, me))
        .flatMap((task) => [
          { key: itemKey(task.id), label: task.title, taskId: task.id, subtaskId: undefined, dueDate: task.dueDate },
          ...task.subtasks.map((subtask) => ({
            key: itemKey(task.id, subtask.id),
            label: `↳ ${subtask.title}`,
            taskId: task.id,
            subtaskId: subtask.id as string | undefined,
            dueDate: subtask.dueDate,
          })),
        ]),
    [tasks, me],
  )

  const [selected, setSelected] = useState(draft.taskId ? itemKey(draft.taskId, draft.subtaskId) : '')
  const [personId, setPersonId] = useState(draft.personId ?? me)
  const [errors, setErrors] = useState<TimeErrors & { item?: string; form?: string }>({})

  const option = options.find((o) => o.key === selected)
  const found = option ? findWorkItem(tasks, option) : undefined
  const ownerMode = found ? isOwner(found.task, me) : false
  const personOptions = found
    ? ownerMode
      ? [found.task.ownerId, ...found.task.contributorIds]
      : [me]
    : [me]
  const effectivePerson = personOptions.includes(personId) ? personId : personOptions[0]!

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const input = { date: String(data.get('date') ?? ''), hours: parseHours(String(data.get('hours') ?? '')) }
    const nextErrors: typeof errors = {}
    if (!option) nextErrors.item = 'Bitte eine Aufgabe wählen.'
    Object.assign(nextErrors, validatePlan(input, { dueDate: option?.dueDate ?? '9999-12-31' }))
    if (
      option &&
      !nextErrors.date &&
      findPlanConflict(tasks, { ...option, personId: effectivePerson, date: input.date }, draft.id)
    ) {
      nextErrors.date = 'Für diese Person, Aufgabe und diesen Tag existiert bereits ein Planeintrag.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !option) return

    const error = savePlan({
      id: draft.id,
      taskId: option.taskId,
      subtaskId: option.subtaskId,
      personId: effectivePerson,
      ...input,
    })
    if (error) {
      setErrors({ form: error })
      return
    }
    toast.success(editing ? 'Planeintrag gespeichert.' : `${formatHours(input.hours)} eingeplant.`)
    onDone()
  }

  function handleDelete() {
    if (!draft.id || !draft.taskId) return
    const error = deletePlan({ taskId: draft.taskId, subtaskId: draft.subtaskId }, draft.id)
    if (error) {
      setErrors({ form: error })
      return
    }
    toast.success('Planeintrag gelöscht.')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {editing ? 'Planeintrag bearbeiten' : 'Planeintrag hinzufügen'}
          {draft.needsReassignment && <ReassignBadge />}
        </DialogTitle>
        <DialogDescription>
          {draft.needsReassignment
            ? 'Dieser Eintrag stammt von einer entfernten mitwirkenden Person. Weise ihn einer Person zu und speichere.'
            : 'Plane Arbeitsstunden für einen Werktag. Stunden müssen größer als 0 sein.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-item`}>Zugewiesene Aufgabe</Label>
        <select
          id={`${id}-item`}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className={selectClass}
          aria-invalid={errors.item ? true : undefined}
        >
          <option value="" disabled>
            Aufgabe wählen …
          </option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.item ? (
          <p className="text-xs text-destructive">{errors.item}</p>
        ) : (
          option && <p className="text-xs text-muted-foreground">{`Enddatum: ${formatDate(option.dueDate)}`}</p>
        )}
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground">Du bist keiner Aufgabe zugewiesen.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-person`}>Person</Label>
        <select
          id={`${id}-person`}
          value={effectivePerson}
          onChange={(event) => setPersonId(event.target.value)}
          disabled={personOptions.length < 2}
          className={selectClass}
        >
          {personOptions.map((pid) => (
            <option key={pid} value={pid}>
              {personName(pid)}
              {found && pid === found.task.ownerId ? ' (verantwortlich)' : ''}
            </option>
          ))}
        </select>
        {!ownerMode && (
          <p className="text-xs text-muted-foreground">Du kannst nur deine eigenen Stunden planen.</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-date`}>Datum</Label>
          <Input
            id={`${id}-date`}
            name="date"
            type="date"
            defaultValue={draft.date}
            max={option?.dueDate}
            className="[color-scheme:light] dark:[color-scheme:dark]"
            aria-invalid={errors.date ? true : undefined}
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-hours`}>Stunden</Label>
          <Input
            id={`${id}-hours`}
            name="hours"
            inputMode="decimal"
            placeholder="z. B. 2,5"
            defaultValue={draft.hours !== undefined ? String(draft.hours).replace('.', ',') : undefined}
            autoFocus
            aria-invalid={errors.hours ? true : undefined}
          />
          {errors.hours && <p className="text-xs text-destructive">{errors.hours}</p>}
        </div>
      </div>

      {errors.form && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <DialogFooter className="sm:justify-between">
        {editing ? (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Löschen
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onDone}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={options.length === 0}>
            Speichern
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
