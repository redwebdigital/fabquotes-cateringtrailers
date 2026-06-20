/* =========================================
   FABQUOTES – CATERING TRAILERS
   script.js
   ========================================= */

'use strict';

/* ---- DEFAULT DATA ---- */
const DEFAULT_TRAILERS = [
  { id: 't1', name: '8ft Catering Trailer', price: 8500 },
  { id: 't2', name: '10ft Catering Trailer', price: 9500 },
  { id: 't3', name: '12ft Catering Trailer', price: 10500 }
];

const DEFAULT_ADDONS = [
  { id: 'a1',  name: 'Stable Door',                 price: 450,  supplierUrl: '', supplierPrice: '' },
  { id: 'a2',  name: 'Built In Generator Box',      price: 600,  supplierUrl: '', supplierPrice: '' },
  { id: 'a3',  name: 'External Menu Boards',        price: 300,  supplierUrl: '', supplierPrice: '' },
  { id: 'a4',  name: 'Advertising Fixed Headboard', price: 400,  supplierUrl: '', supplierPrice: '' },
  { id: 'a5',  name: 'Customer Shelf',              price: 250,  supplierUrl: '', supplierPrice: '' },
  { id: 'a6',  name: 'Under Counter Fridge',        price: 500,  supplierUrl: '', supplierPrice: '' },
  { id: 'a7',  name: 'Tall Drinks Fridge',          price: 650,  supplierUrl: '', supplierPrice: '' },
  { id: 'a8',  name: 'Coffee Machine System',       price: 900,  supplierUrl: '', supplierPrice: '' },
  { id: 'a9',  name: 'Extraction Hood Kit',         price: 750,  supplierUrl: '', supplierPrice: '' },
  { id: 'a10', name: 'Pizza Oven Wood/Gas',         price: 1200, supplierUrl: '', supplierPrice: '' }
];

const DEFAULT_SPECS = [
  { id: 's1',  text: 'NEW GRP Armacel light weight walls' },
  { id: 's2',  text: 'Galvanised chassis' },
  { id: 's3',  text: 'Satin stainless steel worktops with upstand' },
  { id: 's4',  text: 'Anodised aluminium trim and corner sections' },
  { id: 's5',  text: 'Water heater (ELEC or LPG)' },
  { id: 's6',  text: '2 x Sinks' },
  { id: 's7',  text: '240v Water pump' },
  { id: 's8',  text: 'Mixer tap' },
  { id: 's9',  text: 'Stainless steel cupboard under the sink area' },
  { id: 's10', text: 'Fold away aluminium step' },
  { id: 's11', text: 'Non slip vinyl flooring' },
  { id: 's12', text: 'Solid GRP gas box with auto changeover valve' },
  { id: 's13', text: 'Electric pack including double socket, 5ft light and 16amp fuse box with inlet' },
  { id: 's14', text: 'Lockable coupling & heavy duty jockey wheel' },
  { id: 's15', text: 'Essentials pack (waste & water carrier, first aid kit, 10m 16amp lead & fire extinguisher)' },
  { id: 's16', text: 'Gas safe certificate' },
  { id: 's17', text: 'NICEIC electrical certificate' },
  { id: 's18', text: 'VOSA approved certificate' }
];

/* ---- STATE ---- */
let state = {
  trailers: [],
  addons: [],
  specs: [],
  selectedTrailerId: null,
  selectedAddonIds: [],
  quoteAddonOverrides: {},
  savedQuotes: [],
  viewingQuoteId: null
};

/* ---- STORAGE ---- */
function loadFromStorage() {
  const trailers = localStorage.getItem('fq_trailers');
  const addons   = localStorage.getItem('fq_addons');
  const quotes   = localStorage.getItem('fq_quotes');
  const specs    = localStorage.getItem('fq_specs');

  state.trailers = trailers ? JSON.parse(trailers) : deepClone(DEFAULT_TRAILERS);
  state.addons   = addons   ? JSON.parse(addons)   : deepClone(DEFAULT_ADDONS);
  state.savedQuotes = quotes ? JSON.parse(quotes)  : [];
  state.specs    = specs    ? JSON.parse(specs)    : deepClone(DEFAULT_SPECS);
}

function saveTrailers() { localStorage.setItem('fq_trailers', JSON.stringify(state.trailers)); }
function saveAddons()   { localStorage.setItem('fq_addons',   JSON.stringify(state.addons));   }
function saveQuotes()   { localStorage.setItem('fq_quotes',   JSON.stringify(state.savedQuotes)); }
function saveSpecs()    { localStorage.setItem('fq_specs',    JSON.stringify(state.specs));    }

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/* ---- UTILITIES ---- */
function fmtPrice(n) {
  return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/* ---- TOAST ---- */
let toastTimer;
function showToast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
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

/* ---- ESCAPE HTML ---- */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---- RENDER TRAILER GRID ---- */
function renderTrailers() {
  const grid = document.getElementById('trailerGrid');
  if (!grid) return;
  grid.innerHTML = state.trailers.map(t => `
    <button class="trailer-btn${state.selectedTrailerId === t.id ? ' selected' : ''}"
            data-id="${t.id}" aria-pressed="${state.selectedTrailerId === t.id}">
      <div class="trailer-btn-icon">🚐</div>
      <div class="trailer-btn-name">${esc(t.name)}</div>
      <div class="trailer-btn-price">${fmtPrice(t.price)}</div>
    </button>
  `).join('');
  grid.querySelectorAll('.trailer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedTrailerId = btn.dataset.id;
      renderTrailers();
      updateTotal();
    });
  });
}

/* ---- RENDER ADD-ONS ---- */
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
        item.classList.remove('checked');
        item.setAttribute('aria-checked', 'false');
      } else {
        state.selectedAddonIds.push(id);
        item.classList.add('checked');
        item.setAttribute('aria-checked', 'true');
      }
      updateTotal();
      renderAddons();
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

/* ---- UPDATE TOTAL ---- */
function updateTotal() {
  document.getElementById('totalAmount').textContent = fmtPrice(calcTotal());
}

/* ---- BUILD SUMMARY HTML ---- */
function buildSummaryHTML(quote, adminMode = false) {
  const trailer = state.trailers.find(t => t.id === quote.trailerId) ||
                  { name: quote.trailerName || 'N/A', price: quote.trailerPrice || 0 };

  const addons = (quote.addonIds || []).map(id => {
    const base = state.addons.find(a => a.id === id) ||
                 (quote.addonSnapshot || []).find(a => a.id === id) ||
                 { name: id, price: 0 };
    const snap = (quote.addonSnapshot || []).find(a => a.id === id) || {};
    return {
      ...base,
      supplierUrl:   snap.supplierUrl   || base.supplierUrl   || '',
      supplierPrice: snap.supplierPrice || base.supplierPrice || ''
    };
  }).filter(Boolean);

  const specs = quote.specsSnapshot || state.specs;

  let rows = `
    <div class="summary-date">Generated: ${quote.date ? fmtDate(quote.date) : fmtDate(Date.now())}</div>
    <div class="summary-customer">
      <div class="sc-name">${esc(quote.name || 'N/A')}</div>
      <div class="sc-phone">${esc(quote.phone || '')}</div>
      ${quote.notes ? `<div class="sc-notes">${esc(quote.notes)}</div>` : ''}
    </div>
    <div class="summary-row">
      <span class="sum-label"><strong>${esc(trailer.name)}</strong></span>
      <span class="sum-val">${fmtPrice(trailer.price)}</span>
    </div>
  `;

  if (specs && specs.length) {
    rows += `<div class="summary-specs-heading">Standard Specifications Included</div>`;
    rows += `<ul class="summary-specs-list">` + specs.map(s => `<li>${esc(s.text)}</li>`).join('') + `</ul>`;
  }

  if (addons.length) {
    rows += `<div class="summary-specs-heading">Selected Add-Ons</div>`;
    addons.forEach(a => {
      rows += `
        <div class="summary-row${adminMode && (a.supplierUrl || a.supplierPrice) ? ' has-supplier' : ''}">
          <span class="sum-label">${esc(a.name)}</span>
          <span class="sum-val">${fmtPrice(a.price)}</span>
        </div>
        ${adminMode && (a.supplierUrl || a.supplierPrice) ? `
        <div class="summary-supplier-info">
          ${a.supplierUrl ? `<a href="${esc(a.supplierUrl)}" target="_blank" class="supplier-link">🔗 ${esc(a.supplierUrl)}</a>` : ''}
          ${a.supplierPrice ? `<span class="supplier-cost">Buy price: ${fmtPrice(a.supplierPrice)}</span>` : ''}
        </div>` : ''}
      `;
    });
  }

  rows += `
    <div class="summary-row total-row">
      <span class="sum-label">Total</span>
      <span class="sum-val">${fmtPrice(quote.total)}</span>
    </div>
  `;

  return rows;
}

/* ---- SHOW SUMMARY ---- */
function showSummary() {
  const trailer = state.trailers.find(t => t.id === state.selectedTrailerId);
  if (!trailer) { showToast('Please select a trailer size first.', 'error'); return; }

  const addons = state.selectedAddonIds.map(id => {
    const a = state.addons.find(x => x.id === id);
    if (!a) return null;
    const override = state.quoteAddonOverrides[id] || {};
    return {
      id: a.id,
      name: a.name,
      price: a.price,
      supplierUrl:   override.supplierUrl   !== undefined ? override.supplierUrl   : (a.supplierUrl   || ''),
      supplierPrice: override.supplierPrice !== undefined ? override.supplierPrice : (a.supplierPrice || '')
    };
  }).filter(Boolean);

  const quoteObj = {
    trailerId:     trailer.id,
    trailerName:   trailer.name,
    trailerPrice:  trailer.price,
    addonIds:      state.selectedAddonIds,
    addonSnapshot: addons,
    specsSnapshot: deepClone(state.specs),
    name:  document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    notes: document.getElementById('custNotes').value.trim(),
    total: calcTotal(),
    date:  Date.now()
  };

  const section = document.getElementById('sectionSummary');
  section.style.display = 'block';
  document.getElementById('summaryContent').innerHTML = buildSummaryHTML(quoteObj);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- SAVE QUOTE ---- */
function saveQuote() {
  const trailer = state.trailers.find(t => t.id === state.selectedTrailerId);
  if (!trailer) { showToast('Please select a trailer size.', 'error'); return; }
  const name = document.getElementById('custName').value.trim();
  if (!name) { showToast('Please enter a customer name.', 'error'); return; }

  const addons = state.selectedAddonIds.map(id => {
    const a = state.addons.find(x => x.id === id);
    if (!a) return null;
    const override = state.quoteAddonOverrides[id] || {};
    return {
      id: a.id,
      name: a.name,
      price: a.price,
      supplierUrl:   override.supplierUrl   !== undefined ? override.supplierUrl   : (a.supplierUrl   || ''),
      supplierPrice: override.supplierPrice !== undefined ? override.supplierPrice : (a.supplierPrice || '')
    };
  }).filter(Boolean);

  const quote = {
    id:            genId(),
    trailerId:     trailer.id,
    trailerName:   trailer.name,
    trailerPrice:  trailer.price,
    addonIds:      [...state.selectedAddonIds],
    addonSnapshot: addons,
    specsSnapshot: deepClone(state.specs),
    name:  name,
    phone: document.getElementById('custPhone').value.trim(),
    notes: document.getElementById('custNotes').value.trim(),
    total: calcTotal(),
    date:  Date.now()
  };

  state.savedQuotes.unshift(quote);
  saveQuotes();
  showToast('Quote saved! ✓', 'success');
}

/* ---- CLEAR FORM ---- */
function clearForm() {
  state.selectedTrailerId = null;
  state.selectedAddonIds = [];
  state.quoteAddonOverrides = {};
  document.getElementById('custName').value = '';
  document.getElementById('custPhone').value = '';
  document.getElementById('custNotes').value = '';
  document.getElementById('sectionSummary').style.display = 'none';
  renderTrailers();
  renderAddons();
  updateTotal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- SAVED QUOTES PAGE ---- */
function openSavedQuotes() {
  renderSavedList(state.savedQuotes);
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
      <div class="saved-card-name">${esc(q.name)}</div>
      <div class="saved-card-date">${fmtDate(q.date)}</div>
      <div class="saved-card-meta">
        <span class="saved-card-trailer">${esc(q.trailerName || '')}</span>
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
  const filtered = q ? state.savedQuotes.filter(s => s.name.toLowerCase().includes(q)) : state.savedQuotes;
  renderSavedList(filtered);
});

/* ---- QUOTE DETAIL ---- */
function openQuoteDetail(id) {
  const quote = state.savedQuotes.find(q => q.id === id);
  if (!quote) return;
  state.viewingQuoteId = id;
  document.getElementById('quoteDetailContent').innerHTML = buildSummaryHTML(quote, true);
  document.getElementById('pageQuoteDetail').style.display = 'block';
}

/* ---- EDIT QUOTE ---- */
function editQuote() {
  const quote = state.savedQuotes.find(q => q.id === state.viewingQuoteId);
  if (!quote) return;

  const trailerExists = state.trailers.find(t => t.id === quote.trailerId);
  state.selectedTrailerId = trailerExists ? quote.trailerId : null;
  state.selectedAddonIds = (quote.addonIds || []).filter(id => state.addons.find(a => a.id === id));

  state.quoteAddonOverrides = {};
  (quote.addonSnapshot || []).forEach(a => {
    state.quoteAddonOverrides[a.id] = {
      supplierUrl:   a.supplierUrl   || '',
      supplierPrice: a.supplierPrice || ''
    };
  });

  document.getElementById('custName').value  = quote.name  || '';
  document.getElementById('custPhone').value = quote.phone || '';
  document.getElementById('custNotes').value = quote.notes || '';

  state.savedQuotes = state.savedQuotes.filter(q => q.id !== state.viewingQuoteId);
  saveQuotes();

  closeOverlay('pageQuoteDetail');
  closeOverlay('pageSaved');
  renderTrailers();
  renderAddons();
  updateTotal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Quote loaded for editing.');
}

/* ---- DELETE QUOTE ---- */
function deleteQuote() {
  if (!confirm('Delete this quote? This cannot be undone.')) return;
  state.savedQuotes = state.savedQuotes.filter(q => q.id !== state.viewingQuoteId);
  saveQuotes();
  closeOverlay('pageQuoteDetail');
  renderSavedList(state.savedQuotes);
  showToast('Quote deleted.');
}

/* ---- PRINT QUOTE ---- */
function printQuote(adminMode = false) {
  const quote = state.savedQuotes.find(q => q.id === state.viewingQuoteId);
  if (!quote) return;

  const trailer = state.trailers.find(t => t.id === quote.trailerId) ||
                  { name: quote.trailerName || 'N/A', price: quote.trailerPrice || 0 };

  const resolvedAddons = (quote.addonIds || []).map(id => {
    const base = state.addons.find(a => a.id === id) ||
                 (quote.addonSnapshot || []).find(a => a.id === id) || null;
    const snap = (quote.addonSnapshot || []).find(a => a.id === id) || {};
    if (!base) return null;
    return { ...base, supplierUrl: snap.supplierUrl || '', supplierPrice: snap.supplierPrice || '' };
  }).filter(Boolean);

  const specs = quote.specsSnapshot || state.specs;

  const addonRows = resolvedAddons.map(a => {
    let row = `<tr><td>${esc(a.name)}</td><td style="text-align:right">${fmtPrice(a.price)}</td></tr>`;
    if (adminMode && (a.supplierUrl || a.supplierPrice)) {
      row += `<tr class="print-supplier-row"><td colspan="2" style="font-size:12px;color:#666;padding:2px 10px 8px;">
        ${a.supplierUrl ? `🔗 <a href="${esc(a.supplierUrl)}">${esc(a.supplierUrl)}</a>&nbsp;&nbsp;` : ''}
        ${a.supplierPrice ? `Buy: ${fmtPrice(a.supplierPrice)}` : ''}
      </td></tr>`;
    }
    return row;
  }).join('');

  const specsList = specs && specs.length
    ? `<div class="print-specs">
        <h3>Standard Specifications Included</h3>
        <ul>${specs.map(s => `<li>${esc(s.text)}</li>`).join('')}</ul>
       </div>`
    : '';

  document.getElementById('printArea').innerHTML = `
    <div class="print-header">
      <h1>FabQuotes – Catering Trailer Quote${adminMode ? ' <span style="color:#c0392b;font-size:14px;">[ADMIN COPY]</span>' : ''}</h1>
      <p>fabquotes.com/cateringtrailers &nbsp;|&nbsp; ${fmtDate(quote.date)}</p>
    </div>
    <div class="print-customer">
      <h2>${esc(quote.name)}</h2>
      ${quote.phone ? `<p>📞 ${esc(quote.phone)}</p>` : ''}
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
function closeOverlay(id) {
  document.getElementById(id).style.display = 'none';
}

/* ---- MANAGE PRICES ---- */
function openManage() {
  renderManageTrailers();
  renderManageAddons();
  renderManageSpecs();
  document.getElementById('pageManage').style.display = 'block';
}

function renderManageTrailers() {
  const list = document.getElementById('manageTrailerList');
  if (!state.trailers.length) {
    list.innerHTML = '<div style="padding:14px 16px;color:#718096;font-size:14px;">No trailers yet.</div>';
    return;
  }
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
  if (!state.addons.length) {
    list.innerHTML = '<div style="padding:14px 16px;color:#718096;font-size:14px;">No add-ons yet.</div>';
    return;
  }
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
        <input type="url" class="manage-supplier-url" placeholder="Supplier URL" value="${esc(a.supplierUrl || '')}" data-id="${a.id}" />
        <input type="number" class="manage-supplier-price" placeholder="Buy price £" value="${esc(a.supplierPrice || '')}" min="0" data-id="${a.id}" />
        <button class="manage-btn manage-btn-edit manage-btn-supplier-save" data-action="save-supplier" data-id="${a.id}">Save</button>
      </div>
    </div>
  `).join('');
  bindManageEvents('manageAddonList');
}

function renderManageSpecs() {
  const list = document.getElementById('manageSpecsList');
  if (!list) return;
  if (!state.specs.length) {
    list.innerHTML = '<div style="padding:14px 16px;color:#718096;font-size:14px;">No specs yet.</div>';
    return;
  }
  list.innerHTML = state.specs.map(s => `
    <div class="manage-item" data-id="${s.id}">
      <span class="manage-item-name" style="font-size:13px;">${esc(s.text)}</span>
      <div class="manage-item-actions">
        <button class="manage-btn manage-btn-edit" data-action="edit-spec" data-id="${s.id}">Edit</button>
        <button class="manage-btn manage-btn-delete" data-action="del-spec" data-id="${s.id}">Delete</button>
      </div>
    </div>
  `).join('');
  bindManageEvents('manageSpecsList');
}

function bindManageEvents(containerId) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', handleManageAction);
  });
}

function handleManageAction(e) {
  const action = e.target.dataset.action;
  const id     = e.target.dataset.id;
  const item   = e.target.closest('.manage-item');

  if (action === 'del-trailer') {
    if (!confirm('Delete this trailer size?')) return;
    state.trailers = state.trailers.filter(t => t.id !== id);
    if (state.selectedTrailerId === id) state.selectedTrailerId = null;
    saveTrailers(); renderManageTrailers(); renderTrailers(); updateTotal();
  }

  if (action === 'del-addon') {
    if (!confirm('Delete this add-on?')) return;
    state.addons = state.addons.filter(a => a.id !== id);
    state.selectedAddonIds = state.selectedAddonIds.filter(x => x !== id);
    saveAddons(); renderManageAddons(); renderAddons(); updateTotal();
  }

  if (action === 'del-spec') {
    if (!confirm('Delete this spec item?')) return;
    state.specs = state.specs.filter(s => s.id !== id);
    saveSpecs(); renderManageSpecs();
  }

  if (action === 'edit-trailer') {
    const trailer = state.trailers.find(t => t.id === id);
    if (!trailer) return;
    inlineEdit(item, trailer, () => { saveTrailers(); renderManageTrailers(); renderTrailers(); updateTotal(); });
  }

  if (action === 'edit-addon') {
    const addon = state.addons.find(a => a.id === id);
    if (!addon) return;
    inlineEditAddon(item, addon, () => { saveAddons(); renderManageAddons(); renderAddons(); updateTotal(); });
  }

  if (action === 'edit-spec') {
    const spec = state.specs.find(s => s.id === id);
    if (!spec) return;
    inlineEditSpec(item, spec, () => { saveSpecs(); renderManageSpecs(); });
  }

  if (action === 'save-supplier') {
    const addon = state.addons.find(a => a.id === id);
    if (!addon) return;
    const urlInput   = item.querySelector('.manage-supplier-url');
    const priceInput = item.querySelector('.manage-supplier-price');
    addon.supplierUrl   = urlInput ? urlInput.value.trim() : '';
    addon.supplierPrice = priceInput ? priceInput.value.trim() : '';
    saveAddons();
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
  itemEl.querySelector('#inlineSaveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const newName  = itemEl.querySelector('.name-edit').value.trim();
    const newPrice = parseFloat(itemEl.querySelector('.price-edit').value);
    if (!newName || isNaN(newPrice) || newPrice < 0) { showToast('Enter a valid name and price.', 'error'); return; }
    obj.name  = newName;
    obj.price = newPrice;
    onSave();
    showToast('Updated ✓', 'success');
  });
  itemEl.querySelector('#inlineCancelBtn').addEventListener('click', (e) => { e.stopPropagation(); onSave(); });
  itemEl.querySelector('.name-edit').focus();
}

function inlineEditAddon(itemEl, obj, onSave) {
  itemEl.innerHTML = `
    <input class="name-edit" type="text" value="${esc(obj.name)}" placeholder="Name" style="flex:1;margin-bottom:6px" />
    <input class="price-edit" type="number" value="${obj.price}" placeholder="Sell price £" min="0" style="max-width:120px;margin-bottom:6px" />
    <div class="manage-item-actions">
      <button class="manage-btn manage-btn-edit" id="inlineSaveBtn">Save</button>
      <button class="manage-btn manage-btn-delete" id="inlineCancelBtn">Cancel</button>
    </div>
  `;
  itemEl.querySelector('#inlineSaveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const newName  = itemEl.querySelector('.name-edit').value.trim();
    const newPrice = parseFloat(itemEl.querySelector('.price-edit').value);
    if (!newName || isNaN(newPrice) || newPrice < 0) { showToast('Enter a valid name and price.', 'error'); return; }
    obj.name  = newName;
    obj.price = newPrice;
    onSave();
    showToast('Updated ✓', 'success');
  });
  itemEl.querySelector('#inlineCancelBtn').addEventListener('click', (e) => { e.stopPropagation(); onSave(); });
  itemEl.querySelector('.name-edit').focus();
}

function inlineEditSpec(itemEl, obj, onSave) {
  itemEl.innerHTML = `
    <input class="name-edit" type="text" value="${esc(obj.text)}" placeholder="Spec text" style="flex:1" />
    <div class="manage-item-actions">
      <button class="manage-btn manage-btn-edit" id="inlineSaveBtn">Save</button>
      <button class="manage-btn manage-btn-delete" id="inlineCancelBtn">Cancel</button>
    </div>
  `;
  itemEl.querySelector('#inlineSaveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const newText = itemEl.querySelector('.name-edit').value.trim();
    if (!newText) { showToast('Enter spec text.', 'error'); return; }
    obj.text = newText;
    onSave();
    showToast('Updated ✓', 'success');
  });
  itemEl.querySelector('#inlineCancelBtn').addEventListener('click', (e) => { e.stopPropagation(); onSave(); });
  itemEl.querySelector('.name-edit').focus();
}

/* ---- ADD TRAILER ---- */
document.getElementById('btnAddTrailer').addEventListener('click', () => {
  const name  = document.getElementById('newTrailerName').value.trim();
  const price = parseFloat(document.getElementById('newTrailerPrice').value);
  if (!name || isNaN(price) || price < 0) { showToast('Enter a valid name and price.', 'error'); return; }
  state.trailers.push({ id: genId(), name, price });
  saveTrailers();
  document.getElementById('newTrailerName').value  = '';
  document.getElementById('newTrailerPrice').value = '';
  renderManageTrailers(); renderTrailers();
  showToast('Trailer added ✓', 'success');
});

/* ---- ADD ADDON ---- */
document.getElementById('btnAddAddon').addEventListener('click', () => {
  const name  = document.getElementById('newAddonName').value.trim();
  const price = parseFloat(document.getElementById('newAddonPrice').value);
  if (!name || isNaN(price) || price < 0) { showToast('Enter a valid name and price.', 'error'); return; }
  state.addons.push({ id: genId(), name, price, supplierUrl: '', supplierPrice: '' });
  saveAddons();
  document.getElementById('newAddonName').value  = '';
  document.getElementById('newAddonPrice').value = '';
  renderManageAddons(); renderAddons();
  showToast('Add-on added ✓', 'success');
});

/* ---- ADD SPEC ---- */
document.getElementById('btnAddSpec').addEventListener('click', () => {
  const text = document.getElementById('newSpecText').value.trim();
  if (!text) { showToast('Enter spec text.', 'error'); return; }
  state.specs.push({ id: genId(), text });
  saveSpecs();
  document.getElementById('newSpecText').value = '';
  renderManageSpecs();
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

/* ---- INIT ---- */
function init() {
  loadFromStorage();
  renderTrailers();
  renderAddons();
  updateTotal();
}

init();
