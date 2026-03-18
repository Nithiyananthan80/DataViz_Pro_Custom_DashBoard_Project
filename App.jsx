/**
 * DataViz Pro — Custom Dashboard Builder
 * App.jsx  (React + Chart.js)
 *
 * Usage:
 *   npm install react react-dom chart.js react-chartjs-2
 *   Import and render <App /> in your entry point.
 *
 * NOTE: Styles are in styles.css — import it in your entry point:
 *   import './styles.css';
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Filler, Tooltip, Legend
);

// ── SEED DATA ──────────────────────────────────────────────────
const FIRST_NAMES = ['Liam','Emma','Noah','Olivia','James','Ava','William','Sophia',
  'Benjamin','Isabella','Lucas','Mia','Henry','Charlotte','Alexander','Amelia',
  'Mason','Harper','Ethan','Evelyn','Daniel','Aria','Michael','Luna','Logan',
  'Chloe','Jackson','Penelope','Sebastian','Layla'];
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller',
  'Davis','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White',
  'Harris','Martin','Thompson','Robinson','Clark'];
const PRODUCTS   = ['Fiber 300 Mbps','SGUnlimited Mobile','Fiber 1 Gbps','Business 500 Mbps','VoIP Corp'];
const PRICES     = { 'Fiber 300 Mbps':49.99,'SGUnlimited Mobile':29.99,'Fiber 1 Gbps':89.99,'Business 500 Mbps':129.99,'VoIP Corp':39.99 };
const STATUSES   = ['Pending','In progress','Completed','Completed','Completed','Pending','In progress'];
const CREATORS   = ['Mr. Michael Harris','Mr. Ryan Cooper','Ms. Olivia Carter','Mr. Lucas Martin'];
const COUNTRIES  = ['US','Canada','Australia','Singapore','Hong Kong','India','United Kingdom','Germany','Japan','UAE'];
const CITIES     = ['New York','Toronto','Sydney','Singapore','Mumbai','London','Berlin','Tokyo','Dubai','Melbourne'];
const STREETS    = ['123 Main St','456 Oak Ave','789 Pine Rd','321 Elm Blvd','654 Maple Dr','987 Cedar Ln','147 Birch Way','258 Walnut Ct'];

function generateSeedOrders() {
  const now = Date.now();
  return Array.from({ length: 45 }, (_, i) => {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[i % LAST_NAMES.length];
    const product   = PRODUCTS[i % PRODUCTS.length];
    const qty       = (i % 5) + 1;
    const unitPrice = PRICES[product];
    return {
      id: 1001 + i,
      firstName: fn, lastName: ln,
      email:   `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone:   `+1 ${300+i}-${400+i}-${5000+i}`,
      street:  STREETS[i % STREETS.length],
      city:    CITIES[i % CITIES.length],
      state:   'N/A', postal: String(10000 + i * 137),
      country: COUNTRIES[i % COUNTRIES.length],
      product, qty, unitPrice,
      total:     qty * unitPrice,
      status:    STATUSES[i % STATUSES.length],
      createdBy: CREATORS[i % CREATORS.length],
      createdAt: now - ((i * 2) % 90) * 86400000,
    };
  });
}

const SEED_WIDGETS = [
  { id:'w1', type:'kpi',   config:{ title:'Total Revenue',    width:3, height:2, metric:'Total Amount', agg:'Sum',     format:'Currency', decimal:2 }},
  { id:'w2', type:'kpi',   config:{ title:'Total Orders',     width:3, height:2, metric:'Total Amount', agg:'Count',   format:'Number',   decimal:0 }},
  { id:'w3', type:'kpi',   config:{ title:'Avg Order Value',  width:3, height:2, metric:'Total Amount', agg:'Average', format:'Currency', decimal:2 }},
  { id:'w4', type:'kpi',   config:{ title:'Total Units Sold', width:3, height:2, metric:'Quantity',     agg:'Sum',     format:'Number',   decimal:0 }},
  { id:'w5', type:'bar',   config:{ title:'Revenue by Product',  width:6, height:4, xAxis:'Product',    yAxis:'Total Amount', color:'#10b981' }},
  { id:'w6', type:'pie',   config:{ title:'Orders by Status',    width:4, height:4, pieData:'Status',   color:'#3b82f6', legend:true }},
  { id:'w7', type:'line',  config:{ title:'Quantity Trend',      width:6, height:4, xAxis:'Product',    yAxis:'Quantity',    color:'#f59e0b', dataLabel:true }},
  { id:'w8', type:'area',  config:{ title:'Revenue by Creator',  width:6, height:4, xAxis:'Created By', yAxis:'Total Amount', color:'#8b5cf6' }},
  { id:'w9', type:'table', config:{ title:'Recent Orders', width:12, height:4,
      columns:['Name','Product','Qty','Total','Status','Created By','Date'],
      sort:'Order date', pagination:10, fontSize:13, headerColor:'#10b981' }},
];

// ── HELPERS ────────────────────────────────────────────────────
function getOrderField(o, field) {
  const map = { Product:o.product, Quantity:o.qty, 'Unit Price':o.unitPrice, 'Total Amount':o.total, Status:o.status, 'Created By':o.createdBy, Duration:1 };
  return map[field] ?? o.product;
}
function getDefaultWidth(type)  { return type==='kpi'?2:type==='pie'?4:5; }
function getDefaultHeight(type) { return type==='kpi'?2:4; }

const CHART_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];
const COL_MAP = {
  'Customer ID': o => '#'+o.id,
  'Name':        o => `${o.firstName} ${o.lastName}`,
  'Email':       o => o.email,
  'Phone':       o => o.phone,
  'Address':     o => `${o.street}, ${o.city}`,
  'Order ID':    o => '#'+o.id,
  'Date':        o => new Date(o.createdAt).toLocaleDateString(),
  'Product':     o => o.product,
  'Qty':         o => o.qty,
  'Unit Price':  o => '$'+(o.unitPrice||0).toFixed(2),
  'Total':       o => '$'+(o.total||0).toFixed(2),
  'Status':      o => o.status,
  'Created By':  o => o.createdBy,
};

// ── TOAST HOOK ─────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type='info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

// ── CONFIRM HOOK ───────────────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState(null);
  const ask = (title, msg, cb) => setState({ title, msg, cb });
  const ok  = () => { state?.cb(); setState(null); };
  const no  = () => setState(null);
  return { state, ask, ok, no };
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [tab,          setTab]          = useState('dashboard');
  const [orders,       setOrders]       = useState(generateSeedOrders);
  const [savedWidgets, setSavedWidgets] = useState(SEED_WIDGETS);
  const [canvasWidgets,setCanvasWidgets]= useState(() => JSON.parse(JSON.stringify(SEED_WIDGETS)));
  const [dateFilter,   setDateFilter]   = useState('all');
  const [orderModal,   setOrderModal]   = useState({ open:false, editId:null });
  const [panelWidget,  setPanelWidget]  = useState(null);   // widget being configured
  const [orderIdCtr,   setOrderIdCtr]   = useState(1046);
  const { toasts, push: toast }         = useToast();
  const confirm                         = useConfirm();

  // Filtered orders for dashboard
  const filteredOrders = (() => {
    if (dateFilter === 'all') return orders;
    const now  = Date.now();
    const days = dateFilter === 'today' ? 1 : parseInt(dateFilter);
    return orders.filter(o => o.createdAt >= now - days * 86400000);
  })();

  const switchTab = (t) => setTab(t);

  // ── ORDER CRUD ───────────────────────────────────────────────
  const submitOrder = (data) => {
    if (orderModal.editId) {
      setOrders(prev => prev.map(o => o.id === orderModal.editId ? data : o));
      toast('Order updated successfully', 'success');
    } else {
      const newId = orderIdCtr + 1;
      setOrderIdCtr(newId);
      setOrders(prev => [...prev, { ...data, id: newId, createdAt: Date.now() }]);
      toast('Order created successfully', 'success');
    }
    setOrderModal({ open: false, editId: null });
  };

  const deleteOrder = (id) => {
    confirm.ask('Delete Order', 'Are you sure you want to delete this order?', () => {
      setOrders(prev => prev.filter(o => o.id !== id));
      toast('Order deleted', 'info');
    });
  };

  // ── CANVAS ───────────────────────────────────────────────────
  const addWidget = (type) => {
    const id = 'w_' + Date.now();
    const w  = { id, type, config: { title:'Untitled', width:getDefaultWidth(type), height:getDefaultHeight(type) }};
    setCanvasWidgets(prev => [...prev, w]);
    setPanelWidget(w);
    toast(`${type} widget added`, 'success');
  };

  const removeCanvasWidget = (id) => {
    confirm.ask('Remove Widget', 'Remove this widget from the canvas?', () => {
      setCanvasWidgets(prev => prev.filter(w => w.id !== id));
      toast('Widget removed', 'info');
    });
  };

  const applyConfig = (id, config) => {
    setCanvasWidgets(prev => prev.map(w => w.id === id ? { ...w, config } : w));
    setPanelWidget(null);
    toast('Widget configured', 'success');
  };

  const saveDashboard = () => {
    if (!canvasWidgets.length) { toast('Add at least one widget before saving', 'error'); return; }
    setSavedWidgets(JSON.parse(JSON.stringify(canvasWidgets)));
    toast('Dashboard saved!', 'success');
    setTimeout(() => switchTab('dashboard'), 500);
  };

  const clearCanvas = () => {
    confirm.ask('Clear Canvas', 'Remove all widgets from the canvas?', () => {
      setCanvasWidgets([]);
      toast('Canvas cleared', 'info');
    });
  };

  // ── DRAG & DROP ──────────────────────────────────────────────
  const dragRef = useRef(null);
  const onDragStart = (type) => { dragRef.current = type; };
  const onDrop = (e) => {
    e.preventDefault();
    if (dragRef.current) { addWidget(dragRef.current); dragRef.current = null; }
  };

  const editId    = orderModal.editId;
  const editOrder = editId ? orders.find(o => o.id === editId) : null;

  return (
    <div className="app">

      {/* ── TOP BAR ── */}
      <div className="topbar">
        <div className="logo"><span className="logo-dot"></span>DataViz Pro</div>
        <div className="topbar-nav">
          {['dashboard','orders'].map(t => (
            <button key={t} className={`tab-btn${tab===t?' active':''}`}
                    data-tab={t} onClick={() => switchTab(t)}>
              {t === 'dashboard' ? 'Dashboard' : 'Customer Orders'}
            </button>
          ))}
        </div>
        <div style={{ width:120, display:'flex', justifyContent:'flex-end' }}>
          {tab !== 'config' && (
            <button className="btn btn-primary btn-sm" onClick={() => switchTab('config')}>⚙ Configure</button>
          )}
        </div>
      </div>

      {/* ── BREADCRUMB ── */}
      {tab !== 'config' && (
        <div id="page-breadcrumb" style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'.45rem 1.5rem', display:'flex', alignItems:'center', gap:'.5rem', fontSize:'.75rem', color:'var(--text3)' }}>
          <span>DataViz Pro</span>
          <span style={{ color:'var(--border2)' }}>›</span>
          <span style={{ color:'var(--accent)', fontWeight:500 }}>
            { tab==='dashboard'?'Dashboard':'Customer Orders' }
          </span>
        </div>
      )}

      <div className="main">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <div className="section-header">
              <div><div className="section-title">My Dashboard</div><div className="section-sub">Personalized analytics overview</div></div>
            </div>
            <div className="date-filter-bar">
              <label>Show data for</label>
              <div className="filter-pills">
                {[['all','All time'],['today','Today'],['7','Last 7 Days'],['30','Last 30 Days'],['90','Last 90 Days']].map(([v,l]) => (
                  <button key={v} className={`filter-pill${dateFilter===v?' active':''}`} onClick={() => setDateFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            {!savedWidgets.length ? (
              <div className="empty-state">
                <h3>No widgets configured</h3>
                <p>Click Configure Dashboard to create your personalized analytics view.</p>
                <button className="btn btn-primary" onClick={() => switchTab('config')}>⚙ Configure Dashboard</button>
              </div>
            ) : (
              <div className="dashboard-grid">
                {savedWidgets.map(w => (
                  <DashboardWidget key={w.id} w={w} data={filteredOrders}
                    onEdit={() => { setCanvasWidgets(prev => prev.find(x=>x.id===w.id)?prev:[...prev,w]); setPanelWidget(w); }}
                    onDelete={() => { confirm.ask('Remove Widget','Remove this widget from the dashboard?',() => { setSavedWidgets(p=>p.filter(x=>x.id!==w.id)); toast('Widget removed','info'); }); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div>
            <div className="section-header">
              <div><div className="section-title">Customer Orders</div><div className="section-sub">Manage all customer orders</div></div>
              <button className="btn btn-primary" onClick={() => setOrderModal({ open:true, editId:null })}>+ Create Order</button>
            </div>
            {!orders.length ? (
              <div className="empty-state"><h3>No orders yet</h3><p>Click Create Order to add your first order.</p></div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>{['Order ID','Customer','Email','Product','Qty','Unit Price','Total','Status','Created By','Date','Actions'].map(h=><th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.firstName} {o.lastName}</td>
                        <td style={{color:'var(--text2)'}}>{o.email}</td>
                        <td>{o.product}</td>
                        <td>{o.qty}</td>
                        <td>${o.unitPrice.toFixed(2)}</td>
                        <td style={{color:'var(--accent)'}}><strong>${o.total.toFixed(2)}</strong></td>
                        <td><span className={`badge badge-${o.status==='Pending'?'pending':o.status==='In progress'?'progress':'completed'}`}>{o.status}</span></td>
                        <td style={{color:'var(--text2)',fontSize:'.75rem'}}>{o.createdBy}</td>
                        <td style={{color:'var(--text3)',fontSize:'.75rem'}}>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="actions">
                            <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setOrderModal({open:true,editId:o.id})}>✏</button>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteOrder(o.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab === 'config' && (
          <div>
            <div className="section-header">
              <div><div className="section-title">Dashboard Configuration</div><div className="section-sub">Drag widgets from the palette to the canvas</div></div>
              <div style={{display:'flex',gap:'.75rem'}}>
                <button className="btn btn-secondary" onClick={() => switchTab('dashboard')}>← Back</button>
                <button className="btn btn-primary" onClick={saveDashboard}>💾 Save Configuration</button>
              </div>
            </div>
            <div className="config-layout">
              <WidgetPalette onDragStart={onDragStart} />
              <div className="canvas-area">
                <div className="canvas-toolbar">
                  <span style={{fontSize:'.82rem',color:'var(--text2)'}}>Canvas Grid · 12 columns</span>
                  <button className="btn btn-secondary btn-sm" onClick={clearCanvas}>Clear All</button>
                </div>
                <div className="canvas-grid" id="canvas-drop-zone"
                     onDragOver={e => e.preventDefault()}
                     onDrop={onDrop}
                     onDragLeave={() => {}}>
                  {!canvasWidgets.length ? (
                    <div className="canvas-placeholder"><span>Drag widgets here to build your dashboard</span></div>
                  ) : (
                    <div className="canvas-grid-inner">
                      {canvasWidgets.map(w => (
                        <div key={w.id} className={`canvas-widget col-${Math.min(w.config?.width||getDefaultWidth(w.type),12)}`}
                             style={{minHeight:(w.config?.height||getDefaultHeight(w.type))*60}}>
                          <div className="canvas-widget-header">
                            <span className="canvas-widget-title">{w.config?.title||'Untitled'}</span>
                            <div style={{display:'flex',gap:'.3rem'}}>
                              <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setPanelWidget(w)}>⚙</button>
                              <button className="btn btn-danger btn-sm btn-icon" onClick={()=>removeCanvasWidget(w.id)}>✕</button>
                            </div>
                          </div>
                          <div className="canvas-widget-body">
                            <span style={{fontSize:'.72rem',color:'var(--accent)',textTransform:'uppercase',letterSpacing:'.08em'}}>{w.type}</span>
                            {w.config?.metric && <div style={{marginTop:'.3rem',color:'var(--text2)',fontSize:'.75rem'}}>Metric: {w.config.metric}</div>}
                            {w.config?.xAxis  && <div style={{marginTop:'.3rem',color:'var(--text2)',fontSize:'.75rem'}}>X: {w.config.xAxis} · Y: {w.config.yAxis||'—'}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── ORDER MODAL ── */}
      {orderModal.open && (
        <OrderModal
          editOrder={editOrder}
          onClose={() => setOrderModal({open:false,editId:null})}
          onSubmit={submitOrder}
        />
      )}

      {/* ── WIDGET CONFIG PANEL ── */}
      {panelWidget && (
        <WidgetPanel
          widget={canvasWidgets.find(w=>w.id===panelWidget.id) || panelWidget}
          onClose={() => setPanelWidget(null)}
          onApply={(config) => applyConfig(panelWidget.id, config)}
        />
      )}

      {/* ── CONFIRM ── */}
      {confirm.state && (
        <div className="confirm-dialog open">
          <div className="confirm-box">
            <h4>{confirm.state.title}</h4>
            <p>{confirm.state.msg}</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary btn-sm" onClick={confirm.no}>Cancel</button>
              <button className="btn btn-danger btn-sm"    onClick={confirm.ok}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span style={{color: t.type==='success'?'var(--accent)':t.type==='error'?'var(--red)':'var(--blue)'}}>
              {t.type==='success'?'✓':t.type==='error'?'✕':'ℹ'}
            </span>
            {t.msg}
          </div>
        ))}
      </div>

    </div>
  );
}

// ── WIDGET PALETTE ─────────────────────────────────────────────
function WidgetPalette({ onDragStart }) {
  const items = [
    { type:'bar',     label:'Bar Chart' },
    { type:'line',    label:'Line Chart' },
    { type:'pie',     label:'Pie Chart' },
    { type:'area',    label:'Area Chart' },
    { type:'scatter', label:'Scatter Plot' },
    { type:'table',   label:'Table' },
    { type:'kpi',     label:'KPI Value' },
  ];
  return (
    <div className="widget-palette">
      <div className="palette-title">Widget Library</div>
      {items.map(it => (
        <div key={it.type} className="palette-item" draggable
             onDragStart={() => onDragStart(it.type)}>
          <div className="palette-icon">{it.type.toUpperCase().slice(0,3)}</div>
          {it.label}
        </div>
      ))}
    </div>
  );
}

// ── DASHBOARD WIDGET ───────────────────────────────────────────
function DashboardWidget({ w, data, onEdit, onDelete }) {
  const c   = w.config || {};
  const col = Math.min(c.width || getDefaultWidth(w.type), 12);
  const h   = c.height || getDefaultHeight(w.type);
  return (
    <div className={`widget-cell col-${col}`} style={{minHeight: h*80}}>
      <div className="widget-cell-header">
        <div>
          <div className="widget-title">{c.title||'Untitled'}</div>
          {c.desc && <div className="widget-desc">{c.desc}</div>}
        </div>
        <div className="widget-controls">
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onEdit}>⚙</button>
          <button className="btn btn-danger btn-sm btn-icon"    onClick={onDelete}>🗑</button>
        </div>
      </div>
      <div className="widget-body">
        {w.type === 'kpi'   && <KPIWidget   w={w} data={data} />}
        {w.type === 'table' && <TableWidget w={w} data={data} />}
        {['bar','line','area','pie','scatter'].includes(w.type) && <ChartWidget w={w} data={data} />}
      </div>
    </div>
  );
}

// ── KPI WIDGET ─────────────────────────────────────────────────
function KPIWidget({ w, data }) {
  const c      = w.config || {};
  const metric = c.metric || 'Total Amount';
  const agg    = c.agg    || 'Sum';
  const format = c.format || 'Number';
  const dec    = c.decimal || 0;
  let value    = 0;
  if (agg === 'Count') {
    value = data.length;
  } else {
    const vals = data.map(o => metric==='Total Amount'?o.total:metric==='Quantity'?o.qty:metric==='Unit Price'?o.unitPrice:1);
    if (agg === 'Sum')     value = vals.reduce((a,b)=>a+b,0);
    if (agg === 'Average') value = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  }
  const display = format === 'Currency' ? '$'+value.toFixed(dec) : value.toFixed(dec);
  return (
    <div style={{display:'flex',flexDirection:'column',justifyContent:'center',height:'100%',padding:'.5rem'}}>
      <div className="kpi-value">{display}</div>
      <div className="kpi-label">{metric} · {agg}</div>
    </div>
  );
}

// ── TABLE WIDGET ───────────────────────────────────────────────
function TableWidget({ w, data }) {
  const c      = w.config || {};
  const cols   = c.columns?.length ? c.columns : ['Name','Product','Total','Status'];
  const pg     = c.pagination || 10;
  const hColor = c.headerColor || '#54bd95';
  const fs     = c.fontSize || 14;
  const rows   = data.slice(0, pg);
  return (
    <div className="widget-table-wrap">
      <table className="widget-table" style={{fontSize:fs}}>
        <thead><tr>{cols.map(col=><th key={col} style={{background:hColor,color:'#fff'}}>{col}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map(o=>(
            <tr key={o.id}>{cols.map(col=><td key={col}>{(COL_MAP[col]||(()=>'—'))(o)}</td>)}</tr>
          )) : <tr><td colSpan={cols.length} style={{textAlign:'center',color:'var(--text3)',padding:'1rem'}}>No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── CHART WIDGET ───────────────────────────────────────────────
function ChartWidget({ w, data }) {
  const c     = w.config || {};
  const color = c.color || '#10b981';
  const opts  = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: w.type==='pie'?(c.legend!==false):false, labels:{color:'#94a3b8',font:{size:11}} } },
    scales: w.type!=='pie' ? {
      x: { ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,.04)'} },
      y: { ticks:{color:'#64748b',font:{size:10}}, grid:{color:'rgba(255,255,255,.06)'} },
    } : {},
  };

  if (w.type === 'pie') {
    const field  = c.pieData || 'Product';
    const counts = {};
    data.forEach(o => { const v=getOrderField(o,field); counts[v]=(counts[v]||0)+1; });
    const labels  = Object.keys(counts);
    const dataset = { data:Object.values(counts), backgroundColor:labels.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]), borderWidth:0 };
    return <div className="chart-wrap"><Pie data={{labels,datasets:[dataset]}} options={opts}/></div>;
  }
  if (w.type === 'scatter') {
    const pts = data.map(o => ({ x:parseFloat(getOrderField(o,c.xAxis||'Quantity'))||0, y:parseFloat(getOrderField(o,c.yAxis||'Total Amount'))||0 }));
    return <div className="chart-wrap"><Scatter data={{datasets:[{data:pts,backgroundColor:color+'aa',borderColor:color,pointRadius:5}]}} options={opts}/></div>;
  }
  const field  = c.xAxis || 'Product';
  const counts = {};
  data.forEach(o => { const v=getOrderField(o,field); const y=parseFloat(getOrderField(o,c.yAxis||'Total Amount'))||1; counts[v]=(counts[v]||0)+y; });
  const labels  = Object.keys(counts);
  const dataset = { data:Object.values(counts), backgroundColor:w.type==='area'?color+'44':color+'cc', borderColor:color, borderWidth:2, fill:w.type==='area', tension:0.4, pointBackgroundColor:color };
  const chartData = { labels, datasets:[dataset] };
  if (w.type === 'bar')  return <div className="chart-wrap"><Bar  data={chartData} options={opts}/></div>;
  return <div className="chart-wrap"><Line data={chartData} options={opts}/></div>;
}

// ── ORDER MODAL ────────────────────────────────────────────────
const EMPTY_FORM = { firstName:'',lastName:'',email:'',phone:'',street:'',city:'',state:'',postal:'',country:'',product:'',qty:1,unitPrice:'',status:'Pending',createdBy:'' };

function OrderModal({ editOrder, onClose, onSubmit }) {
  const [form,   setForm]   = useState(editOrder ? { ...editOrder, unitPrice:editOrder.unitPrice } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const total = (parseFloat(form.qty)||0) * (parseFloat(form.unitPrice)||0);
  const set   = (k,v) => setForm(p => ({ ...p, [k]:v }));

  const validate = () => {
    const req = ['firstName','lastName','email','phone','street','city','state','postal','country','product','qty','unitPrice','createdBy'];
    const e   = {};
    req.forEach(k => { if (!String(form[k]).trim() || (k==='qty'&&parseFloat(form[k])<1)) e[k]=true; });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({ ...form, qty:parseFloat(form.qty), unitPrice:parseFloat(form.unitPrice), total, id:editOrder?.id });
  };

  const F = ({ id, label, ...props }) => (
    <div className="form-group">
      <label className="form-label">{label} {props.required&&<span className="required">*</span>}</label>
      <input className={`form-input${errors[id]?' error':''}`} value={form[id]||''} onChange={e=>set(id,e.target.value)} {...props}/>
      {errors[id] && <div className="form-error show">Please fill the field</div>}
    </div>
  );
  const S = ({ id, label, children, ...props }) => (
    <div className="form-group">
      <label className="form-label">{label} <span className="required">*</span></label>
      <select className={`form-select${errors[id]?' error':''}`} value={form[id]||''} onChange={e=>set(id,e.target.value)} {...props}>{children}</select>
      {errors[id] && <div className="form-error show">Please fill the field</div>}
    </div>
  );

  return (
    <div className="modal-overlay open">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editOrder?'Edit Order':'Create Order'}</div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <div className="form-section-title">Customer Information</div>
            <div className="form-row"><F id="firstName" label="First Name" required placeholder="John"/><F id="lastName" label="Last Name" required placeholder="Doe"/></div>
            <div className="form-row"><F id="email" label="Email ID" required type="email" placeholder="john@example.com"/><F id="phone" label="Phone Number" required placeholder="+1 234 567 8900"/></div>
            <F id="street" label="Street Address" required placeholder="123 Main Street"/>
            <div className="form-row"><F id="city" label="City" required placeholder="New York"/><F id="state" label="State / Province" required placeholder="NY"/></div>
            <div className="form-row">
              <F id="postal" label="Postal Code" required placeholder="10001"/>
              <S id="country" label="Country">
                <option value="">Select Country</option>
                {['US','Canada','Australia','Singapore','Hong Kong','India','United Kingdom','Germany','France','Japan','UAE','Brazil','South Africa','Malaysia','New Zealand'].map(c=><option key={c}>{c}</option>)}
              </S>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">Order Information</div>
            <div className="form-row">
              <S id="product" label="Choose Product" onChange={e=>set('product',e.target.value)}>
                <option value="">Select Product</option>
                {PRODUCTS.map(p=><option key={p}>{p}</option>)}
              </S>
              <F id="qty" label="Quantity" required type="number" min="1" onChange={e=>set('qty',e.target.value)}/>
            </div>
            <div className="form-row">
              <F id="unitPrice" label="Unit Price" required type="number" placeholder="0.00" onChange={e=>set('unitPrice',e.target.value)}/>
              <div className="form-group">
                <label className="form-label">Total Amount</label>
                <input className="form-input" readOnly value={'$'+total.toFixed(2)} style={{background:'var(--bg4)',color:'var(--accent)'}}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status <span className="required">*</span></label>
                <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}>
                  <option>Pending</option><option>In progress</option><option>Completed</option>
                </select>
              </div>
              <S id="createdBy" label="Created By">
                <option value="">Select</option>
                {CREATORS.map(c=><option key={c}>{c}</option>)}
              </S>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Submit Order</button>
        </div>
      </div>
    </div>
  );
}

// ── WIDGET CONFIG PANEL ────────────────────────────────────────
function WidgetPanel({ widget, onClose, onApply }) {
  const c = widget.config || {};
  const [cfg, setCfg] = useState({ ...c });
  const set = (k, v) => setCfg(p => ({ ...p, [k]: v }));

  const METRIC_OPTS = ['Customer ID','First Name','Last Name','Email','Product','Status','Total Amount','Quantity','Unit Price'];
  const DATA_OPTS   = ['Product','Quantity','Unit Price','Total Amount','Status','Created By'];
  const COL_OPTS    = ['Customer ID','Name','Email','Phone','Address','Order ID','Date','Product','Qty','Unit Price','Total','Status','Created By'];
  const XY_OPTS     = ['Product','Quantity','Unit Price','Total Amount','Status','Created By','Duration'];

  return (
    <div className="side-panel open">
      <div className="side-panel-header">
        <div className="side-panel-title">Configure {widget.type}</div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="side-panel-body">
        <div className="form-group"><label className="form-label">Widget Title</label><input className="form-input" value={cfg.title||''} onChange={e=>set('title',e.target.value)}/></div>
        <div className="form-group"><label className="form-label">Widget Type</label><input className="form-input" readOnly value={widget.type} style={{background:'var(--bg4)'}}/></div>
        {widget.type !== 'kpi' && <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={cfg.desc||''} onChange={e=>set('desc',e.target.value)} placeholder="Optional"/></div>}
        <div className="form-row">
          <div className="form-group"><label className="form-label">Width</label><input className="form-input" type="number" value={cfg.width||getDefaultWidth(widget.type)} min="1" max="12" onChange={e=>set('width',parseInt(e.target.value))}/></div>
          <div className="form-group"><label className="form-label">Height</label><input className="form-input" type="number" value={cfg.height||getDefaultHeight(widget.type)} min="1" max="8" onChange={e=>set('height',parseInt(e.target.value))}/></div>
        </div>
        {widget.type === 'kpi' && <>
          <div className="form-group"><label className="form-label">Select Metric</label><select className="form-select" value={cfg.metric||''} onChange={e=>set('metric',e.target.value)}>{METRIC_OPTS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Aggregation</label><select className="form-select" value={cfg.agg||'Sum'} onChange={e=>set('agg',e.target.value)}><option>Sum</option><option>Average</option><option>Count</option></select></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Format</label><select className="form-select" value={cfg.format||'Number'} onChange={e=>set('format',e.target.value)}><option>Number</option><option>Currency</option></select></div>
            <div className="form-group"><label className="form-label">Decimals</label><input className="form-input" type="number" value={cfg.decimal||0} min="0" max="4" onChange={e=>set('decimal',parseInt(e.target.value))}/></div>
          </div>
        </>}
        {widget.type === 'pie' && <>
          <div className="form-group"><label className="form-label">Chart Data</label><select className="form-select" value={cfg.pieData||''} onChange={e=>set('pieData',e.target.value)}>{DATA_OPTS.map(d=><option key={d}>{d}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Color</label><input className="form-input" type="color" value={cfg.color||'#10b981'} onChange={e=>set('color',e.target.value)}/></div>
          <label className="check-wrap"><input type="checkbox" checked={!!cfg.legend} onChange={e=>set('legend',e.target.checked)}/> Show Legend</label>
        </>}
        {widget.type === 'table' && <>
          <div className="form-group">
            <label className="form-label">Columns</label>
            <div style={{background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'.5rem',maxHeight:180,overflowY:'auto'}}>
              {COL_OPTS.map(col=>(
                <label key={col} className="check-wrap" style={{marginBottom:'.3rem'}}>
                  <input type="checkbox" checked={(cfg.columns||[]).includes(col)} onChange={e=>{ const cols=(cfg.columns||[]).filter(x=>x!==col); set('columns',e.target.checked?[...cols,col]:cols); }}/> {col}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group"><label className="form-label">Header Color</label><input className="form-input" type="color" value={cfg.headerColor||'#54bd95'} onChange={e=>set('headerColor',e.target.value)}/></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Pagination</label><select className="form-select" value={cfg.pagination||10} onChange={e=>set('pagination',parseInt(e.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={15}>15</option></select></div>
            <div className="form-group"><label className="form-label">Font Size</label><input className="form-input" type="number" value={cfg.fontSize||14} min="12" max="18" onChange={e=>set('fontSize',parseInt(e.target.value))}/></div>
          </div>
        </>}
        {['bar','line','area','scatter'].includes(widget.type) && <>
          <div className="form-group"><label className="form-label">X-Axis</label><select className="form-select" value={cfg.xAxis||''} onChange={e=>set('xAxis',e.target.value)}>{XY_OPTS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Y-Axis</label><select className="form-select" value={cfg.yAxis||''} onChange={e=>set('yAxis',e.target.value)}>{XY_OPTS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Color</label><input className="form-input" type="color" value={cfg.color||'#10b981'} onChange={e=>set('color',e.target.value)}/></div>
          <label className="check-wrap"><input type="checkbox" checked={!!cfg.dataLabel} onChange={e=>set('dataLabel',e.target.checked)}/> Show Data Labels</label>
        </>}
      </div>
      <div style={{padding:'1rem 1.25rem',borderTop:'1px solid var(--border)'}}>
        <button className="btn btn-primary" style={{width:'100%'}} onClick={()=>onApply(cfg)}>Apply Changes</button>
      </div>
    </div>
  );
}
