/**
 * Order tracking page
 * -------------------
 * Allows guest/customer to track order by orderId + email.
 */
$(async function initOrderTrackPage() {
  await ShivamUI.initLayout();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");
  if (orderId) {
    $("#trackOrderId").val(orderId);
  }

  $("#trackForm").on("submit", async function onTrackSubmit(event) {
    event.preventDefault();
    const payload = {
      orderId: $("#trackOrderId").val().trim(),
      email: $("#trackEmail").val().trim(),
    };
    if (!payload.orderId || !payload.email) {
      ShivamUI.showToast("Order ID and email are required", "error");
      return;
    }
    await trackOrder(payload);
  });
});

function timelineHtml(status) {
  const steps = ["pending", "paid", "processing", "shipped", "delivered"];
  const idx = steps.indexOf(status);
  return `
    <div class="timeline">
      ${steps
        .map(
          (step, i) => `
            <div class="timeline-step ${i <= idx ? "active" : ""}">
              <h6 class="mb-0 text-capitalize">${step}</h6>
            </div>`
        )
        .join("")}
    </div>`;
}

async function trackOrder(payload) {
  $("#trackResult").html('<div class="empty-state">Checking order...</div>');
  try {
    const data = await ShivamApi.orders.track(payload);
    const tracking = data.tracking;
    $("#trackResult").html(`
      <div class="account-card reveal">
        <h5>Order #${tracking.orderId}</h5>
        <p class="mb-1">Status: <span class="status-pill status-${tracking.status}">${tracking.status}</span></p>
        <p class="mb-1">Total: <strong>${ShivamUI.formatPrice(tracking.total)}</strong></p>
        <p class="small-muted">Updated: ${new Date(tracking.updatedAt).toLocaleString()}</p>
        ${timelineHtml(tracking.status)}
      </div>
    `);
    ShivamUI.observeRevealAnimations();
  } catch (error) {
    $("#trackResult").html(`<div class="empty-state">${error.message}</div>`);
  }
}
