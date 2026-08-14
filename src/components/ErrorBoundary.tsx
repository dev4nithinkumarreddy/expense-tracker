import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Oops, something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            The application encountered an unexpected error. Please try refreshing the page.
          </p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCcw className="w-4 h-4" /> Refresh Page
            </Button>
          </div>
          {import.meta.env.MODE === 'development' && (
            <details className="mt-4 text-left p-4 bg-black/10 rounded-lg text-xs overflow-auto max-w-full">
              <summary className="font-semibold cursor-pointer mb-2 text-foreground/80">Error Details</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
