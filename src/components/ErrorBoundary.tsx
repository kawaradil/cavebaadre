import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  isComponentLevel?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.isComponentLevel) {
        return (
          <div
            id="component-error-fallback"
            className="w-full p-6 my-3 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in duration-200"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {this.props.fallbackTitle || 'تعذر تحميل هذا القسم بشكل صحيح'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {this.props.fallbackDescription || 'حدث خطأ مؤقت أثناء عرض المحتوى، يمكنك إعادة المحاولة.'}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        );
      }

      return (
        <div
          id="global-error-screen"
          className="min-h-screen w-full bg-[#FAFAF8] dark:bg-[#0B1711] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 font-['Noto_Kufi_Arabic',sans-serif] dir-rtl selection:bg-amber-400 selection:text-slate-950"
        >
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#13251B] border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {this.props.fallbackTitle || 'عذراً، حدث خطأ غير متوقع'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {this.props.fallbackDescription ||
                  'تم التقاط الخطأ وحماية التطبيق من الإغلاق. يمكنك تحديث الصفحة أو إعادة المحاولة لاستكمال التصفح بأمان.'}
              </p>
            </div>

            {this.state.error && process.env.NODE_ENV !== 'production' && (
              <div className="text-right p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[11px] font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>تحديث التطبيق</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
