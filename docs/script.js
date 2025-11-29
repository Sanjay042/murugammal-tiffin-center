// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";

// Hard-coded menu for now (you can change prices anytime)
const MENU = [
  {
    id: "idly",
    name: "Plain Idly (1 piece)",
    price: 2.5,
    description: "Steamed rice cakes with coconut & red chutney.",
    image: "images/idly1.jpg",
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    price: 8,
    description: "Crispy dosa with sambar & chutneys.",
    image: "images/dosa1.jpg",
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    price: 12,
    description: "Dosa topped with caramelized onions.",
    image: "images/od.jpg",
  },
  {
    id: "pepper-egg",
    name: "Pepper Egg",
    price: 10,
    description: "Boiled egg with pepper & salt.",
    image: "images/boil1.jpg",
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    price: 15,
    description: "Two-egg omelette with onion & chilli.",
    image: "images/om123.jpg",
  },
  {
    id: "half-boil",
    name: "Half Boil",
    price: 10,
    description: "Soft-boiled egg with pepper & salt.",
    image: "images/halfboil.jpg",
  },
  {
    id: "egg-dosa",
    name: "Egg Dosa",
    price: 15,
    description: "Egg layered dosa, hot & filling.",
    image: "images/eggdosa1.jpg",
  },
];

// ─────────────────────────────────────────────
// STATE + DOM
// ─────────────────────────────────────────────
let cart = [];
let qrInstance = null;
let lastUpiUrl = "";

const el = {}; // all DOM nodes stored here

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  attachEvents();
  renderMenu();
  updateCartUI();
  handleOrderTypeChange();
  handleOrderModeChange();

  if (el.qrCanvas) {
    qrInstance = new QRious({
      element: el.qrCanvas,
      size: 200,
      value: "",
    });
  }
});

// ─────────────────────────────────────────────
// DOM CACHE
// ─────────────────────────────────────────────
function cacheDom() {
  el.menuGrid = document.getElementById("menu-grid");
  el.cartTableBody = document.getElementById("cart-table-body");
  el.cartCountPill = document.getElementById("cart-count-pill");

  el.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  el.deliverySection = document.getElementById("delivery-section");
  el.deliveryDistance = document.getElementById("delivery-distance");
  el.deliveryAddress = document.getElementById("delivery-address");

  el.subtotalAmount = document.getElementById("subtotal-amount");
  el.deliveryAmount = document.getElementById("delivery-amount");
  el.grandAmount = document.getElementById("grand-amount");

  el.orderModeRadios = document.querySelectorAll('input[name="order-mode"]');
  el.payNowPanel = document.getElementById("pay-now-panel");
  el.preorderPanel = document.getElementById("preorder-panel");

  el.qrCanvas = document.getElementById("qr-canvas");
  el.qrNote = document.getElementById("qr-note");
  el.generateQrBtn = document.getElementById("generate-qr-btn");
  el.paymentDoneBtn = document.getElementById("payment-done-btn");
  el.upiPayBtn = document.getElementById("upi-pay-btn");

  el.clearCartBtn = document.getElementById("clear-cart-btn");
  el.printBillBtn = document.getElementById("print-bill-btn");

  el.preorderForm = document.getElementById("preorder-form");
  el.preorderName = document.getElementById("preorder-name");
  el.preorderContact = document.getElementById("preorder-contact");
  el.preorderTime = document.getElementById("preorder-time");
  el.preorderNotes = document.getElementById("preorder-notes");

  el.toast = document.getElementById("toast");
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────
function attachEvents() {
  // Menu clicks (add to cart)
  el.menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='add-to-cart']");
    if (!btn) return;
    const id = btn.dataset.id;
    const dish = MENU.find((d) => d.id === id);
    if (dish) addToCart(dish);
  });

  // Cart quantity + remove
  el.cartTableBody.addEventListener("input", (e) => {
    if (!e.target.classList.contains("cart-qty")) return;
    const id = e.target.dataset.id;
    const value = Math.max(1, parseInt(e.target.value) || 1);
    updateCartQuantity(id, value);
  });

  el.cartTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='remove-item']");
    if (!btn) return;
    const id = btn.dataset.id;
    removeFromCart(id);
  });

  // Order type pickup / delivery
  el.orderTypeRadios.forEach((r) =>
    r.addEventListener("change", handleOrderTypeChange)
  );
  el.deliveryDistance.addEventListener("input", updateTotals);

  // Order mode pay-now / preorder
  el.orderModeRadios.forEach((r) =>
    r.addEventListener("change", handleOrderModeChange)
  );

  // Cart buttons
  el.clearCartBtn.addEventListener("click", clearCart);
  el.printBillBtn.addEventListener("click", printBill);

  // Payment
  el.generateQrBtn.addEventListener("click", handleGenerateQR);
  el.paymentDoneBtn.addEventListener("click", handlePaymentDone);
  el.upiPayBtn.addEventListener("click", handleUpiPay);

  // Preorder
  el.preorderForm.addEventListener("submit", handlePreorderSubmit);
}

// ─────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────
function renderMenu() {
  el.menuGrid.innerHTML = MENU.map((item) => {
    return `
      <article class="menu-card">
        <img src="${item.image}" alt="${item.name}" />
        <div class="content">
          <div class="meta">
            <strong>${item.name}</strong>
            <span>${formatCurrency(item.price)}</span>
          </div>
          <p>${item.description}</p>
          <button
            class="btn filled"
            data-action="add-to-cart"
            data-id="${item.id}"
          >
            Add to cart
          </button>
        </div>
      </article>
    `;
  }).join("");
}

// ─────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────
function addToCart(dish) {
  const existing = cart.find((i) => i.id === dish.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      qty: 1,
    });
  }
  updateCartUI();
  notify(`${dish.name} added to cart.`);
}

function updateCartQuantity(id, qty) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = qty;
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  updateCartUI();
  notify("Item removed from cart.");
}

function clearCart() {
  if (!cart.length) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear the entire cart?")) return;
  cart = [];
  updateCartUI();
  notify("Cart cleared.");
}

function updateCartUI() {
  if (!cart.length) {
    el.cartTableBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
  } else {
    el.cartTableBody.innerHTML = cart
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td class="num">
          <input
            type="number"
            min="1"
            class="qty-input cart-qty"
            data-id="${item.id}"
            value="${item.qty}"
          />
        </td>
        <td class="num">${formatCurrency(item.price)}</td>
        <td class="num">${formatCurrency(item.price * item.qty)}</td>
        <td class="num">
          <button
            class="btn ghost sm"
            data-action="remove-item"
            data-id="${item.id}"
          >
            Remove
          </button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  el.cartCountPill.textContent =
    totalItems === 1 ? "1 item" : `${totalItems} items`;

  updateTotals();
}

// ─────────────────────────────────────────────
// TOTALS + DELIVERY
// ─────────────────────────────────────────────
function getOrderType() {
  const checked = document.querySelector('input[name="order-type"]:checked');
  return checked ? checked.value : "pickup";
}

function handleOrderTypeChange() {
  const type = getOrderType();
  if (type === "delivery") {
    el.deliverySection.style.display = "block";
  } else {
    el.deliverySection.style.display = "none";
  }
  updateTotals();
}

function getOrderMode() {
  const checked = document.querySelector('input[name="order-mode"]:checked');
  return checked ? checked.value : "pay-now";
}

function handleOrderModeChange() {
  const mode = getOrderMode();
  if (mode === "pay-now") {
    el.payNowPanel.style.display = "block";
    el.preorderPanel.style.display = "none";
  } else {
    el.payNowPanel.style.display = "none";
    el.preorderPanel.style.display = "block";
  }
}

function updateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery =
    getOrderType() === "delivery"
      ? calculateDeliveryCharge(parseInt(el.deliveryDistance.value) || 0)
      : 0;
  const grand = subtotal + delivery;

  el.subtotalAmount.textContent = formatCurrency(subtotal);
  el.deliveryAmount.textContent = formatCurrency(delivery);
  el.grandAmount.textContent = formatCurrency(grand);
}

function calculateDeliveryCharge(distance) {
  if (distance <= 0) return 0;
  if (distance <= 100) return 10;
  if (distance <= 250) return 20;
  if (distance <= 500) return 30;
  return 40;
}

// ─────────────────────────────────────────────
// PAYMENT (QR + UPI APP)
// ─────────────────────────────────────────────
function ensureCartNotEmpty() {
  if (!cart.length) {
    notify("Add at least one item to cart first.");
    return false;
  }
  return true;
}

function handleGenerateQR() {
  if (!ensureCartNotEmpty()) return;

  const amount = Number(el.grandAmount.textContent.replace("₹", "")) || 0;
  if (!amount) {
    notify("Amount is zero.");
    return;
  }

  const orderId = `MTF-${Date.now()}`;
  const upiString = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(orderId)}`;

  lastUpiUrl = upiString;

  if (qrInstance) {
    qrInstance.value = upiString;
  }

  el.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    amount
  )}. Reference: ${orderId}`;
  el.upiPayBtn.style.display = "inline-flex"; // show pay button

  notify("QR code ready. You can scan or tap 'Pay with UPI app'.");
}

function handleUpiPay() {
  if (!lastUpiUrl) {
    notify("Please generate the QR first.");
    return;
  }
  // On mobile, this opens GPay / PhonePe / etc
  window.location.href = lastUpiUrl;
}

function handlePaymentDone() {
  if (!ensureCartNotEmpty()) return;

  const orderType = getOrderType();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery =
    orderType === "delivery"
      ? calculateDeliveryCharge(parseInt(el.deliveryDistance.value) || 0)
      : 0;
  const total = subtotal + delivery;

  let msg = `✅ Payment Recorded\n\nOrder type: ${
    orderType === "pickup" ? "Pickup at shop" : "Delivery"
  }\nTotal: ${formatCurrency(total)}\n\nItems:\n`;

  msg += cart
    .map(
      (item) =>
        `• ${item.name} x ${item.qty} = ${formatCurrency(
          item.price * item.qty
        )}`
    )
    .join("\n");

  if (orderType === "delivery") {
    msg += `\n\nDeliver to: ${el.deliveryAddress.value || "Not specified"}`;
  }

  alert(msg);
  cart = [];
  updateCartUI();
  el.upiPayBtn.style.display = "none";
  el.qrNote.textContent = "QR will appear after you click “Generate QR”.";
  notify("Order cleared after payment.");
}

// ─────────────────────────────────────────────
// PREORDER (no payment, just logging)
// ─────────────────────────────────────────────
function handlePreorderSubmit(e) {
  e.preventDefault();
  if (!ensureCartNotEmpty()) return;

  const orderType = getOrderType();
  const name = el.preorderName.value.trim() || "Not given";
  const contact = el.preorderContact.value.trim() || "Not given";
  const time = el.preorderTime.value || "Not specified";
  const notes = el.preorderNotes.value.trim() || "-";

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery =
    orderType === "delivery"
      ? calculateDeliveryCharge(parseInt(el.deliveryDistance.value) || 0)
      : 0;
  const total = subtotal + delivery;

  let msg = `✅ Preorder Saved\n\nName: ${name}\nContact: ${contact}\nMode: ${
    orderType === "pickup" ? "Pickup" : "Delivery"
  }\nETA: ${time}\nTotal (approx): ${formatCurrency(
    total
  )}\n\nNotes: ${notes}\n\nItems:\n`;

  msg += cart
    .map(
      (item) =>
        `• ${item.name} x ${item.qty} = ${formatCurrency(
          item.price * item.qty
        )}`
    )
    .join("\n");

  alert(msg);

  // clear
  cart = [];
  updateCartUI();
  el.preorderForm.reset();
  notify("Preorder logged. Collect payment at shop / on delivery.");
}

// ─────────────────────────────────────────────
// PRINT BILL
// ─────────────────────────────────────────────
function printBill() {
  if (!ensureCartNotEmpty()) return;

  const orderType = getOrderType();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery =
    orderType === "delivery"
      ? calculateDeliveryCharge(parseInt(el.deliveryDistance.value) || 0)
      : 0;
  const total = subtotal + delivery;

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

  const win = window.open("", "_blank", "width=800,height=600");
  win.document.write(`
    <html>
      <head>
        <title>Murugammal Tiffin Center Bill</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f2ea; }
          .totals { margin-top: 16px; width: 300px; float: right; }
          .totals td { border: none; }
        </style>
      </head>
      <body>
        <h1>Murugammal Tiffin Center</h1>
        <p>${new Date().toLocaleString()}</p>
        <p><strong>Order type:</strong> ${
          orderType === "pickup" ? "Pickup at shop" : "Delivery"
        }</p>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
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
  `);
  win.document.close();
  win.focus();
  win.print();
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return n % 1 === 0 ? `₹${n.toFixed(0)}` : `₹${n.toFixed(1)}`;
}

function notify(msg) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(el.toast._timeout);
  el.toast._timeout = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2500);
}
