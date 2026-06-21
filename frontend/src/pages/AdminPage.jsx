import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { formatPrice } from "../utils/storefront";

const initialProductForm = {
  id: "",
  name: "",
  brand: "",
  price: "",
  category: "",
  stock: "",
  image: "",
  description: "",
  discountPercent: "",
  isDealActive: false,
  dealTitle: "",
  dealEndsAt: "",
};

const initialCategoryForm = {
  id: "",
  name: "",
};

const initialInventoryForm = {
  id: "",
  quantityOnHand: "",
  reorderLevel: "",
  warehouseLocation: "",
};

const initialSupplierForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  address: "",
};

const initialPurchaseForm = {
  supplierId: "",
  productId: "",
  quantity: "",
  costPrice: "",
  notes: "",
};

const initialExpenseForm = {
  title: "",
  category: "",
  amount: "",
  expenseDate: "",
  notes: "",
};

const initialShipmentForm = {
  orderId: "",
  carrier: "",
  trackingNumber: "",
  status: "pending",
};

const initialPosUserForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

const orderStatuses = [
  { value: "confirmed", label: "Confirmed" },
  { value: "packed", label: "Packed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];
const shipmentStatuses = ["pending", "picked", "in_transit", "delivered", "failed"];
const returnStatuses = ["requested", "approved", "rejected", "received", "refunded"];

function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currentUser,
    adminOverview,
    adminLoading,
    categories,
    products,
    saveProduct,
    removeProduct,
    saveCategory,
    removeCategory,
    updateInventoryItem,
    adjustInventoryStock,
    suppliers,
    purchases,
    expenses,
    shipments,
    returns,
    posUsers,
    activityLogs,
    saveSupplier,
    createPurchase,
    deletePurchase,
    createExpense,
    saveShipment,
    createPosUser,
    deletePosUser,
    deleteActivityLog,
    updateReturnStatus,
    updateAdminOrderStatus,
  } = useShop();
  const [productForm, setProductForm] = useState(initialProductForm);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [inventoryForm, setInventoryForm] = useState(initialInventoryForm);
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [purchaseForm, setPurchaseForm] = useState(initialPurchaseForm);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [shipmentForm, setShipmentForm] = useState(initialShipmentForm);
  const [posUserForm, setPosUserForm] = useState(initialPosUserForm);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingInventory, setSavingInventory] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [savingPosUser, setSavingPosUser] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [adjustingInventoryId, setAdjustingInventoryId] = useState("");
  const [updatingReturnId, setUpdatingReturnId] = useState("");
  const editProductId = searchParams.get("editProduct");

  const metrics = adminOverview?.metrics;
  const recentOrders = adminOverview?.recentOrders || [];
  const lowStockProducts = adminOverview?.lowStockProducts || [];
  const inventoryItems = adminOverview?.inventory || [];
  const uniqueShipments = useMemo(() => {
    const latestByOrder = new Map();
    shipments.forEach((shipment) => {
      const key = String(shipment.orderId?._id || shipment.orderId || shipment._id);
      if (!latestByOrder.has(key)) {
        latestByOrder.set(key, shipment);
      }
    });
    return Array.from(latestByOrder.values());
  }, [shipments]);

  const productPayload = useMemo(() => ({
    name: productForm.name,
    brand: productForm.brand || "Universal",
    price: Number(productForm.price || 0),
    category: productForm.category,
    stock: Number(productForm.stock || 0),
    image: productForm.image,
    description: productForm.description,
    discountPercent: Number(productForm.discountPercent || 0),
    isDealActive: productForm.isDealActive,
    dealTitle: productForm.dealTitle,
    dealEndsAt: productForm.dealEndsAt || null,
  }), [productForm]);

  const handleEditProduct = useCallback((product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: String(product.basePrice ?? product.price),
      category: categories.find((category) => category.name === product.categoryName)?.id || "",
      stock: String(product.stock),
      image: product.image || "",
      description: product.description || "",
      discountPercent: String(product.discountPercent || 0),
      isDealActive: Boolean(product.isDealActive),
      dealTitle: product.dealTitle || "",
      dealEndsAt: product.dealEndsAt ? String(product.dealEndsAt).slice(0, 10) : "",
    });
    setSearchParams(new URLSearchParams({ editProduct: product.id }));
    setAdminMessage(`Editing ${product.name}`);
  }, [categories, setSearchParams]);

  useEffect(() => {
    if (!editProductId || !products.length) {
      return;
    }

    const product = products.find((entry) => String(entry.id) === String(editProductId));
    if (!product) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      handleEditProduct(product);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editProductId, handleEditProduct, products]);

  const handleProductSave = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    const result = await saveProduct(productPayload, productForm.id || undefined);
    setSavingProduct(false);

    if (result.ok) {
      setProductForm(initialProductForm);
      setAdminMessage(productForm.id ? "Product updated successfully." : "Product saved successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handleCategorySave = async (event) => {
    event.preventDefault();
    setSavingCategory(true);
    const result = await saveCategory({ name: categoryForm.name }, categoryForm.id || undefined);
    setSavingCategory(false);

    if (result.ok) {
      setCategoryForm(initialCategoryForm);
      setAdminMessage(categoryForm.id ? "Category updated successfully." : "Category saved successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const result = await removeProduct(productId);
    setAdminMessage(result.ok ? "Product deleted successfully." : result.message);
  };

  const handleDeleteCategory = async (categoryId) => {
    const result = await removeCategory(categoryId);
    setAdminMessage(result.ok ? "Category deleted successfully." : result.message);
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
    });
    setAdminMessage(`Editing ${category.name}`);
  };

  const handleOrderStatusChange = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    const result = await updateAdminOrderStatus(orderId, status);
    setUpdatingOrderId("");
    setAdminMessage(result.ok ? "Order status updated." : result.message);
  };

  const handleEditInventory = (inventoryItem) => {
    setInventoryForm({
      id: inventoryItem._id || inventoryItem.id,
      quantityOnHand: String(inventoryItem.quantityOnHand ?? 0),
      reorderLevel: String(inventoryItem.reorderLevel ?? 0),
      warehouseLocation: inventoryItem.warehouseLocation || "",
    });
    setAdminMessage(`Editing inventory for ${inventoryItem.productId?.name || "product"}`);
  };

  const handleInventorySave = async (event) => {
    event.preventDefault();

    if (!inventoryForm.id) {
      setAdminMessage("Choose an inventory item first.");
      return;
    }

    setSavingInventory(true);
    const result = await updateInventoryItem(inventoryForm.id, {
      quantityOnHand: Number(inventoryForm.quantityOnHand || 0),
      reorderLevel: Number(inventoryForm.reorderLevel || 0),
      warehouseLocation: inventoryForm.warehouseLocation,
    });
    setSavingInventory(false);

    if (result.ok) {
      setInventoryForm(initialInventoryForm);
      setAdminMessage("Inventory updated successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handleStockAdjust = async (inventoryId, adjustment) => {
    setAdjustingInventoryId(inventoryId);
    const result = await adjustInventoryStock(inventoryId, adjustment);
    setAdjustingInventoryId("");
    setAdminMessage(result.ok ? "Stock updated successfully." : result.message);
  };

  const handleSupplierSave = async (event) => {
    event.preventDefault();
    setSavingSupplier(true);
    const result = await saveSupplier(supplierForm);
    setSavingSupplier(false);
    if (result.ok) {
      setSupplierForm(initialSupplierForm);
      setAdminMessage("Supplier saved successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handlePurchaseSave = async (event) => {
    event.preventDefault();
    setSavingPurchase(true);
    const result = await createPurchase({
      ...purchaseForm,
      quantity: Number(purchaseForm.quantity || 0),
      costPrice: Number(purchaseForm.costPrice || 0),
    });
    setSavingPurchase(false);
    if (result.ok) {
      setPurchaseForm(initialPurchaseForm);
      setAdminMessage("Purchase recorded and stock updated.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handleExpenseSave = async (event) => {
    event.preventDefault();
    setSavingExpense(true);
    const result = await createExpense({
      ...expenseForm,
      amount: Number(expenseForm.amount || 0),
    });
    setSavingExpense(false);
    if (result.ok) {
      setExpenseForm(initialExpenseForm);
      setAdminMessage("Expense saved successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handleShipmentSave = async (event) => {
    event.preventDefault();
    setSavingShipment(true);
    const result = await saveShipment(shipmentForm);
    setSavingShipment(false);
    if (result.ok) {
      setShipmentForm(initialShipmentForm);
      setAdminMessage("Shipment saved successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handlePosUserSave = async (event) => {
    event.preventDefault();
    setSavingPosUser(true);
    const result = await createPosUser(posUserForm);
    setSavingPosUser(false);

    if (result.ok) {
      setPosUserForm(initialPosUserForm);
      setAdminMessage("POS manager account created successfully.");
    } else {
      setAdminMessage(result.message);
    }
  };

  const handleReturnStatusChange = async (returnId, status) => {
    setUpdatingReturnId(returnId);
    const result = await updateReturnStatus(returnId, status);
    setUpdatingReturnId("");
    setAdminMessage(result.ok ? "Return status updated." : result.message);
  };

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== "admin") {
    return <Navigate to="/account" replace />;
  }

  return (
    <section className="container page-stack page-pad">
      <div className="account-hero">
        <div>
          <span className="eyebrow">Admin Control</span>
          <h1>Inventory and sales dashboard</h1>
          <p>Manage products, categories, stock, and orders from one clean admin workspace.</p>
        </div>
        <div className="account-badge-card">
          <small>Admin session</small>
          <strong>{currentUser.email}</strong>
          <span>{adminLoading ? "Refreshing dashboard..." : "Products, orders, and stock in one place"}</span>
        </div>
      </div>

      <div className="account-grid">
        <article className="panel-card"><h3>Total revenue</h3><p>{formatPrice(metrics?.totalRevenue || 0)}</p><small>All-time sales</small></article>
        <article className="panel-card"><h3>Today revenue</h3><p>{formatPrice(metrics?.todayRevenue || 0)}</p><small>Daily earnings</small></article>
        <article className="panel-card"><h3>Orders</h3><p>{metrics?.totalOrders || 0}</p><small>Total completed orders</small></article>
      </div>

      <div className="account-grid">
        <article className="panel-card"><h3>Products</h3><p>{metrics?.totalProducts || products.length}</p><small>Items in inventory</small></article>
        <article className="panel-card"><h3>Categories</h3><p>{metrics?.totalCategories || categories.length}</p><small>Store groups</small></article>
        <article className="panel-card"><h3>Low stock</h3><p>{metrics?.lowStockCount || lowStockProducts.length}</p><small>Products that need restocking</small></article>
      </div>

      <div className="account-grid">
        <article className="panel-card"><h3>Purchase cost</h3><p>{formatPrice(metrics?.totalPurchaseCost || 0)}</p><small>Supplier buying total</small></article>
        <article className="panel-card"><h3>Expenses</h3><p>{formatPrice(metrics?.totalExpenses || 0)}</p><small>Bills and running costs</small></article>
        <article className="panel-card"><h3>Net profit</h3><p>{formatPrice(metrics?.netProfit || 0)}</p><small>Revenue minus cost and expenses</small></article>
      </div>

      {adminMessage ? <div className="inline-notice"><strong>Admin update</strong><p>{adminMessage}</p></div> : null}

      <div className="admin-grid">
        <article className="panel-card">
          <div className="admin-panel-head">
            <h3>{productForm.id ? "Edit product" : "Add product"}</h3>
            {productForm.id ? (
              <button type="button" className="ghost-link" onClick={() => setProductForm(initialProductForm)}>
                Clear
              </button>
            ) : null}
          </div>
          <form className="auth-form" onSubmit={handleProductSave}>
            <input placeholder="Product name" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Brand" value={productForm.brand} onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))} />
            <input placeholder="Price" type="number" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} />
            <select value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <input placeholder="Stock" type="number" value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))} />
            <input placeholder="Image path or URL" value={productForm.image} onChange={(event) => setProductForm((current) => ({ ...current, image: event.target.value }))} />
            <input placeholder="Description" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
            <input placeholder="Discount percent" type="number" value={productForm.discountPercent} onChange={(event) => setProductForm((current) => ({ ...current, discountPercent: event.target.value }))} />
            <input placeholder="Deal title" value={productForm.dealTitle} onChange={(event) => setProductForm((current) => ({ ...current, dealTitle: event.target.value }))} />
            <input aria-label="Deal end date" type="date" value={productForm.dealEndsAt} onChange={(event) => setProductForm((current) => ({ ...current, dealEndsAt: event.target.value }))} />
            <label className="option-card">
              <input type="checkbox" checked={productForm.isDealActive} onChange={(event) => setProductForm((current) => ({ ...current, isDealActive: event.target.checked }))} />
              <span className="radio-dot" />
              <div>
                <strong>Show on deals page</strong>
                <p>Only active products with a valid deal will appear for customers.</p>
              </div>
            </label>
            {productForm.isDealActive ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setProductForm((current) => ({ ...current, isDealActive: false, discountPercent: "0", dealTitle: "", dealEndsAt: "" }))}
              >
                Remove deal
              </button>
            ) : null}
            <button type="submit" className="primary-button" disabled={savingProduct}>{savingProduct ? "Saving..." : productForm.id ? "Update product" : "Save product"}</button>
          </form>
        </article>

        <article className="panel-card">
          <div className="admin-panel-head">
            <h3>{categoryForm.id ? "Edit category" : "Add category"}</h3>
            {categoryForm.id ? (
              <button type="button" className="ghost-link" onClick={() => setCategoryForm(initialCategoryForm)}>
                Clear
              </button>
            ) : null}
          </div>
          <form className="auth-form" onSubmit={handleCategorySave}>
            <input placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
            <button type="submit" className="primary-button" disabled={savingCategory}>{savingCategory ? "Saving..." : categoryForm.id ? "Update category" : "Save category"}</button>
          </form>

          <div className="list-stack admin-list">
            {categories.map((category) => (
              <div key={category.id} className="list-row">
                <div>
                  <strong>{category.name}</strong>
                  <p>Store category</p>
                </div>
                <div className="admin-actions-row">
                  <button type="button" className="ghost-link" onClick={() => handleEditCategory(category)}>Edit</button>
                  <button type="button" className="ghost-link" onClick={() => handleDeleteCategory(category.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="admin-grid">
        <article className="panel-card">
          <div className="admin-panel-head">
            <h3>{inventoryForm.id ? "Edit inventory" : "Inventory controls"}</h3>
            {inventoryForm.id ? (
              <button type="button" className="ghost-link" onClick={() => setInventoryForm(initialInventoryForm)}>
                Clear
              </button>
            ) : null}
          </div>
          <p className="admin-panel-copy">Adjust stock, reorder level, and storage details from one place.</p>
          <form className="auth-form" onSubmit={handleInventorySave}>
            <input
              placeholder="Quantity on hand"
              type="number"
              value={inventoryForm.quantityOnHand}
              onChange={(event) => setInventoryForm((current) => ({ ...current, quantityOnHand: event.target.value }))}
            />
            <input
              placeholder="Reorder level"
              type="number"
              value={inventoryForm.reorderLevel}
              onChange={(event) => setInventoryForm((current) => ({ ...current, reorderLevel: event.target.value }))}
            />
            <input
              placeholder="Warehouse location"
              value={inventoryForm.warehouseLocation}
              onChange={(event) => setInventoryForm((current) => ({ ...current, warehouseLocation: event.target.value }))}
            />
            <button type="submit" className="primary-button" disabled={savingInventory}>
              {savingInventory ? "Saving..." : "Save inventory"}
            </button>
          </form>
        </article>

        <article className="panel-card">
          <h3>Inventory list</h3>
          <p className="admin-panel-copy">Current stock, reorder levels, and linked product details.</p>
          <div className="list-stack admin-list">
            {adminLoading ? <p>Loading inventory...</p> : null}
            {!adminLoading && !inventoryItems.length ? (
              <p>No inventory records are available yet. Save a product and the stock entry will appear automatically.</p>
            ) : null}
            {!adminLoading && inventoryItems.map((inventoryItem) => {
              const product = inventoryItem.productId;
              if (!product) {
                return null;
              }

              return (
                <div key={inventoryItem._id || inventoryItem.id} className="list-row list-row-top">
                  <div>
                    <strong>{product.name}</strong>
                    <p>
                      {product.category?.name || product.categoryName || "General Parts"} - Stock {inventoryItem.quantityOnHand} - {formatPrice(product.price || 0)}
                    </p>
                    <p>
                      Reorder at {inventoryItem.reorderLevel ?? 0} - {inventoryItem.warehouseLocation || "Main warehouse"}
                    </p>
                  </div>
                  <div className="admin-actions-stack">
                    <div className="admin-actions-row">
                      <button
                        type="button"
                        className="ghost-link"
                        disabled={adjustingInventoryId === (inventoryItem._id || inventoryItem.id)}
                        onClick={() => handleStockAdjust(inventoryItem._id || inventoryItem.id, -1)}
                      >
                        -1 stock
                      </button>
                      <button
                        type="button"
                        className="ghost-link"
                        disabled={adjustingInventoryId === (inventoryItem._id || inventoryItem.id)}
                        onClick={() => handleStockAdjust(inventoryItem._id || inventoryItem.id, 1)}
                      >
                        +1 stock
                      </button>
                      <button type="button" className="ghost-link" onClick={() => handleEditInventory(inventoryItem)}>
                        Inventory
                      </button>
                    </div>
                    <div className="admin-actions-row">
                    <button type="button" className="ghost-link" onClick={() => handleEditProduct({
                      id: product._id || product.id,
                      name: product.name,
                      brand: product.brand,
                      price: product.price,
                      categoryName: product.category?.name || product.categoryName,
                      stock: inventoryItem.quantityOnHand,
                      image: product.image,
                      description: product.description,
                      dealEndsAt: product.dealEndsAt,
                    })}>Product</button>
                    <button type="button" className="ghost-link" onClick={() => handleDeleteProduct(product._id || product.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel-card">
          <h3>Recent orders</h3>
          <p className="admin-panel-copy">Track current order totals and update delivery progress from one place.</p>
          <div className="list-stack admin-list">
            {recentOrders.length ? recentOrders.map((order) => (
              <div key={order._id} className="list-row list-row-top">
                <div>
                  <strong>#{String(order._id).slice(-6).toUpperCase()}</strong>
                  <p>{order.customer?.name || order.user?.name || "Customer"} - {formatPrice(order.totals?.grandTotal || 0)}</p>
                </div>
                <div className="admin-order-controls">
                  <select
                    value={order.rawStatus || "confirmed"}
                    disabled={updatingOrderId === order._id}
                    onChange={(event) => handleOrderStatusChange(order._id, event.target.value)}
                  >
                    {orderStatuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  <span className="status-pill">{order.status || "Confirmed"}</span>
                </div>
              </div>
            )) : <p>No orders yet.</p>}
          </div>
        </article>
      </div>

      <article className="panel-card">
        <h3>Low stock watch</h3>
        <p className="admin-panel-copy">Items that are close to running out and may need a supplier purchase soon.</p>
        <div className="list-stack admin-list compact-list">
          {lowStockProducts.length ? lowStockProducts.map((product) => (
            <div key={product._id || product.id} className="list-row">
              <div>
                <strong>{product.name}</strong>
                <p>{product.category?.name || product.categoryName || "General Parts"} - Stock {product.stock}</p>
              </div>
              <span className="status-pill muted">Restock soon</span>
            </div>
          )) : <p>No low-stock products right now.</p>}
        </div>
      </article>

      <div className="admin-grid">
        <article className="panel-card">
          <h3>Suppliers</h3>
          <p className="admin-panel-copy">Save supplier contacts so purchases are linked to real vendors in the database.</p>
          <form className="auth-form" onSubmit={handleSupplierSave}>
            <input placeholder="Supplier name" value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Phone" value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
            <input placeholder="Email" value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
            <input placeholder="City" value={supplierForm.city} onChange={(event) => setSupplierForm((current) => ({ ...current, city: event.target.value }))} />
            <input placeholder="Address" value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
            <button type="submit" className="primary-button" disabled={savingSupplier}>{savingSupplier ? "Saving..." : "Save supplier"}</button>
          </form>
          <div className="list-stack admin-list compact-list">
            {suppliers.length ? suppliers.map((supplier) => (
              <div key={supplier._id} className="list-row">
                <div>
                  <strong>{supplier.name}</strong>
                  <p>{supplier.phone} - {supplier.city || "City not set"}</p>
                </div>
              </div>
            )) : <p>No suppliers saved yet.</p>}
          </div>
        </article>

        <article className="panel-card">
          <h3>Purchases</h3>
          <p className="admin-panel-copy">Record which supplier sold you which item, at what cost, and how much stock came in.</p>
          <form className="auth-form" onSubmit={handlePurchaseSave}>
            <select value={purchaseForm.supplierId} onChange={(event) => setPurchaseForm((current) => ({ ...current, supplierId: event.target.value }))}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>{supplier.name}</option>
              ))}
            </select>
            <select value={purchaseForm.productId} onChange={(event) => setPurchaseForm((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <input placeholder="Quantity" type="number" value={purchaseForm.quantity} onChange={(event) => setPurchaseForm((current) => ({ ...current, quantity: event.target.value }))} />
            <input placeholder="Cost price" type="number" value={purchaseForm.costPrice} onChange={(event) => setPurchaseForm((current) => ({ ...current, costPrice: event.target.value }))} />
            <input placeholder="Notes" value={purchaseForm.notes} onChange={(event) => setPurchaseForm((current) => ({ ...current, notes: event.target.value }))} />
            <button type="submit" className="primary-button" disabled={savingPurchase}>{savingPurchase ? "Saving..." : "Record purchase"}</button>
          </form>
          <div className="list-stack admin-list compact-list">
            {purchases.length ? purchases.map((purchase) => (
              <div key={purchase._id} className="list-row list-row-top">
                <div>
                  <strong>{purchase.supplierId?.name || "Supplier"}</strong>
                  <p>{purchase.status} - Bought for {formatPrice(purchase.totalAmount || 0)}</p>
                  {(purchase.items || []).map((item) => (
                    <p key={item._id || item.productId?._id}>
                      {item.productId?.name || "Product"} - Qty {item.quantity} - Buy {formatPrice(item.costPrice || 0)} - Sale {formatPrice(item.salePrice || 0)} - Profit {formatPrice(item.expectedProfit || 0)}
                    </p>
                  ))}
                </div>
                <div className="admin-order-controls">
                  <button
                    type="button"
                    className="ghost-link"
                    onClick={async () => {
                      if (window.confirm(`Delete this purchase from ${purchase.supplierId?.name || "supplier"} for ${formatPrice(purchase.totalAmount || 0)}? Stock will be reverted.`)) {
                        const result = await deletePurchase(purchase._id);
                        setAdminMessage(result.ok ? "Purchase deleted and stock reverted." : result.message);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )) : <p>No purchases recorded yet.</p>}
          </div>
        </article>
      </div>

      <div className="admin-grid">
        <article className="panel-card">
          <h3>Expenses</h3>
          <p className="admin-panel-copy">Add internet, electricity, rent, and other shop expenses to calculate real profit.</p>
          <form className="auth-form" onSubmit={handleExpenseSave}>
            <input placeholder="Expense title" value={expenseForm.title} onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))} />
            <input placeholder="Category" value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} />
            <input placeholder="Amount" type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} />
            <input type="date" value={expenseForm.expenseDate} onChange={(event) => setExpenseForm((current) => ({ ...current, expenseDate: event.target.value }))} />
            <input placeholder="Notes" value={expenseForm.notes} onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))} />
            <button type="submit" className="primary-button" disabled={savingExpense}>{savingExpense ? "Saving..." : "Save expense"}</button>
          </form>
        </article>

        <article className="panel-card">
          <h3>Expense list</h3>
          <p className="admin-panel-copy">All running costs that are deducted from your gross profit.</p>
          <div className="list-stack admin-list compact-list">
            {expenses.length ? expenses.map((expense) => (
              <div key={expense._id} className="list-row">
                <div>
                  <strong>{expense.title}</strong>
                  <p>{expense.category} - {formatPrice(expense.amount || 0)}</p>
                </div>
              </div>
            )) : <p>No expenses saved yet.</p>}
          </div>
        </article>
      </div>

      <div className="admin-grid">
        <article className="panel-card">
          <h3>Shipments</h3>
          <p className="admin-panel-copy">Attach carrier and tracking details to orders so shipping records appear in Atlas.</p>
          <form className="auth-form" onSubmit={handleShipmentSave}>
            <select value={shipmentForm.orderId} onChange={(event) => setShipmentForm((current) => ({ ...current, orderId: event.target.value }))}>
              <option value="">Select order</option>
              {recentOrders.map((order) => (
                <option key={order._id} value={order._id}>#{String(order._id).slice(-6).toUpperCase()}</option>
              ))}
            </select>
            <input placeholder="Carrier" value={shipmentForm.carrier} onChange={(event) => setShipmentForm((current) => ({ ...current, carrier: event.target.value }))} />
            <input placeholder="Tracking number" value={shipmentForm.trackingNumber} onChange={(event) => setShipmentForm((current) => ({ ...current, trackingNumber: event.target.value }))} />
            <select value={shipmentForm.status} onChange={(event) => setShipmentForm((current) => ({ ...current, status: event.target.value }))}>
              {shipmentStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button type="submit" className="primary-button" disabled={savingShipment}>{savingShipment ? "Saving..." : "Save shipment"}</button>
          </form>
          <div className="list-stack admin-list compact-list">
            {uniqueShipments.length ? uniqueShipments.map((shipment) => (
              <div key={shipment._id} className="list-row">
                <div>
                  <strong>
                    Order #{String(shipment.orderId?._id || shipment.orderId || shipment._id).slice(-6).toUpperCase()}
                  </strong>
                  <p>{shipment.carrier || "Shipment record"} - {shipment.status}</p>
                  <p>{shipment.trackingNumber || "No tracking number yet"}</p>
                </div>
              </div>
            )) : <p>No shipments saved yet.</p>}
          </div>
        </article>

        <article className="panel-card">
          <h3>Returns</h3>
          <p className="admin-panel-copy">Review and update customer return requests.</p>
          <div className="list-stack admin-list compact-list">
            {returns.length ? returns.map((returnRecord) => (
              <div key={returnRecord._id} className="list-row list-row-top">
                <div>
                  <strong>#{String(returnRecord.orderId?._id || returnRecord.orderId).slice(-6).toUpperCase()}</strong>
                  <p>{returnRecord.reason}</p>
                </div>
                <div className="admin-order-controls">
                  <select
                    value={returnRecord.status || "requested"}
                    disabled={updatingReturnId === returnRecord._id}
                    onChange={(event) => handleReturnStatusChange(returnRecord._id, event.target.value)}
                  >
                    {returnStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <span className="status-pill">{returnRecord.status || "requested"}</span>
                </div>
              </div>
            )) : <p>No returns recorded yet.</p>}
          </div>
        </article>
      </div>

      <div className="admin-grid">
        <article className="panel-card">
          <h3>POS manager accounts</h3>
          <p className="admin-panel-copy">Create counter-sale logins for staff. These accounts open the separate POS dashboard only.</p>
          <form className="auth-form" onSubmit={handlePosUserSave}>
            <input placeholder="Manager name" value={posUserForm.name} onChange={(event) => setPosUserForm((current) => ({ ...current, name: event.target.value }))} />
            <input placeholder="Email" type="email" value={posUserForm.email} onChange={(event) => setPosUserForm((current) => ({ ...current, email: event.target.value }))} />
            <input placeholder="Phone" value={posUserForm.phone} onChange={(event) => setPosUserForm((current) => ({ ...current, phone: event.target.value }))} />
            <input placeholder="Password" type="password" value={posUserForm.password} onChange={(event) => setPosUserForm((current) => ({ ...current, password: event.target.value }))} />
            <button type="submit" className="primary-button" disabled={savingPosUser}>{savingPosUser ? "Creating..." : "Create POS account"}</button>
          </form>
          {adminMessage ? <p className={/success|created|saved/i.test(adminMessage) ? "form-success" : "form-error"}>{adminMessage}</p> : null}
          <div className="list-stack admin-list compact-list">
            {posUsers.length ? posUsers.map((user) => (
              <div key={user._id} className="list-row list-row-top">
                <div>
                  <strong>{user.name}</strong>
                  <p>{user.email} - {user.phone || "No phone"}</p>
                  <p>Role: POS manager</p>
                </div>
                <div className="admin-order-controls">
                  <span className="status-pill">Active</span>
                  <button
                    type="button"
                    className="ghost-link"
                    onClick={async () => {
                      if (window.confirm(`Delete POS manager "${user.name}"? This cannot be undone.`)) {
                        const result = await deletePosUser(user._id);
                        setAdminMessage(result.ok ? `POS manager "${user.name}" deleted successfully.` : result.message);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )) : <p>No POS managers created yet.</p>}
          </div>
        </article>

        <article className="panel-card">
          <h3>Employee activity</h3>
          <p className="admin-panel-copy">Recent POS, purchase, expense, shipment, and return actions saved in the database.</p>
          <div className="list-stack admin-list compact-list">
            {activityLogs.length ? activityLogs.slice(0, 12).map((log) => (
              <div key={log._id} className="list-row list-row-top">
                <div>
                  <strong>{log.description || `${log.module} ${log.action}`}</strong>
                  <p>{log.actorName || log.actorId?.name || "System"} - {log.actorRole || "system"}</p>
                </div>
                <div className="admin-order-controls">
                  <small>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</small>
                  <button
                    type="button"
                    className="ghost-link"
                    onClick={async () => {
                      const result = await deleteActivityLog(log._id);
                      setAdminMessage(result.ok ? "Activity log deleted." : result.message);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )) : <p>No employee activity recorded yet.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminPage;
