/**
 * FAQ page script
 * ---------------
 * Loads FAQ entries and supports category filtering with animated accordion behavior.
 */
$(async function initFaqPage() {
  await ShivamUI.initLayout();
  await loadFaqs();

  $("#faqCategory").on("change", async function onCategoryChange() {
    await loadFaqs($(this).val());
  });
});

async function loadFaqs(category = "") {
  $("#faqList").html('<div class="empty-state">Loading FAQs...</div>');
  try {
    const data = await ShivamApi.content.faqs(category);
    const faqs = data.faqs || [];
    if (!faqs.length) {
      $("#faqList").html('<div class="empty-state">No FAQs available for this category.</div>');
      return;
    }
    const html = faqs
      .map(
        (faq) => `
      <div class="faq-item reveal">
        <button class="faq-head">${faq.question}</button>
        <div class="faq-body">${faq.answer}</div>
      </div>`
      )
      .join("");
    $("#faqList").html(html);
    ShivamUI.initSupportAccordion();
    ShivamUI.observeRevealAnimations();
  } catch (error) {
    $("#faqList").html(`<div class="empty-state">${error.message}</div>`);
  }
}
