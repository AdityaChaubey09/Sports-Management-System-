/**
 * Product detail page script
 * --------------------------
 * Flow:
 * - Read slug from query param.
 * - Load product details and render gallery/specs/highlights.
 * - Load related products.
 */
$(async function initProductDetailPage() {
  await ShivamUI.initLayout();

  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    $("#productDetailRoot").html('<div class="empty-state">Missing product slug.</div>');
    return;
  }

  await Promise.all([loadProduct(slug), loadRelated(slug)]);
  ShivamUI.observeRevealAnimations();
});

async function loadProduct(slug) {
  try {
    const data = await ShivamApi.catalog.productBySlug(slug);
    const product = data.product;
    const gallery = product.gallery?.length ? product.gallery : product.imageUrls || [];
    const primary = gallery[0] || "/assets/images/hero-sports.jpg";

    $("#detailImageMain").attr("src", primary);
    $("#detailName").text(product.name);
    $("#detailCategory").text(product.categoryId?.name || "");
    $("#detailPrice").html(ShivamUI.formatPrice(product.price));
    $("#detailMrp").html(ShivamUI.formatPrice(product.mrp));
    $("#detailDescription").text(product.description || "");

    $("#btnDetailAddCart")
      .off("click")
      .on("click", async function onAddCart() {
        try {
          await ShivamApi.cart.addItem({ productId: product._id, qty: 1 });
          ShivamUI.showAddedToCartToast();
          ShivamUI.updateCartBadge();
        } catch (error) {
          ShivamUI.showToast(error.message, "error");
        }
      });

    $("#btnDetailWishlist")
      .off("click")
      .on("click", async function onWishlist() {
        try {
          await ShivamApi.wishlist.add(product._id);
          ShivamUI.showToast("Added to wishlist", "success");
        } catch (error) {
          ShivamUI.showToast(error.message, "error");
        }
      });

    $("#detailThumbs").html(
      gallery
        .map(
          (img) =>
            `<img class="img-thumbnail me-2 mb-2 detail-thumb" src="${img}" alt="${product.name}" style="width:82px;height:82px;object-fit:cover;cursor:pointer;" />`
        )
        .join("")
    );
    $(".detail-thumb").on("click", function onThumbClick() {
      $("#detailImageMain").attr("src", $(this).attr("src"));
    });

    $("#detailHighlights").html(
      (product.highlights || [])
        .map((item) => `<li class="mb-1">${item}</li>`)
        .join("") || "<li>No highlights listed</li>"
    );

    $("#detailSpecs").html(
      (product.specs || [])
        .map((item) => `<tr><th>${item.label}</th><td>${item.value}</td></tr>`)
        .join("") || '<tr><td colspan="2" class="text-center">No specs listed</td></tr>'
    );
  } catch (error) {
    $("#productDetailRoot").html(`<div class="empty-state">${error.message}</div>`);
  }
}

async function loadRelated(slug) {
  try {
    const data = await ShivamApi.catalog.relatedProducts(slug, 4);
    const html = (data.related || []).map((item) => ShivamUI.renderProductCard(item)).join("");
    $("#relatedProducts").html(html || `<div class="col-12"><div class="empty-state">No related products.</div></div>`);
  } catch (error) {
    $("#relatedProducts").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}
