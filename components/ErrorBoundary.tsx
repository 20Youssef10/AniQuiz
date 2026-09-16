import { Component, ErrorInfo, ReactNode } from 'react';
import Button from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-anime-dark text-white flex flex-col items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-lg w-full text-center space-y-6">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-gray-300 text-sm mb-6">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Button
              fullWidth
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
            >
              Restart Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
