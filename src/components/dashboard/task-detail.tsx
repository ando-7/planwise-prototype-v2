import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Task } from '@/lib/tasks'
import { ContributorsCard } from './contributors-card'
import { ProgressCard } from './progress-card'
import { SubtaskPanel } from './subtask-panel'
import { BookingHistory, PlanList } from './time-tables'

/** Detailansicht einer Aufgabe: Fortschritt, Mitwirkende, Subaufgaben, Buchungen und Planzeiten. */
export function TaskDetail({ id, task }: { id: string; task: Task }) {
  const bookingCount = task.bookings.length + task.subtasks.reduce((n, s) => n + s.bookings.length, 0)
  const planCount = task.plans.length + task.subtasks.reduce((n, s) => n + s.plans.length, 0)

  return (
    <div id={id} className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <ProgressCard task={task} />
        <ContributorsCard task={task} />
      </div>

      <Tabs defaultValue="subtasks" className="flex flex-col gap-3">
        <TabsList className="self-start">
          <TabsTrigger value="subtasks">Subaufgaben ({task.subtasks.length})</TabsTrigger>
          <TabsTrigger value="bookings">Zeitbuchungen ({bookingCount})</TabsTrigger>
          <TabsTrigger value="plans">Planzeiten ({planCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="subtasks" className="mt-0">
          <SubtaskPanel id={`${id}-subtasks`} task={task} />
        </TabsContent>
        <TabsContent value="bookings" className="mt-0">
          <BookingHistory task={task} />
        </TabsContent>
        <TabsContent value="plans" className="mt-0">
          <PlanList task={task} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
