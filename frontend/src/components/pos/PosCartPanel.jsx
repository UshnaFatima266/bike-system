import { formatPrice } from "../../utils/storefront";

function PosCartPanel({
  cartItems,
  customers,
  selectedCustomerId,
  onCustomerChange,
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  paymentMethods,
  paymentMethod,
  onPaymentMethodChange,
  discountAmount,
  onDiscountChange,
  taxAmount,
  onTaxChange,
  notes,
  onNotesChange,
  subtotal,
  total,
  onAdjustQuantity,
  onManualQuantity,
  onRemove,
  onClear,
  onCheckout,
  submitting,
  errorMessage,
}) {
  return (
    <aside className="pos-cart-panel">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">POS cart</span>
          <h2>Current sale</h2>
        </div>
        <button type="button" className="ghost-link" onClick={onClear}>Clear</button>
      </div>

      <div className="pos-cart-items">
        {cartItems.length ? cartItems.map((item) => (
          <article key={item.productId} className="pos-cart-item">
            <div>
              <strong>{item.name}</strong>
              <small>{item.brand} | {formatPrice(item.price)}</small>
            </div>
            <div className="pos-qty-controls">
              <button type="button" onClick={() => onAdjustQuantity(item.productId, -1)}>-</button>
              <input
                type="number"
                min="1"
                max={Math.max(item.stock, 1)}
                value={item.quantity}
                onChange={(event) => onManualQuantity(item.productId, event.target.value)}
              />
              <button
                type="button"
                onClick={() => onAdjustQuantity(item.productId, 1)}
                disabled={item.quantity >= item.stock}
              >
                +
              </button>
            </div>
            <strong>{formatPrice(item.price * item.quantity)}</strong>
            <button type="button" className="icon-button" onClick={() => onRemove(item.productId)} aria-label={`Remove ${item.name}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3.75h6l.6 1.5H20a.75.75 0 0 1 0 1.5h-1.05l-.83 11.25A2.25 2.25 0 0 1 15.88 20H8.12A2.25 2.25 0 0 1 5.88 18L5.05 6.75H4a.75.75 0 0 1 0-1.5h4.4L9 3.75Z" />
              </svg>
            </button>
          </article>
        )) : (
          <div className="empty-inline-state">
            <p>Add products from the POS grid to start an in-store sale.</p>
          </div>
        )}
      </div>

      <div className="pos-cart-form">
        <label>
          Customer
          <select value={selectedCustomerId} onChange={(event) => onCustomerChange(event.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((customer) => (
              <option key={customer._id || customer.id} value={customer._id || customer.id}>
                {customer.name} {customer.phone ? `(${customer.phone})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer name
          <input value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} placeholder="Walk-in Customer" />
        </label>
        <label>
          Customer phone
          <input value={customerPhone} onChange={(event) => onCustomerPhoneChange(event.target.value)} placeholder="Optional phone number" />
        </label>
        <label>
          Payment method
          <select value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value)}>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
              </option>
            ))}
          </select>
        </label>
        <div className="pos-money-grid">
          <label>
            Discount
            <input type="number" min="0" value={discountAmount} onChange={(event) => onDiscountChange(event.target.value)} />
          </label>
          <label>
            Tax
            <input type="number" min="0" value={taxAmount} onChange={(event) => onTaxChange(event.target.value)} />
          </label>
        </div>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} placeholder="Optional POS note" rows="3" />
        </label>
      </div>

      <div className="summary-card pos-summary-card">
        <div className="summary-line"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
        <div className="summary-line"><span>Discount</span><strong>- {formatPrice(discountAmount)}</strong></div>
        <div className="summary-line"><span>Tax</span><strong>{formatPrice(taxAmount)}</strong></div>
        <div className="summary-line total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        <button type="button" className="primary-button block" disabled={!cartItems.length || submitting} onClick={onCheckout}>
          {submitting ? "Completing sale..." : "Complete POS sale"}
        </button>
      </div>
    </aside>
  );
}

export default PosCartPanel;
