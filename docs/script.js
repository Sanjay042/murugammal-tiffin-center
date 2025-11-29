// ========================= CONFIG =========================
const STORAGE_KEYS = {
  menu: "mtc_menu_items",
  cart: "mtc_cart",
  sales: "mtc_sales_records",
};

const ADMIN_PASSWORD = "63695599";
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";

const DELIVERY_RULES = [
  { max: 100, fee: 10 },
  { max: 500, fee: 15 },
  { max: 1000, fee: 20 },
  { max: Infinity, fee: 25 },
];

const DEFAULT_MENU = [
  {
    id: "idly",
    name: "Plain Idly",
    price: 2.5,
    description: "Steamed rice cakes with coconut & red chutney.",
    image: "images/idly1.jpg",
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    price: 8,
    description: "Golden dosa with sambar & chutneys.",
    image: "images/dosa1.jpg",
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    price: 12,
    description: "Caramelised onion topping, extra crunch.",
    image: "images/od.jpg",
  },
  {
    id: "full-boil",
    name: "Pepper Egg",
    price: 10,
    description: "Boiled egg with pepper & salt.",
    image: "images/boil1.jpg",
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    price: 15,
    description: "Two-egg omelette with herbs & onion.",
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
    description: "Protein-rich dosa with beaten egg layer.",
    image: "images/eggdosa1.jpg",
  },
];

// ========================= STATE =========================
const state = {
  menu: [],
  cart: [],
  sales: [],
  adminUnlocked: false,
};

const elements = {};
let qrInstance;
let lastUpiAmount = 0;
let lastOrderId = "";


// ========================= INIT =========================
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bootstrapState();
  attachEvents();
  initializeQR();

  // Customer page stuff
  if (elements.menuGrid) {
    renderMenu();
    renderCart();
    updateTotals();
  }

  // Admin page stuff
  if (elements.manageTableBody) {
    renderManageTable();
  }
  if (elements.reportMonth) {
    setupInitialReportMonth();
    renderReports();
  }
});

// ========================= DOM CACHE =========================
function cacheDom() {
  // Customer page
  elements.menuGrid = document.getElementById("menu-grid");
  elements.cartTableBody = document.getElementById("cart-table-body");
  elements.cartCount = document.getElementById("cart-count-pill");

  elements.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  elements.deliverySection = document.getElementById("delivery-section");
  elements.distanceInput = document.getElementById("delivery-distance");
  elements.deliveryAddress = document.getElementById("delivery-address");

  elements.subtotal = document.getElementById("subtotal-amount");
  elements.delivery = document.getElementById("delivery-amount");
  elements.grand = document.getElementById("grand-amount");

  elements.orderModes = document.querySelectorAll('input[name="order-mode"]');
  elements.payNowPanel = document.getElementById("pay-now-panel");
  elements.preorderPanel = document.getElementById("preorder-panel");

  elements.qrCanvas = document.getElementById("qr-canvas");
  elements.qrNote = document.getElementById("qr-note");
  elements.generateQrBtn = document.getElementById("generate-qr-btn");
  elements.paymentDoneBtn = document.getElementById("payment-done-btn");

// New UPI buttons
elements.upiApps = document.getElementById("upi-apps");
elements.payGPayBtn = document.getElementById("pay-gpay-btn");
elements.payPhonePeBtn = document.getElementById("pay-phonepe-btn");
elements.payPaytmBtn = document.getElementById("pay-paytm-btn");
elements.payAnyUpiBtn = document.getElementById("pay-anyupi-btn");


  elements.clearCartBtn = document.getElementById("clear-cart-btn");
  elements.printBillBtn = document.getElementById("print-bill-btn");
  elements.preorderForm = document.getElementById("preorder-form");

  elements.toast = document.getElementById("toast");

  // Admin page
  elements.adminLoginBtn = document.getElementById("admin-login-btn");
  elements.adminLogoutBtn = document.getElementById("admin-logout-btn");
  elements.adminPassword = document.getElementById("admin-password");
  elements.adminLoginCard = document.getElementById("admin-login");
  elements.adminDashboard = document.getElementById("admin-dashboard");

  elements.menuForm = document.getElementById("menu-form");
  elements.menuId = document.getElementById("menu-id");
  elements.menuName = document.getElementById("menu-name");
  elements.menuPrice = document.getElementById("menu-price");
  elements.menuImage = document.getElementById("menu-image");
  elements.menuDescription = document.getElementById("menu-description");
  elements.menuSubmitBtn = document.getElementById("menu-submit-btn");
  elements.menuCancelBtn = document.getElementById("menu-cancel-btn");
  elements.manageTableBody = document.getElementById("manage-table-body");

  elements.reportMonth = document.getElementById("report-month");
  elements.refreshReportBtn = document.getElementById("refresh-report-btn");
  elements.printReportBtn = document.getElementById("print-report-btn");
  elements.reportOrders = document.getElementById("report-orders");
  elements.reportRevenue = document.getElementById("report-revenue");
  elements.reportDelivery = document.getElementById("report-delivery");
  elements.reportModeBreakdown = document.getElementById("report-mode-breakdown");
  elements.reportTableBody = document.getElementById("report-table-body");
}

// ========================= STORAGE =========================
function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistMenu() {
  localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(state.menu));
}

function persistCart() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
  updateCartBadge();
}

function persistSales() {
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(state.sales));
}

function bootstrapState() {
  const savedMenu = loadFromStorage(STORAGE_KEYS.menu);
  state.menu = savedMenu && Array.isArray(savedMenu) && savedMenu.length
    ? savedMenu
    : DEFAULT_MENU.slice();

  state.cart = loadFromStorage(STORAGE_KEYS.cart) || [];
  state.sales = loadFromStorage(STORAGE_KEYS.sales) || [];

  persistMenu();
  persistCart();
  persistSales();
}

// ========================= HELPERS =========================
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return num % 1 === 0 ? `₹${num.toFixed(0)}` : `₹${num.toFixed(1)}`;
};

const notify = (message) => {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(elements.toast._timeout);
  elements.toast._timeout = setTimeout(
    () => elements.toast.classList.remove("show"),
    2600
  );
};

const generateId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const currentOrderType = () => {
  const checked = document.querySelector('input[name="order-type"]:checked');
  return checked ? checked.value : "pickup";
};

const currentOrderMode = () => {
  const checked = document.querySelector('input[name="order-mode"]:checked');
  return checked ? checked.value : "pay-now";
};

function ensureCartNotEmpty() {
  if (!state.cart.length) {
    notify("Add at least one item before continuing.");
    return false;
  }
  return true;
}

function updateCartBadge() {
  if (!elements.cartCount) return;
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = count
    ? `${count} item${count > 1 ? "s" : ""}`
    : "0 items";
}

// ========================= EVENTS =========================
function attachEvents() {
  if (elements.menuGrid) {
    elements.menuGrid.addEventListener("click", onMenuClick);
  }
  if (elements.cartTableBody) {
    elements.cartTableBody.addEventListener("input", onCartQuantityChange);
    elements.cartTableBody.addEventListener("click", onCartActionClick);
  }

  if (elements.orderTypeRadios && elements.orderTypeRadios.length) {
    elements.orderTypeRadios.forEach((r) =>
      r.addEventListener("change", () => {
        syncModePanels();
        updateTotals();
      })
    );
  }

  if (elements.distanceInput) {
    elements.distanceInput.addEventListener("input", updateTotals);
  }

  if (elements.orderModes && elements.orderModes.length) {
    elements.orderModes.forEach((r) =>
      r.addEventListener("change", syncModePanels)
    );
  }
if (elements.payGPayBtn) {
  elements.payGPayBtn.addEventListener("click", () => openUpiApp("gpay"));
}
if (elements.payPhonePeBtn) {
  elements.payPhonePeBtn.addEventListener("click", () => openUpiApp("phonepe"));
}
if (elements.payPaytmBtn) {
  elements.payPaytmBtn.addEventListener("click", () => openUpiApp("paytm"));
}
if (elements.payAnyUpiBtn) {
  elements.payAnyUpiBtn.addEventListener("click", () => openUpiApp("any"));
}
  }
  if (elements.upiPayBtn) {
    elements.upiPayBtn.addEventListener("click", handleUpiPay);
  }

  if (elements.clearCartBtn) {
    elements.clearCartBtn.addEventListener("click", clearCart);
  }
  if (elements.printBillBtn) {
    elements.printBillBtn.addEventListener("click", printBill);
  }

  if (elements.preorderForm) {
    elements.preorderForm.addEventListener("submit", handlePreorderSubmit);
  }

  // Admin actions
  if (elements.adminLoginBtn) {
    elements.adminLoginBtn.addEventListener("click", unlockAdmin);
  }
  if (elements.adminLogoutBtn) {
    elements.adminLogoutBtn.addEventListener("click", lockAdmin);
  }
  if (elements.menuForm) {
    elements.menuForm.addEventListener("submit", handleMenuSubmit);
  }
  if (elements.menuCancelBtn) {
    elements.menuCancelBtn.addEventListener("click", resetMenuForm);
  }
  if (elements.refreshReportBtn) {
    elements.refreshReportBtn.addEventListener("click", renderReports);
  }
  if (elements.printReportBtn) {
    elements.printReportBtn.addEventListener("click", printReport);
  }
}

// ========================= QR / UPI =========================
function initializeQR() {
  if (!elements.qrCanvas) return;
  qrInstance = new QRious({
    element: elements.qrCanvas,
    size: 200,
    value: "",
  });
}

function handleGenerateQR() {
  if (cart.length === 0) {
    notify("Your cart is empty. Add items first.");
    return;
  }

  const amount = parseFloat(
    elements.grandAmount.textContent.replace("₹", "").trim()
  );
  if (!amount || isNaN(amount)) {
    notify("Amount is invalid.");
    return;
  }

  const orderId = `MTF-${Date.now()}`;

  // Save for app buttons
  lastUpiAmount = amount;
  lastOrderId = orderId;

  // Generic UPI string for QR
  const upiString = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(orderId)}`;

  qrInstance.value = upiString;
  elements.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    amount
  )}. Reference: ${orderId}`;

  // Show the UPI app buttons row
  if (elements.upiApps) {
    elements.upiApps.style.display = "block";
  }

  notify("QR code ready. You can scan or use a UPI app button.");
}


function handleUpiPay() {
  if (!lastUpiUrl) {
    notify("Generate the QR first.");
    return;
  }
  // This will open GPay / PhonePe / Paytm etc if installed
  window.location.href = lastUpiUrl;
}

// ========================= MENU =========================
function renderMenu() {
  if (!elements.menuGrid) return;

  elements.menuGrid.innerHTML = state.menu
    .map(
      (item) => `
      <article class="menu-card">
        <img src="${item.image}" alt="${item.name}">
        <div class="content">
          <div class="meta">
            <strong>${item.name}</strong>
            <span>${formatCurrency(Number(item.price))}</span>
          </div>
          <p>${item.description || "Freshly prepared every day."}</p>
          <button class="btn filled" data-action="add-to-cart" data-id="${item.id}">
            Add to cart
          </button>
        </div>
      </article>
    `
    )
    .join("");
}

function onMenuClick(event) {
  const button = event.target.closest("[data-action='add-to-cart']");
  if (!button) return;
  const itemId = button.dataset.id;
  const menuItem = state.menu.find((m) => m.id === itemId);
  if (!menuItem) return;

  const existing = state.cart.find((c) => c.id === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: Number(menuItem.price),
      description: menuItem.description,
      quantity: 1,
    });
  }
  persistCart();
  renderCart();
  updateTotals();
  notify(`${menuItem.name} added to cart.`);
}

// ========================= CART =========================
function renderCart() {
  if (!elements.cartTableBody) return;

  if (!state.cart.length) {
    elements.cartTableBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
    return;
  }

  elements.cartTableBody.innerHTML = state.cart
    .map(
      (item) => `
      <tr data-id="${item.id}">
        <td>
          <strong>${item.name}</strong>
          <br><small>${item.description || ""}</small>
        </td>
        <td class="num">
          <input type="number" class="qty-input" min="1" value="${item.quantity}">
        </td>
        <td class="num">${formatCurrency(item.price)}</td>
        <td class="num">${formatCurrency(item.price * item.quantity)}</td>
        <td class="num">
          <button class="btn ghost sm" data-action="remove-item">Remove</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function onCartQuantityChange(event) {
  if (!event.target.classList.contains("qty-input")) return;
  const row = event.target.closest("tr");
  const id = row?.dataset.id;
  const item = state.cart.find((c) => c.id === id);
  if (!item) return;

  const value = Math.max(1, Number(event.target.value) || 1);
  item.quantity = value;
  persistCart();
  renderCart();
  updateTotals();
}

function onCartActionClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "remove-item") {
    const id = button.closest("tr")?.dataset.id;
    state.cart = state.cart.filter((item) => item.id !== id);
    persistCart();
    renderCart();
    updateTotals();
    notify("Item removed from cart.");
  }
}

function clearCart() {
  if (!state.cart.length) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear all items from cart?")) return;
  state.cart = [];
  persistCart();
  renderCart();
  updateTotals();
  notify("Cart cleared.");
}

// ========================= TOTALS =========================
function calculateSubtotal() {
  return state.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

function calculateDeliveryFee() {
  const distance = Math.max(0, Number(elements.distanceInput?.value) || 0);
  for (const rule of DELIVERY_RULES) {
    if (distance <= rule.max) return rule.fee;
  }
  return 0;
}

function updateTotals() {
  if (!elements.subtotal || !elements.delivery || !elements.grand) return;

  const subtotal = calculateSubtotal();
  const isDelivery = currentOrderType() === "delivery";
  const deliveryFee = subtotal && isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + deliveryFee;

  elements.subtotal.textContent = formatCurrency(subtotal);
  elements.delivery.textContent = formatCurrency(deliveryFee);
  elements.grand.textContent = formatCurrency(total);
}

// ========================= ORDER MODE =========================
function syncModePanels() {
  if (!elements.payNowPanel || !elements.preorderPanel) return;

  const mode = currentOrderMode();
  const orderType = currentOrderType();

  if (elements.deliverySection) {
    elements.deliverySection.style.display =
      orderType === "delivery" ? "block" : "none";
  }

  elements.payNowPanel.style.display = mode === "pay-now" ? "block" : "none";
  elements.preorderPanel.style.display =
    mode === "preorder" ? "block" : "none";
}

// ========================= FINALIZE ORDER =========================
function finalizeOrder(mode) {
  if (!ensureCartNotEmpty()) return;

  const orderType = currentOrderType();
  const subtotal = calculateSubtotal();
  const isDelivery = orderType === "delivery";
  const deliveryFee = isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + deliveryFee;

  const deliveryInfo = isDelivery
    ? {
        distance: Number(elements.distanceInput?.value) || 0,
        address: elements.deliveryAddress?.value.trim() || "",
      }
    : null;

  const record = {
    id: generateId(mode),
    timestamp: Date.now(),
    mode,
    orderType,
    subtotal,
    deliveryFee,
    total,
    deliveryInfo,
    items: state.cart.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  };

  state.sales.push(record);
  persistSales();

  notify(
    mode === "pay-now"
      ? "Payment recorded. Thank you!"
      : "Preorder saved. Pay at counter / on delivery."
  );

  state.cart = [];
  persistCart();
  renderCart();
  updateTotals();
  if (elements.reportMonth) {
    renderReports();
  }
}

// ========================= PREORDER =========================
function handlePreorderSubmit(event) {
  event.preventDefault();
  finalizeOrder("preorder");
}

// ========================= PRINT BILL =========================
function printBill() {
  if (!ensureCartNotEmpty()) return;

  const orderType = currentOrderType();
  const isDelivery = orderType === "delivery";
  const subtotal = calculateSubtotal();
  const delivery = isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + delivery;
  const deliveryAddr = isDelivery
    ? elements.deliveryAddress?.value.trim() || "Not provided"
    : "—";

  const rows = state.cart
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${formatCurrency(item.price * item.quantity)}</td>
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
        <p><strong>Order type:</strong> ${isDelivery ? "Delivery" : "Spot pickup"}</p>
        <p><strong>Delivery address:</strong> ${deliveryAddr}</p>
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
  `;

  const win = window.open("", "_blank", "width=800,height=600");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ========================= ADMIN =========================
function unlockAdmin() {
  if (!elements.adminPassword) return;
  if (elements.adminPassword.value === ADMIN_PASSWORD) {
    state.adminUnlocked = true;
    if (elements.adminLoginCard) elements.adminLoginCard.style.display = "none";
    if (elements.adminDashboard)
      elements.adminDashboard.classList.remove("hidden");
    notify("Admin dashboard unlocked.");
    renderManageTable();
    if (elements.reportMonth) {
      setupInitialReportMonth();
      renderReports();
    }
  } else {
    notify("Incorrect password.");
  }
}

function lockAdmin() {
  state.adminUnlocked = false;
  if (elements.adminDashboard)
    elements.adminDashboard.classList.add("hidden");
  if (elements.adminLoginCard) elements.adminLoginCard.style.display = "block";
  if (elements.adminPassword) elements.adminPassword.value = "";
}

function handleMenuSubmit(event) {
  event.preventDefault();
  if (!elements.menuName || !elements.menuPrice) return;

  const payload = {
    name: elements.menuName.value.trim(),
    price: Number(elements.menuPrice.value),
    image:
      elements.menuImage?.value.trim() ||
      "https://via.placeholder.com/600x400?text=Tiffin",
    description: elements.menuDescription?.value.trim() || "",
  };

  if (!payload.name || !payload.price) {
    notify("Provide name and price.");
    return;
  }

  if (elements.menuId && elements.menuId.value) {
    const existing = state.menu.find((item) => item.id === elements.menuId.value);
    if (existing) {
      Object.assign(existing, payload);
      notify("Menu item updated.");
    }
  } else {
    state.menu.push({
      id: generateId("menu"),
      ...payload,
    });
    notify("Menu item added.");
  }

  persistMenu();
  if (elements.menuGrid) renderMenu();
  renderManageTable();
  resetMenuForm();
}

function renderManageTable() {
  if (!elements.manageTableBody) return;

  elements.manageTableBody.innerHTML = state.menu
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${formatCurrency(Number(item.price))}</td>
        <td>${new Date().toLocaleDateString()}</td>
        <td>
          <button class="btn ghost sm" data-action="edit-menu" data-id="${item.id}">Edit</button>
          <button class="btn filled sm" data-action="delete-menu" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  elements.manageTableBody
    .querySelectorAll("button[data-action]")
    .forEach((btn) => {
      btn.addEventListener("click", (event) => {
        const id = event.currentTarget.dataset.id;
        const action = event.currentTarget.dataset.action;
        if (action === "edit-menu") {
          startMenuEdit(id);
        } else if (action === "delete-menu") {
          deleteMenuItem(id);
        }
      });
    });
}

function startMenuEdit(id) {
  const item = state.menu.find((entry) => entry.id === id);
  if (!item || !elements.menuId) return;
  elements.menuId.value = item.id;
  if (elements.menuName) elements.menuName.value = item.name;
  if (elements.menuPrice) elements.menuPrice.value = item.price;
  if (elements.menuImage) elements.menuImage.value = item.image;
  if (elements.menuDescription) elements.menuDescription.value = item.description;
  if (elements.menuSubmitBtn) elements.menuSubmitBtn.textContent = "Update item";
  if (elements.menuCancelBtn) elements.menuCancelBtn.style.display = "block";
}
function buildUpiParams(amount, orderId) {
  return `pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${encodeURIComponent(amount)}&tn=${encodeURIComponent(orderId)}`;
}

function openUpiApp(app) {
  if (!lastUpiAmount || !lastOrderId) {
    notify("Please generate the QR first.");
    return;
  }

  const params = buildUpiParams(lastUpiAmount, lastOrderId);
  let url = "";

  switch (app) {
    case "gpay":
      // Google Pay
      url = `tez://upi/pay?${params}`;
      break;
    case "phonepe":
      // PhonePe
      url = `phonepe://upi/pay?${params}`;
      break;
    case "paytm":
      // Paytm
      url = `paytmmp://pay?${params}`;
      break;
    default:
      // Other UPI apps (will open your default UPI like BHIM / WhatsApp Pay etc.)
      url = `upi://pay?${params}`;
  }

  // Try to open the app
  window.location.href = url;
}

function resetMenuForm() {
  if (!elements.menuForm || !elements.menuId) return;
  elements.menuForm.reset();
  elements.menuId.value = "";
  if (elements.menuSubmitBtn) elements.menuSubmitBtn.textContent = "Add item";
  if (elements.menuCancelBtn) elements.menuCancelBtn.style.display = "none";
}

function deleteMenuItem(id) {
  if (!confirm("Delete this menu item?")) return;
  state.menu = state.menu.filter((item) => item.id !== id);
  persistMenu();
  if (elements.menuGrid) renderMenu();
  renderManageTable();
  notify("Menu item removed.");
}

// ========================= REPORTS =========================
function setupInitialReportMonth() {
  if (!elements.reportMonth) return;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  elements.reportMonth.value = month;
}

function renderReports() {
  if (!elements.reportTableBody || !elements.reportMonth) return;

  const filter = elements.reportMonth.value;
  const rows = state.sales.filter((record) => {
    if (!filter) return true;
    const date = new Date(record.timestamp);
    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
    return monthKey === filter;
  });

  elements.reportTableBody.innerHTML = rows.length
    ? rows
        .map((record) => {
          const date = new Date(record.timestamp).toLocaleString();
          const modeLabel =
            record.mode === "preorder" ? "Preorder" : "Pay now";
          const typeLabel =
            record.orderType === "delivery" ? "Delivery" : "Pickup";
          const itemSummary = record.items
            .map((item) => `${item.name} x${item.quantity}`)
            .join(", ");
          return `
            <tr>
              <td>${date}</td>
              <td>${modeLabel} / ${typeLabel}</td>
              <td>${itemSummary}</td>
              <td>${formatCurrency(record.total)}</td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="4" class="empty">No records for this month.</td></tr>';

  const totals = rows.reduce(
    (acc, record) => {
      acc.orders += 1;
      acc.revenue += record.total;
      acc.delivery += record.deliveryFee || 0;
      if (record.mode === "preorder") acc.preorders += 1;
      else acc.payNow += 1;
      return acc;
    },
    { orders: 0, revenue: 0, delivery: 0, preorders: 0, payNow: 0 }
  );

  if (elements.reportOrders)
    elements.reportOrders.textContent = totals.orders;
  if (elements.reportRevenue)
    elements.reportRevenue.textContent = formatCurrency(totals.revenue);
  if (elements.reportDelivery)
    elements.reportDelivery.textContent = formatCurrency(totals.delivery);
  if (elements.reportModeBreakdown)
    elements.reportModeBreakdown.textContent = `${totals.payNow} pay-now / ${totals.preorders} preorder`;
}

function printReport() {
  if (!state.sales.length) {
    notify("No sales to print.");
    return;
  }

  if (!elements.reportMonth || !elements.reportTableBody) return;

  const monthLabel = elements.reportMonth.value || "All months";
  const rows = elements.reportTableBody.innerHTML;

  const html = `
    <html>
      <head>
        <title>Sales Report - ${monthLabel}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f9f2ea; }
        </style>
      </head>
      <body>
        <h1>Murugammal Tiffin Center - Monthly Report</h1>
        <p>Period: ${monthLabel}</p>
        <table>
          <thead>
            <tr><th>Date</th><th>Mode / Type</th><th>Items</th><th>Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
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
