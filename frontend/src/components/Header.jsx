import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useShop } from "../store/ShopContext";

function Header() {
  const { cartCount, currentUser, logoutUser } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");

  const homePath = currentUser?.role === "admin"
    ? "/admin"
    : currentUser?.role === "cashier"
      ? "/pos"
      : "/home";
  const navItems = currentUser?.role === "admin"
    ? [
        { to: "/admin", label: "Dashboard" },
        { to: "/shop", label: "Shop" },
        { to: "/deals", label: "Deals" },
      ]
    : currentUser?.role === "cashier"
      ? [
          { to: "/pos", label: "POS" },
          { to: "/shop", label: "Catalogue" },
        ]
    : [
        { to: homePath, label: "Home" },
        { to: "/shop", label: "Shop" },
        { to: "/deals", label: "Deals" },
        { to: "/about", label: "About" },
        { to: "/contact", label: "Contact" },
      ];

  const visibleSearchTerm = location.pathname === "/shop" && !searchTerm
    ? (searchParams.get("search") ?? "")
    : searchTerm;

  const handleSearch = (event) => {
    event.preventDefault();
    const query = visibleSearchTerm.trim();
    navigate(query ? `/shop?search=${encodeURIComponent(query)}` : "/shop");
  };

  const handleSearchChange = (event) => {
    const nextValue = event.target.value;
    setSearchTerm(nextValue);

    if (location.pathname === "/shop" && !nextValue.trim()) {
      navigate("/shop");
    }
  };

  return (
    <header className="topbar">
      <div className="announcement-bar">
        <p>Order genuine spare parts, track stock, and follow your orders from one place.</p>
      </div>
      <div className="container nav-shell">
        <Link to={currentUser ? homePath : "/login"} className="brand-mark">
          <span className="brand-badge">BX</span>
          <div>
            <strong>BikeX Parts</strong>
          </div>
        </Link>

        <nav className="nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form className="nav-search" onSubmit={handleSearch}>
          <input
            value={visibleSearchTerm}
            onChange={handleSearchChange}
            placeholder="Search brake pad, tyre, chain..."
          />
          <button type="submit" className="secondary-button">Search</button>
        </form>

        <div className="nav-actions">
          {currentUser ? (
            <>
              {currentUser.role === "admin" ? (
                <span className="session-pill" aria-label="Current session role">
                  Admin panel
                </span>
              ) : currentUser.role === "cashier" ? (
                <span className="session-pill" aria-label="Current session role">
                  Cashier POS
                </span>
              ) : (
                <Link className="account-pill" to="/account">
                  Account
                </Link>
              )}
              <button type="button" className="danger-link" onClick={logoutUser}>
                Logout
              </button>
            </>
          ) : (
            <Link className="account-pill" to="/login">
              Login
            </Link>
          )}
          {currentUser?.role === "user" ? (
            <Link className="cart-pill" to="/cart">
              Cart
              <span>{cartCount}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
