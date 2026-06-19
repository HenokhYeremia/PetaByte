import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mb-4 text-4xl">⚠</div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Something went wrong
            </h2>
            <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <p className="mb-6 text-xs text-zinc-400 dark:text-zinc-500">
              Check the console for more details.
            </p>
            <Button variant="secondary" onClick={this.handleRetry}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
