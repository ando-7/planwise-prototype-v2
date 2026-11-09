import { CalendarDays, Clock, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/components/planner/planner-provider'
import { deleteBlockReason, formatDate, formatHours, isAssigned, isOwner, sumHours, type Task } from '@/lib/tasks'
import { BookingDialog } from './booking-dialog'
import { DeleteTaskButton } from './delete-task-button'
import { ProgressBar, StatusBadge } from './task-badges'
import { TaskFormDialog } from './task-form-dialog'

export function SubtaskPanel({ id, task }: { id: string; task: Task }) {
  const { currentUser, addSubtask, editSubtask, toggleSubtask, deleteSubtask } = usePlanner()
  const { subtasks } = task
  const canManage = isOwner(task, currentUser.id)
  const canBook = isAssigned(task, currentUser.id)
  const doneCount = subtasks.filter((subtask) => subtask.status === 'erledigt').length
  const deadlineReason = 'Enddatum der Hauptaufgabe'

  const report = (error: string | null, success?: string) => {
    if (error) toast.error(error)
    else if (success) toast.success(success)
  }

  return (
    <div id={id} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subtasks.length === 0 ? 'Noch keine Subaufgabe.' : `${doneCount}/${subtasks.length} erledigt`}
        </p>
        {canManage && (
          <TaskFormDialog
            trigger={<Button type="button" variant="outline" size="sm" />}
            heading="Neue Subaufgabe"
            description={`Wird zu „${task.title}“ hinzugefügt.`}
            submitLabel="Hinzufügen"
            maxDate={task.dueDate}
            maxDateReason={deadlineReason}
            onSubmit={(values) => report(addSubtask(task.id, values), 'Subaufgabe hinzugefügt.')}
          >
            <Plus aria-hidden="true" />
            Subaufgabe hinzufügen
          </TaskFormDialog>
        )}
      </div>

      {subtasks.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" aria-label={`Subaufgaben von ${task.title}`}>
          {subtasks.map((subtask) => {
            const done = subtask.status === 'erledigt'
            const checkboxId = `${id}-${subtask.id}`
            const booked = sumHours(subtask.bookings)
            return (
              <li key={subtask.id} className="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={done}
                    disabled={!canManage}
                    onChange={() => report(toggleSubtask(task.id, subtask.id))}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                  />
                  <label htmlFor={checkboxId} className="flex min-w-0 cursor-pointer flex-col gap-0.5">
                    <span className={done ? 'text-sm text-muted-foreground line-through' : 'text-sm text-card-foreground'}>
                      {subtask.title}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {subtask.description && <span className="truncate">{subtask.description}</span>}
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Enddatum: </span>
                        <time dateTime={subtask.dueDate}>{formatDate(subtask.dueDate)}</time>
                      </span>
                      <span className="tabular-nums">{subtask.duration} h Dauer</span>
                      {booked > 0 && <span className="tabular-nums">{formatHours(booked)} gebucht</span>}
                    </span>
                  </label>
                </div>
                <div className="flex items-center gap-3 pl-7 lg:pl-0">
                  <ProgressBar value={subtask.progress} className="w-28" />
                  <StatusBadge status={subtask.status} />
                  <div className="ml-auto flex items-center lg:ml-0">
                    {canBook && (
                      <BookingDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Zeit auf „${subtask.title}“ buchen`}
                          />
                        }
                        target={{ taskId: task.id, subtaskId: subtask.id }}
                        itemTitle={subtask.title}
                        dueDate={subtask.dueDate}
                      >
                        <Clock aria-hidden="true" />
                      </BookingDialog>
                    )}
                    {canManage && (
                      <>
                        <TaskFormDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Subaufgabe „${subtask.title}“ bearbeiten`}
                            />
                          }
                          heading="Subaufgabe bearbeiten"
                          description={`Gehört zu „${task.title}“.`}
                          submitLabel="Speichern"
                          showStatus
                          showProgress
                          initialValues={subtask}
                          maxDate={task.dueDate}
                          maxDateReason={deadlineReason}
                          onSubmit={(values) => report(editSubtask(task.id, subtask.id, values))}
                        >
                          <Pencil aria-hidden="true" />
                        </TaskFormDialog>
                        <DeleteTaskButton
                          kind="Subaufgabe"
                          title={subtask.title}
                          blockedReason={deleteBlockReason(subtask)}
                          onConfirm={() => report(deleteSubtask(task.id, subtask.id), 'Subaufgabe gelöscht.')}
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
