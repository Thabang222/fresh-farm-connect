// DATA
const products = [
  {id:'1',name:'Roma Tomatoes',price:22,unit:'kg',farmer:'Green Valley Farm',location:'Mpumalanga',emoji:'🍅',stock:28,category:'Vegetables',organic:true},
  {id:'2',name:'Baby Spinach',price:35,unit:'bag',farmer:'Sunrise Organics',location:'KwaZulu-Natal',emoji:'🥬',stock:15,category:'Vegetables',organic:true},
  {id:'3',name:'Free-range Eggs',price:85,unit:'dozen',farmer:'Happy Hen Farm',location:'Western Cape',emoji:'🥚',stock:8,category:'Dairy',organic:false},
  {id:'4',name:'Strawberries',price:55,unit:'punnet',farmer:'Berry Bliss Farm',location:'Limpopo',emoji:'🍓',stock:20,category:'Fruits',organic:true},
  {id:'5',name:'Raw Honey',price:120,unit:'jar',farmer:'Golden Hive',location:'Gauteng',emoji:'🍯',stock:12,category:'Herbs',organic:true},
  {id:'6',name:'Butternut Squash',price:18,unit:'each',farmer:'Green Valley Farm',location:'Mpumalanga',emoji:'🎃',stock:30,category:'Vegetables',organic:false},
  {id:'7',name:'Avocados',price:12,unit:'each',farmer:'Avo Grove',location:'Limpopo',emoji:'🥑',stock:45,category:'Fruits',organic:true},
  {id:'8',name:'Fresh Milk',price:25,unit:'litre',farmer:'Meadow Dairy',location:'Free State',emoji:'🥛',stock:20,category:'Dairy',organic:false},
  {id:'9',name:'Sweet Corn',price:8,unit:'each',farmer:'Sunrise Organics',location:'KwaZulu-Natal',emoji:'🌽',stock:60,category:'Vegetables',organic:false},
  {id:'10',name:'Fresh Basil',price:25,unit:'bunch',farmer:'Herb Haven',location:'Gauteng',emoji:'🌿',stock:10,category:'Herbs',organic:true},
  {id:'11',name:'Wheat Flour',price:45,unit:'2kg bag',farmer:'Mill Stone Farm',location:'North West',emoji:'🌾',stock:25,category:'Grains',organic:false},
  {id:'12',name:'Peaches',price:40,unit:'kg',farmer:'Orchard Gold',location:'Western Cape',emoji:'🍑',stock:18,category:'Fruits',organic:false},
];

const farmers = [
  {name:'Thabo Nkosi',farm:'Green Valley Farm',location:'Vanderbijlpark, Vaal',emoji:'👨🏿‍🌾',tags:['Vegetables','Organic'],products:12,rating:4.9,since:2019},
  {name:'Amara Dlamini',farm:'Sunrise Organics',location:'Vereeniging, Vaal',emoji:'👩🏾‍🌾',tags:['Vegetables','Herbs','Organic'],products:8,rating:4.8,since:2021},
  {name:'Pieter van Wyk',farm:'Happy Hen Farm',location:'Meyerton, Vaal',emoji:'👨🏻‍🌾',tags:['Poultry','Eggs'],products:5,rating:5.0,since:2018},
  {name:'Nomsa Khumalo',farm:'Berry Bliss Farm',location:'Three Rivers, Vaal',emoji:'👩🏿‍🌾',tags:['Fruits','Berries'],products:6,rating:4.7,since:2020},
  {name:'Rajesh Pillay',farm:'Golden Hive',location:'Sebokeng, Vaal',emoji:'👨🏽‍🌾',tags:['Honey','Beeswax'],products:3,rating:4.9,since:2017},
  {name:'Maria Ferreira',farm:'Meadow Dairy',location:'Sasolburg, Vaal',emoji:'👩🏼‍🌾',tags:['Dairy','Organic'],products:7,rating:4.8,since:2016},
];

const farmerListings = [
  {emoji:'🍅',name:'Roma Tomatoes',stock:'28 kg in stock',price:'R22/kg',low:false},
  {emoji:'🥬',name:'Baby Spinach',stock:'15 bags in stock',price:'R35/bag',low:false},
  {emoji:'🥚',name:'Free-range Eggs',stock:'8 dozen remaining',price:'R85/doz',low:true},
  {emoji:'🌿',name:'Fresh Basil',stock:'3 bunches left',price:'R25/bunch',low:true},
];

let cart = [];
let activeFilter = 'All';
const COMMISSION_RATE = 0.08;
const DELIVERY_FEE = 45;

// PAGES
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  window.scrollTo(0,0);
  if (name === 'marketplace') renderProducts(products);
  if (name === 'home') renderFeatured();
  if (name === 'farmers') renderFarmers();
  if (name === 'cart') renderCart();
  if (name === 'checkout') renderCheckout();
  if (name === 'dashboard') renderDashboard();
  if (name === 'profile') renderProfilePage();
  // Init Google Maps for relevant pages
  if (typeof initMaps === 'function') {
    setTimeout(() => initMaps(name), 100);
  }
}

// PRODUCTS
function renderProductCard(p) {
  return `<div class="product-card" onclick="addToCart('${p.id}')">
    <div class="product-img-placeholder">${p.emoji}</div>
    <div class="product-body">
      <div class="product-cat">${p.category}${p.organic ? ' · Organic' : ''}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-farmer">by ${p.farmer} · ${p.location}</div>
      <div class="product-footer">
        <div><span class="product-price">R${p.price}</span><span class="product-unit"> / ${p.unit}</span></div>
        <button class="add-to-cart-btn" onclick="event.stopPropagation();addToCart('${p.id}')">+</button>
      </div>
      <div class="product-stock">${p.stock} ${p.unit}s available</div>
    </div>
  </div>`;
}

function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  const noResults = document.getElementById('no-results');
  if (!grid) return;
  grid.innerHTML = list.map(renderProductCard).join('');
  if (list.length === 0) { noResults.classList.remove('hidden'); grid.classList.add('hidden'); }
  else { noResults.classList.add('hidden'); grid.classList.remove('hidden'); }
}

function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  grid.innerHTML = products.slice(0,4).map(renderProductCard).join('');
}

function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterProducts();
}

function filterProducts() {
  const q = (document.getElementById('market-search')?.value || '').toLowerCase();
  const filtered = products.filter(p =>
    (activeFilter === 'All' || p.category === activeFilter) &&
    (p.name.toLowerCase().includes(q) || p.farmer.toLowerCase().includes(q))
  );
  renderProducts(filtered);
}

// FARMERS
function renderFarmers() {
  const grid = document.getElementById('farmers-grid');
  if (!grid) return;
  grid.innerHTML = farmers.map(f => `
    <div class="farmer-card">
      <div class="farmer-top">
        <div class="farmer-avatar">${f.emoji}</div>
        <div><div class="farmer-name">${f.name}</div><div class="farmer-farm">${f.farm}</div></div>
      </div>
      <div class="farmer-location">📍 ${f.location}</div>
      <div class="farmer-tags">${f.tags.map(t=>`<span class="farmer-tag">${t}</span>`).join('')}</div>
      <div class="farmer-stats">
        <div class="farmer-stat"><div class="farmer-stat-val">${f.products}</div><div class="farmer-stat-lbl">Products</div></div>
        <div class="farmer-stat"><div class="farmer-stat-val star">★ ${f.rating}</div><div class="farmer-stat-lbl">Rating</div></div>
        <div class="farmer-stat"><div class="farmer-stat-val">${f.since}</div><div class="farmer-stat-lbl">Since</div></div>
      </div>
    </div>`).join('');
}

// CART
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty++;
  else cart.push({...p, qty:1});
  updateCartBadge();
  showToast(p.emoji + ' ' + p.name + ' added to cart', 'success');
}

function updateCartBadge() {
  const total = cart.reduce((s,x) => s+x.qty, 0);
  const badge = document.getElementById('cart-badge');
  badge.textContent = total;
  total > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
}

function renderCart() {
  const empty = document.getElementById('cart-empty');
  const content = document.getElementById('cart-content');
  if (!empty || !content) return;
  if (cart.length === 0) {
    empty.classList.remove('hidden'); content.classList.add('hidden'); return;
  }
  empty.classList.add('hidden'); content.classList.remove('hidden');
  const subtotal = cart.reduce((s,x) => s + x.price * x.qty, 0);
  const commission = subtotal * COMMISSION_RATE;
  const total = subtotal + commission + DELIVERY_FEE;
  document.getElementById('cart-items-list').innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-farmer">by ${item.farmer}</div>
        <div class="cart-item-price">R${item.price} / ${item.unit}</div>
      </div>
      <div class="cart-item-actions">
        <button class="remove-btn" onclick="removeFromCart('${item.id}')">🗑</button>
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
        </div>
        <div style="font-size:14px;font-weight:600;color:var(--green-700)">R${item.price * item.qty}</div>
      </div>
    </div>`).join('');
  document.getElementById('sum-subtotal').textContent = 'R' + subtotal.toFixed(2);
  document.getElementById('sum-commission').textContent = 'R' + commission.toFixed(2);
  document.getElementById('sum-total').textContent = 'R' + total.toFixed(2);
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  updateCartBadge();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCartBadge();
  renderCart();
  showToast('Item removed', 'success');
}

function renderCheckout() {
  const subtotal = cart.reduce((s,x) => s + x.price * x.qty, 0);
  const commission = subtotal * COMMISSION_RATE;
  const total = subtotal + commission + DELIVERY_FEE;
  const items = document.getElementById('checkout-items');
  if (items) items.innerHTML = cart.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>${i.emoji} ${i.name} ×${i.qty}</span><span>R${i.price * i.qty}</span></div>`).join('');
  const coSub = document.getElementById('co-subtotal');
  const coCom = document.getElementById('co-commission');
  const coTot = document.getElementById('co-total');
  if (coSub) coSub.textContent = 'R' + subtotal.toFixed(2);
  if (coCom) coCom.textContent = 'R' + commission.toFixed(2);
  if (coTot) coTot.textContent = 'R' + total.toFixed(2);
}

async function placeOrder() {
  await saveOrder(cart);
  cart = [];
  updateCartBadge();
  showPage('confirmation');
  showToast('Order placed successfully!', 'success');
}

// DASHBOARD
function renderDashboard() {
  const list = document.getElementById('farmer-listings');
  if (!list) return;
  list.innerHTML = farmerListings.map(l => `
    <div class="listing-item">
      <div class="listing-emoji">${l.emoji}</div>
      <div class="listing-info">
        <div class="listing-name">${l.name}</div>
        <div class="listing-stock" style="${l.low?'color:var(--amber-500)':''}">${l.low?'⚠️ ':''} ${l.stock}</div>
      </div>
      <div class="listing-price">${l.price}</div>
      <div class="listing-actions">
        <button class="icon-btn" title="Edit">✏️</button>
        <button class="icon-btn btn-danger" title="Delete">🗑</button>
      </div>
    </div>`).join('');
}

async function addListing() {
  const name = document.getElementById('new-name')?.value;
  const emoji = document.getElementById('new-emoji')?.value || '🌱';
  const price = document.getElementById('new-price')?.value;
  const unit = document.getElementById('new-unit')?.value || 'kg';
  const stock = document.getElementById('new-stock')?.value;
  const category = document.getElementById('new-category')?.value;
  if (!name || !price) { showToast('Please fill in all required fields', 'error'); return; }

  const saved = await saveFarmerListing({name, emoji, price: parseInt(price), unit, stock: parseInt(stock)||0, category});
  if (!saved) return; // error already shown

  farmerListings.unshift({emoji, name, stock:`${stock} ${unit} in stock`, price:`R${price}/${unit}`, low:false});
  products.unshift({id: Date.now().toString(), name, price:parseInt(price), unit, farmer: currentProfile?.farm_name || 'Local Farm', location: currentProfile?.farm_location || 'South Africa', emoji, stock:parseInt(stock)||0, category, organic:false});
  closeModal();
  renderDashboard();
  showToast(emoji + ' ' + name + ' listed successfully!', 'success');
}

// AUTH
function toggleAuthRole(btn, role) {
  document.querySelectorAll('.auth-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const extra = document.getElementById('farmer-extra-fields');
  if (extra) role === 'farmer' ? extra.classList.remove('hidden') : extra.classList.add('hidden');
}

// PAYMENT
function selectPayment(el) {
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
}

// MODAL
function showModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}
function closeModal(e) {
  if (!e || e.target.classList.contains('modal-overlay')) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
}

// TOAST
function showToast(msg, type='') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// INIT
(async () => {
  await initAuth();
  // Try loading products from Supabase
  const dbProducts = await loadProducts();
  if (dbProducts && dbProducts.length > 0) {
    products.length = 0;
    dbProducts.forEach(p => products.push(p));
  }
  renderFeatured();
  renderFarmers();
  renderDashboard();
})();


// ============================================================
//  PROFILE PAGE
// ============================================================

function switchProfileTab(tab) {
  // Update menu items
  document.querySelectorAll('.profile-menu-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  // Show/hide panels
  ['orders','addresses','settings'].forEach(t => {
    const el = document.getElementById('profile-tab-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
  });
}

async function renderProfilePage() {
  if (!currentUser) { showPage('login'); return; }

  // Fill sidebar with real data
  document.getElementById('profile-display-name').textContent = currentProfile?.name || currentUser.email;
  document.getElementById('profile-display-email').textContent = currentProfile?.email || currentUser.email;
  document.getElementById('profile-avatar-icon').textContent = currentRole === 'farmer' ? '👨🏿‍🌾' : '👤';
  document.getElementById('profile-role-badge').textContent = currentRole === 'farmer' ? 'Farmer' : 'Verified buyer';

  // Pre-fill settings tab
  document.getElementById('settings-name').value = currentProfile?.name || '';
  document.getElementById('settings-email').value = currentProfile?.email || currentUser.email;
  document.getElementById('settings-phone').value = currentProfile?.phone || '';
  document.getElementById('settings-address').value = currentProfile?.delivery_address || '';
  document.getElementById('settings-province').value = currentProfile?.province || '';

  // Farmer extra fields
  const farmerFields = document.getElementById('farmer-settings-fields');
  if (currentRole === 'farmer') {
    farmerFields.classList.remove('hidden');
    document.getElementById('settings-farm-name').value = currentProfile?.farm_name || '';
    document.getElementById('settings-location').value = currentProfile?.location || '';
    document.getElementById('settings-what-they-grow').value = currentProfile?.what_they_grow || '';
  } else {
    farmerFields.classList.add('hidden');
  }

  // Load real orders
  await loadProfileOrders();

  // Default to orders tab
  switchProfileTab('orders');
}

async function loadProfileOrders() {
  const list = document.getElementById('orders-list');
  const badge = document.getElementById('orders-count-badge');
  if (!list) return;

  list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--gray-400)">Loading orders…</div>';

  const { data: orders, error } = await db
    .from('orders')
    .select('*')
    .eq('buyer_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error || !orders || orders.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px">
      <div style="font-size:36px;margin-bottom:12px">📦</div>
      <div style="font-size:15px;font-weight:600;color:var(--gray-900);margin-bottom:6px">No orders yet</div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:16px">Your orders will appear here once you place one.</div>
      <button class="btn btn-primary" onclick="showPage('marketplace')">Start shopping</button>
    </div>`;
    return;
  }

  // Show count badge
  badge.textContent = orders.length;
  badge.style.display = '';

  const statusColors = { pending: 'badge-blue', confirmed: 'badge-blue', delivered: 'badge-green', cancelled: 'badge-red' };
  const statusLabels = { pending: 'Pending', confirmed: 'In progress', delivered: 'Delivered', cancelled: 'Cancelled' };

  list.innerHTML = orders.map(o => {
    const itemNames = (o.items || []).map(i => i.name).slice(0,3).join(', ');
    const date = new Date(o.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
    const shortId = String(o.id).slice(0,8).toUpperCase();
    const statusClass = statusColors[o.status] || 'badge-blue';
    const statusLabel = statusLabels[o.status] || o.status;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--gray-50);border-radius:var(--radius-sm);margin-bottom:10px">
      <div>
        <div style="font-weight:600;font-size:14px;color:var(--gray-900)">#${shortId} — ${itemNames}</div>
        <div style="font-size:12px;color:var(--gray-500);margin-top:2px">${date}</div>
        <div style="font-size:13px;color:var(--green-700);margin-top:4px;font-weight:500">R${Number(o.total).toFixed(2)} total</div>
      </div>
      <span class="badge ${statusClass}">${statusLabel}</span>
    </div>`;
  }).join('');
}

async function saveAddressSettings() {
  if (!currentUser) return;
  const address  = document.getElementById('settings-address')?.value?.trim();
  const province = document.getElementById('settings-province')?.value;
  const phone    = document.getElementById('settings-phone')?.value?.trim();

  const table = currentRole === 'farmer' ? 'farmers' : 'buyers';
  const { error } = await db.from(table).update({ delivery_address: address, province, phone }).eq('id', currentUser.id);

  if (error) { showToast('Failed to save: ' + error.message, 'error'); return; }
  if (currentProfile) { currentProfile.delivery_address = address; currentProfile.province = province; currentProfile.phone = phone; }
  showToast('Address saved! ✅', 'success');
}

async function saveAccountSettings() {
  if (!currentUser) return;
  const name = document.getElementById('settings-name')?.value?.trim();
  if (!name) { showToast('Name cannot be empty', 'error'); return; }

  const updates = { name };
  if (currentRole === 'farmer') {
    updates.farm_name      = document.getElementById('settings-farm-name')?.value?.trim();
    updates.location       = document.getElementById('settings-location')?.value?.trim();
    updates.what_they_grow = document.getElementById('settings-what-they-grow')?.value?.trim();
  }

  const table = currentRole === 'farmer' ? 'farmers' : 'buyers';
  const { error } = await db.from(table).update(updates).eq('id', currentUser.id);

  if (error) { showToast('Failed to save: ' + error.message, 'error'); return; }
  if (currentProfile) Object.assign(currentProfile, updates);

  // Update nav name instantly
  const label = document.getElementById('nav-user-label');
  if (label) label.textContent = name.split(' ')[0];
  document.getElementById('profile-display-name').textContent = name;

  showToast('Account updated! ✅', 'success');
}

async function sendPasswordReset() {
  const email = currentUser?.email;
  if (!email) return;
  const { error } = await db.auth.resetPasswordForEmail(email);
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Password reset email sent to ' + email, 'success');
}
