/* ─── Collection Tracker — App Logic ─────────────────────────────────────── */

// ─── Supabase client ────────────────────────────────────────────────────────
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
let sb = null;

function initSupabase() {
  const url = localStorage.getItem('ct_sb_url');
  const key = localStorage.getItem('ct_sb_key');
  if (!url || !key) return false;
  sb = window.supabase.createClient(url, key);
  return true;
}

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  user:              null,
  collections:       [],
  rooms:             [],
  shelves:           [],
  items:             [],
  currentCollection: null,
  currentRoom:       null,
  currentShelf:      null,   // null = room view, id = shelf view
  view:              'room',  // 'room' | 'shelf'
  editingItem:       null,   // item being edited
  pendingSlot:       null,   // { shelfId, row, col } when adding from slot click
};

// ─── Collection type config ──────────────────────────────────────────────────
const COLLECTION_TYPES = {
  whiskey: {
    label: 'Whiskey', icon: '🥃', color: '#c8a96e',
    desc: 'Bourbon, Scotch, Irish & more',
    itemTypes: ['Bourbon', 'Scotch Single Malt', 'Scotch Blended', 'Irish', 'Japanese', 'Canadian', 'Rye', 'Other'],
    fields: ['brand', 'type', 'year', 'region', 'abv'],
    placeholder: 'whiskey',
  },
  wine: {
    label: 'Wine', icon: '🍷', color: '#8b2252',
    desc: 'Red, white, rosé & sparkling',
    itemTypes: ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified', 'Other'],
    fields: ['brand', 'type', 'year', 'region', 'abv'],
    placeholder: 'wine',
  },
  beer: {
    label: 'Beer', icon: '🍺', color: '#e8a020',
    desc: 'Craft, IPA, stout & more',
    itemTypes: ['IPA', 'Stout', 'Lager', 'Pale Ale', 'Pilsner', 'Sour', 'Porter', 'Wheat', 'Other'],
    fields: ['brand', 'type', 'abv'],
    placeholder: 'beer',
  },
  books: {
    label: 'Books', icon: '📚', color: '#4a90d9',
    desc: 'Fiction, non-fiction & more',
    itemTypes: ['Fiction', 'Non-fiction', 'Biography', 'Science', 'History', 'Philosophy', 'Other'],
    fields: ['brand', 'type', 'year'],
    placeholder: 'book',
  },
  vinyl: {
    label: 'Vinyl', icon: '💿', color: '#9c6bbf',
    desc: 'Records & music collection',
    itemTypes: ['Rock', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop', 'Country', 'Other'],
    fields: ['brand', 'type', 'year', 'region'],
    placeholder: 'vinyl',
  },
  custom: {
    label: 'Custom', icon: '📦', color: '#6c757d',
    desc: 'Any collection you can imagine',
    itemTypes: [],
    fields: ['brand', 'type', 'year', 'region', 'abv'],
    placeholder: 'item',
  },
};

// ─── Bottle SVG silhouettes ──────────────────────────────────────────────────
const SILHOUETTES = {
  whiskey: `<svg width="50" height="110" viewBox="0 0 50 110" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="19" y="2" width="12" height="18" rx="2" fill="currentColor"/>
    <rect x="17" y="18" width="16" height="6" rx="1" fill="currentColor"/>
    <path d="M10 28 Q10 24 17 24 L33 24 Q40 24 40 28 L40 98 Q40 108 25 108 Q10 108 10 98 Z" fill="currentColor"/>
  </svg>`,
  wine: `<svg width="40" height="120" viewBox="0 0 40 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="2" width="8" height="20" rx="2" fill="currentColor"/>
    <path d="M14 22 L12 40 Q8 50 8 60 Q8 80 20 80 Q32 80 32 60 Q32 50 28 40 L26 22 Z" fill="currentColor"/>
    <rect x="16" y="80" width="8" height="30" rx="2" fill="currentColor"/>
    <rect x="10" y="108" width="20" height="6" rx="2" fill="currentColor"/>
  </svg>`,
  beer: `<svg width="48" height="100" viewBox="0 0 48 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="2" width="14" height="14" rx="2" fill="currentColor"/>
    <rect x="15" y="14" width="18" height="6" rx="1" fill="currentColor"/>
    <rect x="10" y="20" width="28" height="72" rx="6" fill="currentColor"/>
  </svg>`,
  books: `<svg width="36" height="100" viewBox="0 0 36 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="2" width="28" height="96" rx="3" fill="currentColor"/>
    <rect x="8" y="10" width="20" height="2" rx="1" fill="rgba(0,0,0,0.3)"/>
    <rect x="8" y="16" width="16" height="2" rx="1" fill="rgba(0,0,0,0.3)"/>
  </svg>`,
  vinyl: `<svg width="90" height="90" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="45" cy="45" r="42" fill="currentColor"/>
    <circle cx="45" cy="45" r="12" fill="rgba(0,0,0,0.5)"/>
    <circle cx="45" cy="45" r="4" fill="rgba(0,0,0,0.8)"/>
  </svg>`,
  custom: `<svg width="50" height="100" viewBox="0 0 50 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="34" height="84" rx="4" fill="currentColor"/>
    <rect x="14" y="18" width="22" height="2" rx="1" fill="rgba(0,0,0,0.3)"/>
    <rect x="14" y="26" width="18" height="2" rx="1" fill="rgba(0,0,0,0.3)"/>
  </svg>`,
};

// ─── Utils ───────────────────────────────────────────────────────────────────
function toast(msg, type = 'default') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

function showModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-dim', hexToRgba(color, 0.15));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.3));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getTypeConfig() {
  return COLLECTION_TYPES[state.currentCollection?.type] || COLLECTION_TYPES.custom;
}

function collectionItems() {
  return state.items.filter(i => i.collection_id === state.currentCollection?.id);
}

function roomShelves(roomId) {
  return state.shelves.filter(s => s.room_id === roomId).sort((a,b) => a.sort_order - b.sort_order);
}

function shelfItems(shelfId) {
  return state.items.filter(i => i.shelf_id === shelfId);
}

function slotItem(shelfId, row, col) {
  return state.items.find(i => i.shelf_id === shelfId && i.slot_row === row && i.slot_col === col);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
async function checkAuth() {
  if (!initSupabase()) {
    showScreen('auth');
    return;
  }
  showLoading(true);
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    state.user = session.user;
    await loadData();
  } else {
    showLoading(false);
    showScreen('auth');
  }
}

async function signIn(email, password) {
  hideError('auth-error');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showError('auth-error', error.message); return; }
  state.user = data.user;
  await loadData();
}

async function signUp(email, password) {
  hideError('auth-signup-error');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) { showError('auth-signup-error', error.message); return; }
  if (data.user && !data.session) {
    showError('auth-signup-error', 'Check your email for a confirmation link.');
    return;
  }
  state.user = data.user;
  await loadData();
}

async function signOut() {
  await sb.auth.signOut();
  state.user = null;
  state.collections = [];
  state.rooms = []; state.shelves = []; state.items = [];
  state.currentCollection = null;
  showScreen('auth');
}

// ─── Data loading ────────────────────────────────────────────────────────────
async function loadData() {
  showLoading(true);
  try {
    const [colRes, roomRes, shelfRes, itemRes] = await Promise.all([
      sb.from('collections').select('*').order('created_at'),
      sb.from('rooms').select('*').order('sort_order'),
      sb.from('shelves').select('*').order('sort_order'),
      sb.from('items').select('*').order('created_at'),
    ]);
    state.collections = colRes.data || [];
    state.rooms       = roomRes.data || [];
    state.shelves     = shelfRes.data || [];
    state.items       = itemRes.data || [];

    if (state.collections.length === 0) {
      showLoading(false);
      showScreen('setup');
      initSetupWizard();
    } else {
      state.currentCollection = state.collections[0];
      const collRooms = state.rooms.filter(r => r.collection_id === state.currentCollection.id);
      state.currentRoom = collRooms[0] || null;
      showLoading(false);
      showScreen('app');
      renderApp();
    }
  } catch (e) {
    showLoading(false);
    toast('Failed to load data: ' + e.message, 'error');
    showScreen('auth');
  }
}

// ─── Screen management ───────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}

function showLoading(visible) {
  document.getElementById('loading-overlay').style.display = visible ? 'flex' : 'none';
}

// ─── Setup Wizard ─────────────────────────────────────────────────────────────
let wizardStep = 1;
const wizardData = { type: 'whiskey', name: '', description: '', roomName: '', shelfName: '', slotsWide: 6, slotsTall: 4 };

function initSetupWizard() {
  wizardStep = 1;
  renderWizardProgress();
  showWizardStep(1);
}

function renderWizardProgress() {
  const dots = document.querySelectorAll('.wizard-step-dot');
  const lines = document.querySelectorAll('.wizard-step-line');
  dots.forEach((dot, i) => {
    const step = i + 1;
    dot.classList.remove('active', 'done');
    if (step < wizardStep) dot.classList.add('done');
    else if (step === wizardStep) dot.classList.add('active');
  });
  lines.forEach((line, i) => {
    line.classList.toggle('done', i + 1 < wizardStep);
  });
}

function showWizardStep(step) {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`wizard-step-${step}`).classList.add('active');
  wizardStep = step;
  renderWizardProgress();
}

function selectCollectionType(type) {
  wizardData.type = type;
  document.querySelectorAll('.type-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.type === type);
  });
}

function wizardNext() {
  if (wizardStep === 1) {
    // type already selected
    showWizardStep(2);
  } else if (wizardStep === 2) {
    const name = document.getElementById('wizard-col-name').value.trim();
    if (!name) { toast('Please enter a name for your collection.', 'error'); return; }
    wizardData.name = name;
    wizardData.description = document.getElementById('wizard-col-desc').value.trim();
    showWizardStep(3);
  } else if (wizardStep === 3) {
    const name = document.getElementById('wizard-room-name').value.trim();
    if (!name) { toast('Please enter a room name.', 'error'); return; }
    wizardData.roomName = name;
    showWizardStep(4);
  } else if (wizardStep === 4) {
    const name = document.getElementById('wizard-shelf-name').value.trim();
    if (!name) { toast('Please enter a shelf name.', 'error'); return; }
    wizardData.shelfName = name;
    wizardData.slotsWide = parseInt(document.getElementById('wizard-shelf-wide').value) || 6;
    wizardData.slotsTall = parseInt(document.getElementById('wizard-shelf-tall').value) || 4;
    createCollection();
  }
}

function wizardBack() {
  if (wizardStep > 1) showWizardStep(wizardStep - 1);
}

async function createCollection() {
  const typeConf = COLLECTION_TYPES[wizardData.type];
  showLoading(true);
  try {
    // Create collection
    const { data: col, error: colErr } = await sb.from('collections').insert({
      user_id:      state.user.id,
      name:         wizardData.name,
      type:         wizardData.type,
      icon:         typeConf.icon,
      accent_color: typeConf.color,
      description:  wizardData.description,
    }).select().single();
    if (colErr) throw colErr;

    // Create room
    const { data: room, error: roomErr } = await sb.from('rooms').insert({
      collection_id: col.id,
      name:          wizardData.roomName,
      sort_order:    0,
    }).select().single();
    if (roomErr) throw roomErr;

    // Create shelf
    const { data: shelf, error: shelfErr } = await sb.from('shelves').insert({
      room_id:    room.id,
      name:       wizardData.shelfName,
      slots_wide: wizardData.slotsWide,
      slots_tall: wizardData.slotsTall,
      sort_order: 0,
    }).select().single();
    if (shelfErr) throw shelfErr;

    state.collections.push(col);
    state.rooms.push(room);
    state.shelves.push(shelf);
    state.currentCollection = col;
    state.currentRoom = room;

    showLoading(false);
    showWizardStep(5);
    // Update complete screen
    document.getElementById('wizard-complete-icon').textContent = typeConf.icon;
    document.getElementById('wizard-complete-name').textContent = wizardData.name;
  } catch (e) {
    showLoading(false);
    toast('Error: ' + e.message, 'error');
  }
}

function finishSetup() {
  showScreen('app');
  renderApp();
}

// Shelf size preview in wizard
function updateShelfSizePreview() {
  const wide = parseInt(document.getElementById('wizard-shelf-wide').value) || 6;
  const tall = parseInt(document.getElementById('wizard-shelf-tall').value) || 4;
  const preview = document.getElementById('shelf-size-preview');
  let html = '';
  for (let r = 0; r < Math.min(tall, 6); r++) {
    html += '<div class="shelf-size-row">';
    for (let c = 0; c < Math.min(wide, 10); c++) {
      html += '<div class="shelf-size-cell"></div>';
    }
    if (wide > 10) html += '<span style="color:var(--muted);font-size:10px;align-self:center;margin-left:4px">+' + (wide - 10) + '</span>';
    html += '</div>';
  }
  if (tall > 6) html += `<p style="font-size:10px;color:var(--muted);text-align:center">+ ${tall - 6} more rows</p>`;
  preview.innerHTML = html;
}

// ─── App Render ───────────────────────────────────────────────────────────────
function renderApp() {
  if (!state.currentCollection) return;
  setAccent(state.currentCollection.accent_color || '#c8a96e');
  renderSidebar();
  renderStatsBar();
  renderBreadcrumb();
  if (state.currentShelf) {
    renderShelfView();
  } else {
    renderRoomView();
  }
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function renderSidebar() {
  const col = state.currentCollection;
  const typeConf = getTypeConfig();

  // Collections list
  const collList = document.getElementById('sidebar-collections');
  collList.innerHTML = state.collections.map(c => {
    const tc = COLLECTION_TYPES[c.type] || COLLECTION_TYPES.custom;
    const count = state.items.filter(i => i.collection_id === c.id).length;
    return `<div class="sidebar-item ${c.id === col.id ? 'active' : ''}" onclick="switchCollection('${c.id}')">
      <span class="item-icon">${tc.icon}</span>
      <span>${c.name}</span>
      <span class="item-badge">${count}</span>
    </div>`;
  }).join('');

  // Rooms list
  const collRooms = state.rooms.filter(r => r.collection_id === col.id).sort((a,b) => a.sort_order - b.sort_order);
  const roomList = document.getElementById('sidebar-rooms');
  roomList.innerHTML = collRooms.map(r => {
    const shelfCount = roomShelves(r.id).length;
    return `<div class="sidebar-item ${r.id === state.currentRoom?.id && !state.currentShelf ? 'active' : ''}" onclick="switchRoom('${r.id}')">
      <span class="item-icon">🏠</span>
      <span>${r.name}</span>
      <span class="item-badge">${shelfCount}</span>
    </div>`;
  }).join('') + `<div class="sidebar-item" onclick="openAddRoomModal()" style="opacity:0.6">
    <span class="item-icon">+</span>
    <span>Add room</span>
  </div>`;

  // User info
  document.getElementById('sidebar-email').textContent = state.user?.email || '';
  document.getElementById('sidebar-avatar').textContent = (state.user?.email || '?')[0].toUpperCase();
}

function switchCollection(id) {
  state.currentCollection = state.collections.find(c => c.id === id);
  const collRooms = state.rooms.filter(r => r.collection_id === id).sort((a,b) => a.sort_order - b.sort_order);
  state.currentRoom = collRooms[0] || null;
  state.currentShelf = null;
  renderApp();
}

function switchRoom(id) {
  state.currentRoom = state.rooms.find(r => r.id === id);
  state.currentShelf = null;
  renderApp();
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function renderStatsBar() {
  const items = collectionItems();
  const full    = items.filter(i => i.status === 'full').length;
  const partial = items.filter(i => i.status === 'partial').length;
  const rated   = items.filter(i => i.rating != null);
  const avgRating = rated.length ? (rated.reduce((s,i) => s + parseFloat(i.rating), 0) / rated.length).toFixed(1) : '—';

  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-pill"><span class="stat-val">${items.length}</span><span class="stat-lbl">Total</span></div>
    <div class="stat-pill"><span class="stat-val">${full}</span><span class="stat-lbl">Full</span></div>
    <div class="stat-pill"><span class="stat-val">${partial}</span><span class="stat-lbl">Partial</span></div>
    <div class="stat-pill"><span class="stat-val">${avgRating}</span><span class="stat-lbl">Avg Rating</span></div>
  `;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function renderBreadcrumb() {
  const col = state.currentCollection;
  const room = state.currentRoom;
  const shelf = state.currentShelf ? state.shelves.find(s => s.id === state.currentShelf) : null;
  const tc = getTypeConfig();

  let html = `<span class="breadcrumb-part" onclick="switchCollection('${col.id}')">${tc.icon} ${col.name}</span>`;
  if (room) {
    html += `<span class="breadcrumb-sep">›</span>`;
    if (shelf) {
      html += `<span class="breadcrumb-part" onclick="backToRoom()">🏠 ${room.name}</span>`;
      html += `<span class="breadcrumb-sep">›</span>`;
      html += `<span class="breadcrumb-current">📚 ${shelf.name}</span>`;
    } else {
      html += `<span class="breadcrumb-current">🏠 ${room.name}</span>`;
    }
  }
  document.getElementById('breadcrumb').innerHTML = html;
}

function backToRoom() {
  state.currentShelf = null;
  renderApp();
}

// ─── Room View ────────────────────────────────────────────────────────────────
function renderRoomView() {
  const container = document.getElementById('content-body');
  if (!state.currentRoom) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏠</div>
      <h3>No room selected</h3>
      <p>Add a room to start organising your collection.</p>
      <button class="btn btn-primary" onclick="openAddRoomModal()">Add a room</button>
    </div>`;
    return;
  }

  const room = state.currentRoom;
  const shelves = roomShelves(room.id);

  let shelvesHtml = '';
  shelves.forEach(shelf => {
    const items = shelfItems(shelf.id);
    const filled = items.length;
    const capacity = shelf.slots_wide * shelf.slots_tall;
    shelvesHtml += renderShelfUnit(shelf, items);
  });

  shelvesHtml += `<div class="room-add-shelf" onclick="openAddShelfModal()">
    <div class="add-icon">+</div>
    <span>Add shelf</span>
  </div>`;

  container.innerHTML = `<div class="room-view">
    <div class="room-scene">
      <div class="room-label">${room.name}</div>
      <div class="room-wall" id="room-wall">
        ${shelvesHtml}
      </div>
      <div class="room-floor"></div>
    </div>
  </div>`;

  // Header actions
  document.getElementById('header-actions').innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="openEditRoomModal()">Edit Room</button>
    <button class="btn btn-primary btn-sm" onclick="openAddShelfModal()">+ Add Shelf</button>
  `;
}

function renderShelfUnit(shelf, items) {
  const tc = getTypeConfig();
  const capacity = shelf.slots_wide * shelf.slots_tall;
  const filled = items.length;

  // Build mini rows
  let rowsHtml = '';
  for (let r = 0; r < shelf.slots_tall; r++) {
    rowsHtml += '<div class="shelf-row">';
    for (let c = 0; c < shelf.slots_wide; c++) {
      const item = slotItem(shelf.id, r, c);
      if (item && item.photo_url) {
        rowsHtml += `<div class="mini-slot filled"><img src="${item.photo_url}" alt=""></div>`;
      } else if (item) {
        rowsHtml += `<div class="mini-slot filled"></div>`;
      } else {
        rowsHtml += `<div class="mini-slot"></div>`;
      }
    }
    rowsHtml += '</div>';
  }

  return `<div class="shelf-unit" onclick="openShelf('${shelf.id}')">
    <div class="shelf-unit-label">${shelf.name}</div>
    <div class="shelf-cabinet">
      ${filled > 0 ? `<div class="shelf-count-badge">${filled}/${capacity}</div>` : ''}
      <div class="shelf-rows">${rowsHtml}</div>
    </div>
    <div class="shelf-base"></div>
  </div>`;
}

function openShelf(shelfId) {
  state.currentShelf = shelfId;
  renderApp();
}

// ─── Shelf View ───────────────────────────────────────────────────────────────
function renderShelfView() {
  const shelf = state.shelves.find(s => s.id === state.currentShelf);
  if (!shelf) { backToRoom(); return; }

  const items = shelfItems(shelf.id);
  const tc = getTypeConfig();
  const capacity = shelf.slots_wide * shelf.slots_tall;

  // Build full grid
  let rowsHtml = '';
  for (let r = 0; r < shelf.slots_tall; r++) {
    rowsHtml += '<div class="shelf-display-row">';
    for (let c = 0; c < shelf.slots_wide; c++) {
      const item = slotItem(shelf.id, r, c);
      rowsHtml += renderSlot(shelf.id, r, c, item, tc);
    }
    rowsHtml += '</div>';
  }

  const container = document.getElementById('content-body');
  container.innerHTML = `<div class="shelf-view">
    <div class="shelf-view-header">
      <div>
        <h2>${shelf.name}</h2>
        <div class="shelf-stats">${items.length} / ${capacity} slots filled · ${shelf.slots_wide} wide × ${shelf.slots_tall} tall</div>
      </div>
      <div class="shelf-view-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEditShelfModal('${shelf.id}')">Edit Shelf</button>
        <button class="btn btn-primary btn-sm" onclick="openAddItemModal(null, null, null)">+ Add Item</button>
      </div>
    </div>
    <div class="shelf-display">${rowsHtml}</div>
  </div>`;

  // Header actions
  document.getElementById('header-actions').innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="backToRoom()">← Room View</button>
    <button class="btn btn-primary btn-sm" onclick="openAddItemModal(null, null, null)">+ Add Item</button>
  `;
}

function renderSlot(shelfId, row, col, item, tc) {
  if (item) {
    const statusDot = item.status ? `<div class="slot-status ${item.status}"></div>` : '';
    const ratingBadge = item.rating != null ? `<div class="slot-rating">${item.rating}</div>` : '';

    let innerHtml;
    if (item.photo_url) {
      innerHtml = `<img src="${item.photo_url}" alt="${item.name}" loading="lazy">`;
    } else {
      const silType = tc.placeholder || 'custom';
      const svg = SILHOUETTES[silType] || SILHOUETTES.custom;
      innerHtml = `<div class="bottle-silhouette" style="color:var(--accent)">${svg}</div>`;
    }

    return `<div class="slot filled" onclick="openItemDetail('${item.id}')">
      ${innerHtml}
      ${statusDot}
      ${ratingBadge}
      <div class="slot-label">${item.name}</div>
    </div>`;
  } else {
    return `<div class="slot" onclick="openAddItemModal('${shelfId}', ${row}, ${col})">
      <div class="slot-add">
        <div class="add-plus">+</div>
        <div class="add-text">Add ${tc.placeholder || 'item'}</div>
      </div>
    </div>`;
  }
}

// ─── Item Modal ───────────────────────────────────────────────────────────────
function openAddItemModal(shelfId, row, col) {
  state.editingItem = null;
  state.pendingSlot = shelfId ? { shelfId, row, col } : null;
  populateItemModal(null);
  showModal('modal-item');
}

function openItemDetail(itemId) {
  const item = state.items.find(i => i.id === itemId);
  if (!item) return;
  state.editingItem = item;
  state.pendingSlot = null;
  populateItemModal(item);
  showModal('modal-item');
}

function populateItemModal(item) {
  const tc = getTypeConfig();
  const col = state.currentCollection;

  document.getElementById('item-modal-title').textContent = item ? 'Edit Item' : `Add ${tc.label}`;

  // Photo
  const preview = document.getElementById('photo-preview-img');
  const placeholder = document.getElementById('photo-placeholder');
  if (item?.photo_url) {
    preview.src = item.photo_url;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    preview.src = '';
    placeholder.style.display = 'flex';
  }
  document.getElementById('item-photo-input').value = '';
  window._pendingPhotoFile = null;
  window._photoUrl = item?.photo_url || null;

  // Basic fields
  document.getElementById('item-name').value = item?.name || '';
  document.getElementById('item-brand').value = item?.brand || '';
  document.getElementById('item-notes').value = item?.notes || '';

  // Type select
  const typeSelect = document.getElementById('item-type');
  const types = tc.itemTypes.length ? tc.itemTypes : ['Custom'];
  typeSelect.innerHTML = `<option value="">— Select type —</option>` +
    types.map(t => `<option value="${t}" ${item?.type === t ? 'selected' : ''}>${t}</option>`).join('');
  if (item?.type && !types.includes(item.type)) {
    typeSelect.innerHTML += `<option value="${item.type}" selected>${item.type}</option>`;
  }

  // Conditional fields
  const showYear    = tc.fields.includes('year');
  const showRegion  = tc.fields.includes('region');
  const showAbv     = tc.fields.includes('abv');
  document.getElementById('field-year').style.display   = showYear   ? '' : 'none';
  document.getElementById('field-region').style.display = showRegion ? '' : 'none';
  document.getElementById('field-abv').style.display    = showAbv    ? '' : 'none';

  document.getElementById('item-year').value   = item?.year   || '';
  document.getElementById('item-region').value = item?.region || '';
  document.getElementById('item-abv').value    = item?.abv    || '';

  // Rating
  const rating = item?.rating ?? 7;
  document.getElementById('item-rating').value = rating;
  document.getElementById('item-rating-val').textContent = item?.rating ?? '—';

  // Purchase fields
  document.getElementById('item-price').value    = item?.purchase_price || '';
  document.getElementById('item-date').value     = item?.purchase_date  || '';
  document.getElementById('item-store').value    = item?.purchase_store || '';

  // Status
  document.getElementById('item-status').value = item?.status || 'full';

  // Shelf/slot picker
  renderSlotPicker(item);

  // Delete button
  document.getElementById('btn-delete-item').style.display = item ? 'inline-flex' : 'none';
}

function renderSlotPicker(item) {
  const col = state.currentCollection;
  const collShelves = state.shelves.filter(s => {
    const room = state.rooms.find(r => r.id === s.room_id);
    return room?.collection_id === col?.id;
  });

  // Shelf select
  const shelfSelect = document.getElementById('slot-shelf-select');
  shelfSelect.innerHTML = `<option value="">— Unplaced —</option>` +
    collShelves.map(s => {
      const room = state.rooms.find(r => r.id === s.room_id);
      return `<option value="${s.id}" ${(item?.shelf_id === s.id || state.pendingSlot?.shelfId === s.id) ? 'selected' : ''}>${room?.name || ''} › ${s.name}</option>`;
    }).join('');

  const selectedShelfId = item?.shelf_id || state.pendingSlot?.shelfId || '';
  shelfSelect.value = selectedShelfId;
  renderSlotGrid(selectedShelfId, item?.slot_row ?? state.pendingSlot?.row, item?.slot_col ?? state.pendingSlot?.col, item?.id);
}

function renderSlotGrid(shelfId, selRow, selCol, excludeItemId) {
  const container = document.getElementById('slot-grid-container');
  if (!shelfId) { container.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:8px 0;">Select a shelf to choose a slot.</p>'; return; }

  const shelf = state.shelves.find(s => s.id === shelfId);
  if (!shelf) { container.innerHTML = ''; return; }

  let html = `<div class="slot-picker"><div class="slot-picker-header">
    <span>Select slot (row × col)</span>
    <span style="font-size:10px">${shelf.slots_tall}R × ${shelf.slots_wide}C</span>
  </div><div class="slot-picker-grid">`;

  for (let r = 0; r < shelf.slots_tall; r++) {
    html += '<div class="slot-picker-row">';
    for (let c = 0; c < shelf.slots_wide; c++) {
      const occupant = state.items.find(i => i.shelf_id === shelfId && i.slot_row === r && i.slot_col === c && i.id !== excludeItemId);
      const isSelected = r === selRow && c === selCol;
      const cls = occupant ? 'occupied' : (isSelected ? 'selected' : '');
      html += `<div class="slot-picker-cell ${cls}" ${!occupant ? `onclick="selectSlot(${r},${c})"` : 'title="Occupied"'}>${r},${c}</div>`;
    }
    html += '</div>';
  }
  html += '</div></div>';
  container.innerHTML = html;
}

function selectSlot(row, col) {
  const shelfId = document.getElementById('slot-shelf-select').value;
  const excludeId = state.editingItem?.id;
  state.pendingSlot = { shelfId, row, col };
  renderSlotGrid(shelfId, row, col, excludeId);
}

async function saveItem() {
  const name = document.getElementById('item-name').value.trim();
  if (!name) { toast('Name is required.', 'error'); return; }

  const col = state.currentCollection;
  const shelfId = document.getElementById('slot-shelf-select').value || null;
  const slot = state.pendingSlot;

  showLoading(true);
  try {
    // Upload photo if pending
    let photoUrl = window._photoUrl || null;
    if (window._pendingPhotoFile) {
      photoUrl = await uploadPhoto(window._pendingPhotoFile);
    }

    const ratingRaw = document.getElementById('item-rating').value;
    const ratingVal = document.getElementById('item-rating-val').textContent;

    const payload = {
      collection_id:  col.id,
      shelf_id:       shelfId || null,
      slot_row:       (shelfId && slot) ? slot.row : null,
      slot_col:       (shelfId && slot) ? slot.col : null,
      name,
      brand:          document.getElementById('item-brand').value.trim() || null,
      type:           document.getElementById('item-type').value || null,
      year:           parseInt(document.getElementById('item-year').value) || null,
      region:         document.getElementById('item-region').value.trim() || null,
      abv:            parseFloat(document.getElementById('item-abv').value) || null,
      rating:         ratingVal !== '—' ? parseFloat(ratingRaw) : null,
      notes:          document.getElementById('item-notes').value.trim() || null,
      purchase_price: parseFloat(document.getElementById('item-price').value) || null,
      purchase_date:  document.getElementById('item-date').value || null,
      purchase_store: document.getElementById('item-store').value.trim() || null,
      status:         document.getElementById('item-status').value,
      photo_url:      photoUrl,
    };

    if (state.editingItem) {
      const { error } = await sb.from('items').update(payload).eq('id', state.editingItem.id);
      if (error) throw error;
      const idx = state.items.findIndex(i => i.id === state.editingItem.id);
      if (idx >= 0) state.items[idx] = { ...state.items[idx], ...payload };
      toast('Item updated.', 'success');
    } else {
      const { data, error } = await sb.from('items').insert(payload).select().single();
      if (error) throw error;
      state.items.push(data);
      toast('Item added.', 'success');
    }

    showLoading(false);
    closeModal('modal-item');
    renderApp();
  } catch (e) {
    showLoading(false);
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteItem() {
  if (!state.editingItem) return;
  if (!confirm(`Delete "${state.editingItem.name}"? This cannot be undone.`)) return;
  showLoading(true);
  const { error } = await sb.from('items').delete().eq('id', state.editingItem.id);
  if (error) { showLoading(false); toast('Error: ' + error.message, 'error'); return; }
  state.items = state.items.filter(i => i.id !== state.editingItem.id);
  showLoading(false);
  closeModal('modal-item');
  toast('Item deleted.', 'success');
  renderApp();
}

// ─── Photo upload ─────────────────────────────────────────────────────────────
async function uploadPhoto(file) {
  const ext = file.name.split('.').pop();
  const path = `${state.user.id}/${Date.now()}.${ext}`;
  const { data, error } = await sb.storage.from('item-photos').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = sb.storage.from('item-photos').getPublicUrl(path);
  return publicUrl;
}

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  window._pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = document.getElementById('photo-preview-img');
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('photo-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  window._pendingPhotoFile = null;
  window._photoUrl = null;
  document.getElementById('photo-preview-img').style.display = 'none';
  document.getElementById('photo-preview-img').src = '';
  document.getElementById('photo-placeholder').style.display = 'flex';
  document.getElementById('item-photo-input').value = '';
}

// ─── Room Management ──────────────────────────────────────────────────────────
function openAddRoomModal() {
  document.getElementById('room-modal-title').textContent = 'Add Room';
  document.getElementById('room-name-input').value = '';
  document.getElementById('room-desc-input').value = '';
  document.getElementById('btn-delete-room').style.display = 'none';
  window._editingRoomId = null;
  showModal('modal-room');
}

function openEditRoomModal() {
  if (!state.currentRoom) return;
  document.getElementById('room-modal-title').textContent = 'Edit Room';
  document.getElementById('room-name-input').value = state.currentRoom.name;
  document.getElementById('room-desc-input').value = state.currentRoom.description || '';
  document.getElementById('btn-delete-room').style.display = 'inline-flex';
  window._editingRoomId = state.currentRoom.id;
  showModal('modal-room');
}

async function saveRoom() {
  const name = document.getElementById('room-name-input').value.trim();
  if (!name) { toast('Room name is required.', 'error'); return; }
  const desc = document.getElementById('room-desc-input').value.trim();
  showLoading(true);
  try {
    if (window._editingRoomId) {
      const { error } = await sb.from('rooms').update({ name, description: desc }).eq('id', window._editingRoomId);
      if (error) throw error;
      const idx = state.rooms.findIndex(r => r.id === window._editingRoomId);
      if (idx >= 0) { state.rooms[idx].name = name; state.rooms[idx].description = desc; }
      if (state.currentRoom?.id === window._editingRoomId) { state.currentRoom.name = name; }
      toast('Room updated.', 'success');
    } else {
      const { data, error } = await sb.from('rooms').insert({
        collection_id: state.currentCollection.id, name, description: desc,
        sort_order: state.rooms.filter(r => r.collection_id === state.currentCollection.id).length,
      }).select().single();
      if (error) throw error;
      state.rooms.push(data);
      state.currentRoom = data;
      toast('Room added.', 'success');
    }
    showLoading(false);
    closeModal('modal-room');
    renderApp();
  } catch (e) {
    showLoading(false);
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteRoom() {
  if (!window._editingRoomId) return;
  const room = state.rooms.find(r => r.id === window._editingRoomId);
  if (!confirm(`Delete room "${room?.name}"? All shelves and items in this room will be deleted.`)) return;
  showLoading(true);
  const { error } = await sb.from('rooms').delete().eq('id', window._editingRoomId);
  if (error) { showLoading(false); toast('Error: ' + error.message, 'error'); return; }
  state.rooms = state.rooms.filter(r => r.id !== window._editingRoomId);
  state.shelves = state.shelves.filter(s => s.room_id !== window._editingRoomId);
  state.items = state.items.filter(i => {
    const shelf = state.shelves.find(s => s.id === i.shelf_id);
    return shelf !== undefined;
  });
  const collRooms = state.rooms.filter(r => r.collection_id === state.currentCollection.id);
  state.currentRoom = collRooms[0] || null;
  state.currentShelf = null;
  showLoading(false);
  closeModal('modal-room');
  toast('Room deleted.', 'success');
  renderApp();
}

// ─── Shelf Management ─────────────────────────────────────────────────────────
function openAddShelfModal() {
  document.getElementById('shelf-modal-title').textContent = 'Add Shelf';
  document.getElementById('shelf-name-input').value = '';
  document.getElementById('shelf-wide-input').value = '6';
  document.getElementById('shelf-tall-input').value = '4';
  document.getElementById('btn-delete-shelf').style.display = 'none';
  window._editingShelfId = null;
  renderAddShelfPreview();
  showModal('modal-shelf');
}

function openEditShelfModal(shelfId) {
  const shelf = state.shelves.find(s => s.id === shelfId);
  if (!shelf) return;
  document.getElementById('shelf-modal-title').textContent = 'Edit Shelf';
  document.getElementById('shelf-name-input').value = shelf.name;
  document.getElementById('shelf-wide-input').value = shelf.slots_wide;
  document.getElementById('shelf-tall-input').value = shelf.slots_tall;
  document.getElementById('btn-delete-shelf').style.display = 'inline-flex';
  window._editingShelfId = shelfId;
  renderAddShelfPreview();
  showModal('modal-shelf');
}

function renderAddShelfPreview() {
  const wide = parseInt(document.getElementById('shelf-wide-input').value) || 6;
  const tall = parseInt(document.getElementById('shelf-tall-input').value) || 4;
  const preview = document.getElementById('add-shelf-size-preview');
  let html = '<div class="shelf-size-preview">';
  for (let r = 0; r < Math.min(tall, 5); r++) {
    html += '<div class="shelf-size-row">';
    for (let c = 0; c < Math.min(wide, 10); c++) html += '<div class="shelf-size-cell"></div>';
    html += '</div>';
  }
  if (tall > 5) html += `<p style="font-size:10px;color:var(--muted);text-align:center">+ ${tall-5} more rows</p>`;
  html += '</div>';
  preview.innerHTML = html;
}

async function saveShelf() {
  const name = document.getElementById('shelf-name-input').value.trim();
  if (!name) { toast('Shelf name is required.', 'error'); return; }
  const slotsWide = parseInt(document.getElementById('shelf-wide-input').value) || 6;
  const slotsTall = parseInt(document.getElementById('shelf-tall-input').value) || 4;
  if (!state.currentRoom) { toast('Select a room first.', 'error'); return; }
  showLoading(true);
  try {
    if (window._editingShelfId) {
      const { error } = await sb.from('shelves').update({ name, slots_wide: slotsWide, slots_tall: slotsTall }).eq('id', window._editingShelfId);
      if (error) throw error;
      const idx = state.shelves.findIndex(s => s.id === window._editingShelfId);
      if (idx >= 0) { state.shelves[idx].name = name; state.shelves[idx].slots_wide = slotsWide; state.shelves[idx].slots_tall = slotsTall; }
      toast('Shelf updated.', 'success');
    } else {
      const { data, error } = await sb.from('shelves').insert({
        room_id: state.currentRoom.id, name, slots_wide: slotsWide, slots_tall: slotsTall,
        sort_order: roomShelves(state.currentRoom.id).length,
      }).select().single();
      if (error) throw error;
      state.shelves.push(data);
      toast('Shelf added.', 'success');
    }
    showLoading(false);
    closeModal('modal-shelf');
    renderApp();
  } catch (e) {
    showLoading(false);
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteShelf() {
  if (!window._editingShelfId) return;
  const shelf = state.shelves.find(s => s.id === window._editingShelfId);
  if (!confirm(`Delete shelf "${shelf?.name}"? Items on this shelf will become unplaced.`)) return;
  showLoading(true);
  const { error } = await sb.from('shelves').delete().eq('id', window._editingShelfId);
  if (error) { showLoading(false); toast('Error: ' + error.message, 'error'); return; }
  // Unplace items
  state.items = state.items.map(i => i.shelf_id === window._editingShelfId ? { ...i, shelf_id: null, slot_row: null, slot_col: null } : i);
  state.shelves = state.shelves.filter(s => s.id !== window._editingShelfId);
  if (state.currentShelf === window._editingShelfId) state.currentShelf = null;
  showLoading(false);
  closeModal('modal-shelf');
  toast('Shelf deleted.', 'success');
  renderApp();
}

// ─── New collection modal ─────────────────────────────────────────────────────
function openNewCollectionModal() {
  document.getElementById('new-col-name').value = '';
  document.getElementById('new-col-desc').value = '';
  document.getElementById('new-col-type').value = 'whiskey';
  showModal('modal-new-collection');
}

async function saveNewCollection() {
  const name = document.getElementById('new-col-name').value.trim();
  if (!name) { toast('Name is required.', 'error'); return; }
  const type = document.getElementById('new-col-type').value;
  const desc = document.getElementById('new-col-desc').value.trim();
  const tc = COLLECTION_TYPES[type];
  showLoading(true);
  try {
    const { data: col, error } = await sb.from('collections').insert({
      user_id: state.user.id, name, type, icon: tc.icon, accent_color: tc.color, description: desc,
    }).select().single();
    if (error) throw error;
    // Create a default room
    const { data: room, error: re } = await sb.from('rooms').insert({
      collection_id: col.id, name: 'Main Room', sort_order: 0,
    }).select().single();
    if (re) throw re;
    state.collections.push(col);
    state.rooms.push(room);
    state.currentCollection = col;
    state.currentRoom = room;
    state.currentShelf = null;
    showLoading(false);
    closeModal('modal-new-collection');
    toast(`${tc.label} collection created!`, 'success');
    renderApp();
  } catch (e) {
    showLoading(false);
    toast('Error: ' + e.message, 'error');
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auth tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab, .auth-form').forEach(el => el.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Supabase config toggle
  document.getElementById('config-toggle').addEventListener('click', () => {
    document.getElementById('config-fields').classList.toggle('open');
  });

  // Pre-fill saved Supabase creds
  const savedUrl = localStorage.getItem('ct_sb_url') || '';
  const savedKey = localStorage.getItem('ct_sb_key') || '';
  if (savedUrl) document.getElementById('sb-url').value = savedUrl;
  if (savedKey) document.getElementById('sb-key').value = savedKey;

  // Save creds on save button
  document.getElementById('btn-save-config').addEventListener('click', () => {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    if (url) localStorage.setItem('ct_sb_url', url);
    if (key) localStorage.setItem('ct_sb_key', key);
    toast('Supabase credentials saved.', 'success');
  });

  // Sign in
  document.getElementById('btn-signin').addEventListener('click', async () => {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    if (url) localStorage.setItem('ct_sb_url', url);
    if (key) localStorage.setItem('ct_sb_key', key);
    if (!initSupabase()) { showError('auth-error', 'Please enter your Supabase URL and anon key first.'); return; }
    await signIn(document.getElementById('signin-email').value, document.getElementById('signin-password').value);
  });

  // Sign up
  document.getElementById('btn-signup').addEventListener('click', async () => {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();
    if (url) localStorage.setItem('ct_sb_url', url);
    if (key) localStorage.setItem('ct_sb_key', key);
    if (!initSupabase()) { showError('auth-signup-error', 'Please enter your Supabase URL and anon key first.'); return; }
    await signUp(document.getElementById('signup-email').value, document.getElementById('signup-password').value);
  });

  // Rating slider
  document.getElementById('item-rating').addEventListener('input', e => {
    document.getElementById('item-rating-val').textContent = e.target.value;
  });

  // Photo click
  document.getElementById('photo-preview-area').addEventListener('click', () => {
    document.getElementById('item-photo-input').click();
  });
  document.getElementById('item-photo-input').addEventListener('change', handlePhotoSelect);

  // Slot shelf change
  document.getElementById('slot-shelf-select').addEventListener('change', e => {
    state.pendingSlot = null;
    renderSlotGrid(e.target.value, null, null, state.editingItem?.id);
  });

  // Shelf size preview in add-shelf modal
  ['shelf-wide-input','shelf-tall-input'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderAddShelfPreview);
  });

  // Wizard shelf size preview
  ['wizard-shelf-wide','wizard-shelf-tall'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateShelfSizePreview);
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  // Load Supabase JS then init
  const script = document.createElement('script');
  script.src = SUPABASE_CDN;
  script.onload = checkAuth;
  script.onerror = () => { showLoading(false); toast('Failed to load Supabase SDK.', 'error'); };
  document.head.appendChild(script);
});
