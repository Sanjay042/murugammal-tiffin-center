// ---------------------------------------------
// CONFIG
// ---------------------------------------------
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";
// WhatsApp number with country code 91
const WHATSAPP_NUMBER = "919025959797";

// Your fixed menu (same prices you used)
const MENU = [
  {
    id: "idly",
    name: "Plain Idly (1 pc)",
    price: 2.5,
    desc: "Steamed rice cake with coconut & red chutney.",
    img: "images/idly1.jpg"
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    price: 8,
    desc: "Golden dosa with sambar & chutneys.",
    img: "images/dosa1.jpg"
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    price: 12,
    desc: "Caramelised onion topping, extra crunch.",
    img: "images/od.jpg"
  },
  {
    id: "full-boil",
    name: "Pepper Egg",
    price: 10,
    desc: "Boiled egg with pepper & salt.",
    img: "images/boil1.jpg"
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    price: 15,
    desc: "Two-egg omelette with onion & chilli.",
    img: "images/om123.jpg"
  },
  {
    id: "half-boil",
    name: "Half Boil",
    price: 10,
    desc: "Soft-boiled egg with pepper & salt.",
    img: "images/halfboil.jpg"
  },
  {
    id: "egg-dosa",
    name: "Egg Dosa",
    price: 15,
    desc: "Dosa with beaten egg layer.",
    img: "images/eggdosa1.jpg"
  }
];

// ---------------------------------------------
// STATE
// ---------------------------------------------
let cart = [];
let qrInstance = null;
let lastUpiUrl = "";

const el = {};

// ---------------------------------------------
// HELPERS
// ---------------------------------------------
const $ = (id) => document.getElementById(id);

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return Number.isInteger(num) ? `₹${num}` : `₹${num.toFixed(1)}`;
}

function notify(msg) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(el.toast._timer);
  el.toast._timer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2200);
}

function currentOrderType() {
  const r = document.querySelector('input[name="order-type"]:checked');
  return r ? r.value : "pickup";
}

function currentOrderMode() {
  const r = document.querySelector('input[name="order-mode"]:checked');
  return r ? r.value : "pay-now";
}

function calculateDeliveryCharge(distanceMeters) {
  const type = currentOrderType();
  if (type === "pickup") return 0;

  const d = Number(distanceMeters) || 0;
  if (d <= 100) return 10;
  if (d <= 250) return 20;
  if (d <= 500) return 30;
  if (d <= 1000) return 40;
  return 50;
}

function getTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const distance = Number(el.deliveryDistance?.value) || 0;
  const delivery = calculateDeliveryCharge(distance);
  const grand = subtotal + delivery;
  return { subtotal, delivery, grand, distance };
}

// ---------------------------------------------
// DOM CACHE + EVENTS
// ---------------------------------------------
function cacheDom() {
  el.menuGrid = $("menu-grid");
  el.cartTableBody = $("cart-table-body");
  el.cartCount = $("cart-count-pill");

  el.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  el.deliverySection = $("delivery-section");
  el.deliveryDistance = $("delivery-distance");
  el.deliveryAddress = $("delivery-address");

  el.customerName = $("customer-name");
  el.customerPhone = $("customer-phone");
  el.preorderTime = $("preorder-time");
  el.preorderNotes = $("preorder-notes");

  el.subtotalAmount = $("subtotal-amount");
  el.deliveryAmount = $("delivery-amount");
  el.grandAmount = $("grand-amount");

  el.orderModeRadios = document.querySelectorAll('input[name="order-mode"]');
  el.payNowPanel = $("pay-now-panel");
  el.preorderPanel = $("preorder-panel");

  el.qrCanvas = $("qr-canvas");
  el.qrNote = $("qr-note");
  el.generateQrBtn = $("generate-qr-btn");
  el.whatsappOrderBtn = $("whatsapp-order-btn");
  el.preorderWhatsappBtn = $("preorder-whatsapp-btn");

  el.upiApps = $("upi-apps");
  el.payGpayBtn = $("pay-gpay-btn");
  el.payPhonepeBtn = $("pay-phonepe-btn");
  el.payPaytmBtn = $("pay-paytm-btn");
  el.payAnyUpiBtn = $("pay-anyupi-btn");

  el.clearCartBtn = $("clear-cart-btn");
  el.printBillBtn = $("print-bill-btn");

  el.toast = $("toast");
}

function attachEvents() {
  // Menu add-to-cart
  el.menuGrid.addEventListener("click", onMenuClick);

  // Cart change / remove
  el.cartTableBody.addEventListener("input", onCartInput);
  el.cartTableBody.addEventListener("click", onCartClick);

  // Order type (pickup / delivery)
  el.orderTypeRadios.forEach((r) =>
    r.addEventListener("change", () => {
      syncOrderType();
      updateTotals();
    })
  );

  // Distance
  el.deliveryDistance.addEventListener("input", updateTotals);

  // Order mode (pay-now / preorder)
  el.orderModeRadios.forEach((r) =>
    r.addEventListener("change", syncOrderMode)
  );

  // QR / UPI
  el.generateQrBtn.addEventListener("click", handleGenerateQR);

  [el.payGpayBtn, el.payPhonepeBtn, el.payPaytmBtn, el.payAnyUpiBtn].forEach(
    (btn) => {
      if (btn) btn.addEventListener("click", openUpiApp);
    }
  );

  // WhatsApp order (for both pay-now & preorder)
  el.whatsappOrderBtn.addEventListener("click", () =>
    sendWhatsAppOrder("PAY_NOW")
  );
  el.preorderWhatsappBtn.addEventListener("click", () =>
    sendWhatsAppOrder("PREORDER")
  );

  // Cart actions
  el.clearCartBtn.addEventListener("click", clearCart);
  el.printBillBtn.addEventListener("click", printBill);
}

// ---------------------------------------------
// MENU RENDERING
// ---------------------------------------------
function renderMenu() {
  const html = MENU.map(
    (item) => `
      <article class="menu-card" data-id="${item.id}">
        <div class="menu-card__img-wrap">
          <img src="${item.img}" alt="${item.name}">
        </div>
        <div class="menu-card__body">
          <div class="menu-card__top">
            <h3>${item.name}</h3>
            <span class="menu-card__price">${formatCurrency(item.price)}</span>
          </div>
          <p class="menu-card__desc">${item.desc}</p>
          <button class="btn filled" data-action="add-to-cart">
            Add to cart
          </button>
        </div>
      </article>
    `
  ).join("");
  el.menuGrid.innerHTML = html;
}

function onMenuClick(e) {
  const btn = e.target.closest("[data-action='add-to-cart']");
  if (!btn) return;
  const card = btn.closest(".menu-card");
  const id = card?.dataset.id;
  const item = MENU.find((m) => m.id === id);
  if (!item) return;

  const existing = cart.find((c) => c.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...item, qty: 1 });

  updateCartUI();
  notify(`${item.name} added to cart.`);
}

// ---------------------------------------------
// CART MANAGEMENT
// ---------------------------------------------
function onCartInput(e) {
  if (!e.target.classList.contains("qty-input")) return;
  const row = e.target.closest("tr");
  const id = row?.dataset.id;
  const item = cart.find((c) => c.id === id);
  if (!item) return;

  const value = Math.max(1, Number(e.target.value) || 1);
  item.qty = value;
  updateCartUI();
}

function onCartClick(e) {
  const btn = e.target.closest("[data-action='remove']");
  if (!btn) return;
  const row = btn.closest("tr");
  const id = row?.dataset.id;
  cart = cart.filter((c) => c.id !== id);
  updateCartUI();
  notify("Item removed.");
}

function clearCart() {
  if (!cart.length) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear the entire cart?")) return;
  cart = [];
  updateCartUI();
}

function updateCartUI() {
  if (!cart.length) {
    el.cartTableBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
  } else {
    el.cartTableBody.innerHTML = cart
      .map(
        (item) => `
      <tr data-id="${item.id}">
        <td>${item.name}</td>
        <td class="num">
          <input type="number" class="qty-input" min="1" value="${item.qty}">
        </td>
        <td class="num">${formatCurrency(item.price)}</td>
        <td class="num">${formatCurrency(item.price * item.qty)}</td>
        <td class="num">
          <button class="btn ghost sm" data-action="remove">✕</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  const count = cart.reduce((s, i) => s + i.qty, 0);
  el.cartCount.textContent = count ? `${count} item${count > 1 ? "s" : ""}` : "0 items";

  updateTotals();
}

function updateTotals() {
  const { subtotal, delivery, grand } = getTotals();
  el.subtotalAmount.textContent = formatCurrency(subtotal);
  el.deliveryAmount.textContent = formatCurrency(delivery);
  el.grandAmount.textContent = formatCurrency(grand);
}

// ---------------------------------------------
// ORDER TYPE & MODE
// ---------------------------------------------
function syncOrderType() {
  const type = currentOrderType();
  el.deliverySection.style.display = type === "delivery" ? "block" : "none";
}

function syncOrderMode() {
  const mode = currentOrderMode();
  el.payNowPanel.style.display = mode === "pay-now" ? "block" : "none";
  el.preorderPanel.style.display = mode === "preorder" ? "block" : "none";
}

// ---------------------------------------------
// QR + UPI
// ---------------------------------------------
function handleGenerateQR() {
  if (!cart.length) {
    notify("Add at least one item to cart.");
    return;
  }
  const { grand } = getTotals();
  if (!grand) {
    notify("Amount is zero.");
    return;
  }

  const amountStr = grand.toFixed(2);
  const orderId = `MTC-${Date.now()}`;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${encodeURIComponent(
    amountStr
  )}&tn=${encodeURIComponent(orderId)}`;

  lastUpiUrl = upiUrl;

  if (qrInstance) {
    qrInstance.value = upiUrl;
  } else if (el.qrCanvas) {
    qrInstance = new QRious({
      element: el.qrCanvas,
      size: 200,
      value: upiUrl,
    });
  }

  el.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    grand
  )}. Ref: ${orderId}`;
  el.upiApps.style.display = "block";
  notify("QR generated. Now open your UPI app to pay.");
}

function openUpiApp() {
  if (!lastUpiUrl) {
    notify("Generate the QR first.");
    return;
  }
  // On mobile this will open GPay / PhonePe / Paytm etc
  window.location.href = lastUpiUrl;
}

// ---------------------------------------------
// WHATSAPP ORDER
// ---------------------------------------------
function sendWhatsAppOrder(source) {
  if (!cart.length) {
    notify("Add items to cart before sending.");
    return;
  }

  const totals = getTotals();
  const type = currentOrderType();
  const mode = currentOrderMode();

  const name = (el.customerName.value || "").trim() || "Not given";
  const phone = (el.customerPhone.value || "").trim() || "Not given";
  const time = (el.preorderTime.value || "").trim() || "Not specified";
  const notes = (el.preorderNotes.value || "").trim() || "None";

  const address =
    type === "delivery"
      ? (el.deliveryAddress.value || "").trim() || "Not given"
      : "Pickup at shop";

  const itemsText = cart
    .map(
      (item) =>
        `• ${item.name} × ${item.qty} = ${formatCurrency(
          item.price * item.qty
        )}`
    )
    .join("\n");

  const header =
    mode === "pay-now"
      ? "🧾 New *Online UPI Order*"
      : "🧾 New *Preorder (Pay later)*";

  const body = `${header}

👤 Name: ${name}
📞 Mobile: ${phone}

📦 Order type: ${type === "pickup" ? "Pickup at shop" : "Delivery"}
📍 Address: ${address}

🕒 Time: ${time}
📝 Notes: ${notes}

${itemsText}

Subtotal: ${formatCurrency(totals.subtotal)}
Delivery: ${formatCurrency(totals.delivery)}
Grand total: ${formatCurrency(totals.grand)}

Source: ${source === "PREORDER" ? "Preorder section" : "Pay-now section"}`;

  const waUrl =
    "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(body);

  window.open(waUrl, "_blank");
  notify("Opening WhatsApp with your order…");
}

// ---------------------------------------------
// PRINT BILL
// ---------------------------------------------
function printBill() {
  if (!cart.length) {
    notify("Nothing to print. Cart is empty.");
    return;
  }

  const totals = getTotals();
  const type = currentOrderType();
  const address =
    type === "delivery"
      ? (el.deliveryAddress.value || "").trim() || "Not given"
      : "Pickup at shop";

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
        <title>Murugammal Tiffin Center Bill</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 24px; }
          h1 { text-align: center; margin-bottom: 4px; }
          h2 { text-align: center; margin-top: 0; font-size: 1rem; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f2ea; }
          .totals { margin-top: 16px; width: 320px; float: right; }
          .totals td { border: none; }
        </style>
      </head>
      <body>
        <h1>முருகம்மாள் காலை உணவகம்</h1>
        <h2>Murugammal Tiffin Center</h2>
        <p>${new Date().toLocaleString()}</p>
        <p><strong>Order type:</strong> ${
          type === "pickup" ? "Pickup at shop" : "Delivery"
        }</p>
        <p><strong>Address:</strong> ${address}</p>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table class="totals">
          <tr><td>Subtotal:</td><td>${formatCurrency(totals.subtotal)}</td></tr>
          <tr><td>Delivery:</td><td>${formatCurrency(totals.delivery)}</td></tr>
          <tr><td><strong>Grand total:</strong></td><td><strong>${formatCurrency(
            totals.grand
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

// ---------------------------------------------
// INIT
// ---------------------------------------------
function init() {
  cacheDom();
  attachEvents();
  renderMenu();
  updateCartUI();
  syncOrderType();
  syncOrderMode();

  if (el.qrCanvas) {
    qrInstance = new QRious({
      element: el.qrCanvas,
      size: 200,
      value: ""
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
