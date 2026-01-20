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

/**
 * Parse contract error messages into user-friendly strings
 */
export function parseContractError(error) {
  const message = error?.message || error?.shortMessage || String(error);

  // Common contract errors
  if (message.includes('PoolInGracePeriod')) {
    return 'Pool is in grace period. Please wait for it to end.';
  }
  if (message.includes('InvalidPoolId')) {
    return 'Invalid pool selected.';
  }
  if (message.includes('NoEntries')) {
    return 'No entries in the pool yet.';
  }
  if (message.includes('InvalidAmount')) {
    return 'Invalid amount entered.';
  }
  if (message.includes('insufficient allowance')) {
    return 'Please approve USDC spending first.';
  }
  if (message.includes('insufficient balance') || message.includes('transfer amount exceeds balance')) {
    return 'Insufficient USDC balance.';
  }
  if (message.includes('user rejected') || message.includes('User denied')) {
    return 'Transaction cancelled by user.';
  }
  if (message.includes('network') || message.includes('Network')) {
    return 'Network error. Please check your connection.';
  }

  // Return shortened version for unknown errors
  if (message.length > 100) {
    return message.slice(0, 100) + '...';
  }

  return message;
}
