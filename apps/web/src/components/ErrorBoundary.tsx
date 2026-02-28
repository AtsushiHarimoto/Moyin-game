import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className="flex min-h-screen items-center justify-center p-8"
          style={{ color: 'var(--ui-text)' }}
        >
          <div
            className="w-full max-w-[520px] rounded-xl border p-8 text-center"
            style={{
              background: 'var(--ui-panel-glass)',
              borderColor: 'var(--ui-panel-glass-border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          >
            <div
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl font-bold"
              style={{
                borderColor: 'var(--ui-danger, #ef4444)',
                color: 'var(--ui-danger, #ef4444)',
                background: 'color-mix(in srgb, var(--ui-danger, #ef4444) 12%, transparent)',
              }}
            >
              !
            </div>
            <h1 className="mb-1.5 text-2xl font-bold">Something went wrong</h1>
            <p className="mb-5" style={{ color: 'var(--ui-muted)' }}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              className="rounded-full border border-transparent px-5 py-2.5 font-semibold transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--ui-primary)',
                color: 'var(--ui-inverse, #fff)',
              }}
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
