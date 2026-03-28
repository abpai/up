import React from 'react'
import PropTypes from 'prop-types'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // eslint-disable-next-line class-methods-use-this
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
          <h1 className="font-display text-display-md text-text-primary mb-3">
            Something went wrong
          </h1>
          <p className="text-text-secondary mb-8 text-center max-w-md text-sm font-body">
            An unexpected error occurred. Please refresh the page to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full border border-surface-border text-text-secondary text-sm font-body hover:border-accent hover:text-accent transition-colors duration-300 active:scale-[0.97]"
          >
            Refresh
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
}

export default ErrorBoundary
