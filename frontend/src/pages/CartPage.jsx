import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import ProductThumb from "../components/ProductThumb";
import { useShop } from "../store/ShopContext";
import { formatPrice } from "../utils/storefront";

function CartPage() {
  const { cartItems, products, subtotal, updateQuantity, removeFromCart, beginCartCheckout, deliveryFee, currentUser } = useShop();
  const [draftQuantities, setDraftQuantities] = useState({});
  const suggestedProducts = products.filter((product) => !cartItems.some((item) => item.id === product.id)).slice(0, 3);

  const commitQuantity = (itemId, fallbackQuantity) => {
    const rawValue = String(draftQuantities[itemId] ?? "").trim();

    if (!rawValue) {
      setDraftQuantities((current) => ({ ...current, [itemId]: String(fallbackQuantity) }));
      return;
    }

    const nextQuantity = Number(rawValue);

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setDraftQuantities((current) => ({ ...current, [itemId]: String(fallbackQuantity) }));
      return;
    }

    updateQuantity(itemId, nextQuantity);
  };

  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (currentUser?.role === "cashier") {
    return <Navigate to="/pos" replace />;
  }

  if (!cartItems.length) {
    return (
      <section className="container page-pad">
        <div className="empty-state-card">
          <span className="eyebrow">Cart</span>
          <h1>Your cart is empty</h1>
          <p>Add performance parts, workshop bundles, or service kits to start your order.</p>
          <Link to="/shop" className="primary-button">Browse products</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container page-stack page-pad">
      <div className="cart-banner">
        <div>
          <span className="eyebrow">Cart</span>
          <h1>Your selected parts</h1>
          <p>Review quantities, keep your workshop order tidy, and move to checkout when ready.</p>
        </div>
        <div className="cart-banner-stats">
          <div><strong>{cartItems.length}</strong><span>Unique items</span></div>
          <div><strong>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</strong><span>Total units</span></div>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Cart</span>
          <h2>Order review</h2>
        </div>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cartItems.map((item) => (
            <article key={item.id} className="cart-card">
              <ProductThumb product={item} className="mini-visual cart-thumb" />
              <div className="cart-copy">
                <h3>{item.name}</h3>
                <p>{item.brand}</p>
              </div>
              <input
                type="number"
                min="1"
                value={draftQuantities[item.id] ?? String(item.quantity)}
                onChange={(event) =>
                  setDraftQuantities((current) => ({ ...current, [item.id]: event.target.value }))
                }
                onBlur={() => commitQuantity(item.id, item.quantity)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitQuantity(item.id, item.quantity);
                  }
                }}
              />
              <strong>{formatPrice(item.price * item.quantity)}</strong>
              <button type="button" className="icon-button" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name} from cart`}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 3.75h6l.6 1.5H20a.75.75 0 0 1 0 1.5h-1.05l-.83 11.25A2.25 2.25 0 0 1 15.88 20H8.12A2.25 2.25 0 0 1 5.88 18L5.05 6.75H4a.75.75 0 0 1 0-1.5h4.4L9 3.75Zm-2.62 3 .81 10.95c.03.4.36.8.93.8h7.76c.57 0 .9-.4.93-.8l.81-10.95H6.38ZM10 9a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 10 9Zm4 0a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 14 9Z" />
                </svg>
              </button>
            </article>
          ))}
        </div>

        <aside className="summary-card">
          <h3>Order Summary</h3>
          <div className="summary-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
          <div className="summary-line"><span>Shipping</span><strong>{formatPrice(deliveryFee)}</strong></div>
          <div className="summary-line total"><span>Total</span><strong>{formatPrice(subtotal + deliveryFee)}</strong></div>
          <Link to="/checkout" className="primary-button block" onClick={beginCartCheckout}>Proceed to checkout</Link>
        </aside>
      </div>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Add more</span>
            <h2>Pairs well with your cart</h2>
          </div>
        </div>
        <div className="suggestion-grid">
          {suggestedProducts.map((product) => (
            <article key={product.id} className="upsell-card">
              <ProductThumb product={product} />
              <div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
              </div>
              <div className="upsell-footer">
                <strong>{formatPrice(product.price)}</strong>
                <Link to={`/shop/${product.slug}`} className="ghost-link">View item</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default CartPage;
