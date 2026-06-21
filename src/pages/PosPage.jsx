import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import PosCartPanel from "../components/pos/PosCartPanel";
import PosProductGrid from "../components/pos/PosProductGrid";
import PosRecentSales from "../components/pos/PosRecentSales";
import { useShop } from "../store/ShopContext";
import { formatPrice } from "../utils/storefront";

const POS_DRAFT_KEY = "bikex-pos-draft";
const POS_QUEUE_KEY = "bikex-pos-queue";

function loadStoredJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function PosPage() {
  const {
    currentUser,
    posProducts,
    posCategories,
    posCustomers,
    posRecentSales,
    posReports,
    posTodayReport,
    posPaymentMethods,
    posLoading,
    loadPosBootstrap,
    searchPosProducts,
    loadPosReports,
    createPosSale,
    returnPosSaleItems,
    updateDailyRegister,
    logoutUser,
  } = useShop();

  const searchInputRef = useRef(null);
  const checkoutHandlerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [cart, setCart] = useState(() => loadStoredJson(POS_DRAFT_KEY, []));
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [notes, setNotes] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [savingSale, setSavingSale] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [receiptSale, setReceiptSale] = useState(null);
  const [returnDrafts, setReturnDrafts] = useState({});
  const [offlineQueue, setOfflineQueue] = useState(() => loadStoredJson(POS_QUEUE_KEY, []));

  const brandOptions = useMemo(
    () => Array.from(new Set(posProducts.map((product) => product.brand).filter(Boolean))).sort(),
    [posProducts],
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart],
  );
  const numericDiscount = Math.max(Number(discountAmount || 0), 0);
  const numericTax = Math.max(Number(taxAmount || 0), 0);
  const total = Math.max(subtotal - numericDiscount + numericTax, 0);

  useEffect(() => {
    if (["admin", "cashier"].includes(currentUser?.role)) {
      loadPosBootstrap();
    }
  }, [currentUser, loadPosBootstrap]);

  useEffect(() => {
    window.localStorage.setItem(POS_DRAFT_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem(POS_QUEUE_KEY, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (["admin", "cashier"].includes(currentUser?.role)) {
        searchPosProducts({
          search: searchTerm,
          category: selectedCategory,
          brand: selectedBrand,
        });
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [currentUser, searchTerm, selectedCategory, selectedBrand, searchPosProducts]);

  const handleAddProduct = (product) => {
    setPageMessage("");
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          brand: product.brand,
          sku: product.sku,
          quantity: 1,
        },
      ];
    });
  };

  const handleAdjustQuantity = (productId, delta) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.productId !== productId) {
            return item;
          }

          const nextQuantity = Math.max(1, Math.min(item.quantity + delta, item.stock));
          return { ...item, quantity: nextQuantity };
        }),
    );
  };

  const handleManualQuantity = (productId, value) => {
    setCart((current) =>
      current.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        if (!String(value).trim()) {
          return { ...item, quantity: 1 };
        }

        const nextQuantity = Number(value);
        if (!Number.isFinite(nextQuantity)) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(1, Math.min(nextQuantity, item.stock)),
        };
      }),
    );
  };

  const handleRemove = (productId) => {
    setCart((current) => current.filter((item) => item.productId !== productId));
  };

  const buildSalePayload = useCallback(() => ({
    customerId: selectedCustomerId || null,
    customerName: customerName.trim() || "Walk-in Customer",
    customerPhone: customerPhone.trim(),
    items: cart.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.price || 0),
      discountAmount: 0,
      taxAmount: 0,
    })),
    paymentMethod,
    subtotal,
    discountAmount: numericDiscount,
    taxAmount: numericTax,
    totalAmount: total,
    notes: notes.trim(),
  }), [cart, customerName, customerPhone, notes, numericDiscount, numericTax, paymentMethod, selectedCustomerId, subtotal, total]);

  const openReceiptPrint = useCallback((sale) => {
    const popup = window.open("", "_blank", "width=720,height=900");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${sale.saleNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #dbe2f0; padding: 8px; text-align: left; }
            .meta { margin: 12px 0; color: #475569; }
            .total { margin-top: 18px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>BikeX Parts POS Receipt</h1>
          <div class="meta">
            <div>${sale.saleNumber}</div>
            <div>${new Date(sale.saleDate).toLocaleString()}</div>
            <div>Customer: ${sale.customerName}</div>
            <div>Payment: ${sale.paymentMethod}</div>
          </div>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
            <tbody>
              ${(sale.items || []).map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatPrice(item.unitPrice)}</td>
                  <td>${formatPrice(item.lineTotal)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="total">Grand total: ${formatPrice(sale.totalAmount)}</div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    popup.document.close();
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!cart.length) {
      setPageMessage("Add at least one item before completing a POS sale.");
      return;
    }

    const payload = buildSalePayload();
    setSavingSale(true);
    setPageMessage("");
    const result = await createPosSale(payload);
    setSavingSale(false);

    if (result.ok) {
      setCart([]);
      setNotes("");
      setDiscountAmount("0");
      setTaxAmount("0");
      setReceiptSale(result.sale);
      setPageMessage(`POS sale ${result.sale.saleNumber} completed successfully.`);
      openReceiptPrint(result.sale);
      return;
    }

    if (!window.navigator.onLine || /reach the POS/i.test(result.message || "")) {
      const queuedSale = {
        id: `offline-${Date.now()}`,
        createdAt: new Date().toISOString(),
        payload,
      };
      setOfflineQueue((current) => [queuedSale, ...current]);
      setCart([]);
      setNotes("");
      setPageMessage("Connection was not available. The sale has been saved offline and can be synced later.");
      return;
    }

    setPageMessage(result.message || "Could not complete the POS sale.");
  }, [buildSalePayload, cart.length, createPosSale, openReceiptPrint]);

  const handleCustomerSelect = (value) => {
    setSelectedCustomerId(value);

    const activeCustomer = posCustomers.find((customer) => String(customer._id || customer.id) === value);
    if (activeCustomer) {
      setCustomerName(activeCustomer.name || "Walk-in Customer");
      setCustomerPhone(activeCustomer.phone || "");
      return;
    }

    setCustomerName("Walk-in Customer");
    setCustomerPhone("");
  };

  useEffect(() => {
    checkoutHandlerRef.current = handleCheckout;
  }, [handleCheckout]);

  const syncOfflineQueue = async () => {
    if (!offlineQueue.length) {
      setPageMessage("No offline POS sales are waiting to sync.");
      return;
    }

    const remaining = [];
    for (const queuedSale of offlineQueue) {
      const result = await createPosSale(queuedSale.payload);
      if (!result.ok) {
        remaining.push(queuedSale);
      }
    }
    setOfflineQueue(remaining);
    setPageMessage(remaining.length ? "Some offline sales could not sync yet." : "Offline POS sales synced successfully.");
  };

  const handleReturnSubmit = async (sale) => {
    const items = (sale.items || [])
      .map((item) => ({
        saleItemId: item.id,
        quantity: Number(returnDrafts[`${sale.id}-${item.id}`] || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setPageMessage("Choose at least one sale item quantity to return.");
      return;
    }

    const result = await returnPosSaleItems(sale.id, {
      items,
      reason: "POS customer return",
    });

    if (result.ok) {
      setReturnDrafts({});
      setPageMessage(`Return processed for ${sale.saleNumber}. Inventory and reports updated.`);
    } else {
      setPageMessage(result.message || "Could not process the POS return.");
    }
  };

  const handleOpeningCashSave = async () => {
    if (!openingCash.trim()) {
      setPageMessage("Enter the opening cash amount first.");
      return;
    }

    const result = await updateDailyRegister({ openingCash: Number(openingCash) });
    setPageMessage(result.ok ? "Daily opening cash updated." : result.message);
  };

  const handlePosLogout = () => {
    setCart([]);
    window.localStorage.removeItem(POS_DRAFT_KEY);
    logoutUser();
  };

  useEffect(() => {
    const handleKeydown = (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "F4") {
        event.preventDefault();
        setCart([]);
      }

      if (event.key === "F9") {
        event.preventDefault();
        if (!savingSale && cart.length) {
          void checkoutHandlerRef.current?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [cart.length, savingSale]);

  if (!currentUser) {
    return <Navigate to="/pos-login" replace />;
  }

  if (!["admin", "cashier"].includes(currentUser.role)) {
    return <Navigate to="/home" replace />;
  }

  return (
    <section className="container page-stack page-pad pos-page">
      <div className="pos-session-bar">
        <div>
          <span className="eyebrow">POS session</span>
          <strong>{currentUser.name || currentUser.email}</strong>
        </div>
        <button type="button" className="pos-logout-button" onClick={handlePosLogout}>
          Logout
        </button>
      </div>

      <div className="pos-hero">
        <div>
          <span className="eyebrow">Point of sale</span>
          <h1>100% Genuine Parts for Peak Performance</h1>
          <p>Built for the Long Haul. Quality You Can Trust.</p>
        </div>
        <div className="pos-hero-stats">
          <article className="panel-card">
            <h3>Today POS revenue</h3>
            <p>{formatPrice(posTodayReport?.posRevenue || 0)}</p>
          </article>
          <article className="panel-card">
            <h3>Cash expected</h3>
            <p>{formatPrice(posTodayReport?.closingCashExpected || 0)}</p>
          </article>
          <article className="panel-card">
            <h3>Offline queue</h3>
            <p>{offlineQueue.length}</p>
          </article>
        </div>
      </div>

      <div className="pos-toolbar panel-card">
        <div className="pos-search-row">
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by product name, SKU, category, or brand"
          />
          <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            <option value="">All categories</option>
            {posCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)}>
            <option value="">All brands</option>
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <button type="button" className="secondary-button" onClick={() => loadPosBootstrap()}>
            Refresh
          </button>
          <button type="button" className="secondary-button" onClick={syncOfflineQueue}>
            Sync offline ({offlineQueue.length})
          </button>
        </div>

        <div className="pos-register-row">
          {currentUser.role === "admin" ? (
            <>
              <label>
                Opening cash
                <input type="number" min="0" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} />
              </label>
              <button type="button" className="secondary-button" onClick={handleOpeningCashSave}>
                Save register
              </button>
            </>
          ) : null}
          <div className="pos-register-summary">
            <span>Opening cash: {formatPrice(posTodayReport?.openingCash || 0)}</span>
            <span>Expenses: {formatPrice(posTodayReport?.totalExpenses || 0)}</span>
            <span>Net profit: {formatPrice(posTodayReport?.netProfit || 0)}</span>
          </div>
        </div>
      </div>

      {pageMessage ? <p className="form-success">{pageMessage}</p> : null}

      <div className="pos-layout">
        <div className="pos-catalog-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Products</span>
              <h2>{posLoading ? "Loading POS products..." : `${posProducts.length} items ready for sale`}</h2>
            </div>
          </div>
          <PosProductGrid products={posProducts} onAdd={handleAddProduct} />
        </div>

        <PosCartPanel
          cartItems={cart}
          customers={posCustomers}
          selectedCustomerId={selectedCustomerId}
          onCustomerChange={handleCustomerSelect}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          customerPhone={customerPhone}
          onCustomerPhoneChange={setCustomerPhone}
          paymentMethods={posPaymentMethods}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          discountAmount={discountAmount}
          onDiscountChange={setDiscountAmount}
          taxAmount={taxAmount}
          onTaxChange={setTaxAmount}
          notes={notes}
          onNotesChange={setNotes}
          subtotal={subtotal}
          total={total}
          onAdjustQuantity={handleAdjustQuantity}
          onManualQuantity={handleManualQuantity}
          onRemove={handleRemove}
          onClear={() => setCart([])}
          onCheckout={handleCheckout}
          submitting={savingSale}
          errorMessage=""
        />
      </div>

      <div className="pos-bottom-grid">
        <PosRecentSales
          sales={posRecentSales}
          returnDrafts={returnDrafts}
          onDraftChange={(saleId, saleItemId, value) =>
            setReturnDrafts((current) => ({ ...current, [`${saleId}-${saleItemId}`]: value }))
          }
          onSubmitReturn={handleReturnSubmit}
        />

        <section className="panel-card pos-reports-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">Reports</span>
              <h2>Recent sales analytics</h2>
            </div>
            <button type="button" className="ghost-link" onClick={loadPosReports}>Reload</button>
          </div>

          <div className="list-stack">
            {posReports.slice(0, 7).map((report) => (
              <div key={report._id} className="list-row list-row-top">
                <div>
                  <strong>{new Date(report.reportDate).toLocaleDateString()}</strong>
                  <p>POS {formatPrice(report.posRevenue || 0)} | Ecommerce {formatPrice(report.ecommerceRevenue || 0)}</p>
                </div>
                <div className="admin-order-controls">
                  <small>Expenses {formatPrice(report.totalExpenses || 0)}</small>
                  <strong>{formatPrice(report.netProfit || 0)}</strong>
                </div>
              </div>
            ))}
          </div>

          {receiptSale ? (
            <div className="pos-last-receipt">
              <h3>Last receipt</h3>
              <p>{receiptSale.saleNumber} | {formatPrice(receiptSale.totalAmount)}</p>
              <button type="button" className="secondary-button" onClick={() => openReceiptPrint(receiptSale)}>
                Reprint / Save PDF
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

export default PosPage;
