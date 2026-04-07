/**
 * Checkout page script
 * --------------------
 * Collects shipping details and supports:
 * - Razorpay online payment
 * - Cash on Delivery (offline)
 * - Gift payment code amount redemption
 */
let checkoutCart = null;
const checkoutState = {
  subtotal: 0,
  paymentMethod: "razorpay",
  appliedGiftCode: null,
};
const CHECKOUT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECKOUT_PHONE_REGEX = /^\d{10}$/;

$(async function initCheckoutPage() {
  await ShivamUI.initLayout();
  const user = ShivamApi.getUser();
  if (!user) {
    $("#checkoutView").html(`
      <div class="empty-state">
        <h5>Please login to continue checkout</h5>
        <a href="login.html" class="btn btn-primary-brand mt-2">Login</a>
      </div>
    `);
    return;
  }

  await loadCheckoutSummary();
  bindCheckoutEvents();
});

function bindCheckoutEvents() {
  $("#checkoutForm").on("submit", async function onCheckout(event) {
    event.preventDefault();
    await placeOrderAndPay();
  });

  $("input[name='paymentMethod']").on("change", function onPaymentMethodChange() {
    checkoutState.paymentMethod = String($(this).val() || "razorpay").toLowerCase();
    renderCheckoutTotals();
  });

  $("#btnApplyGiftCode").on("click", async function onApplyGiftCodeClick() {
    await applyGiftCode();
  });

  $("#btnClearGiftCode").on("click", function onClearGiftCodeClick() {
    clearGiftCode("Gift code removed.");
  });

  $("#giftCodeInput").on("keydown", async function onGiftCodeEnter(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      await applyGiftCode();
    }
  });

  $("#giftCodeInput").on("input", function onGiftCodeInput() {
    const typed = String($(this).val() || "")
      .trim()
      .toUpperCase();
    if (checkoutState.appliedGiftCode && typed !== checkoutState.appliedGiftCode.code) {
      checkoutState.appliedGiftCode = null;
      setGiftCodeStatus("Code changed. Click Apply to re-check balance.", "info");
      renderCheckoutTotals();
    }
  });
}

async function loadCheckoutSummary() {
  try {
    const data = await ShivamApi.cart.get();
    checkoutCart = data.cart;
    const items = checkoutCart?.items || [];
    if (!items.length) {
      $("#checkoutView").html(`
        <div class="empty-state">
          <h5>Your cart is empty</h5>
          <a href="products.html" class="btn btn-primary-brand mt-2">Go to Products</a>
        </div>
      `);
      return;
    }

    const lines = items
      .map((item) => {
        const product = item.productId || {};
        return `<li class="list-group-item d-flex justify-content-between align-items-center">
          <span>${product.name || "Product"} x ${item.qty}</span>
          <strong>&#8377;${Number(item.qty * item.unitPrice).toLocaleString("en-IN")}</strong>
        </li>`;
      })
      .join("");

    const subtotal = data.totals?.subtotal || 0;
    checkoutState.subtotal = Number(subtotal);
    $("#checkoutItems").html(lines);
    renderCheckoutTotals();
    setGiftCodeStatus("Optional: apply gift code if you have one.", "info");
  } catch (error) {
    $("#checkoutView").html(`<div class="empty-state">${error.message}</div>`);
  }
}

function renderCheckoutTotals() {
  const subtotal = Math.max(Number(checkoutState.subtotal || 0), 0);
  const discount = Math.max(Number(checkoutState.appliedGiftCode?.applicableAmount || 0), 0);
  const payable = Math.max(subtotal - discount, 0);
  const paymentMethod = getSelectedPaymentMethod();

  $("#checkoutSubtotal").html(`&#8377;${subtotal.toLocaleString("en-IN")}`);
  $("#checkoutTotal").html(`&#8377;${payable.toLocaleString("en-IN")}`);

  if (discount > 0) {
    $("#checkoutGiftRow").removeClass("d-none");
    $("#checkoutGiftDiscount").html(`- &#8377;${discount.toLocaleString("en-IN")}`);
  } else {
    $("#checkoutGiftRow").addClass("d-none");
    $("#checkoutGiftDiscount").html("- &#8377;0");
  }

  let hint = "Select payment method to continue.";
  if (payable <= 0) {
    hint = "Gift code fully covers this order. No online payment required.";
  } else if (paymentMethod === "cod") {
    hint = "Cash on Delivery selected. You can place this order now and pay offline.";
  } else {
    hint = "Online payment will open after you place the order.";
  }
  $("#checkoutPaymentHint").text(hint);
}

function setGiftCodeStatus(message, tone = "info") {
  const statusEl = $("#giftCodeStatus");
  const classMap = {
    success: "text-success",
    error: "text-danger",
    info: "text-muted",
  };
  statusEl
    .removeClass("text-success text-danger text-muted")
    .addClass(classMap[tone] || "text-muted")
    .text(message);
}

function getGiftCodeInputValue() {
  return String($("#giftCodeInput").val() || "")
    .trim()
    .toUpperCase();
}

function getSelectedPaymentMethod() {
  const selected = String($("input[name='paymentMethod']:checked").val() || "").toLowerCase();
  if (selected === "cod" || selected === "razorpay") {
    checkoutState.paymentMethod = selected;
    return selected;
  }
  return checkoutState.paymentMethod || "razorpay";
}

async function applyGiftCode(options = {}) {
  const quiet = Boolean(options.quiet);
  const code = String(options.codeOverride || getGiftCodeInputValue())
    .trim()
    .toUpperCase();
  if (!code) {
    if (!quiet) ShivamUI.showToast("Enter a gift code first", "error");
    return false;
  }

  if (Number(checkoutState.subtotal || 0) <= 0) {
    if (!quiet) ShivamUI.showToast("Cart subtotal must be greater than zero", "error");
    return false;
  }

  const applyBtn = $("#btnApplyGiftCode");
  applyBtn.prop("disabled", true).text("Applying...");
  try {
    const preview = await ShivamApi.payments.previewGiftCode({
      code,
      subtotal: checkoutState.subtotal,
    });
    checkoutState.appliedGiftCode = {
      code: preview.code || code,
      title: preview.title || "",
      applicableAmount: Number(preview.applicableAmount || 0),
      payableAmount: Number(preview.payableAmount || 0),
      remainingAmount: Number(preview.remainingAmount || 0),
    };
    $("#giftCodeInput").val(checkoutState.appliedGiftCode.code);

    const label = checkoutState.appliedGiftCode.title
      ? `${checkoutState.appliedGiftCode.code} (${checkoutState.appliedGiftCode.title})`
      : checkoutState.appliedGiftCode.code;
    setGiftCodeStatus(
      `Applied ${label}. Discount: ₹${checkoutState.appliedGiftCode.applicableAmount.toLocaleString(
        "en-IN"
      )}`,
      "success"
    );
    renderCheckoutTotals();
    if (!quiet) ShivamUI.showToast("Gift code applied successfully", "success");
    return true;
  } catch (error) {
    setGiftCodeStatus(error.message, "error");
    if (!quiet) ShivamUI.showToast(error.message, "error");
    return false;
  } finally {
    applyBtn.prop("disabled", false).text("Apply");
  }
}

function clearGiftCode(message = "") {
  checkoutState.appliedGiftCode = null;
  $("#giftCodeInput").val("");
  setGiftCodeStatus(message || "Gift code cleared.", "info");
  renderCheckoutTotals();
}

function collectShippingAddress() {
  return {
    fullName: $("#shipFullName").val().trim(),
    email: $("#shipEmail").val().trim(),
    phone: $("#shipPhone").val().trim(),
    line1: $("#shipLine1").val().trim(),
    line2: $("#shipLine2").val().trim(),
    city: $("#shipCity").val().trim(),
    state: $("#shipState").val().trim(),
    pincode: $("#shipPincode").val().trim(),
    country: $("#shipCountry").val().trim() || "India",
  };
}

function setCheckoutFieldError(fieldId, message) {
  const field = $(`#${fieldId}`);
  field.addClass("is-invalid");
  const feedback = $(`#${fieldId}Error`);
  if (feedback.length) {
    feedback.text(message);
  }
}

function clearCheckoutFieldError(fieldId) {
  const field = $(`#${fieldId}`);
  field.removeClass("is-invalid");
  const feedback = $(`#${fieldId}Error`);
  if (feedback.length) {
    feedback.text("");
  }
}

function clearCheckoutValidationErrors() {
  [
    "shipFullName",
    "shipEmail",
    "shipPhone",
    "shipLine1",
    "shipCity",
    "shipState",
    "shipPincode",
    "shipCountry",
  ].forEach(clearCheckoutFieldError);
}

function validateShipping(shippingAddress) {
  clearCheckoutValidationErrors();

  let isValid = true;

  if (!shippingAddress.fullName) {
    setCheckoutFieldError("shipFullName", "Full name is required.");
    isValid = false;
  }

  if (!shippingAddress.email) {
    setCheckoutFieldError("shipEmail", "Email is required.");
    isValid = false;
  } else if (!CHECKOUT_EMAIL_REGEX.test(shippingAddress.email)) {
    setCheckoutFieldError("shipEmail", "Please enter a valid email address.");
    isValid = false;
  }

  if (!shippingAddress.phone) {
    setCheckoutFieldError("shipPhone", "Phone number is required.");
    isValid = false;
  } else if (!CHECKOUT_PHONE_REGEX.test(shippingAddress.phone)) {
    setCheckoutFieldError("shipPhone", "Phone number must be exactly 10 digits.");
    isValid = false;
  }

  if (!shippingAddress.line1) {
    setCheckoutFieldError("shipLine1", "Address is required.");
    isValid = false;
  }
  if (!shippingAddress.city) {
    setCheckoutFieldError("shipCity", "City is required.");
    isValid = false;
  }
  if (!shippingAddress.state) {
    setCheckoutFieldError("shipState", "State is required.");
    isValid = false;
  }
  if (!shippingAddress.pincode) {
    setCheckoutFieldError("shipPincode", "Pincode is required.");
    isValid = false;
  }
  if (!shippingAddress.country) {
    setCheckoutFieldError("shipCountry", "Country is required.");
    isValid = false;
  }

  return isValid;
}

async function placeOrderAndPay() {
  const shippingAddress = collectShippingAddress();
  if (!validateShipping(shippingAddress)) {
    ShivamUI.showToast("Please correct the highlighted shipping fields", "error");
    return;
  }

  const paymentMethod = getSelectedPaymentMethod();
  const submitButton = $("#checkoutForm button[type='submit']");
  submitButton.prop("disabled", true).text("Processing...");

  try {
    const enteredGiftCode = getGiftCodeInputValue();
    const appliedGiftCode = checkoutState.appliedGiftCode?.code || "";
    let finalGiftCode = appliedGiftCode;

    if (enteredGiftCode && enteredGiftCode !== appliedGiftCode) {
      const isApplied = await applyGiftCode({ quiet: true, codeOverride: enteredGiftCode });
      if (!isApplied) {
        ShivamUI.showToast("Gift card code is invalid or unavailable. Please check and try again.", "error");
        return;
      }
      finalGiftCode = checkoutState.appliedGiftCode?.code || enteredGiftCode;
    } else if (!enteredGiftCode && appliedGiftCode) {
      finalGiftCode = appliedGiftCode;
    } else if (enteredGiftCode && appliedGiftCode === enteredGiftCode) {
      finalGiftCode = enteredGiftCode;
    }

    const orderResponse = await ShivamApi.orders.create({
      shippingAddress,
      paymentMethod,
      paymentCode: finalGiftCode,
    });
    const order = orderResponse.order;
    const paymentSummary = orderResponse.paymentSummary || {};
    const requiresOnlinePayment =
      typeof paymentSummary.requiresOnlinePayment === "boolean"
        ? paymentSummary.requiresOnlinePayment
        : paymentMethod === "razorpay" &&
          Number(order.total || 0) > 0 &&
          order.payment?.paymentStatus !== "paid";

    await ShivamUI.updateCartBadge();

    if (requiresOnlinePayment) {
      ShivamUI.showToast("Order created. Initializing online payment...", "success");
      await initiateRazorpayPayment(order);
      return;
    }

    const paidByGift = paymentSummary.isFullyPaid || order.payment?.paymentStatus === "paid";
    if (paidByGift) {
      ShivamUI.showToast("Order placed and fully paid using gift balance", "success");
      renderCheckoutNotice(
        "success",
        "Order placed successfully. Gift balance fully covered your payment. You can track this order in My Orders."
      );
    } else {
      ShivamUI.showToast("Order placed with Cash on Delivery", "success");
      renderCheckoutNotice(
        "success",
        "Order placed successfully with Cash on Delivery. You can pay offline when the order arrives."
      );
    }

    setTimeout(() => {
      window.location.href = "orders.html";
    }, 1200);
  } catch (error) {
    ShivamUI.showToast(error.message, "error");
    renderCheckoutNotice("error", error.message);
  } finally {
    submitButton.prop("disabled", false).text("Place Order");
  }
}

async function initiateRazorpayPayment(order) {
  try {
    const payData = await ShivamApi.payments.createRazorpayOrder({ orderId: order._id });
    if (!window.Razorpay) {
      throw new Error("Razorpay SDK not loaded in browser");
    }

    const options = {
      key: payData.keyId,
      amount: payData.razorpayOrder.amount,
      currency: payData.razorpayOrder.currency,
      name: "Shivam Sports",
      description: `Order #${order._id}`,
      order_id: payData.razorpayOrder.id,
      handler: async function onPaymentSuccess(response) {
        try {
          await ShivamApi.payments.verifyRazorpay({
            orderId: order._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          ShivamUI.showToast("Payment successful and verified", "success");
          await ShivamUI.updateCartBadge();
          setTimeout(() => {
            window.location.href = "orders.html";
          }, 1200);
        } catch (error) {
          ShivamUI.showToast(`Payment verification failed: ${error.message}`, "error");
        }
      },
      prefill: {
        name: order.shippingAddress.fullName,
        email: order.shippingAddress.email,
        contact: order.shippingAddress.phone,
      },
      theme: {
        color: "#06172d",
      },
    };

    const razorpay = new Razorpay(options);
    razorpay.open();
  } catch (error) {
    renderCheckoutNotice(
      "warning",
      `${error.message} Your order is created in pending state. You can retry payment later from order support.`
    );
  }
}

function renderCheckoutNotice(tone, message) {
  const alertClass =
    tone === "success" ? "alert-success" : tone === "warning" ? "alert-warning" : "alert-danger";
  const title = tone === "success" ? "Order Updated" : tone === "warning" ? "Payment Pending" : "Action Needed";
  $("#checkoutNotice").html(`
    <div class="alert ${alertClass} checkout-notice" role="alert">
      <h6 class="alert-heading mb-1">${title}</h6>
      <div>${message}</div>
      <div class="mt-2">
        <a href="orders.html" class="btn btn-sm btn-outline-dark">Open My Orders</a>
      </div>
    </div>
  `);
}
