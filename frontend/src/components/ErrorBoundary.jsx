import { Component } from 'react';

/**
 * Error Boundary component to catch React rendering errors
 * Displays a fallback UI when a child component crashes
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="nes-container is-rounded is-error">
            <h2 className="error-title">Oops! Something went wrong</h2>
            <p className="error-message">
              The app encountered an unexpected error.
            </p>
            <p className="error-details">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <div className="error-actions">
              <button
                className="nes-btn is-primary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                className="nes-btn"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}