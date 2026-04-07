/**
 * Frontend API Client
 * -------------------
 * Purpose:
 * - Single wrapper for all backend requests.
 * - Shared auth token handling and error normalization.
 *
 * Why this matters:
 * - Keeps page scripts clean and focused on UI.
 * - Makes future backend path changes easier (only one file to update).
 */
(function apiModule(global) {
  const FALLBACK_API = "http://localhost:4000/api";
  const API_BASE = window.location.origin.startsWith("http")
    ? `${window.location.origin}/api`
    : FALLBACK_API;

  function getToken() {
    return localStorage.getItem("shivam_token") || "";
  }

  function setSession(token, user) {
    if (token) localStorage.setItem("shivam_token", token);
    if (user) localStorage.setItem("shivam_user", JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem("shivam_token");
    localStorage.removeItem("shivam_user");
  }

  function getUser() {
    const raw = localStorage.getItem("shivam_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  /**
   * Core request helper.
   * Input:
   * - method: HTTP method
   * - path: relative api path (starts with /)
   * - body: request JSON body or null
   * - auth: include bearer token if true
   */
  async function request(method, path, body, auth = false) {
    const headers = { "Content-Type": "application/json" };
    if (auth && getToken()) {
      headers.Authorization = `Bearer ${getToken()}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new Error("Could not reach the server. Please ensure the app backend is running.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  }

  const api = {
    API_BASE,
    getToken,
    getUser,
    setSession,
    clearSession,
    request,
    auth: {
      register: (payload) => request("POST", "/auth/register", payload),
      login: (payload) => request("POST", "/auth/login", payload),
      me: () => request("GET", "/auth/me", null, true),
      logout: () => request("POST", "/auth/logout", {}, true),
    },
    profile: {
      get: () => request("GET", "/profile", null, true),
      update: (payload) => request("PATCH", "/profile", payload, true),
      updatePassword: (payload) => request("PATCH", "/profile/password", payload, true),
    },
    catalog: {
      categories: () => request("GET", "/categories"),
      products: (query = "") => request("GET", `/products${query ? `?${query}` : ""}`),
      featuredProducts: (limit = 8) => request("GET", `/products/featured?limit=${limit}`),
      productBySlug: (slug) => request("GET", `/products/${slug}`),
      relatedProducts: (slug, limit = 4) => request("GET", `/products/${slug}/related?limit=${limit}`),
      services: () => request("GET", "/services"),
      brands: () => request("GET", "/brands"),
      offers: () => request("GET", "/offers"),
      jobs: () => request("GET", "/jobs"),
    },
    content: {
      banners: (placement = "") =>
        request("GET", `/content/banners${placement ? `?placement=${encodeURIComponent(placement)}` : ""}`),
      faqs: (category = "") =>
        request("GET", `/content/faqs${category ? `?category=${encodeURIComponent(category)}` : ""}`),
      testimonials: () => request("GET", "/content/testimonials"),
      pageBySlug: (slug) => request("GET", `/content/page/${slug}`),
      settings: (group = "") =>
        request("GET", `/content/settings${group ? `?group=${encodeURIComponent(group)}` : ""}`),
    },
    cart: {
      get: () => request("GET", "/cart", null, true),
      addItem: (payload) => request("POST", "/cart/items", payload, true),
      updateItem: (itemId, payload) => request("PATCH", `/cart/items/${itemId}`, payload, true),
      deleteItem: (itemId) => request("DELETE", `/cart/items/${itemId}`, null, true),
    },
    wishlist: {
      list: () => request("GET", "/wishlist", null, true),
      add: (productId) => request("POST", `/wishlist/${productId}`, {}, true),
      remove: (productId) => request("DELETE", `/wishlist/${productId}`, null, true),
    },
    orders: {
      create: (payload) => request("POST", "/orders", payload, true),
      mine: () => request("GET", "/orders/my", null, true),
      getById: (id) => request("GET", `/orders/${id}`, null, true),
      track: (payload) => request("POST", "/orders/track", payload),
    },
    payments: {
      createRazorpayOrder: (payload) =>
        request("POST", "/payments/razorpay/order", payload, true),
      verifyRazorpay: (payload) => request("POST", "/payments/razorpay/verify", payload, true),
      previewGiftCode: (payload) => request("POST", "/payments/gift-code/preview", payload, true),
    },
    careers: {
      apply: (jobId, payload) => request("POST", `/jobs/${jobId}/applications`, payload),
    },
    admin: {
      list: (resource, query = "") =>
        request("GET", `/admin/${resource}${query ? `?${query}` : ""}`, null, true),
      get: (resource, id) => request("GET", `/admin/${resource}/${id}`, null, true),
      create: (resource, payload) => request("POST", `/admin/${resource}`, payload, true),
      update: (resource, id, payload) =>
        request("PATCH", `/admin/${resource}/${id}`, payload, true),
      remove: (resource, id) => request("DELETE", `/admin/${resource}/${id}`, null, true),
      createOfflineOrder: (payload) => request("POST", "/admin/offline-orders", payload, true),
      orders: (query = "") =>
        request("GET", `/admin/orders${query ? `?${query}` : ""}`, null, true),
      updateOrderStatus: (id, payload) =>
        request("PATCH", `/admin/orders/${id}/status`, payload, true),
    },
  };

  global.ShivamApi = api;
})(window);
