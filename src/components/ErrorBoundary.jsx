import { Component } from "react";
import { Link } from "react-router-dom";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Frontend render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="container page-pad">
          <div className="empty-state-card">
            <span className="eyebrow">Something went wrong</span>
            <h1>The page could not be loaded</h1>
            <p>Refresh the page or go back to the shop while we keep the app stable.</p>
            <div className="hero-actions center-actions">
              <Link to="/home" className="primary-button">Go to home</Link>
              <Link to="/shop" className="secondary-button">Open shop</Link>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
