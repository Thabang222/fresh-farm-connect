// ============================================================
//  FRESH FARM CONNECT — LEAFLET MAPS INTEGRATION
//  Focused on the Vaal Region (Vanderbijlpark, Vereeniging,
//  Sasolburg, Meyerton, Sebokeng and surrounding areas)
//  FREE — No API key needed. Powered by OpenStreetMap.
// ============================================================

// ============================================================
//  VAAL REGION CENTER COORDINATES
// ============================================================
const VAAL_CENTER = [-26.7069, 27.8543]; // Vanderbijlpark
const VAAL_ZOOM   = 11;

// ============================================================
//  DEMO FARM LOCATIONS — Vaal Region
// ============================================================
const VAAL_FARMS = [
  {
    id: '1',
    name: 'Green Valley Farm',
    farmer: 'Thabo Nkosi',
    emoji: '👨🏿‍🌾',
    lat: -26.6800,
    lng: 27.8400,
    area: 'Vanderbijlpark',
    products: ['Tomatoes', 'Spinach', 'Butternut'],
    rating: 4.9,
  },
  {
    id: '2',
    name: 'Sunrise Organics',
    farmer: 'Amara Dlamini',
    emoji: '👩🏾‍🌾',
    lat: -26.6500,
    lng: 27.9200,
    area: 'Vereeniging',
    products: ['Herbs', 'Spinach', 'Sweet Corn'],
    rating: 4.8,
  },
  {
    id: '3',
    name: 'Happy Hen Farm',
    farmer: 'Pieter van Wyk',
    emoji: '👨🏻‍🌾',
    lat: -26.8100,
    lng: 27.8200,
    area: 'Meyerton',
    products: ['Eggs', 'Chicken'],
    rating: 5.0,
  },
  {
    id: '4',
    name: 'Golden Hive',
    farmer: 'Rajesh Pillay',
    emoji: '👨🏽‍🌾',
    lat: -26.7500,
    lng: 27.8700,
    area: 'Sebokeng',
    products: ['Raw Honey', 'Beeswax'],
    rating: 4.9,
  },
  {
    id: '5',
    name: 'Meadow Dairy',
    farmer: 'Maria Ferreira',
    emoji: '👩🏼‍🌾',
    lat: -26.7300,
    lng: 27.7800,
    area: 'Sasolburg',
    products: ['Fresh Milk', 'Cheese', 'Butter'],
    rating: 4.8,
  },
  {
    id: '6',
    name: 'Berry Bliss Farm',
    farmer: 'Nomsa Khumalo',
    emoji: '👩🏿‍🌾',
    lat: -26.6200,
    lng: 27.9600,
    area: 'Three Rivers',
    products: ['Strawberries', 'Blueberries'],
    rating: 4.7,
  },
];

// ============================================================
//  MAP INSTANCES
// ============================================================
let marketplaceMap   = null;
let checkoutMap      = null;
let heroMap          = null;
let deliveryMarker   = null;
let selectedDelivery = null;
let farmMarkers      = [];

// ============================================================
//  LOAD LEAFLET CSS + JS DYNAMICALLY
// ============================================================
function loadLeaflet(callback) {
  if (window.L) { callback(); return; }

  // Load CSS
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id   = 'leaflet-css';
    link.rel  = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  // Load JS
  if (!document.getElementById('leaflet-js')) {
    const script = document.createElement('script');
    script.id  = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = callback;
    document.head.appendChild(script);
  }
}

// ============================================================
//  CUSTOM FARM MARKER ICON
// ============================================================
function createFarmIcon(emoji) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:42px;height:52px;position:relative;cursor:pointer;
        filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="52" viewBox="0 0 42 52">
          <path d="M21 0 C9.4 0 0 9.4 0 21 C0 36.75 21 52 21 52 C21 52 42 36.75 42 21 C42 9.4 32.6 0 21 0Z" fill="#16a34a"/>
          <circle cx="21" cy="21" r="15" fill="white"/>
          <text x="21" y="27" text-anchor="middle" font-size="17">${emoji}</text>
        </svg>
      </div>`,
    iconSize:   [42, 52],
    iconAnchor: [21, 52],
    popupAnchor:[0, -52],
  });
}

function createDeliveryIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px;height:44px;
        filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <path d="M18 0 C8 0 0 8 0 18 C0 31 18 44 18 44 C18 44 36 31 36 18 C36 8 28 0 18 0Z" fill="#16a34a"/>
          <circle cx="18" cy="18" r="10" fill="white"/>
          <text x="18" y="23" text-anchor="middle" font-size="13">📍</text>
        </svg>
      </div>`,
    iconSize:   [36, 44],
    iconAnchor: [18, 44],
    popupAnchor:[0, -44],
  });
}

function createYouAreHereIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;
      background:#4285F4;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 3px rgba(66,133,244,0.3)">
    </div>`,
    iconSize:   [16, 16],
    iconAnchor: [8, 8],
  });
}

// ============================================================
//  SHARED TILE LAYER
// ============================================================
function addTileLayer(map) {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
}

// ============================================================
//  MARKETPLACE MAP — shows all farms in Vaal Region
// ============================================================
function initMarketplaceMap() {
  const container = document.getElementById('marketplace-map');
  if (!container) return;

  loadLeaflet(() => {
    if (marketplaceMap) { marketplaceMap.invalidateSize(); return; }

    marketplaceMap = L.map('marketplace-map', { zoomControl: true }).setView(VAAL_CENTER, VAAL_ZOOM);
    addTileLayer(marketplaceMap);

    // Add all farm markers
    VAAL_FARMS.forEach(farm => {
      const marker = L.marker([farm.lat, farm.lng], { icon: createFarmIcon(farm.emoji) })
        .addTo(marketplaceMap)
        .bindPopup(`
          <div style="font-family:'DM Sans',sans-serif;padding:4px;min-width:200px">
            <div style="font-size:15px;font-weight:600;color:#111827;margin-bottom:2px">${farm.name}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">📍 ${farm.area}, Vaal Region</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:4px">⭐ ${farm.rating} · ${farm.farmer}</div>
            <div style="font-size:12px;color:#16a34a;margin-bottom:8px">${farm.products.join(' · ')}</div>
            <button onclick="showPage('marketplace')"
              style="background:#16a34a;color:#fff;border:none;border-radius:6px;
              padding:6px 14px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif">
              View produce →
            </button>
          </div>
        `, { maxWidth: 240 });

      farmMarkers.push(marker);
    });

    // Show buyer's location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const buyerPos = [pos.coords.latitude, pos.coords.longitude];
        L.marker(buyerPos, { icon: createYouAreHereIcon() })
          .addTo(marketplaceMap)
          .bindTooltip('You are here', { permanent: false });
        updateFarmDistances({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  });
}

// ============================================================
//  DISTANCE CALCULATION
// ============================================================
function updateFarmDistances(buyerPos) {
  VAAL_FARMS.forEach(farm => {
    const dist = haversineDistance(buyerPos, { lat: farm.lat, lng: farm.lng });
    const card = document.querySelector(`[data-farm-id="${farm.id}"] .farm-distance`);
    if (card) card.textContent = `${dist.toFixed(1)} km away`;
  });
}

function haversineDistance(pos1, pos2) {
  const R = 6371;
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pos1.lat * Math.PI / 180) *
    Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
//  CHECKOUT MAP — buyer drops pin for delivery address
// ============================================================
function initCheckoutMap() {
  const container = document.getElementById('checkout-map');
  if (!container) return;

  loadLeaflet(() => {
    if (checkoutMap) { checkoutMap.invalidateSize(); return; }

    checkoutMap = L.map('checkout-map').setView(VAAL_CENTER, 13);
    addTileLayer(checkoutMap);

    // Click map to drop delivery pin
    checkoutMap.on('click', e => {
      placeDeliveryMarker([e.latlng.lat, e.latlng.lng]);
      reverseGeocode(e.latlng.lat, e.latlng.lng, true); // true = auto save
    });

    // Wire up address search input
    const input = document.getElementById('delivery-address-input');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') searchDeliveryAddress(input.value);
      });
      // Add search button if not present
      const btn = document.getElementById('delivery-search-btn');
      if (btn) btn.addEventListener('click', () => searchDeliveryAddress(input.value));
    }
  });
}

function placeDeliveryMarker(latlng) {
  if (deliveryMarker) checkoutMap.removeLayer(deliveryMarker);
  deliveryMarker = L.marker(latlng, {
    icon: createDeliveryIcon(),
    draggable: true,
  }).addTo(checkoutMap);

  deliveryMarker.on('dragend', e => {
    const pos = e.target.getLatLng();
    selectedDelivery = { lat: pos.lat, lng: pos.lng };
    reverseGeocode(pos.lat, pos.lng, true); // true = auto save
  });

  selectedDelivery = { lat: latlng[0], lng: latlng[1] };
}

// Free reverse geocoding via OpenStreetMap Nominatim
async function reverseGeocode(lat, lng, autoSave = false) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await res.json();
    const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const input   = document.getElementById('delivery-address-input');
    const display = document.getElementById('delivery-address-display');
    if (input)   input.value = address;
    if (display) display.textContent = address;
    if (selectedDelivery) selectedDelivery.address = address;
    if (autoSave) await autoSaveDeliveryAddress(address);
  } catch (e) {
    console.warn('Reverse geocode failed:', e);
  }
}

// Auto-save delivery address to Supabase buyers table
async function autoSaveDeliveryAddress(address) {
  if (typeof currentUser === 'undefined' || !currentUser) return;
  if (typeof db === 'undefined') return;

  try {
    const table = (typeof currentRole !== 'undefined' && currentRole === 'farmer') ? 'farmers' : 'buyers';
    const { error } = await db.from(table)
      .update({ delivery_address: address })
      .eq('id', currentUser.id);

    if (!error) {
      if (typeof currentProfile !== 'undefined' && currentProfile) {
        currentProfile.delivery_address = address;
      }
      // Show subtle confirmation
      const display = document.getElementById('delivery-address-display');
      if (display) {
        display.style.color = 'var(--green-600)';
        display.textContent = '✅ ' + address + ' — saved!';
        setTimeout(() => {
          display.style.color = '';
          display.textContent = address;
        }, 2500);
      }
    }
  } catch (e) {
    console.warn('Auto-save address failed:', e);
  }
}

// Free forward geocoding via OpenStreetMap Nominatim
// Tries progressively simpler versions of the address for best results
async function searchDeliveryAddress(query) {
  if (!query) return;

  // Build a list of queries to try — from specific to general
  const attempts = [
    query,
    // Strip unit/flat numbers and building names (first word often)
    query.replace(/^[^,]+,\s*/, ''),
    // Just street + city
    query.split(',').slice(-3).join(',').trim(),
    // Just city + postal code
    query.split(',').slice(-2).join(',').trim(),
  ].filter((q, i, arr) => q && arr.indexOf(q) === i); // deduplicate

  for (const attempt of attempts) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(attempt)}&format=json&countrycodes=za&limit=1&addressdetails=1`
      );
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        placeDeliveryMarker([lat, lng]);
        checkoutMap.setView([lat, lng], 16);
        const address = data[0].display_name;
        if (selectedDelivery) selectedDelivery.address = query; // keep original
        const input   = document.getElementById('delivery-address-input');
        const display = document.getElementById('delivery-address-display');
        if (input)   input.value = query;
        if (display) display.textContent = query;
        await autoSaveDeliveryAddress(query);
        return; // success — stop trying
      }
    } catch (e) {
      console.warn('Geocode attempt failed:', e);
    }
  }

  // All attempts failed — show helpful message
  showToast('Address not found. Try typing just the street name or click directly on the map 📍', 'error');
}

// ============================================================
//  HERO MAP — shows Vaal Region farms on landing page
// ============================================================
function initHeroMap() {
  const container = document.getElementById('hero-map');
  if (!container) return;

  loadLeaflet(() => {
    if (heroMap) { heroMap.invalidateSize(); return; }

    heroMap = L.map('hero-map', {
      zoomControl:     false,
      dragging:        false,
      touchZoom:       false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom:         false,
      keyboard:        false,
    }).setView(VAAL_CENTER, 10);

    addTileLayer(heroMap);

    VAAL_FARMS.forEach(farm => {
      L.circleMarker([farm.lat, farm.lng], {
        radius:      9,
        fillColor:   '#16a34a',
        color:       '#fff',
        weight:      2,
        opacity:     1,
        fillOpacity: 0.9,
      }).addTo(heroMap).bindTooltip(farm.name, { permanent: false });
    });
  });
}

// ============================================================
//  INIT — called when switching pages
// ============================================================
function initMaps(page) {
  if (page === 'marketplace') initMarketplaceMap();
  if (page === 'checkout')    initCheckoutMap();
  if (page === 'home')        initHeroMap();
}

// ============================================================
//  GET SELECTED DELIVERY FOR ORDER SAVING
// ============================================================
function getDeliveryDetails() {
  return selectedDelivery;
}

// ============================================================
//  AUTO INIT ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadLeaflet(() => {
    // Pre-load Leaflet so first map open is instant
    console.log('✅ Leaflet loaded — Vaal Region maps ready');
  });
});
