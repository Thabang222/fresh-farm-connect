// ============================================================
//  FRESH FARM CONNECT — ADMIN DELIVERY DASHBOARD
//  admin.js — Only accessible by you (the admin)
// ============================================================

// ⚠️  REPLACE WITH YOUR EMAIL ADDRESS
const ADMIN_EMAIL = 'thabangsereo07@';

// ============================================================
//  ADMIN AUTH — Check admin access on load
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user && session.user.email === ADMIN_EMAIL) {
    showDashboard(session.user);
  } else {
    showLoginScreen();
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user?.email === ADMIN_EMAIL) {
      showDashboard(session.user);
    } else if (event === 'SIGNED_OUT') {
      showLoginScreen();
    }
  });
});

async function adminLogin() {
  const email    = document.getElementById('admin-email')?.value?.trim();
  const password = document.getElementById('admin-password')?.value;
  const errEl    = document.getElementById('admin-login-error');
  const btn      = document.getElementById('admin-login-btn');

  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const { error } = await db.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Sign in to dashboard';

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    return;
  }

  // Check admin
  if (email !== ADMIN_EMAIL) {
    await db.auth.signOut();
    errEl.textContent = 'Access denied. Admin only.';
    errEl.style.display = 'block';
    return;
  }
}

async function adminSignOut() {
  await db.auth.signOut();
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('admin-login-screen').style.display = 'block';
  document.getElementById('admin-dashboard-screen').style.display = 'none';
}

function showDashboard(user) {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-dashboard-screen').style.display = 'block';
  document.getElementById('admin-nav-user').textContent = user.email;
  loadOrders();
  loadStats();
}

// ============================================================
//  SIDEBAR NAVIGATION
// ============================================================
function showAdminPage(name) {
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  document.getElementById('admin-page-' + name)?.classList.add('active');
  document.getElementById('sidebar-' + name)?.classList.add('active');

  if (name === 'orders')          loadOrders();
  if (name === 'active')          loadActiveDeliveries();
  if (name === 'completed')       loadCompletedOrders();
  if (name === 'earnings')        loadEarnings();
  if (name === 'farmers-admin')   loadFarmersAdmin();
}

// ============================================================
//  LOAD ALL ORDERS
// ============================================================
async function loadOrders() {
  const container = document.getElementById('orders-container');
  const statusFilter = document.getElementById('status-filter')?.value || 'all';

  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)">Loading orders...</div>';

  let query = db.from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: orders, error } = await query;

  if (error) {
    container.innerHTML = `<div style="color:#991b1b;padding:20px">Error loading orders: ${error.message}</div>`;
    return;
  }

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--gray-400)">
        <div style="font-size:48px;margin-bottom:12px">📦</div>
        <div style="font-size:16px;font-weight:500">No orders yet</div>
        <div style="font-size:13px;margin-top:6px">Orders will appear here when buyers place them</div>
      </div>`;
    return;
  }

  container.innerHTML = orders.map(order => renderOrderCard(order)).join('');
  loadStats(orders);
}

// ============================================================
//  RENDER ORDER CARD
// ============================================================
function renderOrderCard(order) {
  const shortId   = String(order.id).slice(0,8).toUpperCase();
  const date      = new Date(order.created_at).toLocaleString('en-ZA', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  const items     = (order.items || []).map(i => `${i.emoji || '🌱'} ${i.name} ×${i.qty}`).join(' · ');
  const statusMap = {
    pending:          { label: 'Pending',          class: 'badge-amber' },
    confirmed:        { label: 'Confirmed',         class: 'badge-blue' },
    collecting:       { label: 'Collecting',        class: 'badge-blue' },
    out_for_delivery: { label: 'Out for delivery',  class: 'badge-blue' },
    delivered:        { label: 'Delivered',         class: 'badge-green' },
    cancelled:        { label: 'Cancelled',         class: 'badge-red' },
  };
  const status   = statusMap[order.status] || { label: order.status, class: 'badge-blue' };
  const earnings = (Number(order.commission || 0) + Number(order.delivery_fee || 45)).toFixed(2);

  // Build route URL for Google Maps
  // Format: farmer location → buyer delivery address
  const farmerLocation  = encodeURIComponent('Vanderbijlpark, Vaal Region, South Africa');
  const buyerLocation   = encodeURIComponent(order.delivery_address || 'Vanderbijlpark, South Africa');
  const mapsRouteUrl    = `https://www.google.com/maps/dir/?api=1&origin=${farmerLocation}&destination=${buyerLocation}&travelmode=driving`;

  // WhatsApp message to buyer
  const buyerPhone   = (order.buyer_phone || '').replace(/\D/g, '');
  const waMessage    = encodeURIComponent(
    `Hi ${order.buyer_name || 'there'} 👋 Your Fresh Farm Connect order #${shortId} is on its way! Expected delivery: within 2 hours. - Fresh Farm Connect`
  );
  const waUrl = `https://wa.me/27${buyerPhone.replace(/^0/, '')}?text=${waMessage}`;

  // Next status button
  const nextStatus = {
    pending:          { label: '✅ Confirm order',      value: 'confirmed',        class: 'action-btn-green' },
    confirmed:        { label: '🚗 Start collecting',   value: 'collecting',       class: 'action-btn-amber' },
    collecting:       { label: '📦 Out for delivery',   value: 'out_for_delivery', class: 'action-btn-blue' },
    out_for_delivery: { label: '✅ Mark as delivered',  value: 'delivered',        class: 'action-btn-green' },
  };
  const next = nextStatus[order.status];

  return `
  <div class="order-card" id="order-${order.id}">
    <div class="order-card-header">
      <div>
        <span class="order-card-id">Order #${shortId}</span>
        <span class="badge ${status.class}" style="margin-left:10px">${status.label}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:600;color:var(--green-700)">You earn: R${earnings}</span>
        <span class="order-card-time">${date}</span>
      </div>
    </div>

    <div class="order-card-body">
      <!-- BUYER INFO -->
      <div class="order-card-section">
        <div class="order-section-label">📍 Deliver to (Buyer)</div>
        <div class="order-section-name">${order.buyer_name || 'Unknown buyer'}</div>
        <div class="order-section-detail">📞 ${order.buyer_phone || 'No phone'}</div>
        <div class="order-section-detail">✉️ ${order.buyer_email || ''}</div>
        <div class="order-section-detail" style="color:var(--green-700);font-weight:500">
          📍 ${order.delivery_address || 'No address provided'}
        </div>
      </div>

      <!-- ORDER ITEMS -->
      <div class="order-card-section">
        <div class="order-section-label">🛒 Items ordered</div>
        <div style="font-size:13px;color:var(--gray-700);line-height:1.8">${items}</div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--gray-100)">
          <div style="font-size:12px;color:var(--gray-500)">Subtotal: R${Number(order.subtotal || 0).toFixed(2)}</div>
          <div style="font-size:12px;color:var(--gray-500)">Commission (8%): R${Number(order.commission || 0).toFixed(2)}</div>
          <div style="font-size:12px;color:var(--gray-500)">Delivery fee: R${Number(order.delivery_fee || 45).toFixed(2)}</div>
          <div style="font-size:14px;font-weight:700;color:var(--gray-900);margin-top:4px">Total: R${Number(order.total || 0).toFixed(2)}</div>
        </div>
      </div>

      <!-- COLLECT FROM -->
      <div class="order-card-section">
        <div class="order-section-label">🏡 Collect from (Farmer)</div>
        <div class="order-section-name">Vaal Region Farm</div>
        <div class="order-section-detail">Exact location shown on Google Maps</div>
        <div style="margin-top:8px">
          <a href="${mapsRouteUrl}" target="_blank"
            style="display:inline-flex;align-items:center;gap:6px;background:#4285F4;color:#fff;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:500;text-decoration:none">
            🗺️ Get route on Google Maps
          </a>
        </div>
      </div>
    </div>

    <div class="order-card-footer">
      <div class="order-actions">
        ${next ? `<button class="action-btn ${next.class}" onclick="updateOrderStatus('${order.id}','${next.value}')">${next.label}</button>` : ''}
        ${order.buyer_phone ? `<a href="${waUrl}" target="_blank" class="action-btn action-btn-whatsapp">💬 WhatsApp buyer</a>` : ''}
        <button class="action-btn action-btn-gray" onclick="toggleOrderMap('${order.id}','${mapsRouteUrl}')">🗺️ Show map</button>
        ${order.status !== 'delivered' && order.status !== 'cancelled' ?
          `<button class="action-btn" style="background:var(--red-100);color:#991b1b" onclick="updateOrderStatus('${order.id}','cancelled')">✕ Cancel</button>` : ''}
      </div>
      <div style="font-size:12px;color:var(--gray-400)">
        Payment: ${order.payment_method || 'PayFast'}
      </div>
    </div>

    <!-- HIDDEN MAP SECTION -->
    <div id="map-section-${order.id}" style="display:none;padding:0 18px 14px">
      <div style="height:220px;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--gray-200)" id="map-div-${order.id}"></div>
    </div>
  </div>`;
}

// ============================================================
//  UPDATE ORDER STATUS
// ============================================================
async function updateOrderStatus(orderId, newStatus) {
  const { error } = await db
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (error) {
    showToast('Failed to update: ' + error.message, 'error');
    return;
  }

  const statusLabels = {
    confirmed:        '✅ Order confirmed',
    collecting:       '🚗 Collecting from farmer',
    out_for_delivery: '📦 Out for delivery',
    delivered:        '✅ Delivered successfully!',
    cancelled:        'Order cancelled',
  };

  showToast(statusLabels[newStatus] || 'Status updated', 'success');
  loadOrders();
  loadStats();
}

// ============================================================
//  SHOW/HIDE ROUTE MAP IN ORDER CARD
// ============================================================
function toggleOrderMap(orderId, routeUrl) {
  const section = document.getElementById('map-section-' + orderId);
  if (!section) return;

  if (section.style.display === 'none') {
    section.style.display = 'block';
    const mapDiv = document.getElementById('map-div-' + orderId);
    if (mapDiv && window.google) {
      initOrderMap(mapDiv, orderId);
    } else {
      mapDiv.innerHTML = `
        <div style="height:100%;background:#e8f5e9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
          <div style="font-size:24px">🗺️</div>
          <div style="font-size:12px;color:var(--gray-600)">Google Maps API not loaded</div>
          <a href="${routeUrl}" target="_blank" style="font-size:12px;color:var(--green-700);font-weight:500">Open in Google Maps →</a>
        </div>`;
    }
  } else {
    section.style.display = 'none';
  }
}

function initOrderMap(container, orderId) {
  // Center on Vanderbijlpark
  const map = new google.maps.Map(container, {
    center: { lat: -26.7069, lng: 27.8543 },
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
  });

  // Add Vanderbijlpark center marker as farm pickup point
  new google.maps.Marker({
    position: { lat: -26.6800, lng: 27.8400 },
    map,
    title: 'Collect here',
    label: { text: 'F', color: '#fff' },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#16a34a',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
    },
  });
}

// ============================================================
//  LOAD STATS
// ============================================================
async function loadStats(orders) {
  if (!orders) {
    const { data } = await db.from('orders').select('*');
    orders = data || [];
  }

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);

  document.getElementById('stat-new').textContent =
    todayOrders.filter(o => o.status === 'pending').length;
  document.getElementById('stat-active').textContent =
    orders.filter(o => ['collecting','out_for_delivery','confirmed'].includes(o.status)).length;
  document.getElementById('stat-delivered').textContent =
    todayOrders.filter(o => o.status === 'delivered').length;

  const todayEarnings = todayOrders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.commission || 0) + Number(o.delivery_fee || 45), 0);
  document.getElementById('stat-earnings').textContent = 'R' + todayEarnings.toFixed(2);
}

// ============================================================
//  LOAD ACTIVE DELIVERIES
// ============================================================
async function loadActiveDeliveries() {
  const container = document.getElementById('active-container');
  const { data: orders } = await db
    .from('orders')
    .select('*')
    .in('status', ['confirmed', 'collecting', 'out_for_delivery'])
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--gray-400)">
        <div style="font-size:48px;margin-bottom:12px">🚗</div>
        <div style="font-size:16px;font-weight:500">No active deliveries</div>
        <div style="font-size:13px;margin-top:6px">Confirmed orders will appear here</div>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(o => renderOrderCard(o)).join('');
}

// ============================================================
//  LOAD COMPLETED ORDERS
// ============================================================
async function loadCompletedOrders() {
  const container = document.getElementById('completed-container');
  const { data: orders } = await db
    .from('orders')
    .select('*')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false });

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--gray-400)">
        <div style="font-size:48px;margin-bottom:12px">✅</div>
        <div style="font-size:16px;font-weight:500">No completed deliveries yet</div>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(o => renderOrderCard(o)).join('');
}

// ============================================================
//  LOAD EARNINGS
// ============================================================
async function loadEarnings() {
  const { data: orders } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (!orders) return;

  const delivered     = orders.filter(o => o.status === 'delivered');
  const totalDelivery = delivered.reduce((s,o) => s + Number(o.delivery_fee || 45), 0);
  const totalComm     = delivered.reduce((s,o) => s + Number(o.commission || 0), 0);
  const totalEarned   = totalDelivery + totalComm;

  document.getElementById('earn-delivery').textContent    = 'R' + totalDelivery.toFixed(2);
  document.getElementById('earn-commission').textContent  = 'R' + totalComm.toFixed(2);
  document.getElementById('earn-orders').textContent      = delivered.length;
  document.getElementById('earn-total').textContent       = 'R' + totalEarned.toFixed(2);

  const tbody = document.getElementById('earnings-table-body');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--gray-400)">No orders yet</td></tr>';
    return;
  }

  const statusColors = { pending:'badge-amber', confirmed:'badge-blue', collecting:'badge-blue', out_for_delivery:'badge-blue', delivered:'badge-green', cancelled:'badge-red' };

  tbody.innerHTML = orders.map(o => {
    const shortId   = String(o.id).slice(0,8).toUpperCase();
    const date      = new Date(o.created_at).toLocaleDateString('en-ZA');
    const comm      = Number(o.commission || 0).toFixed(2);
    const deliv     = Number(o.delivery_fee || 45).toFixed(2);
    const myTotal   = (Number(o.commission || 0) + Number(o.delivery_fee || 45)).toFixed(2);
    const sc        = statusColors[o.status] || 'badge-blue';
    return `<tr>
      <td style="font-weight:500">#${shortId}</td>
      <td>${date}</td>
      <td>R${Number(o.subtotal || 0).toFixed(2)}</td>
      <td style="color:var(--green-700)">R${comm}</td>
      <td style="color:var(--green-700)">R${deliv}</td>
      <td style="font-weight:700;color:var(--green-700)">R${myTotal}</td>
      <td><span class="badge ${sc}">${o.status}</span></td>
    </tr>`;
  }).join('');
}

// ============================================================
//  LOAD FARMERS LIST
// ============================================================
async function loadFarmersAdmin() {
  const container = document.getElementById('farmers-admin-container');

  const { data: farmers, error } = await db
    .from('farmers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !farmers || !farmers.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px;color:var(--gray-400)">
        <div style="font-size:48px;margin-bottom:12px">👨🏿‍🌾</div>
        <div style="font-size:16px;font-weight:500">No farmers registered yet</div>
        <div style="font-size:13px;margin-top:6px">Farmers will appear here when they sign up</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${farmers.map(f => `
        <div class="section-card">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;font-size:22px">${f.emoji || '👨🏿‍🌾'}</div>
            <div>
              <div style="font-weight:600;font-size:14px;color:var(--gray-900)">${f.name}</div>
              <div style="font-size:12px;color:var(--gray-500)">${f.farm_name}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px">📍 ${f.location || f.province || 'Vaal Region'}</div>
          <div style="font-size:12px;color:var(--gray-600);margin-bottom:4px">📞 ${f.phone || 'No phone'}</div>
          <div style="font-size:12px;color:var(--gray-600);margin-bottom:10px">✉️ ${f.email}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="badge ${f.verified ? 'badge-green' : 'badge-amber'}">${f.verified ? '✅ Verified' : '⏳ Pending'}</span>
            ${!f.verified ? `<button class="action-btn action-btn-green" onclick="verifyFarmer('${f.id}')">Verify farmer</button>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

async function verifyFarmer(id) {
  const { error } = await db.from('farmers').update({ verified: true }).eq('id', id);
  if (error) { showToast('Failed: ' + error.message, 'error'); return; }
  showToast('Farmer verified! ✅', 'success');
  loadFarmersAdmin();
}

// ============================================================
//  TOAST (reused from app.js pattern)
// ============================================================
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ============================================================
//  AUTO REFRESH every 60 seconds for new orders
// ============================================================
setInterval(() => {
  const activePage = document.querySelector('.admin-page.active')?.id;
  if (activePage === 'admin-page-orders') loadOrders();
  if (activePage === 'admin-page-active') loadActiveDeliveries();
}, 60000);
