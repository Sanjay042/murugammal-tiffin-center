// Murugammal Tiffin Center – customer side only

// ---------- CONFIG ----------
const UPI_ID = "sanjaychinnavan42-2@okicici";
const UPI_NAME = "Murugammal Tiffin Center";
const STORAGE_ORDERS = "mtc_orders_v1";

// Menu with your original prices
const MENU = [
  {
    id: "idly",
    name: "Plain Idly",
    taName: "இட்லி",
    price: 2.5,
    description: "Steamed rice cakes with coconut & red chutney.",
    image: "images/idly1.jpg",
  },
  {
    id: "dosa",
    name: "Crispy Dosa",
    taName: "தோசை",
    price: 8,
    description: "Golden dosa with sambar & chutneys.",
    image: "images/dosa1.jpg",
  },
  {
    id: "onion-dosa",
    name: "Onion Dosa",
    taName: "வெங்காய தோசை",
    price: 12,
    description: "Caramelised onion topping, extra crunch.",
    image: "images/od.jpg",
  },
  {
    id: "full-boil",
    name: "Pepper Egg",
    taName: "முழு முட்டை",
    price: 10,
    description: "Boiled egg with pepper & salt.",
    image: "images/boil1.jpg",
  },
  {
    id: "omelette",
    name: "Masala Omelette",
    taName: "முட்டை ஆம்லெட்",
    price: 15,
    description: "Two-egg omelette with onion & herbs.",
    image: "images/om123.jpg",
  },
  {
    id: "half-boil",
    name: "Half Boil",
    taName: "ஹாஃப் போயில்",
    price: 10,
    description: "Soft-boiled egg with pepper & salt.",
    image: "images/halfboil.jpg",
  },
  {
    id: "egg-dosa",
    name: "Egg Dosa",
    taName: "முட்டை தோசை",
    price: 15,
    description: "Dosa with beaten egg layer – protein rich.",
    image: "images/eggdosa1.jpg",
  },
];

// ---------- STATE ----------
let cart = [];
let qrInstance = null;
let lastUpiUrl = "";

const el = {};

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  wireEvents();
  renderMenu();
  renderCart();
  updateTotals();
  syncPanels();

  if (el.qrCanvas) {
    qrInstance = new QRious({
      element: el.qrCanvas,
      size: 200,
      value: "",
    });
  }
});

// ---------- DOM CACHE ----------
function cacheDom() {
  el.menuGrid = document.getElementById("menu-grid");

  el.cartBody = document.getElementById("cart-table-body");
  el.cartCount = document.getElementById("cart-count-pill");

  el.customerName = document.getElementById("customer-name");
  el.customerPhone = document.getElementById("customer-phone");

  el.orderTypeRadios = document.querySelectorAll('input[name="order-type"]');
  el.deliverySection = document.getElementById("delivery-section");
  el.deliveryDistance = document.getElementById("delivery-distance");
  el.deliveryAddress = document.getElementById("delivery-address");

  el.subtotal = document.getElementById("subtotal-amount");
  el.deliveryAmount = document.getElementById("delivery-amount");
  el.grandAmount = document.getElementById("grand-amount");

  el.orderModeRadios = document.querySelectorAll('input[name="order-mode"]');
  el.payNowPanel = document.getElementById("pay-now-panel");
  el.preorderPanel = document.getElementById("preorder-panel");

  el.qrCanvas = document.getElementById("qr-canvas");
  el.qrNote = document.getElementById("qr-note");
  el.generateQrBtn = document.getElementById("generate-qr-btn");

  el.upiApps = document.getElementById("upi-apps");
  el.payGPay = document.getElementById("pay-gpay-btn");
  el.payPhonePe = document.getElementById("pay-phonepe-btn");
  el.payPaytm = document.getElementById("pay-paytm-btn");
  el.payAnyUpi = document.getElementById("pay-anyupi-btn");

  el.clearCartBtn = document.getElementById("clear-cart-btn");
  el.printBillBtn = document.getElementById("print-bill-btn");
  el.placeOrderBtn = document.getElementById("place-order-btn");

  el.preorderTime = document.getElementById("preorder-time");
  el.preorderNotes = document.getElementById("preorder-notes");

  el.toast = document.getElementById("toast");
}

// ---------- EVENTS ----------
function wireEvents() {
  // menu
  el.menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-id]");
    if (!btn) return;
    const id = btn.dataset.addId;
    const dish = MENU.find((m) => m.id === id);
    if (dish) {
      addToCart(dish);
    }
  });

  // cart quantity / remove
  el.cartBody.addEventListener("input", (e) => {
    if (!e.target.matches(".qty-input")) return;
    const row = e.target.closest("tr");
    const id = row?.dataset.id;
    const qty = Math.max(1, Number(e.target.value) || 1);
    updateCartQuantity(id, qty);
  });

  el.cartBody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-id]");
    if (!btn) return;
    const id = btn.dataset.removeId;
    removeFromCart(id);
  });

  // order type / delivery distance
  el.orderTypeRadios.forEach((r) =>
    r.addEventListener("change", () => {
      syncPanels();
      updateTotals();
    })
  );
  el.deliveryDistance.addEventListener("input", updateTotals);

  // order mode
  el.orderModeRadios.forEach((r) =>
    r.addEventListener("change", syncPanels)
  );

  // buttons
  el.clearCartBtn.addEventListener("click", clearCart);
  el.printBillBtn.addEventListener("click", printBill);
  el.placeOrderBtn.addEventListener("click", placeOrder);

  // payment
  el.generateQrBtn.addEventListener("click", handleGenerateQR);

  [el.payGPay, el.payPhonePe, el.payPaytm, el.payAnyUpi].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (!lastUpiUrl) {
        notify("Generate QR first, then tap the app button.");
        return;
      }
      // OS will open whichever UPI app supports upi://pay
      window.location.href = lastUpiUrl;
    });
  });
}

// ---------- MENU ----------
function renderMenu() {
  el.menuGrid.innerHTML = MENU.map((item) => {
    const price = formatCurrency(item.price);
    const ta = item.taName ? `<span class="ta-name">${item.taName}</span>` : "";
    return `
      <article class="menu-card">
        <img src="${item.image}" alt="${item.name}" />
        <div class="content">
          <div class="meta">
            <div>
              <strong>${item.name}</strong>
              ${ta}
            </div>
            <span>${price}</span>
          </div>
          <p>${item.description}</p>
          <button class="btn filled" data-add-id="${item.id}">Add to cart</button>
        </div>
      </article>
    `;
  }).join("");
}

// ---------- CART ----------
function addToCart(dish) {
  const existing = cart.find((c) => c.id === dish.id);
  if (existing) existing.qty += 1;
  else cart.push({ id: dish.id, name: dish.name, price: dish.price, qty: 1 });

  renderCart();
  updateTotals();
  notify(`${dish.name} added to cart.`);
}

function updateCartQuantity(id, qty) {
  const item = cart.find((c) => c.id === id);
  if (!item) return;
  item.qty = qty;
  renderCart();
  updateTotals();
}

function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== id);
  renderCart();
  updateTotals();
}

function clearCart() {
  if (!cart.length) {
    notify("Cart is already empty.");
    return;
  }
  if (!confirm("Clear all items from cart?")) return;
  cart = [];
  renderCart();
  updateTotals();
}

function renderCart() {
  if (!cart.length) {
    el.cartBody.innerHTML =
      '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
    el.cartCount.textContent = "0 items";
    return;
  }

  el.cartBody.innerHTML = cart
    .map((item) => {
      const line = item.price * item.qty;
      return `
        <tr data-id="${item.id}">
          <td>${item.name}</td>
          <td class="num">
            <input type="number" min="1" value="${item.qty}"
              class="qty-input">
          </td>
          <td class="num">${formatCurrency(item.price)}</td>
          <td class="num">${formatCurrency(line)}</td>
          <td class="num">
            <button class="btn ghost sm" data-remove-id="${item.id}">Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  el.cartCount.textContent =
    totalItems === 1 ? "1 item" : `${totalItems} items`;
}

// ---------- TOTALS & MODES ----------
function getOrderType() {
  const r = document.querySelector('input[name="order-type"]:checked');
  return r ? r.value : "pickup";
}

function getOrderMode() {
  const r = document.querySelector('input[name="order-mode"]:checked');
  return r ? r.value : "pay-now";
}

function calculateSubtotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function calculateDeliveryFee() {
  if (getOrderType() === "pickup") return 0;
  const d = Number(el.deliveryDistance.value) || 0;
  if (d <= 100) return 10;
  if (d <= 250) return 20;
  if (d <= 500) return 30;
  return 40;
}

function updateTotals() {
  const subtotal = calculateSubtotal();
  const delivery = cart.length ? calculateDeliveryFee() : 0;
  const total = subtotal + delivery;

  el.subtotal.textContent = formatCurrency(subtotal);
  el.deliveryAmount.textContent = formatCurrency(delivery);
  el.grandAmount.textContent = formatCurrency(total);
}

function syncPanels() {
  const type = getOrderType();
  const mode = getOrderMode();

  el.deliverySection.style.display = type === "delivery" ? "block" : "none";

  el.payNowPanel.style.display =
    mode === "pay-now" ? "block" : "none";
  el.preorderPanel.style.display =
    mode === "preorder" ? "block" : "none";
}

// ---------- PAYMENT ----------
function handleGenerateQR() {
  if (!ensureCartAndDetails()) return;

  const amount = calculateSubtotal() +
    (getOrderType() === "delivery" ? calculateDeliveryFee() : 0);

  if (!amount) {
    notify("Total amount is zero.");
    return;
  }

  const orderId = `MTF-${Date.now()}`;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(
    UPI_ID
  )}&pn=${encodeURIComponent(
    UPI_NAME
  )}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(orderId)}`;

  lastUpiUrl = upiUrl;

  if (qrInstance) {
    qrInstance.value = upiUrl;
  }
  el.qrNote.textContent = `Scan this QR to pay ${formatCurrency(
    amount
  )}. Ref: ${orderId}`;

  if (el.upiApps) el.upiApps.style.display = "block";

  notify("QR ready. If tap on app buttons doesn’t open payment, just scan the QR using any UPI app on another phone.");
}

// ---------- PLACE ORDER ----------
function ensureCartAndDetails() {
  if (!cart.length) {
    notify("Add at least one item to cart.");
    return false;
  }
  const name = el.customerName.value.trim();
  const phone = el.customerPhone.value.trim();
  if (!name || phone.length < 8) {
    notify("Enter your name and mobile number.");
    return false;
  }
  return true;
}

function placeOrder() {
  if (!ensureCartAndDetails()) return;

  const mode = getOrderMode();
  const type = getOrderType();

  const subtotal = calculateSubtotal();
  const delivery = calculateDeliveryFee();
  const total = subtotal + delivery;

  const orderId = `MTF-${Date.now()}`;

  const order = {
    id: orderId,
    customerName: el.customerName.value.trim(),
    customerPhone: el.customerPhone.value.trim(),
    orderType: type,        // pickup / delivery
    mode,                   // pay-now / preorder
    subtotal,
    delivery,
    total,
    address:
      type === "delivery" ? el.deliveryAddress.value.trim() : "",
    preorderTime: el.preorderTime?.value || "",
    notes: el.preorderNotes?.value.trim() || "",
    items: cart.map((c) => ({
      name: c.name,
      price: c.price,
      qty: c.qty,
    })),
    timestamp: Date.now(),
  };

  // Save to localStorage for admin page
  const existing =
    JSON.parse(localStorage.getItem(STORAGE_ORDERS) || "[]");
  existing.push(order);
  localStorage.setItem(STORAGE_ORDERS, JSON.stringify(existing));

  alert(
    `✅ Order placed!\n\nOrder ID: ${orderId}\nTotal: ${formatCurrency(
      total
    )}\n\nShow this screen at the shop.`
  );

  // reset cart, but keep customer details for next time
  cart = [];
  renderCart();
  updateTotals();
}

// ---------- PRINT BILL ----------
function printBill() {
  if (!cart.length) {
    notify("Cart is empty.");
    return;
  }

  const type = getOrderType();
  const subtotal = calculateSubtotal();
  const delivery = calculateDeliveryFee();
  const total = subtotal + delivery;

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
          .totals { margin-top: 16px; width: 260px; float: right; }
          .totals td { border: none; }
        </style>
      </head>
      <body>
        <h1>முருகம்மாள் காலை உணவகம்</h1>
        <p>${new Date().toLocaleString()}</p>
        <p><strong>Order type:</strong> ${
          type === "delivery" ? "Delivery" : "Pickup"
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
  `;

  const win = window.open("", "_blank", "width=800,height=600");
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ---------- HELPERS ----------
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return num % 1 === 0
    ? `₹${num.toFixed(0)}`
    : `₹${num.toFixed(1)}`;
}

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
