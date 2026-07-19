export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

export type AppErrorContext = {
  scope: string
  operation?: string
  code?: string
  severity?: AppErrorSeverity
  fallbackMessage?: string
  userMessage?: string
  metadata?: Record<string, unknown>
}

export class AppError extends Error {
  readonly id: string
  readonly code: string
  readonly severity: AppErrorSeverity
  readonly userMessage: string
  readonly context?: AppErrorContext

  constructor(message: string, options: Omit<AppErrorContext, 'fallbackMessage'> & { cause?: unknown } = { scope: 'app' }) {
    super(message, { cause: options.cause })
    this.name = 'AppError'
    this.id = createErrorId()
    this.code = options.code ?? 'app.unexpected_error'
    this.severity = options.severity ?? 'error'
    this.userMessage = options.userMessage ?? message
    this.context = options
  }
}

export function getErrorMessage(error: unknown, fallbackMessage = 'Ocurrio un error inesperado'): string {
  return normalizeAppError(error, { scope: 'app', fallbackMessage }).userMessage
}

export function reportAppError(error: unknown, context: AppErrorContext): AppError {
  const appError = normalizeAppError(error, context)
  const payload = {
    id: appError.id,
    code: appError.code,
    scope: appError.context?.scope ?? context.scope,
    operation: appError.context?.operation ?? context.operation,
    severity: appError.severity,
    metadata: appError.context?.metadata ?? context.metadata,
    cause: appError.cause,
  }

  if (appError.severity === 'fatal' || appError.severity === 'error') {
    console.error(appError.message, payload)
  } else if (appError.severity === 'warning') {
    console.warn(appError.message, payload)
  } else {
    console.info(appError.message, payload)
  }

  return appError
}

export function installGlobalErrorHandlers(onError?: (error: AppError) => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleWindowError = (event: ErrorEvent) => {
    const error = reportAppError(event.error ?? event.message, {
      scope: 'window',
      operation: 'error',
      severity: 'fatal',
      metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    })

    onError?.(error)
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = reportAppError(event.reason, {
      scope: 'window',
      operation: 'unhandledrejection',
      severity: 'error',
    })

    onError?.(error)
  }

  window.addEventListener('error', handleWindowError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    window.removeEventListener('error', handleWindowError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}

function normalizeAppError(error: unknown, context: AppErrorContext): AppError {
  if (error instanceof AppError) {
    return error
  }

  const message = getRawErrorMessage(error, context.fallbackMessage ?? 'Ocurrio un error inesperado')

  return new AppError(message, {
    scope: context.scope,
    operation: context.operation,
    code: context.code,
    severity: context.severity,
    userMessage: context.userMessage ?? message,
    metadata: context.metadata,
    cause: error,
  })
}

function getRawErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallbackMessage
}

function createErrorId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `error-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
