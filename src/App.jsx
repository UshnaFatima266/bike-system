import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AccountPage from "./pages/AccountPage";
import DealsPage from "./pages/DealsPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PosPage from "./pages/PosPage";
import PosLoginPage from "./pages/PosLoginPage";
import { useShop } from "./store/ShopContext";

function App() {
  const { currentUser } = useShop();
  const homeTarget = currentUser
    ? currentUser.role === "admin"
      ? "/admin"
      : currentUser.role === "cashier"
        ? "/pos"
        : "/home"
    : "/login";

  return (
    <Routes>
      <Route path="/pos-login" element={<PosLoginPage />} />
      <Route path="/pos" element={<PosPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={homeTarget} replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="shop/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>
    </Routes>
  );
}

export default App;
