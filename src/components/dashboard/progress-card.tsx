import { useEffect, useId, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { usePlanner } from '@/components/planner/planner-provider'
import { isOwner, taskProgress, type Task } from '@/lib/tasks'
import { ProgressBar } from './task-badges'

/** Fertigstellungsgrad anzeigen und – ohne Subaufgaben – durch die verantwortliche Person setzen (FA-FTU-1). */
export function ProgressCard({ task }: { task: Task }) {
  const { currentUser, setTaskProgress } = usePlanner()
  const id = useId()
  const value = taskProgress(task)
  const computed = task.subtasks.length > 0
  const canEdit = !computed && isOwner(task, currentUser.id)
  const [draft, setDraft] = useState(value)
  const [text, setText] = useState(String(value))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(value)
    setText(String(value))
  }, [value])

  function commit(next: number) {
    if (next === task.progress) return
    const result = setTaskProgress(task.id, next)
    if (result) {
      setError(result)
      return
    }
    setError(null)
    if (next === 100 && task.status !== 'erledigt') toast.success(`„${task.title}“ ist jetzt erledigt.`)
  }

  function commitText() {
    const raw = text.trim()
    const parsed = Number(raw)
    if (raw === '' || !Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      setError('Bitte eine ganze Zahl von 0 bis 100 eingeben.')
      return
    }
    setDraft(parsed)
    commit(parsed)
  }

  const hint = computed
    ? 'Mittelwert der Fertigstellungsgrade aller direkten Subaufgaben.'
    : canEdit
      ? 'Bei 100 % wechselt der Status automatisch auf „Erledigt“.'
      : 'Nur die verantwortliche Person kann den Fertigstellungsgrad ändern.'

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${id}-heading`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fertigstellungsgrad
        </h3>
        {computed && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
            Berechnet aus Subaufgaben
          </span>
        )}
      </div>

      <ProgressBar value={canEdit ? draft : value} size="lg" />

      <div className="flex items-center gap-3">
        <Slider
          value={[canEdit ? draft : value]}
          min={0}
          max={100}
          step={5}
          disabled={!canEdit}
          onValueChange={([next]) => {
            setDraft(next!)
            setText(String(next))
            setError(null)
          }}
          onValueCommit={([next]) => commit(next!)}
          aria-label="Fertigstellungsgrad"
          className="flex-1 data-[disabled]:opacity-50"
        />
        <div className="flex items-center gap-1">
          <Input
            id={`${id}-percent`}
            value={canEdit ? text : String(value)}
            onChange={(event) => setText(event.target.value)}
            onBlur={commitText}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitText()
              }
            }}
            inputMode="numeric"
            readOnly={!canEdit}
            disabled={!canEdit}
            aria-label="Fertigstellungsgrad in Prozent"
            aria-invalid={error ? true : undefined}
            className="h-8 w-16 text-right tabular-nums"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </section>
  )
}
