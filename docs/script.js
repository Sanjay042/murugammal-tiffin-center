// ============================================================================
// Murugammal Tiffin Center · Frontend + Local "Backend"
// ============================================================================

// ---------- CONFIG ----------
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";
const ADMIN_PASSWORD = "63695599";

const STORAGE_KEYS = {
  orders: "mtc_orders_v1",
};

// Menu with your SAME prices and images
const MENU_ITEMS = [
  {
    id: "idly",
    name: "Plain Idly",
    price: 2.5,
    image: "images/idly1.jpg",
    description: "Steamed rice cakes with coconut chutney and red chutney.",
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    price: 8,
    image: "images/dosa1.jpg",
    description: "Golden dosa with sambar & chutneys.",
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    price: 12,
    image: "images/od.jpg",
    description: "Caramelised onion topping, extra crunch.",
  },
  {
    id: "pepper-egg",
    name: "Pepper Egg",
    price: 10,
    image: "images/boil1.jpg",
    description: "Boiled egg with pepper & salt.",
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    price: 15,
    image: "images/om123.jpg",
    description: "Two-egg omelette with herbs & onion.",
  },
  {
    id: "half-boil",
    name: "Half Boil",
    price: 10,
    image: "images/halfboil.jpg",
    description: "Soft-boiled egg with pepper & salt.",
  },
  {
    id: "egg-dosa",
    name: "Egg Dosa",
    price: 15,
    image: "images/eggdosa1.jpg",
    description: "Protein-rich dosa with beaten egg layer.",
  },
];

// ---------- GLOBAL STATE ----------
let cart = [];
let qrInstance;
let lastUpiUrl = "";
let lastUpiPlain = "";   // generic upi://pay link
let lastUpiParams = "";  // everything after '?'
let ordersCache = [];

const el = {}; // DOM elements

// ---------- HELPERS ----------
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return num % 1 === 0 ? `₹${num.toFixed(0)}` : `₹${num.toFixed(1)}`;
};

function notify(message) {
  if (!el.toast) {
    alert(message);
    return;
  }
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(el.toast._timeout);
  el.toast._timeout = setTimeout(
    () => el.toast.classList.remove("show"),
    2600
  );
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.orders);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(ordersCache));
}

function generateOrderId() {
  return "MTF-" + Date.now();
}

function getOrderType() {
  const checked = document.querySelector('input[name="order-type"]:checked');
  return checked ? checked.value : "pickup";
}

function getOrderMode() {
  const checked = document.querySelector('input[name="order-mode"]:checked');
  return checked ? checked.value : "pay-now";
}

// Delivery fee: same idea as before
function calculateDeliveryFee(distanceMeters, type) {
  if (type === "pickup") return 0;
  const d = Number(distanceMeters) || 0;
  if (d <= 100) return 10;
  if (d <= 500) return 15;
  if (d <= 1000) return 20;
  return 25;
}

// ---------- CUSTOMER PAGE ----------
function cacheCustomerDom() {
  el.menuGrid = document.getElementById("menu-grid");
  el.cartTableBody = document.getElementById("cart-table-body");
  el.cartCount = document.getElementById("cart-count-pill");

  el.customerName = document.getElementById("customer-name");
  el.customerPhone = document.getElementById("customer-phone");

  el.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  el.deliverySection = document.getElementById("delivery-section");
  el.deliveryDistance = document.getElementById("delivery-distance");
  el.deliveryAddress = document.getElementById("delivery-address");

  el.subtotal = document.getElementById("subtotal-amount");
  el.delivery = document.getElementById("delivery-amount");
  el.grand = document.getElementById("grand-amount");

  el.orderModeRadios = document.querySelectorAll('input[name="order-mode"]');
  el.payNowPanel = document.getElementById("pay-now-panel");
  el.preorderPanel = document.getElementById("preorder-panel");

  el.preorderTime = document.getElementById("preorder-time");
  el.preorderNotes = document.getElementById("preorder-notes");

  el.qrCanvas = document.getElementById("qr-canvas");
  el.qrNote = document.getElementById("qr-note");
  el.generateQrBtn = document.getElementById("generate-qr-btn");
  el.upiApps = document.getElementById("upi-apps");
  el.payGpayBtn = document.getElementById("pay-gpay-btn");
  el.payPhonePeBtn = document.getElementById("pay-phonepe-btn");
  el.payPaytmBtn = document.getElementById("pay-paytm-btn");
  el.payAnyUpiBtn = document.getElementById("pay-anyupi-btn");

  el.placeOrderBtn = document.getElementById("place-order-btn");
  el.clearCartBtn = document.getElementById("clear-cart-btn");
  el.printBillBtn = document.getElementById("print-bill-btn");

  el.toast = document.getElementById("toast");
    // Success overlay
  el.successOverlay = document.getElementById("success-overlay");
  el.successMessage = document.getElementById("success-message");
  el.successOkBtn = document.getElementById("success-ok-btn");

}

function initCustomer() {
  cacheCustomerDom();

  // Render menu
  renderMenu();

  // QR init
  if (el.qrCanvas && window.QRious) {
    qrInstance = new QRious({
      element: el.qrCanvas,
      size: 200,
      value: "",
    });
  }

  // Events
  if (el.menuGrid) {
    el.menuGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-id]");
      if (!btn) return;
      const id = btn.dataset.id;
      const item = MENU_ITEMS.find((m) => m.id === id);
      if (item) addToCart(item);
    });
  }

  el.orderTypeRadios.forEach((r) =>
    r.addEventListener("change", syncOrderTypeSection)
  );
  syncOrderTypeSection();

  el.deliveryDistance?.addEventListener("input", updateTotals);

  el.orderModeRadios.forEach((r) =>
    r.addEventListener("change", syncOrderModePanels)
  );
  syncOrderModePanels();

  el.cartTableBody?.addEventListener("input", (e) => {
    const input = e.target;
    if (!input.classList.contains("qty-input")) return;
    const row = input.closest("tr");
    const id = row?.dataset.id;
    const qty = Math.max(1, Number(input.value) || 1);
    updateCartQuantity(id, qty);
  });

  el.cartTableBody?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-id]");
    if (!btn) return;
    const id = btn.dataset.removeId;
    removeFromCart(id);
  });

  el.generateQrBtn?.addEventListener("click", handleGenerateQR);

    // App-specific UPI buttons
  el.payGpayBtn?.addEventListener("click", () => openUpiFor("gpay"));
  el.payPhonePeBtn?.addEventListener("click", () => openUpiFor("phonepe"));
  el.payPaytmBtn?.addEventListener("click", () => openUpiFor("paytm"));
  el.payAnyUpiBtn?.addEventListener("click", () => openUpiFor("any"));

  // Success screen OK
  el.successOkBtn?.addEventListener("click", () => {
    el.successOverlay?.classList.remove("show");
  });


  el.placeOrderBtn?.addEventListener("click", handlePlaceOrder);
  el.clearCartBtn?.addEventListener("click", clearCart);
  el.printBillBtn?.addEventListener("click", printBill);

  updateCartUI();
}

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
        <p>${item.description}</p>
        <button class="btn filled" data-id="${item.id}">Add to cart</button>
      </div>
    </article>`
  ).join("");
}

// ----- Cart -----
function addToCart(dish) {
  const existing = cart.find((i) => i.id === dish.id);
  if (existing) existing.qty += 1;
  else
    cart.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      qty: 1,
    });
  updateCartUI();
  notify(`${dish.name} added to cart.`);
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  updateCartUI();
}

function updateCartQuantity(id, qty) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty = qty;
  updateCartUI();
}

function clearCart() {
  if (!cart.length) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear all items from cart?")) return;
  cart = [];
  updateCartUI();
}

function updateCartUI() {
  if (!el.cartTableBody) return;

  if (!cart.length) {
    el.cartTableBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
  } else {
    el.cartTableBody.innerHTML = cart
      .map(
        (item) => `
      <tr data-id="${item.id}">
        <td><strong>${item.name}</strong></td>
        <td class="num">
          <input type="number" class="qty-input" min="1" value="${item.qty}">
        </td>
        <td class="num">${formatCurrency(item.price)}</td>
        <td class="num">${formatCurrency(item.price * item.qty)}</td>
        <td class="num">
          <button class="btn ghost sm" data-remove-id="${item.id}">Remove</button>
        </td>
      </tr>`
      )
      .join("");
  }

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  if (el.cartCount) {
    el.cartCount.textContent = totalItems
      ? `${totalItems} item${totalItems > 1 ? "s" : ""}`
      : "0 items";
  }

  updateTotals();
}

function updateTotals() {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const type = getOrderType();
  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const deliveryFee = calculateDeliveryFee(distance, type);
  const total = subtotal + deliveryFee;

  if (el.subtotal) el.subtotal.textContent = formatCurrency(subtotal);
  if (el.delivery) el.delivery.textContent = formatCurrency(deliveryFee);
  if (el.grand) el.grand.textContent = formatCurrency(total);
}

function syncOrderTypeSection() {
  const type = getOrderType();
  if (el.deliverySection) {
    el.deliverySection.style.display = type === "delivery" ? "block" : "none";
  }
  updateTotals();
}

function syncOrderModePanels() {
  const mode = getOrderMode();
  if (el.payNowPanel) {
    el.payNowPanel.style.display = mode === "pay-now" ? "block" : "none";
  }
  if (el.preorderPanel) {
    el.preorderPanel.style.display = mode === "preorder" ? "block" : "none";
  }
}

// ----- QR / UPI -----
function handleGenerateQR() {
  if (!cart.length) {
    notify("Add at least one item to cart.");
    return;
  }
  const name = el.customerName?.value.trim();
  const phone = el.customerPhone?.value.trim();
  if (!name || !phone) {
    notify("Please enter your name and mobile number first.");
    return;
  }

  const type = getOrderType();
  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = calculateDeliveryFee(distance, type);
  const amount = subtotal + deliveryFee;

  if (!amount) {
    notify("Total amount is zero.");
    return;
  }

  const orderId = generateOrderId();
  const note = `${orderId} | ${name} | ${phone}`;
  const upiString = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(note)}`;

  lastUpiUrl = upiString;

  if (qrInstance) {
    qrInstance.value = upiString;
  }
  if (el.qrNote) {
    el.qrNote.textContent = `Scan to pay ${formatCurrency(
      amount
    )}. Ref: ${orderId}`;
  }
  if (el.upiApps) el.upiApps.style.display = "block";

  notify("QR generated. Pay using any UPI app.");
}

// ----- Place Order (save for admin) -----
function handlePlaceOrder() {
  if (!cart.length) {
    notify("Cart is empty.");
    return;
  }
  const name = el.customerName?.value.trim();
  const phone = el.customerPhone?.value.trim();
  if (!name || !phone) {
    notify("Please enter your name and mobile number.");
    return;
  }
  const mode = getOrderMode(); // "pay-now" or "preorder"
  const type = getOrderType();

  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const address = el.deliveryAddress ? el.deliveryAddress.value.trim() : "";
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = calculateDeliveryFee(distance, type);
  const total = subtotal + deliveryFee;

  const order = {
    id: generateOrderId(),
    customerName: name,
    customerPhone: phone,
    mode,
    type,
    distance: Number(distance) || 0,
    address,
    subtotal,
    deliveryFee,
    total,
    preorderTime: el.preorderTime ? el.preorderTime.value : "",
    preorderNotes: el.preorderNotes ? el.preorderNotes.value.trim() : "",
    items: cart.map((i) => ({
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    createdAt: Date.now(),
  };

  ordersCache = loadOrders();
  ordersCache.push(order);
  saveOrders();

  showSuccessScreen(order);

  cart = [];
  updateCartUI();
}
function showSuccessScreen(order) {
  if (!el.successOverlay || !el.successMessage) {
    // fallback if something missing
    alert(
      `✅ Order saved!\n\n` +
        `Order ID: ${order.id}\n` +
        `Name: ${order.customerName}\n` +
        `Mobile: ${order.customerPhone}\n` +
        `Total: ${formatCurrency(order.total)}`
    );
    return;
  }

  const modeText =
    order.mode === "pay-now" ? "Pay now (UPI)" : "Preorder (pay at counter)";
  const typeText = order.type === "pickup" ? "Pickup at shop" : "Delivery";

  el.successMessage.innerHTML =
    `Order ID: <strong>${order.id}</strong><br>` +
    `Name: <strong>${order.customerName}</strong><br>` +
    `Mobile: <strong>${order.customerPhone}</strong><br>` +
    `Amount: <strong>${formatCurrency(order.total)}</strong><br>` +
    `${modeText} · ${typeText}`;

  el.successOverlay.classList.add("show");
}


// ----- Print bill -----
function printBill() {
  if (!cart.length) {
    notify("Cart is empty.");
    return;
  }

  const name = el.customerName?.value.trim() || "-";
  const phone = el.customerPhone?.value.trim() || "-";
  const type = getOrderType();
  const distance = el.deliveryDistance ? el.deliveryDistance.value : 0;
  const address =
    type === "delivery" && el.deliveryAddress
      ? el.deliveryAddress.value.trim() || "-"
      : "-";

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = calculateDeliveryFee(distance, type);
  const total = subtotal + deliveryFee;

  const rows = cart
    .map(
      (i) => `
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${formatCurrency(i.price)}</td>
      <td>${formatCurrency(i.price * i.qty)}</td>
    </tr>`
    )
    .join("");

  const html = `
  <html>
    <head>
      <title>Murugammal Tiffin Center Bill</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding:24px; }
        h1 { text-align:center; }
        table { width:100%; border-collapse:collapse; margin-top:16px; }
        th, td { border:1px solid #ddd; padding:8px; text-align:left; }
        th { background:#f9f2ea; }
        .totals { margin-top:16px; width:260px; float:right; }
        .totals td { border:none; }
      </style>
    </head>
    <body>
      <h1>Murugammal Tiffin Center</h1>
      <p>${new Date().toLocaleString()}</p>
      <p><strong>Customer:</strong> ${name} (${phone})</p>
      <p><strong>Order type:</strong> ${type === "pickup" ? "Pickup" : "Delivery"}</p>
      <p><strong>Address:</strong> ${address}</p>

      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table class="totals">
        <tr><td>Subtotal:</td><td>${formatCurrency(subtotal)}</td></tr>
        <tr><td>Delivery:</td><td>${formatCurrency(deliveryFee)}</td></tr>
        <tr><td><strong>Grand total:</strong></td><td><strong>${formatCurrency(total)}</strong></td></tr>
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

// ---------- ADMIN PAGE ----------
function cacheAdminDom() {
  el.toast = document.getElementById("toast");
  el.adminLoginPanel = document.getElementById("admin-login-panel");
  el.adminPassword = document.getElementById("admin-password");
  el.adminLoginBtn = document.getElementById("admin-login-btn");
  el.adminDashboard = document.getElementById("admin-dashboard");
  el.adminLogoutBtn = document.getElementById("admin-logout-btn");
  el.adminOrdersTbody = document.getElementById("admin-orders-tbody");
  el.adminTotalOrders = document.getElementById("admin-total-orders");
  el.adminTotalRevenue = document.getElementById("admin-total-revenue");
  el.adminTotalPaynow = document.getElementById("admin-total-paynow");
  el.adminTotalPreorder = document.getElementById("admin-total-preorder");
}

function initAdmin() {
  cacheAdminDom();
  ordersCache = loadOrders();

  el.adminLoginBtn?.addEventListener("click", handleAdminLogin);
  el.adminPassword?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdminLogin();
  });
  el.adminLogoutBtn?.addEventListener("click", () => {
    el.adminDashboard.classList.add("hidden");
    el.adminLoginPanel.style.display = "block";
    el.adminPassword.value = "";
  });
}

function handleAdminLogin() {
  if (!el.adminPassword) return;
  if (el.adminPassword.value === ADMIN_PASSWORD) {
    el.adminLoginPanel.style.display = "none";
    el.adminDashboard.classList.remove("hidden");
    renderAdminOrders();
    notify("Admin unlocked.");
  } else {
    notify("Incorrect password.");
  }
}

function renderAdminOrders() {
  if (!el.adminOrdersTbody) return;

  if (!ordersCache.length) {
    el.adminOrdersTbody.innerHTML =
      '<tr><td colspan="5" class="empty">No orders saved yet.</td></tr>';
  } else {
    const rows = [...ordersCache]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((o) => {
        const time = new Date(o.createdAt).toLocaleString("en-IN");
        const modeLabel = o.mode === "pay-now" ? "Pay now" : "Preorder";
        const typeLabel = o.type === "pickup" ? "Pickup" : "Delivery";
        const itemsSummary = o.items
          .map((i) => `${i.name} ×${i.qty}`)
          .join(", ");
        return `
        <tr>
          <td>${time}</td>
          <td>${o.customerName}<br><small>${o.customerPhone}</small></td>
          <td>${modeLabel} / ${typeLabel}</td>
          <td>${formatCurrency(o.total)}</td>
          <td>${itemsSummary}</td>
        </tr>`;
      })
      .join("");
    el.adminOrdersTbody.innerHTML = rows;
  }

  const totals = ordersCache.reduce(
    (acc, o) => {
      acc.orders += 1;
      acc.revenue += o.total || 0;
      if (o.mode === "pay-now") acc.payNow += 1;
      else acc.preorder += 1;
      return acc;
    },
    { orders: 0, revenue: 0, payNow: 0, preorder: 0 }
  );

  if (el.adminTotalOrders)
    el.adminTotalOrders.textContent = String(totals.orders);
  if (el.adminTotalRevenue)
    el.adminTotalRevenue.textContent = formatCurrency(totals.revenue);
  if (el.adminTotalPaynow)
    el.adminTotalPaynow.textContent = String(totals.payNow);
  if (el.adminTotalPreorder)
    el.adminTotalPreorder.textContent = String(totals.preorder);
}

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "customer";

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  if (page === "admin") {
    initAdmin();
  } else {
    initCustomer();
  }
});
