import { Link } from '@tanstack/react-router'
import { CalendarRange, LayoutGrid, ListTodo, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePlanner } from '@/components/planner/planner-provider'
import { PersonAvatar } from '@/components/planner/person-avatar'

const navItems = [
  { to: '/dashboard', label: 'Aufgaben', icon: ListTodo },
  { to: '/wochenplanung', label: 'Wochenplanung', icon: CalendarRange },
] as const

export function DashboardHeader() {
  const { people, currentUser, setCurrentUserId } = usePlanner()

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl flex-col px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutGrid className="size-4" aria-hidden="true" />
            </span>
            Planwise
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-border py-1 pr-1 pl-1.5 text-sm">
              <PersonAvatar name={currentUser.name} size="xs" />
              <span className="sr-only">Angemeldet als</span>
              <select
                value={currentUser.id}
                onChange={(event) => setCurrentUserId(event.target.value)}
                className="max-w-36 cursor-pointer bg-transparent pr-1 text-sm text-foreground outline-none [&>option]:bg-popover [&>option]:text-popover-foreground"
                title="Angemeldete Person wechseln"
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="ghost" size="sm" render={<Link to="/login" />} nativeButton={false}>
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </div>
        </div>
        <nav aria-label="Hauptnavigation" className="-mb-px flex gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 border-b-2 border-transparent px-3 pb-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: 'border-primary text-foreground', 'aria-current': 'page' }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
