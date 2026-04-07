/**
 * Home page controller
 * --------------------
 * Responsibilities:
 * - Load premium home sections from APIs.
 * - Run progressive enhancement blocks (ticker, counters, testimonials).
 * - Provide interactive section behaviors without external animation libraries.
 */
$(async function initHomePage() {
  await ShivamUI.initLayout();

  $("#aboutMoreText").hide();
  $("#btnAboutToggle").on("click", function onToggleAbout() {
    $("#aboutMoreText").slideToggle(220);
    $(this).text($(this).text() === "Read More" ? "Read Less" : "Read More");
  });

  await Promise.all([
    loadSiteSettings(),
    loadHeroBanner(),
    loadCategories(),
    loadFeaturedProducts(),
    loadServices(),
    loadBrands(),
    loadOffers(),
    loadTestimonials(),
  ]);

  attachOfferInteractions();
  ShivamUI.observeRevealAnimations();
  ShivamUI.animateCounters();
});

const DEFAULT_BRAND_LOGO = "/assets/images/pdf-extracted/img-84.png";
const DEFAULT_OFFER_IMAGE = "/assets/images/pdf-pages/page-5.png";
const DEFAULT_CATEGORY_IMAGE = "/assets/images/pdf-pages/page-2.png";
const DEFAULT_SERVICE_IMAGE = "/assets/images/pdf-pages/page-3.png";
const DEFAULT_AVATAR_IMAGE = "/assets/images/pdf-extracted/img-67.jpeg";
const DEFAULT_HERO_SLIDER_INTERVAL_MS = 3500;
const DEFAULT_HERO_BANNER_IMAGE = "/assets/images/custom/home-hero.jpg";
const LEGACY_HOME_HERO_IMAGE = "/assets/images/pdf-pages/page-2.png";

let heroSliderTimerId = null;
let heroSliderImages = [];
let heroSliderIndex = 0;
let heroSliderSwitchInProgress = false;
let heroSliderCleanupBound = false;
let heroSettingsMap = {};
let heroBannerImageUrl = DEFAULT_HERO_BANNER_IMAGE;

const brandFallbacks = [
  { name: "NIVIA", logoUrl: "/assets/images/pdf-extracted/img-68.png" },
  { name: "VECTOR X", logoUrl: DEFAULT_BRAND_LOGO },
  { name: "CEAT", logoUrl: DEFAULT_BRAND_LOGO },
  { name: "SHIVAM SPORTS", logoUrl: "/assets/images/hero-sports.jpg" },
];

const offerFallbacks = [
  {
    title: "Mega Flat Deal",
    subtitle: "Flat 80% OFF",
    bannerImageUrl: "/assets/images/pdf-pages/page-4.png",
    discountPercent: 80,
    promoCode: "ALAY80",
  },
  {
    title: "Festival Sports Sale",
    subtitle: "Up to 70% OFF",
    bannerImageUrl: "/assets/images/pdf-pages/page-5.png",
    discountPercent: 70,
    promoCode: "SAVE70",
  },
  {
    title: "Team Kit Offer",
    subtitle: "Bulk order 50% OFF",
    bannerImageUrl: "/assets/images/pdf-extracted/img-89.png",
    discountPercent: 50,
    promoCode: "TEAM50",
  },
];

async function loadSiteSettings() {
  try {
    const data = await ShivamApi.content.settings("home");
    const map = {};
    (data.settings || []).forEach((item) => {
      map[item.key] = item.value;
    });
    $("#homeStatCustomers").attr("data-counter-target", Number(map["home.stat_customers"] || 12000));
    $("#homeStatProducts").attr("data-counter-target", Number(map["home.stat_products"] || 1800));
    $("#homeStatYears").attr("data-counter-target", Number(map["home.stat_years"] || 66));
    $("#homeTickerText").text(
      map["home.marquee_text"] ||
        "Factory Direct | Secure Payment | Fast All India Shipping | Trusted by Athletes"
    );
    heroSettingsMap = map;
    configureHomeHeroSlider();
  } catch (error) {
    $("#homeTickerText").text(
      "Factory Direct | Secure Payment | Fast All India Shipping | Trusted by Athletes"
    );
    heroSettingsMap = {};
    configureHomeHeroSlider();
  }
}

async function loadHeroBanner() {
  try {
    const data = await ShivamApi.content.banners("home_hero");
    const banner = (data.banners || [])[0];
    if (!banner) return;
    heroBannerImageUrl = resolveHeroBannerImageUrl(banner.imageUrl);
    $("#heroTitle").text(banner.title || "Train Hard. Play Smart. Win More.");
    $("#heroSubtitle").text(
      banner.subtitle || "Explore premium sports equipment delivered directly from Shivam Sports."
    );
    $("#heroCta")
      .text(banner.ctaText || "Shop Products")
      .attr("href", banner.ctaUrl || "products.html");
    configureHomeHeroSlider();
  } catch (error) {
    // Keep static text/cta fallback already present in HTML.
  }
}

function resolveHeroBannerImageUrl(rawUrl) {
  const imageUrl = String(rawUrl || "").trim();
  if (!imageUrl || imageUrl === LEGACY_HOME_HERO_IMAGE) {
    return DEFAULT_HERO_BANNER_IMAGE;
  }
  return imageUrl;
}

function bindHeroSliderCleanup() {
  if (heroSliderCleanupBound) return;
  heroSliderCleanupBound = true;
  window.addEventListener("pagehide", stopHeroSlider);
  window.addEventListener("beforeunload", stopHeroSlider);
}

function stopHeroSlider() {
  if (heroSliderTimerId) {
    window.clearInterval(heroSliderTimerId);
    heroSliderTimerId = null;
  }
  heroSliderSwitchInProgress = false;
}

function parseHeroSliderImageUrls(rawValue) {
  if (rawValue === null || rawValue === undefined) return [];
  let list = [];
  if (Array.isArray(rawValue)) {
    list = rawValue;
  } else {
    const value = String(rawValue).trim();
    if (!value) return [];

    let parsedJsonArray = false;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        list = parsed;
        parsedJsonArray = true;
      }
    } catch (error) {
      // If JSON parsing fails, fallback parser below is used.
    }

    if (!parsedJsonArray) {
      list = value.split(/[\n,]+/);
    }
  }

  const seen = new Set();
  return list
    .map((entry) => normalizeHeroSliderImageUrl(entry))
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizeHeroSliderImageUrl(entry) {
  const value = String(entry || "").trim();
  if (!value) return "";

  const lowered = value.toLowerCase();
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:")) return "";
  if (lowered.startsWith("data:") && !lowered.startsWith("data:image/")) return "";
  if (lowered.startsWith("data:image/")) return value;

  try {
    const parsed = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return value;
  } catch (error) {
    return "";
  }
}

function parseHeroSliderInterval(rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return DEFAULT_HERO_SLIDER_INTERVAL_MS;
  if (value < 1200 || value > 30000) return DEFAULT_HERO_SLIDER_INTERVAL_MS;
  return Math.floor(value);
}

function showHeroImageWithFade(nextUrl, immediate = false) {
  const $heroImage = $("#heroImage");
  if (!nextUrl || !$heroImage.length) return;

  const finalizeSwitch = () => {
    $heroImage.removeClass("hero-image-fade-out hero-image-hidden");
    $heroImage.addClass("hero-image-fade-in");
    window.setTimeout(() => {
      $heroImage.removeClass("hero-image-fade-in");
      heroSliderSwitchInProgress = false;
    }, 260);
  };

  if (immediate) {
    $heroImage.attr("src", nextUrl);
    finalizeSwitch();
    return;
  }

  heroSliderSwitchInProgress = true;
  $heroImage.addClass("hero-image-fade-out");
  window.setTimeout(() => {
    let finalized = false;
    const finishOnce = () => {
      if (finalized) return;
      finalized = true;
      finalizeSwitch();
    };
    const fallbackTimer = window.setTimeout(finishOnce, 520);
    $heroImage.one("load error", () => {
      window.clearTimeout(fallbackTimer);
      finishOnce();
    });
    $heroImage.attr("src", nextUrl);
  }, 180);
}

function rotateHeroSliderImage() {
  if (heroSliderSwitchInProgress || heroSliderImages.length < 2) return;
  heroSliderIndex = (heroSliderIndex + 1) % heroSliderImages.length;
  showHeroImageWithFade(heroSliderImages[heroSliderIndex], false);
}

function configureHomeHeroSlider() {
  const $heroBanner = $(".hero-banner").first();
  const $heroImage = $("#heroImage");
  if (!$heroBanner.length || !$heroImage.length) return;

  bindHeroSliderCleanup();
  stopHeroSlider();

  heroSliderImages = parseHeroSliderImageUrls(heroSettingsMap["home.hero_slider_images"]);
  heroSliderIndex = 0;

  if (!heroSliderImages.length) {
    if (!heroBannerImageUrl) {
      $heroBanner.addClass("hero-banner-no-image");
      $heroImage.removeAttr("src").removeClass("hero-image-fade-in hero-image-fade-out").addClass("hero-image-hidden");
      return;
    }

    $heroBanner.removeClass("hero-banner-no-image");
    $heroImage.removeClass("hero-image-hidden");
    showHeroImageWithFade(heroBannerImageUrl, true);
    return;
  }

  $heroBanner.removeClass("hero-banner-no-image");
  $heroImage.removeClass("hero-image-hidden");
  showHeroImageWithFade(heroSliderImages[heroSliderIndex], true);

  if (heroSliderImages.length < 2) return;
  const intervalMs = parseHeroSliderInterval(heroSettingsMap["home.hero_slider_interval_ms"]);
  heroSliderTimerId = window.setInterval(rotateHeroSliderImage, intervalMs);
}

async function loadCategories() {
  try {
    const data = await ShivamApi.catalog.categories();
    const categories = (data.categories || []).slice(0, 6);
    const html = categories
      .map(
        (category) => `
      <div class="col-lg-2 col-md-4 col-6 mb-3 reveal">
        <a href="products.html?category=${encodeURIComponent(category.slug)}" class="card category-card h-100">
          <img src="${category.imageUrl || DEFAULT_CATEGORY_IMAGE}" alt="${category.name}" data-fallback-src="${DEFAULT_CATEGORY_IMAGE}" />
          <div class="card-body text-center">
            <h6 class="mb-0">${category.name}</h6>
          </div>
        </a>
      </div>`
      )
      .join("");
    $("#categoriesGrid").html(html || `<div class="col-12"><div class="empty-state">No categories found.</div></div>`);
  } catch (error) {
    $("#categoriesGrid").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}

async function loadFeaturedProducts() {
  ShivamUI.mountSkeleton("#featuredProducts", 8);
  try {
    const data = await ShivamApi.catalog.featuredProducts(8);
    const list = data.products || [];
    const html = list.map((product) => ShivamUI.renderProductCard(product)).join("");
    $("#featuredProducts").html(html || `<div class="col-12"><div class="empty-state">No products found.</div></div>`);
  } catch (error) {
    $("#featuredProducts").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}

async function loadServices() {
  try {
    const data = await ShivamApi.catalog.services();
    const html = (data.services || [])
      .slice(0, 3)
      .map(
        (service) => `
      <div class="col-lg-4 col-md-6 mb-3 reveal">
        <div class="card service-card h-100 tilt-card">
          <img src="${service.imageUrl || DEFAULT_SERVICE_IMAGE}" alt="${service.title}" data-fallback-src="${DEFAULT_SERVICE_IMAGE}" />
          <div class="card-body">
            <h5>${service.title}</h5>
            <p class="small-muted">${service.description}</p>
            <a href="services.html" class="btn btn-primary-brand btn-sm">${service.ctaText || "Explore"}</a>
          </div>
        </div>
      </div>`
      )
      .join("");
    $("#homeServices").html(html || `<div class="col-12"><div class="empty-state">No services found.</div></div>`);
  } catch (error) {
    $("#homeServices").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}

async function loadBrands() {
  try {
    const data = await ShivamApi.catalog.brands();
    const html = renderBrandCards(data.brands || []);
    $("#brandGrid").html(html || `<div class="col-12"><div class="empty-state">No brands available.</div></div>`);
  } catch (error) {
    $("#brandGrid").html(renderBrandCards(brandFallbacks));
  }
}

async function loadOffers() {
  try {
    const data = await ShivamApi.catalog.offers();
    const html = renderOfferCards(data.offers || []);
    $("#offersGrid").html(html || `<div class="col-12"><div class="empty-state">No offers available.</div></div>`);
  } catch (error) {
    $("#offersGrid").html(renderOfferCards(offerFallbacks));
  }
}

function renderBrandCards(brands) {
  return (brands || [])
    .map(
      (brand) => `
      <div class="col-lg-2 col-md-3 col-6 mb-3 reveal">
        <a href="products.html?brand=${encodeURIComponent(brand.name || "")}" class="card brand-card h-100">
          <div class="card-body text-center d-flex flex-column justify-content-center">
            <img
              src="${brand.logoUrl || DEFAULT_BRAND_LOGO}"
              alt="${brand.name}"
              style="height: 44px; object-fit: contain;"
              data-fallback-src="${DEFAULT_BRAND_LOGO}"
            />
            <h6 class="mt-2 mb-0">${brand.name}</h6>
          </div>
        </a>
      </div>`
    )
    .join("");
}

function renderOfferCards(offers) {
  return (offers || [])
    .slice(0, 4)
    .map((offer) => {
      const discount = Number(offer.discountPercent || 0);
      const offerUrl = discount > 0 ? `offers.html?discount=${encodeURIComponent(discount)}` : "offers.html";
      return `
      <div class="col-lg-3 col-md-6 mb-3 reveal">
        <div class="card offer-card h-100">
          <img
            src="${offer.bannerImageUrl || DEFAULT_OFFER_IMAGE}"
            alt="${offer.title}"
            data-fallback-src="${DEFAULT_OFFER_IMAGE}"
          />
          <div class="card-body">
            <h5>${offer.title}</h5>
            <p class="mb-2">${offer.subtitle || "Limited time sports deal"}</p>
            <div class="discount-chip">${discount}% OFF</div>
            <div class="d-flex gap-2 mt-2">
              ${
                offer.promoCode
                  ? `<button class="btn btn-outline-brand btn-sm btn-copy-offer" data-offer-code="${offer.promoCode}">
                      Copy Code
                    </button>`
                  : ""
              }
              <a href="${offerUrl}" class="btn btn-primary-brand btn-sm">View Offer</a>
            </div>
            ${offer.promoCode ? `<p class="small-muted mt-2 mb-0">Code: ${offer.promoCode}</p>` : ""}
          </div>
        </div>
      </div>`
    })
    .join("");
}

function attachOfferInteractions() {
  $(document)
    .off("click", ".btn-copy-offer")
    .on("click", ".btn-copy-offer", async function onCopyCode() {
      const code = String($(this).data("offer-code") || "").trim();
      if (!code) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          const input = document.createElement("input");
          input.value = code;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          input.remove();
        }
        ShivamUI.showToast(`Offer code copied: ${code}`, "success");
      } catch (error) {
        ShivamUI.showToast(`Use code: ${code}`, "info");
      }
    });
}

async function loadTestimonials() {
  try {
    const data = await ShivamApi.content.testimonials();
    const html = (data.testimonials || [])
      .slice(0, 3)
      .map(
        (item) => `
      <div class="col-md-4 mb-3 reveal">
        <div class="glass-panel p-3 h-100">
          <div class="d-flex align-items-center gap-2 mb-2">
            <img
              class="profile-avatar"
              src="${item.avatarUrl || DEFAULT_AVATAR_IMAGE}"
              alt="${item.name}"
              data-fallback-src="${DEFAULT_AVATAR_IMAGE}"
            />
            <div>
              <h6 class="mb-0">${item.name}</h6>
              <p class="small-muted mb-0">${item.role || "Customer"}</p>
            </div>
          </div>
          <p class="small-muted mb-0">"${item.quote}"</p>
        </div>
      </div>`
      )
      .join("");
    $("#testimonialGrid").html(html || `<div class="col-12"><div class="empty-state">No testimonials available.</div></div>`);
  } catch (error) {
    $("#testimonialGrid").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}
