import { useId, useState, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { toast } from 'sonner'
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
import { usePlanner } from '@/components/planner/planner-provider'
import { formatDate, formatHours, parseHours, todayIso, validateBooking, type TimeErrors, type WorkItemRef } from '@/lib/tasks'

type BookingDialogProps = {
  trigger: ReactElement
  children: ReactNode
  target: WorkItemRef
  itemTitle: string
  dueDate: string
}

/** „Zeit buchen“ für eine Aufgabe oder Subaufgabe (FA-ZM-1). */
export function BookingDialog({ trigger, children, target, itemTitle, dueDate }: BookingDialogProps) {
  const { addBooking, currentUser } = usePlanner()
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<TimeErrors & { form?: string }>({})
  const id = useId()
  const today = todayIso()
  const maxDate = dueDate < today ? dueDate : today

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setErrors({})
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const input = {
      date: String(data.get('date') ?? ''),
      hours: parseHours(String(data.get('hours') ?? '')),
      note: String(data.get('note') ?? '').trim(),
    }
    const nextErrors = validateBooking(input, { today, dueDate })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    const error = addBooking(target, input)
    if (error) {
      setErrors({ form: error })
      return
    }
    toast.success(`${formatHours(input.hours)} auf „${itemTitle}“ gebucht.`)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Zeit buchen</DialogTitle>
            <DialogDescription>
              {`Geleistete Arbeitszeit für „${itemTitle}“ erfassen. Gebucht wird für ${currentUser.name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-date`}>Buchungsdatum</Label>
              <Input
                id={`${id}-date`}
                name="date"
                type="date"
                defaultValue={maxDate}
                max={maxDate}
                className="[color-scheme:light] dark:[color-scheme:dark]"
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={errors.date ? `${id}-date-error` : undefined}
              />
              {errors.date && (
                <p id={`${id}-date-error`} className="text-xs text-destructive">
                  {errors.date}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-hours`}>Anzahl Stunden</Label>
              <Input
                id={`${id}-hours`}
                name="hours"
                inputMode="decimal"
                placeholder="z. B. 1,5"
                autoFocus
                aria-invalid={errors.hours ? true : undefined}
                aria-describedby={errors.hours ? `${id}-hours-error` : undefined}
              />
              {errors.hours && (
                <p id={`${id}-hours-error`} className="text-xs text-destructive">
                  {errors.hours}
                </p>
              )}
            </div>
          </div>

          <p className="-mt-3 text-xs text-muted-foreground">
            {`Nicht in der Zukunft und nicht nach dem Enddatum (${formatDate(dueDate)}).`}
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-note`}>
              Notiz <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea id={`${id}-note`} name="note" rows={2} maxLength={300} placeholder="Was wurde erledigt?" />
          </div>

          {errors.form && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.form}
            </p>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Abbrechen</DialogClose>
            <Button type="submit">Buchen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
