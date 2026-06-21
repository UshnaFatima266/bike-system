import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useShop } from "../store/ShopContext";

function PosLoginPage() {
  const { currentUser, authError, loginPosUser } = useShop();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (currentUser?.role === "cashier") {
    return <Navigate to="/pos" replace />;
  }

  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    const result = await loginPosUser(form);
    setSubmitting(false);

    if (result.ok) {
      navigate("/pos", { replace: true });
      return;
    }

    setMessage(result.message);
  };

  return (
    <main className="pos-login-page">
      <section className="pos-login-shell">
        <div className="pos-login-aside">
          <span className="eyebrow">BikeX POS</span>
          <h1>Counter sales workspace</h1>
          <p>POS managers can search products, complete shop sales, print receipts, handle returns, and keep inventory synced with the online store.</p>
          <div className="pos-login-points">
            <span>Fast product search</span>
            <span>Live stock updates</span>
            <span>Daily sales summary</span>
          </div>
        </div>

        <form className="panel-card auth-form pos-login-card" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Staff login</span>
            <h2>POS manager access</h2>
            <p>Use the cashier account created by admin.</p>
          </div>
          <input
            type="email"
            placeholder="POS email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
          {(message || authError) ? <p className="form-error">{message || authError}</p> : null}
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Opening POS..." : "Open POS dashboard"}
          </button>
          <Link className="ghost-link" to="/login">Customer or admin login</Link>
        </form>
      </section>
    </main>
  );
}

export default PosLoginPage;
