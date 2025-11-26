/**
 * Error Boundary Component
 *
 * Catches React component errors and displays a user-friendly fallback UI.
 * Prevents the entire app from crashing due to errors in child components.
 *
 * Usage:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */

import { Button, Card, Flex, Text } from '@radix-ui/themes';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
  /** Optional error handler callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary class component
 * (Must be a class component - Error Boundaries don't work with hooks yet)
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  /**
   * Log error details for debugging
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send error to analytics/monitoring service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  /**
   * Reset error boundary state
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the page (as last resort)
   */
  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
          <Card size="4" className="max-w-2xl w-full">
            <Flex direction="column" gap="4">
              {/* Error icon */}
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-white">
                  Oops! Something went wrong
                </h2>
              </div>

              {/* Error message */}
              <Text size="3" className="text-slate-300 text-center">
                We encountered an unexpected error. Don't worry, your progress is saved.
              </Text>

              {/* Error details (collapsed by default) */}
              <details className="bg-slate-800 rounded p-4">
                <summary className="cursor-pointer text-slate-400 hover:text-white">
                  🔍 Error Details (for developers)
                </summary>
                <div className="mt-4 text-xs font-mono text-red-400 overflow-auto max-h-48">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error?.message}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </div>
              </details>

              {/* Actions */}
              <Flex gap="3" justify="center" className="mt-4">
                <Button
                  variant="soft"
                  size="3"
                  onClick={this.handleReset}
                >
                  🔄 Try Again
                </Button>
                <Button
                  variant="solid"
                  size="3"
                  onClick={this.handleReload}
                >
                  🔃 Reload Page
                </Button>
              </Flex>

              {/* Help text */}
              <Text size="2" className="text-slate-500 text-center mt-2">
                If this problem persists, please contact support or{' '}
                <a
                  href="https://github.com/your-repo/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  report an issue
                </a>
              </Text>
            </Flex>
          </Card>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

/**
 * Export as default for convenience
 */
export default ErrorBoundary;

/**
 * Usage Examples:
 *
 * Basic usage:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * With custom error handler:
 * <ErrorBoundary onError={(error, errorInfo) => {
 *   // Send to analytics
 *   analytics.track('error', { error: error.message });
 * }}>
 *   <App />
 * </ErrorBoundary>
 *
 * With custom fallback:
 * <ErrorBoundary fallback={<div>Custom error UI</div>}>
 *   <App />
 * </ErrorBoundary>
 */
