import { useState } from 'react'
import { CalendarDays, ChevronRight, Clock, ListChecks, Pencil, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/components/planner/planner-provider'
import {
  deleteBlockReason,
  formatDate,
  isAssigned,
  isOwner,
  latestSubtaskDueDate,
  taskProgress,
  type Task,
} from '@/lib/tasks'
import { cn } from '@/lib/utils'
import { BookingDialog } from './booking-dialog'
import { DeleteTaskButton } from './delete-task-button'
import { ProgressBar, StatusBadge } from './task-badges'
import { TaskDetail } from './task-detail'
import { TaskFormDialog } from './task-form-dialog'

export const taskColumns = 'md:grid-cols-[1fr_8.5rem_9rem_8.5rem_6.5rem]'

export function TaskRow({ task }: { task: Task }) {
  const { currentUser, personName, editTask, deleteTask } = usePlanner()
  const [expanded, setExpanded] = useState(false)
  const panelId = `details-${task.id}`
  const doneCount = task.subtasks.filter((subtask) => subtask.status === 'erledigt').length
  const latestSubtaskDate = latestSubtaskDueDate(task.subtasks)
  const owner = isOwner(task, currentUser.id)
  const canBook = isAssigned(task, currentUser.id)

  return (
    <li className="relative flex flex-col">
      <div className={cn('flex flex-col gap-3 px-5 py-4 md:grid md:items-center md:gap-4', taskColumns)}>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="-mx-2 flex min-w-0 items-start gap-2 rounded-md px-2 py-1 pr-28 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring md:pr-2"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-card-foreground">{task.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {(task.description ?? task.project) && <span className="truncate">{task.description ?? task.project}</span>}
              <span className="flex shrink-0 items-center gap-1">
                <User className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Verantwortlich: </span>
                {personName(task.ownerId)}
              </span>
              <span className="shrink-0 tabular-nums">{task.duration} h</span>
              {task.subtasks.length > 0 && (
                <span className="flex shrink-0 items-center gap-1 tabular-nums">
                  <ListChecks className="size-3.5" aria-hidden="true" />
                  {doneCount}/{task.subtasks.length}
                  <span className="sr-only"> Subaufgaben erledigt</span>
                </span>
              )}
            </span>
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-3 md:contents">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4 md:hidden" aria-hidden="true" />
            <span className="sr-only">Enddatum: </span>
            <time dateTime={task.dueDate}>{formatDate(task.dueDate)}</time>
          </p>
          <ProgressBar value={taskProgress(task)} className="w-32 md:w-full" />
          <div>
            <StatusBadge status={task.status} />
          </div>
        </div>
        <div className="absolute top-3 right-3 flex items-center md:static md:justify-end">
          {canBook && (
            <BookingDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Zeit auf „${task.title}“ buchen`}
                  title="Zeit buchen"
                />
              }
              target={{ taskId: task.id }}
              itemTitle={task.title}
              dueDate={task.dueDate}
            >
              <Clock aria-hidden="true" />
            </BookingDialog>
          )}
          {owner && (
            <>
              <TaskFormDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Aufgabe „${task.title}“ bearbeiten`}
                    title="Bearbeiten"
                  />
                }
                heading="Aufgabe bearbeiten"
                description="Ändere Titel, Beschreibung, Dauer, Enddatum, Status oder Fertigstellungsgrad."
                submitLabel="Speichern"
                showStatus
                showProgress={task.subtasks.length === 0}
                progressNote="Berechnet aus Subaufgaben."
                initialValues={task}
                minDate={latestSubtaskDate}
                minDateReason="spätestes Enddatum einer Subaufgabe"
                onSubmit={(values) => {
                  const error = editTask(task.id, values)
                  if (error) toast.error(error)
                }}
              >
                <Pencil aria-hidden="true" />
              </TaskFormDialog>
              <DeleteTaskButton
                title={task.title}
                blockedReason={deleteBlockReason(task)}
                onConfirm={() => {
                  const error = deleteTask(task.id)
                  if (error) toast.error(error)
                  else toast.success('Aufgabe gelöscht.')
                }}
              />
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 md:pl-11">
          <TaskDetail id={panelId} task={task} />
        </div>
      )}
    </li>
  )
}
