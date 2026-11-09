import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/components/planner/planner-provider'
import { STATUS_LABELS, todayIso, type TaskStatus } from '@/lib/tasks'
import { TaskFormDialog } from './task-form-dialog'
import { TaskList } from './task-list'

const statusOrder: TaskStatus[] = ['offen', 'in-bearbeitung', 'erledigt']

export function TaskBoard() {
  const { tasks, addTask } = usePlanner()

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Alle Aufgaben deiner Projekte auf einen Blick.</p>
        </div>
        <TaskFormDialog
          trigger={<Button />}
          heading="Neue Aufgabe"
          description="Lege eine Aufgabe mit Titel, Beschreibung, Bearbeitungsdauer und Enddatum an. Du wirst automatisch verantwortlich."
          submitLabel="Aufgabe erstellen"
          minDate={todayIso()}
          minDateReason="keine Termine in der Vergangenheit"
          onSubmit={(values) => {
            addTask(values)
            toast.success('Aufgabe erstellt.')
          }}
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          Neue Aufgabe
        </TaskFormDialog>
      </div>

      <dl className="grid grid-cols-3 gap-4">
        {statusOrder.map((status) => (
          <div key={status} className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
            <dt className="text-sm text-muted-foreground">{STATUS_LABELS[status]}</dt>
            <dd className="text-2xl font-semibold tabular-nums text-card-foreground">
              {tasks.filter((task) => task.status === status).length}
            </dd>
          </div>
        ))}
      </dl>

      <TaskList tasks={tasks} />
    </>
  )
}
