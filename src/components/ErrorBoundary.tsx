import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/app/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background" dir="rtl">
          <div className="max-w-2xl w-full space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl text-foreground font-medium">مشکلی پیش اومد</h1>
              <p className="text-sm text-foreground/70 leading-relaxed">
                متأسفانه یه خطایی رخ داده. لطفاً صفحه رو رفرش کن یا دوباره امتحان کن.
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={this.handleReload}
                className="rounded-xl min-h-[48px] px-8 bg-primary/80 hover:bg-primary"
              >
                رفرش صفحه
              </Button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 rounded-lg bg-black/20 border border-white/20">
                <div className="text-xs text-foreground/80 font-mono space-y-2">
                  <div className="font-bold text-destructive mb-2">DEV Error Details:</div>
                  <div>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.error.stack && (
                    <div className="mt-2">
                      <strong>Stack:</strong>
                      <pre className="mt-1 text-xs whitespace-pre-wrap break-words">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo && (
                    <div className="mt-2">
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

