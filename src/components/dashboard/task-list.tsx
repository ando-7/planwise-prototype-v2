import type { Task } from '@/lib/tasks'
import { TaskRow, taskColumns } from './task-row'

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <section aria-labelledby="task-list-heading" className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id="task-list-heading" className="text-sm font-semibold text-card-foreground">
          Aufgaben
        </h2>
        <span className="text-sm text-muted-foreground">{tasks.length} gesamt</span>
      </div>

      <div
        className={`hidden gap-4 border-b border-border px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid ${taskColumns}`}
        aria-hidden="true"
      >
        <span className="pl-6">Titel</span>
        <span>Enddatum</span>
        <span>Fortschritt</span>
        <span>Status</span>
        <span />
      </div>

      {tasks.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted-foreground">
          Keine Aufgaben vorhanden. Lege mit „Neue Aufgabe“ die erste an.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  )
}
