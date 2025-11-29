// ============================================================================
// MURUGAMMAL TIFFIN CENTER · Order Management System
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────

const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";
const ADMIN_PASSWORD = "63695599";

// ─────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────

let cart = [];
let qrInstance;
let lastUpiUrl = "";

// ─────────────────────────────────────────────────────────────────────────
// DOM CACHE
// ─────────────────────────────────────────────────────────────────────────

const elements = {};

function cacheDom() {
  // Menu & Cart
  elements.menuGrid = document.getElementById("menu-grid");
  elements.cartTableBody = document.getElementById("cart-table-body");
  elements.cartCountPill = document.getElementById("cart-count-pill");
  elements.clearCartBtn = document.getElementById("clear-cart-btn");
  elements.printBillBtn = document.getElementById("print-bill-btn");

  // Order Type
  elements.orderTypeRadios = document.querySelectorAll(
    'input[name="order-type"]'
  );
  elements.deliverySection = document.getElementById("delivery-section");
  elements.deliveryDistance = document.getElementById("delivery-distance");
  elements.deliveryAddress = document.getElementById("delivery-address");

  // Totals
  elements.subtotalAmount = document.getElementById("subtotal-amount");
  elements.deliveryAmount = document.getElementById("delivery-amount");
  elements.grandAmount = document.getElementById("grand-amount");

  // Order Mode
  elements.orderModeRadios = document.querySelectorAll(
    'input[name="order-mode"]'
  );
  elements.payNowPanel = document.getElementById("pay-now-panel");
  elements.preorderPanel = document.getElementById("preorder-panel");

  // Payment
  elements.qrCanvas = document.getElementById("qr-canvas");
  elements.qrNote = document.getElementById("qr-note");
  elements.generateQrBtn = document.getElementById("generate-qr-btn");
  elements.paymentDoneBtn = document.getElementById("payment-done-btn");
  elements.upiPayBtn = document.getElementById("upi-pay-btn");

  // Preorder Form
  elements.preorderForm = document.getElementById("preorder-form");
  elements.preorderName = document.getElementById("preorder-name");
  elements.preorderContact = document.getElementById("preorder-contact");
  elements.preorderTime = document.getElementById("preorder-time");
  elements.preorderNotes = document.getElementById("preorder-notes");

  // Toast
  elements.toast = document.getElementById("toast");

  // Admin (may not exist on customer page)
  elements.adminLoginBtn = document.getElementById("admin-login-btn");
  elements.adminLogoutBtn = document.getElementById("admin-logout-btn");
  elements.adminPasswordInput = document.getElementById("admin-password-input");
  elements.adminArea = document.getElementById("admin-area");
  elements.menuForm = document.getElementById("menu-form");
  elements.menuCancelBtn = document.getElementById("menu-cancel-btn");
  elements.reportsArea = document.getElementById("reports-area");
  elements.refreshReportBtn = document.getElementById("refresh-report-btn");
  elements.printReportBtn = document.getElementById("print-report-btn");
}

// ─────────────────────────────────────────────────────────────────────────
// EVENT ATTACHMENT
// ─────────────────────────────────────────────────────────────────────────

function attachEvents() {
  // Order Type
  elements.orderTypeRadios.forEach((radio) => {
    radio.addEventListener("change", handleOrderTypeChange);
  });

  // Delivery Distance
  elements.deliveryDistance.addEventListener("change", updateTotals);

  // Totals
  elements.deliveryDistance.addEventListener("input", updateTotals);

  // Order Mode
  elements.orderModeRadios.forEach((radio) => {
    radio.addEventListener("change", handleOrderModeChange);
  });

  // Cart Actions
  elements.clearCartBtn.addEventListener("click", clearCart);
  elements.printBillBtn.addEventListener("click", printBill);

  // Payment
  elements.generateQrBtn.addEventListener("click", handleGenerateQR);
  elements.paymentDoneBtn.addEventListener("click", handlePaymentDone);

  // UPI pay button (only exists on customer page)
  if (elements.upiPayBtn) {
    elements.upiPayBtn.addEventListener("click", handleUpiPay);
  }

  // Preorder Form
  elements.preorderForm.addEventListener("submit", handlePreorderSubmit);

  // Admin events only if admin page is loaded
  if (elements.adminLoginBtn) {
    elements.adminLoginBtn.addEventListener("click", unlockAdmin);
  }
  if (elements.adminLogoutBtn) {
    elements.adminLogoutBtn.addEventListener("click", lockAdmin);
  }
  if (elements.menuForm) {
    elements.menuForm.addEventListener("submit", handleMenuSubmit);
    elements.menuCancelBtn.addEventListener("click", resetMenuForm);
  }
  if (elements.refreshReportBtn) {
    elements.refreshReportBtn.addEventListener("click", renderReports);
  }
  if (elements.printReportBtn) {
    elements.printReportBtn.addEventListener("click", printReport);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MENU RENDERING
// ─────────────────────────────────────────────────────────────────────────

function renderMenu() {
  const menu = getMenuFromStorage();
  elements.menuGrid.innerHTML = "";

  menu.forEach((dish) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.onclick = () => addToCart(dish);
    card.innerHTML = `
      <div class="menu-card__image" style="background-color: ${dish.color}; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 2.5rem;">${dish.emoji}</span>
      </div>
      <div class="menu-card__text">
        <h3>${dish.name}</h3>
        <p class="menu-card__price">${formatCurrency(dish.price)}</p>
      </div>
    `;
    elements.menuGrid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// CART MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────

function addToCart(dish) {
  const existing = cart.find((item) => item.id === dish.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...dish, qty: 1 });
  }
  updateCartUI();
}

function removeFromCart(dishId) {
  cart = cart.filter((item) => item.id !== dishId);
  updateCartUI();
}

function updateCartQuantity(dishId, newQty) {
  if (newQty <= 0) {
    removeFromCart(dishId);
    return;
  }
  const item = cart.find((i) => i.id === dishId);
  if (item) {
    item.qty = newQty;
  }
  updateCartUI();
}

function clearCart() {
  if (cart.length === 0) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear the entire cart?")) return;
  cart = [];
  updateCartUI();
}

function updateCartUI() {
  // Render table
  if (cart.length === 0) {
    elements.cartTableBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
  } else {
    elements.cartTableBody.innerHTML = cart
      .map(
        (item) => `
        <tr>
          <td>${item.name}</td>
          <td class="num">
            <input type="number" min="1" value="${item.qty}" 
              onchange="updateCartQuantity('${item.id}', parseInt(this.value))">
          </td>
          <td class="num">${formatCurrency(item.price)}</td>
          <td class="num">${formatCurrency(item.price * item.qty)}</td>
          <td>
            <button class="btn ghost small" onclick="removeFromCart('${item.id}')">✕</button>
          </td>
        </tr>
      `
      )
      .join("");
  }

  // Update count pill
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  elements.cartCountPill.textContent =
    totalItems === 1 ? "1 item" : `${totalItems} items`;

  updateTotals();
}

function updateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const distance = parseInt(elements.deliveryDistance.value) || 0;
  const delivery = calculateDeliveryCharge(distance);
  const grand = subtotal + delivery;

  elements.subtotalAmount.textContent = formatCurrency(subtotal);
  elements.deliveryAmount.textContent = formatCurrency(delivery);
  elements.grandAmount.textContent = formatCurrency(grand);
}

function calculateDeliveryCharge(distanceMeters) {
  if (getSelectedOrderType() === "pickup") {
    return 0;
  }
  if (distanceMeters <= 100) {
    return 10;
  }
  if (distanceMeters <= 250) {
    return 20;
  }
  if (distanceMeters <= 500) {
    return 30;
  }
  return 40;
}

// ─────────────────────────────────────────────────────────────────────────
// ORDER TYPE & MODE
// ─────────────────────────────────────────────────────────────────────────

function handleOrderTypeChange() {
  const type = getSelectedOrderType();
  if (type === "delivery") {
    elements.deliverySection.style.display = "block";
  } else {
    elements.deliverySection.style.display = "none";
  }
  updateTotals();
}

function getSelectedOrderType() {
  const checked = document.querySelector(
    'input[name="order-type"]:checked'
  );
  return checked ? checked.value : "pickup";
}

function handleOrderModeChange() {
  const mode = getSelectedOrderMode();
  if (mode === "pay-now") {
    elements.payNowPanel.style.display = "block";
    elements.preorderPanel.style.display = "none";
  } else {
    elements.payNowPanel.style.display = "none";
    elements.preorderPanel.style.display = "block";
  }
}

function getSelectedOrderMode() {
  const checked = document.querySelector('input[name="order-mode"]:checked');
  return checked ? checked.value : "pay-now";
}

// ─────────────────────────────────────────────────────────────────────────
// PAYMENT: QR & UPI
// ─────────────────────────────────────────────────────────────────────────

function handleGenerateQR() {
  if (cart.length === 0) {
    notify("Your cart is empty. Add items first.");
    return;
  }

  const amount = parseFloat(elements.grandAmount.textContent.replace("₹", ""));
  const orderId = `MTF-${Date.now()}`;

  const upiString = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(orderId)}`;

  lastUpiUrl = upiString;

  if (elements.upiPayBtn) {
    elements.upiPayBtn.style.display = "inline-flex";
  }

  qrInstance.value = upiString;
  elements.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    amount
  )}. Reference: ${orderId}`;
  notify("QR code ready. Please complete payment.");
}

function handleUpiPay() {
  if (!lastUpiUrl) {
    notify("Please generate the QR first.");
    return;
  }
  // This will open UPI apps (GPay, PhonePe, etc.) on mobile
  window.location.href = lastUpiUrl;
}

function handlePaymentDone() {
  if (cart.length === 0) {
    notify("Your cart is empty.");
    return;
  }

  const orderType = getSelectedOrderType();
  const amount = elements.grandAmount.textContent;
  const orderId = `MTF-${Date.now()}`;

  let summary = `✅ Payment Received!

Order ID: ${orderId}
Type: ${
    orderType === "pickup" ? "Pickup" : "Delivery"
  }
Amount: ${amount}`;

  if (orderType === "delivery") {
    summary += `
Delivery to: ${elements.deliveryAddress.value || "Not specified"}`;
  }

  summary += `

Items:
${cart
    .map((item) => `  • ${item.name} × ${item.qty} = ${formatCurrency(item.price * item.qty)}`)
    .join("
")}`;

  alert(summary);
  saveOrderToStorage({
    id: orderId,
    type: orderType,
    amount,
    items: cart,
    timestamp: new Date().toISOString(),
  });

  cart = [];
  updateCartUI();
  notify("Order saved. Thank you!");
}

// ─────────────────────────────────────────────────────────────────────────
// PREORDER SUBMISSION
// ─────────────────────────────────────────────────────────────────────────

function handlePreorderSubmit(e) {
  e.preventDefault();

  if (cart.length === 0) {
    notify("Your cart is empty.");
    return;
  }

  const name = elements.preorderName.value.trim();
  const contact = elements.preorderContact.value.trim();
  const time = elements.preorderTime.value;
  const notes = elements.preorderNotes.value.trim();

  if (!contact) {
    notify("Please provide a contact number.");
    return;
  }

  if (!time) {
    notify("Please select a pickup/delivery time.");
    return;
  }

  const orderId = `MTF-PRE-${Date.now()}`;
  const amount = elements.grandAmount.textContent;
  const orderType = getSelectedOrderType();

  const preorder = {
    id: orderId,
    name: name || "Guest",
    contact,
    time,
    notes,
    type: orderType,
    amount,
    items: [...cart],
    timestamp: new Date().toISOString(),
  };

  savePreorderToStorage(preorder);

  let confirmMsg = `✅ Preorder Confirmed!

Order ID: ${orderId}
Name: ${preorder.name}
Contact: ${contact}
Pickup Time: ${time}
Amount to pay: ${amount}`;

  if (orderType === "delivery") {
    confirmMsg += `
Delivery to: ${elements.deliveryAddress.value || "Address to be confirmed"}`;
  }
