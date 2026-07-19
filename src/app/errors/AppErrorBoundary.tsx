import { Component, type ErrorInfo, type ReactNode } from 'react'
import { translate } from '@/app/i18n/translations'
import { getErrorMessage, reportAppError } from '@/shared/lib/appError'
import { Button } from '@/shared/ui/Button'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  errorMessage: string | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorMessage: null,
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { errorMessage: getErrorMessage(error) }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    reportAppError(error, {
      scope: 'react',
      operation: 'render',
      severity: 'fatal',
      metadata: { componentStack: errorInfo.componentStack },
    })
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <main className="app-shell-bg grid min-h-svh place-items-center px-6 text-center text-[var(--app-text)]">
          <div className="animate-fade-up max-w-md rounded-[2rem] border border-white/12 bg-[var(--app-panel)] p-8 shadow-[0_32px_90px_rgb(0_0_0_/_0.3)]">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--app-muted)]">{translate('es', 'appName')}</p>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">Error inesperado</h1>
            <p className="mt-3 text-sm leading-6 text-red-100">{this.state.errorMessage}</p>
            <Button className="mt-5" onClick={() => window.location.reload()} variant="primary">
              {translate('es', 'retry')}
            </Button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
