import { useId } from 'react'
import { ChevronDown, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePlanner } from '@/components/planner/planner-provider'
import { PersonAvatar } from '@/components/planner/person-avatar'
import { formatHours, isOwner, sumHours, type Task } from '@/lib/tasks'
import { cn } from '@/lib/utils'

/** Mitwirkende verwalten (FA-AM-5, KR-2, KR-7). */
export function ContributorsCard({ task }: { task: Task }) {
  const { people, currentUser, personName, addContributor, removeContributor } = usePlanner()
  const id = useId()
  const canManage = isOwner(task, currentUser.id)
  const ownerName = personName(task.ownerId)

  function handleAdd(personId: string) {
    const error = addContributor(task.id, personId)
    if (error) toast.error(error)
    else toast.success(`${personName(personId)} wirkt jetzt mit.`)
  }

  function handleRemove(personId: string) {
    const error = removeContributor(task.id, personId)
    if (error) toast.error(error)
    else toast.success(`${personName(personId)} wurde entfernt.`)
  }

  const openPlanHours = (personId: string) =>
    sumHours([...task.plans, ...task.subtasks.flatMap((s) => s.plans)].filter((p) => p.personId === personId))

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${id}-heading`} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mitwirkende
        </h3>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <UserPlus aria-hidden="true" />
              Mitwirkenden hinzufügen
              <ChevronDown aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Registrierte Personen</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {people.map((person) => {
                const isResponsible = person.id === task.ownerId
                const already = task.contributorIds.includes(person.id)
                return (
                  <DropdownMenuItem
                    key={person.id}
                    disabled={isResponsible || already}
                    onSelect={() => handleAdd(person.id)}
                    className="gap-2"
                  >
                    <PersonAvatar name={person.name} size="xs" />
                    <span className="flex-1 truncate">{person.name}</span>
                    {(isResponsible || already) && (
                      <span className="text-[0.7rem] text-muted-foreground">
                        {isResponsible ? 'verantwortlich' : 'bereits dabei'}
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-3">
        <PersonAvatar name={ownerName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{ownerName}</span>
          <span className="text-xs text-muted-foreground">Verantwortlich</span>
        </div>
      </div>

      {task.contributorIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine mitwirkenden Personen.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Mitwirkende Personen">
          {task.contributorIds.map((personId) => {
            const name = personName(personId)
            const planned = openPlanHours(personId)
            return (
              <li key={personId} className="flex items-center gap-3">
                <PersonAvatar name={name} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-foreground">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    Mitwirkend{planned > 0 ? ` · ${formatHours(planned)} geplant` : ''}
                  </span>
                </div>
                {canManage && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`${name} entfernen`}
                        />
                      }
                    >
                      <X aria-hidden="true" />
                      Entfernen
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{`${name} entfernen?`}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {planned > 0
                            ? `Bisherige Zeitbuchungen bleiben erhalten. Die geplanten ${formatHours(planned)} werden ${ownerName} zugeordnet und als „neu zuzuweisen“ markiert.`
                            : 'Bisherige Zeitbuchungen bleiben in der Historie der Aufgabe erhalten.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleRemove(personId)}>
                          Entfernen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
