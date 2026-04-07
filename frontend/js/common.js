/**
 * Common UI Runtime
 * -----------------
 * Purpose:
 * - Shared layout bootstrap (header/footer, auth area, nav state).
 * - Motion/interaction engine for premium UI polish.
 * - Cross-page helpers (toasts, product card rendering, counters, skeletons).
 *
 * Dependencies:
 * - jQuery, Bootstrap bundle, frontend/js/api.js
 */
(function commonModule(global, $) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEFAULT_IMAGE_FALLBACK = "/assets/images/hero-sports.jpg";
  let imageFallbackBound = false;
  let pageTransitionBound = false;

  function showToast(message, type = "info") {
    const id = `toast_${Date.now()}`;
    const tone = type === "error" ? "error" : type === "success" ? "success" : "info";
    const meta =
      tone === "success"
        ? { title: "Success", icon: "OK" }
        : tone === "error"
          ? { title: "Error", icon: "!" }
          : { title: "Notice", icon: "i" };
    const html = `
      <div id="${id}" class="toast ss-toast ss-toast-${tone} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="ss-toast-inner">
          <div class="ss-toast-icon" aria-hidden="true">${meta.icon}</div>
          <div class="toast-body ss-toast-body">
            <div class="ss-toast-title">${meta.title}</div>
            <div class="ss-toast-message">${message}</div>
          </div>
          <button type="button" class="btn-close ss-toast-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;

    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container ss-toast-container position-fixed top-0 end-0 p-3";
      document.body.appendChild(container);
    }

    container.insertAdjacentHTML("beforeend", html);
    const toastEl = document.getElementById(id);
    const toast = new bootstrap.Toast(toastEl, { delay: 4200 });
    toast.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  function showAddedToCartToast() {
    showToast(
      'Item added to cart successfully.<span class="ss-toast-actions"><a href="products.html" class="ss-toast-link">Continue Shopping</a><a href="cart.html" class="ss-toast-link ss-toast-link-solid">Go to Cart</a></span>',
      "success"
    );
  }

  function getDiscountPercent(price, mrp) {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  function formatPrice(value) {
    return `&#8377;${Number(value || 0).toLocaleString("en-IN")}`;
  }

  function renderProductCard(product, options = {}) {
    const image = (product.imageUrls && product.imageUrls[0]) || "/assets/images/hero-sports.jpg";
    const categoryName = product.categoryId?.name || product.categoryName || "";
    const discount = getDiscountPercent(product.price, product.mrp);
    const showCategory = options.showCategory !== false;
    const detailUrl = `product-detail.html?slug=${encodeURIComponent(product.slug || "")}`;

    return `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4 reveal">
        <div class="card product-card h-100 tilt-card">
          <a class="image-zoom-wrap" href="${detailUrl}">
            <img src="${image}" class="card-img-top" alt="${product.name}" data-fallback-src="${DEFAULT_IMAGE_FALLBACK}" />
          </a>
          <div class="card-body d-flex flex-column">
            <h5 class="mb-1">${product.name}</h5>
            ${showCategory ? `<p class="small-muted mb-2">${categoryName}</p>` : ""}
            <div class="price-wrap mb-3">
              <span class="price-now">${formatPrice(product.price)}</span>
              <span class="price-mrp">${formatPrice(product.mrp)}</span>
              ${discount ? `<span class="discount-chip">${discount}% OFF</span>` : ""}
            </div>
            <div class="mt-auto d-grid gap-2">
              <button class="btn btn-primary-brand btn-add-cart" data-product-id="${product._id}">
                Add To Cart
              </button>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-brand btn-add-wishlist flex-grow-1" data-product-id="${product._id}">
                  Wishlist
                </button>
                <a href="${detailUrl}" class="btn btn-outline-secondary">View</a>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function updateCartBadge() {
    const user = ShivamApi.getUser();
    if (!user) {
      $("#navCartCount").text("0");
      return;
    }
    try {
      const data = await ShivamApi.cart.get();
      const count = (data.cart?.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      $("#navCartCount").text(count);
    } catch (error) {
      $("#navCartCount").text("0");
    }
  }

  function setActiveNav() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    const pageMap = {
      "index.html": "index",
      "products.html": "products",
      "product-detail.html": "products",
      "offers.html": "offers",
      "services.html": "services",
      "careers.html": "careers",
      "contact.html": "contact",
      "about.html": "about",
      "wishlist.html": "account",
      "cart.html": "shopping",
      "checkout.html": "shopping",
      "orders.html": "account",
      "order-track.html": "account",
      "profile.html": "account",
      "faq.html": "support",
      "shipping-policy.html": "support",
      "returns-policy.html": "support",
      "privacy-policy.html": "support",
      "terms.html": "support",
      "admin.html": "admin",
      "login.html": "auth",
      "register.html": "auth",
    };
    const nav = pageMap[path];
    if (nav) {
      $(`.nav-link[data-nav='${nav}']`).addClass("active");
    }
  }

  function syncRoleBasedNav() {
    const user = ShivamApi.getUser();
    const adminNavItem = $(".nav-link[data-nav='admin']").closest(".nav-item");
    if (!adminNavItem.length) return;
    if (user?.role === "admin") {
      adminNavItem.removeClass("d-none");
      return;
    }
    adminNavItem.addClass("d-none");
  }

  function initNavSubmenus() {
    const submenuItems = $(".nav-item.has-submenu");
    if (!submenuItems.length) return;

    const isCompactLayout = () => window.matchMedia("(max-width: 991px)").matches;
    const isTouchPrimary = () => window.matchMedia("(hover: none)").matches;
    const shouldToggleByTap = () => isCompactLayout() || isTouchPrimary();
    const closeAllSubmenus = () => submenuItems.removeClass("open");

    submenuItems.each(function bindSubmenuToggle() {
      const item = $(this);
      const triggerLink = item.children(".nav-link").first();
      triggerLink.off("click.navSubmenu").on("click.navSubmenu", function onSubmenuLinkClick(event) {
        if (!shouldToggleByTap()) return;
        if (item.hasClass("open")) {
          closeAllSubmenus();
          return;
        }
        event.preventDefault();
        closeAllSubmenus();
        item.addClass("open");
      });
    });

    $(document)
      .off("click.navSubmenuOutside")
      .on("click.navSubmenuOutside", function onSubmenuOutsideClick(event) {
        if ($(event.target).closest(".nav-item.has-submenu").length) return;
        closeAllSubmenus();
      });

    $(document)
      .off("click.navSubmenuLink", ".nav-submenu-link")
      .on("click.navSubmenuLink", ".nav-submenu-link", function onSubmenuItemClick() {
        closeAllSubmenus();
      });

    $(window)
      .off("resize.navSubmenu")
      .on("resize.navSubmenu", function onSubmenuResize() {
        if (!isCompactLayout()) {
          closeAllSubmenus();
        }
      });

    $(document)
      .off("keydown.navSubmenuEsc")
      .on("keydown.navSubmenuEsc", function onSubmenuEsc(event) {
        if (event.key === "Escape") {
          closeAllSubmenus();
        }
      });
  }

  function hydrateAuthArea() {
    const user = ShivamApi.getUser();
    const target = $("#navAuthLinks");
    if (!target.length) return;

    if (!user) {
      target.html(`
        <a href="login.html" class="btn btn-sm btn-outline-light">Login</a>
        <a href="register.html" class="btn btn-sm btn-primary-brand">Register</a>
      `);
      return;
    }

    target.html(`
      <a href="profile.html" class="text-light small text-decoration-none">Hi, ${user.name}</a>
      <button class="btn btn-sm btn-outline-light" id="btnLogout">Logout</button>
    `);

    $("#btnLogout")
      .off("click")
      .on("click", async function onLogout() {
        try {
          await ShivamApi.auth.logout();
        } catch (error) {
          // Ignore API logout errors because client-side token reset is authoritative for UX.
        }
        ShivamApi.clearSession();
        showToast("Logged out successfully", "success");
        window.location.href = "login.html";
      });
  }

  function observeRevealAnimations() {
    const revealEls = document.querySelectorAll(".reveal");
    if (!revealEls.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("show"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    revealEls.forEach((el, idx) => {
      el.style.transitionDelay = `${Math.min(idx * 25, 180)}ms`;
      observer.observe(el);
    });
  }

  function animateCounters() {
    const counters = document.querySelectorAll("[data-counter-target]");
    if (!counters.length) return;

    const run = (el) => {
      const target = Number(el.getAttribute("data-counter-target") || 0);
      const duration = Number(el.getAttribute("data-counter-duration") || 1200);
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = Math.floor(progress * target);
        el.textContent = value.toLocaleString("en-IN");
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };

    if (prefersReducedMotion) {
      counters.forEach((el) => {
        el.textContent = Number(el.getAttribute("data-counter-target") || 0).toLocaleString("en-IN");
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run(entry.target);
          observer.unobserve(entry.target);
        }
      });
    });
    counters.forEach((el) => observer.observe(el));
  }

  function initHeroParallax() {
    if (prefersReducedMotion) return;
    const hero = document.querySelector(".hero-banner");
    if (!hero) return;
    hero.addEventListener("mousemove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
      hero.style.setProperty("--hero-x", `${x}px`);
      hero.style.setProperty("--hero-y", `${y}px`);
    });
    hero.addEventListener("mouseleave", () => {
      hero.style.setProperty("--hero-x", "0px");
      hero.style.setProperty("--hero-y", "0px");
    });
  }

  function initTickerPause() {
    const ticker = document.querySelector(".promo-ticker");
    if (!ticker) return;
    ticker.addEventListener("mouseenter", () => ticker.classList.add("paused"));
    ticker.addEventListener("mouseleave", () => ticker.classList.remove("paused"));
  }

  function initPageTransition() {
    let layer = document.getElementById("pageTransitionLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "pageTransitionLayer";
      layer.className = "page-transition-layer";
      document.body.appendChild(layer);
    }

    const clearTransitionLayer = () => {
      layer.classList.remove("active");
    };

    const revealOnHistoryRestore = (event) => {
      clearTransitionLayer();
      const navEntries =
        typeof performance.getEntriesByType === "function" ? performance.getEntriesByType("navigation") : [];
      const navType = navEntries[0]?.type || "";
      if (event?.persisted || navType === "back_forward") {
        document.querySelectorAll(".reveal").forEach((el) => el.classList.add("show"));
      }
    };

    clearTransitionLayer();
    if (!pageTransitionBound) {
      pageTransitionBound = true;
      window.addEventListener("pageshow", revealOnHistoryRestore);
      window.addEventListener("focus", clearTransitionLayer);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          clearTransitionLayer();
        }
      });
    }

    $(document)
      .off("click.shivamPageTransition", "a[href$='.html'], a[href*='.html?']")
      .on("click.shivamPageTransition", "a[href$='.html'], a[href*='.html?']", function onNavigate(event) {
        const href = $(this).attr("href");
        const target = ($(this).attr("target") || "").toLowerCase();
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        if (target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

        let resolvedUrl;
        try {
          resolvedUrl = new URL(href, window.location.href);
        } catch (error) {
          return;
        }

        if (resolvedUrl.origin !== window.location.origin) return;
        if (!resolvedUrl.pathname.endsWith(".html")) return;

        event.preventDefault();
        layer.classList.add("active");
        setTimeout(() => {
          window.location.href = resolvedUrl.href;
        }, prefersReducedMotion ? 0 : 180);
      });
  }

  function initTiltCards() {
    if (prefersReducedMotion) return;
    const cards = document.querySelectorAll(".tilt-card");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * -5;
        card.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  function mountSkeleton(targetSelector, count = 4) {
    const html = Array.from({ length: count })
      .map(
        () => `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>`
      )
      .join("");
    $(targetSelector).html(html);
  }

  function loadPartial(selector, filePath) {
    return new Promise((resolve, reject) => {
      $(selector).load(filePath, function onLoad(response, status, xhr) {
        if (status === "error") {
          reject(new Error(`Failed to load ${filePath}: ${xhr.status} ${xhr.statusText}`));
          return;
        }
        resolve();
      });
    });
  }

  async function attachGlobalCardActions() {
    $(document)
      .off("click", ".btn-add-cart")
      .on("click", ".btn-add-cart", async function onAddToCart() {
        const user = ShivamApi.getUser();
        if (!user) {
          showToast("Please login to add items to cart", "error");
          window.location.href = "login.html";
          return;
        }
        try {
          await ShivamApi.cart.addItem({ productId: $(this).data("product-id"), qty: 1 });
          showAddedToCartToast();
          updateCartBadge();
        } catch (error) {
          showToast(error.message, "error");
        }
      });

    $(document)
      .off("click", ".btn-add-wishlist")
      .on("click", ".btn-add-wishlist", async function onAddToWishlist() {
        const user = ShivamApi.getUser();
        if (!user) {
          showToast("Please login to use wishlist", "error");
          window.location.href = "login.html";
          return;
        }
        try {
          await ShivamApi.wishlist.add($(this).data("product-id"));
          showToast("Added to wishlist", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
  }

  function initSupportAccordion() {
    $(".faq-item .faq-head")
      .off("click")
      .on("click", function onFaqToggle() {
        const item = $(this).closest(".faq-item");
        item.toggleClass("active");
        item.find(".faq-body").stop(true, true).slideToggle(220);
      });
  }

  function initImageFallbacks() {
    if (imageFallbackBound) return;
    imageFallbackBound = true;

    const applyFallback = (img) => {
      if (!(img instanceof HTMLImageElement)) return;
      const nextSource = img.getAttribute("data-fallback-src") || DEFAULT_IMAGE_FALLBACK;
      if (!nextSource || img.getAttribute("data-fallback-used") === "1") return;
      if (img.src && img.src.endsWith(nextSource)) return;
      img.setAttribute("data-fallback-used", "1");
      img.src = nextSource;
    };

    document.addEventListener(
      "error",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;
        applyFallback(target);
      },
      true
    );

    document.querySelectorAll("img[data-fallback-src]").forEach((img) => {
      if (!img.complete) return;
      if (img.naturalWidth > 0) return;
      applyFallback(img);
    });
  }

  async function initLayout() {
    await Promise.all([
      loadPartial("#site-header", "partials/header.html"),
      loadPartial("#site-footer", "partials/footer.html"),
    ]);
    syncRoleBasedNav();
    initNavSubmenus();
    setActiveNav();
    hydrateAuthArea();
    updateCartBadge();
    attachGlobalCardActions();
    observeRevealAnimations();
    animateCounters();
    initHeroParallax();
    initTickerPause();
    initPageTransition();
    initTiltCards();
    initSupportAccordion();
    initImageFallbacks();
  }

  global.ShivamUI = {
    initLayout,
    showToast,
    showAddedToCartToast,
    renderProductCard,
    updateCartBadge,
    observeRevealAnimations,
    setupRevealAnimations: observeRevealAnimations,
    animateCounters,
    mountSkeleton,
    initSupportAccordion,
    formatPrice,
  };
})(window, window.jQuery);
