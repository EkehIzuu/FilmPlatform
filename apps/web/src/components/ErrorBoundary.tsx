import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { error: Error | null; componentStack: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Izora] UI error", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      const { error, componentStack } = this.state;
      const isDev = Boolean(import.meta.env?.DEV);
      return (
        <main className="auth-page">
          <div className="page" style={{ maxWidth: "560px", margin: "0 auto" }}>
            <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
            <p className="muted small">{error.message}</p>
            {isDev ? (
              <pre
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  maxHeight: "320px",
                  overflow: "auto",
                  fontSize: "0.72rem",
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                {error.stack || String(error)}
                {componentStack ? `\n\nComponent stack:${componentStack}` : ""}
              </pre>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: "1rem" }}
              onClick={() => {
                this.setState({ error: null, componentStack: null });
                window.location.href = "/";
              }}
            >
              Reload app
            </button>
            <p className="small" style={{ marginTop: "1rem" }}>
              <Link to="/">Home</Link>
            </p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
