import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-white shadow-[0_14px_30px_color-mix(in_srgb,var(--accent)_24%,transparent)] hover:bg-[var(--accent-strong)]',
  soft: 'border border-line bg-paper-soft text-ink hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]',
  ghost: 'text-muted hover:bg-paper-soft hover:text-ink',
  danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
}

export function Button({ className, variant = 'soft', size = 'md', children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
