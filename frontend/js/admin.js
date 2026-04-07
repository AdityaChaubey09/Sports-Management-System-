/**
 * Admin dashboard controller
 * --------------------------
 * Purpose:
 * - Controls all admin tabs and CRUD workflows.
 * - Adds advanced product editing and fast quantity updates.
 * - Adds report exports (Excel/PDF) with filter-aware downloads.
 */
const adminState = {
  categories: [],
  products: [],
  productsById: {},
  editModal: null,
};

const DEFAULT_BRAND_LOGO = "/assets/images/pdf-extracted/img-84.png";
const OFFLINE_CART_DRAFT_KEY = "shivam_offline_store_cart_draft";
const OFFLINE_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const OFFLINE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFLINE_PHONE_REGEX = /^\d{10}$/;
const OFFLINE_POSTAL_REGEX = /^[A-Za-z0-9 -]{4,10}$/;

$(async function initAdminPage() {
  await ShivamUI.initLayout();
  const user = ShivamApi.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (user.role !== "admin") {
    $("#adminRoot").html(`<div class="empty-state">Only admin users can access this page.</div>`);
    return;
  }

  try {
    const me = await ShivamApi.auth.me();
    const serverUser = me?.user || null;
    if (!serverUser) {
      ShivamApi.clearSession();
      window.location.href = "login.html";
      return;
    }
    ShivamApi.setSession(ShivamApi.getToken(), serverUser);
    if (serverUser.role !== "admin") {
      $("#adminRoot").html(`<div class="empty-state">Only admin users can access this page.</div>`);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
      return;
    }
  } catch (error) {
    ShivamApi.clearSession();
    window.location.href = "login.html";
    return;
  }

  bindAdminEvents();
  await loadAdminData();
  handleAdminEntryContext();
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeImageUrl(rawUrl, fallback = "") {
  const value = String(rawUrl || "").trim();
  return value || fallback;
}

function setBrandLogoPreview(url) {
  const safeUrl = normalizeImageUrl(url, DEFAULT_BRAND_LOGO);
  $("#brandLogoPreview")
    .attr("src", safeUrl)
    .attr("data-fallback-src", DEFAULT_BRAND_LOGO);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected file"));
    reader.readAsDataURL(file);
  });
}

function bindAdminEvents() {
  $(".admin-tab-btn").on("click", function onTabClick() {
    const tab = String($(this).data("tab") || "").trim();
    activateAdminTab(tab);
  });

  $("#formCategory").on("submit", async function onCategorySubmit(event) {
    event.preventDefault();
    await createResource(
      "categories",
      {
        name: $("#catName").val().trim(),
        slug: $("#catSlug").val().trim(),
        imageUrl: $("#catImageUrl").val().trim(),
        sortOrder: Number($("#catSortOrder").val() || 0),
        isActive: $("#catActive").is(":checked"),
      },
      "Category created"
    );
    this.reset();
    $("#catActive").prop("checked", true);
    await loadCategories();
  });

  $("#formProduct").on("submit", async function onProductSubmit(event) {
    event.preventDefault();
    await createResource("products", getProductPayload("prod"), "Product created");
    this.reset();
    $("#prodActive").prop("checked", true);
    await loadProductsAdmin();
  });

  $("#formProductEdit").on("submit", async function onProductEditSubmit(event) {
    event.preventDefault();
    const productId = $("#editProdId").val();
    if (!productId) {
      ShivamUI.showToast("No product selected for editing", "error");
      return;
    }

    try {
      await ShivamApi.admin.update("products", productId, getProductPayload("editProd"));
      ShivamUI.showToast("Product updated successfully", "success");
      getEditModal().hide();
      await loadProductsAdmin();
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#formService").on("submit", async function onServiceSubmit(event) {
    event.preventDefault();
    await createResource(
      "services",
      {
        title: $("#servTitle").val().trim(),
        description: $("#servDescription").val().trim(),
        imageUrl: $("#servImageUrl").val().trim(),
        ctaText: $("#servCtaText").val().trim(),
        ctaUrl: $("#servCtaUrl").val().trim(),
        isActive: $("#servActive").is(":checked"),
      },
      "Service created"
    );
    this.reset();
    $("#servActive").prop("checked", true);
    await loadServicesAdmin();
  });

  $("#formBrand").on("submit", async function onBrandSubmit(event) {
    event.preventDefault();
    await createResource(
      "brands",
      {
        name: $("#brandName").val().trim(),
        logoUrl: normalizeImageUrl($("#brandLogoUrl").val(), DEFAULT_BRAND_LOGO),
        sortOrder: Number($("#brandSortOrder").val() || 0),
        isActive: $("#brandActive").is(":checked"),
      },
      "Brand created"
    );
    this.reset();
    $("#brandActive").prop("checked", true);
    setBrandLogoPreview(DEFAULT_BRAND_LOGO);
    await loadBrandsAdmin();
  });

  $("#brandLogoUrl").on("input", function onLogoUrlInput() {
    setBrandLogoPreview($(this).val());
  });

  $("#brandLogoFile").on("change", async function onLogoFileChange() {
    const file = this.files?.[0];
    if (!file) {
      setBrandLogoPreview($("#brandLogoUrl").val());
      return;
    }
    if (!String(file.type || "").startsWith("image/")) {
      ShivamUI.showToast("Please choose a valid image file", "error");
      this.value = "";
      return;
    }
    if (Number(file.size || 0) > 1024 * 1024) {
      ShivamUI.showToast("Image must be under 1MB", "error");
      this.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      $("#brandLogoUrl").val(dataUrl);
      setBrandLogoPreview(dataUrl);
      ShivamUI.showToast("Brand logo attached", "success");
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#formOffer").on("submit", async function onOfferSubmit(event) {
    event.preventDefault();
    await createResource(
      "offers",
      {
        title: $("#offerTitle").val().trim(),
        subtitle: $("#offerSubtitle").val().trim(),
        discountPercent: Number($("#offerDiscount").val() || 0),
        promoCode: $("#offerCode").val().trim(),
        bannerImageUrl: $("#offerBanner").val().trim(),
        isActive: $("#offerActive").is(":checked"),
      },
      "Offer created"
    );
    this.reset();
    $("#offerActive").prop("checked", true);
    await loadOffersAdmin();
  });

  $("#formPaymentCode").on("submit", async function onPaymentCodeSubmit(event) {
    event.preventDefault();
    const remainingInput = $("#payCodeRemainingAmount").val().trim();
    const payload = {
      code: $("#payCodeValue").val().trim(),
      title: $("#payCodeTitle").val().trim(),
      description: $("#payCodeDescription").val().trim(),
      assignedEmail: $("#payCodeEmail").val().trim(),
      initialAmount: Number($("#payCodeInitialAmount").val() || 0),
      expiresAt: $("#payCodeExpiresAt").val() || "",
      isActive: $("#payCodeActive").is(":checked"),
    };
    if (remainingInput !== "") {
      payload.remainingAmount = Number(remainingInput || 0);
    }

    await createResource("payment-codes", payload, "Payment code created");
    this.reset();
    $("#payCodeActive").prop("checked", true);
    await loadPaymentCodes();
  });

  $("#btnAddOfflineItem").on("click", function onAddOfflineItem() {
    addOfflineOrderItemRow();
    refreshOfflineOrderSummary();
  });

  $("#offlineItemsBody").on("change input", ".offline-product-select, .offline-item-qty", function onOfflineItemChange() {
    refreshOfflineOrderSummary();
  });

  $("#offlineItemsBody").on("click", ".btn-offline-remove-item", function onOfflineItemRemove() {
    $(this).closest("tr").remove();
    if (!$("#offlineItemsBody .offline-item-row").length) {
      addOfflineOrderItemRow();
    }
    refreshOfflineOrderSummary();
  });

  $("#formOfflineOrder").on("submit", async function onOfflineOrderSubmit(event) {
    event.preventDefault();
    await createOfflineOrder(this);
  });

  $("#formJob").on("submit", async function onJobSubmit(event) {
    event.preventDefault();
    await createResource(
      "jobs",
      {
        title: $("#jobTitle").val().trim(),
        department: $("#jobDepartment").val().trim(),
        experienceText: $("#jobExperience").val().trim(),
        skillSummary: $("#jobSkills").val().trim(),
        details: $("#jobDetails").val().trim(),
        contactEmail: $("#jobContactEmail").val().trim(),
        sortOrder: Number($("#jobSortOrder").val() || 0),
        isActive: $("#jobActive").is(":checked"),
      },
      "Job post created"
    );
    this.reset();
    $("#jobContactEmail").val("careers@shivam.com");
    $("#jobActive").prop("checked", true);
    await loadJobsAdmin();
  });

  $("#formFaq").on("submit", async function onFaqSubmit(event) {
    event.preventDefault();
    await createResource(
      "faqs",
      {
        question: $("#faqQuestion").val().trim(),
        answer: $("#faqAnswer").val().trim(),
        category: $("#faqCategory").val().trim(),
        sortOrder: Number($("#faqSortOrder").val() || 0),
        isActive: $("#faqActive").is(":checked"),
      },
      "FAQ created"
    );
    this.reset();
    $("#faqActive").prop("checked", true);
    await loadFaqsAdmin();
  });

  $("#formTestimonial").on("submit", async function onTestimonialSubmit(event) {
    event.preventDefault();
    await createResource(
      "testimonials",
      {
        name: $("#testName").val().trim(),
        role: $("#testRole").val().trim(),
        quote: $("#testQuote").val().trim(),
        rating: Number($("#testRating").val() || 5),
        avatarUrl: $("#testAvatar").val().trim(),
        sortOrder: Number($("#testSortOrder").val() || 0),
        isActive: $("#testActive").is(":checked"),
      },
      "Testimonial created"
    );
    this.reset();
    $("#testActive").prop("checked", true);
    await loadTestimonialsAdmin();
  });

  $("#formBanner").on("submit", async function onBannerSubmit(event) {
    event.preventDefault();
    await createResource(
      "banners",
      {
        title: $("#banTitle").val().trim(),
        subtitle: $("#banSubtitle").val().trim(),
        imageUrl: $("#banImageUrl").val().trim(),
        ctaText: $("#banCtaText").val().trim(),
        ctaUrl: $("#banCtaUrl").val().trim(),
        placement: $("#banPlacement").val().trim(),
        sortOrder: Number($("#banSortOrder").val() || 0),
        isActive: $("#banActive").is(":checked"),
      },
      "Banner created"
    );
    this.reset();
    $("#banActive").prop("checked", true);
    await loadBannersAdmin();
  });

  $("#formPage").on("submit", async function onPageSubmit(event) {
    event.preventDefault();
    await createResource(
      "pages",
      {
        slug: $("#pageSlug").val().trim(),
        title: $("#pageTitle").val().trim(),
        hero: {
          eyebrow: $("#pageHeroEyebrow").val().trim(),
          heading: $("#pageHeroHeading").val().trim(),
          subheading: $("#pageHeroSubheading").val().trim(),
          imageUrl: $("#pageHeroImage").val().trim(),
        },
        richText: $("#pageRichText").val().trim(),
        cta: {
          text: $("#pageCtaText").val().trim(),
          url: $("#pageCtaUrl").val().trim(),
          style: $("#pageCtaStyle").val().trim() || "primary",
        },
        isActive: $("#pageActive").is(":checked"),
      },
      "Page content created"
    );
    this.reset();
    $("#pageActive").prop("checked", true);
    await loadPagesAdmin();
  });

  $("#formSetting").on("submit", async function onSettingSubmit(event) {
    event.preventDefault();
    await createResource(
      "site-settings",
      {
        key: $("#setKey").val().trim(),
        group: $("#setGroup").val().trim() || "general",
        value: parseSettingValue($("#setValue").val()),
        isPublic: $("#setPublic").is(":checked"),
      },
      "Setting created"
    );
    this.reset();
    $("#setPublic").prop("checked", true);
    await loadSettingsAdmin();
  });

  $("#adminRoot").on("click", ".btn-admin-delete", async function onDelete() {
    const resource = $(this).data("resource");
    const id = $(this).data("id");
    if (!confirm("Delete this item?")) return;

    try {
      await ShivamApi.admin.remove(resource, id);
      ShivamUI.showToast("Deleted successfully", "success");
      await loadAdminData();
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#adminRoot").on("click", ".btn-product-edit", async function onProductEditClick() {
    const id = $(this).data("id");
    let product = adminState.productsById[id] || null;
    if (!product) {
      try {
        const response = await ShivamApi.admin.get("products", id);
        product = response.data;
      } catch (error) {
        ShivamUI.showToast(error.message, "error");
        return;
      }
    }
    openEditProductModal(product);
  });

  $("#adminRoot").on("click", ".btn-stock-save", async function onStockSaveClick() {
    const id = $(this).data("id");
    const row = $(this).closest("tr");
    const stockValue = Number(row.find(".js-stock-input").val());
    if (!Number.isFinite(stockValue) || stockValue < 0) {
      ShivamUI.showToast("Stock must be zero or positive", "error");
      return;
    }

    const button = $(this);
    button.prop("disabled", true).text("Saving...");
    try {
      await ShivamApi.admin.update("products", id, { stock: stockValue });
      ShivamUI.showToast("Product quantity updated", "success");
      await loadProductsAdmin();
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    } finally {
      button.prop("disabled", false).text("Update");
    }
  });

  $("#adminRoot").on("change", ".order-status-select", async function onOrderStatusChange() {
    const id = $(this).data("id");
    const status = $(this).val();
    try {
      await ShivamApi.admin.updateOrderStatus(id, { status });
      ShivamUI.showToast("Order status updated", "success");
      await loadOrdersAdmin();
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#btnRefreshOrders").on("click", async function onRefreshOrders() {
    await loadOrdersAdmin();
  });

  $("#btnExportSalesExcel").on("click", async function onSalesExcel() {
    await downloadAdminReport("sales.xlsx", "shivam-sales-report.xlsx");
  });

  $("#btnExportSalesPdf").on("click", async function onSalesPdf() {
    await downloadAdminReport("sales.pdf", "shivam-sales-report.pdf");
  });

  $("#btnExportInventoryExcel").on("click", async function onInventoryExcel() {
    await downloadAdminReport("inventory.xlsx", "shivam-inventory-report.xlsx");
  });

  $("#btnExportInventoryPdf").on("click", async function onInventoryPdf() {
    await downloadAdminReport("inventory.pdf", "shivam-inventory-report.pdf");
  });

  setBrandLogoPreview($("#brandLogoUrl").val());
  ensureOfflineOrderFormInitialized();
}

function activateAdminTab(tabName) {
  const tab = String(tabName || "").trim();
  if (!tab) return false;
  const button = $(`.admin-tab-btn[data-tab="${tab}"]`);
  if (!button.length) return false;

  $(".admin-tab-btn").removeClass("active btn-dark").addClass("btn-outline-dark");
  button.addClass("active btn-dark").removeClass("btn-outline-dark");
  $(".admin-tab-pane").addClass("d-none");
  $(`#tab-${tab}`).removeClass("d-none");
  return true;
}

function consumeOfflineCartDraft() {
  const rawDraft = sessionStorage.getItem(OFFLINE_CART_DRAFT_KEY);
  if (!rawDraft) return null;

  sessionStorage.removeItem(OFFLINE_CART_DRAFT_KEY);
  try {
    return JSON.parse(rawDraft);
  } catch (error) {
    return null;
  }
}

function importOfflineCartDraftIntoForm() {
  const draft = consumeOfflineCartDraft();
  const draftItems = Array.isArray(draft?.items) ? draft.items : [];
  if (!draftItems.length) return;

  const validItems = draftItems
    .map((item) => ({
      productId: String(item?.productId || "").trim(),
      qty: Math.max(Number(item?.qty) || 0, 0),
    }))
    .filter((item) => item.productId && item.qty > 0 && adminState.productsById[item.productId]);

  if (!validItems.length) {
    showOfflineOrderAlert(
      "No valid cart items were available to import into Offline Store. Please review the product list and add items manually.",
      "warning"
    );
    return;
  }

  $("#offlineItemsBody").empty();
  validItems.forEach((item) => addOfflineOrderItemRow(item));
  refreshOfflineOrderSummary();

  const countLabel = validItems.length === 1 ? "1 item" : `${validItems.length} items`;
  showOfflineOrderAlert(
    `${countLabel} imported from cart. Please confirm customer details and payment mode before creating the offline order.`,
    "info"
  );
  ShivamUI.showToast("Cart items imported into Offline Store", "success");
}

function handleAdminEntryContext() {
  const params = new URLSearchParams(window.location.search || "");
  const requestedTab = String(params.get("tab") || "").trim();
  if (requestedTab) {
    activateAdminTab(requestedTab);
  }
  if (requestedTab === "offline-store") {
    importOfflineCartDraftIntoForm();
  }
}

function getEditModal() {
  if (!adminState.editModal) {
    adminState.editModal = new bootstrap.Modal(document.getElementById("productEditModal"));
  }
  return adminState.editModal;
}

function getProductPayload(prefix) {
  const read = (field) => $(`#${prefix}${field}`).val().trim();
  const isChecked = (field) => $(`#${prefix}${field}`).is(":checked");
  const imageUrl = read("ImageUrl");

  return {
    name: read("Name"),
    brand: read("Brand"),
    categoryId: $(`#${prefix}CategoryId`).val(),
    price: Number(read("Price") || 0),
    mrp: Number(read("Mrp") || 0),
    stock: Number(read("Stock") || 0),
    imageUrls: [imageUrl].filter(Boolean),
    gallery: [imageUrl].filter(Boolean),
    highlights: splitByLine(read("Highlights")),
    specs: splitByLine(read("Specs"))
      .map((line) => {
        const [label, ...valueParts] = line.split(":");
        return { label: (label || "").trim(), value: valueParts.join(":").trim() };
      })
      .filter((item) => item.label && item.value),
    tags: read("Tags")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    description: read("Description"),
    isFeatured: isChecked("Featured"),
    isActive: isChecked("Active"),
  };
}

function openEditProductModal(product) {
  if (!product) {
    ShivamUI.showToast("Product not found", "error");
    return;
  }

  $("#editProdId").val(product._id);
  $("#editProdName").val(product.name || "");
  $("#editProdBrand").val(product.brand || "");
  $("#editProdPrice").val(product.price || 0);
  $("#editProdMrp").val(product.mrp || 0);
  $("#editProdStock").val(product.stock || 0);
  $("#editProdImageUrl").val(product.imageUrls?.[0] || product.gallery?.[0] || "");
  $("#editProdTags").val((product.tags || []).join(", "));
  $("#editProdHighlights").val((product.highlights || []).join("\n"));
  $("#editProdSpecs").val((product.specs || []).map((spec) => `${spec.label}:${spec.value}`).join("\n"));
  $("#editProdDescription").val(product.description || "");
  $("#editProdFeatured").prop("checked", !!product.isFeatured);
  $("#editProdActive").prop("checked", !!product.isActive);
  $("#editProdCategoryId").val(String(product.categoryId?._id || product.categoryId || ""));
  getEditModal().show();
}

function splitByLine(raw) {
  return String(raw || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSettingValue(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return trimmed;
  }
}

async function createResource(resource, payload, successMessage) {
  try {
    await ShivamApi.admin.create(resource, payload);
    ShivamUI.showToast(successMessage, "success");
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
  }
}

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getOfflineProductOptions(selectedProductId = "") {
  if (!adminState.products.length) {
    return `<option value="">No products available</option>`;
  }
  const options = adminState.products
    .map((product) => {
      const selected = String(product._id) === String(selectedProductId) ? "selected" : "";
      return `<option value="${product._id}" ${selected}>${escapeHtml(product.name)} (${formatInr(
        product.price
      )})</option>`;
    })
    .join("");
  return `<option value="">Select product</option>${options}`;
}

function addOfflineOrderItemRow(initial = {}) {
  const body = $("#offlineItemsBody");
  if (!body.length) return;
  const qty = Math.max(Number(initial.qty) || 1, 1);
  const rowHtml = `
    <tr class="offline-item-row">
      <td>
        <select class="form-select form-select-sm offline-product-select">
          ${getOfflineProductOptions(initial.productId || "")}
        </select>
      </td>
      <td class="offline-unit-price">${formatInr(0)}</td>
      <td>
        <input class="form-control form-control-sm offline-item-qty" type="number" min="1" value="${qty}" style="max-width: 90px;" />
      </td>
      <td class="offline-line-total">${formatInr(0)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-outline-danger btn-offline-remove-item">Remove</button>
      </td>
    </tr>`;
  body.append(rowHtml);
}

function refreshOfflineProductOptions() {
  const selects = $("#offlineItemsBody .offline-product-select");
  if (!selects.length) return;
  selects.each(function updateOfflineSelect() {
    const current = $(this).val();
    $(this).html(getOfflineProductOptions(current));
  });
}

function refreshOfflineOrderSummary() {
  const rows = $("#offlineItemsBody .offline-item-row");
  if (!rows.length) {
    $("#offlineSubtotal").text(formatInr(0));
    $("#offlineTotal").text(formatInr(0));
    return;
  }

  let subtotal = 0;
  rows.each(function syncOfflineRow() {
    const row = $(this);
    const productId = String(row.find(".offline-product-select").val() || "").trim();
    const qtyInput = row.find(".offline-item-qty");
    const qty = Math.max(Number(qtyInput.val()) || 1, 1);
    qtyInput.val(qty);

    const product = adminState.productsById[productId];
    if (!product) {
      row.find(".offline-unit-price").text("-");
      row.find(".offline-line-total").text("-");
      return;
    }

    const unitPrice = Number(product.price || 0);
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    row.find(".offline-unit-price").text(formatInr(unitPrice));
    row.find(".offline-line-total").text(formatInr(lineTotal));
  });

  $("#offlineSubtotal").text(formatInr(subtotal));
  $("#offlineTotal").text(formatInr(subtotal));
}

function ensureOfflineOrderFormInitialized() {
  if (!$("#offlineItemsBody").length) return;
  refreshOfflineProductOptions();
  if (!$("#offlineItemsBody .offline-item-row").length) {
    addOfflineOrderItemRow();
  }
  refreshOfflineOrderSummary();
}

function getOfflineOrderItemsFromRows() {
  const items = [];
  $("#offlineItemsBody .offline-item-row").each(function collectOfflineRow() {
    const productId = String($(this).find(".offline-product-select").val() || "").trim();
    const qty = Math.max(Number($(this).find(".offline-item-qty").val()) || 0, 0);
    if (!productId || qty <= 0 || !adminState.productsById[productId]) return;
    items.push({ productId, qty });
  });
  return items;
}

function getOfflineShippingAddressFromForm() {
  return {
    fullName: $("#offlineCustomerName").val().trim(),
    email: $("#offlineEmail").val().trim(),
    phone: $("#offlinePhone").val().trim(),
    line1: $("#offlineLine1").val().trim(),
    line2: $("#offlineLine2").val().trim(),
    city: $("#offlineCity").val().trim(),
    state: $("#offlineState").val().trim(),
    pincode: $("#offlinePincode").val().trim(),
    country: $("#offlineCountry").val().trim() || "India",
  };
}

function validateOfflineOrderPayload(payload) {
  const shipping = payload.shippingAddress || {};
  const requiredFields = [
    { key: "fullName", message: "Please enter the customer's full name." },
    { key: "email", message: "Please enter the customer's email address." },
    { key: "phone", message: "Please enter the customer's phone number." },
    { key: "line1", message: "Please enter address line 1." },
    { key: "city", message: "Please enter the city." },
    { key: "state", message: "Please enter the state." },
    { key: "pincode", message: "Please enter the postal code." },
    { key: "country", message: "Please enter the country." },
  ];

  for (const field of requiredFields) {
    if (!shipping[field.key]) {
      return field.message;
    }
  }

  if (!OFFLINE_NAME_REGEX.test(shipping.fullName)) {
    return "Please enter a valid full name (letters, spaces, apostrophes, periods, and hyphens only).";
  }

  if (!OFFLINE_EMAIL_REGEX.test(shipping.email)) {
    return "Please enter a valid customer email address.";
  }

  if (!OFFLINE_PHONE_REGEX.test(shipping.phone)) {
    return "Please enter a valid 10-digit phone number (numbers only).";
  }

  if (!OFFLINE_POSTAL_REGEX.test(shipping.pincode)) {
    return "Please enter a valid postal code (4 to 10 characters).";
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return "Please add at least one valid product to create the offline order.";
  }

  return null;
}

function showOfflineOrderAlert(message, tone = "success") {
  $("#offlineOrderAlert").html(
    `<div class="alert alert-${tone}" role="alert">${escapeHtml(String(message || ""))}</div>`
  );
}

async function createOfflineOrder(formEl) {
  const payload = {
    shippingAddress: getOfflineShippingAddressFromForm(),
    items: getOfflineOrderItemsFromRows(),
    paymentMode: $("#offlinePaymentMode").val(),
    markPaid: $("#offlineMarkPaid").is(":checked"),
  };
  const validationError = validateOfflineOrderPayload(payload);
  if (validationError) {
    showOfflineOrderAlert(validationError, "danger");
    ShivamUI.showToast(validationError, "error");
    return;
  }

  const submitButton = $(formEl).find("button[type='submit']");
  submitButton.prop("disabled", true).text("Creating...");
  try {
    const response = await ShivamApi.admin.createOfflineOrder(payload);
    const orderId = response.order?._id ? `#${response.order._id}` : "";
    const paymentModeLabel = String(response.paymentSummary?.paymentMode || payload.paymentMode || "cash")
      .trim()
      .toUpperCase();
    const paymentStatus = String(response.paymentSummary?.paymentStatus || "unpaid")
      .trim()
      .toUpperCase();

    showOfflineOrderAlert(
      `Offline order ${orderId} created successfully. Payment mode: ${paymentModeLabel}, payment status: ${paymentStatus}.`,
      "success"
    );
    ShivamUI.showToast("Offline store order created", "success");

    formEl.reset();
    $("#offlineCountry").val("India");
    $("#offlinePaymentMode").val("cash");
    $("#offlineMarkPaid").prop("checked", true);
    $("#offlineItemsBody").empty();
    addOfflineOrderItemRow();
    refreshOfflineOrderSummary();
    await loadOrdersAdmin();
  } catch (error) {
    showOfflineOrderAlert(error.message, "danger");
    ShivamUI.showToast(error.message, "error");
  } finally {
    submitButton.prop("disabled", false).text("Create Offline Order");
  }
}

function getReportFilters() {
  return {
    from: $("#reportFromDate").val(),
    to: $("#reportToDate").val(),
    status: $("#reportStatus").val(),
  };
}

function queryFromObject(input) {
  const params = new URLSearchParams();
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  return params.toString();
}

function fileNameFromHeader(disposition, fallback) {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] || fallback;
}

/**
 * Binary report downloader:
 * - Uses JWT auth header.
 * - Preserves backend filename if available.
 * - Handles Excel and PDF responses.
 */
async function downloadAdminReport(path, fallbackFileName) {
  const token = ShivamApi.getToken();
  const query = queryFromObject(getReportFilters());
  const url = `${ShivamApi.API_BASE}/admin/reports/${path}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Unable to download report");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileNameFromHeader(
      response.headers.get("content-disposition"),
      fallbackFileName
    );
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
    ShivamUI.showToast("Report downloaded", "success");
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
  }
}

async function loadAdminData() {
  await Promise.all([
    loadCategories(),
    loadProductsAdmin(),
    loadServicesAdmin(),
    loadBrandsAdmin(),
    loadOffersAdmin(),
    loadPaymentCodes(),
    loadJobsAdmin(),
    loadOrdersAdmin(),
    loadJobApplications(),
    loadFaqsAdmin(),
    loadTestimonialsAdmin(),
    loadBannersAdmin(),
    loadPagesAdmin(),
    loadSettingsAdmin(),
  ]);
}

async function loadCategories() {
  try {
    const response = await ShivamApi.admin.list("categories", "limit=100");
    adminState.categories = response.data || [];

    const options = adminState.categories
      .map((category) => `<option value="${category._id}">${escapeHtml(category.name)}</option>`)
      .join("");
    $("#prodCategoryId").html(`<option value="">Select category</option>${options}`);
    $("#editProdCategoryId").html(`<option value="">Select category</option>${options}`);

    const rows = adminState.categories
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.slug)}</td>
        <td>${item.sortOrder}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="categories" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#categoriesTableBody").html(rows || `<tr><td colspan="5" class="text-center">No categories</td></tr>`);
  } catch (error) {
    $("#categoriesTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadProductsAdmin() {
  try {
    const response = await ShivamApi.admin.list("products", "limit=100");
    adminState.products = response.data || [];
    adminState.productsById = adminState.products.reduce((map, item) => {
      map[item._id] = item;
      return map;
    }, {});

    const rows = adminState.products
      .map(
        (item) => `
      <tr>
        <td>
          <div class="fw-semibold">${escapeHtml(item.name)}</div>
          <div class="small-muted">${escapeHtml(item.brand || "-")}</div>
        </td>
        <td>${escapeHtml(item.categoryId?.name || "-")}</td>
        <td>
          <div>${ShivamUI.formatPrice(item.price)}</div>
          <div class="small-muted">MRP: ${ShivamUI.formatPrice(item.mrp)}</div>
        </td>
        <td>
          <div class="d-flex gap-2 align-items-center">
            <input class="form-control form-control-sm js-stock-input" type="number" min="0" value="${Number(item.stock || 0)}" style="max-width: 95px;" />
            <button class="btn btn-sm btn-outline-primary btn-stock-save" data-id="${item._id}">Update</button>
          </div>
        </td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-dark btn-product-edit" data-id="${item._id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="products" data-id="${item._id}">Delete</button>
          </div>
        </td>
      </tr>`
      )
      .join("");
    $("#productsTableBody").html(rows || `<tr><td colspan="6" class="text-center">No products</td></tr>`);
    ensureOfflineOrderFormInitialized();
  } catch (error) {
    $("#productsTableBody").html(
      `<tr><td colspan="6" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadServicesAdmin() {
  try {
    const response = await ShivamApi.admin.list("services", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.ctaText || "-")}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="services" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#servicesTableBody").html(rows || `<tr><td colspan="4" class="text-center">No services</td></tr>`);
  } catch (error) {
    $("#servicesTableBody").html(
      `<tr><td colspan="4" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadBrandsAdmin() {
  try {
    const response = await ShivamApi.admin.list("brands", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>
          <img
            src="${escapeHtml(item.logoUrl || DEFAULT_BRAND_LOGO)}"
            alt="${escapeHtml(item.name)}"
            style="width: 72px; height: 40px; object-fit: contain; border: 1px solid #dde7f3; border-radius: 6px; background: #fff;"
            data-fallback-src="${DEFAULT_BRAND_LOGO}"
          />
        </td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.sortOrder}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td class="small-muted">${escapeHtml(item.logoUrl || DEFAULT_BRAND_LOGO)}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="brands" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#brandsTableBody").html(rows || `<tr><td colspan="6" class="text-center">No brands</td></tr>`);
  } catch (error) {
    $("#brandsTableBody").html(
      `<tr><td colspan="6" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadOffersAdmin() {
  try {
    const response = await ShivamApi.admin.list("offers", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${item.discountPercent}%</td>
        <td>${escapeHtml(item.promoCode || "-")}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="offers" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#offersTableBody").html(rows || `<tr><td colspan="5" class="text-center">No offers</td></tr>`);
  } catch (error) {
    $("#offersTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadPaymentCodes() {
  try {
    const response = await ShivamApi.admin.list("payment-codes", "limit=100");
    const rows = (response.data || [])
      .map((item) => {
        const expiresAt = item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("en-IN") : "-";
        return `
      <tr>
        <td><code>${escapeHtml(item.code || "-")}</code></td>
        <td>
          <div>${escapeHtml(item.title || "-")}</div>
          <div class="small-muted">Used: ${Number(item.usageCount || 0)} times</div>
        </td>
        <td>${escapeHtml(item.assignedEmail || "Any User")}</td>
        <td>${ShivamUI.formatPrice(item.initialAmount || 0)}</td>
        <td>${ShivamUI.formatPrice(item.remainingAmount || 0)}</td>
        <td>${item.isActive ? "Active" : "Inactive"}</td>
        <td>${escapeHtml(expiresAt)}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="payment-codes" data-id="${item._id}">Delete</button></td>
      </tr>`;
      })
      .join("");
    $("#paymentCodesTableBody").html(rows || `<tr><td colspan="8" class="text-center">No payment codes</td></tr>`);
  } catch (error) {
    $("#paymentCodesTableBody").html(
      `<tr><td colspan="8" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadJobsAdmin() {
  try {
    const response = await ShivamApi.admin.list("jobs", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.department || "-")}</td>
        <td>${escapeHtml(item.experienceText || "-")}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="jobs" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#jobsTableBody").html(rows || `<tr><td colspan="5" class="text-center">No jobs</td></tr>`);
  } catch (error) {
    $("#jobsTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadOrdersAdmin() {
  try {
    const query = queryFromObject({ limit: 100, ...getReportFilters() });
    const response = await ShivamApi.admin.orders(query);
    const rows = (response.orders || [])
      .map(
        (order) => `
      <tr>
        <td>${escapeHtml(order._id)}</td>
        <td>${escapeHtml(order.shippingAddress?.fullName || order.userId?.name || "-")}</td>
        <td>${ShivamUI.formatPrice(order.total)}</td>
        <td><span class="status-pill status-${order.status}">${escapeHtml(order.status)}</span></td>
        <td>
          <select class="form-select form-select-sm order-status-select" data-id="${order._id}">
            ${["pending", "paid", "processing", "shipped", "delivered", "cancelled"]
              .map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`)
              .join("")}
          </select>
        </td>
      </tr>`
      )
      .join("");
    $("#ordersTableBody").html(rows || `<tr><td colspan="5" class="text-center">No orders</td></tr>`);
  } catch (error) {
    $("#ordersTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadJobApplications() {
  try {
    const response = await ShivamApi.admin.list("job-applications", "limit=100");
    const rows = (response.applications || [])
      .map(
        (app) => `
      <tr>
        <td>${escapeHtml(app.fullName)}</td>
        <td>${escapeHtml(app.email)}</td>
        <td>${escapeHtml(app.phone)}</td>
        <td>${escapeHtml(app.address || "-")}</td>
        <td>${escapeHtml(app.jobId?.title || "-")}</td>
        <td>${escapeHtml(app.status)}</td>
      </tr>`
      )
      .join("");
    $("#applicationsTableBody").html(rows || `<tr><td colspan="6" class="text-center">No applications</td></tr>`);
  } catch (error) {
    $("#applicationsTableBody").html(
      `<tr><td colspan="6" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadFaqsAdmin() {
  try {
    const response = await ShivamApi.admin.list("faqs", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.question)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="faqs" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#faqsTableBody").html(rows || `<tr><td colspan="4" class="text-center">No FAQs</td></tr>`);
  } catch (error) {
    $("#faqsTableBody").html(
      `<tr><td colspan="4" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadTestimonialsAdmin() {
  try {
    const response = await ShivamApi.admin.list("testimonials", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.role || "-")}</td>
        <td>${item.rating || 5}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="testimonials" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#testimonialsTableBody").html(rows || `<tr><td colspan="5" class="text-center">No testimonials</td></tr>`);
  } catch (error) {
    $("#testimonialsTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadBannersAdmin() {
  try {
    const response = await ShivamApi.admin.list("banners", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.placement)}</td>
        <td>${item.sortOrder}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="banners" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#bannersTableBody").html(rows || `<tr><td colspan="5" class="text-center">No banners</td></tr>`);
  } catch (error) {
    $("#bannersTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadPagesAdmin() {
  try {
    const response = await ShivamApi.admin.list("pages", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.slug)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${item.isActive ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="pages" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#pagesTableBody").html(rows || `<tr><td colspan="4" class="text-center">No pages</td></tr>`);
  } catch (error) {
    $("#pagesTableBody").html(
      `<tr><td colspan="4" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}

async function loadSettingsAdmin() {
  try {
    const response = await ShivamApi.admin.list("site-settings", "limit=100");
    const rows = (response.data || [])
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.key)}</td>
        <td>${escapeHtml(item.group)}</td>
        <td><code>${escapeHtml(typeof item.value === "string" ? item.value : JSON.stringify(item.value))}</code></td>
        <td>${item.isPublic ? "Yes" : "No"}</td>
        <td><button class="btn btn-sm btn-outline-danger btn-admin-delete" data-resource="site-settings" data-id="${item._id}">Delete</button></td>
      </tr>`
      )
      .join("");
    $("#settingsTableBody").html(rows || `<tr><td colspan="5" class="text-center">No settings</td></tr>`);
  } catch (error) {
    $("#settingsTableBody").html(
      `<tr><td colspan="5" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`
    );
  }
}
