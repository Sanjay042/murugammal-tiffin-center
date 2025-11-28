// --------- STORAGE KEYS ----------
const STORAGE_KEYS = {
  menu: "mtc_menu_items",
  cart: "mtc_cart",
  sales: "mtc_sales_records",
};

const LEGACY_KEYS = {
  menu: "menuItems",
  cart: "cartItems",
  sales: "salesData",
};

// --------- CONSTANTS ----------
const ADMIN_PASSWORD = "63695599";
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";

const DELIVERY_RULES = [
  { max: 100, fee: 10 },
  { max: 500, fee: 15 },
  { max: 1000, fee: 20 },
  { max: Infinity, fee: 25 },
];

// --------- DEFAULT MENU ----------
const DEFAULT_MENU = [
  {
    id: "idly",
    name: "Plain Idly",
    price: 2.5,   // 1 piece
    description: "Steamed rice cakes with coconut chutney and red chutney.",
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
    id: "full-boil",
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

// --------- APP STATE ----------
const state = {
  menu: [],
  cart: [],
  sales: [],
  adminUnlocked: false,
};

const elements = {};
let qrInstance;

// --------- BOOTSTRAP ----------
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bootstrapState();
  attachEvents();
  initializeQR();
  renderMenu();
  renderCart();
  updateTotals();
  renderManageTable();
  setupInitialReportMonth();
  renderReports();
  syncModePanels();
});

// --------- DOM CACHE ----------
function cacheDom() {
  elements.menuGrid = document.getElementById("menu-grid");
  elements.cartTableBody = document.getElementById("cart-table-body");
  elements.cartCount = document.getElementById("cart-count-pill");

  // Delivery related
  elements.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  elements.deliverySection = document.getElementById("delivery-section");
  elements.distanceInput = document.getElementById("delivery-distance");
  elements.deliveryAddress = document.getElementById("delivery-address");

  // Totals
  elements.subtotal = document.getElementById("subtotal-amount");
  elements.delivery = document.getElementById("delivery-amount");
  elements.grand = document.getElementById("grand-amount");

  // Order mode
  elements.orderModes = document.querySelectorAll('input[name="order-mode"]');
  elements.payNowPanel = document.getElementById("pay-now-panel");
  elements.preorderPanel = document.getElementById("preorder-panel");

  // Buttons / forms
  elements.generateQRBtn = document.getElementById("generate-qr-btn");
  elements.paymentDoneBtn = document.getElementById("payment-done-btn");
  elements.clearCartBtn = document.getElementById("clear-cart-btn");
  elements.printBillBtn = document.getElementById("print-bill-btn");
  elements.preorderForm = document.getElementById("preorder-form");

  // QR
  elements.qrCanvas = document.getElementById("qr-canvas");
  elements.qrNote = document.getElementById("qr-note");

  // Toast
  elements.toast = document.getElementById("toast");

  // Admin
  elements.adminPassword = document.getElementById("admin-password");
  elements.adminLoginBtn = document.getElementById("admin-login-btn");
  elements.adminLogoutBtn = document.getElementById("admin-logout-btn");
  elements.adminLoginCard = document.getElementById("admin-login");
  elements.adminDashboard = document.getElementById("admin-dashboard");
  elements.menuForm = document.getElementById("menu-form");
  elements.menuCancelBtn = document.getElementById("menu-cancel-btn");
  elements.menuSubmitBtn = document.getElementById("menu-submit-btn");
  elements.manageTableBody = document.getElementById("manage-table-body");

  // Reports
  elements.reportMonth = document.getElementById("report-month");
  elements.refreshReportBtn = document.getElementById("refresh-report-btn");
  elements.printReportBtn = document.getElementById("print-report-btn");
  elements.reportOrders = document.getElementById("report-orders");
  elements.reportRevenue = document.getElementById("report-revenue");
  elements.reportDelivery = document.getElementById("report-delivery");
  elements.reportModeBreakdown = document.getElementById("report-mode-breakdown");
  elements.reportTableBody = document.getElementById("report-table-body");
}

// --------- STATE BOOTSTRAP ----------
function bootstrapState() {
  // Always use your latest DEFAULT_MENU
  state.menu = DEFAULT_MENU;

  state.cart =
    loadFromStorage(STORAGE_KEYS.cart) ||
    loadFromStorage(LEGACY_KEYS.cart) ||
    [];

  state.sales =
    loadFromStorage(STORAGE_KEYS.sales) ||
    loadFromStorage(LEGACY_KEYS.sales) ||
    [];

  persistMenu();
  persistCart();
  persistSales();
}

// --------- EVENT WIRING ----------
function attachEvents() {
  elements.menuGrid.addEventListener("click", onMenuClick);
  elements.cartTableBody.addEventListener("input", onCartQuantityChange);
  elements.cartTableBody.addEventListener("click", onCartActionClick);

  // Delivery & order type
  elements.orderTypeRadios.forEach(radio =>
    radio.addEventListener("change", () => {
      syncModePanels();
      updateTotals();
    })
  );
  elements.distanceInput.addEventListener("input", updateTotals);
  elements.deliveryAddress.addEventListener("input", () => { /* just stored for bill & reports */ });

  // Order mode
  elements.orderModes.forEach(radio =>
    radio.addEventListener("change", syncModePanels)
  );

  // Pay now / actions
  elements.generateQRBtn.addEventListener("click", handleGenerateQR);
  elements.paymentDoneBtn.addEventListener("click", () =>
    finalizeOrder("pay-now")
  );
  elements.clearCartBtn.addEventListener("click", clearCart);
  elements.printBillBtn.addEventListener("click", printBill);

  // Preorder
  elements.preorderForm.addEventListener("submit", handlePreorderSubmit);

  // Admin
  elements.adminLoginBtn.addEventListener("click", unlockAdmin);
  elements.adminLogoutBtn.addEventListener("click", lockAdmin);
  elements.menuForm.addEventListener("submit", handleMenuSubmit);
  elements.menuCancelBtn.addEventListener("click", resetMenuForm);

  // Reports
  elements.refreshReportBtn.addEventListener("click", renderReports);
  elements.printReportBtn.addEventListener("click", printReport);
}

// --------- HELPERS ----------
function initializeQR() {
  qrInstance = new QRious({
    element: elements.qrCanvas,
    size: 180,
    value: "",
  });
}

// show ₹2.5 for decimals and ₹8 for whole numbers
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return num % 1 === 0 ? `₹${num.toFixed(0)}` : `₹${num.toFixed(1)}`;
};

const notify = (message) => {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(elements.toast._timeout);
  elements.toast._timeout = setTimeout(
    () => elements.toast.classList.remove("show"),
    2600
  );
};

const currentOrderMode = () =>
  Array.from(elements.orderModes).find((radio) => radio.checked)?.value ||
  "pay-now";

const currentOrderType = () =>
  Array.from(elements.orderTypeRadios).find(r => r.checked)?.value || "pickup";

const generateId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Storage parse error", err);
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

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = count
    ? `${count} item${count > 1 ? "s" : ""}`
    : "0 items";
}

// --------- MENU RENDER ----------
function renderMenu() {
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
            <button class="btn filled" data-action="add-to-cart" data-id="${
              item.id
            }">
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
  const menuItem = state.menu.find((item) => item.id === itemId);
  if (!menuItem) return;

  const existing = state.cart.find((item) => item.id === itemId);
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

// --------- CART RENDER ----------
function renderCart() {
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
            <input type="number" class="qty-input" min="1" value="${
              item.quantity
            }">
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
  if (!state.cart.length) return;
  if (!confirm("Clear all items from cart?")) return;
  state.cart = [];
  persistCart();
  renderCart();
  updateTotals();
  notify("Cart cleared.");
}

// --------- TOTALS ----------
function calculateSubtotal() {
  return state.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

function calculateDeliveryFee() {
  const distance = Math.max(0, Number(elements.distanceInput.value) || 0);
  for (const bracket of DELIVERY_RULES) {
    if (distance <= bracket.max) return bracket.fee;
  }
  return 0;
}

function updateTotals() {
  const subtotal = calculateSubtotal();
  const isDelivery = currentOrderType() === "delivery";

  const deliveryFee = subtotal && isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + deliveryFee;

  elements.subtotal.textContent = formatCurrency(subtotal);
  elements.delivery.textContent = formatCurrency(deliveryFee);
  elements.grand.textContent = formatCurrency(total);
}

// --------- ORDER MODES & TYPE ----------
function syncModePanels() {
  const mode = currentOrderMode();
  const orderType = currentOrderType();

  // Show/hide delivery fields
  elements.deliverySection.style.display =
    orderType === "delivery" ? "block" : "none";

  // Pay now panel only when: Pay-now + Spot pickup
  elements.payNowPanel.style.display =
    mode === "pay-now" && orderType === "pickup" ? "block" : "none";

  // Preorder panel only when preorder is selected
  elements.preorderPanel.style.display =
    mode === "preorder" ? "block" : "none";
}

function ensureCartNotEmpty() {
  if (!state.cart.length) {
    notify("Add at least one item before continuing.");
    return false;
  }
  return true;
}

// --------- PAY NOW / QR ----------
function handleGenerateQR() {
  if (!ensureCartNotEmpty()) return;

  const mode = currentOrderMode();
  const orderType = currentOrderType();

  // QR only for pay-now + pickup
  if (mode !== "pay-now" || orderType !== "pickup") {
    notify("QR is only for Pay now + Spot pickup orders.");
    return;
  }

  const amount = calculateSubtotal(); // no delivery fee for pickup
  if (!amount) {
    notify("Amount is zero.");
    return;
  }

  const orderId = generateId("order");
  const upiString = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount}&tn=${encodeURIComponent(orderId)}`;

  qrInstance.value = upiString;
  elements.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    amount
  )}. Reference: ${orderId}`;
  notify("QR code ready. Please complete payment.");
}

function finalizeOrder(mode) {
  if (!ensureCartNotEmpty()) return;

  const orderType = currentOrderType();
  const subtotal = calculateSubtotal();
  const isDelivery = orderType === "delivery";
  const deliveryFee = isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + deliveryFee;

  const deliveryInfo = isDelivery
    ? {
        distance: Number(elements.distanceInput.value) || 0,
        address: elements.deliveryAddress.value.trim()
      }
    : null;

  const record = {
    id: generateId(mode),
    timestamp: Date.now(),
    mode,                // "pay-now" or "preorder"
    orderType,           // "pickup" or "delivery"
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
  renderReports();
}

// --------- PREORDER ----------
function handlePreorderSubmit(event) {
  event.preventDefault();
  if (!ensureCartNotEmpty()) return;

  const orderType = currentOrderType();
  const isDelivery = orderType === "delivery";

  const details = {
    name: document.getElementById("preorder-name").value.trim(),
    contact: document.getElementById("preorder-contact").value.trim(),
    arrivalTime: document.getElementById("preorder-time").value,
    notes: document.getElementById("preorder-notes").value.trim(),
  };

  const subtotal = calculateSubtotal();
  const deliveryFee = isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + deliveryFee;

  const deliveryInfo = isDelivery
    ? {
        distance: Number(elements.distanceInput.value) || 0,
        address: elements.deliveryAddress.value.trim()
      }
    : null;

  state.sales.push({
    id: generateId("preorder"),
    timestamp: Date.now(),
    mode: "preorder",
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
    preorderDetails: details,
  });

  persistSales();
  notify("Preorder logged. Pay when you reach the shop or on delivery.");
  event.target.reset();
  state.cart = [];
  persistCart();
  renderCart();
  updateTotals();
  renderReports();
}

// --------- PRINT BILL ----------
function printBill() {
  if (!ensureCartNotEmpty()) return;

  const orderType = currentOrderType();
  const isDelivery = orderType === "delivery";
  const deliveryAddr = isDelivery ? (elements.deliveryAddress.value.trim() || "Not provided") : "—";

  const subtotal = calculateSubtotal();
  const delivery = isDelivery ? calculateDeliveryFee() : 0;
  const total = subtotal + delivery;

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

  const printWindow = window.open("", "_blank", "width=800,height=600");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

// --------- ADMIN DASHBOARD ----------
function unlockAdmin() {
  if (elements.adminPassword.value === ADMIN_PASSWORD) {
    state.adminUnlocked = true;
    elements.adminLoginCard.style.display = "none";
    elements.adminDashboard.classList.remove("hidden");
    notify("Admin dashboard unlocked.");
    elements.menuCancelBtn.style.display = "none";
  } else {
    notify("Incorrect password.");
  }
}

function lockAdmin() {
  state.adminUnlocked = false;
  elements.adminDashboard.classList.add("hidden");
  elements.adminLoginCard.style.display = "block";
  elements.adminPassword.value = "";
}

function handleMenuSubmit(event) {
  event.preventDefault();
  const idField = document.getElementById("menu-id");
  const nameField = document.getElementById("menu-name");
  const priceField = document.getElementById("menu-price");
  const imageField = document.getElementById("menu-image");
  const descriptionField = document.getElementById("menu-description");

  const payload = {
    name: nameField.value.trim(),
    price: Number(priceField.value),
    image:
      imageField.value.trim() ||
      "https://via.placeholder.com/600x400?text=Tiffin",
    description: descriptionField.value.trim(),
  };

  if (!payload.name || !payload.price) {
    notify("Provide name and price.");
    return;
  }

  if (idField.value) {
    const existing = state.menu.find((item) => item.id === idField.value);
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
  renderMenu();
  renderManageTable();
  resetMenuForm();
}

function renderManageTable() {
  elements.manageTableBody.innerHTML = state.menu
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${formatCurrency(Number(item.price))}</td>
          <td>${new Date().toLocaleDateString()}</td>
          <td>
            <button class="btn ghost sm" data-action="edit-menu" data-id="${
              item.id
            }">Edit</button>
            <button class="btn filled sm" data-action="delete-menu" data-id="${
              item.id
            }">Delete</button>
          </td>
        </tr>
      `
    )
    .join("");

  elements.manageTableBody.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.dataset.id;
      if (event.currentTarget.dataset.action === "edit-menu") {
        startMenuEdit(id);
      } else {
        deleteMenuItem(id);
      }
    });
  });
}

function startMenuEdit(id) {
  const item = state.menu.find((entry) => entry.id === id);
  if (!item) return;
  document.getElementById("menu-id").value = item.id;
  document.getElementById("menu-name").value = item.name;
  document.getElementById("menu-price").value = item.price;
  document.getElementById("menu-image").value = item.image;
  document.getElementById("menu-description").value = item.description;
  elements.menuSubmitBtn.textContent = "Update item";
  elements.menuCancelBtn.style.display = "block";
}

function resetMenuForm() {
  elements.menuForm.reset();
  document.getElementById("menu-id").value = "";
  elements.menuSubmitBtn.textContent = "Add item";
  elements.menuCancelBtn.style.display = "none";
}

function deleteMenuItem(id) {
  if (!confirm("Delete this menu item?")) return;
  state.menu = state.menu.filter((item) => item.id !== id);
  persistMenu();
  renderMenu();
  renderManageTable();
  notify("Menu item removed.");
}

// --------- REPORTS ----------
function setupInitialReportMonth() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  elements.reportMonth.value = month;
}

function renderReports() {
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

  elements.reportOrders.textContent = totals.orders;
  elements.reportRevenue.textContent = formatCurrency(totals.revenue);
  elements.reportDelivery.textContent = formatCurrency(totals.delivery);
  elements.reportModeBreakdown.textContent = `${totals.payNow} pay-now / ${totals.preorders} preorder`;
}

function printReport() {
  if (!state.sales.length) {
    notify("No sales to print.");
    return;
  }

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
