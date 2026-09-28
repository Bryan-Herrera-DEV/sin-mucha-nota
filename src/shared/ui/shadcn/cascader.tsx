// Adapted from Ademking/cascader-shadcn (MIT). See THIRD_PARTY_NOTICES.md.
import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export interface CascaderOption {
  value: string
  label: ReactNode
  textLabel?: string
  disabled?: boolean
  children?: CascaderOption[]
}

type CascaderProps = {
  options: CascaderOption[]
  value: string[]
  onChange(value: string[], selectedOptions: CascaderOption[]): void
  placeholder: string
  disabled?: boolean
  className?: string
  displayRender?(labels: string[], options: CascaderOption[]): ReactNode
}

export function Cascader({ options, value, onChange, placeholder, disabled, className, displayRender }: CascaderProps) {
  const [open, setOpen] = useState(false)
  const [expandedPath, setExpandedPath] = useState<string[]>([])
  const [focus, setFocus] = useState([0, 0])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef(new Map<string, HTMLDivElement>())

  const getSelectedOptions = useCallback((path: string[]) => {
    const selected: CascaderOption[] = []
    let current = options
    for (const val of path) {
      const found = current.find((option) => option.value === val)
      if (!found) break
      selected.push(found)
      current = found.children ?? []
    }
    return selected
  }, [options])

  const columns = [options]
  let current = options
  for (const val of expandedPath) {
    const found = current.find((option) => option.value === val)
    if (!found?.children?.length) break
    columns.push(found.children)
    current = found.children
  }
  const selectedOptions = getSelectedOptions(value)
  const labels = selectedOptions.map((option) => option.textLabel ?? (typeof option.label === 'string' ? option.label : option.value))
  const display = displayRender?.(labels, selectedOptions) ?? labels.join(' / ')

  function focusItem(column: number, index: number) {
    setFocus([column, index])
    requestAnimationFrame(() => {
      columnRefs.current.get(`${column}-${index}`)?.focus()
    })
  }

  function select(option: CascaderOption, column: number) {
    if (option.disabled) return
    const path = [...expandedPath.slice(0, column), option.value]
    if (option.children?.length) {
      setExpandedPath(path)
      focusItem(column + 1, 0)
      requestAnimationFrame(() => scrollContainerRef.current?.scrollTo({ left: scrollContainerRef.current.scrollWidth }))
    } else {
      onChange(path, getSelectedOptions(path))
      setOpen(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent, option: CascaderOption, column: number, index: number) {
    const items = columns[column]
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight', 'ArrowLeft', 'Enter', ' '].includes(event.key)) event.preventDefault()
    if (event.key === 'ArrowDown') focusItem(column, Math.min(index + 1, items.length - 1))
    if (event.key === 'ArrowUp') focusItem(column, Math.max(index - 1, 0))
    if (event.key === 'Home') focusItem(column, 0)
    if (event.key === 'End') focusItem(column, items.length - 1)
    if (event.key === 'Enter' || event.key === ' ' || (event.key === 'ArrowRight' && option.children?.length)) select(option, column)
    if (event.key === 'ArrowLeft' && column > 0) {
      const parentIndex = columns[column - 1].findIndex((item) => item.value === expandedPath[column - 1])
      setExpandedPath(expandedPath.slice(0, column - 1))
      focusItem(column - 1, Math.max(0, parentIndex))
    }
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (nextOpen) {
        setExpandedPath(value.slice(0, -1))
        setFocus([0, Math.max(0, options.findIndex((option) => option.value === value[0]))])
      }
    }}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-label={placeholder} aria-expanded={open} aria-haspopup="listbox" disabled={disabled}
          title={labels.join(' / ')}
          className={cn('flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50', className)}>
          <span className="min-w-0 flex-1 truncate text-left">{display || placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[min(46rem,calc(100vw-2rem))] overflow-hidden p-0"
        onOpenAutoFocus={(event) => { event.preventDefault(); focusItem(focus[0], focus[1]) }}>
        <div ref={scrollContainerRef} role="listbox" aria-label={placeholder} className="flex overflow-x-auto overscroll-contain">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} role="group" aria-label={`${columnIndex + 1}`} className="max-h-64 w-52 shrink-0 overflow-y-auto border-r border-border p-1 last:border-r-0">
              {column.map((option, itemIndex) => (
                <div key={option.value} ref={(element) => {
                  const key = `${columnIndex}-${itemIndex}`
                  if (element) columnRefs.current.set(key, element)
                  else columnRefs.current.delete(key)
                }} role="option" aria-selected={value[columnIndex] === option.value} aria-disabled={option.disabled}
                  aria-expanded={option.children?.length ? expandedPath[columnIndex] === option.value : undefined}
                  tabIndex={focus[0] === columnIndex && focus[1] === itemIndex ? 0 : -1}
                  title={option.textLabel ?? (typeof option.label === 'string' ? option.label : undefined)}
                  className={cn('flex min-h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-secondary focus:bg-secondary focus:ring-2 focus:ring-inset focus:ring-ring',
                    (value[columnIndex] === option.value || expandedPath[columnIndex] === option.value) && 'bg-secondary font-medium', option.disabled && 'pointer-events-none opacity-50')}
                  onClick={() => select(option, columnIndex)} onKeyDown={(event) => handleKeyDown(event, option, columnIndex, itemIndex)}
                  onFocus={() => setFocus([columnIndex, itemIndex])}>
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {!!option.children?.length && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
