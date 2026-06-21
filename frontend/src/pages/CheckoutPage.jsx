import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductThumb from "../components/ProductThumb";
import { useShop } from "../store/ShopContext";
import { formatPrice } from "../utils/storefront";

const emailRule = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckoutPage() {
  const { checkoutItems, checkoutSubtotal, purchaseCart, purchaseError, currentUser, deliveryFee } = useShop();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const totalItems = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    postalCode: "",
    landmark: "",
    address: "",
    notes: "",
    deliveryPreference: "standard-dispatch",
    paymentMethod: "cash-on-delivery",
  });

  const customerDetails = useMemo(() => ({
    name: (formState.name || currentUser?.name || "").trim(),
    phone: (formState.phone || currentUser?.phone || "").trim(),
    email: (formState.email || currentUser?.email || "").trim(),
    city: (formState.city || currentUser?.city || "").trim(),
    postalCode: formState.postalCode.trim(),
    landmark: formState.landmark.trim(),
    address: (formState.address || currentUser?.address || "").trim(),
    notes: formState.notes.trim(),
  }), [currentUser, formState]);

  const missingFields = useMemo(() => {
    const fields = [];

    if (!customerDetails.name) fields.push("full name");
    if (!customerDetails.phone) fields.push("phone number");
    if (!customerDetails.email) fields.push("email address");
    if (!customerDetails.city) fields.push("city");
    if (!customerDetails.postalCode) fields.push("postal code");
    if (!customerDetails.address) fields.push("street address");

    if (customerDetails.email && !emailRule.test(customerDetails.email)) {
      fields.push("valid email address");
    }

    return fields;
  }, [customerDetails]);

  const detailsComplete = missingFields.length === 0;

  const checkoutSteps = useMemo(() => {
    if (orderPlaced) {
      return [
        { id: "details", number: "1", label: "Details", state: "complete" },
        { id: "review", number: "2", label: "Review", state: "complete" },
        { id: "confirmation", number: "3", label: "Confirmation", state: "current" },
      ];
    }

    if (detailsComplete) {
      return [
        { id: "details", number: "1", label: "Details", state: "complete" },
        { id: "review", number: "2", label: "Review", state: "current" },
        { id: "confirmation", number: "3", label: "Confirmation", state: "upcoming" },
      ];
    }

    return [
      { id: "details", number: "1", label: "Details", state: "current" },
      { id: "review", number: "2", label: "Review", state: "upcoming" },
      { id: "confirmation", number: "3", label: "Confirmation", state: "upcoming" },
    ];
  }, [detailsComplete, orderPlaced]);

  const handleInputChange = (key, value) => {
    setCheckoutError("");
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handlePlaceOrder = async () => {
    if (!detailsComplete) {
      setCheckoutError(`Please complete: ${missingFields.join(", ")}.`);
      return;
    }

    setCheckoutError("");
    setSubmitting(true);
    const result = await purchaseCart({
      customer: customerDetails,
      deliveryPreference: formState.deliveryPreference,
      paymentMethod: formState.paymentMethod,
    });
    setSubmitting(false);

    if (result.ok) {
      setOrderPlaced(true);
    }
  };

  if (orderPlaced) {
    return (
      <section className="container page-pad">
        <div className="empty-state-card success-card">
          <span className="eyebrow">Order confirmed</span>
          <h1>Your order has been placed</h1>
          <p>Your order is now stored in the backend, visible in the account page, and stock has been updated.</p>
          <div className="hero-actions center-actions">
            <Link to="/shop" className="primary-button">Continue shopping</Link>
            <Link to="/account" className="secondary-button">Open account</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!checkoutItems.length) {
    return (
      <section className="container page-pad">
        <div className="empty-state-card">
          <span className="eyebrow">Checkout</span>
          <h1>No items selected for checkout</h1>
          <p>Add a product to cart or use Buy now from a product page to open shipment and payment with one item.</p>
          <div className="hero-actions center-actions">
            <Link to="/shop" className="primary-button">Browse products</Link>
            <Link to="/cart" className="secondary-button">Open cart</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container page-stack page-pad">
      <div className="checkout-banner">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>Review your order before dispatch</h1>
          <p>Add your delivery details, confirm your payment option, and make sure every part reaches the right address on time.</p>
        </div>
        <div className="checkout-steps" aria-label="Checkout progress">
          {checkoutSteps.map((step, index) => (
            <div
              key={step.id}
              className={`checkout-step ${step.state}`}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span className="checkout-step-index">{step.number}</span>
              <div className="checkout-step-copy">
                <strong>{step.label}</strong>
                <small>
                  {step.state === "complete" ? "Completed" : step.state === "current" ? "In progress" : "Pending"}
                </small>
              </div>
              {index < checkoutSteps.length - 1 ? <span className="checkout-step-line" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </div>

      {!currentUser ? (
        <div className="inline-notice">
          <strong>Login required for checkout</strong>
          <p>Please <Link to="/login">log in</Link> so your order can be saved to your backend account and shown on the account page.</p>
        </div>
      ) : null}

      <div className="section-heading">
        <div>
          <span className="eyebrow">Checkout</span>
          <h2>Shipping and payment</h2>
        </div>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <input placeholder="Full name" value={formState.name || currentUser?.name || ""} onChange={(event) => handleInputChange("name", event.target.value)} />
            <input placeholder="Phone number" value={formState.phone || currentUser?.phone || ""} onChange={(event) => handleInputChange("phone", event.target.value)} />
            <input placeholder="Email address" value={formState.email || currentUser?.email || ""} onChange={(event) => handleInputChange("email", event.target.value)} />
            <input placeholder="City" value={formState.city || currentUser?.city || ""} onChange={(event) => handleInputChange("city", event.target.value)} />
            <input placeholder="Postal code" value={formState.postalCode} onChange={(event) => handleInputChange("postalCode", event.target.value)} />
            <input placeholder="Landmark / area" value={formState.landmark} onChange={(event) => handleInputChange("landmark", event.target.value)} />
            <input className="full-span" placeholder="Street address" value={formState.address || currentUser?.address || ""} onChange={(event) => handleInputChange("address", event.target.value)} />
            <input className="full-span" placeholder="Order notes for workshop or rider" value={formState.notes} onChange={(event) => handleInputChange("notes", event.target.value)} />
          </div>

          <div className="delivery-box">
            <h3>Delivery preference</h3>
            <div className="option-grid">
              <label className="option-card">
                <input
                  type="radio"
                  name="delivery"
                  value="standard-dispatch"
                  checked={formState.deliveryPreference === "standard-dispatch"}
                  onChange={(event) => handleInputChange("deliveryPreference", event.target.value)}
                />
                <span className="radio-dot" />
                <div>
                  <strong>Standard dispatch</strong>
                  <p>Delivery in 2 to 4 business days.</p>
                </div>
              </label>
              <label className="option-card">
                <input
                  type="radio"
                  name="delivery"
                  value="workshop-priority"
                  checked={formState.deliveryPreference === "workshop-priority"}
                  onChange={(event) => handleInputChange("deliveryPreference", event.target.value)}
                />
                <span className="radio-dot" />
                <div>
                  <strong>Workshop priority</strong>
                  <p>Fast-tracked handling for urgent repair jobs.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="payment-box">
            <h3>Payment method</h3>
            <div className="option-grid">
              <label className="option-card">
                <input
                  type="radio"
                  name="payment"
                  value="cash-on-delivery"
                  checked={formState.paymentMethod === "cash-on-delivery"}
                  onChange={(event) => handleInputChange("paymentMethod", event.target.value)}
                />
                <span className="radio-dot" />
                <div>
                  <strong>Cash on delivery</strong>
                  <p>Pay once your order arrives.</p>
                </div>
              </label>
              <label className="option-card">
                <input
                  type="radio"
                  name="payment"
                  value="card-on-delivery"
                  checked={formState.paymentMethod === "card-on-delivery"}
                  onChange={(event) => handleInputChange("paymentMethod", event.target.value)}
                />
                <span className="radio-dot" />
                <div>
                  <strong>Card on delivery</strong>
                  <p>Use a card when the rider reaches you.</p>
                </div>
              </label>
              <label className="option-card">
                <input
                  type="radio"
                  name="payment"
                  value="bank-transfer"
                  checked={formState.paymentMethod === "bank-transfer"}
                  onChange={(event) => handleInputChange("paymentMethod", event.target.value)}
                />
                <span className="radio-dot" />
                <div>
                  <strong>Bank transfer</strong>
                  <p>Share payment proof after transfer.</p>
                </div>
              </label>
            </div>
          </div>

          {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
          {purchaseError ? <p className="form-error">{purchaseError}</p> : null}

          <button type="button" className="primary-button" onClick={handlePlaceOrder} disabled={submitting || !checkoutItems.length || !currentUser}>
            {submitting ? "Placing order..." : "Place order"}
          </button>
        </form>

        <aside className="summary-card">
          <h3>Final Summary</h3>
          <div className="summary-stack">
            {checkoutItems.map((item) => (
              <div key={item.id} className="summary-product">
                <ProductThumb product={item} className="mini-visual checkout-thumb" />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.quantity} x {formatPrice(item.price)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="summary-line"><span>Total items</span><strong>{totalItems}</strong></div>
          <div className="summary-line"><span>Parts subtotal</span><strong>{formatPrice(checkoutSubtotal)}</strong></div>
          <div className="summary-line"><span>Delivery</span><strong>{formatPrice(deliveryFee)}</strong></div>
          <div className="summary-line total"><span>Grand total</span><strong>{formatPrice(checkoutSubtotal + deliveryFee)}</strong></div>
          <div className="checkout-note">
            <strong>Before you place the order</strong>
            <p>Double-check the delivery details and selected quantity so your parts can be dispatched without delay.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default CheckoutPage;
