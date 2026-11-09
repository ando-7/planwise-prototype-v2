
import { Link, useNavigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Mode = 'login' | 'register'

type Errors = Partial<Record<'email' | 'password' | 'confirmPassword', string>>

const content = {
  login: {
    title: 'Willkommen zurück',
    description: 'Melde dich an, um zu deinen Aufgaben zu gelangen.',
    submit: 'Anmelden',
    switchPrompt: 'Noch kein Konto?',
    switchLabel: 'Konto erstellen',
    switchHref: '/register',
  },
  register: {
    title: 'Konto erstellen',
    description: 'Plane Aufgaben und Zeiten deines Teams in wenigen Minuten.',
    submit: 'Konto erstellen',
    switchPrompt: 'Bereits ein Konto?',
    switchLabel: 'Anmelden',
    switchHref: '/login',
  },
} as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(mode: Mode, data: FormData): Errors {
  const email = String(data.get('email') ?? '').trim()
  const password = String(data.get('password') ?? '')
  const errors: Errors = {}

  if (!email) errors.email = 'Bitte eine E-Mail-Adresse eingeben.'
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.'

  if (!password) errors.password = 'Bitte ein Passwort eingeben.'
  else if (mode === 'register' && password.length < 8)
    errors.password = 'Das Passwort muss mindestens 8 Zeichen lang sein.'

  if (mode === 'register') {
    const confirmPassword = String(data.get('confirmPassword') ?? '')
    if (confirmPassword !== password) errors.confirmPassword = 'Die Passwörter stimmen nicht überein.'
  }

  return errors
}

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = content[mode]
  const id = useId()
  const [errors, setErrors] = useState<Errors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const navigate = useNavigate()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(mode, new FormData(event.currentTarget))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setNotice(null)
      return
    }
    setNotice(mode === 'login' ? 'Anmeldung läuft …' : 'Konto wird erstellt …')
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field id={`${id}-email`} label="E-Mail" error={errors.email}>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@firma.at"
            className="h-10"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
          />
        </Field>

        <Field
          id={`${id}-password`}
          label="Passwort"
          error={errors.password}
        >
          <div className="relative">
            <Input
              id={`${id}-password`}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'Mindestens 8 Zeichen' : '••••••••'}
              className="h-10 pr-10"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? `${id}-password-error` : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        {mode === 'register' && (
          <Field id={`${id}-confirm`} label="Passwort bestätigen" error={errors.confirmPassword}>
            <Input
              id={`${id}-confirm`}
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              className="h-10"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? `${id}-confirm-error` : undefined}
            />
          </Field>
        )}

        <Button type="submit" className="h-10 w-full">
          {copy.submit}
        </Button>

        <p role="status" aria-live="polite" className="min-h-5 text-center text-sm text-muted-foreground">
          {notice}
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {copy.switchPrompt}{' '}
        <Link
          to={copy.switchHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  )
}

function Field({
  id,
  label,
  error,
  action,
  children,
}: {
  id: string
  label: string
  error?: string | undefined
  action?: React.ReactNode | undefined
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
