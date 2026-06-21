import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useShop } from "../store/ShopContext";
import { formatPrice } from "../utils/storefront";

function formatOrderItems(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = String(item.productId || item.name || "item");
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += Number(item.quantity || 0);
      return;
    }

    grouped.set(key, {
      name: item.name || "Product",
      quantity: Number(item.quantity || 0),
    });
  });

  return Array.from(grouped.values())
    .map((item) => `${item.name} x${item.quantity}`)
    .join(", ");
}

function groupOrderItems(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = String(item.productId || item.name || "item");
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += Number(item.quantity || 0);
      return;
    }

    grouped.set(key, {
      productId: item.productId || key,
      name: item.name || "Product",
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
    });
  });

  return Array.from(grouped.values());
}

function getReturnedQuantityMap(returnRequests = []) {
  const returned = new Map();

  returnRequests.forEach((returnRecord) => {
    const orderId = String(returnRecord.orderId?._id || returnRecord.orderId || "");

    (returnRecord.items || []).forEach((item) => {
      const key = `${orderId}-${item.productId}`;
      returned.set(key, (returned.get(key) || 0) + Number(item.quantity || 0));
    });
  });

  return returned;
}

function AccountPage() {
  const navigate = useNavigate();
  const { currentUser, orders, ordersLoading, returnRequests, createReturnRequest, logoutUser } = useShop();
  const [returnReasonByOrder, setReturnReasonByOrder] = useState({});
  const [returnQuantityByOrder, setReturnQuantityByOrder] = useState({});
  const [returnMessage, setReturnMessage] = useState("");
  const [submittingReturnId, setSubmittingReturnId] = useState("");

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (currentUser.role === "cashier") {
    return <Navigate to="/pos" replace />;
  }

  const latestOrder = orders[0];
  const totalSpent = orders.reduce((sum, order) => sum + order.totals.grandTotal, 0);
  const returnedQuantityMap = getReturnedQuantityMap(returnRequests);

  const handleReturnSubmit = async (orderId) => {
    const reason = String(returnReasonByOrder[orderId] || "").trim();
    const order = orders.find((entry) => entry.id === orderId);
    const groupedItems = groupOrderItems(order?.items || []);
    const selectedItems = groupedItems
      .map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: Number(returnQuantityByOrder[`${orderId}-${item.productId}`] || 0),
        maxQuantity: item.quantity - (returnedQuantityMap.get(`${orderId}-${item.productId}`) || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!reason) {
      setReturnMessage("Please enter a return reason before submitting.");
      return;
    }

    if (!selectedItems.length) {
      setReturnMessage("Choose at least one item and quantity to return.");
      return;
    }

    for (const item of selectedItems) {
      if (!Number.isFinite(item.quantity) || item.quantity < 1 || item.quantity > item.maxQuantity) {
        setReturnMessage(`Return quantity for ${item.name} must be between 1 and ${item.maxQuantity}.`);
        return;
      }
    }

    setSubmittingReturnId(orderId);
    const result = await createReturnRequest(
      orderId,
      reason,
      selectedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    );
    setSubmittingReturnId("");

    if (result.ok) {
      setReturnReasonByOrder((current) => ({ ...current, [orderId]: "" }));
      setReturnQuantityByOrder((current) => {
        const next = { ...current };
        groupedItems.forEach((item) => {
          next[`${orderId}-${item.productId}`] = "";
        });
        return next;
      });
      setReturnMessage("Return request sent successfully.");
    } else {
      setReturnMessage(result.message);
    }
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <section className="container page-stack page-pad">
      <div className="account-hero">
        <div>
          <span className="eyebrow">Account</span>
          <h1>{currentUser.name}'s dashboard</h1>
          <p>Manage your orders, saved details, and return requests.</p>
        </div>
        <div className="account-badge-card">
          <small>Account email</small>
          <strong>{currentUser.email}</strong>
          <span>{orders.length ? `${orders.length} orders placed successfully` : "No orders placed yet"}</span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Overview</span>
          <h2>Account summary</h2>
        </div>
      </div>

      <div className="account-grid">
        <article className="panel-card">
          <h3>Customer</h3>
          <p>{currentUser.name}</p>
          <small>{currentUser.email}</small>
        </article>
        <article className="panel-card">
          <h3>Total orders</h3>
          <p>{orders.length}</p>
          <small>{orders.length ? "Your order history" : "No orders yet"}</small>
        </article>
        <article className="panel-card">
          <h3>Total spend</h3>
          <p>{formatPrice(totalSpent)}</p>
          <small>{latestOrder ? `Latest order: ${latestOrder.id.slice(-6).toUpperCase()}` : "No purchases yet"}</small>
        </article>
      </div>

      <div className="account-detail-grid">
        <article className="panel-card">
          <h3>Recent orders</h3>
          {ordersLoading ? <p>Loading your orders...</p> : null}
          {!ordersLoading && orders.length ? (
            <div className="list-stack">
              {orders.slice(0, 4).map((order) => (
                <div key={order.id} className="list-row list-row-top">
                  <div>
                    <strong>#{order.id.slice(-6).toUpperCase()}</strong>
                    <p>{formatOrderItems(order.items)}</p>
                    <small>{formatPrice(order.totals.grandTotal)}</small>
                  </div>
                  <div className="admin-order-controls">
                    <span className={`status-pill${order.status === "Confirmed" ? "" : " muted"}`}>{order.status}</span>
                    <small>{order.paymentMethod.replaceAll("-", " ")}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!ordersLoading && !orders.length ? (
            <div className="empty-inline-state">
              <p>No orders yet. Once you place an order, it will appear here automatically.</p>
              <Link to="/shop" className="secondary-button">Browse parts</Link>
            </div>
          ) : null}
        </article>

        <article className="panel-card">
          <h3>Return requests</h3>
          {returnMessage ? <p className="form-error">{returnMessage}</p> : null}
          {returnRequests.length ? (
            <div className="list-stack">
              {returnRequests.map((returnRecord) => (
                <div key={returnRecord._id} className="list-row list-row-top">
                  <div>
                    <strong>#{String(returnRecord.orderId?._id || returnRecord.orderId).slice(-6).toUpperCase()}</strong>
                    <p>{returnRecord.items?.map((item) => `${item.name} x${item.quantity}`).join(", ") || returnRecord.reason}</p>
                    <small>{returnRecord.reason}</small>
                  </div>
                  <span className="status-pill">{returnRecord.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No return requests yet.</p>
          )}
        </article>

        <article className="panel-card">
          <h3>Saved delivery details</h3>
          <div className="list-stack">
            <div className="bike-tile">
              <strong>Phone</strong>
              <p>{currentUser.phone || "Add phone during checkout"}</p>
            </div>
            <div className="bike-tile">
              <strong>City</strong>
              <p>{currentUser.city || "Add city during checkout"}</p>
            </div>
            <div className="bike-tile">
              <strong>Address</strong>
              <p>{currentUser.address || "Add address during checkout"}</p>
            </div>
          </div>
        </article>

        <article className="panel-card">
          <h3>Latest order total</h3>
          <p>{latestOrder ? formatPrice(latestOrder.totals.grandTotal) : formatPrice(0)}</p>
          <small>{latestOrder ? latestOrder.paymentMethod.replaceAll("-", " ") : "No payment history yet"}</small>
        </article>

        <article className="panel-card">
          <h3>Request a return</h3>
          {orders.length ? (
            <div className="list-stack">
              {orders.slice(0, 3).map((order) => (
                <div key={order.id} className="bike-tile">
                  <strong>Order #{order.id.slice(-6).toUpperCase()}</strong>
                  <p>{formatOrderItems(order.items)}</p>
                  <small>{formatPrice(order.totals.grandTotal)}</small>
                  <div className="list-stack compact-return-grid">
                    {groupOrderItems(order.items).map((item) => {
                      const remainingQuantity = item.quantity - (returnedQuantityMap.get(`${order.id}-${item.productId}`) || 0);

                      if (remainingQuantity <= 0) {
                        return null;
                      }

                      return (
                        <div key={`${order.id}-${item.productId}`} className="return-item-row">
                          <div>
                            <strong>{item.name}</strong>
                            <small>Available to return: {remainingQuantity}</small>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={remainingQuantity}
                            placeholder="0"
                            value={returnQuantityByOrder[`${order.id}-${item.productId}`] || ""}
                            onChange={(event) =>
                              setReturnQuantityByOrder((current) => ({
                                ...current,
                                [`${order.id}-${item.productId}`]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <input
                    placeholder="Why do you want to return this order?"
                    value={returnReasonByOrder[order.id] || ""}
                    onChange={(event) =>
                      setReturnReasonByOrder((current) => ({ ...current, [order.id]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      submittingReturnId === order.id
                      || !groupOrderItems(order.items).some(
                        (item) => item.quantity - (returnedQuantityMap.get(`${order.id}-${item.productId}`) || 0) > 0,
                      )
                    }
                    onClick={() => handleReturnSubmit(order.id)}
                  >
                    {submittingReturnId === order.id
                      ? "Sending..."
                      : groupOrderItems(order.items).some(
                        (item) => item.quantity - (returnedQuantityMap.get(`${order.id}-${item.productId}`) || 0) > 0,
                      )
                        ? "Request return"
                        : "No return quantity left"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Link to="/shop" className="secondary-button">Browse products</Link>
          )}
        </article>

        <article className="panel-card account-actions-card">
          <h3>Session</h3>
          <p>Review your order history, manage return requests, and sign out securely when you are done.</p>
          <button type="button" className="danger-button" onClick={handleLogout}>
            Logout
          </button>
        </article>
      </div>
    </section>
  );
}

export default AccountPage;
