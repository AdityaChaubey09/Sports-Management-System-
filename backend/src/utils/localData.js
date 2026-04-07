const fs = require("fs");
const path = require("path");
const { slugify } = require("./slugify");

const dataDir = path.join(__dirname, "../data");

function readArrayFile(fileName) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, fileName), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function toIso(index) {
  return new Date(Date.UTC(2024, 0, 1 + index)).toISOString();
}

function bySortOrderThenName(left, right) {
  const orderDiff = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
  if (orderDiff !== 0) return orderDiff;
  return String(left.name || left.title || "").localeCompare(String(right.name || right.title || ""));
}

function byCreatedDesc(left, right) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function byCreatedThenSortOrder(left, right) {
  const orderDiff = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
  if (orderDiff !== 0) return orderDiff;
  return byCreatedDesc(left, right);
}

function buildCategories(includeInactive = false) {
  return readArrayFile("categories.json")
    .map((item, index) => {
      const slug = slugify(item.slug || item.name || `category-${index + 1}`);
      return {
        _id: `cat_${slug}`,
        name: item.name || "Category",
        slug,
        imageUrl: item.imageUrl || "",
        sortOrder: Number(item.sortOrder || 0),
        isActive: item.isActive !== false,
        createdAt: toIso(index),
        updatedAt: toIso(index),
      };
    })
    .filter((item) => (includeInactive ? true : item.isActive))
    .sort(bySortOrderThenName);
}

function buildCategoryMatcher(categoryValue, categories) {
  const value = String(categoryValue || "").trim().toLowerCase();
  if (!value) return null;
  return categories.find(
    (category) =>
      String(category._id).toLowerCase() === value ||
      String(category.slug).toLowerCase() === value ||
      String(category.name).toLowerCase() === value
  );
}

function buildProducts(includeInactive = false) {
  const categories = buildCategories(true);
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));

  return readArrayFile("products.json")
    .map((item, index) => {
      const slug = slugify(item.slug || item.name || `product-${index + 1}`);
      const category = categoriesBySlug.get(slugify(item.categorySlug || ""));
      const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls.filter(Boolean) : [];
      const gallery =
        Array.isArray(item.gallery) && item.gallery.length ? item.gallery.filter(Boolean) : imageUrls;

      return {
        _id: `prod_${slug}`,
        name: item.name || "Product",
        slug,
        description: item.description || "",
        categoryId: category
          ? { _id: category._id, name: category.name, slug: category.slug }
          : null,
        categoryName: category?.name || "",
        categorySlug: category?.slug || slugify(item.categorySlug || ""),
        brand: item.brand || "SHIVAM SPORTS",
        price: Number(item.price || 0),
        mrp: Number(item.mrp || 0),
        stock: Number(item.stock || 0),
        imageUrls,
        gallery,
        highlights: Array.isArray(item.highlights) ? item.highlights : [],
        specs: Array.isArray(item.specs) ? item.specs : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
        isFeatured: item.isFeatured === true,
        isActive: item.isActive !== false,
        createdAt: toIso(index),
        updatedAt: toIso(index),
      };
    })
    .filter((item) => (includeInactive ? true : item.isActive));
}

function sortProducts(products, sort = "newest") {
  const list = [...products];
  switch (sort) {
    case "price_asc":
      return list.sort((left, right) => Number(left.price || 0) - Number(right.price || 0));
    case "price_desc":
      return list.sort((left, right) => Number(right.price || 0) - Number(left.price || 0));
    case "name_asc":
      return list.sort((left, right) => String(left.name).localeCompare(String(right.name)));
    case "name_desc":
      return list.sort((left, right) => String(right.name).localeCompare(String(left.name)));
    case "newest":
    default:
      return list.sort(byCreatedDesc);
  }
}

function getCategories() {
  return buildCategories(false);
}

function getProducts(query = {}) {
  const {
    search = "",
    category = "",
    brand = "",
    minPrice = "",
    maxPrice = "",
    sort = "newest",
    page = 1,
    limit = 12,
    featured = "",
  } = query;

  const allCategories = buildCategories(true);
  const matchedCategory = buildCategoryMatcher(category, allCategories);
  if (String(category || "").trim() && !matchedCategory) {
    return {
      products: [],
      pagination: {
        page: Math.max(Number(page) || 1, 1),
        limit: Math.min(Math.max(Number(limit) || 12, 1), 50),
        totalItems: 0,
        totalPages: 0,
      },
    };
  }

  let products = buildProducts(false);
  const searchText = String(search || "").trim().toLowerCase();
  const brandText = String(brand || "").trim().toLowerCase();

  if (searchText) {
    products = products.filter(
      (product) =>
        String(product.name || "").toLowerCase().includes(searchText) ||
        String(product.brand || "").toLowerCase().includes(searchText)
    );
  }

  if (brandText) {
    products = products.filter((product) => String(product.brand || "").toLowerCase() === brandText);
  }

  if (matchedCategory) {
    products = products.filter((product) => product.categoryId?._id === matchedCategory._id);
  }

  if (featured === "true") {
    products = products.filter((product) => product.isFeatured);
  }

  if (minPrice !== "" && minPrice !== undefined) {
    products = products.filter((product) => Number(product.price || 0) >= Number(minPrice));
  }

  if (maxPrice !== "" && maxPrice !== undefined) {
    products = products.filter((product) => Number(product.price || 0) <= Number(maxPrice));
  }

  products = sortProducts(products, sort);

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const totalItems = products.length;
  const totalPages = totalItems ? Math.ceil(totalItems / safeLimit) : 0;
  const start = (safePage - 1) * safeLimit;

  return {
    products: products.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
    },
  };
}

function getFeaturedProducts(limit = 8) {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 24);
  return sortProducts(
    buildProducts(false).filter((product) => product.isFeatured),
    "newest"
  ).slice(0, safeLimit);
}

function getProductBySlug(slug) {
  return buildProducts(false).find((product) => product.slug === slugify(slug || ""));
}

function getRelatedProducts(slug, limit = 4) {
  const product = getProductBySlug(slug);
  if (!product) return null;

  const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 12);
  const related = buildProducts(false)
    .filter(
      (item) =>
        item._id !== product._id &&
        (item.categoryId?._id === product.categoryId?._id || item.brand === product.brand)
    )
    .sort((left, right) => {
      if (left.isFeatured !== right.isFeatured) {
        return Number(right.isFeatured) - Number(left.isFeatured);
      }
      return byCreatedDesc(left, right);
    })
    .slice(0, safeLimit);

  return { product, related };
}

function getServices() {
  return readArrayFile("services.json")
    .map((item, index) => ({
      _id: `service_${slugify(item.title || `service-${index + 1}`)}`,
      title: item.title || "Service",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      ctaText: item.ctaText || "Learn More",
      ctaUrl: item.ctaUrl || "#",
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .sort(byCreatedDesc);
}

function getBrands() {
  return readArrayFile("brands.json")
    .map((item, index) => ({
      _id: `brand_${slugify(item.name || `brand-${index + 1}`)}`,
      name: item.name || "Brand",
      logoUrl: item.logoUrl || "",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .sort(bySortOrderThenName);
}

function getOffers() {
  const now = Date.now();
  return readArrayFile("offers.json")
    .map((item, index) => ({
      _id: `offer_${slugify(item.title || `offer-${index + 1}`)}`,
      title: item.title || "Offer",
      subtitle: item.subtitle || "",
      bannerImageUrl: item.bannerImageUrl || "",
      discountPercent: Number(item.discountPercent || 0),
      promoCode: item.promoCode || "",
      startAt: item.startAt || null,
      endAt: item.endAt || null,
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .filter((item) => {
      const start = item.startAt ? new Date(item.startAt).getTime() : null;
      const end = item.endAt ? new Date(item.endAt).getTime() : null;
      if (start && start > now) return false;
      if (end && end < now) return false;
      return true;
    })
    .sort((left, right) => Number(right.discountPercent || 0) - Number(left.discountPercent || 0));
}

function getJobs() {
  return readArrayFile("jobs.json")
    .map((item, index) => ({
      _id: `job_${slugify(item.title || `job-${index + 1}`)}`,
      title: item.title || "Job Role",
      department: item.department || "General",
      experienceText: item.experienceText || "",
      skillSummary: item.skillSummary || "",
      details: item.details || "",
      contactEmail: item.contactEmail || "careers@shivam.com",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .sort(byCreatedThenSortOrder);
}

function getFaqs(category = "") {
  const categoryFilter = String(category || "").trim().toLowerCase();
  return readArrayFile("faqs.json")
    .map((item, index) => ({
      _id: `faq_${slugify(item.question || `faq-${index + 1}`)}`,
      question: item.question || "Question",
      answer: item.answer || "",
      category: item.category || "general",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .filter((item) => (!categoryFilter ? true : String(item.category).toLowerCase() === categoryFilter))
    .sort(byCreatedThenSortOrder);
}

function getBanners(placement = "") {
  const placementFilter = String(placement || "").trim();
  return readArrayFile("banners.json")
    .map((item, index) => ({
      _id: `banner_${slugify(`${item.placement || "banner"}-${item.title || index + 1}`)}`,
      title: item.title || "Banner",
      subtitle: item.subtitle || "",
      imageUrl: item.imageUrl || "",
      ctaText: item.ctaText || "",
      ctaUrl: item.ctaUrl || "",
      placement: item.placement || "general",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .filter((item) => (!placementFilter ? true : item.placement === placementFilter))
    .sort(byCreatedThenSortOrder);
}

function getTestimonials() {
  return readArrayFile("testimonials.json")
    .map((item, index) => ({
      _id: `testimonial_${slugify(`${item.name || "testimonial"}-${index + 1}`)}`,
      name: item.name || "Customer",
      role: item.role || "",
      quote: item.quote || "",
      rating: Number(item.rating || 5),
      avatarUrl: item.avatarUrl || "",
      sortOrder: Number(item.sortOrder || 0),
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isActive)
    .sort(byCreatedThenSortOrder);
}

function getPageBySlug(slug) {
  const faqsByQuestion = new Map(
    getFaqs().map((faq) => [String(faq.question).toLowerCase().trim(), faq])
  );

  const page = readArrayFile("pages.json")
    .map((item, index) => ({
      _id: `page_${slugify(item.slug || `page-${index + 1}`)}`,
      slug: slugify(item.slug || `page-${index + 1}`),
      title: item.title || "Page",
      hero: item.hero || {},
      richText: item.richText || "",
      faqRefs: (item.faqQuestions || [])
        .map((question) => faqsByQuestion.get(String(question).toLowerCase().trim()))
        .filter(Boolean),
      cta: item.cta || {},
      seo: item.seo || {},
      isActive: item.isActive !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .find((item) => item.isActive && item.slug === slugify(slug || ""));

  return page || null;
}

function getSettings(group = "") {
  const groupFilter = String(group || "").trim();
  return readArrayFile("site-settings.json")
    .map((item, index) => ({
      _id: `setting_${slugify(item.key || `setting-${index + 1}`)}`,
      key: item.key || `setting.${index + 1}`,
      group: item.group || "general",
      value: Object.prototype.hasOwnProperty.call(item, "value") ? item.value : null,
      isPublic: item.isPublic !== false,
      createdAt: toIso(index),
      updatedAt: toIso(index),
    }))
    .filter((item) => item.isPublic)
    .filter((item) => (!groupFilter ? true : item.group === groupFilter))
    .sort((left, right) => {
      const groupDiff = String(left.group).localeCompare(String(right.group));
      if (groupDiff !== 0) return groupDiff;
      return String(left.key).localeCompare(String(right.key));
    });
}

module.exports = {
  getCategories,
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
  getServices,
  getBrands,
  getOffers,
  getJobs,
  getFaqs,
  getBanners,
  getTestimonials,
  getPageBySlug,
  getSettings,
};
