// ============================================================
//  AUTH — SEPARATE BUYER / FARMER FLOWS
// ============================================================

function switchLoginTab(role) {
  const buyerTab   = document.getElementById('login-buyer-tab');
  const farmerTab  = document.getElementById('login-farmer-tab');
  const roleInput  = document.getElementById('login-role');
  if (!buyerTab || !farmerTab) return;
  if (role === 'buyer') {
    buyerTab.style.border  = '2px solid var(--green-600)';
    buyerTab.style.background = 'var(--green-50)';
    farmerTab.style.border = '2px solid var(--gray-200)';
    farmerTab.style.background = 'white';
  } else {
    farmerTab.style.border  = '2px solid var(--green-600)';
    farmerTab.style.background = 'var(--green-50)';
    buyerTab.style.border = '2px solid var(--gray-200)';
    buyerTab.style.background = 'white';
  }
  if (roleInput) roleInput.value = role;
}

async function handleBuyerSignup() {
  const name     = document.getElementById('buyer-signup-name')?.value?.trim();
  const email    = document.getElementById('buyer-signup-email')?.value?.trim();
  const phone    = document.getElementById('buyer-signup-phone')?.value?.trim();
  const password = document.getElementById('buyer-signup-password')?.value;
  if (!name || !email || !password) { showToast('Please fill in all required fields', 'error'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  const btn = document.getElementById('buyer-signup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  const { data, error } = await db.auth.signUp({
    email, password,
    options: { data: { role: 'buyer', name } }
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Create Buyer Account'; }
  if (error) { showToast(error.message, 'error'); return; }

  await new Promise(r => setTimeout(r, 800));
  if (phone && data.user?.id) {
    await db.from('buyers').update({ phone }).eq('id', data.user.id);
  }
  showToast('Welcome to Fresh Farm Connect! 🛒', 'success');
  showPage('marketplace');
}

async function handleFarmerSignup() {
  const name      = document.getElementById('farmer-signup-name')?.value?.trim();
  const email     = document.getElementById('farmer-signup-email')?.value?.trim();
  const phone     = document.getElementById('farmer-signup-phone')?.value?.trim();
  const farmName  = document.getElementById('farmer-signup-farm-name')?.value?.trim();
  const location  = document.getElementById('farmer-signup-location')?.value?.trim();
  const province  = document.getElementById('farmer-signup-province')?.value;
  const products  = document.getElementById('farmer-signup-products')?.value?.trim();
  const password  = document.getElementById('farmer-signup-password')?.value;

  if (!name || !email || !password || !farmName) { showToast('Please fill in all required fields', 'error'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }

  const btn = document.getElementById('farmer-signup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Registering…'; }

  const { data, error } = await db.auth.signUp({
    email, password,
    options: { data: { role: 'farmer', name, farm_name: farmName } }
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Register Farm'; }
  if (error) { showToast(error.message, 'error'); return; }

  await new Promise(r => setTimeout(r, 800));
  if (data.user?.id) {
    await db.from('farmers').update({
      phone: phone || null,
      location: location || null,
      province: province || null,
      what_they_grow: products || null,
    }).eq('id', data.user.id);
  }
  showToast('Farm registered! Welcome 👨🏿‍🌾', 'success');
  showPage('dashboard');
}

// ============================================================
//  FARMER DASHBOARD — upload products, view orders
// ============================================================
async function renderFarmerDashboard() {
  if (!currentUser || currentRole !== 'farmer') return;

  // Fill farm info
  const nameEl = document.getElementById('farmer-dash-name');
  const farmEl = document.getElementById('farmer-dash-farm');
  const locEl  = document.getElementById('farmer-dash-location');
  if (nameEl) nameEl.textContent = currentProfile?.name || 'Farmer';
  if (farmEl) farmEl.textContent = currentProfile?.farm_name || 'My Farm';
  if (locEl)  locEl.textContent  = currentProfile?.location || 'Vaal Region';

  // Load farmer's own products from Supabase
  const { data: myProducts } = await db
    .from('products')
    .select('*')
    .eq('farmer_id', currentUser.id)
    .order('created_at', { ascending: false });

  const listEl = document.getElementById('farmer-products-list');
  if (listEl) {
    if (!myProducts || myProducts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--gray-400)">No products yet. Add your first listing below.</div>';
    } else {
      listEl.innerHTML = myProducts.map(p => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--gray-50);border-radius:var(--radius-sm);margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">${p.emoji || '🌱'}</span>
            <div>
              <div style="font-weight:600;font-size:14px">${p.name}</div>
              <div style="font-size:12px;color:var(--gray-500)">R${p.price}/${p.unit} · ${p.stock} ${p.unit}s · ${p.category}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <span class="badge ${p.active ? 'badge-green' : 'badge-red'}">${p.active ? 'Live' : 'Hidden'}</span>
            <button onclick="toggleProductActive('${p.id}', ${p.active})" style="background:none;border:1px solid var(--gray-200);border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer">${p.active ? 'Hide' : 'Show'}</button>
            <button onclick="deleteFarmerProduct('${p.id}')" style="background:none;border:none;cursor:pointer;color:var(--gray-400);font-size:16px" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--gray-400)'">🗑</button>
          </div>
        </div>`).join('');
    }
  }

  // Load orders for this farmer's products
  await loadFarmerOrders();
}

async function loadFarmerOrders() {
  const el = document.getElementById('farmer-orders-list');
  if (!el || !currentUser) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">Loading…</div>';

  // Get orders that contain products from this farmer
  const { data: orders } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!orders || orders.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">No orders yet</div>';
    return;
  }

  // Filter orders that contain this farmer's products
  const { data: myProducts } = await db.from('products').select('id,name').eq('farmer_id', currentUser.id);
  const myProductIds = (myProducts || []).map(p => String(p.id));

  const myOrders = orders.filter(o =>
    (o.items || []).some(i => myProductIds.includes(String(i.id)))
  );

  if (myOrders.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">No orders for your products yet</div>';
    return;
  }

  el.innerHTML = myOrders.map(o => {
    const myItems = (o.items || []).filter(i => myProductIds.includes(String(i.id)));
    const myTotal = myItems.reduce((s, i) => s + i.price * i.qty, 0);
    const date = new Date(o.created_at).toLocaleDateString('en-ZA', { day:'numeric', month:'short' });
    const shortId = String(o.id).slice(0,8).toUpperCase();
    const statusColors = { pending:'badge-blue', confirmed:'badge-blue', delivered:'badge-green', cancelled:'badge-red' };
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--gray-50);border-radius:var(--radius-sm);margin-bottom:8px">
      <div>
        <div style="font-weight:600;font-size:13px">#${shortId} — ${myItems.map(i=>i.name).join(', ')}</div>
        <div style="font-size:12px;color:var(--gray-500)">${date} · ${o.buyer_name || 'Buyer'} · ${o.delivery_address?.split(',')[0] || ''}</div>
        <div style="font-size:13px;color:var(--green-700);font-weight:500">Your cut: R${(myTotal * 0.92).toFixed(2)}</div>
      </div>
      <span class="badge ${statusColors[o.status] || 'badge-blue'}">${o.status}</span>
    </div>`;
  }).join('');
}

async function toggleProductActive(id, currentState) {
  await db.from('products').update({ active: !currentState }).eq('id', id).eq('farmer_id', currentUser.id);
  renderFarmerDashboard();
}

async function deleteFarmerProduct(id) {
  if (!confirm('Remove this product from your listings?')) return;
  await db.from('products').delete().eq('id', id).eq('farmer_id', currentUser.id);
  showToast('Product removed', 'success');
  renderFarmerDashboard();
}

async function addFarmerProduct() {
  const name     = document.getElementById('fp-name')?.value?.trim();
  const price    = parseFloat(document.getElementById('fp-price')?.value);
  const unit     = document.getElementById('fp-unit')?.value?.trim();
  const stock    = parseInt(document.getElementById('fp-stock')?.value);
  const category = document.getElementById('fp-category')?.value;
  const emoji    = document.getElementById('fp-emoji')?.value?.trim() || '🌱';
  const imageUrl = document.getElementById('fp-image')?.value?.trim() || null;

  if (!name || !price || !unit || !stock || !category) {
    showToast('Please fill in all product fields', 'error'); return;
  }

  const btn = document.getElementById('fp-add-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }

  const { error } = await db.from('products').insert({
    farmer_id:   currentUser.id,
    name, price, unit, stock, category, emoji,
    image_url:   imageUrl,
    active:      true,
    organic:     false,
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Add Product'; }

  if (error) { showToast('Failed to add: ' + error.message, 'error'); return; }

  // Clear form
  ['fp-name','fp-price','fp-unit','fp-stock','fp-emoji','fp-image'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  showToast('✅ ' + name + ' added to your listings!', 'success');
  renderFarmerDashboard();
}

function switchFarmerTab(tab) {
  ['products','orders','settings'].forEach(t => {
    const el = document.getElementById('farmer-tab-' + t);
    const btn = document.getElementById('farmer-tab-btn-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.style.background  = t === tab ? 'var(--green-600)' : 'transparent';
      btn.style.color       = t === tab ? 'white' : 'var(--gray-600)';
    }
  });
}
// DATA
const products = [
  // Vegetables — priced like Joburg fresh produce markets / Shoprite / Checkers
  {id:'1',  name:'Tomatoes',         price:14, unit:'kg',     farmer:'Green Valley Farm',  location:'Vaal Region', emoji:'🍅', image:'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80', stock:40, category:'Vegetables', organic:false},
  {id:'2',  name:'Spinach',          price:10, unit:'bunch',  farmer:'Sunrise Organics',   location:'Vaal Region', emoji:'🥬', image:'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80', stock:25, category:'Vegetables', organic:false},
  {id:'3',  name:'Cabbage',          price:12, unit:'head',   farmer:'Green Valley Farm',  location:'Vaal Region', emoji:'🥦', image:'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400&q=80', stock:30, category:'Vegetables', organic:false},
  {id:'4',  name:'Butternut',        price:15, unit:'each',   farmer:'Green Valley Farm',  location:'Vaal Region', emoji:'🎃', image:'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&q=80', stock:35, category:'Vegetables', organic:false},
  {id:'5',  name:'Onions',           price:12, unit:'kg',     farmer:'Sunrise Organics',   location:'Vaal Region', emoji:'🧅', image:'https://images.unsplash.com/photo-1508747703725-719777637510?w=400&q=80', stock:50, category:'Vegetables', organic:false},
  {id:'6',  name:'Green Pepper',     price:18, unit:'kg',     farmer:'Happy Hen Farm',     location:'Vaal Region', emoji:'🫑', image:'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80', stock:20, category:'Vegetables', organic:false},
  {id:'7',  name:'Sweet Potato',     price:14, unit:'kg',     farmer:'Meadow Dairy',       location:'Vaal Region', emoji:'🍠', image:'https://images.unsplash.com/photo-1596097635121-14b38c5d7a27?w=400&q=80', stock:45, category:'Vegetables', organic:false},
  {id:'8',  name:'Beetroot',         price:12, unit:'bunch',  farmer:'Sunrise Organics',   location:'Vaal Region', emoji:'🫀', image:'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&q=80', stock:20, category:'Vegetables', organic:false},
  {id:'9',  name:'Carrots',          price:10, unit:'bunch',  farmer:'Green Valley Farm',  location:'Vaal Region', emoji:'🥕', image:'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80', stock:40, category:'Vegetables', organic:false},
  {id:'10', name:'Mealies (Corn)',   price:5,  unit:'each',   farmer:'Sunrise Organics',   location:'Vaal Region', emoji:'🌽', image:'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80', stock:60, category:'Vegetables', organic:false},
  {id:'11', name:'Pumpkin',          price:20, unit:'each',   farmer:'Green Valley Farm',  location:'Vaal Region', emoji:'🎃', image:'https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400&q=80', stock:15, category:'Vegetables', organic:false},
  {id:'12', name:'Green Beans',      price:16, unit:'kg',     farmer:'Berry Bliss Farm',   location:'Vaal Region', emoji:'🫘', image:'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?w=400&q=80', stock:25, category:'Vegetables', organic:false},
  // Fruits
  {id:'13', name:'Bananas',          price:18, unit:'kg',     farmer:'Golden Hive',        location:'Vaal Region', emoji:'🍌', image:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80', stock:40, category:'Fruits',     organic:false},
  {id:'14', name:'Apples',           price:28, unit:'kg',     farmer:'Orchard Gold',       location:'Vaal Region', emoji:'🍎', image:'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80', stock:30, category:'Fruits',     organic:false},
  {id:'15', name:'Oranges',          price:20, unit:'kg',     farmer:'Orchard Gold',       location:'Vaal Region', emoji:'🍊', image:'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=400&q=80', stock:35, category:'Fruits',     organic:false},
  {id:'16', name:'Avocados',         price:10, unit:'each',   farmer:'Avo Grove',          location:'Vaal Region', emoji:'🥑', image:'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80', stock:50, category:'Fruits',     organic:false},
  {id:'17', name:'Mangoes',          price:12, unit:'each',   farmer:'Golden Hive',        location:'Vaal Region', emoji:'🥭', image:'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80', stock:30, category:'Fruits',     organic:false},
  {id:'18', name:'Watermelon',       price:35, unit:'each',   farmer:'Berry Bliss Farm',   location:'Vaal Region', emoji:'🍉', image:'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=400&q=80', stock:12, category:'Fruits',     organic:false},
  // Eggs & Dairy
  {id:'19', name:'Free-range Eggs',  price:75, unit:'dozen',  farmer:'Happy Hen Farm',     location:'Vaal Region', emoji:'🥚', image:'https://images.unsplash.com/photo-1491524062933-cb0289261700?w=400&q=80', stock:20, category:'Eggs',       organic:false},
  {id:'20', name:'Farm Eggs (6)',    price:40, unit:'pack',   farmer:'Happy Hen Farm',     location:'Vaal Region', emoji:'🥚', image:'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=400&q=80', stock:30, category:'Eggs',       organic:false},
];

const farmers = [
  {name:'Thabo Nkosi',      farm:'Green Valley Farm', location:'Vanderbijlpark, Vaal', emoji:'👨🏿‍🌾', tags:['Vegetables','Fruits'],  products:11, rating:4.9, since:2019},
  {name:'Amara Dlamini',    farm:'Sunrise Organics',  location:'Vereeniging, Vaal',    emoji:'👩🏾‍🌾', tags:['Vegetables','Mealies'], products:5,  rating:4.8, since:2021},
  {name:'Pieter van Wyk',   farm:'Happy Hen Farm',    location:'Meyerton, Vaal',       emoji:'👨🏻‍🌾', tags:['Eggs','Poultry'],       products:2,  rating:5.0, since:2018},
  {name:'Nomsa Khumalo',    farm:'Berry Bliss Farm',  location:'Three Rivers, Vaal',   emoji:'👩🏿‍🌾', tags:['Fruits','Vegetables'],  products:3,  rating:4.7, since:2020},
  {name:'Rajesh Pillay',    farm:'Golden Hive',       location:'Sebokeng, Vaal',       emoji:'👨🏽‍🌾', tags:['Fruits','Bananas'],     products:2,  rating:4.9, since:2017},
  {name:'Maria Ferreira',   farm:'Orchard Gold',      location:'Sasolburg, Vaal',      emoji:'👩🏼‍🌾', tags:['Fruits','Apples'],      products:2,  rating:4.8, since:2016},
  {name:'Sipho Mahlangu',   farm:'Avo Grove',         location:'Vanderbijlpark, Vaal', emoji:'👨🏿‍🌾', tags:['Avocados','Fruits'],    products:1,  rating:4.9, since:2020},
  {name:'Lerato Mokoena',   farm:'Meadow Dairy',      location:'Vereeniging, Vaal',    emoji:'👩🏾‍🌾', tags:['Sweet Potato','Veg'],   products:1,  rating:4.7, since:2022},
];

const farmerListings = [
  {emoji:'🍅',name:'Tomatoes',       stock:'40 kg in stock',    price:'R14/kg',   low:false},
  {emoji:'🥬',name:'Spinach',        stock:'25 bunches in stock',price:'R10/bunch',low:false},
  {emoji:'🥚',name:'Free-range Eggs',stock:'8 dozen remaining',  price:'R75/doz',  low:true},
  {emoji:'🥕',name:'Carrots',        stock:'3 bunches left',     price:'R10/bunch',low:true},
];

let cart = [];
let activeFilter = 'All';
const COMMISSION_RATE = 0.10;

// Delivery zones — Vaal Region
const DELIVERY_ZONES = [
  { id:'zone1', fee:10, keywords:['vanderbijlpark','vanderbijl park','vut','vaal university','frikkie meyer','tshepiso','boipatong','bophelong'], description:'Vanderbijlpark / VUT — R10' },
  { id:'zone2', fee:20, keywords:['vereeniging','three rivers','bedworth','roshnee','duncanville'], description:'Vereeniging / Three Rivers — R20' },
  { id:'zone3', fee:30, keywords:['sebokeng','evaton','orange farm','meyerton','henley on klip','henley-on-klip','walkerville','sasolburg'], description:'Sebokeng / Evaton / Sasolburg — R30' },
];
let currentDeliveryFee  = 0;
let currentDeliveryZone = null;

function detectDeliveryZone(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  for (const zone of DELIVERY_ZONES) {
    if (zone.keywords.some(kw => lower.includes(kw))) return zone;
  }
  return null;
}

function applyDeliveryZone(address) {
  const zone = detectDeliveryZone(address);
  currentDeliveryZone = zone;
  currentDeliveryFee  = zone ? zone.fee : 0;
  const feeEl  = document.getElementById('co-delivery-fee');
  const zoneEl = document.getElementById('co-delivery-zone');
  const cartFeeEl = document.getElementById('sum-delivery');
  if (zone) {
    if (feeEl)    feeEl.textContent    = 'R' + zone.fee;
    if (zoneEl)   zoneEl.textContent   = zone.description;
    if (cartFeeEl) cartFeeEl.textContent = 'R' + zone.fee;
  } else {
    if (feeEl)    feeEl.textContent    = 'TBD';
    if (zoneEl)   zoneEl.textContent   = 'Address outside known zones — we will confirm fee';
    if (cartFeeEl) cartFeeEl.textContent = 'TBD';
  }
  updateCheckoutTotals();
}

function updateCheckoutTotals() {
  const subtotal   = cart.reduce((s,x) => s + x.price * x.qty, 0);
  const commission = subtotal * COMMISSION_RATE;
  const total      = subtotal + commission + currentDeliveryFee;
  const coSub = document.getElementById('co-subtotal');
  const coCom = document.getElementById('co-commission');
  const coTot = document.getElementById('co-total');
  if (coSub) coSub.textContent = 'R' + subtotal.toFixed(2);
  if (coCom) coCom.textContent = 'R' + commission.toFixed(2);
  if (coTot) coTot.textContent = 'R' + total.toFixed(2);
}

// PAGES
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  window.scrollTo(0,0);
  if (name === 'marketplace') {
    renderProducts(products);
    setTimeout(() => { if (typeof initMaps === 'function') initMaps('marketplace'); }, 150);
  }
  if (name === 'home') {
    renderFeatured();
    setTimeout(() => { if (typeof initMaps === 'function') initMaps('home'); }, 200);
  }
  if (name === 'farmers') renderFarmers();
  if (name === 'cart') renderCart();
  if (name === 'checkout') {
    if (typeof currentUser === 'undefined' || !currentUser) {
      showToast('Please sign in to checkout 🔒', 'error');
      window._redirectAfterLogin = 'checkout';
      showPage('login');
      return;
    }
    renderCheckout();
    setTimeout(() => { if (typeof initMaps === 'function') initMaps('checkout'); }, 150);
  }
  if (name === 'dashboard') {
    if (currentRole === 'farmer') { renderFarmerDashboard(); }
    else { renderDashboard(); }
  }
  if (name === 'profile') renderProfilePage();
}

// PRODUCTS
function renderProductCard(p) {
  const imgHtml = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="product-img-placeholder" style="display:none">${p.emoji}</div>`
    : `<div class="product-img-placeholder">${p.emoji}</div>`;
  return `<div class="product-card" onclick="addToCart('${p.id}')">
    <div class="product-img-wrap">${imgHtml}</div>
    <div class="product-body">
      <div class="product-cat">${p.category}</div>
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
  const total = subtotal + commission + currentDeliveryFee;
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
  document.getElementById('sum-delivery').textContent = currentDeliveryFee > 0 ? 'R' + currentDeliveryFee : 'Set at checkout';
  document.getElementById('sum-total').textContent = 'R' + (subtotal + commission + currentDeliveryFee).toFixed(2);
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
  const total = subtotal + commission + currentDeliveryFee;
  const items = document.getElementById('checkout-items');
  if (items) items.innerHTML = cart.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>${i.emoji} ${i.name} ×${i.qty}</span><span>R${i.price * i.qty}</span></div>`).join('');
  const coSub = document.getElementById('co-subtotal');
  const coCom = document.getElementById('co-commission');
  const coTot = document.getElementById('co-total');
  if (coSub) coSub.textContent = 'R' + subtotal.toFixed(2);
  if (coCom) coCom.textContent = 'R' + commission.toFixed(2);
  if (coTot) coTot.textContent = 'R' + total.toFixed(2);

  // Pre-fill delivery details from saved profile
  if (currentProfile) {
    const phoneEl = document.getElementById('checkout-phone');
    const addrEl  = document.getElementById('delivery-address-input');
    const display = document.getElementById('delivery-address-display');
    if (phoneEl && currentProfile.phone)            phoneEl.value = currentProfile.phone;
    if (addrEl  && currentProfile.delivery_address) addrEl.value  = currentProfile.delivery_address;
    if (display && currentProfile.delivery_address) {
      display.textContent = '📍 ' + currentProfile.delivery_address;
      // Pre-set selectedDelivery so order saves correctly
      if (typeof selectedDelivery !== 'undefined') {
        selectedDelivery = { address: currentProfile.delivery_address };
      }
      if (typeof applyDeliveryZone === 'function') applyDeliveryZone(currentProfile.delivery_address);
    }
  }

  // Init map after short delay so container is visible
  setTimeout(() => { if (typeof initMaps === 'function') initMaps('checkout'); }, 100);
}

async function placeOrder() {
  if (typeof currentUser === 'undefined' || !currentUser) {
    showToast('Please sign in to place your order 🔒', 'error');
    window._redirectAfterLogin = 'checkout';
    showPage('login');
    return;
  }

  // Validate address
  const delivery = typeof getDeliveryDetails === 'function' ? getDeliveryDetails() : null;
  const manualAddr = document.getElementById('delivery-address-input')?.value?.trim();
  const finalAddress = delivery?.address || manualAddr || currentProfile?.delivery_address;
  if (!finalAddress) {
    showToast('Please set a delivery address on the map 📍', 'error'); return;
  }

  // Validate phone
  const phone = document.getElementById('checkout-phone')?.value?.trim() || currentProfile?.phone;
  if (!phone) {
    showToast('Please enter a phone number for delivery 📞', 'error'); return;
  }

  // Disable button to prevent double orders
  const btn = document.getElementById('pay-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

  const order = await saveOrder(cart, finalAddress, phone);

  if (btn) { btn.disabled = false; btn.textContent = 'Pay via PayFast →'; }

  // Show confirmation with real order details
  const shortId = order?.id ? String(order.id).slice(0,8).toUpperCase() : Math.floor(Math.random()*9000+1000);
  const confirmId = document.getElementById('confirm-order-id');
  const confirmItems = document.getElementById('confirm-order-items');
  const confirmTotal = document.getElementById('confirm-order-total');
  const confirmTime  = document.getElementById('confirm-time');
  if (confirmId)    confirmId.textContent    = 'Order #' + shortId;
  if (confirmItems) confirmItems.textContent = cart.map(i => i.emoji + ' ' + i.name + ' ×' + i.qty).join(', ');
  if (confirmTotal) confirmTotal.textContent = 'R' + cart.reduce((s,x) => s + x.price * x.qty, 0).toFixed(2) + ' + R' + currentDeliveryFee + ' delivery';
  if (confirmTime)  confirmTime.textContent  = new Date().toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit' });

  cart = [];
  updateCartBadge();
  clearGuestCart();
  showPage('confirmation');
  showToast('Order placed successfully! 🌿', 'success');
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

// GUEST CART — persist cart in localStorage for non-logged-in users
function saveGuestCart() {
  try { localStorage.setItem('ffc_guest_cart', JSON.stringify(cart)); } catch(e) {}
}

function loadGuestCart() {
  try {
    const saved = localStorage.getItem('ffc_guest_cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        cart = parsed;
        updateCartBadge();
      }
    }
  } catch(e) {}
}

function clearGuestCart() {
  try { localStorage.removeItem('ffc_guest_cart'); } catch(e) {}
}

// INIT
(async () => {
  // Load guest cart first so items show immediately
  loadGuestCart();
  await initAuth();
  const dbProducts = await loadProducts();
  if (dbProducts && dbProducts.length > 0) {
    products.length = 0;
    dbProducts.forEach(p => products.push(p));
  }
  renderFeatured();
  renderFarmers();
  renderDashboard();
  // Init hero map
  setTimeout(() => { if (typeof initMaps === 'function') initMaps('home'); }, 200);
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
