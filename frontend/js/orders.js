/**
 * Orders page script
 * ------------------
 * Loads customer order history and renders status timeline snippets.
 */
$(async function initOrdersPage() {
  await ShivamUI.initLayout();
  const user = ShivamApi.getUser();
  if (!user) {
    $("#ordersRoot").html(
      '<div class="empty-state">Please login to view your orders. <a href="login.html">Login</a></div>'
    );
    return;
  }
  await loadOrders();
});

const ORDER_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

function renderTimeline(status) {
  const idx = ORDER_STEPS.indexOf(status);
  return `
    <div class="timeline">
      ${ORDER_STEPS.map(
        (step, i) => `
        <div class="timeline-step ${i <= idx ? "active" : ""}">
          <h6 class="mb-0 text-capitalize">${step}</h6>
        </div>`
      ).join("")}
    </div>`;
}

async function loadOrders() {
  try {
    const data = await ShivamApi.orders.mine();
    const orders = data.orders || [];
    if (!orders.length) {
      $("#ordersRoot").html('<div class="empty-state">No orders found yet.</div>');
      return;
    }

    const html = orders
      .map(
        (order) => `
      <div class="col-12 mb-4 reveal">
        <div class="account-card">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <h5 class="mb-1">Order #${order._id}</h5>
              <p class="small-muted mb-1">Placed: ${new Date(order.createdAt).toLocaleString()}</p>
              <p class="mb-0">Total: <strong>${ShivamUI.formatPrice(order.total)}</strong></p>
            </div>
            <div>
              <span class="status-pill status-${order.status}">${order.status}</span>
            </div>
          </div>
          <hr />
          ${renderTimeline(order.status)}
          <div class="mt-2">
            <a href="order-track.html?orderId=${encodeURIComponent(order._id)}" class="btn btn-outline-brand btn-sm">Track</a>
          </div>
        </div>
      </div>`
      )
      .join("");
    $("#ordersRoot").html(html);
    ShivamUI.observeRevealAnimations();
  } catch (error) {
    $("#ordersRoot").html(`<div class="empty-state">${error.message}</div>`);
  }
}
