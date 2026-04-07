/**
 * Wishlist page script
 * --------------------
 * Lists wishlist products and supports remove/add-to-cart interactions.
 */
$(async function initWishlistPage() {
  await ShivamUI.initLayout();
  const user = ShivamApi.getUser();
  if (!user) {
    $("#wishlistRoot").html(
      '<div class="empty-state">Please login to access wishlist. <a href="login.html">Login</a></div>'
    );
    return;
  }
  await loadWishlist();
});

async function loadWishlist() {
  ShivamUI.mountSkeleton("#wishlistRoot", 4);
  try {
    const data = await ShivamApi.wishlist.list();
    const items = data.wishlist || [];
    if (!items.length) {
      $("#wishlistRoot").html('<div class="empty-state">Your wishlist is empty.</div>');
      return;
    }

    const html = items
      .map(
        (item) => `
      <div class="col-lg-3 col-md-4 col-sm-6 mb-4 reveal">
        <div class="card product-card h-100">
          <img src="${(item.imageUrls && item.imageUrls[0]) || "/assets/images/hero-sports.jpg"}" class="card-img-top" alt="${item.name}" />
          <div class="card-body d-flex flex-column">
            <h5>${item.name}</h5>
            <p class="small-muted mb-2">${item.brand || ""}</p>
            <div class="price-wrap mb-3">
              <span class="price-now">${ShivamUI.formatPrice(item.price)}</span>
              <span class="price-mrp">${ShivamUI.formatPrice(item.mrp)}</span>
            </div>
            <div class="mt-auto d-grid gap-2">
              <button class="btn btn-primary-brand btn-wishlist-cart" data-id="${item._id}">Add to Cart</button>
              <button class="btn btn-outline-danger btn-wishlist-remove" data-id="${item._id}">Remove</button>
            </div>
          </div>
        </div>
      </div>`
      )
      .join("");
    $("#wishlistRoot").html(html);
    ShivamUI.observeRevealAnimations();

    $(".btn-wishlist-remove").on("click", async function onRemove() {
      try {
        await ShivamApi.wishlist.remove($(this).data("id"));
        ShivamUI.showToast("Removed from wishlist", "success");
        await loadWishlist();
      } catch (error) {
        ShivamUI.showToast(error.message, "error");
      }
    });

    $(".btn-wishlist-cart").on("click", async function onAddCart() {
      try {
        await ShivamApi.cart.addItem({ productId: $(this).data("id"), qty: 1 });
        ShivamUI.showAddedToCartToast();
        ShivamUI.updateCartBadge();
      } catch (error) {
        ShivamUI.showToast(error.message, "error");
      }
    });
  } catch (error) {
    $("#wishlistRoot").html(`<div class="empty-state">${error.message}</div>`);
  }
}
