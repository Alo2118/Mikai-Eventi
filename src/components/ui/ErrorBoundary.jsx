import { Component } from 'react'
import { Button } from './Button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center">
          <div className="bg-red-50 rounded-xl p-8 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Qualcosa è andato storto</h2>
            <p className="text-base text-gray-600 mb-6">
              Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Ricarica pagina
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
