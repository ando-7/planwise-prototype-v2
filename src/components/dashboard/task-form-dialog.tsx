
import { useId, useState, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, STATUS_LABELS, type TaskStatus } from '@/lib/tasks'

export type TaskFormValues = {
  title: string
  description: string
  duration: number
  dueDate: string
  status: TaskStatus
  progress: number
}

type FieldErrors = Partial<Record<'title' | 'duration' | 'dueDate' | 'progress', string>>

type TaskFormDialogProps = {
  trigger: ReactElement
  children: ReactNode
  heading: string
  description: string
  submitLabel: string
  initialValues?: { [K in keyof TaskFormValues]?: TaskFormValues[K] | undefined } | undefined
  showStatus?: boolean
  /** Fertigstellungsgrad-Feld anzeigen (nur für Aufgaben ohne Unteraufgaben, FA-AM-7). */
  showProgress?: boolean
  /** Hinweis, wenn das Fortschrittsfeld fehlt (z. B. „wird aus Unteraufgaben berechnet“). */
  progressNote?: string | undefined
  /** Latest allowed end date (inclusive), e.g. the parent task's deadline. */
  maxDate?: string | undefined
  maxDateReason?: string | undefined
  /** Earliest allowed end date (inclusive), e.g. the latest subtask deadline. */
  minDate?: string | undefined
  minDateReason?: string | undefined
  onSubmit: (values: TaskFormValues) => void
}

const statuses = Object.keys(STATUS_LABELS) as TaskStatus[]

export function TaskFormDialog({
  trigger,
  children,
  heading,
  description,
  submitLabel,
  initialValues,
  showStatus = false,
  showProgress = false,
  progressNote,
  maxDate,
  maxDateReason,
  minDate,
  minDateReason,
  onSubmit,
}: TaskFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [progressValue, setProgressValue] = useState<number>(initialValues?.progress ?? 0)
  const [errors, setErrors] = useState<FieldErrors>({})
  const id = useId()
  const ids = {
    title: `${id}-title`,
    titleError: `${id}-title-error`,
    description: `${id}-description`,
    dueDate: `${id}-due`,
    dueDateHint: `${id}-due-hint`,
    dueDateError: `${id}-due-error`,
    duration: `${id}-duration`,
    durationError: `${id}-duration-error`,
    status: `${id}-status`,
    progress: `${id}-progress`,
    progressError: `${id}-progress-error`,
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) setProgressValue(initialValues?.progress ?? 0)
    if (!nextOpen) setErrors({})
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title') ?? '').trim()
    const descriptionValue = String(data.get('description') ?? '').trim()
    const dueDate = String(data.get('dueDate') ?? '')
    const duration = Number(String(data.get('duration') ?? '').replace(',', '.'))
    const statusValue = String(data.get('status') ?? initialValues?.status ?? 'offen') as TaskStatus
    let status = statuses.includes(statusValue) ? statusValue : 'offen'
    let progress = initialValues?.progress ?? 0

    const nextErrors: FieldErrors = {}
    if (!title) nextErrors.title = 'Bitte einen Titel eingeben.'
    else if (title.length > 120) nextErrors.title = 'Maximal 120 Zeichen.'

    if (!Number.isFinite(duration) || duration <= 0) {
      nextErrors.duration = 'Bitte eine Bearbeitungsdauer größer als 0 eingeben.'
    } else if (duration > 9999) {
      nextErrors.duration = 'Maximal 9999 Stunden.'
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      nextErrors.dueDate = 'Bitte ein Enddatum wählen.'
    } else if (maxDate && dueDate > maxDate) {
      nextErrors.dueDate = `Das Enddatum darf nicht nach dem ${formatDate(maxDate)} liegen${maxDateReason ? ` (${maxDateReason})` : ''}.`
    } else if (minDate && dueDate < minDate) {
      nextErrors.dueDate = `Das Enddatum darf nicht vor dem ${formatDate(minDate)} liegen${minDateReason ? ` (${minDateReason})` : ''}.`
    }

    if (showProgress) {
      const raw = String(data.get('progress') ?? '').trim()
      progress = Number(raw)
      if (raw === '' || !Number.isInteger(progress) || progress < 0 || progress > 100) {
        nextErrors.progress = 'Bitte eine ganze Zahl von 0 bis 100 eingeben.'
      } else if (status === 'erledigt' && initialValues?.status !== 'erledigt') {
        // Status gerade auf „Erledigt“ gestellt → 100 %
        progress = 100
      } else if (progress === 100) {
        // FA-AM-7: Bei 100 % wechselt der Status automatisch auf „Erledigt“
        status = 'erledigt'
      } else if (status === 'erledigt') {
        // War erledigt, Fortschritt unter 100 % gesenkt → wieder „In Bearbeitung“
        status = 'in-bearbeitung'
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({ title, description: descriptionValue, duration, dueDate, status, progress })
    handleOpenChange(false)
  }

  const hintParts = [
    maxDate && `Spätestens ${formatDate(maxDate)}${maxDateReason ? ` (${maxDateReason})` : ''}.`,
    minDate && `Frühestens ${formatDate(minDate)}${minDateReason ? ` (${minDateReason})` : ''}.`,
  ].filter(Boolean)
  const dateHint = hintParts.length > 0 ? hintParts.join(' ') : undefined

  const dueDescribedBy = [dateHint && ids.dueDateHint, errors.dueDate && ids.dueDateError].filter(Boolean).join(' ')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.title}>Titel</Label>
            <Input
              id={ids.title}
              name="title"
              defaultValue={initialValues?.title}
              placeholder="z. B. Release-Notes schreiben"
              maxLength={120}
              autoFocus
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? ids.titleError : undefined}
            />
            {errors.title && (
              <p id={ids.titleError} className="text-xs text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.description}>
              Beschreibung <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={ids.description}
              name="description"
              defaultValue={initialValues?.description}
              rows={3}
              maxLength={500}
              placeholder="Worum geht es bei dieser Aufgabe?"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.duration}>Bearbeitungsdauer (Stunden)</Label>
              <Input
                id={ids.duration}
                name="duration"
                type="number"
                min={0.5}
                step={0.5}
                defaultValue={initialValues?.duration}
                placeholder="z. B. 8"
                aria-invalid={errors.duration ? true : undefined}
                aria-describedby={errors.duration ? ids.durationError : undefined}
              />
              {errors.duration && (
                <p id={ids.durationError} className="text-xs text-destructive">
                  {errors.duration}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.dueDate}>Enddatum</Label>
              <Input
                id={ids.dueDate}
                name="dueDate"
                type="date"
                defaultValue={initialValues?.dueDate}
                max={maxDate}
                min={minDate}
                className="[color-scheme:light] dark:[color-scheme:dark]"
                aria-invalid={errors.dueDate ? true : undefined}
                aria-describedby={dueDescribedBy || undefined}
              />
            </div>
          </div>

          {(dateHint || errors.dueDate) && (
            <div className="-mt-3 flex flex-col gap-1">
              {errors.dueDate ? (
                <p id={ids.dueDateError} className="text-xs text-destructive">
                  {errors.dueDate}
                </p>
              ) : (
                <p id={ids.dueDateHint} className="text-xs text-muted-foreground">
                  {dateHint}
                </p>
              )}
            </div>
          )}

          {showStatus && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={ids.status}>Status</Label>
                <select
                  id={ids.status}
                  name="status"
                  defaultValue={initialValues?.status ?? 'offen'}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              {showProgress ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={ids.progress}>Fertigstellungsgrad (%)</Label>
                  <Input
                    id={ids.progress}
                    name="progress"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Number.isFinite(progressValue) ? progressValue : ''}
                    onChange={(event) => setProgressValue(event.target.valueAsNumber)}
                    aria-invalid={errors.progress ? true : undefined}
                    aria-describedby={errors.progress ? ids.progressError : undefined}
                  />
                  {errors.progress ? (
                    <p id={ids.progressError} className="text-xs text-destructive">
                      {errors.progress}
                    </p>
                  ) : (
                    progressValue === 100 && (
                      <p className="text-xs text-muted-foreground">Status wird automatisch „Erledigt“.</p>
                    )
                  )}
                </div>
              ) : (
                progressNote && <p className="self-end pb-1 text-xs text-muted-foreground">{progressNote}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Abbrechen</DialogClose>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
