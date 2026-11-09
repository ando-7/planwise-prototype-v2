import { cn } from '@/lib/utils'

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function PersonAvatar({ name, size = 'sm', className }: { name: string; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        size === 'xs' && 'size-5 text-[0.6rem]',
        size === 'sm' && 'size-7 text-[0.7rem]',
        size === 'md' && 'size-9 text-xs',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
