import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4 px-6 text-center" dir="rtl">
          <p className="text-xl font-semibold text-foreground">משהו השתבש</p>
          <p className="text-muted-foreground text-sm">אירעה שגיאה בלתי צפויה</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base"
          >
            לחץ לרענון
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}