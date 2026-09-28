import { useCallback, useRef } from 'react'

// Let Radix release the menu's focus scope before mounting the next dialog.
export function useMenuAction() {
  const pendingAction = useRef<(() => void) | null>(null)
  const selectAction = useCallback((action: () => void) => {
    pendingAction.current = action
  }, [])
  const onCloseAutoFocus = useCallback((event: Event) => {
    const action = pendingAction.current
    pendingAction.current = null
    if (!action) return
    event.preventDefault()
    queueMicrotask(action)
  }, [])

  return { selectAction, onCloseAutoFocus }
}
