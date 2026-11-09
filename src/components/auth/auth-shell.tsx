import { CheckCircle2, LayoutGrid } from 'lucide-react'

const highlights = [
  'Aufgaben und Unteraufgaben übersichtlich verwalten',
  'Fristen und Fertigstellungsgrad im Blick behalten',
  'Alle Projektinformationen an einem Ort',
]

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" aria-hidden="true" />
          </span>
          Planwise
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      <aside className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <p className="text-sm font-medium opacity-80">Aufgabenplanung und Zeiterfassung</p>
        <div className="flex flex-col gap-8">
          <h2 className="text-balance text-4xl font-semibold leading-tight">
            Projekte pünktlich abschließen – das ganze Team auf demselben Stand.
          </h2>
          <ul className="flex flex-col gap-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-base opacity-90">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-70">{'© 2026 Planwise'}</p>
      </aside>
    </main>
  )
}
