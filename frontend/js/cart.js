/**
 * Cart page script
 * ----------------
 * Handles cart rendering, quantity changes, item removal and summary updates.
 */
const OFFLINE_CART_DRAFT_KEY = "shivam_offline_store_cart_draft";

$(async function initCartPage() {
  await ShivamUI.initLayout();
  const user = ShivamApi.getUser();
  if (!user) {
    $("#cartView").html(`
      <div class="empty-state">
        <h5>Please login to access your cart</h5>
        <a href="login.html" class="btn btn-primary-brand mt-2">Login</a>
      </div>
    `);
    return;
  }

  await loadCart();

  $("#cartView").on("click", ".btn-qty-minus", async function onMinus() {
    const itemId = $(this).data("item-id");
    const qty = Number($(this).data("qty"));
    if (qty <= 1) return;
    await updateQty(itemId, qty - 1);
  });

  $("#cartView").on("click", ".btn-qty-plus", async function onPlus() {
    const itemId = $(this).data("item-id");
    const qty = Number($(this).data("qty"));
    await updateQty(itemId, qty + 1);
  });

  $("#cartView").on("click", ".btn-remove-item", async function onRemove() {
    const itemId = $(this).data("item-id");
    try {
      await ShivamApi.cart.deleteItem(itemId);
      ShivamUI.showToast("Item removed", "success");
      await loadCart();
      await ShivamUI.updateCartBadge();
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#cartView").on("click", ".btn-go-offline-store", function onOfflineStoreClick() {
    redirectToOfflineStoreFromCart();
  });
});

async function loadCart() {
  $("#cartView").html(`<div class="empty-state">Loading cart...</div>`);
  try {
    const data = await ShivamApi.cart.get();
    const items = data.cart?.items || [];
    const totals = data.totals || { subtotal: 0, total: 0 };
    if (!items.length) {
      $("#cartView").html(`
        <div class="empty-state">
          <h5>Your cart is empty</h5>
          <a href="products.html" class="btn btn-primary-brand mt-2">Shop Now</a>
        </div>
      `);
      return;
    }

    const rows = items
      .map((item) => {
        const product = item.productId || {};
        const image = (product.imageUrls && product.imageUrls[0]) || "/assets/images/hero-sports.jpg";
        return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${image}" alt="${product.name || "Product"}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />
              <div>
                <div>${product.name || "Unknown Product"}</div>
                <div class="small-muted">${product.brand || ""}</div>
              </div>
            </div>
          </td>
          <td>&#8377;${Number(item.unitPrice).toLocaleString("en-IN")}</td>
          <td>
            <div class="btn-group">
              <button class="btn btn-outline-secondary btn-sm btn-qty-minus" data-item-id="${item._id}" data-qty="${item.qty}">-</button>
              <button class="btn btn-outline-secondary btn-sm" disabled>${item.qty}</button>
              <button class="btn btn-outline-secondary btn-sm btn-qty-plus" data-item-id="${item._id}" data-qty="${item.qty}">+</button>
            </div>
          </td>
          <td>&#8377;${Number(item.qty * item.unitPrice).toLocaleString("en-IN")}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger btn-remove-item" data-item-id="${item._id}">Remove</button>
          </td>
        </tr>`;
      })
      .join("");
    const isAdmin = String(ShivamApi.getUser()?.role || "") === "admin";
    const adminOfflineCta = isAdmin
      ? `
        <button type="button" class="btn btn-outline-brand w-100 mt-2 btn-go-offline-store">
          Continue in Offline Store (Admin)
        </button>
        <p class="small-muted mt-2 mb-0">Use this to create an offline cash/online order from cart items.</p>`
      : "";

    $("#cartView").html(`
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="table-responsive glass-panel p-3">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="glass-panel p-3">
            <h4>Order Summary</h4>
            <div class="d-flex justify-content-between">
              <span>Subtotal</span>
              <strong>&#8377;${Number(totals.subtotal).toLocaleString("en-IN")}</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span>Shipping</span>
              <strong>Free</strong>
            </div>
            <hr />
            <div class="d-flex justify-content-between">
              <span>Total</span>
              <strong>&#8377;${Number(totals.total).toLocaleString("en-IN")}</strong>
            </div>
            <a href="checkout.html" class="btn btn-primary-brand w-100 mt-3">Proceed to Checkout</a>
            ${adminOfflineCta}
          </div>
        </div>
      </div>
    `);
  } catch (error) {
    $("#cartView").html(`<div class="empty-state">${error.message}</div>`);
  }
}

async function updateQty(itemId, qty) {
  try {
    await ShivamApi.cart.updateItem(itemId, { qty });
    await loadCart();
    await ShivamUI.updateCartBadge();
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
  }
}

async function redirectToOfflineStoreFromCart() {
  const user = ShivamApi.getUser();
  if (String(user?.role || "") !== "admin") {
    ShivamUI.showToast("Only admin users can access Offline Store.", "error");
    return;
  }

  try {
    const data = await ShivamApi.cart.get();
    const items = (data.cart?.items || [])
      .map((item) => ({
        productId: String(item.productId?._id || "").trim(),
        qty: Math.max(Number(item.qty) || 0, 0),
      }))
      .filter((item) => item.productId && item.qty > 0);

    if (!items.length) {
      ShivamUI.showToast("Your cart is empty. Add products before opening Offline Store.", "error");
      return;
    }

    sessionStorage.setItem(
      OFFLINE_CART_DRAFT_KEY,
      JSON.stringify({
        source: "cart",
        createdAt: new Date().toISOString(),
        items,
      })
    );
    window.location.href = "admin.html?tab=offline-store&source=cart";
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
  }
}
