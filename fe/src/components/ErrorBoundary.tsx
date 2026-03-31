import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Custom fallback UI — if omitted the built-in error card is shown */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary — wraps page/component trees.
 * Catches synchronous render errors and displays a recovery screen instead of a blank page.
 *
 * NOTE: This does NOT catch errors inside async event handlers or Promises.
 * Those should be handled with try/catch in the async code and stored in state.
 */
export class ErrorBoundary extends Component<Props, State> {
  // React 19: initialise state as a class field, not in the constructor
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // In production send to a monitoring service (Sentry, Datadog…)
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;

    if (hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-100 shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Có lỗi xảy ra</h2>
            <p className="text-sm text-gray-500 mb-6">
              Trang này gặp lỗi không mong muốn. Hãy thử tải lại hoặc quay về trang chủ.
            </p>

            {error && (
              <details className="mb-6 text-left">
                <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                  Chi tiết lỗi
                </summary>
                <pre className="mt-2 text-xs bg-gray-50 rounded-xl p-3 overflow-auto text-red-600 border border-gray-100">
                  {error.message}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Thử lại
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex-1 py-2.5 px-4 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-emerald-900/30"
              >
                Trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
