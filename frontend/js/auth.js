/**
 * Auth page script
 * ----------------
 * Manages login/register flows and role-based redirect logic.
 */
const REGISTER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_PHONE_REGEX = /^\d{10}$/;

function setRegisterFieldError(fieldId, message) {
  $(`#${fieldId}`).addClass("is-invalid");
  $(`#${fieldId}Error`).text(message);
}

function clearRegisterFieldError(fieldId) {
  $(`#${fieldId}`).removeClass("is-invalid");
  $(`#${fieldId}Error`).text("");
}

function clearRegisterErrors() {
  ["regEmail", "regPhone", "regAddress"].forEach(clearRegisterFieldError);
}

function showRegisterAlert(message, tone = "success") {
  $("#registerAlert").html(`<div class="alert alert-${tone} mb-0" role="alert">${message}</div>`);
}

function validateRegisterForm() {
  clearRegisterErrors();
  $("#registerAlert").empty();

  const payload = {
    name: $("#regName").val().trim(),
    email: $("#regEmail").val().trim(),
    phone: $("#regPhone").val().trim(),
    address: $("#regAddress").val().trim(),
    password: $("#regPassword").val(),
  };

  let isValid = true;

  if (!payload.email) {
    setRegisterFieldError("regEmail", "Email is required.");
    isValid = false;
  } else if (!REGISTER_EMAIL_REGEX.test(payload.email)) {
    setRegisterFieldError("regEmail", "Please enter a valid email address.");
    isValid = false;
  }

  if (!payload.phone) {
    setRegisterFieldError("regPhone", "Phone number is required.");
    isValid = false;
  } else if (!REGISTER_PHONE_REGEX.test(payload.phone)) {
    setRegisterFieldError("regPhone", "Phone number must be exactly 10 digits.");
    isValid = false;
  }

  if (!payload.address) {
    setRegisterFieldError("regAddress", "Address is required.");
    isValid = false;
  }

  if (!payload.password || payload.password.length < 6) {
    ShivamUI.showToast("Password must be at least 6 characters", "error");
    showRegisterAlert("Password must be at least 6 characters.", "danger");
    isValid = false;
  }

  if (!payload.name) {
    ShivamUI.showToast("Full name is required", "error");
    showRegisterAlert("Full name is required.", "danger");
    isValid = false;
  }

  return isValid ? payload : null;
}

$(async function initAuthPages() {
  await ShivamUI.initLayout();

  const user = ShivamApi.getUser();
  const page = window.location.pathname.split("/").pop();
  if (user && (page === "login.html" || page === "register.html")) {
    window.location.href = user.role === "admin" ? "admin.html" : "index.html";
    return;
  }

  $("#loginForm").on("submit", async function onLogin(event) {
    event.preventDefault();
    const payload = {
      email: $("#loginEmail").val().trim(),
      password: $("#loginPassword").val(),
    };
    try {
      const data = await ShivamApi.auth.login(payload);
      ShivamApi.setSession(data.token, data.user);
      ShivamUI.showToast("Login successful", "success");
      setTimeout(() => {
        window.location.href = data.user.role === "admin" ? "admin.html" : "index.html";
      }, 400);
    } catch (error) {
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#registerForm").on("submit", async function onRegister(event) {
    event.preventDefault();
    const payload = validateRegisterForm();
    if (!payload) {
      showRegisterAlert("Please correct the highlighted fields.", "danger");
      ShivamUI.showToast("Please correct the highlighted fields", "error");
      return;
    }
    try {
      const data = await ShivamApi.auth.register(payload);
      ShivamApi.setSession(data.token, data.user);
      showRegisterAlert("Form submitted successfully. Registration complete.", "success");
      ShivamUI.showToast("Registration successful", "success");
      clearRegisterErrors();
      setTimeout(() => {
        window.location.href = "index.html";
      }, 400);
    } catch (error) {
      showRegisterAlert(error.message, "danger");
      ShivamUI.showToast(error.message, "error");
    }
  });
});
