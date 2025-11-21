import React from 'react'

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }>{
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center text-sm text-zinc-400">
            <div className="text-white mb-2">Something went wrong</div>
            <div className="break-all">{String(this.state.error)}</div>
          </div>
        </div>
      )
    }
    return this.props.children as any
  }
}