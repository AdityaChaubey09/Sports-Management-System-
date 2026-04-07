/**
 * Offers page script
 * ------------------
 * Renders campaign banners and discounted products.
 */
const offerState = {
  discount: null,
};

$(async function initOffersPage() {
  await ShivamUI.initLayout();
  const params = new URLSearchParams(window.location.search);
  const requestedDiscount = Number(params.get("discount"));
  if (Number.isFinite(requestedDiscount) && requestedDiscount > 0) {
    offerState.discount = Math.round(requestedDiscount);
  }

  await loadOfferBanner();
  applyDiscountContext();
  await Promise.all([loadOffers(), loadFeaturedProducts()]);
  ShivamUI.observeRevealAnimations();
});

function applyDiscountContext() {
  if (!offerState.discount) return;
  $("#offersTopTitle").text(`Flat ${offerState.discount}% OFF Offers`);
  $("#offersTopSubtitle").text(`Showing active campaigns with exactly ${offerState.discount}% discount.`);
}

async function loadOfferBanner() {
  try {
    const data = await ShivamApi.content.banners("offers_top");
    const banner = (data.banners || [])[0];
    if (!banner) return;
    $("#offersTopImage").attr("src", banner.imageUrl);
    $("#offersTopTitle").text(banner.title || "Offers");
    $("#offersTopSubtitle").text(banner.subtitle || "");
  } catch (error) {
    // silent fallback
  }
}

async function loadOffers() {
  try {
    const data = await ShivamApi.catalog.offers();
    let offers = data.offers || [];
    if (offerState.discount) {
      offers = offers.filter((offer) => Number(offer.discountPercent || 0) === offerState.discount);
    }

    const html = offers
      .map(
        (offer) => `
      <div class="col-lg-4 mb-3 reveal">
        <div class="card offer-card h-100">
          <img
            src="${offer.bannerImageUrl || "/assets/images/pdf-pages/page-5.png"}"
            alt="${offer.title}"
            data-fallback-src="/assets/images/pdf-pages/page-5.png"
          />
          <div class="card-body">
            <h4>${offer.title}</h4>
            <p>${offer.subtitle || ""}</p>
            <div class="discount-chip">${offer.discountPercent}% OFF</div>
            ${offer.promoCode ? `<p class="small-muted mt-2 mb-0">Promo: ${offer.promoCode}</p>` : ""}
          </div>
        </div>
      </div>`
      )
      .join("");
    const emptyMessage = offerState.discount
      ? `No active ${offerState.discount}% offers right now.`
      : "No active offers.";
    $("#offerGrid").html(html || `<div class="col-12"><div class="empty-state">${emptyMessage}</div></div>`);
  } catch (error) {
    $("#offerGrid").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}

async function loadFeaturedProducts() {
  ShivamUI.mountSkeleton("#offerProducts", 4);
  try {
    const data = await ShivamApi.catalog.featuredProducts(4);
    const html = (data.products || []).map((item) => ShivamUI.renderProductCard(item)).join("");
    $("#offerProducts").html(html || `<div class="col-12"><div class="empty-state">No spotlight products.</div></div>`);
  } catch (error) {
    $("#offerProducts").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}
