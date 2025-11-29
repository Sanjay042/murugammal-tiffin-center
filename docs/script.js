// ============================================================================
// Murugammal Tiffin Center – Customer Ordering Page
// Menu → Cart → UPI QR → Pay with any UPI app (GPay / PhonePe / Paytm / etc.)
// ============================================================================

// ---------- CONFIG ----------
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";

// ---------- MENU DATA (you can edit prices/text here) ----------
const MENU_ITEMS = [
  {
    id: "idly",
    name: "Plain Idly (1 pc)",
    price: 2.5,
    description: "Steamed rice cakes with coconut & red chutney.",
    image: "images/idly1.jpg",
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    price: 8,
    description: "Golden dosa with sambar and chutneys.",
    image: "images/dosa1.jpg",
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    price: 12,
    description: "Dosa with caramelised onion topping.",
    image: "images/od.jpg",
  },
  {
    id: "full-boil",
    name: "Pepper Egg (Full Boil)",
    price: 10,
    description: "Boiled egg with pepper & salt.",
    image: "images/boil1.jpg",
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    price: 15,
    description: "Two-egg omelette with onion & herbs.",
    image: "images/om123.jpg",
  },
  {
    id: "half-boil",
    name: "Half Boil Egg",
    price: 10,
    description: "Soft-boiled egg with pepper & salt.",
    image: "images/halfboil.jpg",
  },
  {
    id: "egg-dosa",
    name: "Egg Dosa",
    price: 15,
    description: "Crispy dosa layered with beaten egg.",
    image: "images/eggdosa1.jpg",
  },
];

// ---------- STATE ----------
let cart = [];
let qrInstance = null;
let lastUpiUrl = "";

// ---------- DOM CACHE ----------
const el = {};

function cacheDom() {
  // Menu & cart
  el.menuGrid = document.getElementById("menu-grid");
  el.cartTableBody = document.getElementById("cart-table-body");
  el.cartCount = document.getElementById("cart-count-pill");

  // Order type (pickup / delivery)
  el.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  el.deliverySection = document.getElementById("delivery-section");
  el.deliveryDistance = document.getElementById("delivery-distance");
  el.deliveryAddress = document.getElementById("delivery-address");

  // Totals
  el.subtotalAmount = document.getElementById("subtotal-amount");
  el.deliveryAmount = document.getElementById("delivery-amount");
  el.grandAmount = document.getElementById("grand-amount");

  // Order mode (pay-now / preorder)
  el.orderModeRadios = document.querySelectorAll('input[name="order-mode"]');
  el.payNowPanel = document.getElementById("pay-now-panel");
  el.preorderPanel = document.getElementById("preorder-panel");

  // QR & payment
  el.qrCanvas = document.getElementById("qr-canvas");
  el.qrNote = document.getElementById("qr-note");
  el.generateQrBtn = document.getElementById("generate-qr-btn");
  el.paymentDoneBtn = document.getElementById("payment-done-btn");
  el.upiPayBtn = document.getElementById("upi-pay-btn");

  // New UPI app buttons
  el.upiAppsBox = document.getElementById("upi-apps");
  el.payGpayBtn = document.getElementById("pay-gpay-btn");
  el.payPhonePeBtn = document.getElementById("pay-phonepe-btn");
  el.payPaytmBtn = document.getElementById("pay-paytm-btn");
  el.payAnyUpiBtn = document.getElementById("pay-anyupi-btn");

  // Preorder form
  el.preorderForm = document.getElementById("preorder-form");
  el.preorderName = document.getElementById("preorder-name");
  el.preorderContact = document.getElementById("preorder-contact");
  el.preorderTime = document.getElementById("preorder-time");
  el.preorderNotes = document.getElementById("preorder-notes");

  // Cart actions
  el.clearCartBtn = document.getElementById("clear-cart-btn");
  el.printBillBtn = document.getElementById("print-bill-btn");

  // Toast
  el.toast = document.getElementById("toast");
}

// ---------- UTILITIES ----------
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return num % 1 === 0 ? `₹${num.toFixed(0)}` : `₹${num.toFixed(1)}`;
}

function notify(msg) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(el.toast._timeout);
  el.toast._timeout = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2200);
}

function getOrderType() {
  const checked = document.querySelector('input[name="order-type"]:checked');
  return checked ? checked.value : "pickup";
}

function getOrderMode() {
  const checked = document.querySelector('input[name="order-mode"]:checked');
  return checked ? checked.value : "pay-now";
}

// ---------- MENU RENDER ----------
function renderMenu() {
  if (!el.menuGrid) return;

  el.menuGrid.innerHTML = MENU_ITEMS.map(
    (item) => `
      <article class="menu-card">
        <img src="${item.image}" alt="${item.name}">
        <div class="content">
          <div class="meta">
            <strong>${item.name}</strong>
            <span>${formatCurrency(item.price)}</span>
          </div>
          <p>${item.description || ""}</p>
          <button class="btn filled" data-add-id="${item.id}">
            Add to cart
          </button>
        </div>
      </article>
    `
  ).join("");

  // Add-to-cart via event delegation
  el.menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-add-id");
    const item = MENU_ITEMS.find((m) => m.id === id);
    if (!item) return;
    addToCart(item);
  });
}

// ---------- CART ----------
function addToCart(menuItem) {
  const existing = cart.find((c) => c.id === menuItem.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      qty: 1,
    });
  }
  notify(`${menuItem.name} added to cart.`);
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  updateCartUI();
}

function updateCartQty(id, newQty) {
  const item = cart.find((c) => c.id === id);
  if (!item) return;
  const val = Math.max(1, Number(newQty) || 1);
  item.qty = val;
  updateCartUI();
}

function clearCart() {
  if (!cart.length) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear all items from the cart?")) return;
  cart = [];
  updateCartUI();
}

function updateCartUI() {
  if (!el.cartTableBody) return;

  if (!cart.length) {
    el.cartTableBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
  } else {
    el.cartTableBody.innerHTML = cart.map(
      (item) => `
        <tr data-id="${item.id}">
          <td>
            <strong>${item.name}</strong>
          </td>
          <td class="num">
            <input type="number" class="qty-input" min="1" value="${item.qty}">
          </td>
          <td class="num">${formatCurrency(item.price)}</td>
          <td class="num">${formatCurrency(item.price * item.qty)}</td>
          <td class="num">
            <button class="btn ghost sm" data-remove>Remove</button>
          </td>
        </tr>
      `
    ).join("");
  }

  // Cart count pill
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  if (el.cartCount) {
    el.cartCount.textContent = totalItems
      ? `${totalItems} item${totalItems > 1 ? "s" : ""}`
      : "0 items";
  }

  // Attach events for qty & remove
  el.cartTableBody.querySelectorAll(".qty-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const id = row.getAttribute("data-id");
      updateCartQty(id, e.target.value);
    });
  });

  el.cartTableBody.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest("tr");
      if (!row) return;
      const id = row.getAttribute("data-id");
      removeFromCart(id);
    });
  });

  updateTotals();
}

// ---------- TOTALS ----------
function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function calculateDelivery(distanceMeters) {
  if (getOrderType() === "pickup") return 0;
  const d = Number(distanceMeters) || 0;
  if (d <= 100) return 10;
  if (d <= 250) return 20;
  if (d <= 500) return 30;
  return 40;
}

function updateTotals() {
  const subtotal = calculateSubtotal();
  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const delivery = calculateDelivery(distance);
  const total = subtotal + delivery;

  if (el.subtotalAmount) el.subtotalAmount.textContent = formatCurrency(subtotal);
  if (el.deliveryAmount) el.deliveryAmount.textContent = formatCurrency(delivery);
  if (el.grandAmount) el.grandAmount.textContent = formatCurrency(total);
}

// ---------- ORDER TYPE & MODE ----------
function syncOrderType() {
  const type = getOrderType();
  if (el.deliverySection) {
    el.deliverySection.style.display = type === "delivery" ? "block" : "none";
  }
  updateTotals();
}

function syncOrderMode() {
  const mode = getOrderMode();
  if (el.payNowPanel) {
    el.payNowPanel.style.display = mode === "pay-now" ? "block" : "none";
  }
  if (el.preorderPanel) {
    el.preorderPanel.style.display = mode === "preorder" ? "block" : "none";
  }
}

// ---------- PAYMENT: QR + UPI ----------
function ensureCartNotEmpty() {
  if (!cart.length) {
    notify("Add at least one item to the cart.");
    return false;
  }
  return true;
}

function handleGenerateQR() {
  if (!ensureCartNotEmpty()) return;

  const totalText = el.grandAmount.textContent || "₹0";
  const amount = Number(totalText.replace("₹", "")) || 0;
  if (!amount) {
    notify("Amount is zero.");
    return;
  }

  const orderId = `MTC-${Date.now()}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(orderId)}`;

  lastUpiUrl = upiUrl;

  // QR code
  if (el.qrCanvas) {
    if (!qrInstance) {
      qrInstance = new QRious({
        element: el.qrCanvas,
        size: 200,
        value: upiUrl,
      });
    } else {
      qrInstance.value = upiUrl;
    }
  }

  if (el.qrNote) {
    el.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
      amount
    )}. Ref: ${orderId}`;
  }

  // Show UPI buttons
  if (el.upiPayBtn) el.upiPayBtn.style.display = "inline-flex";
  if (el.upiAppsBox) el.upiAppsBox.style.display = "block";

  notify("QR generated. Pay using any UPI app.");
}

function openUpiApp() {
  if (!lastUpiUrl) {
    notify("Generate the QR first.");
    return;
  }
  // This will open the UPI link in whatever UPI app is installed/default
  window.location.href = lastUpiUrl;
}

function handlePaymentDone() {
  if (!ensureCartNotEmpty()) return;

  const orderType = getOrderType();
  const totalText = el.grandAmount.textContent || "₹0";

  let summary = `✅ Payment Received!\n\n`;
  summary += `Order type: ${orderType === "pickup" ? "Pickup at shop" : "Delivery"}\n`;
  summary += `Amount: ${totalText}\n\nItems:\n`;

  cart.forEach((item) => {
    summary += `• ${item.name} × ${item.qty} = ${formatCurrency(
      item.price * item.qty
    )}\n`;
  });

  if (orderType === "delivery") {
    summary += `\nDelivery address: ${
      el.deliveryAddress?.value || "Not specified"
    }`;
  }

  alert(summary);
  cart = [];
  updateCartUI();
  notify("Order saved. Thank you!");
}

// ---------- PREORDER ----------
function handlePreorderSubmit(e) {
  e.preventDefault();
  if (!ensureCartNotEmpty()) return;

  const orderType = getOrderType();
  const subtotal = calculateSubtotal();
  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const delivery = calculateDelivery(distance);
  const total = subtotal + delivery;

  const details = {
    name: el.preorderName?.value || "",
    contact: el.preorderContact?.value || "",
    time: el.preorderTime?.value || "",
    notes: el.preorderNotes?.value || "",
  };

  let summary = `✅ Preorder Confirmed!\n\n`;
  summary += `Order type: ${orderType === "pickup" ? "Pickup at shop" : "Delivery"}\n`;
  summary += `Total amount (approx): ${formatCurrency(total)}\n\n`;
  summary += `Name: ${details.name || "-"}\n`;
  summary += `Contact: ${details.contact || "-"}\n`;
  summary += `Arrival time: ${details.time || "-"}\n`;
  summary += `Notes: ${details.notes || "-"}\n\n`;
  summary += `Items:\n`;

  cart.forEach((item) => {
    summary += `• ${item.name} × ${item.qty} = ${formatCurrency(
      item.price * item.qty
    )}\n`;
  });

  if (orderType === "delivery") {
    summary += `\nDelivery address: ${
      el.deliveryAddress?.value || "Not specified"
    }`;
  }

  alert(summary);
  cart = [];
  updateCartUI();
  e.target.reset();
  notify("Preorder saved. Pay at shop / on delivery.");
}

// ---------- PRINT BILL ----------
function printBill() {
  if (!ensureCartNotEmpty()) return;

  const orderType = getOrderType();
  const subtotal = calculateSubtotal();
  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const delivery = calculateDelivery(distance);
  const total = subtotal + delivery;

  const address =
    orderType === "delivery"
      ? el.deliveryAddress?.value || "Not specified"
      : "—";

  const rows = cart
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.price * item.qty)}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Murugammal Tiffin Center - Bill</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 24px; }
          h1 { text-align: center; margin-bottom: 4px; }
          h2 { text-align: center; margin-top: 0; font-weight: normal; font-size: 0.95rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f2ea; }
          .totals { margin-top: 16px; width: 260px; float: right; }
          .totals td { border: none; padding: 4px 0; }
        </style>
      </head>
      <body>
        <h1>Murugammal Tiffin Center</h1>
        <h2>Palacode · Since 2010</h2>
        <p>${new Date().toLocaleString()}</p>
        <p><strong>Order type:</strong> ${
          orderType === "pickup" ? "Pickup at shop" : "Delivery"
        }</p>
        <p><strong>Delivery address:</strong> ${address}</p>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <table class="totals">
          <tr><td>Subtotal:</td><td>${formatCurrency(subtotal)}</td></tr>
          <tr><td>Delivery:</td><td>${formatCurrency(delivery)}</td></tr>
          <tr><td><strong>Grand total:</strong></td><td><strong>${formatCurrency(
            total
          )}</strong></td></tr>
        </table>
      </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=800,height=600");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ---------- EVENT BINDING ----------
function attachEvents() {
  if (el.clearCartBtn) el.clearCartBtn.addEventListener("click", clearCart);
  if (el.printBillBtn) el.printBillBtn.addEventListener("click", printBill);

  el.orderTypeRadios.forEach((radio) =>
    radio.addEventListener("change", syncOrderType)
  );
  el.orderModeRadios.forEach((radio) =>
    radio.addEventListener("change", syncOrderMode)
  );

  if (el.deliveryDistance) {
    el.deliveryDistance.addEventListener("input", updateTotals);
  }

  if (el.generateQrBtn) {
    el.generateQrBtn.addEventListener("click", handleGenerateQR);
  }
  if (el.paymentDoneBtn) {
    el.paymentDoneBtn.addEventListener("click", handlePaymentDone);
  }

  if (el.upiPayBtn) el.upiPayBtn.addEventListener("click", openUpiApp);
  if (el.payGpayBtn) el.payGpayBtn.addEventListener("click", openUpiApp);
  if (el.payPhonePeBtn) el.payPhonePeBtn.addEventListener("click", openUpiApp);
  if (el.payPaytmBtn) el.payPaytmBtn.addEventListener("click", openUpiApp);
  if (el.payAnyUpiBtn) el.payAnyUpiBtn.addEventListener("click", openUpiApp);

  if (el.preorderForm) {
    el.preorderForm.addEventListener("submit", handlePreorderSubmit);
  }
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  renderMenu();
  attachEvents();
  syncOrderType();
  syncOrderMode();
  updateCartUI();
});
