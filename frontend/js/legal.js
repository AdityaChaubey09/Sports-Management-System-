/**
 * Legal page renderer
 * -------------------
 * Reused by shipping-policy, returns-policy, privacy-policy and terms pages.
 * The page slug is declared in each HTML file through `data-page-slug` on <body>.
 */
$(async function initLegalPage() {
  await ShivamUI.initLayout();
  const slug = $("body").data("page-slug");
  if (!slug) {
    $("#legalContentRoot").html('<div class="empty-state">Missing page slug configuration.</div>');
    return;
  }

  await loadLegalContent(slug);
});

async function loadLegalContent(slug) {
  try {
    const data = await ShivamApi.content.pageBySlug(slug);
    const page = data.page;
    $("#legalEyebrow").text(page.hero?.eyebrow || "Policy");
    $("#legalTitle").text(page.hero?.heading || page.title || "Policy");
    $("#legalSubtitle").text(page.hero?.subheading || "");
    $("#legalHeroImage").attr("src", page.hero?.imageUrl || "/assets/images/pdf-pages/page-1.png");
    $("#legalContentBody").html(page.richText || "<p>No content available.</p>");
    if (page.cta?.text && page.cta?.url) {
      $("#legalCta")
        .text(page.cta.text)
        .attr("href", page.cta.url)
        .removeClass("d-none");
    }

    if (page.faqRefs && page.faqRefs.length) {
      const faqHtml = page.faqRefs
        .map(
          (faq) => `
        <div class="faq-item mb-2">
          <button class="faq-head">${faq.question}</button>
          <div class="faq-body">${faq.answer}</div>
        </div>`
        )
        .join("");
      $("#legalFaq").html(faqHtml);
      ShivamUI.initSupportAccordion();
    } else {
      $("#legalFaq").html('<div class="small-muted">No related FAQs for this page.</div>');
    }
    ShivamUI.observeRevealAnimations();
  } catch (error) {
    $("#legalContentRoot").html(`<div class="empty-state">${error.message}</div>`);
  }
}
