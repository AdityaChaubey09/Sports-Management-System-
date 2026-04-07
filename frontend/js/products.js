/**
 * Products page controller
 * ------------------------
 * Implements:
 * - filter/sort/search/pagination
 * - active filter chips
 * - slide-toggle filter panel for compact layout
 */
const productState = {
  page: 1,
  limit: 12,
  search: "",
  category: "",
  brand: "",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
};
const VALID_PRODUCT_SORTS = new Set(["newest", "price_asc", "price_desc", "name_asc", "name_desc"]);

$(async function initProductsPage() {
  await ShivamUI.initLayout();

  const params = new URLSearchParams(window.location.search);
  if (params.get("search")) {
    productState.search = params.get("search");
  }
  if (params.get("category")) {
    productState.category = params.get("category");
  }
  if (params.get("brand")) {
    productState.brand = params.get("brand");
  }
  if (params.get("minPrice")) {
    productState.minPrice = params.get("minPrice");
  }
  if (params.get("maxPrice")) {
    productState.maxPrice = params.get("maxPrice");
  }
  if (params.get("sort")) {
    productState.sort = params.get("sort");
  }
  if (!VALID_PRODUCT_SORTS.has(productState.sort)) {
    productState.sort = "newest";
  }

  await Promise.all([loadCategoryOptions(), loadBrandOptions()]);
  $("#filterSearch").val(productState.search);
  $("#filterCategory").val(productState.category);
  $("#filterBrand").val(productState.brand);
  $("#filterMinPrice").val(productState.minPrice);
  $("#filterMaxPrice").val(productState.maxPrice);
  $("#filterSort").val(productState.sort || "newest");
  await loadProducts();

  $("#btnToggleFilters").on("click", function onToggleFilters() {
    $("#filterPanel").toggleClass("active").slideToggle(220);
  });

  $("#btnApplyFilters").on("click", async function onApply() {
    syncFiltersFromInputs();
    productState.page = 1;
    await loadProducts();
  });

  $("#btnResetFilters").on("click", async function onReset() {
    resetFilters();
    await loadProducts();
  });
});

function syncFiltersFromInputs() {
  productState.search = $("#filterSearch").val().trim();
  productState.category = $("#filterCategory").val();
  productState.brand = $("#filterBrand").val();
  productState.sort = $("#filterSort").val();
  productState.minPrice = $("#filterMinPrice").val();
  productState.maxPrice = $("#filterMaxPrice").val();
}

function resetFilters() {
  productState.page = 1;
  productState.search = "";
  productState.category = "";
  productState.brand = "";
  productState.sort = "newest";
  productState.minPrice = "";
  productState.maxPrice = "";
  $("#filterSearch,#filterMinPrice,#filterMaxPrice").val("");
  $("#filterCategory").val("");
  $("#filterBrand").val("");
  $("#filterSort").val("newest");
}

function buildProductQuery() {
  const query = new URLSearchParams();
  query.set("page", productState.page);
  query.set("limit", productState.limit);
  query.set("sort", productState.sort);
  if (productState.search) query.set("search", productState.search);
  if (productState.category) query.set("category", productState.category);
  if (productState.brand) query.set("brand", productState.brand);
  if (productState.minPrice) query.set("minPrice", productState.minPrice);
  if (productState.maxPrice) query.set("maxPrice", productState.maxPrice);
  return query.toString();
}

function renderFilterChips() {
  const chips = [];
  if (productState.search) chips.push(`Search: ${productState.search}`);
  if (productState.category) chips.push(`Category: ${productState.category}`);
  if (productState.brand) chips.push(`Brand: ${productState.brand}`);
  if (productState.minPrice) chips.push(`Min: ₹${productState.minPrice}`);
  if (productState.maxPrice) chips.push(`Max: ₹${productState.maxPrice}`);
  if (productState.sort !== "newest") chips.push(`Sort: ${productState.sort}`);

  if (!chips.length) {
    $("#activeFilterChips").html('<span class="small-muted">No active filters</span>');
    return;
  }
  $("#activeFilterChips").html(chips.map((chip) => `<span class="filter-chip">${chip}</span>`).join(""));
}

async function loadCategoryOptions() {
  try {
    const data = await ShivamApi.catalog.categories();
    const options = (data.categories || [])
      .map((category) => `<option value="${category.slug}">${category.name}</option>`)
      .join("");
    $("#filterCategory").html(`<option value="">All Categories</option>${options}`);
  } catch (error) {
    $("#filterCategory").html(`<option value="">All Categories</option>`);
  }
}

async function loadBrandOptions() {
  try {
    const data = await ShivamApi.catalog.brands();
    const options = (data.brands || [])
      .map((brand) => `<option value="${brand.name}">${brand.name}</option>`)
      .join("");
    $("#filterBrand").html(`<option value="">All Brands</option>${options}`);
  } catch (error) {
    $("#filterBrand").html(`<option value="">All Brands</option>`);
  }
}

async function loadProducts() {
  ShivamUI.mountSkeleton("#productGrid", 8);
  renderFilterChips();
  try {
    const data = await ShivamApi.catalog.products(buildProductQuery());
    const products = data.products || [];
    const pagination = data.pagination || {};

    if (!products.length) {
      $("#productGrid").html(`<div class="col-12"><div class="empty-state">No products found for selected filters.</div></div>`);
    } else {
      $("#productGrid").html(products.map((product) => ShivamUI.renderProductCard(product)).join(""));
    }

    renderPagination(pagination.page || 1, pagination.totalPages || 1);
    ShivamUI.observeRevealAnimations();
  } catch (error) {
    $("#productGrid").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
    $("#productPagination").empty();
  }
}

function renderPagination(page, totalPages) {
  if (totalPages <= 1) {
    $("#productPagination").empty();
    return;
  }

  let html = `<nav><ul class="pagination justify-content-center">`;
  html += `<li class="page-item ${page <= 1 ? "disabled" : ""}">
    <button class="page-link" data-page="${page - 1}">Previous</button>
  </li>`;

  for (let i = 1; i <= totalPages; i += 1) {
    html += `<li class="page-item ${i === page ? "active" : ""}">
      <button class="page-link" data-page="${i}">${i}</button>
    </li>`;
  }

  html += `<li class="page-item ${page >= totalPages ? "disabled" : ""}">
    <button class="page-link" data-page="${page + 1}">Next</button>
  </li>`;
  html += `</ul></nav>`;

  $("#productPagination").html(html);
  $("#productPagination .page-link").on("click", async function onPageClick() {
    const newPage = Number($(this).data("page"));
    if (!newPage || newPage < 1 || newPage > totalPages || newPage === page) return;
    productState.page = newPage;
    await loadProducts();
    window.scrollTo({ top: 220, behavior: "smooth" });
  });
}
