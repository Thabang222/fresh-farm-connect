// ============================================================
//  FRESH FARM CONNECT — GOOGLE MAPS INTEGRATION
//  Focused on the Vaal Region (Vanderbijlpark, Vereeniging,
//  Sasolburg, Meyerton, Sebokeng and surrounding areas)
// ============================================================

// ⚠️  REPLACE THIS WITH YOUR REAL GOOGLE MAPS API KEY
//  Get it free at: console.cloud.google.com
//  Enable: Maps JavaScript API + Places API + Geocoding API
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// ============================================================
//  VAAL REGION CENTER COORDINATES
// ============================================================
const VAAL_CENTER = { lat: -26.7069, lng: 27.8543 }; // Vanderbijlpark
const VAAL_ZOOM   = 11;

// ============================================================
//  DEMO FARM LOCATIONS — Vaal Region
//  Replace these with real farmer GPS coords from Supabase
//  once farmers add their location on signup
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
//  MAP INSTANCES — one per section
// ============================================================
let marketplaceMap   = null;
let checkoutMap      = null;
let deliveryMarker   = null;
let selectedDelivery = null; // { lat, lng, address }
let farmMarkers      = [];

// ============================================================
//  LOAD GOOGLE MAPS SCRIPT DYNAMICALLY
// ============================================================
function loadGoogleMapsScript() {
  if (document.getElementById('google-maps-script')) return;
  if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.warn('⚠️ Fresh Farm Connect: Add your Google Maps API key in maps.js');
    showMapPlaceholders();
    return;
  }
  const script = document.createElement('script');
  script.id  = 'google-maps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=onMapsLoaded`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// Called automatically by Google after script loads
window.onMapsLoaded = function () {
  console.log('✅ Google Maps loaded for Vaal Region');
  initMarketplaceMap();
};

// ============================================================
//  MARKETPLACE MAP — shows all farms in Vaal Region
// ============================================================
function initMarketplaceMap() {
  const container = document.getElementById('marketplace-map');
  if (!container || marketplaceMap) return;

  marketplaceMap = new google.maps.Map(container, {
    center: VAAL_CENTER,
    zoom: VAAL_ZOOM,
    mapTypeId: 'roadmap',
    styles: VAAL_MAP_STYLE,
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
  });

  // Add all farm markers
  VAAL_FARMS.forEach(farm => addFarmMarker(farm, marketplaceMap));

  // Add buyer location marker if available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const buyerPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      new google.maps.Marker({
        position: buyerPos,
        map: marketplaceMap,
        title: 'You are here',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });

      // Show distance to each farm
      updateFarmDistances(buyerPos);
    });
  }
}

function addFarmMarker(farm, map) {
  const marker = new google.maps.Marker({
    position: { lat: farm.lat, lng: farm.lng },
    map,
    title: farm.name,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
          <ellipse cx="20" cy="46" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
          <path d="M20 0 C9 0 0 9 0 20 C0 35 20 50 20 50 C20 50 40 35 40 20 C40 9 31 0 20 0Z" fill="#16a34a"/>
          <circle cx="20" cy="20" r="14" fill="white"/>
          <text x="20" y="26" text-anchor="middle" font-size="16">${farm.emoji}</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(40, 50),
      anchor: new google.maps.Point(20, 50),
    },
  });

  farmMarkers.push(marker);

  // Info window on click
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="font-family:'DM Sans',sans-serif;padding:8px;min-width:200px">
        <div style="font-size:15px;font-weight:600;color:#111827;margin-bottom:2px">${farm.name}</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px">📍 ${farm.area}, Vaal Region</div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px">⭐ ${farm.rating} · ${farm.farmer}</div>
        <div style="font-size:12px;color:#16a34a;margin-bottom:8px">${farm.products.join(' · ')}</div>
        <button onclick="showPage('marketplace')"
          style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif">
          View produce →
        </button>
      </div>
    `,
  });

  marker.addListener('click', () => {
    // Close all other info windows
    farmMarkers.forEach(m => m.infoWindow?.close());
    infoWindow.open(map, marker);
    marker.infoWindow = infoWindow;
  });

  marker.infoWindow = infoWindow;
  return marker;
}

// ============================================================
//  DISTANCE CALCULATION — show how far each farm is
// ============================================================
function updateFarmDistances(buyerPos) {
  VAAL_FARMS.forEach(farm => {
    const dist = haversineDistance(buyerPos, { lat: farm.lat, lng: farm.lng });
    // Update farmer cards if they exist
    const card = document.querySelector(`[data-farm-id="${farm.id}"] .farm-distance`);
    if (card) card.textContent = `${dist.toFixed(1)} km away`;
  });
}

function haversineDistance(pos1, pos2) {
  const R = 6371; // Earth radius km
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
  if (!container || checkoutMap) return;
  if (!window.google) { loadGoogleMapsScript(); return; }

  checkoutMap = new google.maps.Map(container, {
    center: VAAL_CENTER,
    zoom: 13,
    styles: VAAL_MAP_STYLE,
    mapTypeControl: false,
    streetViewControl: false,
  });

  // Address search box
  const input = document.getElementById('delivery-address-input');
  if (input) {
    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'za' },
      bounds: new google.maps.LatLngBounds(
        { lat: -26.95, lng: 27.65 }, // SW corner of Vaal region
        { lat: -26.50, lng: 28.05 }  // NE corner of Vaal region
      ),
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      const pos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      placeDeliveryMarker(pos);
      checkoutMap.setCenter(pos);
      checkoutMap.setZoom(16);
      selectedDelivery = { ...pos, address: place.formatted_address };
      document.getElementById('delivery-address-display').textContent = place.formatted_address;
    });
  }

  // Click on map to drop pin
  checkoutMap.addListener('click', e => {
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    placeDeliveryMarker(pos);
    reverseGeocode(pos);
  });
}

function placeDeliveryMarker(pos) {
  if (deliveryMarker) deliveryMarker.setMap(null);
  deliveryMarker = new google.maps.Marker({
    position: pos,
    map: checkoutMap,
    title: 'Delivery here',
    draggable: true,
    animation: google.maps.Animation.DROP,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <path d="M18 0 C8 0 0 8 0 18 C0 31 18 44 18 44 C18 44 36 31 36 18 C36 8 28 0 18 0Z" fill="#16a34a"/>
          <circle cx="18" cy="18" r="10" fill="white"/>
          <text x="18" y="23" text-anchor="middle" font-size="13">📍</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(36, 44),
      anchor: new google.maps.Point(18, 44),
    },
  });

  // Update address when marker is dragged
  deliveryMarker.addListener('dragend', e => {
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    selectedDelivery = { ...pos };
    reverseGeocode(pos);
  });

  selectedDelivery = pos;
}

function reverseGeocode(pos) {
  if (!window.google) return;
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ location: pos }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const address = results[0].formatted_address;
      const input = document.getElementById('delivery-address-input');
      const display = document.getElementById('delivery-address-display');
      if (input) input.value = address;
      if (display) display.textContent = address;
      if (selectedDelivery) selectedDelivery.address = address;
    }
  });
}

// ============================================================
//  HERO MAP — shows Vaal Region farms on landing page
// ============================================================
function initHeroMap() {
  const container = document.getElementById('hero-map');
  if (!container || !window.google) return;

  const heroMap = new google.maps.Map(container, {
    center: VAAL_CENTER,
    zoom: 10,
    styles: VAAL_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: false,
    draggable: false,
  });

  VAAL_FARMS.forEach(farm => {
    new google.maps.Marker({
      position: { lat: farm.lat, lng: farm.lng },
      map: heroMap,
      title: farm.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#16a34a',
        fillOpacity: 0.9,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });
  });
}

// ============================================================
//  SHOW PLACEHOLDERS WHEN NO API KEY
// ============================================================
function showMapPlaceholders() {
  const maps = ['marketplace-map', 'checkout-map', 'hero-map'];
  maps.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `
        <div style="width:100%;height:100%;background:linear-gradient(135deg,#e8f5e9,#c8e6c9);
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
          <div style="font-size:36px">🗺️</div>
          <div style="font-size:13px;font-weight:500;color:#374151">Vaal Region Farm Map</div>
          <div style="font-size:11px;color:#6b7280;text-align:center;max-width:220px">
            Add your Google Maps API key in maps.js to activate the live map
          </div>
        </div>`;
    }
  });
}

// ============================================================
//  INIT — called on page load and when switching pages
// ============================================================
function initMaps(page) {
  if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    showMapPlaceholders(); return;
  }
  if (!window.google) {
    loadGoogleMapsScript(); return;
  }
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
//  VAAL REGION MAP STYLE — green themed
// ============================================================
const VAAL_MAP_STYLE = [
  { featureType: 'water',       elementType: 'geometry',   stylers: [{ color: '#a2daf2' }] },
  { featureType: 'landscape',   elementType: 'geometry',   stylers: [{ color: '#f0fdf4' }] },
  { featureType: 'road',        elementType: 'geometry',   stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'park',        elementType: 'geometry',   stylers: [{ color: '#dcfce7' }] },
  { featureType: 'poi.park',    elementType: 'geometry',   stylers: [{ color: '#dcfce7' }] },
  { featureType: 'transit',     elementType: 'geometry',   stylers: [{ color: '#f3f4f6' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] },
  { featureType: 'road',        elementType: 'labels.text.fill',   stylers: [{ color: '#6b7280' }] },
  { featureType: 'poi',         elementType: 'labels',             stylers: [{ visibility: 'off' }] },
];

// ============================================================
//  AUTO INIT ON LOAD
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadGoogleMapsScript();
});
