// ============================================================
//  SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = 'https://rcgkndudoildwbzyvdko.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZ2tuZHVkb2lsZHdienl2ZGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjkwODcsImV4cCI6MjA5MjkwNTA4N30.hkpEMQbSs0DOYbIfBTqZQzWhL0Wm8NN9eJf2WW93baA';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
//  AUTH STATE
// ============================================================
let currentUser = null;
let currentProfile = null; // farmer or buyer row
let currentRole = null;    // 'farmer' | 'buyer'

async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    await resolveProfile(session.user);
    updateNav();
  }

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      await handleOAuthRedirect();
      await resolveProfile(session.user);
      updateNav();

      // Merge guest cart into logged-in session
      if (typeof loadGuestCart === 'function') {
        const guestItems = (() => {
          try { return JSON.parse(localStorage.getItem('ffc_guest_cart') || '[]'); } catch(e) { return []; }
        })();
        if (guestItems.length > 0 && typeof cart !== 'undefined') {
          guestItems.forEach(gi => {
            const existing = cart.find(c => c.id === gi.id);
            if (existing) existing.qty += gi.qty;
            else cart.push(gi);
          });
          if (typeof updateCartBadge === 'function') updateCartBadge();
          if (typeof clearGuestCart === 'function') clearGuestCart();
        }
      }

      // Redirect after login
      if (window.location.hash.includes('access_token')) {
        const redirect = window._redirectAfterLogin || 'marketplace';
        window._redirectAfterLogin = null;
        showPage(redirect);
        showToast('Welcome! 👋', 'success');
      } else if (window._redirectAfterLogin) {
        const redirect = window._redirectAfterLogin;
        window._redirectAfterLogin = null;
        showPage(redirect);
        showToast('Welcome back! 👋', 'success');
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      currentRole = null;
      // Clear cart on sign out so orders don't show for guests
      if (typeof cart !== 'undefined') { cart = []; }
      if (typeof updateCartBadge === 'function') updateCartBadge();
      if (typeof clearGuestCart === 'function') clearGuestCart();
      updateNav();
    }
  });
}

// Check farmers table first, then buyers
async function resolveProfile(user) {
  const { data: farmer } = await db
    .from('farmers')
    .select('*')
    .eq('id', user.id)
    .single();

  if (farmer) {
    currentProfile = farmer;
    currentRole = 'farmer';
    return;
  }

  const { data: buyer } = await db
    .from('buyers')
    .select('*')
    .eq('id', user.id)
    .single();

  if (buyer) {
    currentProfile = buyer;
    currentRole = 'buyer';
  }
}

function updateNav() {
  const signinBtn = document.getElementById('nav-signin-btn');
  const userBtn   = document.getElementById('nav-user-btn');
  const userLabel = document.getElementById('nav-user-label');
  const dashTab   = document.getElementById('nav-dashboard-btn');

  if (currentUser) {
    signinBtn?.classList.add('hidden');
    userBtn?.classList.remove('hidden');
    if (userLabel) userLabel.textContent = currentProfile?.name?.split(' ')[0] || 'Account';
    if (dashTab) dashTab.style.display = currentRole === 'farmer' ? '' : 'none';
  } else {
    signinBtn?.classList.remove('hidden');
    userBtn?.classList.add('hidden');
    if (dashTab) dashTab.style.display = 'none';
  }
}

// ============================================================
//  SIGN UP
// ============================================================
async function handleSignup() {
  const name     = document.getElementById('signup-name')?.value?.trim();
  const email    = document.getElementById('signup-email')?.value?.trim();
  const phone    = document.getElementById('signup-phone')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;
  const role     = document.querySelector('#page-signup .auth-toggle-btn.active')?.dataset.role || 'buyer';

  const farmName     = document.getElementById('signup-farm-name')?.value?.trim();
  const farmLocation = document.getElementById('signup-farm-location')?.value?.trim();
  const farmProducts = document.getElementById('signup-farm-products')?.value?.trim();

  if (!name || !email || !password) {
    showToast('Please fill in all required fields', 'error'); return;
  }
  if (password.length < 8) {
    showToast('Password must be at least 8 characters', 'error'); return;
  }
  if (role === 'farmer' && !farmName) {
    showToast('Please enter your farm name', 'error'); return;
  }

  const btn = document.getElementById('signup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        name,
        farm_name: farmName || null,
      }
    }
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }

  if (error) { showToast(error.message, 'error'); return; }

  const userId = data.user?.id;
  if (!userId) { showToast('Signup failed, please try again', 'error'); return; }

  // Trigger already created the profile row — just update the extra fields
  await new Promise(r => setTimeout(r, 800));

  if (role === 'farmer') {
    await db.from('farmers').update({
      phone:          phone || null,
      location:       farmLocation || null,
      what_they_grow: farmProducts || null,
    }).eq('id', userId);
  } else {
    if (phone) {
      await db.from('buyers').update({ phone }).eq('id', userId);
    }
  }

  showToast('Welcome to Fresh Farm Connect! 🌿', 'success');
  showPage('marketplace');
}

// ============================================================
//  SIGN IN
// ============================================================
async function handleLogin() {
  const email    = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showToast('Please enter your email and password', 'error'); return;
  }

  const btn = document.getElementById('login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }

  if (error) { showToast(error.message, 'error'); return; }

  showToast('Welcome back! 👋', 'success');
  showPage('marketplace');
}

// ============================================================
//  SIGN OUT
// ============================================================
async function handleSignOut() {
  // Show feedback instantly, sign out in background
  currentUser = null;
  currentProfile = null;
  currentRole = null;
  updateNav();
  showToast('Signed out successfully', 'success');
  showPage('home');
  db.auth.signOut(); // fire and forget
}

// ============================================================
//  FORGOT PASSWORD
// ============================================================
async function handleForgotPassword() {
  const email = document.getElementById('login-email')?.value?.trim();
  if (!email) { showToast('Enter your email address first', 'error'); return; }
  const { error } = await db.auth.resetPasswordForEmail(email);
  if (error) { showToast(error.message, 'error'); return; }
  showToast('Password reset email sent! Check your inbox.', 'success');
}

// ============================================================
//  PRODUCTS — load from Supabase, fall back to static data
// ============================================================
async function loadProducts() {
  const { data, error } = await db
    .from('products')
    .select('*, farmers(name, farm_name, location)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return null;

  return data.map(p => ({
    id:       String(p.id),
    name:     p.name,
    price:    p.price,
    unit:     p.unit,
    farmer:   p.farmers?.farm_name || p.farmers?.name || 'Local Farm',
    location: p.farmers?.location || 'South Africa',
    emoji:    p.emoji || '🌱',
    stock:    p.stock,
    category: p.category,
    organic:  p.organic,
  }));
}

// ============================================================
//  ORDERS — save on checkout
// ============================================================
async function saveOrder(cart, deliveryAddress = null, phone = null) {
  if (!currentUser) return null;

  const subtotal   = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const commission = subtotal * 0.10;
  const total      = subtotal + commission + (typeof currentDeliveryFee !== "undefined" ? currentDeliveryFee : 0);

  const { data: order, error } = await db.from('orders').insert({
    buyer_id:         currentUser.id,
    buyer_name:       currentProfile?.name || null,
    buyer_email:      currentProfile?.email || currentUser.email,
    buyer_phone:      phone || currentProfile?.phone || null,
    delivery_address: deliveryAddress || currentProfile?.delivery_address || null,
    items:            cart,
    subtotal,
    commission,
    delivery_fee:     (typeof currentDeliveryFee !== "undefined" ? currentDeliveryFee : 0),
    total,
    status:           'pending',
  }).select().single();

  if (error) {
    console.error('Order save error:', error.message);
    return null;
  }

  // Update buyer profile phone/address if not already saved
  if (currentProfile && (phone || deliveryAddress)) {
    const updates = {};
    if (phone && !currentProfile.phone) updates.phone = phone;
    if (deliveryAddress && !currentProfile.delivery_address) updates.delivery_address = deliveryAddress;
    if (Object.keys(updates).length > 0) {
      await db.from('buyers').update(updates).eq('id', currentUser.id);
      Object.assign(currentProfile, updates);
    }
  }

  return order;
}

// ============================================================
//  FARMER LISTINGS — load & manage own products
// ============================================================
async function loadFarmerListings() {
  if (!currentUser || currentRole !== 'farmer') return null;

  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('farmer_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error || !data) return null;
  return data;
}

async function saveFarmerListing(listing) {
  if (!currentUser) { showToast('Please sign in to add listings', 'error'); return false; }
  if (currentRole !== 'farmer') { showToast('Only farmers can add listings', 'error'); return false; }

  const { error } = await db.from('products').insert({
    farmer_id: currentUser.id,
    name:      listing.name,
    price:     listing.price,
    unit:      listing.unit,
    stock:     listing.stock,
    category:  listing.category,
    emoji:     listing.emoji,
    organic:   false,
    active:    true,
  });

  if (error) { showToast('Failed to save listing: ' + error.message, 'error'); return false; }
  return true;
}

async function deleteFarmerListing(id) {
  if (!currentUser || currentRole !== 'farmer') return;
  const { error } = await db
    .from('products')
    .delete()
    .eq('id', id)
    .eq('farmer_id', currentUser.id);
  if (error) showToast('Delete failed: ' + error.message, 'error');
  return !error;
}

// ============================================================
//  GOOGLE SIGN IN
// ============================================================
async function handleGoogleSignIn() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
  if (error) showToast(error.message, 'error');
}

// Handle Google redirect — create profile row if first time
async function handleOAuthRedirect() {
  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) return;

  const user = session.user;

  // Check if profile already exists
  const { data: farmer } = await db.from('farmers').select('id').eq('id', user.id).single();
  if (farmer) return; // already set up

  const { data: buyer } = await db.from('buyers').select('id').eq('id', user.id).single();
  if (buyer) return; // already set up

  // First time Google user — create buyer profile by default
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0];
  await db.from('buyers').insert({
    id:    user.id,
    name:  name,
    email: user.email,
  });
}
