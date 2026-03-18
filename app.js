/* ============================================================
   DataViz Pro — Custom Dashboard Builder
   app.js
   ============================================================ */

// ── STATE ─────────────────────────────────────────────────────
let orders          = [];
let orderIdCounter  = 1000;
let editOrderId     = null;
let canvasWidgets   = [];   // { id, type, config }
let savedWidgets    = [];
let currentDateFilter = 'all';
let editingWidgetId = null;
let charts          = {};   // Chart.js instances
let activeTab       = 'dashboard';
let dragType        = null;

// ── TABS ──────────────────────────────────────────────────────
function switchTab(tab) {
  ['dashboard', 'orders', 'config'].forEach(t => {
    document.getElementById('page-' + t).classList.toggle('active', t === tab);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const btnTab = btn.dataset.tab;
    if (btnTab) btn.classList.toggle('active', btnTab === tab);
  });

  const labels = { dashboard: 'Dashboard', orders: 'Customer Orders', config: 'Configure Dashboard' };
  const bc   = document.getElementById('breadcrumb-label');
  const bbar = document.getElementById('page-breadcrumb');
  if (bc)   bc.textContent   = labels[tab] || tab;
  if (bbar) bbar.style.display = tab === 'config' ? 'none' : '';

  document.getElementById('configure-btn').style.display = tab === 'config' ? 'none' : '';
  activeTab = tab;

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'orders')    renderOrders();
  if (tab === 'config')    renderCanvas();
}

// ── DATE FILTER ───────────────────────────────────────────────
function setDateFilter(val, el) {
  currentDateFilter = val;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderDashboard();
}

function getFilteredOrders() {
  if (currentDateFilter === 'all') return orders;
  const now  = Date.now();
  const days = currentDateFilter === 'today' ? 1 : parseInt(currentDateFilter);
  return orders.filter(o => o.createdAt >= now - days * 86400000);
}

// ── ORDER MODAL ───────────────────────────────────────────────
function openOrderModal(id = null) {
  editOrderId = id;
  document.getElementById('order-modal-title').textContent = id ? 'Edit Order' : 'Create Order';
  clearOrderForm();
  if (id) {
    const o = orders.find(x => x.id === id);
    if (o) populateOrderForm(o);
  }
  document.getElementById('order-modal').classList.add('open');
}

function closeOrderModal() {
  document.getElementById('order-modal').classList.remove('open');
  editOrderId = null;
}

function clearOrderForm() {
  ['firstname','lastname','email','phone','street','city','state','postal','country',
   'product','qty','unitprice','total','status','createdby'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (!el) return;
    if (f === 'qty')    el.value = '1';
    else if (f === 'status') el.value = 'Pending';
    else el.value = '';
  });
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.form-input, .form-select').forEach(e => e.classList.remove('error'));
}

function populateOrderForm(o) {
  const map = {
    firstname: 'firstName', lastname: 'lastName', email: 'email', phone: 'phone',
    street: 'street', city: 'city', state: 'state', postal: 'postal', country: 'country',
    product: 'product', qty: 'qty', unitprice: 'unitPrice', status: 'status', createdby: 'createdBy'
  };
  Object.entries(map).forEach(([fid, key]) => {
    const el = document.getElementById('f-' + fid);
    if (el && o[key] !== undefined) el.value = o[key];
  });
  calcTotal();
}

function calcTotal() {
  const qty = parseFloat(document.getElementById('f-qty').value) || 0;
  const up  = parseFloat(document.getElementById('f-unitprice').value) || 0;
  document.getElementById('f-total').value = '$' + (qty * up).toFixed(2);
}

function validateOrder() {
  const required = ['firstname','lastname','email','phone','street','city','state',
                    'postal','country','product','qty','unitprice','createdby'];
  let ok = true;
  required.forEach(f => {
    const el  = document.getElementById('f-' + f);
    const err = document.getElementById('e-' + f);
    if (!el) return;
    const val = el.value.trim();
    if (!val || (f === 'qty' && parseFloat(val) < 1)) {
      el.classList.add('error');
      if (err) err.classList.add('show');
      ok = false;
    } else {
      el.classList.remove('error');
      if (err) err.classList.remove('show');
    }
  });
  return ok;
}

function submitOrder() {
  if (!validateOrder()) return;
  const qty = parseFloat(document.getElementById('f-qty').value);
  const up  = parseFloat(document.getElementById('f-unitprice').value);
  const data = {
    id:        editOrderId || (++orderIdCounter),
    firstName: document.getElementById('f-firstname').value.trim(),
    lastName:  document.getElementById('f-lastname').value.trim(),
    email:     document.getElementById('f-email').value.trim(),
    phone:     document.getElementById('f-phone').value.trim(),
    street:    document.getElementById('f-street').value.trim(),
    city:      document.getElementById('f-city').value.trim(),
    state:     document.getElementById('f-state').value.trim(),
    postal:    document.getElementById('f-postal').value.trim(),
    country:   document.getElementById('f-country').value,
    product:   document.getElementById('f-product').value,
    qty, unitPrice: up, total: qty * up,
    status:    document.getElementById('f-status').value,
    createdBy: document.getElementById('f-createdby').value,
    createdAt: editOrderId
      ? (orders.find(x => x.id === editOrderId)?.createdAt || Date.now())
      : Date.now()
  };
  if (editOrderId) {
    orders[orders.findIndex(x => x.id === editOrderId)] = data;
    toast('Order updated successfully', 'success');
  } else {
    orders.push(data);
    toast('Order created successfully', 'success');
  }
  closeOrderModal();
  renderOrders();
  if (savedWidgets.length) renderDashboard();
}

// ── ORDERS TABLE ──────────────────────────────────────────────
function renderOrders() {
  const tbody = document.getElementById('orders-tbody');
  const empty = document.getElementById('orders-empty');
  const table = document.querySelector('.data-table-wrap');
  if (!orders.length) {
    empty.style.display = 'flex';
    table.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  table.style.display = '';
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>#${o.id}</td>
      <td>${o.firstName} ${o.lastName}</td>
      <td style="color:var(--text2)">${o.email}</td>
      <td>${o.product}</td>
      <td>${o.qty}</td>
      <td>$${o.unitPrice.toFixed(2)}</td>
      <td style="color:var(--accent)"><strong>$${o.total.toFixed(2)}</strong></td>
      <td><span class="badge badge-${o.status==='Pending'?'pending':o.status==='In progress'?'progress':'completed'}">${o.status}</span></td>
      <td style="color:var(--text2);font-size:.75rem">${o.createdBy}</td>
      <td style="color:var(--text3);font-size:.75rem">${new Date(o.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="actions">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="openOrderModal(${o.id})" title="Edit">✏</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteOrder(${o.id})" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

function deleteOrder(id) {
  showConfirm('Delete Order', 'Are you sure you want to delete this order? This action cannot be undone.', () => {
    orders = orders.filter(o => o.id !== id);
    renderOrders();
    if (savedWidgets.length) renderDashboard();
    toast('Order deleted', 'info');
  });
}

// ── CANVAS / CONFIG ───────────────────────────────────────────
function renderCanvas() {
  const container   = document.getElementById('canvas-widgets');
  const placeholder = document.getElementById('canvas-placeholder');
  if (!canvasWidgets.length) {
    placeholder.style.display = 'flex';
    container.innerHTML = '';
    return;
  }
  placeholder.style.display = 'none';
  container.innerHTML = canvasWidgets.map(w => buildCanvasWidget(w)).join('');
}

function buildCanvasWidget(w) {
  const c         = w.config || {};
  const col       = c.width || getDefaultWidth(w.type);
  const h         = c.height || getDefaultHeight(w.type);
  const title     = c.title || 'Untitled';
  const typeLabel = w.type.charAt(0).toUpperCase() + w.type.slice(1);
  return `<div class="canvas-widget col-${Math.min(col, 12)}" data-id="${w.id}" style="min-height:${h * 60}px">
    <div class="canvas-widget-header">
      <span class="canvas-widget-title">${title}</span>
      <div style="display:flex;gap:.3rem">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="openWidgetPanel('${w.id}')" title="Settings">⚙</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="removeCanvasWidget('${w.id}')" title="Delete">✕</button>
      </div>
    </div>
    <div class="canvas-widget-body">
      <span style="font-size:.72rem;color:var(--accent);text-transform:uppercase;letter-spacing:.08em">${typeLabel}</span>
      ${c.metric  ? `<div style="margin-top:.3rem;color:var(--text2);font-size:.75rem">Metric: ${c.metric}</div>` : ''}
      ${c.xAxis   ? `<div style="margin-top:.3rem;color:var(--text2);font-size:.75rem">X: ${c.xAxis} · Y: ${c.yAxis || '—'}</div>` : ''}
      ${c.columns && c.columns.length ? `<div style="margin-top:.3rem;color:var(--text2);font-size:.75rem">Cols: ${c.columns.join(', ')}</div>` : ''}
    </div>
  </div>`;
}

function getDefaultWidth(type) {
  if (type === 'kpi') return 2;
  if (type === 'pie') return 4;
  return 5;
}
function getDefaultHeight(type) {
  return type === 'kpi' ? 2 : 4;
}

function removeCanvasWidget(id) {
  showConfirm('Remove Widget', 'Remove this widget from the dashboard?', () => {
    canvasWidgets = canvasWidgets.filter(w => w.id !== id);
    renderCanvas();
    toast('Widget removed', 'info');
  });
}

// ── DRAG & DROP ───────────────────────────────────────────────
function initDragDrop() {
  document.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragType = item.dataset.type;
      e.dataTransfer.effectAllowed = 'copy';
    });
    item.addEventListener('dragend', () => { dragType = null; });
  });
}

function onCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  document.getElementById('canvas-drop-zone').classList.add('drag-over');
}
function onCanvasDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget))
    document.getElementById('canvas-drop-zone').classList.remove('drag-over');
}
function onCanvasDrop(e) {
  e.preventDefault();
  document.getElementById('canvas-drop-zone').classList.remove('drag-over');
  if (!dragType) return;
  const id = 'w_' + Date.now();
  canvasWidgets.push({ id, type: dragType, config: {
    title: 'Untitled', width: getDefaultWidth(dragType), height: getDefaultHeight(dragType)
  }});
  renderCanvas();
  toast(`${dragType} widget added`, 'success');
  openWidgetPanel(id);
}

// ── WIDGET PANEL ──────────────────────────────────────────────
function openWidgetPanel(id) {
  editingWidgetId = id;
  const w = canvasWidgets.find(x => x.id === id);
  if (!w) return;
  document.getElementById('panel-title').textContent =
    `Configure ${w.type.charAt(0).toUpperCase() + w.type.slice(1)}`;
  document.getElementById('panel-body').innerHTML = buildPanelForm(w);
  document.getElementById('widget-panel').classList.add('open');
}

function closePanel() {
  document.getElementById('widget-panel').classList.remove('open');
  editingWidgetId = null;
}

function buildPanelForm(w) {
  const c          = w.config || {};
  const metricOpts = ['Customer ID','First Name','Last Name','Email','Product','Status','Total Amount','Quantity','Unit Price'];
  const dataOpts   = ['Product','Quantity','Unit Price','Total Amount','Status','Created By'];
  const colOpts    = ['Customer ID','Name','Email','Phone','Address','Order ID','Date','Product','Qty','Unit Price','Total','Status','Created By'];
  const currentCols = c.columns || [];

  let html = `
    <div class="form-group">
      <label class="form-label">Widget Title</label>
      <input class="form-input" id="pc-title" value="${c.title || 'Untitled'}">
    </div>
    <div class="form-group">
      <label class="form-label">Widget Type</label>
      <input class="form-input" value="${w.type.charAt(0).toUpperCase() + w.type.slice(1)}" readonly style="background:var(--bg4)">
    </div>`;

  if (w.type !== 'kpi') {
    html += `<div class="form-group">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" id="pc-desc" placeholder="Optional description">${c.desc || ''}</textarea>
    </div>`;
  }

  html += `<div class="form-row">
    <div class="form-group">
      <label class="form-label">Width (Columns)</label>
      <input class="form-input" id="pc-width" type="number" value="${c.width || getDefaultWidth(w.type)}" min="1" max="12">
    </div>
    <div class="form-group">
      <label class="form-label">Height (Rows)</label>
      <input class="form-input" id="pc-height" type="number" value="${c.height || getDefaultHeight(w.type)}" min="1" max="8">
    </div>
  </div>`;

  if (w.type === 'kpi') {
    html += `
    <div class="form-group">
      <label class="form-label">Select Metric</label>
      <select class="form-select" id="pc-metric">
        ${metricOpts.map(m => `<option ${c.metric === m ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Aggregation</label>
      <select class="form-select" id="pc-agg">
        <option ${c.agg === 'Sum'     ? 'selected' : ''}>Sum</option>
        <option ${c.agg === 'Average' ? 'selected' : ''}>Average</option>
        <option ${c.agg === 'Count'   ? 'selected' : ''}>Count</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data Format</label>
        <select class="form-select" id="pc-format">
          <option ${c.format === 'Number'   ? 'selected' : ''}>Number</option>
          <option ${c.format === 'Currency' ? 'selected' : ''}>Currency</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Decimal Precision</label>
        <input class="form-input" id="pc-decimal" type="number" value="${c.decimal || 0}" min="0" max="4">
      </div>
    </div>`;

  } else if (w.type === 'pie') {
    html += `
    <div class="form-group">
      <label class="form-label">Choose Chart Data</label>
      <select class="form-select" id="pc-piedata">
        ${dataOpts.map(d => `<option ${c.pieData === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Chart Color</label>
      <div class="color-row">
        <input type="color" id="pc-color-pick" value="${c.color || '#10b981'}"
               oninput="document.getElementById('pc-color').value=this.value">
        <input class="form-input" id="pc-color" value="${c.color || '#10b981'}"
               oninput="document.getElementById('pc-color-pick').value=this.value">
      </div>
    </div>
    <label class="check-wrap">
      <input type="checkbox" id="pc-legend" ${c.legend ? 'checked' : ''}> Show Legend
    </label>`;

  } else if (w.type === 'table') {
    html += `
    <div class="form-group">
      <label class="form-label">Choose Columns</label>
      <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:.5rem;max-height:180px;overflow-y:auto">
        ${colOpts.map(col => `<label class="check-wrap" style="margin-bottom:.3rem">
          <input type="checkbox" name="pc-col" value="${col}" ${currentCols.includes(col) ? 'checked' : ''}> ${col}
        </label>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Sort By</label>
      <select class="form-select" id="pc-sort">
        <option ${c.sort === 'Ascending'  ? 'selected' : ''}>Ascending</option>
        <option ${c.sort === 'Descending' ? 'selected' : ''}>Descending</option>
        <option ${c.sort === 'Order date' ? 'selected' : ''}>Order date</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Pagination</label>
        <select class="form-select" id="pc-pagination">
          <option ${c.pagination == 5  ? 'selected' : ''}>5</option>
          <option ${c.pagination == 10 ? 'selected' : ''}>10</option>
          <option ${c.pagination == 15 ? 'selected' : ''}>15</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Font Size</label>
        <input class="form-input" id="pc-fontsize" type="number" value="${c.fontSize || 14}" min="12" max="18">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Header Background</label>
      <div class="color-row">
        <input type="color" id="pc-hcolor-pick" value="${c.headerColor || '#54bd95'}"
               oninput="document.getElementById('pc-hcolor').value=this.value">
        <input class="form-input" id="pc-hcolor" value="${c.headerColor || '#54bd95'}"
               oninput="document.getElementById('pc-hcolor-pick').value=this.value">
      </div>
    </div>
    <label class="check-wrap">
      <input type="checkbox" id="pc-filter" ${c.showFilter ? 'checked' : ''}> Apply filter section
    </label>`;

  } else {
    // Bar, Line, Area, Scatter
    const xyOpts = ['Product','Quantity','Unit Price','Total Amount','Status','Created By','Duration'];
    html += `
    <div class="form-group">
      <label class="form-label">X-Axis Data</label>
      <select class="form-select" id="pc-xaxis">
        ${xyOpts.map(o => `<option ${c.xAxis === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Y-Axis Data</label>
      <select class="form-select" id="pc-yaxis">
        ${xyOpts.map(o => `<option ${c.yAxis === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Chart Color</label>
      <div class="color-row">
        <input type="color" id="pc-color-pick" value="${c.color || '#10b981'}"
               oninput="document.getElementById('pc-color').value=this.value">
        <input class="form-input" id="pc-color" value="${c.color || '#10b981'}"
               oninput="document.getElementById('pc-color-pick').value=this.value">
      </div>
    </div>
    <label class="check-wrap">
      <input type="checkbox" id="pc-datalabel" ${c.dataLabel ? 'checked' : ''}> Show Data Labels
    </label>`;
  }
  return html;
}

function applyWidgetConfig() {
  const w = canvasWidgets.find(x => x.id === editingWidgetId);
  if (!w) return;
  const c = {};
  c.title  = document.getElementById('pc-title')?.value  || 'Untitled';
  c.desc   = document.getElementById('pc-desc')?.value   || '';
  c.width  = parseInt(document.getElementById('pc-width')?.value)  || getDefaultWidth(w.type);
  c.height = parseInt(document.getElementById('pc-height')?.value) || getDefaultHeight(w.type);

  if (w.type === 'kpi') {
    c.metric  = document.getElementById('pc-metric')?.value;
    c.agg     = document.getElementById('pc-agg')?.value;
    c.format  = document.getElementById('pc-format')?.value;
    c.decimal = parseInt(document.getElementById('pc-decimal')?.value) || 0;
  } else if (w.type === 'pie') {
    c.pieData = document.getElementById('pc-piedata')?.value;
    c.color   = document.getElementById('pc-color')?.value;
    c.legend  = document.getElementById('pc-legend')?.checked;
  } else if (w.type === 'table') {
    c.columns     = [...document.querySelectorAll('input[name="pc-col"]:checked')].map(x => x.value);
    c.sort        = document.getElementById('pc-sort')?.value;
    c.pagination  = parseInt(document.getElementById('pc-pagination')?.value) || 10;
    c.fontSize    = parseInt(document.getElementById('pc-fontsize')?.value)    || 14;
    c.headerColor = document.getElementById('pc-hcolor')?.value;
    c.showFilter  = document.getElementById('pc-filter')?.checked;
  } else {
    c.xAxis     = document.getElementById('pc-xaxis')?.value;
    c.yAxis     = document.getElementById('pc-yaxis')?.value;
    c.color     = document.getElementById('pc-color')?.value;
    c.dataLabel = document.getElementById('pc-datalabel')?.checked;
  }
  w.config = c;
  renderCanvas();
  closePanel();
  toast('Widget configured', 'success');
}

// ── SAVE & RENDER DASHBOARD ───────────────────────────────────
function saveDashboard() {
  if (!canvasWidgets.length) { toast('Add at least one widget before saving', 'error'); return; }
  savedWidgets = JSON.parse(JSON.stringify(canvasWidgets));
  toast('Dashboard saved!', 'success');
  setTimeout(() => switchTab('dashboard'), 500);
}

function clearCanvas() {
  showConfirm('Clear Canvas', 'Remove all widgets from the canvas?', () => {
    canvasWidgets = [];
    renderCanvas();
    toast('Canvas cleared', 'info');
  });
}

function renderDashboard() {
  const empty = document.getElementById('dashboard-empty');
  const grid  = document.getElementById('dashboard-grid');
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
  charts = {};
  if (!savedWidgets.length) {
    empty.style.display = 'flex';
    grid.style.display  = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.style.display  = 'grid';
  const filteredOrders = getFilteredOrders();
  grid.innerHTML = savedWidgets.map(w => buildDashboardWidget(w, filteredOrders)).join('');
  setTimeout(() => {
    savedWidgets.forEach(w => {
      if (['bar','line','area','scatter','pie'].includes(w.type)) renderChart(w, filteredOrders);
    });
  }, 50);
}

function buildDashboardWidget(w, data) {
  const c    = w.config || {};
  const col  = Math.min(c.width || getDefaultWidth(w.type), 12);
  const h    = c.height || getDefaultHeight(w.type);
  const rowH = h * 80 + 'px';
  let body   = '';
  if (w.type === 'kpi')   body = buildKPIBody(w, data);
  else if (w.type === 'table') body = buildTableBody(w, data);
  else body = `<div class="chart-wrap"><canvas id="chart-${w.id}"></canvas></div>`;
  return `<div class="widget-cell col-${col}" style="min-height:${rowH}">
    <div class="widget-cell-header">
      <div>
        <div class="widget-title">${c.title || 'Untitled'}</div>
        ${c.desc ? `<div class="widget-desc">${c.desc}</div>` : ''}
      </div>
      <div class="widget-controls">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="openWidgetPanelFromDashboard('${w.id}')" title="Settings">⚙</button>
        <button class="btn btn-danger btn-sm btn-icon"    onclick="removeWidgetFromDashboard('${w.id}')"    title="Delete">🗑</button>
      </div>
    </div>
    <div class="widget-body">${body}</div>
  </div>`;
}

function buildKPIBody(w, data) {
  const c      = w.config || {};
  const metric = c.metric || 'Total Amount';
  const agg    = c.agg    || 'Sum';
  const format = c.format || 'Number';
  const dec    = c.decimal || 0;
  let value    = 0;
  if (agg === 'Count') {
    value = data.length;
  } else {
    const vals = data.map(o => {
      if (metric === 'Total Amount') return o.total;
      if (metric === 'Quantity')     return o.qty;
      if (metric === 'Unit Price')   return o.unitPrice;
      return 1;
    });
    if (agg === 'Sum')     value = vals.reduce((a, b) => a + b, 0);
    if (agg === 'Average') value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  const display = format === 'Currency' ? '$' + value.toFixed(dec) : value.toFixed(dec);
  return `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:.5rem">
    <div class="kpi-value">${display}</div>
    <div class="kpi-label">${metric} · ${agg}</div>
  </div>`;
}

function buildTableBody(w, data) {
  const c       = w.config || {};
  const cols    = c.columns && c.columns.length ? c.columns : ['Name','Product','Total','Status'];
  const pg      = c.pagination  || 10;
  const hColor  = c.headerColor || '#54bd95';
  const fs      = c.fontSize    || 14;
  const colMap  = {
    'Customer ID': o => '#' + o.id,
    'Name':        o => o.firstName + ' ' + o.lastName,
    'Email':       o => o.email,
    'Phone':       o => o.phone,
    'Address':     o => `${o.street}, ${o.city}`,
    'Order ID':    o => '#' + o.id,
    'Date':        o => new Date(o.createdAt).toLocaleDateString(),
    'Product':     o => o.product,
    'Qty':         o => o.qty,
    'Unit Price':  o => '$' + (o.unitPrice || 0).toFixed(2),
    'Total':       o => '$' + (o.total     || 0).toFixed(2),
    'Status':      o => `<span class="badge badge-${o.status==='Pending'?'pending':o.status==='In progress'?'progress':'completed'}">${o.status}</span>`,
    'Created By':  o => o.createdBy
  };
  const rows = data.slice(0, pg);
  return `<div class="widget-table-wrap">
    <table class="widget-table" style="font-size:${fs}px">
      <thead><tr>${cols.map(col => `<th style="background:${hColor};color:#fff">${col}</th>`).join('')}</tr></thead>
      <tbody>${rows.length
        ? rows.map(o => `<tr>${cols.map(col => `<td>${(colMap[col] || (() => '—'))(o)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${cols.length}" style="text-align:center;color:var(--text3);padding:1rem">No data</td></tr>`
      }</tbody>
    </table>
  </div>`;
}

// ── CHART RENDERING ───────────────────────────────────────────
function renderChart(w, data) {
  const c      = w.config || {};
  const canvas = document.getElementById('chart-' + w.id);
  if (!canvas) return;
  const ctx   = canvas.getContext('2d');
  const color = c.color || '#10b981';
  let chartData, chartType;

  if (w.type === 'pie') {
    chartType = 'pie';
    const field   = c.pieData || 'Product';
    const counts  = {};
    data.forEach(o => { const val = getOrderField(o, field); counts[val] = (counts[val] || 0) + 1; });
    const labels  = Object.keys(counts);
    const palette = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];
    chartData = { labels, datasets: [{ data: Object.values(counts), backgroundColor: labels.map((_, i) => palette[i % palette.length]), borderWidth: 0 }] };

  } else if (w.type === 'scatter') {
    chartType = 'scatter';
    const pts = data.map(o => ({
      x: parseFloat(getOrderField(o, c.xAxis || 'Quantity')) || 0,
      y: parseFloat(getOrderField(o, c.yAxis || 'Total Amount')) || 0
    }));
    chartData = { datasets: [{ data: pts, backgroundColor: color + 'aa', borderColor: color, pointRadius: 5 }] };

  } else {
    chartType     = w.type === 'area' ? 'line' : w.type;
    const field   = c.xAxis || 'Product';
    const counts  = {};
    data.forEach(o => {
      const val  = getOrderField(o, field);
      const yval = parseFloat(getOrderField(o, c.yAxis || 'Total Amount')) || 1;
      counts[val] = (counts[val] || 0) + yval;
    });
    const labels = Object.keys(counts);
    chartData    = { labels, datasets: [{
      data:             Object.values(counts),
      backgroundColor:  w.type === 'area' ? color + '44' : color + 'cc',
      borderColor:      color,
      borderWidth:      2,
      fill:             w.type === 'area',
      tension:          0.4,
      pointBackgroundColor: color
    }]};
  }

  charts[w.id] = new Chart(ctx, {
    type: chartType,
    data: chartData,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: w.type === 'pie' ? (c.legend !== false) : false, labels: { color: '#94a3b8', font: { size: 11 } } }
      },
      scales: chartType !== 'pie' && chartType !== 'scatter'
        ? { x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
            y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.06)' } } }
        : chartType === 'scatter'
          ? { x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.04)' } },
              y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.06)' } } }
          : {}
    }
  });
}

function getOrderField(o, field) {
  const map = {
    'Product': o.product, 'Quantity': o.qty, 'Unit Price': o.unitPrice,
    'Total Amount': o.total, 'Status': o.status, 'Created By': o.createdBy, 'Duration': 1
  };
  return map[field] ?? o.product;
}

function openWidgetPanelFromDashboard(id) {
  const w = savedWidgets.find(x => x.id === id);
  if (!w) return;
  if (!canvasWidgets.find(x => x.id === id)) canvasWidgets.push(w);
  openWidgetPanel(id);
  document.getElementById('widget-panel').dataset.dashMode = 'true';
}

function removeWidgetFromDashboard(id) {
  showConfirm('Remove Widget', 'Remove this widget from the dashboard?', () => {
    savedWidgets = savedWidgets.filter(w => w.id !== id);
    renderDashboard();
    toast('Widget removed', 'info');
  });
}

// ── CONFIRM DIALOG ────────────────────────────────────────────
function showConfirm(title, msg, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  document.getElementById('confirm-ok').onclick = () => { closeConfirm(); cb(); };
  document.getElementById('confirm-dialog').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirm-dialog').classList.remove('open');
}

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const c    = document.getElementById('toasts');
  const t    = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const color = type === 'success' ? 'var(--accent)' : type === 'error' ? 'var(--red)' : 'var(--blue)';
  t.innerHTML = `<span style="color:${color}">${icons[type] || '·'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 400); }, 3000);
}

// ── SEED DATA ─────────────────────────────────────────────────
(function seedOrders() {
  const firstNames = ['Liam','Emma','Noah','Olivia','James','Ava','William','Sophia','Benjamin','Isabella',
                      'Lucas','Mia','Henry','Charlotte','Alexander','Amelia','Mason','Harper','Ethan','Evelyn',
                      'Daniel','Aria','Michael','Luna','Logan','Chloe','Jackson','Penelope','Sebastian','Layla'];
  const lastNames  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore',
                      'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark'];
  const products   = ['Fiber 300 Mbps','SGUnlimited Mobile','Fiber 1 Gbps','Business 500 Mbps','VoIP Corp'];
  const prices     = { 'Fiber 300 Mbps': 49.99, 'SGUnlimited Mobile': 29.99, 'Fiber 1 Gbps': 89.99, 'Business 500 Mbps': 129.99, 'VoIP Corp': 39.99 };
  const statuses   = ['Pending','In progress','Completed','Completed','Completed','Pending','In progress'];
  const creators   = ['Mr. Michael Harris','Mr. Ryan Cooper','Ms. Olivia Carter','Mr. Lucas Martin'];
  const countries  = ['US','Canada','Australia','Singapore','Hong Kong','India','United Kingdom','Germany','Japan','UAE'];
  const cities     = ['New York','Toronto','Sydney','Singapore','Mumbai','London','Berlin','Tokyo','Dubai','Melbourne'];
  const streets    = ['123 Main St','456 Oak Ave','789 Pine Rd','321 Elm Blvd','654 Maple Dr','987 Cedar Ln','147 Birch Way','258 Walnut Ct'];
  const now        = Date.now();

  for (let i = 0; i < 45; i++) {
    const fn        = firstNames[i % firstNames.length];
    const ln        = lastNames[i % lastNames.length];
    const product   = products[i % products.length];
    const qty       = (i % 5) + 1;
    const unitPrice = prices[product];
    const daysAgo   = (i * 2) % 90;
    orders.push({
      id: ++orderIdCounter,
      firstName: fn, lastName: ln,
      email:   fn.toLowerCase() + '.' + ln.toLowerCase() + '@example.com',
      phone:   '+1 ' + String(300 + i) + '-' + String(400 + i) + '-' + String(5000 + i),
      street:  streets[i % streets.length],
      city:    cities[i % cities.length],
      state:   'N/A',
      postal:  String(10000 + i * 137),
      country: countries[i % countries.length],
      product, qty, unitPrice,
      total:     qty * unitPrice,
      status:    statuses[i % statuses.length],
      createdBy: creators[i % creators.length],
      createdAt: now - daysAgo * 86400000
    });
  }
})();

// ── SEED DASHBOARD ────────────────────────────────────────────
(function seedDashboard() {
  const ws = [
    { id:'w_seed_1', type:'kpi',   config:{ title:'Total Revenue',           width:3, height:2, metric:'Total Amount', agg:'Sum',     format:'Currency', decimal:2 }},
    { id:'w_seed_2', type:'kpi',   config:{ title:'Total Orders',            width:3, height:2, metric:'Total Amount', agg:'Count',   format:'Number',   decimal:0 }},
    { id:'w_seed_3', type:'kpi',   config:{ title:'Avg Order Value',         width:3, height:2, metric:'Total Amount', agg:'Average', format:'Currency', decimal:2 }},
    { id:'w_seed_4', type:'kpi',   config:{ title:'Total Units Sold',        width:3, height:2, metric:'Quantity',     agg:'Sum',     format:'Number',   decimal:0 }},
    { id:'w_seed_5', type:'bar',   config:{ title:'Revenue by Product',      width:6, height:4, xAxis:'Product',    yAxis:'Total Amount', color:'#10b981', dataLabel:false }},
    { id:'w_seed_6', type:'pie',   config:{ title:'Orders by Status',        width:4, height:4, pieData:'Status',   color:'#3b82f6', legend:true }},
    { id:'w_seed_7', type:'line',  config:{ title:'Quantity Trend',          width:6, height:4, xAxis:'Product',    yAxis:'Quantity',    color:'#f59e0b', dataLabel:true }},
    { id:'w_seed_8', type:'area',  config:{ title:'Revenue by Creator',      width:6, height:4, xAxis:'Created By', yAxis:'Total Amount', color:'#8b5cf6', dataLabel:false }},
    { id:'w_seed_9', type:'table', config:{ title:'Recent Orders',           width:12, height:4,
        columns:['Name','Product','Qty','Total','Status','Created By','Date'],
        sort:'Order date', pagination:10, fontSize:13, headerColor:'#10b981', showFilter:false }}
  ];
  savedWidgets  = ws;
  canvasWidgets = JSON.parse(JSON.stringify(ws));
})();

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDragDrop();
  renderOrders();
  renderDashboard();
});
