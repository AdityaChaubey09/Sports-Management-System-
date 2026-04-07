/**
 * Careers page script
 * -------------------
 * Displays dynamic job cards and submits application form.
 */
const CAREER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAREER_PHONE_REGEX = /^\d{10}$/;
const CAREER_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;
const CAREER_FALLBACK_BACKDROP_ID = "careerModalBackdrop";
const FORCE_CAREER_FALLBACK_MODAL = true;

function getCareerModalOffsetPx() {
  const header = document.querySelector(".site-header");
  if (!header) return 120;
  const headerRect = header.getBoundingClientRect();
  const headerBottom = Math.max(Math.round(headerRect.bottom), 0);
  return Math.max(headerBottom + 10, 24);
}

function syncCareerModalOffset() {
  document.documentElement.style.setProperty("--career-modal-offset", `${getCareerModalOffsetPx()}px`);
}

function setApplyError(fieldId, message) {
  $(`#${fieldId}`).addClass("is-invalid");
  $(`#${fieldId}Error`).text(message);
}

function clearApplyError(fieldId) {
  $(`#${fieldId}`).removeClass("is-invalid");
  $(`#${fieldId}Error`).text("");
}

function clearCareerFormErrors() {
  ["applyFullName", "applyEmail", "applyPhone", "applyAddress"].forEach(clearApplyError);
}

function showCareerAlert(message, tone = "success") {
  $("#jobApplyAlert").html(`<div class="alert alert-${tone} mb-0" role="alert">${message}</div>`);
}

function isBootstrapModalAvailable() {
  if (FORCE_CAREER_FALLBACK_MODAL) return false;
  return typeof bootstrap !== "undefined" && !!bootstrap?.Modal;
}

function resetCareerModalForm() {
  $("#jobApplyForm")[0].reset();
  clearCareerFormErrors();
  $("#jobApplyAlert").empty();
}

function openCareerApplyModal() {
  const modalEl = document.getElementById("jobApplyModal");
  if (!modalEl) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
  syncCareerModalOffset();
  if (isBootstrapModalAvailable()) {
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    return;
  }

  const $modal = $("#jobApplyModal");
  $("body").addClass("career-modal-open");
  $modal.addClass("show career-modal-fallback-open").attr("aria-hidden", "false").css("display", "block");

  if (!$(`#${CAREER_FALLBACK_BACKDROP_ID}`).length) {
    $("body").append(`<div id="${CAREER_FALLBACK_BACKDROP_ID}" class="career-modal-backdrop"></div>`);
  }

  $(`#${CAREER_FALLBACK_BACKDROP_ID}`)
    .off("click")
    .on("click", function onCareerFallbackBackdropClick() {
      closeCareerApplyModal();
    });

  modalEl.scrollTop = 0;
  modalEl.querySelector(".modal-body")?.scrollTo({ top: 0, behavior: "auto" });
}

function closeCareerApplyModal() {
  const modalEl = document.getElementById("jobApplyModal");
  if (!modalEl) return;
  if (isBootstrapModalAvailable()) {
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    return;
  }

  $("#jobApplyModal")
    .removeClass("show career-modal-fallback-open")
    .attr("aria-hidden", "true")
    .css("display", "none");
  $("body").removeClass("career-modal-open");
  $(`#${CAREER_FALLBACK_BACKDROP_ID}`).remove();
  resetCareerModalForm();
}

function validateCareerApplication() {
  clearCareerFormErrors();
  $("#jobApplyAlert").empty();

  const payload = {
    fullName: $("#applyFullName").val().trim(),
    email: $("#applyEmail").val().trim(),
    phone: $("#applyPhone").val().trim(),
    address: $("#applyAddress").val().trim(),
    resumeLink: $("#applyResumeLink").val().trim(),
    coverLetter: $("#applyCoverLetter").val().trim(),
  };

  let isValid = true;

  if (!payload.fullName) {
    setApplyError("applyFullName", "Please enter your full name.");
    isValid = false;
  } else if (!CAREER_NAME_REGEX.test(payload.fullName)) {
    setApplyError(
      "applyFullName",
      "Please enter a valid full name (letters, spaces, apostrophes, periods, and hyphens only)."
    );
    isValid = false;
  }

  if (!payload.email) {
    setApplyError("applyEmail", "Please enter your email address.");
    isValid = false;
  } else if (!CAREER_EMAIL_REGEX.test(payload.email)) {
    setApplyError("applyEmail", "Please enter a valid email address.");
    isValid = false;
  }

  if (!payload.phone) {
    setApplyError("applyPhone", "Please enter your phone number.");
    isValid = false;
  } else if (!CAREER_PHONE_REGEX.test(payload.phone)) {
    setApplyError("applyPhone", "Please enter a valid 10-digit phone number (numbers only).");
    isValid = false;
  }

  if (!payload.address) {
    setApplyError("applyAddress", "Please enter your current address.");
    isValid = false;
  }

  return isValid ? payload : null;
}

$(async function initCareersPage() {
  await ShivamUI.initLayout();
  syncCareerModalOffset();
  await loadJobs();

  $("#jobApplyForm").on("submit", async function onJobApply(event) {
    event.preventDefault();
    const jobId = $("#applyJobId").val();
    const payload = validateCareerApplication();
    if (!payload) {
      showCareerAlert("Please correct the highlighted fields and try again.", "danger");
      return;
    }

    try {
      await ShivamApi.careers.apply(jobId, payload);
      showCareerAlert("Form submitted successfully. Your application has been received.", "success");
      ShivamUI.showToast("Application submitted successfully", "success");
      setTimeout(() => {
        resetCareerModalForm();
        closeCareerApplyModal();
      }, 700);
    } catch (error) {
      showCareerAlert(error.message, "danger");
      ShivamUI.showToast(error.message, "error");
    }
  });

  $("#jobApplyForm").on("input change", "#applyFullName, #applyEmail, #applyPhone, #applyAddress", function onFieldInput() {
    clearApplyError(this.id);
  });

  if (!FORCE_CAREER_FALLBACK_MODAL) {
    $("#jobApplyModal").on("hidden.bs.modal", function onApplyModalHidden() {
      resetCareerModalForm();
    });
  }

  $("#jobApplyModal").on("click", "[data-bs-dismiss='modal']", function onModalDismissClick() {
    if (!isBootstrapModalAvailable()) {
      closeCareerApplyModal();
    }
  });

  $(document).on("keydown", function onCareerModalEscape(event) {
    if (event.key === "Escape" && $("#jobApplyModal").hasClass("career-modal-fallback-open")) {
      closeCareerApplyModal();
    }
  });

  $(window).on("resize scroll", function onCareerModalViewportChange() {
    if ($("#jobApplyModal").hasClass("career-modal-fallback-open")) {
      syncCareerModalOffset();
    }
  });
});

async function loadJobs() {
  $("#jobsGrid").html(`<div class="col-12"><div class="empty-state">Loading job posts...</div></div>`);
  try {
    const data = await ShivamApi.catalog.jobs();
    const jobs = data.jobs || [];
    if (!jobs.length) {
      $("#jobsGrid").html(`<div class="col-12"><div class="empty-state">No active openings found.</div></div>`);
      return;
    }

    const html = jobs
      .map(
        (job) => `
      <div class="col-lg-6 mb-4 reveal">
        <div class="card job-card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h4 class="mb-1">${job.title}</h4>
                <p class="small-muted mb-2">${job.department} | ${job.experienceText || "Experience as per role"}</p>
              </div>
              <span class="badge text-bg-dark">${job.contactEmail || "careers@shivam.com"}</span>
            </div>
            <p class="mb-2">${job.skillSummary}</p>
            <p class="small-muted mb-3">${job.details || ""}</p>
            <button class="btn btn-primary-brand btn-apply-job" data-job-id="${job._id}" data-job-title="${job.title}">
              Apply Now
            </button>
          </div>
        </div>
      </div>`
      )
      .join("");

    $("#jobsGrid").html(html);
    ShivamUI.setupRevealAnimations();

    $(".btn-apply-job").on("click", function onApply() {
      const jobId = $(this).data("job-id");
      const jobTitle = $(this).data("job-title");
      $("#applyJobId").val(jobId);
      $("#applyJobTitle").text(jobTitle);
      clearCareerFormErrors();
      $("#jobApplyAlert").empty();
      openCareerApplyModal();
    });
  } catch (error) {
    $("#jobsGrid").html(`<div class="col-12"><div class="empty-state">${error.message}</div></div>`);
  }
}
