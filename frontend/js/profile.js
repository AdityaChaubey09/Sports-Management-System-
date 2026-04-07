/**
 * Profile page script
 * -------------------
 * Handles:
 * - profile fetch/update
 * - password change
 */
$(async function initProfilePage() {
  await ShivamUI.initLayout();
  const user = ShivamApi.getUser();
  if (!user) {
    $("#profileRoot").html(
      '<div class="empty-state">Please login to manage profile. <a href="login.html">Login</a></div>'
    );
    return;
  }
  await loadProfile();

  $("#profileForm").on("submit", async function onProfileSave(event) {
    event.preventDefault();
    await saveProfile();
  });
  $("#passwordForm").on("submit", async function onPasswordSave(event) {
    event.preventDefault();
    await savePassword();
  });
});

async function loadProfile() {
  try {
    const data = await ShivamApi.profile.get();
    const profile = data.profile;
    $("#proName").val(profile.name || "");
    $("#proEmail").val(profile.email || "");
    $("#proPhone").val(profile.phone || "");
    $("#proAvatar").val(profile.avatarUrl || "");
    $("#proBio").val(profile.bio || "");
    $("#proDob").val(profile.dateOfBirth || "");
    $("#proLine1").val(profile.defaultAddress?.line1 || "");
    $("#proLine2").val(profile.defaultAddress?.line2 || "");
    $("#proCity").val(profile.defaultAddress?.city || "");
    $("#proState").val(profile.defaultAddress?.state || "");
    $("#proPincode").val(profile.defaultAddress?.pincode || "");
    $("#proCountry").val(profile.defaultAddress?.country || "India");
    if (profile.avatarUrl) {
      $("#profileAvatarPreview").attr("src", profile.avatarUrl);
    }
  } catch (error) {
    $("#profileRoot").html(`<div class="empty-state">${error.message}</div>`);
  }
}

async function saveProfile() {
  const payload = {
    name: $("#proName").val().trim(),
    phone: $("#proPhone").val().trim(),
    avatarUrl: $("#proAvatar").val().trim(),
    bio: $("#proBio").val().trim(),
    dateOfBirth: $("#proDob").val().trim(),
    defaultAddress: {
      line1: $("#proLine1").val().trim(),
      line2: $("#proLine2").val().trim(),
      city: $("#proCity").val().trim(),
      state: $("#proState").val().trim(),
      pincode: $("#proPincode").val().trim(),
      country: $("#proCountry").val().trim() || "India",
    },
  };
  try {
    const data = await ShivamApi.profile.update(payload);
    const existing = ShivamApi.getUser();
    ShivamApi.setSession(ShivamApi.getToken(), { ...(existing || {}), name: data.profile.name });
    ShivamUI.showToast("Profile updated", "success");
    if (payload.avatarUrl) {
      $("#profileAvatarPreview").attr("src", payload.avatarUrl);
    }
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
  }
}

async function savePassword() {
  const payload = {
    currentPassword: $("#pwdCurrent").val(),
    newPassword: $("#pwdNew").val(),
  };
  if (!payload.currentPassword || !payload.newPassword) {
    ShivamUI.showToast("Both password fields are required", "error");
    return;
  }
  if (payload.newPassword.length < 6) {
    ShivamUI.showToast("New password should be minimum 6 characters", "error");
    return;
  }
  try {
    await ShivamApi.profile.updatePassword(payload);
    ShivamUI.showToast("Password updated", "success");
    $("#passwordForm")[0].reset();
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
  }
}
