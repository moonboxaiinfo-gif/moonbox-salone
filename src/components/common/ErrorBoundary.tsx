import React, { Component, ErrorInfo, ReactNode } from 'react';

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
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Moonbox Salon Uncaught Error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      // Clear corrupt sessions or storage if any
      sessionStorage.clear();
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleHardReset = () => {
    try {
      const theme = localStorage.getItem('moonbox_salon_theme_mode');
      localStorage.clear();
      if (theme) localStorage.setItem('moonbox_salon_theme_mode', theme);
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#10061A] text-[#F3C9AB] flex items-center justify-center p-6 antialiased">
          <div className="max-w-md w-full bg-[#1B0C2D] border border-[#381A54] rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
              !
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Moonbox Salon Recovered
              </h1>
              <p className="text-xs text-[#DE9E74]/90 leading-relaxed">
                An unexpected interface issue occurred. You can restore the application safely below.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 rounded-xl bg-[#10061A] border border-[#2D1344] text-left">
                <p className="text-[11px] font-mono text-rose-300 break-words">
                  {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5 text-xs font-bold">
              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#DE9E74] to-[#C78558] text-[#1B0C2D] font-extrabold hover:opacity-95 transition-all shadow-md"
              >
                Return to Moonbox Landing Page
              </button>

              <button
                onClick={this.handleHardReset}
                className="w-full py-2.5 rounded-xl bg-[#28133E] text-slate-300 hover:text-white border border-[#381A54] transition-colors"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
