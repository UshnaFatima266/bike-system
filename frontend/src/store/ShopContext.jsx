/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { featuredPosts, products as fallbackProducts, categories as fallbackCategories } from "../data/products";

const ShopContext = createContext(null);
const STORAGE_KEY = "bikex-current-user";
const accents = ["red", "blue", "cyan", "yellow", "teal", "orange"];
const badges = ["Hot Deal", "Workshop Pick", "New", "Best Seller", "Bundle", "Limited"];
const deliveryFee = 200;

const API_BASE = typeof import.meta.env?.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.trim() ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const api = (path) => `${API_BASE}${path}`;

function slugify(value) {
  return String(value ?? "item")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCategory(category, index = 0) {
  if (!category) {
    return { id: `category-${index}`, name: "General Parts" };
  }

  if (typeof category === "string") {
    return { id: slugify(category), name: category };
  }

  return {
    id: category._id || category.id || `category-${index}`,
    name: category.name || `Category ${index + 1}`,
  };
}

function normalizeProduct(product, index = 0) {
  const categoryName = typeof product.category === "object" ? product.category?.name : product.category;
  const normalizedCategory = typeof product.category === "object"
    ? (product.category?._id || product.category?.id || slugify(product.category?.name || "general"))
    : (product.categoryId || product.category || "general");
  const basePrice = Number(product.price ?? 0);
  const discountPercent = Number(product.discountPercent ?? 0);
  const dealEndsAt = product.dealEndsAt ? new Date(product.dealEndsAt) : null;
  const dealStillActive = !dealEndsAt || dealEndsAt >= new Date();
  const isDealActive = Boolean(product.isDealActive) && discountPercent > 0 && dealStillActive;
  const livePrice = isDealActive ? Math.max(Math.round(basePrice * (100 - discountPercent) / 100), 1) : basePrice;
  const fallbackDescription = `Reliable ${product.name || "bike part"} for workshop servicing and daily riders.`;
  const fallbackSlug = product.slug || `${slugify(product.name)}-${String(product._id || index).slice(-6)}`;

  return {
    id: product._id || product.id || `product-${index}`,
    slug: fallbackSlug,
    name: product.name || `Product ${index + 1}`,
    category: normalizedCategory,
    categoryName: categoryName || "General Parts",
    brand: product.brand || "Universal",
    basePrice,
    price: livePrice,
    oldPrice: isDealActive ? basePrice : Number(product.oldPrice ?? Math.max(basePrice + 12, basePrice)),
    stock: Number(product.stock ?? 0),
    rating: Number(product.rating ?? 4.5).toFixed(1),
    badge: product.dealTitle || product.badge || badges[index % badges.length],
    accent: product.accent || accents[index % accents.length],
    sku: product.sku || `SKU-${String(product._id || index).slice(-6).toUpperCase()}`,
    imageLabel: product.imageLabel || product.name || "Bike Part",
    imageBaseName: slugify(product.name),
    image: product.image || "",
    description: product.description || fallbackDescription,
    specs: Array.isArray(product.specs) && product.specs.length ? product.specs : ["Workshop ready", "Quality checked", "Fast dispatch"],
    soldCount: Number(product.soldCount ?? 0),
    discountPercent,
    isDealActive,
    dealTitle: product.dealTitle || "",
    dealEndsAt: product.dealEndsAt || null,
    isOutOfStock: Number(product.stock ?? 0) <= 0,
  };
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id || user._id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    city: user.city || "",
    address: user.address || "",
    role: user.role || "user",
    createdAt: user.createdAt || "",
  };
}

function normalizeOrder(order, index = 0) {
  const statusValue = String(order.status || "confirmed").toLowerCase().replace(/\s+/g, "-");
  const statusLabel = statusValue
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: order._id || order.id || `order-${index}`,
    createdAt: order.createdAt,
    status: statusLabel,
    rawStatus: statusValue,
    deliveryPreference: order.deliveryPreference || "standard-dispatch",
    paymentMethod: order.paymentMethod || "cash-on-delivery",
    customer: order.customer || {},
    totals: {
      subtotal: Number(order.totals?.subtotal ?? order.subtotal ?? 0),
      delivery: Number(order.totals?.delivery ?? order.shippingFee ?? deliveryFee),
      grandTotal: Number(order.totals?.grandTotal ?? order.totalAmount ?? 0),
    },
    items: Array.isArray(order.items) ? order.items.map((item) => ({
      productId: item.product || item.productId || item.id,
      name: item.name || "Product",
      price: Number(item.price ?? 0),
      quantity: Number(item.quantity ?? 0),
      imageBaseName: slugify(item.name),
    })) : [],
  };
}

function normalizePosSale(sale, index = 0) {
  return {
    id: sale._id || sale.id || `pos-sale-${index}`,
    saleNumber: sale.saleNumber || `POS-${String(sale._id || index).slice(-6).toUpperCase()}`,
    saleDate: sale.saleDate || sale.createdAt || new Date().toISOString(),
    customerName: sale.customerName || sale.customerId?.name || "Walk-in Customer",
    customerPhone: sale.customerPhone || sale.customerId?.phone || "",
    cashierName: sale.cashierId?.name || "Cashier",
    paymentMethod: sale.paymentMethod || "cash",
    totalAmount: Number(sale.totalAmount || 0),
    subtotal: Number(sale.subtotal || 0),
    discountAmount: Number(sale.discountAmount || 0),
    taxAmount: Number(sale.taxAmount || 0),
    itemsCount: Number(sale.itemsCount || 0),
    status: sale.status || "completed",
    notes: sale.notes || "",
    items: Array.isArray(sale.items)
      ? sale.items.map((item) => ({
          id: item._id || item.id,
          productId: item.productId,
          name: item.name || "Product",
          quantity: Number(item.quantity || 0),
          quantityReturned: Number(item.quantityReturned || 0),
          unitPrice: Number(item.unitPrice || 0),
          lineTotal: Number(item.lineTotal || 0),
        }))
      : [],
  };
}

function mergeCartItems(items = []) {
  const merged = new Map();

  items.forEach((item) => {
    const rawProductId = item.productId?._id || item.productId || item.id;

    if (!rawProductId) {
      return;
    }

    const productId = String(rawProductId);
    const quantity = Number(item.quantity || 0);

    if (!quantity) {
      return;
    }

    const existing = merged.get(productId);
    merged.set(productId, {
      productId,
      quantity: (existing?.quantity || 0) + quantity,
    });
  });

  return Array.from(merged.values());
}

function loadStoredUser() {
  try {
    const rawUser = window.localStorage.getItem(STORAGE_KEY);
    return rawUser ? normalizeUser(JSON.parse(rawUser)) : null;
  } catch {
    return null;
  }
}

export function ShopProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [authError, setAuthError] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [directCheckoutItems, setDirectCheckoutItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => loadStoredUser());
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [posUsers, setPosUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [posProducts, setPosProducts] = useState([]);
  const [posCategories, setPosCategories] = useState([]);
  const [posCustomers, setPosCustomers] = useState([]);
  const [posRecentSales, setPosRecentSales] = useState([]);
  const [posReports, setPosReports] = useState([]);
  const [posTodayReport, setPosTodayReport] = useState(null);
  const [posPaymentMethods, setPosPaymentMethods] = useState(["cash", "card", "jazzcash", "easypaisa"]);
  const [posLoading, setPosLoading] = useState(false);

  const persistCart = useCallback(async (nextCartItems) => {
    if (!currentUser?.id) {
      return;
    }

    try {
      await fetch(api("/api/cart"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          items: nextCartItems,
        }),
      });
    } catch (persistError) {
      console.error(persistError);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const loadStore = async () => {
      try {
        setLoading(true);
        setError("");

        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch(api("/api/products")),
          fetch(api("/api/categories")),
        ]);

        if (!productsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Failed to load store data from backend");
        }

        const [productsData, categoriesData] = await Promise.all([
          productsResponse.json(),
          categoriesResponse.json(),
        ]);

        setCategories((categoriesData || []).map(normalizeCategory));
        setProducts((productsData || []).map(normalizeProduct));
      } catch (fetchError) {
        console.error(fetchError);
        setError("Backend data could not be loaded. Showing fallback demo items.");
        setCategories(fallbackCategories);
        setProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, []);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentUser, persistCart]);

  useEffect(() => {
    const loadOrders = async () => {
      if (!currentUser?.id) {
        setOrders([]);
        setReturnRequests([]);
        return;
      }

      try {
        setOrdersLoading(true);
        const [ordersResponse, returnsResponse] = await Promise.all([
          fetch(api(`/api/orders/user/${currentUser.id}`)),
          fetch(api(`/api/orders/user/${currentUser.id}/returns`)),
        ]);

        if (!ordersResponse.ok || !returnsResponse.ok) {
          throw new Error("Failed to load orders");
        }

        const [ordersData, returnsData] = await Promise.all([
          ordersResponse.json(),
          returnsResponse.json(),
        ]);

        setOrders((ordersData || []).map(normalizeOrder));
        setReturnRequests(returnsData || []);
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [currentUser]);

  useEffect(() => {
    const loadCart = async () => {
      if (!currentUser?.id) {
        setCartItems([]);
        return;
      }

      try {
        const response = await fetch(api(`/api/cart/${currentUser.id}`));

        if (!response.ok) {
          throw new Error("Failed to load cart");
        }

        const data = await response.json();
        const mergedItems = mergeCartItems(data.items || []);
        setCartItems(mergedItems);

        if ((data.items || []).length !== mergedItems.length) {
          persistCart(mergedItems);
        }
      } catch (loadError) {
        console.error(loadError);
      }
    };

    loadCart();
  }, [currentUser, persistCart]);

  useEffect(() => {
    const loadAdminOverview = async () => {
      if (currentUser?.role !== "admin") {
        setAdminOverview(null);
        return;
      }

      try {
        setAdminLoading(true);
        const response = await fetch(api("/api/orders/admin/overview"));

        if (!response.ok) {
          throw new Error("Failed to load admin overview");
        }

        const data = await response.json();
        setAdminOverview(data);
        setProducts((data.products || []).map(normalizeProduct));
        setCategories((data.categories || []).map(normalizeCategory));
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setAdminLoading(false);
      }
    };

    loadAdminOverview();
  }, [currentUser]);

  useEffect(() => {
    const loadAdminCollections = async () => {
      if (currentUser?.role !== "admin") {
        setSuppliers([]);
        setPurchases([]);
        setExpenses([]);
        setShipments([]);
        setReturns([]);
        setPosUsers([]);
        setActivityLogs([]);
        return;
      }

      try {
        const [
          supplierResponse,
          purchaseResponse,
          expenseResponse,
          shipmentResponse,
          returnResponse,
          posUserResponse,
          activityLogResponse,
        ] = await Promise.all([
          fetch(api("/api/admin/suppliers")),
          fetch(api("/api/admin/purchases")),
          fetch(api("/api/admin/expenses")),
          fetch(api("/api/admin/shipments")),
          fetch(api("/api/admin/returns")),
          fetch(api("/api/admin/pos-users")),
          fetch(api("/api/admin/activity-logs")),
        ]);

        const [supplierData, purchaseData, expenseData, shipmentData, returnData, posUserData, activityLogData] = await Promise.all([
          supplierResponse.json(),
          purchaseResponse.json(),
          expenseResponse.json(),
          shipmentResponse.json(),
          returnResponse.json(),
          posUserResponse.json(),
          activityLogResponse.json(),
        ]);

        setSuppliers(supplierData || []);
        setPurchases(purchaseData || []);
        setExpenses(expenseData || []);
        setShipments(shipmentData || []);
        setReturns(returnData || []);
        setPosUsers(posUserData || []);
        setActivityLogs(activityLogData || []);
      } catch (loadError) {
        console.error(loadError);
      }
    };

    loadAdminCollections();
  }, [currentUser]);

  useEffect(() => {
    const loadPosBootstrapData = async () => {
      if (!["admin", "cashier"].includes(currentUser?.role)) {
        setPosProducts([]);
        setPosCategories([]);
        setPosCustomers([]);
        setPosRecentSales([]);
        setPosReports([]);
        setPosTodayReport(null);
        return;
      }

      try {
        setPosLoading(true);
        const [bootstrapResponse, reportsResponse] = await Promise.all([
          fetch(api(`/api/pos/bootstrap?userId=${currentUser.id}`)),
          fetch(api(`/api/pos/reports?userId=${currentUser.id}`)),
        ]);

        const bootstrapData = await bootstrapResponse.json();
        const reportsData = await reportsResponse.json();

        if (bootstrapResponse.ok) {
          setPosProducts((bootstrapData.products || []).map(normalizeProduct));
          setPosCategories((bootstrapData.categories || []).map(normalizeCategory));
          setPosCustomers(bootstrapData.customers || []);
          setPosRecentSales((bootstrapData.recentSales || []).map(normalizePosSale));
          setPosTodayReport(bootstrapData.todayReport || null);
          setPosPaymentMethods(bootstrapData.paymentMethods || ["cash", "card", "jazzcash", "easypaisa"]);
        }

        if (reportsResponse.ok) {
          setPosReports(reportsData.reports || []);
          if (!bootstrapResponse.ok) {
            setPosRecentSales((reportsData.recentSales || []).map(normalizePosSale));
          }
        }
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setPosLoading(false);
      }
    };

    loadPosBootstrapData();
  }, [currentUser]);

  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand))).sort(), [products]);
  const bestSellerProducts = useMemo(
    () => [...products].sort((left, right) => right.soldCount - left.soldCount || left.name.localeCompare(right.name)),
    [products],
  );
  const dealProducts = useMemo(
    () => products.filter((product) => product.isDealActive).sort((left, right) => right.discountPercent - left.discountPercent),
    [products],
  );

  const addToCart = (productId, quantity = 1) => {
    if (currentUser?.role === "admin") {
      return;
    }

    setDirectCheckoutItems([]);
    setCartItems((current) => {
      const existing = current.find((item) => item.productId === productId);
      let nextCartItems;

      if (existing) {
        nextCartItems = current.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
        );
      } else {
        nextCartItems = [...current, { productId, quantity }];
      }

      const mergedCartItems = mergeCartItems(nextCartItems);
      persistCart(mergedCartItems);
      return mergedCartItems;
    });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCartItems((current) => {
        const nextCartItems = current.filter((item) => item.productId !== productId);
        persistCart(nextCartItems);
        return nextCartItems;
      });
      return;
    }

    setCartItems((current) => {
      const nextCartItems = current.map((item) => (item.productId === productId ? { ...item, quantity } : item));
      const mergedCartItems = mergeCartItems(nextCartItems);
      persistCart(mergedCartItems);
      return mergedCartItems;
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((current) => {
      const nextCartItems = current.filter((item) => item.productId !== productId);
      persistCart(nextCartItems);
      return nextCartItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    persistCart([]);
  };

  const beginDirectCheckout = (productId, quantity = 1) => {
    if (currentUser?.role === "admin") {
      return;
    }

    setPurchaseError("");
    setDirectCheckoutItems([{ productId, quantity }]);
  };

  const beginCartCheckout = () => {
    if (currentUser?.role === "admin") {
      return;
    }

    setPurchaseError("");
    setDirectCheckoutItems([]);
  };

  const clearDirectCheckout = () => {
    setDirectCheckoutItems([]);
  };

  const registerUser = async (payload) => {
    setAuthError("");

    try {
      const response = await fetch(api("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let data = {};

      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message = data.message || "Could not create account.";
        setAuthError(message);
        return { ok: false, message };
      }

      const user = normalizeUser(data.user);
      setCurrentUser(user);
      return { ok: true, user };
    } catch (requestError) {
      console.error(requestError);
      const message = "Could not connect to the auth service. Restart the backend server and try again.";
      setAuthError(message);
      return { ok: false, message };
    }
  };

  const loginUser = async (payload) => {
    setAuthError("");

    try {
      const response = await fetch(api("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let data = {};

      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message = data.message || "Could not log in.";
        setAuthError(message);
        return { ok: false, message };
      }

      const user = normalizeUser(data.user);
      setCurrentUser(user);
      return { ok: true, user };
    } catch (requestError) {
      console.error(requestError);
      const message = "Could not connect to the auth service. Restart the backend server and try again.";
      setAuthError(message);
      return { ok: false, message };
    }
  };

  const loginPosUser = async (payload) => {
    setAuthError("");

    try {
      const response = await fetch(api("/api/auth/pos-login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawResponse = await response.text();
      let data = {};

      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message = data.message || "Could not log in to POS.";
        setAuthError(message);
        return { ok: false, message };
      }

      const user = normalizeUser(data.user);
      setCurrentUser(user);
      return { ok: true, user };
    } catch (requestError) {
      console.error(requestError);
      const message = "Could not connect to the POS auth service. Restart the backend server and try again.";
      setAuthError(message);
      return { ok: false, message };
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setOrders([]);
    setAdminOverview(null);
    setPosProducts([]);
    setPosCategories([]);
    setPosCustomers([]);
    setPosRecentSales([]);
    setPosReports([]);
    setPosTodayReport(null);
    setPosUsers([]);
    setActivityLogs([]);
    setAuthError("");
  };

  const refreshAdminOverview = useCallback(async () => {
    if (currentUser?.role !== "admin") {
      return { ok: false, message: "Admin access required." };
    }

    try {
      setAdminLoading(true);
      const response = await fetch(api("/api/orders/admin/overview"));
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not load admin overview." };
      }

      setAdminOverview(data);
      setProducts((data.products || []).map(normalizeProduct));
      setCategories((data.categories || []).map(normalizeCategory));
      return { ok: true };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the admin service." };
    } finally {
      setAdminLoading(false);
    }
  }, [currentUser?.role]);

  const refreshAdminCollections = async () => {
    if (currentUser?.role !== "admin") {
      return;
    }

    try {
      const [
        supplierResponse,
        purchaseResponse,
        expenseResponse,
        shipmentResponse,
        returnResponse,
        posUserResponse,
        activityLogResponse,
      ] = await Promise.all([
        fetch(api("/api/admin/suppliers")),
        fetch(api("/api/admin/purchases")),
        fetch(api("/api/admin/expenses")),
        fetch(api("/api/admin/shipments")),
        fetch(api("/api/admin/returns")),
        fetch(api("/api/admin/pos-users")),
        fetch(api("/api/admin/activity-logs")),
      ]);

      const [supplierData, purchaseData, expenseData, shipmentData, returnData, posUserData, activityLogData] = await Promise.all([
        supplierResponse.json(),
        purchaseResponse.json(),
        expenseResponse.json(),
        shipmentResponse.json(),
        returnResponse.json(),
        posUserResponse.json(),
        activityLogResponse.json(),
      ]);

      setSuppliers(supplierData || []);
      setPurchases(purchaseData || []);
      setExpenses(expenseData || []);
      setShipments(shipmentData || []);
      setReturns(returnData || []);
      setPosUsers(posUserData || []);
      setActivityLogs(activityLogData || []);
    } catch (requestError) {
      console.error(requestError);
    }
  };

  const loadPosBootstrap = useCallback(async () => {
    if (!["admin", "cashier"].includes(currentUser?.role)) {
      return { ok: false, message: "POS access requires admin or cashier role." };
    }

    try {
      setPosLoading(true);
      const response = await fetch(api(`/api/pos/bootstrap?userId=${currentUser.id}`));
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not load POS." };
      }

      setPosProducts((data.products || []).map(normalizeProduct));
      setPosCategories((data.categories || []).map(normalizeCategory));
      setPosCustomers(data.customers || []);
      setPosRecentSales((data.recentSales || []).map(normalizePosSale));
      setPosTodayReport(data.todayReport || null);
      setPosPaymentMethods(data.paymentMethods || ["cash", "card", "jazzcash", "easypaisa"]);
      return { ok: true, data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS service." };
    } finally {
      setPosLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  const searchPosProducts = useCallback(async (filters = {}) => {
    if (!["admin", "cashier"].includes(currentUser?.role)) {
      return { ok: false, message: "POS access requires admin or cashier role." };
    }

    try {
      const params = new URLSearchParams({ userId: currentUser.id });
      if (filters.search?.trim()) params.set("search", filters.search.trim());
      if (filters.category?.trim()) params.set("category", filters.category.trim());
      if (filters.brand?.trim()) params.set("brand", filters.brand.trim());

      const response = await fetch(api(`/api/pos/products/search?${params.toString()}`));
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not search POS products." };
      }

      const normalized = (data || []).map(normalizeProduct);
      setPosProducts(normalized);
      return { ok: true, products: normalized };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS search service." };
    }
  }, [currentUser?.id, currentUser?.role]);

  const loadPosReports = useCallback(async () => {
    if (!["admin", "cashier"].includes(currentUser?.role)) {
      return { ok: false, message: "POS access requires admin or cashier role." };
    }

    try {
      const response = await fetch(api(`/api/pos/reports?userId=${currentUser.id}`));
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not load POS reports." };
      }

      setPosReports(data.reports || []);
      setPosRecentSales((data.recentSales || []).map(normalizePosSale));
      return { ok: true, data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS reports service." };
    }
  }, [currentUser?.id, currentUser?.role]);

  const createPosSale = useCallback(async (payload) => {
    if (!["admin", "cashier"].includes(currentUser?.role)) {
      return { ok: false, message: "POS access requires admin or cashier role." };
    }

    try {
      const response = await fetch(api("/api/pos/sales"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, userId: currentUser.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not complete POS sale." };
      }

      const normalizedSale = normalizePosSale({ ...data.sale, items: data.items || [] });
      setProducts((data.products || []).map(normalizeProduct));
      setPosProducts((data.products || []).map(normalizeProduct));
      setPosRecentSales((current) => [normalizedSale, ...current].slice(0, 25));
      setPosTodayReport(data.report || null);
      await Promise.all([
        currentUser?.role === "admin" ? refreshAdminOverview() : Promise.resolve({ ok: true }),
        loadPosReports(),
      ]);
      return { ok: true, sale: normalizedSale, items: data.items, report: data.report };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS sales service." };
    }
  }, [currentUser?.id, currentUser?.role, loadPosReports, refreshAdminOverview]);

  const returnPosSaleItems = useCallback(async (saleId, payload) => {
    if (!["admin", "cashier"].includes(currentUser?.role)) {
      return { ok: false, message: "POS access requires admin or cashier role." };
    }

    try {
      const response = await fetch(api(`/api/pos/sales/${saleId}/return`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, userId: currentUser.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not process POS return." };
      }

      await Promise.all([loadPosBootstrap(), loadPosReports(), refreshAdminOverview()]);
      return { ok: true, sale: data.sale, report: data.report };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS return service." };
    }
  }, [currentUser?.id, currentUser?.role, loadPosBootstrap, loadPosReports, refreshAdminOverview]);

  const updateDailyRegister = useCallback(async (payload) => {
    if (currentUser?.role !== "admin") {
      return { ok: false, message: "Only admin can update the daily register." };
    }

    try {
      const response = await fetch(api("/api/pos/reports/register"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, userId: currentUser.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not update the daily register." };
      }

      setPosTodayReport(data);
      await loadPosReports();
      return { ok: true, report: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS register service." };
    }
  }, [currentUser?.id, currentUser?.role, loadPosReports]);

  const updateInventoryItem = async (inventoryId, payload) => {
    try {
      const response = await fetch(api(`/api/admin/inventory/${inventoryId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not update inventory item." };
      }

      await refreshAdminOverview();
      return { ok: true, inventory: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the inventory service." };
    }
  };

  const adjustInventoryStock = async (inventoryId, adjustment) => {
    try {
      const response = await fetch(api(`/api/admin/inventory/${inventoryId}/adjust`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not adjust stock." };
      }

      await refreshAdminOverview();
      return { ok: true, inventory: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the inventory service." };
    }
  };

  const saveSupplier = async (payload) => {
    try {
      const response = await fetch(api("/api/admin/suppliers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not save supplier." };
      }

      await refreshAdminCollections();
      return { ok: true, supplier: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the supplier service." };
    }
  };

  const createPurchase = async (payload) => {
    try {
      const response = await fetch(api("/api/admin/purchases"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not create purchase." };
      }

      await Promise.all([refreshAdminCollections(), refreshAdminOverview()]);
      return { ok: true, purchase: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the purchase service." };
    }
  };

  const deletePurchase = async (purchaseId) => {
    try {
      const response = await fetch(api(`/api/admin/purchases/${purchaseId}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser?.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not delete purchase." };
      }

      await Promise.all([refreshAdminCollections(), refreshAdminOverview()]);
      return { ok: true };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the purchase service." };
    }
  };

  const createExpense = async (payload) => {
    try {
      const response = await fetch(api("/api/admin/expenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not save expense." };
      }

      await Promise.all([refreshAdminCollections(), refreshAdminOverview()]);
      return { ok: true, expense: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the expense service." };
    }
  };

  const saveShipment = async (payload) => {
    try {
      const response = await fetch(api("/api/admin/shipments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not save shipment." };
      }

      await refreshAdminCollections();
      return { ok: true, shipment: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the shipment service." };
    }
  };

  const createPosUser = async (payload) => {
    if (currentUser?.role !== "admin") {
      return { ok: false, message: "Only admin can create POS manager accounts." };
    }

    try {
      const response = await fetch(api("/api/admin/pos-users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, adminId: currentUser.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not create POS manager." };
      }

      await refreshAdminCollections();
      return { ok: true, user: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS account service." };
    }
  };

  const updatePosUserStatus = async (userId, isActive) => {
    if (currentUser?.role !== "admin") {
      return { ok: false, message: "Only admin can update POS manager accounts." };
    }

    try {
      const response = await fetch(api(`/api/admin/pos-users/${userId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, adminId: currentUser.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not update POS manager." };
      }

      await refreshAdminCollections();
      return { ok: true, user: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS account service." };
    }
  };

  const deletePosUser = async (userId) => {
    if (currentUser?.role !== "admin") {
      return { ok: false, message: "Only admin can delete POS manager accounts." };
    }

    try {
      const response = await fetch(api(`/api/admin/pos-users/${userId}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: currentUser.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not delete POS manager." };
      }

      await refreshAdminCollections();
      return { ok: true };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the POS account service." };
    }
  };

  const createReturn = async (payload) => {
    try {
      const response = await fetch(api("/api/admin/returns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not create return." };
      }

      await refreshAdminCollections();
      return { ok: true, returnRecord: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the return service." };
    }
  };

  const createReturnRequest = async (orderId, reason, items) => {
    if (!currentUser?.id) {
      return { ok: false, message: "Please log in before requesting a return." };
    }

    try {
      const response = await fetch(api(`/api/orders/${orderId}/returns`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, reason, items }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not create return request." };
      }

      setReturnRequests((current) => [data, ...current]);
      return { ok: true, returnRecord: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the return service." };
    }
  };

  const deleteActivityLog = async (logId) => {
    try {
      const response = await fetch(api(`/api/admin/activity-logs/${logId}`), { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not delete activity log." };
      }

      await refreshAdminCollections();
      return { ok: true };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the activity log service." };
    }
  };

  const updateReturnStatus = async (returnId, status) => {
    try {
      const response = await fetch(api(`/api/admin/returns/${returnId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not update return status." };
      }

      await refreshAdminCollections();
      return { ok: true, returnRecord: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the return service." };
    }
  };

  const updateAdminOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(api(`/api/orders/${orderId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not update order status." };
      }

      await refreshAdminOverview();
      return { ok: true, order: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the order service." };
    }
  };

  const saveProduct = async (payload, productId) => {
    try {
      const response = await fetch(api(productId ? `/api/products/${productId}` : "/api/products"), {
        method: productId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not save product." };
      }

      await refreshAdminOverview();
      return { ok: true, product: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the product service." };
    }
  };

  const removeProduct = async (productId) => {
    try {
      const response = await fetch(api(`/api/products/${productId}`), { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not delete product." };
      }

      await refreshAdminOverview();
      return { ok: true };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the product service." };
    }
  };

  const saveCategory = async (payload, categoryId) => {
    try {
      const response = await fetch(api(categoryId ? `/api/categories/${categoryId}` : "/api/categories"), {
        method: categoryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not save category." };
      }

      await refreshAdminOverview();
      return { ok: true, category: data };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the category service." };
    }
  };

  const removeCategory = async (categoryId) => {
    try {
      const response = await fetch(api(`/api/categories/${categoryId}`), { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        return { ok: false, message: data.message || "Could not delete category." };
      }

      await refreshAdminOverview();
      return { ok: true };
    } catch (requestError) {
      console.error(requestError);
      return { ok: false, message: "Could not reach the category service." };
    }
  };

  const purchaseCart = async (checkoutData) => {
    setPurchaseError("");

    if (!currentUser?.id) {
      const message = "Please log in before placing your order.";
      setPurchaseError(message);
      return { ok: false, message };
    }

    const checkoutLineItems = directCheckoutItems.length ? directCheckoutItems : cartItems;

    if (!checkoutLineItems.length) {
      return { ok: false, message: "Your cart is empty." };
    }

    try {
      const response = await fetch(api("/api/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          items: checkoutLineItems.map((item) => ({ id: item.productId, quantity: item.quantity })),
          customer: checkoutData.customer,
          deliveryPreference: checkoutData.deliveryPreference,
          paymentMethod: checkoutData.paymentMethod,
        }),
      });

      const rawResponse = await response.text();
      let data = {};

      try {
        data = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message = data.message || "Checkout API is unavailable. Restart the backend server and try again.";
        setPurchaseError(message);
        return { ok: false, message };
      }

      setProducts((data.products || []).map(normalizeProduct));
      setOrders((data.orders || []).map(normalizeOrder));

      if (directCheckoutItems.length) {
        const directIds = new Set(directCheckoutItems.map((item) => item.productId));
        setCartItems((current) => {
          const nextCartItems = current.filter((item) => !directIds.has(item.productId));
          persistCart(nextCartItems);
          return nextCartItems;
        });
        setDirectCheckoutItems([]);
      } else {
        setCartItems([]);
        persistCart([]);
      }

      return { ok: true, order: normalizeOrder(data.order) };
    } catch (purchaseRequestError) {
      console.error(purchaseRequestError);
      const message = "Could not complete checkout. Please try again.";
      setPurchaseError(message);
      return { ok: false, message };
    }
  };

  const cartDetails = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          return product ? { ...product, quantity: item.quantity } : null;
        })
        .filter(Boolean),
    [cartItems, products],
  );

  const checkoutDetails = useMemo(() => {
    const sourceItems = directCheckoutItems.length ? directCheckoutItems : cartItems;

    return sourceItems
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return product ? { ...product, quantity: item.quantity } : null;
      })
      .filter(Boolean);
  }, [cartItems, directCheckoutItems, products]);

  const cartCount = cartDetails.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const checkoutCount = checkoutDetails.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutSubtotal = checkoutDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <ShopContext.Provider
      value={{
        products,
        categories,
        brands,
        bestSellerProducts,
        dealProducts,
        featuredPosts,
        loading,
        error,
        purchaseError,
        authError,
        currentUser,
        orders,
        ordersLoading,
        adminOverview,
        adminLoading,
        suppliers,
        purchases,
        expenses,
        shipments,
        returns,
        posUsers,
        activityLogs,
        returnRequests,
        posProducts,
        posCategories,
        posCustomers,
        posRecentSales,
        posReports,
        posTodayReport,
        posPaymentMethods,
        posLoading,
        cartItems: cartDetails,
        checkoutItems: checkoutDetails,
        cartCount,
        subtotal,
        checkoutCount,
        checkoutSubtotal,
        deliveryFee,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        beginDirectCheckout,
        beginCartCheckout,
        clearDirectCheckout,
        registerUser,
        loginUser,
        loginPosUser,
        logoutUser,
        refreshAdminOverview,
        saveProduct,
        removeProduct,
        saveCategory,
        removeCategory,
        updateInventoryItem,
        adjustInventoryStock,
        saveSupplier,
        createPurchase,
        deletePurchase,
        createExpense,
        saveShipment,
        createPosUser,
        updatePosUserStatus,
        deletePosUser,
        createReturn,
        loadPosBootstrap,
        searchPosProducts,
        loadPosReports,
        createPosSale,
        returnPosSaleItems,
        updateDailyRegister,
        createReturnRequest,
        deleteActivityLog,
        updateReturnStatus,
        updateAdminOrderStatus,
        purchaseCart,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used inside ShopProvider");
  }
  return context;
}
