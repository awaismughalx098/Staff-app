import { Component } from "react";

import logo from "../../assets/logo.webp";

/* The app's last line of defence. A render-time crash anywhere in the tree —
 * an undefined field, a bad map, a component that threw — would otherwise blank
 * the whole page to white. This catches it and shows a calm, branded recovery
 * screen with a way forward, and logs the real error for developers only.
 *
 * It sits ABOVE the router on purpose, so even a crash during routing is caught;
 * that means it can't use router navigation, so the buttons use the browser
 * directly (a full reload is also the most reliable way to clear a wedged state).
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    /* Developers see the full picture in the console; users never do. A real
       logging service (Sentry, etc.) would hook in here. */
    console.error("[ErrorBoundary] Unhandled render error:", error, info);
  }

  handleRetry = () => {
    /* Reset first in case the failure was transient; a reload guarantees a
       clean slate if the same error would immediately recur. */
    this.setState({ hasError: false });
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-dvh w-full flex-col items-center justify-center bg-bg px-6 text-center text-content">
        <img
          src={logo}
          alt="Let's Goo Transit"
          className="h-11 w-auto object-contain"
        />

        <svg
          className="mt-10 h-14 w-14 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>

        <h1 className="mt-6 font-display text-[26px] font-extrabold leading-tight">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-content-muted">
          We&apos;re having trouble loading this page. Please try again — if it
          keeps happening, head back home and start fresh.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 font-display text-sm font-bold text-white shadow-glass transition-transform active:scale-95"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={this.handleHome}
            className="glass-surface inline-flex h-12 items-center gap-2 rounded-full px-7 font-display text-sm font-bold text-content transition-transform active:scale-95"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
