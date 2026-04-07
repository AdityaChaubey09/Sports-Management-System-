/**
 * About page script
 * -----------------
 * Loads CMS-driven page content and testimonial cards.
 */
$(async function initAboutPage() {
  await ShivamUI.initLayout();
  await Promise.all([loadAboutContent(), loadTestimonials()]);
  ShivamUI.observeRevealAnimations();
});

async function loadAboutContent() {
  try {
    const data = await ShivamApi.content.pageBySlug("about");
    const page = data.page;
    $("#aboutHeroEyebrow").text(page.hero?.eyebrow || "About");
    $("#aboutHeroHeading").text(page.hero?.heading || page.title || "About Shivam Sports");
    $("#aboutHeroSubheading").text(page.hero?.subheading || "");
    $("#aboutRichText").html(page.richText || "<p>About content unavailable right now.</p>");
    if (page.cta?.text && page.cta?.url) {
      $("#aboutCta")
        .text(page.cta.text)
        .attr("href", page.cta.url)
        .removeClass("d-none");
    }
  } catch (error) {
    $("#aboutRichText").html(`<div class="empty-state">${error.message}</div>`);
  }
}

async function loadTestimonials() {
  try {
    const data = await ShivamApi.content.testimonials();
    const html = (data.testimonials || [])
      .map(
        (item) => `
      <div class="col-md-4 mb-3 reveal">
        <div class="glass-panel p-3 h-100">
          <div class="d-flex align-items-center gap-2 mb-2">
            <img class="profile-avatar" src="${item.avatarUrl || "/assets/images/pdf-extracted/img-67.jpeg"}" alt="${item.name}" />
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
    $("#aboutTestimonials").html(html || `<div class="col-12"><div class="empty-state">No testimonials.</div></div>`);
  } catch (error) {
    $("#aboutTestimonials").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}
