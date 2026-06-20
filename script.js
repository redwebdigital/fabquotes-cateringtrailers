/* =========================================
   FABQUOTES – CATERING TRAILERS
   script.js v5 – PHP/MySQL backend
   ========================================= */
'use strict';

const API = 'api.php';

/* ---- STATE ---- */
let state = {
  user: null,
  trailers: [],
  addons: [],
  specs: [],
  quotes: [],
  selectedTrailerId: null,
  selectedAddonIds: [],
  quoteAddonOverrides: {},
  viewingQuoteId: null,
  editingQuoteId: null
};

/* ---- API HELPER ---- */
async function api(action, body = null) {
  const opts = { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}?action=${action}`, opts);
  return res.json();
}

/* ---- UTILITIES ---- */
function fmtPrice(n) {
  return '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmtDate(ts) {
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---- TOAST ---- */
let toastTimer;
function showToast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

/* ---- LOGIN ---- */
document.getElementById('btnLogin').addEventListener('click', doLogin);
document.getElementById('loginUsername').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!username) { errEl.textContent = 'Please enter your username.'; errEl.style.display = 'block'; return; }
  const res = await api('login', { username });
  if (res.error) { errEl.textContent = 'Username not recognised. Try Phil123 or Ste123.'; errEl.style.display = 'block'; return; }
  state.user = res.user;
  localStorage.setItem('fq_user', JSON.stringify({ user: res.user, expiry: Date.now() + 86400000 }));
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('headerUser').textContent = res.user.username;
  await loadData();
}

document.getElementById('btnLogout').addEventListener('click', () => {
  state.user = null;
  localStorage.removeItem('fq_user');
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
});

/* ---- LOAD ALL DATA FROM SERVER ---- */
async function loadData() {
  const res = await api('getData');
  if (res.error) { showToast('Error loading data', 'error'); return; }
  state.trailers = res.trailers || [];
  state.addons   = res.addons   || [];
  state.specs    = res.specs    || [];
  state.quotes   = res.quotes   || [];
  renderTrailers();
  renderAddons();
  updateTotal();
}

/* ---- CALC TOTAL ---- */
function calcTotal() {
  let total = 0;
  const trailer = state.trailers.find(t => t.id === state.selectedTrailerId);
  if (trailer) total += trailer.price;
  state.selectedAddonIds.forEach(id => {
    const a = state.addons.find(x => x.id === id);
    if (a) total += a.price;
  });
  return total;
}

/* ---- RENDER TRAILERS ---- */
function renderTrailers() {
  const grid = document.getElementById('trailerGrid');
  if (!grid) return;
  grid.innerHTML = state.trailers.map(t => `
    <button class="trailer-btn${state.selectedTrailerId === t.id ? ' selected' : ''}" data-id="${t.id}">
      <div class="trailer-btn-icon"><img src="trailer-icon.png" style="width:60px;height:auto;margin-bottom:6px" /></div>
      <div class="trailer-btn-name">${esc(t.name)}</div>
      <div class="trailer-btn-price">${fmtPrice(t.price)}</div>
    </button>
  `).join('');
  grid.querySelectorAll('.trailer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedTrailerId = btn.dataset.id;
      renderTrailers(); updateTotal();
    });
  });
}

/* ---- RENDER ADDONS ---- */
function renderAddons() {
  const list = document.getElementById('addonList');
  if (!list) return;
  list.innerHTML = state.addons.map(a => {
    const checked = state.selectedAddonIds.includes(a.id);
    const override = state.quoteAddonOverrides[a.id] || {};
    const supplierUrl   = override.supplierUrl   !== undefined ? override.supplierUrl   : (a.supplierUrl   || '');
    const supplierPrice = override.supplierPrice !== undefined ? override.supplierPrice : (a.supplierPrice || '');
    return `
      <div class="addon-item${checked ? ' checked' : ''}" data-id="${a.id}" role="checkbox" aria-checked="${checked}" tabindex="0">
        <div class="addon-checkbox"></div>
        <div class="addon-info">
          <div class="addon-name">${esc(a.name)}</div>
          <div class="addon-price">${fmtPrice(a.price)}</div>
          ${checked ? `
          <div class="addon-supplier-fields" onclick="event.stopPropagation()">
            <input type="url" class="supplier-url-input" placeholder="Supplier website URL" value="${esc(supplierUrl)}" data-id="${a.id}" />
            <input type="number" class="supplier-price-input" placeholder="Buy price £" value="${esc(supplierPrice)}" min="0" data-id="${a.id}" />
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.addon-item').forEach(item => {
    const toggle = (e) => {
      if (e.target.closest('.addon-supplier-fields')) return;
      const id = item.dataset.id;
      if (state.selectedAddonIds.includes(id)) {
        state.selectedAddonIds = state.selectedAddonIds.filter(x => x !== id);
      } else {
        state.selectedAddonIds.push(id);
      }
      updateTotal(); renderAddons();
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(e); } });
  });

  list.querySelectorAll('.supplier-url-input').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.id;
      if (!state.quoteAddonOverrides[id]) state.quoteAddonOverrides[id] = {};
      state.quoteAddonOverrides[id].supplierUrl = input.value.trim();
    });
  });
  list.querySelectorAll('.supplier-price-input').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.id;
      if (!state.quoteAddonOverrides[id]) state.quoteAddonOverrides[id] = {};
      state.quoteAddonOverrides[id].supplierPrice = input.value.trim();
    });
  });
}

function updateTotal() {
  document.getElementById('totalAmount').textContent = fmtPrice(calcTotal());
}

/* ---- BUILD SUMMARY HTML ---- */
function buildSummaryHTML(quote, adminMode = false) {
  const trailer = { name: quote.trailer_name || quote.trailerName || 'N/A', price: quote.trailer_price || quote.trailerPrice || 0 };
  const addons  = quote.addons || [];
  const specs   = quote.specs  || [];
  const name    = quote.customer_name || quote.name || '';
  const phone   = quote.customer_phone || quote.phone || '';
  const notes   = quote.notes || '';
  const date    = quote.created_at || quote.date;

  let html = `
    <div class="summary-date">Generated: ${fmtDate(date)}</div>
    <div class="summary-customer">
      <div class="sc-name">${esc(name || 'N/A')}</div>
      <div class="sc-phone">${esc(phone)}</div>
      ${notes ? `<div class="sc-notes">${esc(notes)}</div>` : ''}
    </div>
    <div class="summary-row">
      <span class="sum-label"><strong>${esc(trailer.name)}</strong></span>
      <span class="sum-val">${fmtPrice(trailer.price)}</span>
    </div>
  `;

  if (specs.length) {
    html += `<div class="summary-specs-heading">Standard Specifications Included</div>`;
    html += `<ul class="summary-specs-list">` + specs.map(s => `<li>${esc(s.text)}</li>`).join('') + `</ul>`;
  }

  if (addons.length) {
    html += `<div class="summary-specs-heading">Selected Add-Ons</div>`;
    addons.forEach(a => {
      html += `<div class="summary-row"><span class="sum-label">${esc(a.name)}</span><span class="sum-val">${fmtPrice(a.price)}</span></div>`;
      if (adminMode && (a.supplierUrl || a.supplierPrice)) {
        html += `<div class="summary-supplier-info">
          ${a.supplierUrl ? `<a href="${esc(a.supplierUrl)}" target="_blank" class="supplier-link">🔗 ${esc(a.supplierUrl)}</a>` : ''}
          ${a.supplierPrice ? `<span class="supplier-cost">Buy price: ${fmtPrice(a.supplierPrice)}</span>` : ''}
        </div>`;
      }
    });
  }

  html += `<div class="summary-row total-row"><span class="sum-label">Total</span><span class="sum-val">${fmtPrice(quote.total)}</span></div>`;
  return html;
}

/* ---- SHOW SUMMARY ---- */
function showSummary() {
  const trailer = state.trailers.find(t => t.id === state.selectedTrailerId);
  if (!trailer) { showToast('Please select a trailer size first.', 'error'); return; }
  const quoteObj = buildQuoteObj(trailer);
  const section = document.getElementById('sectionSummary');
  section.style.display = 'block';
  document.getElementById('summaryContent').innerHTML = buildSummaryHTML(quoteObj);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildQuoteObj(trailer) {
  const addons = state.selectedAddonIds.map(id => {
    const a = state.addons.find(x => x.id === id);
    if (!a) return null;
    const override = state.quoteAddonOverrides[id] || {};
    return {
      id: a.id, name: a.name, price: a.price,
      supplierUrl:   override.supplierUrl   !== undefined ? override.supplierUrl   : (a.supplierUrl   || ''),
      supplierPrice: override.supplierPrice !== undefined ? override.supplierPrice : (a.supplierPrice || '')
    };
  }).filter(Boolean);

  return {
    trailer_id:    trailer.id,
    trailer_name:  trailer.name,
    trailer_price: trailer.price,
    addons,
    specs:         [...state.specs],
    name:          document.getElementById('custName').value.trim(),
    phone:         document.getElementById('custPhone').value.trim(),
    notes:         document.getElementById('custNotes').value.trim(),
    total:         calcTotal(),
    created_at:    new Date().toISOString()
  };
}

/* ---- SAVE QUOTE ---- */
async function saveQuote() {
  const trailer = state.trailers.find(t => t.id === state.selectedTrailerId);
  if (!trailer) { showToast('Please select a trailer size.', 'error'); return; }
  const name = document.getElementById('custName').value.trim();
  if (!name) { showToast('Please enter a customer name.', 'error'); return; }

  const quoteObj = buildQuoteObj(trailer);
  quoteObj.userId      = state.user?.id;
  quoteObj.trailerId   = trailer.id;
  quoteObj.trailerName = trailer.name;
  quoteObj.trailerPrice = trailer.price;

  let res;
  if (state.editingQuoteId) {
    quoteObj.id = state.editingQuoteId;
    res = await api('updateQuote', quoteObj);
    state.editingQuoteId = null;
  } else {
    res = await api('saveQuote', quoteObj);
  }

  if (res.error) { showToast('Error saving quote', 'error'); return; }
  showToast('Quote saved! ✓', 'success');
  await loadData();
}

/* ---- CLEAR ---- */
function clearForm() {
  state.selectedTrailerId = null;
  state.selectedAddonIds = [];
  state.quoteAddonOverrides = {};
  state.editingQuoteId = null;
  document.getElementById('custName').value = '';
  document.getElementById('custPhone').value = '';
  document.getElementById('custNotes').value = '';
  document.getElementById('sectionSummary').style.display = 'none';
  renderTrailers(); renderAddons(); updateTotal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- SAVED QUOTES ---- */
function openSavedQuotes() {
  renderSavedList(state.quotes);
  document.getElementById('pageSaved').style.display = 'block';
  document.getElementById('searchInput').value = '';
}

function renderSavedList(quotes) {
  const list = document.getElementById('savedList');
  if (!quotes.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No saved quotes yet.</div></div>`;
    return;
  }
  list.innerHTML = quotes.map(q => `
    <div class="saved-card" data-id="${q.id}">
      <div class="saved-card-name">${esc(q.customer_name || q.name)}</div>
      <div class="saved-card-date">${fmtDate(q.created_at)}</div>
      <div class="saved-card-meta">
        <span class="saved-card-trailer">${esc(q.trailer_name || '')}</span>
        <span class="saved-card-price">${fmtPrice(q.total)}</span>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.saved-card').forEach(card => {
    card.addEventListener('click', () => openQuoteDetail(card.dataset.id));
  });
}

document.getElementById('searchInput').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  const filtered = q ? state.quotes.filter(s => (s.customer_name || s.name || '').toLowerCase().includes(q)) : state.quotes;
  renderSavedList(filtered);
});

/* ---- QUOTE DETAIL ---- */
function openQuoteDetail(id) {
  const quote = state.quotes.find(q => q.id === id);
  if (!quote) return;
  state.viewingQuoteId = id;
  document.getElementById('quoteDetailContent').innerHTML = buildSummaryHTML(quote, true);
  document.getElementById('pageQuoteDetail').style.display = 'block';
}

/* ---- EDIT ---- */
function editQuote() {
  const quote = state.quotes.find(q => q.id === state.viewingQuoteId);
  if (!quote) return;

  const trailerExists = state.trailers.find(t => t.id === quote.trailer_id);
  state.selectedTrailerId = trailerExists ? quote.trailer_id : null;
  state.editingQuoteId = quote.id;

  const addonIds = (quote.addons || []).map(a => a.id).filter(id => state.addons.find(a => a.id === id));
  state.selectedAddonIds = addonIds;

  state.quoteAddonOverrides = {};
  (quote.addons || []).forEach(a => {
    state.quoteAddonOverrides[a.id] = { supplierUrl: a.supplierUrl || '', supplierPrice: a.supplierPrice || '' };
  });

  document.getElementById('custName').value  = quote.customer_name || '';
  document.getElementById('custPhone').value = quote.customer_phone || '';
  document.getElementById('custNotes').value = quote.notes || '';

  closeOverlay('pageQuoteDetail');
  closeOverlay('pageSaved');
  renderTrailers(); renderAddons(); updateTotal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Quote loaded for editing.');
}

/* ---- DELETE ---- */
async function deleteQuote() {
  if (!confirm('Delete this quote? This cannot be undone.')) return;
  const res = await api('deleteQuote', { id: state.viewingQuoteId });
  if (res.error) { showToast('Error deleting quote', 'error'); return; }
  closeOverlay('pageQuoteDetail');
  await loadData();
  renderSavedList(state.quotes);
  showToast('Quote deleted.');
}

/* ---- PRINT ---- */
function printQuote(adminMode = false) {
  const quote = state.quotes.find(q => q.id === state.viewingQuoteId);
  if (!quote) return;

  const trailer  = { name: quote.trailer_name, price: quote.trailer_price };
  const addons   = quote.addons || [];
  const specs    = quote.specs  || [];

  const addonRows = addons.map(a => {
    let row = `<tr><td>${esc(a.name)}</td><td style="text-align:right">${fmtPrice(a.price)}</td></tr>`;
    if (adminMode && (a.supplierUrl || a.supplierPrice)) {
      row += `<tr class="print-supplier-row"><td colspan="2" style="font-size:12px;color:#666;padding:2px 10px 8px;">
        ${a.supplierUrl ? `🔗 <a href="${esc(a.supplierUrl)}">${esc(a.supplierUrl)}</a>&nbsp;&nbsp;` : ''}
        ${a.supplierPrice ? `Buy: ${fmtPrice(a.supplierPrice)}` : ''}
      </td></tr>`;
    }
    return row;
  }).join('');

  const specsList = specs.length ? `<div class="print-specs"><h3>Standard Specifications Included</h3><ul>${specs.map(s=>`<li>${esc(s.text)}</li>`).join('')}</ul></div>` : '';

  document.getElementById('printArea').innerHTML = `
    <div class="print-header">
      <h1>FabQuotes – Catering Trailer Quote${adminMode ? ' <span style="color:#c0392b;font-size:14px;">[ADMIN COPY]</span>' : ''}</h1>
      <p>fabquotes.com/cateringtrailers &nbsp;|&nbsp; ${fmtDate(quote.created_at)}</p>
    </div>
    <div class="print-customer">
      <h2>${esc(quote.customer_name)}</h2>
      ${quote.customer_phone ? `<p>📞 ${esc(quote.customer_phone)}</p>` : ''}
    </div>
    <div class="print-items">
      <table>
        <thead><tr><th>Item</th><th style="text-align:right">Price</th></tr></thead>
        <tbody>
          <tr><td><strong>${esc(trailer.name)}</strong></td><td style="text-align:right">${fmtPrice(trailer.price)}</td></tr>
          ${addonRows}
        </tbody>
      </table>
    </div>
    ${specsList}
    <div class="print-total">Total: <span>${fmtPrice(quote.total)}</span></div>
    ${quote.notes ? `<div class="print-notes"><strong>Notes:</strong> ${esc(quote.notes)}</div>` : ''}
    <div class="print-footer">This quote was generated by FabQuotes. Prices are subject to change.</div>
  `;
  window.print();
}

/* ---- CLOSE OVERLAY ---- */
function closeOverlay(id) { document.getElementById(id).style.display = 'none'; }

/* ---- MANAGE ---- */
async function openManage() {
  await loadData();
  renderManageTrailers();
  renderManageAddons();
  renderManageSpecs();
  document.getElementById('pageManage').style.display = 'block';
}

function renderManageTrailers() {
  const list = document.getElementById('manageTrailerList');
  if (!state.trailers.length) { list.innerHTML = '<div style="padding:14px 16px;color:#718096;font-size:14px;">No trailers yet.</div>'; return; }
  list.innerHTML = state.trailers.map(t => `
    <div class="manage-item" data-id="${t.id}">
      <span class="manage-item-name">${esc(t.name)}</span>
      <span class="manage-item-price">${fmtPrice(t.price)}</span>
      <div class="manage-item-actions">
        <button class="manage-btn manage-btn-edit" data-action="edit-trailer" data-id="${t.id}">Edit</button>
        <button class="manage-btn manage-btn-delete" data-action="del-trailer" data-id="${t.id}">Delete</button>
      </div>
    </div>
  `).join('');
  bindManageEvents('manageTrailerList');
}

function renderManageAddons() {
  const list = document.getElementById('manageAddonList');
  if (!state.addons.length) { list.innerHTML = '<div style="padding:14px 16px;color:#718096;font-size:14px;">No add-ons yet.</div>'; return; }
  list.innerHTML = state.addons.map(a => `
    <div class="manage-item manage-item-addon" data-id="${a.id}">
      <div class="manage-item-top">
        <span class="manage-item-name">${esc(a.name)}</span>
        <span class="manage-item-price">${fmtPrice(a.price)}</span>
        <div class="manage-item-actions">
          <button class="manage-btn manage-btn-edit" data-action="edit-addon" data-id="${a.id}">Edit</button>
          <button class="manage-btn manage-btn-delete" data-action="del-addon" data-id="${a.id}">Delete</button>
        </div>
      </div>
      <div class="manage-supplier-row">
        <input type="url" class="manage-supplier-url" placeholder="Supplier URL" value="${esc(a.supplierUrl || a.supplier_url || '')}" data-id="${a.id}" />
        <input type="number" class="manage-supplier-price" placeholder="Buy price £" value="${esc(a.supplierPrice || a.supplier_price || '')}" min="0" data-id="${a.id}" />
        <button class="manage-btn manage-btn-edit manage-btn-supplier-save" data-action="save-supplier" data-id="${a.id}">Save</button>
      </div>
    </div>
  `).join('');
  bindManageEvents('manageAddonList');
}

function renderManageSpecs() {
  const list = document.getElementById('manageSpecsList');
  if (!list) return;
  if (!state.specs.length) { list.innerHTML = '<div style="padding:14px 16px;color:#718096;font-size:14px;">No specs yet.</div>'; return; }
  list.innerHTML = state.specs.map(s => `
    <div class="manage-item" data-id="${s.id}">
      <span class="manage-item-name" style="font-size:13px;flex:1">${esc(s.text)}</span>
      <div class="manage-item-actions">
        <button class="manage-btn manage-btn-edit" data-action="edit-spec" data-id="${s.id}">Edit</button>
        <button class="manage-btn manage-btn-delete" data-action="del-spec" data-id="${s.id}">Delete</button>
      </div>
    </div>
  `).join('');
  bindManageEvents('manageSpecsList');
}

function bindManageEvents(containerId) {
  document.getElementById(containerId).querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', handleManageAction);
  });
}

async function handleManageAction(e) {
  const action = e.target.dataset.action;
  const id     = e.target.dataset.id;
  const item   = e.target.closest('.manage-item');

  if (action === 'del-trailer') {
    if (!confirm('Delete this trailer?')) return;
    await api('deleteTrailer', { id });
    await loadData(); renderManageTrailers();
  }
  if (action === 'del-addon') {
    if (!confirm('Delete this add-on?')) return;
    await api('deleteAddon', { id });
    await loadData(); renderManageAddons();
  }
  if (action === 'del-spec') {
    if (!confirm('Delete this spec?')) return;
    await api('deleteSpec', { id });
    await loadData(); renderManageSpecs();
  }
  if (action === 'edit-trailer') {
    const t = state.trailers.find(x => x.id === id);
    if (!t) return;
    inlineEdit(item, { name: t.name, price: t.price }, async (name, price) => {
      await api('updateTrailer', { id, name, price });
      await loadData(); renderManageTrailers(); renderTrailers();
      showToast('Updated ✓', 'success');
    });
  }
  if (action === 'edit-addon') {
    const a = state.addons.find(x => x.id === id);
    if (!a) return;
    inlineEdit(item, { name: a.name, price: a.price }, async (name, price) => {
      await api('updateAddon', { id, name, price, supplierUrl: a.supplierUrl || '', supplierPrice: a.supplierPrice || '' });
      await loadData(); renderManageAddons(); renderAddons();
      showToast('Updated ✓', 'success');
    });
  }
  if (action === 'edit-spec') {
    const s = state.specs.find(x => x.id === id);
    if (!s) return;
    inlineEditSpec(item, s.text, async (text) => {
      await api('updateSpec', { id, text });
      await loadData(); renderManageSpecs();
      showToast('Updated ✓', 'success');
    });
  }
  if (action === 'save-supplier') {
    const a = state.addons.find(x => x.id === id);
    if (!a) return;
    const urlInput   = item.querySelector('.manage-supplier-url');
    const priceInput = item.querySelector('.manage-supplier-price');
    const supplierUrl   = urlInput   ? urlInput.value.trim()   : '';
    const supplierPrice = priceInput ? priceInput.value.trim() : '';
    await api('updateAddon', { id, name: a.name, price: a.price, supplierUrl, supplierPrice });
    await loadData(); renderManageAddons();
    showToast('Supplier info saved ✓', 'success');
  }
}

function inlineEdit(itemEl, obj, onSave) {
  itemEl.innerHTML = `
    <input class="name-edit" type="text" value="${esc(obj.name)}" placeholder="Name" style="flex:1" />
    <input class="price-edit" type="number" value="${obj.price}" placeholder="Price £" min="0" style="max-width:100px" />
    <div class="manage-item-actions">
      <button class="manage-btn manage-btn-edit" id="inlineSaveBtn">Save</button>
      <button class="manage-btn manage-btn-delete" id="inlineCancelBtn">Cancel</button>
    </div>
  `;
  itemEl.querySelector('#inlineSaveBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const name  = itemEl.querySelector('.name-edit').value.trim();
    const price = parseFloat(itemEl.querySelector('.price-edit').value);
    if (!name || isNaN(price) || price < 0) { showToast('Enter valid name and price.', 'error'); return; }
    await onSave(name, price);
  });
  itemEl.querySelector('#inlineCancelBtn').addEventListener('click', (e) => { e.stopPropagation(); renderManageTrailers(); renderManageAddons(); });
  itemEl.querySelector('.name-edit').focus();
}

function inlineEditSpec(itemEl, text, onSave) {
  itemEl.innerHTML = `
    <input class="name-edit" type="text" value="${esc(text)}" placeholder="Spec text" style="flex:1" />
    <div class="manage-item-actions">
      <button class="manage-btn manage-btn-edit" id="inlineSaveBtn">Save</button>
      <button class="manage-btn manage-btn-delete" id="inlineCancelBtn">Cancel</button>
    </div>
  `;
  itemEl.querySelector('#inlineSaveBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const newText = itemEl.querySelector('.name-edit').value.trim();
    if (!newText) { showToast('Enter spec text.', 'error'); return; }
    await onSave(newText);
  });
  itemEl.querySelector('#inlineCancelBtn').addEventListener('click', (e) => { e.stopPropagation(); renderManageSpecs(); });
  itemEl.querySelector('.name-edit').focus();
}

/* ---- PRINT JOB SHEET ---- */
function printJobSheet(job) {
  const sortedItems = [...job.items].sort((a, b) => b.cost - a.cost);
  const philTotal  = job.items.filter(i => i.paid_by === 'Phil123').reduce((s, i) => s + i.cost, 0);
  const steTotal   = job.items.filter(i => i.paid_by === 'Ste123').reduce((s, i) => s + i.cost, 0);
  const grandTotal = philTotal + steTotal;

  const rows = sortedItems.map(i => `
    <tr>
      <td>${esc(i.name)}</td>
      <td>${esc(i.purchase_place || '')}</td>
      <td style="text-align:center;font-weight:700;color:${i.paid_by === 'Phil123' ? '#2471a3' : '#1e8449'}">${esc(i.paid_by)}</td>
      <td style="text-align:right;font-weight:600">${fmtPrice(i.cost)}</td>
    </tr>
  `).join('');

  document.getElementById('printArea').innerHTML = `
    <div class="print-header">
      <h1>FabQuotes – Job Cost Sheet</h1>
      <p>${esc(job.name)} &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
    <div class="print-items">
      <table>
        <thead><tr><th>Item</th><th>Where Purchased</th><th style="text-align:center">Paid By</th><th style="text-align:right">Cost</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="print-job-totals">
      <div class="print-job-total-row" style="color:#2471a3">Total Phil123: <strong>${fmtPrice(philTotal)}</strong></div>
      <div class="print-job-total-row" style="color:#1e8449">Total Ste123: <strong>${fmtPrice(steTotal)}</strong></div>
      <div class="print-job-total-row grand">Grand Total: <strong>${fmtPrice(grandTotal)}</strong></div>
    </div>
    <div class="print-footer">Printed from FabQuotes – fabquotes.com/cateringtrailers</div>
  `;
  window.print();
}

/* ---- ADD TRAILER ---- */
document.getElementById('btnAddTrailer').addEventListener('click', async () => {
  const name  = document.getElementById('newTrailerName').value.trim();
  const price = parseFloat(document.getElementById('newTrailerPrice').value);
  if (!name || isNaN(price) || price < 0) { showToast('Enter valid name and price.', 'error'); return; }
  await api('addTrailer', { name, price });
  document.getElementById('newTrailerName').value = '';
  document.getElementById('newTrailerPrice').value = '';
  await loadData(); renderManageTrailers();
  showToast('Trailer added ✓', 'success');
});

/* ---- ADD ADDON ---- */
document.getElementById('btnAddAddon').addEventListener('click', async () => {
  const name  = document.getElementById('newAddonName').value.trim();
  const price = parseFloat(document.getElementById('newAddonPrice').value);
  if (!name || isNaN(price) || price < 0) { showToast('Enter valid name and price.', 'error'); return; }
  await api('addAddon', { name, price });
  document.getElementById('newAddonName').value = '';
  document.getElementById('newAddonPrice').value = '';
  await loadData(); renderManageAddons();
  showToast('Add-on added ✓', 'success');
});

/* ---- ADD SPEC ---- */
document.getElementById('btnAddSpec').addEventListener('click', async () => {
  const text = document.getElementById('newSpecText').value.trim();
  if (!text) { showToast('Enter spec text.', 'error'); return; }
  await api('addSpec', { text });
  document.getElementById('newSpecText').value = '';
  await loadData(); renderManageSpecs();
  showToast('Spec added ✓', 'success');
});

/* ---- EVENT LISTENERS ---- */
document.getElementById('btnShowSummary').addEventListener('click', showSummary);
document.getElementById('btnSaveQuote').addEventListener('click', saveQuote);
document.getElementById('btnClear').addEventListener('click', clearForm);
document.getElementById('btnViewSaved').addEventListener('click', openSavedQuotes);
document.getElementById('btnCloseSaved').addEventListener('click', () => closeOverlay('pageSaved'));
document.getElementById('btnManagePrices').addEventListener('click', openManage);
document.getElementById('btnCloseManage').addEventListener('click', () => closeOverlay('pageManage'));
document.getElementById('btnCloseDetail').addEventListener('click', () => closeOverlay('pageQuoteDetail'));
document.getElementById('btnEditQuote').addEventListener('click', editQuote);
document.getElementById('btnDeleteQuote').addEventListener('click', deleteQuote);
document.getElementById('btnPrintQuote').addEventListener('click', () => printQuote(false));
document.getElementById('btnPrintAdmin').addEventListener('click', () => printQuote(true));

/* ---- AUTO LOGIN FROM LOCALSTORAGE (24hr) ---- */
const savedSession = localStorage.getItem('fq_user');
if (savedSession) {
  try {
    const parsed = JSON.parse(savedSession);
    if (parsed.expiry && Date.now() < parsed.expiry) {
      state.user = parsed.user;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      document.getElementById('headerUser').textContent = state.user.username;
      loadData();
    } else {
      localStorage.removeItem('fq_user');
    }
  } catch(e) {
    localStorage.removeItem('fq_user');
  }
}

/* =========================================
   JOB COSTING
   ========================================= */

let jobs = [];

/* ---- TABS ---- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    if (tab === 'quotes') document.getElementById('tabQuotes').style.display = '';
    if (tab === 'jobs')   { document.getElementById('tabJobs').style.display = ''; loadJobs(); }
  });
});

/* ---- LOAD JOBS ---- */
async function loadJobs() {
  const res = await api('getJobs');
  if (res.error) { showToast('Error loading jobs', 'error'); return; }
  jobs = res.jobs || [];
  renderJobs();
}

/* ---- RENDER JOBS ---- */
function renderJobs() {
  const container = document.getElementById('jobsList');
  if (!jobs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔧</div><div class="empty-text">No jobs yet. Create one above.</div></div>`;
    return;
  }

  container.innerHTML = jobs.map(job => {
    const sortedItems = [...job.items].sort((a, b) => b.cost - a.cost);
    const philTotal  = job.items.filter(i => i.paid_by === 'Phil123').reduce((s, i) => s + i.cost, 0);
    const steTotal   = job.items.filter(i => i.paid_by === 'Ste123').reduce((s, i) => s + i.cost, 0);
    const grandTotal = philTotal + steTotal;

    const itemRows = sortedItems.map(item => `
      <div class="job-item" data-id="${item.id}" data-job-id="${job.id}">
        <div class="job-item-info">
          <span class="job-item-name">${esc(item.name)}</span>
          <div class="job-item-meta">
            <span class="job-item-paid-by paid-by-${item.paid_by === 'Phil123' ? 'phil' : 'ste'}">${esc(item.paid_by)}</span>
            ${item.purchase_place ? `<span class="job-item-place">📍 ${esc(item.purchase_place)}</span>` : ''}
          </div>
        </div>
        <div class="job-item-right">
          <span class="job-item-cost">${fmtPrice(item.cost)}</span>
          <button class="job-item-edit" data-action="edit-item" data-id="${item.id}" data-job-id="${job.id}">Edit</button>
          <button class="job-item-delete" data-action="del-item" data-id="${item.id}" data-job-id="${job.id}">✕</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="job-card" data-id="${job.id}">

        <!-- COLLAPSED HEADER - always visible -->
        <div class="job-card-header job-card-toggle" data-job-id="${job.id}">
          <div class="job-card-title-row">
            <div class="job-card-title-left">
              <h3 class="job-card-name">${esc(job.name)}</h3>
              <span class="job-card-summary">${job.items.length} items &nbsp;|&nbsp; Total: ${fmtPrice(grandTotal)}</span>
            </div>
            <div class="job-card-header-right">
              <span class="job-card-chevron">▼</span>
              <div class="job-card-actions" onclick="event.stopPropagation()">
                <button class="manage-btn manage-btn-edit" data-action="edit-job" data-id="${job.id}">Edit</button>
                <button class="manage-btn manage-btn-delete" data-action="del-job" data-id="${job.id}">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <!-- EXPANDABLE BODY -->
        <div class="job-card-body" id="jobBody-${job.id}" style="display:none">

          <div class="job-items-list">
            ${itemRows || '<div class="job-no-items">No items yet.</div>'}
          </div>

          <!-- ADD ITEM FORM -->
          <div class="job-add-item-form">
            <div class="job-add-row">
              <input type="text" class="job-item-name-input" placeholder="Item name" data-job-id="${job.id}" />
              <input type="number" class="job-item-cost-input" placeholder="£ Cost" min="0" step="0.01" data-job-id="${job.id}" />
            </div>
            <div class="job-add-row">
              <input type="text" class="job-item-place-input" placeholder="Place of purchase (optional)" data-job-id="${job.id}" />
            </div>
            <div class="job-paidby-row">
              <span class="paidby-label">Paid by:</span>
              <button class="paidby-btn paidby-phil active-paidby" data-job-id="${job.id}" data-who="Phil123">Phil123</button>
              <button class="paidby-btn paidby-ste" data-job-id="${job.id}" data-who="Ste123">Ste123</button>
              <input type="hidden" class="job-item-paidby-input" data-job-id="${job.id}" value="Phil123" />
            </div>
            <div class="job-add-row">
              <button class="btn btn-primary btn-sm job-btn-add-item" data-job-id="${job.id}">Add Item</button>
            </div>
          </div>

          <!-- TOTALS -->
          <div class="job-totals">
            <div class="job-total-row phil">
              <span>Total Phil123</span>
              <span>${fmtPrice(philTotal)}</span>
            </div>
            <div class="job-total-row ste">
              <span>Total Ste123</span>
              <span>${fmtPrice(steTotal)}</span>
            </div>
            <div class="job-total-row grand">
              <span>Grand Total</span>
              <span>${fmtPrice(grandTotal)}</span>
            </div>
            <button class="btn btn-print job-print-btn" data-action="print-job" data-id="${job.id}">🖨️ Print Job Cost Sheet</button>
          </div>

        </div><!-- end job-card-body -->
      </div>
    `;
  }).join('');

  // Toggle expand/collapse
  container.querySelectorAll('.job-card-toggle').forEach(header => {
    header.addEventListener('click', () => {
      const jobId = header.dataset.jobId;
      const body = document.getElementById(`jobBody-${jobId}`);
      const chevron = header.querySelector('.job-card-chevron');
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      chevron.textContent = isOpen ? '▼' : '▲';
    });
  });

  // Bind events
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', handleJobAction);
  });

  // Paid by buttons
  container.querySelectorAll('.paidby-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const jobId = btn.dataset.jobId;
      const who = btn.dataset.who;
      container.querySelectorAll(`.paidby-btn[data-job-id="${jobId}"]`).forEach(b => b.classList.remove('active-paidby'));
      btn.classList.add('active-paidby');
      const hidden = container.querySelector(`.job-item-paidby-input[data-job-id="${jobId}"]`);
      if (hidden) hidden.value = who;
    });
  });

  container.querySelectorAll('.job-btn-add-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const jobId = btn.dataset.jobId;
      const nameInput  = container.querySelector(`.job-item-name-input[data-job-id="${jobId}"]`);
      const costInput  = container.querySelector(`.job-item-cost-input[data-job-id="${jobId}"]`);
      const paidInput  = container.querySelector(`.job-item-paidby-input[data-job-id="${jobId}"]`);
      const placeInput = container.querySelector(`.job-item-place-input[data-job-id="${jobId}"]`);
      const name  = nameInput.value.trim();
      const cost  = parseFloat(costInput.value) || 0;
      const paidBy = paidInput.value;
      const purchasePlace = placeInput ? placeInput.value.trim() : '';
      if (!name) { showToast('Enter an item name.', 'error'); return; }
      await api('addJobItem', { jobId, name, cost, paidBy, purchasePlace });
      nameInput.value = '';
      costInput.value = '';
      if (placeInput) placeInput.value = '';
      await loadJobs();
      // Re-open the job that was being edited
      const body = document.getElementById(`jobBody-${jobId}`);
      const chevron = document.querySelector(`.job-card-toggle[data-job-id="${jobId}"] .job-card-chevron`);
      if (body) { body.style.display = 'block'; if (chevron) chevron.textContent = '▲'; }
      showToast('Item added ✓', 'success');
    });
  });
}

/* ---- JOB ACTIONS ---- */
async function handleJobAction(e) {
  const action = e.target.dataset.action;
  const id     = e.target.dataset.id;
  const jobId  = e.target.dataset.jobId;

  if (action === 'del-job') {
    if (!confirm('Delete this entire job and all its items?')) return;
    await api('deleteJob', { id });
    await loadJobs();
    showToast('Job deleted.');
  }

  if (action === 'edit-job') {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    const newName = prompt('Edit job name:', job.name);
    if (!newName || !newName.trim()) return;
    await api('updateJob', { id, name: newName.trim() });
    await loadJobs();
    showToast('Job updated ✓', 'success');
  }

  if (action === 'del-item') {
    if (!confirm('Delete this item?')) return;
    await api('deleteJobItem', { id });
    await loadJobs();
    showToast('Item deleted.');
  }

  if (action === 'edit-item') {
    const job  = jobs.find(j => j.id === jobId);
    if (!job) return;
    const item = job.items.find(i => i.id === id);
    if (!item) return;

    const itemEl = e.target.closest('.job-item');
    itemEl.innerHTML = `
      <div class="job-edit-form">
        <input class="job-edit-name" type="text" value="${esc(item.name)}" placeholder="Item name" />
        <input class="job-edit-cost" type="number" value="${item.cost}" placeholder="Cost £" min="0" step="0.01" />
        <input class="job-edit-place" type="text" value="${esc(item.purchase_place || '')}" placeholder="Place of purchase" />
        <div class="job-paidby-row">
          <span class="paidby-label">Paid by:</span>
          <button class="paidby-btn paidby-phil${item.paid_by === 'Phil123' ? ' active-paidby' : ''}" data-who="Phil123">Phil123</button>
          <button class="paidby-btn paidby-ste${item.paid_by === 'Ste123' ? ' active-paidby' : ''}\" data-who="Ste123">Ste123</button>
          <input type="hidden" class="job-edit-paidby" value="${esc(item.paid_by)}" />
        </div>
        <div class="job-edit-actions">
          <button class="btn btn-primary btn-sm job-edit-save">Save</button>
          <button class="btn btn-ghost btn-sm job-edit-cancel">Cancel</button>
        </div>
      </div>
    `;

    itemEl.querySelectorAll('.paidby-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        itemEl.querySelectorAll('.paidby-btn').forEach(b => b.classList.remove('active-paidby'));
        btn.classList.add('active-paidby');
        itemEl.querySelector('.job-edit-paidby').value = btn.dataset.who;
      });
    });

    itemEl.querySelector('.job-edit-save').addEventListener('click', async () => {
      const name  = itemEl.querySelector('.job-edit-name').value.trim();
      const cost  = parseFloat(itemEl.querySelector('.job-edit-cost').value) || 0;
      const paidBy = itemEl.querySelector('.job-edit-paidby').value;
      const purchasePlace = itemEl.querySelector('.job-edit-place').value.trim();
      if (!name) { showToast('Enter item name.', 'error'); return; }
      await api('updateJobItem', { id, name, cost, paidBy, purchasePlace });
      await loadJobs();
      showToast('Updated ✓', 'success');
    });

    itemEl.querySelector('.job-edit-cancel').addEventListener('click', () => loadJobs());
  }

  if (action === 'print-job') {
    const job = jobs.find(j => j.id === id);
    if (!job) return;
    printJobSheet(job);
  }
}

/* ---- ADD JOB ---- */
document.getElementById('btnAddJob').addEventListener('click', async () => {
  const name = document.getElementById('newJobName').value.trim();
  if (!name) { showToast('Enter a job name.', 'error'); return; }
  await api('addJob', { name, userId: state.user?.id });
  document.getElementById('newJobName').value = '';
  await loadJobs();
  showToast('Job created ✓', 'success');
});


