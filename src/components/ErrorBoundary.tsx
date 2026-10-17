import React, { Component, ErrorInfo, ReactNode } from "react";

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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in React tree:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem("app-locale");
      localStorage.removeItem("app-nav-position");
    } catch (e) {
      console.error(e);
    }
    window.location.href = "/";
  };

  private handleClearAllAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => reg.unregister());
        });
      }
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div dir="rtl" className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <h1 className="text-2xl font-bold text-white">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              تعذر تحميل الصفحة بشكل صحيح. تم حماية التطبيق من الشاشة البيضاء.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-right overflow-x-auto text-xs text-red-300 font-mono max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition cursor-pointer"
              >
                إعادة المحاولة والعودة للرئيسية
              </button>
              <button
                onClick={this.handleClearAllAndReload}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition cursor-pointer"
              >
                مسح الذاكرة المؤقتة وإعادة التحميل
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
