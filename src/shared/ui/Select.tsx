import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  value: string
  onValueChange(value: string): void
  options: SelectOption[]
  placeholder?: string
  variant?: 'dark' | 'light'
  className?: string
  contentClassName?: string
  ariaLabel?: string
}

export function Select({ value, onValueChange, options, placeholder, variant = 'dark', className, contentClassName, ariaLabel }: SelectProps) {
  const isLight = variant === 'light'

  return (
    <SelectPrimitive.Root onValueChange={onValueChange} value={value}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-xl border px-3 text-sm font-semibold shadow-[inset_0_1px_rgb(255_255_255_/_0.04)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50',
          isLight ? 'border-line bg-paper-soft text-ink hover:bg-paper' : 'border-white/10 bg-[#0d1d17] text-white hover:bg-white/8',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="shrink-0 text-[#8fa89b]" size={15} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            'z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-xl border shadow-[0_18px_60px_rgb(0_0_0_/_0.38)]',
            isLight ? 'border-line bg-paper text-ink' : 'border-white/10 bg-[#10231d] text-white',
            contentClassName,
          )}
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className={cn(
                  'relative flex h-8 cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-3 text-sm font-semibold outline-none transition data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  isLight ? 'data-[highlighted]:bg-paper-soft data-[highlighted]:text-ink' : 'data-[highlighted]:bg-white/10 data-[highlighted]:text-white',
                )}
                key={option.value}
                value={option.value}
              >
                <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
