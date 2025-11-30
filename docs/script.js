// ================= CONFIG =================
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";
// Your WhatsApp with country code (India = 91)
const OWNER_WHATSAPP = "918531030451";

// Simple fixed menu (you can change prices/images here)
const MENU = [
  {
    id: "idly",
    name: "Plain Idly",
    price: 2.5,
    description: "Steamed rice cakes with chutneys.",
    image: "images/idly1.jpg"
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    price: 8,
    description: "Golden dosa with sambar & chutneys.",
    image: "images/dosa1.jpg"
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    price: 12,
    description: "Caramelised onion topping, extra crunch.",
    image: "images/od.jpg"
  },
  {
    id: "pepper-egg",
    name: "Pepper Egg",
    price: 10,
    description: "Boiled egg with pepper & salt.",
    image: "images/boil1.jpg"
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    price: 15,
    description: "Two-egg omelette with herbs & onion.",
    image: "images/om123.jpg"
  },
  {
    id: "half-boil",
    name: "Half Boil",
    price: 10,
    description: "Soft-boiled egg with pepper & salt.",
    image: "images/halfboil.jpg"
  },
  {
    id: "egg-dosa",
    name: "Egg Dosa",
    price: 15,
    description: "Protein-rich dosa with beaten egg layer.",
    image: "images/eggdosa1.jpg"
  }
];

// Delivery fee rules (meters)
const DELIVERY_RULES = [
  { max: 100, fee: 10 },
  { max: 500, fee: 20 },
  { max: 1000, fee: 30 },
  { max: Infinity, fee: 40 },
];

// ================= STATE =================
let cart = [];
let qrInstance = null;
let currentUpiUrl = "";

const el = {}; // DOM elements

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  attachEvents();
  renderMenu();
  updateCartUI();
  handleOrderModeChange();
  handleOrderTypeChange();

  if (el.qrCanvas) {
    qrInstance = new QRious({
      element: el.qrCanvas,
      size: 200,
    });
  }
});

// ================= DOM CACHE =================
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

  el.customerName = document.getElementById("customer-name");
  el.customerMobile = document.getElementById("customer-mobile");

  el.orderModeRadios = document.querySelectorAll('input[name="order-mode"]');
  el.payNowPanel = document.getElementById("pay-now-panel");
  el.preorderPanel = document.getElementById("preorder-panel");

  el.qrCanvas = document.getElementById("qr-canvas");
  el.qrNote = document.getElementById("qr-note");
  el.generateQrBtn = document.getElementById("generate-qr-btn");
  el.paymentDoneBtn = document.getElementById("payment-done-btn");

  el.upiApps = document.getElementById("upi-apps");
  el.payGPayBtn = document.getElementById("pay-gpay-btn");
  el.payPhonePeBtn = document.getElementById("pay-phonepe-btn");
  el.payPaytmBtn = document.getElementById("pay-paytm-btn");
  el.payAnyUpiBtn = document.getElementById("pay-anyupi-btn");

  el.preorderForm = document.getElementById("preorder-form");
  el.preorderName = document.getElementById("preorder-name");
  el.preorderContact = document.getElementById("preorder-contact");
  el.preorderTime = document.getElementById("preorder-time");
  el.preorderNotes = document.getElementById("preorder-notes");

  el.clearCartBtn = document.getElementById("clear-cart-btn");
  el.printBillBtn = document.getElementById("print-bill-btn");

  el.toast = document.getElementById("toast");
}

// ================= EVENTS =================
function attachEvents() {
  // Menu click → add to cart
  el.menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-add-id");
    const dish = MENU.find((d) => d.id === id);
    if (dish) addToCart(dish);
  });

  // Order type
  el.orderTypeRadios.forEach((r) =>
    r.addEventListener("change", () => {
      handleOrderTypeChange();
      updateTotals();
    })
  );

  // Delivery distance
  el.deliveryDistance.addEventListener("input", updateTotals);

  // Order mode
  el.orderModeRadios.forEach((r) =>
    r.addEventListener("change", handleOrderModeChange)
  );

  // Cart
  el.cartTableBody.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.matches(".qty-input")) return;
    const tr = input.closest("tr");
    const id = tr?.getAttribute("data-id");
    const qty = Math.max(1, Number(input.value) || 1);
    updateCartQuantity(id, qty);
  });

  el.cartTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-remove-id");
    removeFromCart(id);
  });

  el.clearCartBtn.addEventListener("click", () => {
    if (!cart.length) {
      notify("Cart is already empty.");
      return;
    }
    if (confirm("Clear the entire cart?")) {
      cart = [];
      updateCartUI();
      notify("Cart cleared.");
    }
  });

  el.printBillBtn.addEventListener("click", printBill);

  // Payment
  el.generateQrBtn.addEventListener("click", handleGenerateQR);
  el.paymentDoneBtn.addEventListener("click", handlePaymentDone);

  // UPI app buttons (all same handler)
  [el.payGPayBtn, el.payPhonePeBtn, el.payPaytmBtn, el.payAnyUpiBtn]
    .filter(Boolean)
    .forEach((btn) => btn.addEventListener("click", handleUpiAppPay));

  // Preorder form
  el.preorderForm.addEventListener("submit", handlePreorderSubmit);
}

// ================= HELPER UTILS =================
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return num % 1 === 0 ? `₹${num.toFixed(0)}` : `₹${num.toFixed(1)}`;
};

function notify(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(el.toast._timer);
  el.toast._timer = setTimeout(
    () => el.toast.classList.remove("show"),
    2500
  );
}

function getSelectedOrderType() {
  const checked = document.querySelector('input[name="order-type"]:checked');
  return checked ? checked.value : "pickup";
}

function getSelectedOrderMode() {
  const checked = document.querySelector('input[name="order-mode"]:checked');
  return checked ? checked.value : "pay-now";
}

// ================= MENU RENDER =================
function renderMenu() {
  el.menuGrid.innerHTML = MENU.map((item) => `
    <article class="menu-card">
      <img src="${item.image}" alt="${item.name}">
      <div class="content">
        <div class="meta">
          <strong>${item.name}</strong>
          <span>${formatCurrency(item.price)}</span>
        </div>
        <p>${item.description}</p>
        <button class="btn filled" data-add-id="${item.id}">Add to cart</button>
      </div>
    </article>
  `).join("");
}

// ================= CART LOGIC =================
function addToCart(dish) {
  const existing = cart.find((i) => i.id === dish.id);
  if (existing) existing.qty += 1;
  else cart.push({ id: dish.id, name: dish.name, price: dish.price, qty: 1 });

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
          <input type="number" min="1" value="${item.qty}" class="qty-input">
        </td>
        <td class="num">${formatCurrency(item.price)}</td>
        <td class="num">${formatCurrency(item.price * item.qty)}</td>
        <td class="num">
          <button class="btn ghost sm" data-remove-id="${item.id}">Remove</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  el.cartCountPill.textContent = totalItems
    ? `${totalItems} item${totalItems > 1 ? "s" : ""}`
    : "0 items";

  updateTotals();
}

// ================= TOTALS =================
function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function calculateDeliveryFee() {
  if (getSelectedOrderType() === "pickup") return 0;
  const distance = Math.max(0, Number(el.deliveryDistance.value) || 0);
  for (const rule of DELIVERY_RULES) {
    if (distance <= rule.max) return rule.fee;
  }
  return 0;
}

function updateTotals() {
  const subtotal = calculateSubtotal();
  const delivery = cart.length ? calculateDeliveryFee() : 0;
  const grand = subtotal + delivery;

  el.subtotalAmount.textContent = formatCurrency(subtotal);
  el.deliveryAmount.textContent = formatCurrency(delivery);
  el.grandAmount.textContent = formatCurrency(grand);
}

// ================= ORDER MODE / TYPE =================
function handleOrderTypeChange() {
  const type = getSelectedOrderType();
  el.deliverySection.style.display = type === "delivery" ? "block" : "none";
}

function handleOrderModeChange() {
  const mode = getSelectedOrderMode();
  el.payNowPanel.style.display = mode === "pay-now" ? "block" : "none";
  el.preorderPanel.style.display = mode === "preorder" ? "block" : "none";
}

// ================= PAYMENT / QR / UPI =================
function ensureCartNotEmpty() {
  if (!cart.length) {
    notify("Your cart is empty. Add items first.");
    return false;
  }
  return true;
}

function handleGenerateQR() {
  if (!ensureCartNotEmpty()) return;
  const amount = calculateSubtotal() + calculateDeliveryFee();
  if (!amount) {
    notify("Amount is zero.");
    return;
  }

  const orderId = `MTC-${Date.now()}`;
  const upiString = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(orderId)}`;

  currentUpiUrl = upiString;

  if (qrInstance) qrInstance.value = upiString;
  el.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    amount
  )}. Ref: ${orderId}`;

  // Show UPI app buttons
  if (el.upiApps) el.upiApps.style.display = "block";

  notify("QR code ready. Pay using any UPI app.");
}

function handleUpiAppPay() {
  if (!currentUpiUrl) {
    notify("Generate the QR first.");
    return;
  }
  // Open UPI link – phone will ask which app (GPay / PhonePe / Paytm / etc.)
  window.location.href = currentUpiUrl;
}

function buildOrderSummaryText({ paid }) {
  const orderType = getSelectedOrderType();
  const subtotal = calculateSubtotal();
  const deliveryFee = calculateDeliveryFee();
  const total = subtotal + deliveryFee;

  const name = (el.customerName.value || "").trim() || "Not given";
  const mobile = (el.customerMobile.value || "").trim() || "Not given";
  const addr =
    orderType === "delivery"
      ? (el.deliveryAddress.value || "Not given")
      : "Pickup at shop";

  const lines = [];

  lines.push(paid ? "✅ PAYMENT ORDER" : "📝 PREORDER (NOT PAID)");
  lines.push(`Customer: ${name}`);
  lines.push(`Mobile: ${mobile}`);
  lines.push(`Type: ${orderType === "delivery" ? "Delivery" : "Pickup"}`);
  lines.push(`Address: ${addr}`);
  lines.push("");
  lines.push("Items:");

  cart.forEach((item) => {
    lines.push(
      `• ${item.name} × ${item.qty} = ${formatCurrency(
        item.price * item.qty
      )}`
    );
  });

  lines.push("");
  lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
  lines.push(`Delivery: ${formatCurrency(deliveryFee)}`);
  lines.push(`Total: ${formatCurrency(total)}`);
  lines.push("");
  lines.push(
    `Time: ${new Date().toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    })}`
  );

  return lines.join("\n");
}

function sendOrderToWhatsApp(summary) {
  const url =
    "https://wa.me/" + OWNER_WHATSAPP + "?text=" + encodeURIComponent(summary);
  window.open(url, "_blank");
}

function handlePaymentDone() {
  if (!ensureCartNotEmpty()) return;

  const summary = buildOrderSummaryText({ paid: true });

  // Show on screen once (optional)
  alert("Payment recorded. Sending order to shop WhatsApp.\n\n" + summary);

  // Send to your WhatsApp
  sendOrderToWhatsApp(summary);

  cart = [];
  updateCartUI();
  notify("Order saved. Thank you!");
}

// ================= PREORDER =================
function handlePreorderSubmit(e) {
  e.preventDefault();
  if (!ensureCartNotEmpty()) return;

  // For preorder, if customer did not fill top name/mobile, use preorder form
  if (!el.customerName.value && el.preorderName.value) {
    el.customerName.value = el.preorderName.value;
  }
  if (!el.customerMobile.value && el.preorderContact.value) {
    el.customerMobile.value = el.preorderContact.value;
  }

  let summary = buildOrderSummaryText({ paid: false });

  const extra = [];
  if (el.preorderTime.value) extra.push("Arrival time: " + el.preorderTime.value);
  if (el.preorderNotes.value.trim())
    extra.push("Notes: " + el.preorderNotes.value.trim());
  if (extra.length) {
    summary += "\n\n" + extra.join("\n");
  }

  alert("Preorder saved. Sending details to shop WhatsApp.\n\n" + summary);
  sendOrderToWhatsApp(summary);

  cart = [];
  updateCartUI();
  e.target.reset();
  notify("Preorder logged. Pay at shop / on delivery.");
}

// ================= PRINT BILL =================
function printBill() {
  if (!ensureCartNotEmpty()) return;

  const orderType = getSelectedOrderType();
  const subtotal = calculateSubtotal();
  const deliveryFee = calculateDeliveryFee();
  const total = subtotal + deliveryFee;

  const addr =
    orderType === "delivery"
      ? (el.deliveryAddress.value || "Not given")
      : "Pickup at shop";

  const rows = cart
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.price * item.qty)}</td>
    </tr>`
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Murugammal Tiffin Center Bill</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 24px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f2ea; }
          .totals { margin-top: 16px; width: 320px; float: right; }
          .totals td { border: none; }
        </style>
      </head>
      <body>
        <h1>Murugammal Tiffin Center</h1>
        <p>${new Date().toLocaleString()}</p>
        <p><strong>Order type:</strong> ${
          orderType === "delivery" ? "Delivery" : "Pickup"
        }</p>
        <p><strong>Address:</strong> ${addr}</p>
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <table class="totals">
          <tr><td>Subtotal:</td><td>${formatCurrency(subtotal)}</td></tr>
          <tr><td>Delivery:</td><td>${formatCurrency(deliveryFee)}</td></tr>
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
