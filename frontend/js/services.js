/**
 * Services page script
 * --------------------
 * Loads service cards and handles collapsible guidance block.
 */
$(async function initServicesPage() {
  await ShivamUI.initLayout();
  await loadServices();

  $("#btnToggleServiceTips").on("click", function onToggleTips() {
    $("#serviceTips").slideToggle(220);
  });
});

async function loadServices() {
  $("#servicesGrid").html(`<div class="col-12"><div class="empty-state">Loading services...</div></div>`);
  try {
    const data = await ShivamApi.catalog.services();
    const services = data.services || [];
    if (!services.length) {
      $("#servicesGrid").html(`<div class="col-12"><div class="empty-state">No services available.</div></div>`);
      return;
    }
    const html = services
      .map(
        (service) => `
      <div class="col-lg-4 col-md-6 mb-4 reveal">
        <div class="card service-card h-100">
          <img src="${service.imageUrl || "/assets/images/pdf-pages/page-3.png"}" alt="${service.title}" />
          <div class="card-body d-flex flex-column">
            <h4>${service.title}</h4>
            <p class="small-muted flex-grow-1">${service.description}</p>
            <a href="${service.ctaUrl || "#"}" class="btn btn-primary-brand">${service.ctaText || "Learn More"}</a>
          </div>
        </div>
      </div>`
      )
      .join("");
    $("#servicesGrid").html(html);
    ShivamUI.setupRevealAnimations();
  } catch (error) {
    $("#servicesGrid").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}
