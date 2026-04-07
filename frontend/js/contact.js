/**
 * Contact page script
 * -------------------
 * Simple validated contact form with map preview toggle interaction.
 */
const CONTACT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_PHONE_REGEX = /^\d{10}$/;

function setContactFieldError(fieldId, message) {
  $(`#${fieldId}`).addClass("is-invalid");
  $(`#${fieldId}Error`).text(message);
}

function clearContactFieldError(fieldId) {
  $(`#${fieldId}`).removeClass("is-invalid");
  $(`#${fieldId}Error`).text("");
}

function clearContactFormErrors() {
  ["contactName", "contactEmail", "contactPhone", "contactAddress", "contactMessage"].forEach(
    clearContactFieldError
  );
}

function showContactAlert(message, tone = "success") {
  $("#contactFormAlert").html(`<div class="alert alert-${tone}" role="alert">${message}</div>`);
}

function validateContactForm() {
  clearContactFormErrors();
  $("#contactFormAlert").empty();

  const payload = {
    name: $("#contactName").val().trim(),
    email: $("#contactEmail").val().trim(),
    phone: $("#contactPhone").val().trim(),
    address: $("#contactAddress").val().trim(),
    message: $("#contactMessage").val().trim(),
  };

  let isValid = true;

  if (!payload.name) {
    setContactFieldError("contactName", "Name is required.");
    isValid = false;
  }

  if (!payload.email) {
    setContactFieldError("contactEmail", "Email is required.");
    isValid = false;
  } else if (!CONTACT_EMAIL_REGEX.test(payload.email)) {
    setContactFieldError("contactEmail", "Please enter a valid email address.");
    isValid = false;
  }

  if (!payload.phone) {
    setContactFieldError("contactPhone", "Phone number is required.");
    isValid = false;
  } else if (!CONTACT_PHONE_REGEX.test(payload.phone)) {
    setContactFieldError("contactPhone", "Phone number must be exactly 10 digits.");
    isValid = false;
  }

  if (!payload.address) {
    setContactFieldError("contactAddress", "Address is required.");
    isValid = false;
  }

  if (!payload.message) {
    setContactFieldError("contactMessage", "Message is required.");
    isValid = false;
  }

  return isValid ? payload : null;
}

$(async function initContactPage() {
  await ShivamUI.initLayout();

  $("#contactForm").on("submit", function onContactSubmit(event) {
    event.preventDefault();
    const payload = validateContactForm();
    if (!payload) {
      showContactAlert("Please correct the highlighted fields and try again.", "danger");
      return;
    }

    showContactAlert("Form submitted successfully. We will contact you soon.", "success");
    ShivamUI.showToast("Message recorded. We will contact you soon.", "success");
    this.reset();
    clearContactFormErrors();
  });

  $("#btnMapToggle").on("click", function onMapToggle() {
    $("#mapPreview").slideToggle(250);
  });
});
