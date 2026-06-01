const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://helvinho-racoes-api.onrender.com/api';

/* ---- State ---- */
let token             = localStorage.getItem('helvinhoAdminToken');
let products          = [];
let orders            = [];
let messages          = [];
let newsletter        = [];
let editingProductId  = null;
let viewingMessageId  = null;
let currentDateFilter = 'all';
let lastOrderTotal    = parseInt(localStorage.getItem('adminLastOrderCount') ?? '0', 10);
let salesChartInst    = null;
let selectedProducts  = new Set();

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    registerSW();
    document.getElementById('login-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') login();
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#global-search') && !e.target.closest('#search-results')) hideSearch();
    });
    if (token) showApp();
});

/* ---- Sidebar mobile ---- */
function openSidebar()  {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sb-overlay')?.classList.add('show');
}
function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sb-overlay')?.classList.remove('show');
}

/* ---- API helper ---- */
async function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
        const res  = await fetch(API + path, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { logout(); return null; }
        return { ok: res.ok, status: res.status, data };
    } catch {
        toast('Sem conexão com a API.', 'danger');
        return null;
    }
}

/* ---- Auth ---- */
async function login() {
    const email    = document.getElementById('login-email')?.value.trim()  ?? '';
    const password = document.getElementById('login-password')?.value      ?? '';
    const errEl    = document.getElementById('login-error');
    const btn      = document.getElementById('btn-login');

    if (!email || !password) { show(errEl, 'Preencha e-mail e senha.'); return; }
    hide(errEl);
    setBtnLoading(btn, true, 'Entrando...');

    const res = await api('POST', '/auth/login', { email, password });
    setBtnLoading(btn, false, '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar');

    if (!res?.ok) { show(errEl, res?.data?.error ?? 'Credenciais inválidas.'); return; }

    token = res.data.token;
    localStorage.setItem('helvinhoAdminToken', token);
    showApp();
}

async function register() {
    const email    = document.getElementById('reg-email')?.value.trim()  ?? '';
    const password = document.getElementById('reg-password')?.value      ?? '';
    const errEl    = document.getElementById('reg-error');

    hide(errEl);
    if (!email || password.length < 8) { show(errEl, 'Preencha e-mail e senha (mín. 8 caracteres).'); return; }

    const res = await api('POST', '/auth/register', { email, password });
    if (!res?.ok) { show(errEl, res?.data?.error ?? 'Erro ao criar conta.'); return; }

    token = res.data.token;
    localStorage.setItem('helvinhoAdminToken', token);
    showApp();
}

function logout() {
    token = null;
    localStorage.removeItem('helvinhoAdminToken');
    document.getElementById('admin-app')?.classList.add('d-none');
    const ls = document.getElementById('login-screen');
    if (ls) ls.style.display = 'flex';
}

function toggleRegister() {
    document.getElementById('register-wrap')?.classList.toggle('d-none');
}

async function showApp() {
    const res = await api('GET', '/auth/me');
    if (!res?.ok) { logout(); return; }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').classList.remove('d-none');
    setText('topbar-user', res.data.email ?? '');

    showView('dashboard');
    startPolling();
}

/* ---- Router ---- */
let currentView = 'dashboard';
function showView(view) {
    currentView = view;
    closeSidebar();
    ['dashboard','products','orders','messages','financeiro','despesas','estoque','activity','newsletter','settings'].forEach(v => {
        document.getElementById('view-' + v)?.classList.toggle('d-none', v !== view);
        document.getElementById('nav-'  + v)?.classList.toggle('active', v === view);
    });
    const titles = { dashboard:'Dashboard', products:'Produtos', orders:'Pedidos', messages:'Mensagens', financeiro:'Financeiro', despesas:'Despesas', estoque:'Estoque', activity:'Log de Atividades', newsletter:'Newsletter', settings:'Configurações' };
    setText('topbar-title', titles[view] ?? '');

    if (view === 'dashboard') loadDashboard();
    if (view === 'products')  loadProducts();
    if (view === 'orders')    loadOrders();
    if (view === 'messages')  loadMessages();
    if (view === 'financeiro') loadFinanceiro();
    if (view === 'despesas')   loadDespesas();
    if (view === 'estoque')    loadEstoque();
    if (view === 'activity')   loadActivity();
    if (view === 'newsletter') loadNewsletter();
    if (view === 'settings')   loadSettings();
}

/* ---- Polling — detecta pedidos novos ---- */
function startPolling() {
    setInterval(async () => {
        if (document.hidden) return;
        const res = await api('GET', '/orders?limit=1');
        if (!res?.ok) return;
        const total = res.data.pagination?.total ?? 0;
        if (lastOrderTotal > 0 && total > lastOrderTotal) {
            const n   = total - lastOrderTotal;
            const msg = `${n} novo${n > 1 ? 's' : ''} pedido${n > 1 ? 's' : ''}!`;
            playSound();
            toast(`🛍️ ${msg}`, 'success');
            showBrowserNotification('🛍️ Helvinho Rações', msg);
            const nb = document.getElementById('nav-orders');
            nb?.classList.add('nav-flash');
            setTimeout(() => nb?.classList.remove('nav-flash'), 2500);
        }
        lastOrderTotal = total;
        localStorage.setItem('adminLastOrderCount', String(total));
    }, 30000);
}

function playSound() {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
    } catch {}
}

/* ---- Stats ---- */
async function loadStats() {
    const [pRes, oRes, mRes] = await Promise.all([
        api('GET', '/products?limit=100'),
        api('GET', '/orders?limit=100'),
        api('GET', '/contact?limit=100'),
    ]);
    if (pRes?.ok) {
        const items = pRes.data.items ?? [];
        setText('stat-products', items.filter(p => p.active).length);
        setText('stat-lowstock', items.filter(p => p.stock <= 5).length);
    }
    if (oRes?.ok) {
        const pending = (oRes.data.orders ?? []).filter(o => o.status === 'pending').length;
        setText('stat-orders', pending);
        setBadge('badge-orders', pending);
    }
    if (mRes?.ok) {
        const unread = (mRes.data.messages ?? []).filter(m => !m.replied).length;
        setText('stat-messages', unread);
        setBadge('badge-messages', unread);
    }
}

/* ---- Dashboard ---- */
function renderGreeting() {
    const h = new Date().getHours();
    const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const email = document.getElementById('topbar-user')?.textContent ?? '';
    const nome  = email ? email.split('@')[0].split(/[._]/)[0] : '';
    const nomeCap = nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : '';
    setText('dash-greeting-text', `${saud}${nomeCap ? ', ' + nomeCap : ''}!`);
    setText('dash-date', new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
}

async function loadDashboard() {
    renderGreeting();
    tableLoading('dash-orders',   4, 4);
    tableLoading('dash-messages', 2, 4);
    const ac = document.getElementById('action-center');
    if (ac) ac.innerHTML = '<div class="text-center text-muted py-4 small"><span class="spinner-border spinner-border-sm me-2"></span>Carregando...</div>';

    /* Busca consolidada — uma chamada de cada recurso */
    const [oRes, pRes, mRes] = await Promise.all([
        api('GET', '/orders?limit=500'),
        api('GET', '/products?limit=200'),
        api('GET', '/contact?limit=200'),
    ]);
    const ords  = oRes?.ok ? (oRes.data.orders ?? [])   : [];
    const prods = pRes?.ok ? (pRes.data.items ?? [])    : [];
    const msgs  = mRes?.ok ? (mRes.data.messages ?? []) : [];

    /* Cache para o gráfico não refazer fetch */
    finOrders = ords;
    if (prods.length) products = prods;

    renderDashStats(ords, prods, msgs);
    renderActionCenter(ords, prods, msgs);
    renderDashMetrics(ords);
    renderDashRecent(ords, msgs);
    loadSalesChart(7, ords);
}

function renderDashStats(ords, prods, msgs) {
    setText('stat-products', prods.filter(p => p.active).length);
    setText('stat-lowstock', prods.filter(p => p.active && p.stock <= 5).length);
    const pendingOrders = ords.filter(o => o.status === 'pending').length;
    setText('stat-orders', pendingOrders);
    setBadge('badge-orders', pendingOrders);
    const unread = msgs.filter(m => !m.replied).length;
    setText('stat-messages', unread);
    setBadge('badge-messages', unread);
}

/* Centro de ações — tudo que precisa de atenção, com clique direto */
function renderActionCenter(ords, prods, msgs) {
    const el = document.getElementById('action-center');
    if (!el) return;

    const pendentes = ords.filter(o => o.status === 'pending');
    const pixVerify = ords.filter(o => o.payment === 'Pix' && ['pending','confirmed','preparing','ready'].includes(o.status));
    const semEstoque = prods.filter(p => p.active && p.stock === 0);
    const estoqueBaixo = prods.filter(p => p.active && p.stock > 0 && p.stock <= 5);
    const naoRespondidas = msgs.filter(m => !m.replied);

    const items = [];
    if (pendentes.length) items.push({
        bg:'#fff3e0', color:'#ff6b35', icon:'bi-bag-check-fill',
        title:`${pendentes.length} pedido${pendentes.length>1?'s':''} aguardando confirmação`,
        sub:'Confirme para iniciar o preparo', count:pendentes.length,
        cbg:'#fff3e0', ccolor:'#ff6b35', action:`gotoOrders('pending')`,
    });
    if (pixVerify.length) items.push({
        bg:'#e8f5ee', color:'#2d9e5f', icon:'bi-qr-code',
        title:`${pixVerify.length} pagamento${pixVerify.length>1?'s':''} PIX para verificar`,
        sub:'Confirme o recebimento antes de entregar', count:pixVerify.length,
        cbg:'#e8f5ee', ccolor:'#2d9e5f', action:`gotoOrders('')`,
    });
    if (semEstoque.length) items.push({
        bg:'#fce4ec', color:'#e53935', icon:'bi-x-circle-fill',
        title:`${semEstoque.length} produto${semEstoque.length>1?'s':''} sem estoque`,
        sub:'Reponha para voltar a vender', count:semEstoque.length,
        cbg:'#fce4ec', ccolor:'#e53935', action:`showView('estoque')`,
    });
    if (estoqueBaixo.length) items.push({
        bg:'#fef9e7', color:'#d97706', icon:'bi-exclamation-triangle-fill',
        title:`${estoqueBaixo.length} produto${estoqueBaixo.length>1?'s':''} com estoque baixo`,
        sub:'5 unidades ou menos restantes', count:estoqueBaixo.length,
        cbg:'#fef9e7', ccolor:'#d97706', action:`showView('estoque')`,
    });
    if (naoRespondidas.length) items.push({
        bg:'#e8f0fe', color:'#4285f4', icon:'bi-envelope-fill',
        title:`${naoRespondidas.length} mensagem${naoRespondidas.length>1?'ns':''} não respondida${naoRespondidas.length>1?'s':''}`,
        sub:'Clientes aguardando retorno', count:naoRespondidas.length,
        cbg:'#e8f0fe', ccolor:'#4285f4', action:`showView('messages')`,
    });

    setText('action-summary', items.length ? `${items.length} ${items.length>1?'itens':'item'}` : '');

    if (!items.length) {
        el.innerHTML = `<div class="allclear">
            <div class="ic"><i class="bi bi-check-circle-fill"></i></div>
            <p class="fw-semibold mb-1 mt-2">Tudo em dia! 🎉</p>
            <p class="text-muted small mb-0">Nenhuma pendência no momento. Bom trabalho!</p>
        </div>`;
        return;
    }

    el.innerHTML = items.map(it => `
        <div class="action-item" onclick="${it.action}">
            <div class="action-ico" style="background:${it.bg};color:${it.color}"><i class="bi ${it.icon}"></i></div>
            <div>
                <div class="action-title">${it.title}</div>
                <div class="action-sub">${it.sub}</div>
            </div>
            <div class="action-count" style="background:${it.cbg};color:${it.ccolor}">${it.count}</div>
        </div>`).join('');
}

/* Navega para pedidos já aplicando um filtro de status */
function gotoOrders(status) {
    showView('orders');
    const sel = document.getElementById('order-filter');
    if (sel) sel.value = status;
    /* renderOrders roda após o fetch de loadOrders e lê o select já ajustado */
}

function renderDashMetrics(all) {
    const now      = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lstStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lstEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const valid  = all.filter(o => o.status !== 'cancelled');
    const curMon = valid.filter(o => new Date(o.createdAt) >= curStart);
    const lstMon = valid.filter(o => new Date(o.createdAt) >= lstStart && new Date(o.createdAt) <= lstEnd);

    const curTotal = curMon.reduce((s, o) => s + o.total, 0);
    const lstTotal = lstMon.reduce((s, o) => s + o.total, 0);
    const ticket   = curMon.length ? curTotal / curMon.length : 0;
    const change   = lstTotal > 0 ? ((curTotal - lstTotal) / lstTotal) * 100 : null;

    const qty = {};
    valid.forEach(o => o.items.forEach(i => { qty[i.name] = (qty[i.name] ?? 0) + i.qty; }));
    const [bestName, bestQty] = Object.entries(qty).sort((a, b) => Number(b[1]) - Number(a[1]))[0] ?? ['—', 0];

    setText('metric-month',  fmtMoney(curTotal));
    setText('metric-ticket', fmtMoney(ticket));
    setText('metric-ticket-sub', `${curMon.length} pedido${curMon.length !== 1 ? 's' : ''} este mês`);

    const chgEl = document.getElementById('metric-month-change');
    if (chgEl) {
        if (change === null) { chgEl.textContent = 'Primeiro mês de dados'; chgEl.className = 'metric-change flat'; }
        else if (change >= 0) { chgEl.textContent = `+${change.toFixed(1)}% vs mês anterior`; chgEl.className = 'metric-change up'; }
        else { chgEl.textContent = `${change.toFixed(1)}% vs mês anterior`; chgEl.className = 'metric-change down'; }
    }

    const nameShort = String(bestName).length > 22 ? String(bestName).substring(0, 22) + '…' : String(bestName);
    setText('metric-bestseller',     nameShort);
    setText('metric-bestseller-qty', bestQty ? `${bestQty} unidades vendidas` : 'Sem vendas ainda');
}

function renderDashRecent(ords, msgs) {
    const ot = document.getElementById('dash-orders');
    if (ot) {
        const list = ords.slice(0, 5);
        ot.innerHTML = !list.length
            ? '<tr><td colspan="4" class="text-center text-muted py-4 small">Nenhum pedido ainda.</td></tr>'
            : list.map(o => `
                <tr style="cursor:pointer" onclick="gotoOrders('')">
                    <td data-label="Pedido"><span class="font-monospace fw-semibold small">#${o._id.slice(-6).toUpperCase()}</span></td>
                    <td data-label="Total"><strong class="small">${fmtMoney(o.total)}</strong></td>
                    <td data-label="Tipo"><span class="small text-muted">${o.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}</span></td>
                    <td data-label="Status">${statusBadge(o.status)}</td>
                </tr>`).join('');
    }
    const mt = document.getElementById('dash-messages');
    if (mt) {
        const list = msgs.slice(0, 5);
        mt.innerHTML = !list.length
            ? '<tr><td colspan="2" class="text-center text-muted py-4 small">Nenhuma mensagem ainda.</td></tr>'
            : list.map(m => `
                <tr style="cursor:pointer" onclick="showView('messages')">
                    <td data-label="Nome"><span class="small fw-semibold">${escHtml(m.name)}</span></td>
                    <td data-label="Status"><span class="badge rounded-pill ${m.replied ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">${m.replied ? 'Respondida' : 'Pendente'}</span></td>
                </tr>`).join('');
    }
}

/* ---- Sales Chart ---- */
async function loadSalesChart(days, preloaded) {
    document.getElementById('chart-7d')?.classList.toggle('active',  days === 7);
    document.getElementById('chart-30d')?.classList.toggle('active', days === 30);

    /* Reaproveita dados do dashboard quando disponíveis (evita fetch redundante) */
    let all = preloaded;
    if (!all) {
        const res = await api('GET', '/orders?limit=500');
        if (!res?.ok) return;
        all = res.data.orders ?? [];
    }

    const labels = [], data = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        const s = new Date(d); s.setHours(0,0,0,0);
        const e = new Date(d); e.setHours(23,59,59,999);
        data.push(all.filter(o => o.status !== 'cancelled' && new Date(o.createdAt) >= s && new Date(o.createdAt) <= e)
                     .reduce((acc, o) => acc + o.total, 0));
    }

    const canvas = document.getElementById('sales-chart');
    if (!canvas) return;
    if (salesChartInst) { salesChartInst.destroy(); salesChartInst = null; }
    salesChartInst = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets: [{
            label: 'Faturamento', data,
            borderColor: '#2d9e5f', backgroundColor: 'rgba(45,158,95,.08)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#2d9e5f', pointRadius: 3,
        }]},
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + Number(v).toFixed(0), font: { size: 11 } }, grid: { color: chartGrid() } },
                x: { ticks: { font: { size: 11 } }, grid: { display: false } },
            },
        },
    });
}

/* ---- Products ---- */
async function loadProducts() {
    tableLoading('products-tbody', 7);
    const res = await api('GET', '/products?limit=100');
    if (!res?.ok) return;
    products = res.data.items ?? [];
    renderProducts();
}

function renderProducts() {
    const q    = (document.getElementById('product-search')?.value ?? '').toLowerCase().trim();
    const cat  = document.getElementById('product-cat')?.value ?? '';
    let   list = products;
    if (q)   list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    if (cat) list = list.filter(p => p.category === cat);

    /* Alerta de estoque */
    const zero = products.filter(p => p.active && p.stock === 0);
    const low  = products.filter(p => p.active && p.stock > 0 && p.stock <= 5);
    const banner = document.getElementById('stock-banner');
    const btext  = document.getElementById('stock-banner-text');
    if (banner && btext) {
        if (zero.length || low.length) {
            const parts = [];
            if (zero.length) parts.push(`${zero.length} produto${zero.length > 1 ? 's' : ''} sem estoque`);
            if (low.length)  parts.push(`${low.length} com estoque baixo (≤ 5)`);
            btext.textContent = parts.join(' e ') + '. Verifique seus produtos.';
            banner.classList.remove('d-none');
        } else { banner.classList.add('d-none'); }
    }

    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-inbox d-block fs-2 mb-2 opacity-25"></i>Nenhum produto encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr>
            <td data-label="" onclick="event.stopPropagation()">
                <input type="checkbox" class="form-check-input product-checkbox" data-id="${p._id}"
                       ${selectedProducts.has(p._id) ? 'checked' : ''}
                       onchange="toggleProductSelect('${p._id}', this.checked)">
            </td>
            <td data-label=""><img src="${escAttr(p.img)}" class="p-thumb" alt="" loading="lazy" onerror="this.style.opacity='0'"></td>
            <td data-label="Nome">
                <div class="fw-semibold">${escHtml(p.name)}</div>
                ${p.badge ? `<span class="badge bg-secondary-subtle text-secondary rounded-pill mt-1" style="font-size:.65rem">${escHtml(p.badge)}</span>` : ''}
            </td>
            <td data-label="Categoria"><span class="text-muted small">${escHtml(p.category)}</span></td>
            <td data-label="Preço">
                <span class="fw-semibold">${fmtMoney(p.price)}</span>
                ${p.originalPrice ? `<br><span class="text-decoration-line-through text-muted small">${fmtMoney(p.originalPrice)}</span>` : ''}
            </td>
            <td data-label="Estoque">
                <span class="stock-edit ${p.stock === 0 ? 'fw-bold text-danger' : p.stock <= 5 ? 'fw-semibold text-warning' : 'text-muted'}"
                      title="Clique para editar" onclick="editStockInline('${p._id}', ${p.stock}, this)">
                    ${p.stock} un.
                </span>
            </td>
            <td data-label="Status">
                <span class="badge rounded-pill ${p.active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                    ${p.active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td data-label="Ações">
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-secondary" title="Editar" onclick="openProductModal('${p._id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm ${p.active ? 'btn-outline-danger' : 'btn-outline-success'}" title="${p.active ? 'Desativar' : 'Ativar'}" onclick="toggleActive('${p._id}',${p.active})">
                        <i class="bi bi-${p.active ? 'eye-slash' : 'eye'}"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

function openProductModal(id) {
    editingProductId = id;
    const errEl  = document.getElementById('product-errors');
    const preview = document.getElementById('img-preview');
    if (errEl)   { errEl.classList.add('d-none'); errEl.querySelector('ul').innerHTML = ''; }
    if (preview) preview.style.display = 'none';
    setText('product-modal-title', id ? 'Editar produto' : 'Novo produto');

    if (id) {
        const p = products.find(x => x._id === id);
        if (!p) return;
        setVal('p-name', p.name); setVal('p-price', p.price);
        setVal('p-original-price', p.originalPrice ?? '');
        setVal('p-category', p.category); setVal('p-badge', p.badge ?? '');
        setVal('p-rating', p.rating); setVal('p-reviews', p.reviews);
        setVal('p-stock', p.stock); setVal('p-img', p.img); setVal('p-desc', p.desc);
        const act = document.getElementById('p-active'); if (act) act.checked = p.active;
        setText('desc-count', p.desc.length);
        if (preview && p.img) { preview.src = p.img; preview.style.display = 'block'; }
    } else {
        ['p-name','p-price','p-original-price','p-badge','p-img','p-desc'].forEach(id => setVal(id, ''));
        setVal('p-category', ''); setVal('p-rating', ''); setVal('p-reviews', '0'); setVal('p-stock', '0');
        const act = document.getElementById('p-active'); if (act) act.checked = true;
        setText('desc-count', '0');
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal')).show();
}

function validateProductForm() {
    const name  = (document.getElementById('p-name')?.value ?? '').trim();
    const price = parseFloat(document.getElementById('p-price')?.value ?? '');
    const orig  = parseFloat(document.getElementById('p-original-price')?.value ?? '') || null;
    const cat   = document.getElementById('p-category')?.value ?? '';
    const rat   = parseFloat(document.getElementById('p-rating')?.value ?? '');
    const img   = (document.getElementById('p-img')?.value ?? '').trim();
    const desc  = (document.getElementById('p-desc')?.value ?? '').trim();
    const errs  = [];
    if (!name || name.length < 3)         errs.push('Nome deve ter pelo menos 3 caracteres.');
    if (!price || price <= 0)              errs.push('Preço deve ser maior que zero.');
    if (orig !== null && orig <= price)    errs.push('Preço original deve ser maior que o preço atual.');
    if (!cat)                              errs.push('Selecione uma categoria.');
    if (isNaN(rat) || rat < 0 || rat > 5) errs.push('Avaliação deve ser entre 0 e 5.');
    if (!img)                              errs.push('URL da imagem é obrigatória.');
    if (!desc || desc.length < 10)        errs.push('Descrição deve ter pelo menos 10 caracteres.');
    if (desc.length > 500)                errs.push('Descrição não pode exceder 500 caracteres.');
    return errs;
}

async function saveProduct() {
    const errContainer = document.getElementById('product-errors');
    const errList      = errContainer?.querySelector('ul');
    if (errContainer) errContainer.classList.add('d-none');

    const clientErrs = validateProductForm();
    if (clientErrs.length) {
        if (errList) errList.innerHTML = clientErrs.map(e => `<li>${escHtml(e)}</li>`).join('');
        if (errContainer) errContainer.classList.remove('d-none');
        return;
    }

    const origPrice = parseFloat(document.getElementById('p-original-price')?.value ?? '') || null;
    const body = {
        name:          (document.getElementById('p-name')?.value ?? '').trim(),
        price:         parseFloat(document.getElementById('p-price')?.value ?? ''),
        originalPrice: origPrice,
        category:      document.getElementById('p-category')?.value ?? '',
        badge:         (document.getElementById('p-badge')?.value ?? '').trim() || null,
        rating:        parseFloat(document.getElementById('p-rating')?.value ?? ''),
        reviews:       parseInt(document.getElementById('p-reviews')?.value ?? '0') || 0,
        stock:         parseInt(document.getElementById('p-stock')?.value ?? '0')   || 0,
        img:           (document.getElementById('p-img')?.value ?? '').trim(),
        desc:          (document.getElementById('p-desc')?.value ?? '').trim(),
        active:        document.getElementById('p-active')?.checked ?? true,
    };

    const btn = document.getElementById('btn-save');
    setBtnLoading(btn, true, 'Salvando...');
    const res = await api(
        editingProductId ? 'PUT'  : 'POST',
        editingProductId ? '/products/' + editingProductId : '/products',
        body
    );
    setBtnLoading(btn, false, '<i class="bi bi-check-lg me-1"></i>Salvar produto');

    if (!res?.ok) {
        const msg = res?.data?.error ?? res?.data?.details ?? 'Erro ao salvar produto.';
        if (errList) errList.innerHTML = `<li>${escHtml(msg)}</li>`;
        if (errContainer) errContainer.classList.remove('d-none');
        return;
    }

    bootstrap.Modal.getInstance(document.getElementById('productModal'))?.hide();
    toast(editingProductId ? 'Produto atualizado!' : 'Produto criado!', 'success');
    loadProducts(); loadStats();
}

async function toggleActive(id, isActive) {
    const ok = await showConfirm(
        isActive ? 'Desativar este produto?' : 'Ativar este produto?',
        isActive ? 'Ele ficará invisível no site.' : 'Ele voltará a aparecer no site.'
    );
    if (!ok) return;
    const res = await api('PUT', '/products/' + id, { active: !isActive });
    if (res?.ok) { toast(isActive ? 'Produto desativado.' : 'Produto ativado!', 'success'); loadProducts(); loadStats(); }
    else toast(res?.data?.error ?? 'Erro ao atualizar.', 'danger');
}

function editStockInline(id, currentStock, spanEl) {
    const input = document.createElement('input');
    input.type = 'number'; input.value = currentStock; input.min = '0';
    input.className = 'stock-input form-control form-control-sm d-inline-block';
    spanEl.replaceWith(input); input.focus(); input.select();

    /* Re-renderiza a tabela correta conforme a tela atual */
    function refresh() {
        if (currentView === 'estoque') loadEstoque();
        else renderProducts();
    }

    async function save() {
        const newStock = Math.max(0, parseInt(input.value) || 0);
        if (newStock !== currentStock) {
            const res = await api('PUT', '/products/' + id, { stock: newStock });
            if (res?.ok) {
                /* Atualiza ambos os caches para refletir em Produtos e Estoque */
                const p  = products.find(x => x._id === id);       if (p)  p.stock  = newStock;
                const sp = stockProducts.find(x => x._id === id);  if (sp) sp.stock = newStock;
                toast('Estoque atualizado!', 'success');
                refresh();
                return;
            }
        }
        refresh();
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  input.blur();
        if (e.key === 'Escape') refresh();
    });
}

/* ---- Bulk actions ---- */
function toggleSelectAll() {
    const allCbs = document.querySelectorAll('.product-checkbox');
    const sa     = document.getElementById('select-all');
    const check  = sa?.checked ?? false;
    selectedProducts.clear();
    allCbs.forEach(cb => {
        cb.checked = check;
        if (check) selectedProducts.add(cb.dataset.id);
    });
    updateBulkBar();
}

function toggleProductSelect(id, checked) {
    if (checked) selectedProducts.add(id); else selectedProducts.delete(id);
    updateBulkBar();
    const allCbs = document.querySelectorAll('.product-checkbox');
    const sa     = document.getElementById('select-all');
    if (sa) {
        sa.checked       = selectedProducts.size === allCbs.length && allCbs.length > 0;
        sa.indeterminate = selectedProducts.size > 0 && selectedProducts.size < allCbs.length;
    }
}

function updateBulkBar() {
    const bar   = document.getElementById('bulk-bar');
    const count = document.getElementById('bulk-count');
    if (!bar) return;
    const n = selectedProducts.size;
    bar.classList.toggle('d-none', n === 0);
    if (count && n > 0) count.textContent = `${n} produto${n > 1 ? 's' : ''} selecionado${n > 1 ? 's' : ''}`;
}

async function bulkAction(action) {
    if (action === 'clear') {
        selectedProducts.clear(); updateBulkBar(); renderProducts(); return;
    }
    if (!selectedProducts.size) return;

    const ids  = Array.from(selectedProducts);
    const verb = action === 'activate' ? 'ativar' : 'desativar';
    const ok   = await showConfirm(
        `${verb.charAt(0).toUpperCase() + verb.slice(1)} ${ids.length} produto${ids.length > 1 ? 's' : ''}?`,
        'A ação será aplicada a todos os produtos selecionados.'
    );
    if (!ok) return;

    const active  = action === 'activate';
    const results = await Promise.all(ids.map(id => api('PUT', '/products/' + id, { active })));
    const success = results.filter(r => r?.ok).length;

    selectedProducts.clear();
    toast(`${success} produto${success > 1 ? 's' : ''} ${active ? 'ativado' : 'desativado'}${success > 1 ? 's' : ''}!`, 'success');
    loadProducts(); loadStats();
}

/* ---- Export CSV (pedidos) ---- */
function exportOrdersCSV() {
    const statusFilter  = document.getElementById('order-filter')?.value ?? '';
    let   list          = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
    list = applyDateFilter(list);

    if (!list.length) { toast('Nenhum pedido para exportar com os filtros atuais.', 'warning'); return; }

    const statusLabels = { pending:'Pendente', confirmed:'Confirmado', preparing:'Preparando', ready:'Pronto', delivered:'Entregue', cancelled:'Cancelado' };

    const headers = ['Nº Pedido','Data/Hora','Status','Tipo de Entrega','Endereço','Forma Pgto.','Detalhe Pgto.','Produtos','Qtd Total','Subtotais','Total (R$)','Observações'];

    const rows = list.map(o => {
        const pd  = o.paymentDetails ?? {};
        let payDt = '';
        if (o.payment === 'Cartão' && pd.cardType)    payDt = pd.cardType === 'credito' ? 'Crédito' : 'Débito';
        if (o.payment === 'Dinheiro' && pd.cashAmount) {
            const chg = Math.max(0, pd.cashAmount - o.total);
            payDt = `Tem R$${pd.cashAmount.toFixed(2).replace('.',',')}${chg > 0 ? ` | Troco R$${chg.toFixed(2).replace('.',',')}` : ' | Sem troco'}`;
        }
        if (o.payment === 'Pix') payDt = 'Verificar recebimento';

        return [
            '#' + o._id.slice(-6).toUpperCase(),
            fmtDate(o.createdAt),
            statusLabels[o.status] ?? o.status,
            o.deliveryType === 'delivery' ? 'Entrega a domicílio' : 'Retirada na loja',
            o.address ?? '',
            o.payment,
            payDt,
            o.items.map(i => `${i.qty}x ${i.name}`).join(' | '),
            o.items.reduce((s, i) => s + i.qty, 0),
            o.items.map(i => `${i.qty}×R$${i.price.toFixed(2).replace('.',',')}`).join(' | '),
            o.total.toFixed(2).replace('.', ','),
            o.notes ?? '',
        ];
    });

    const totalFat  = list.reduce((s, o) => s + o.total, 0);
    const ticket    = list.length ? totalFat / list.length : 0;
    const entregues = list.filter(o => o.status === 'delivered').length;
    const cancelados = list.filter(o => o.status === 'cancelled').length;

    const summary = [
        [],
        ['RESUMO DO PERÍODO','','','','','','','','','','',''],
        [`Total de pedidos: ${list.length}`,`Entregues: ${entregues}`,`Cancelados: ${cancelados}`,'','','','','','','',`Faturado: R$${totalFat.toFixed(2).replace('.',',')}`, ''],
        [`Ticket médio: R$${ticket.toFixed(2).replace('.',',')}`, '', '','','','','','','','','',''],
    ];

    /* UTF-8 BOM garante que o Excel abre acentos corretamente */
    const csv = '﻿' + [headers, ...rows, ...summary]
        .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const today    = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
    const sfPeriod = currentDateFilter !== 'all' ? `_${currentDateFilter}` : '';
    const sfStatus = statusFilter ? `_${statusFilter}` : '';
    const filename = `pedidos_helvinho_${today}${sfPeriod}${sfStatus}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    toast(`✅ ${list.length} pedidos exportados!`, 'success');
}

function previewImg() {
    const url = document.getElementById('p-img')?.value ?? '';
    const el  = document.getElementById('img-preview');
    if (!el) return;
    if (url) { el.src = url; el.style.display = 'block'; } else el.style.display = 'none';
}

function updateDescCount() {
    const len = document.getElementById('p-desc')?.value.length ?? 0;
    const el  = document.getElementById('desc-count');
    if (el) { el.textContent = len; el.className = len > 500 ? 'text-danger fw-bold' : ''; }
}

/* ---- Date filter ---- */
function setDateFilter(period) {
    currentDateFilter = period;
    ['all','today','week','month'].forEach(p => {
        document.getElementById('df-' + p)?.classList.toggle('active', p === period);
    });
    renderOrders();
}

function applyDateFilter(list) {
    if (currentDateFilter === 'all') return list;
    const start = new Date();
    if (currentDateFilter === 'today') start.setHours(0,0,0,0);
    if (currentDateFilter === 'week')  start.setDate(start.getDate() - 7);
    if (currentDateFilter === 'month') start.setDate(start.getDate() - 30);
    return list.filter(o => new Date(o.createdAt) >= start);
}

/* ---- Orders ---- */
async function loadOrders() {
    tableLoading('orders-tbody', 8);
    const res = await api('GET', '/orders?limit=100');
    if (!res?.ok) return;
    orders = res.data.orders ?? [];
    renderOrders();
}

function renderOrders() {
    const filter = document.getElementById('order-filter')?.value ?? '';
    let   list   = filter ? orders.filter(o => o.status === filter) : orders;
    list = applyDateFilter(list);

    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5"><i class="bi bi-inbox d-block fs-2 mb-2 opacity-25"></i>Nenhum pedido encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(o => `
        <tr style="cursor:pointer" onclick="openOrderDetail('${o._id}')">
            <td data-label="Pedido"><span class="font-monospace fw-semibold small">#${o._id.slice(-6).toUpperCase()}</span></td>
            <td data-label="Data"><span class="text-muted small">${fmtDate(o.createdAt)}</span></td>
            <td data-label="Itens"><span class="small">${o.items.length} item${o.items.length !== 1 ? 's' : ''}</span></td>
            <td data-label="Total"><strong>${fmtMoney(o.total)}</strong></td>
            <td data-label="Tipo">
                <span class="badge rounded-pill ${o.deliveryType === 'delivery' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'}">
                    <i class="bi bi-${o.deliveryType === 'delivery' ? 'truck' : 'bag'} me-1"></i>${o.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                </span>
            </td>
            <td data-label="Pagamento"><span class="small">${escHtml(o.payment)}${paymentBadge(o)}</span></td>
            <td data-label="Status">${statusBadge(o.status)}</td>
            <td data-label="Ações" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-secondary" onclick="openOrderModal('${o._id}','${o.status}')">
                    <i class="bi bi-pencil"></i>
                </button>
            </td>
        </tr>`).join('');
}

function openOrderDetail(id) {
    const o = orders.find(x => x._id === id);
    if (!o) return;

    setText('order-detail-title', `Pedido #${o._id.slice(-6).toUpperCase()}`);

    const btnChange = document.getElementById('btn-change-status');
    if (btnChange) btnChange.onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById('orderDetailModal'))?.hide();
        setTimeout(() => openOrderModal(o._id, o.status), 320);
    };

    const btnWA    = document.getElementById('btn-whatsapp-order');
    const btnPrint = document.getElementById('btn-print-order');
    if (btnWA)    btnWA.onclick    = () => openOrderWhatsApp(o);
    if (btnPrint) btnPrint.onclick = () => printOrder(o);

    const body = document.getElementById('order-detail-body');
    if (!body) return;

    const items = o.items.map(i => `
        <div class="d-flex justify-content-between py-2 border-bottom">
            <div><span class="small fw-semibold">${escHtml(i.name)}</span><span class="text-muted small"> × ${i.qty}</span></div>
            <span class="small fw-semibold">${fmtMoney(i.price * i.qty)}</span>
        </div>`).join('');

    const history = o.statusHistory ?? [];
    const timeline = history.length ? `
        <div class="mt-3">
            <p class="small fw-semibold mb-2 text-muted">Histórico</p>
            <div class="timeline">
                ${history.map((h, i) => `
                    <div class="tl-item">
                        <div class="tl-dot ${i < history.length - 1 ? 'old' : ''}"></div>
                        ${statusBadge(h.status)}
                        <span class="text-muted small ms-2">${fmtDate(h.at)}</span>
                    </div>`).join('')}
            </div>
        </div>` : '';

    const pd = o.paymentDetails;
    let paymentRow = '';
    if (pd) {
        if (o.payment === 'Cartão' && pd.cardType)
            paymentRow = `<div class="col-12"><strong>Cartão:</strong> ${pd.cardType === 'credito' ? 'Crédito' : 'Débito'} — entregador deve levar maquininha</div>`;
        else if (o.payment === 'Dinheiro' && pd.cashAmount) {
            const chg = Math.max(0, pd.cashAmount - o.total);
            paymentRow = `<div class="col-12"><strong>Dinheiro:</strong> cliente tem ${fmtMoney(pd.cashAmount)} — troco ${chg > 0 ? fmtMoney(chg) : 'não necessário'}</div>`;
        } else if (o.payment === 'Pix')
            paymentRow = `<div class="col-12 text-warning-emphasis fw-semibold small"><i class="bi bi-qr-code me-1"></i>Verificar recebimento do PIX antes de entregar</div>`;
    }

    body.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="text-muted small">${fmtDate(o.createdAt)}</span>
            ${statusBadge(o.status)}
        </div>
        ${items}
        <div class="d-flex justify-content-between fw-bold pt-3 mb-3 border-top">
            <span>Total</span><span>${fmtMoney(o.total)}</span>
        </div>
        <div class="row g-2 text-muted small mb-1">
            <div class="col-6"><strong>Entrega:</strong> ${o.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}</div>
            <div class="col-6"><strong>Pagamento:</strong> ${escHtml(o.payment)}</div>
            ${o.address ? `<div class="col-12"><strong>Endereço:</strong> ${escHtml(o.address)}</div>` : ''}
            ${paymentRow}
            ${o.notes ? `<div class="col-12"><strong>Obs:</strong> ${escHtml(o.notes)}</div>` : ''}
        </div>
        ${timeline}`;

    bootstrap.Modal.getOrCreateInstance(document.getElementById('orderDetailModal')).show();
}

function openOrderModal(id, currentStatus) {
    setVal('order-edit-id', id);
    const sel = document.getElementById('order-status-select');
    if (sel) sel.value = currentStatus;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('orderModal')).show();
}

async function saveOrderStatus() {
    const id     = document.getElementById('order-edit-id')?.value ?? '';
    const status = document.getElementById('order-status-select')?.value ?? '';
    if (!id || !status) return;
    const res = await api('PATCH', '/orders/' + id + '/status', { status });
    if (res?.ok) {
        bootstrap.Modal.getInstance(document.getElementById('orderModal'))?.hide();
        toast('Status atualizado!', 'success');
        loadOrders(); loadStats();
    } else toast(res?.data?.error ?? 'Erro.', 'danger');
}

function printOrder(o) {
    const slabels = { pending:'Pendente', confirmed:'Confirmado', preparing:'Em preparo', ready:'Pronto', delivered:'Entregue', cancelled:'Cancelado' };
    const lines   = o.items.map(i => `
        <tr>
            <td>${escHtml(i.qty + 'x ')} <strong>${escHtml(i.name)}</strong></td>
            <td style="text-align:right;white-space:nowrap">${fmtMoney(i.price * i.qty)}</td>
        </tr>`).join('');
    const pd  = o.paymentDetails ?? {};
    let payDt = '';
    if (o.payment === 'Cartão' && pd.cardType)    payDt = ` (${pd.cardType === 'credito' ? 'Crédito' : 'Débito'})`;
    if (o.payment === 'Dinheiro' && pd.cashAmount) { const chg = Math.max(0, pd.cashAmount - o.total); payDt = ` — Tem ${fmtMoney(pd.cashAmount)}${chg > 0 ? ` | Troco ${fmtMoney(chg)}` : ''}`; }

    const win = window.open('', '_blank', 'width=420,height=680');
    if (!win) { toast('Popup bloqueado. Permita popups para imprimir.', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
        <meta charset="UTF-8"><title>Pedido #${o._id.slice(-6).toUpperCase()}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Courier New',monospace;font-size:13px;padding:20px;max-width:360px;color:#000}
            h1{text-align:center;font-size:15px;margin-bottom:2px}
            .sub{text-align:center;font-size:11px;color:#555;margin-bottom:10px}
            hr{border:none;border-top:1px dashed #000;margin:10px 0}
            table{width:100%;border-collapse:collapse}
            td{padding:3px 0;vertical-align:top}
            .info-label{font-size:10px;text-transform:uppercase;color:#666;font-weight:bold}
            .total td{font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:8px}
            .btn-print{display:block;width:100%;margin-top:16px;padding:10px;background:#2d9e5f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:sans-serif}
            @media print{.btn-print{display:none}}
        </style></head><body>
        <h1>🐾 Helvinho Rações</h1>
        <div class="sub">Pedido gerado em ${new Date().toLocaleString('pt-BR')}</div>
        <hr>
        <p><span class="info-label">Pedido:</span> <strong>#${o._id.slice(-6).toUpperCase()}</strong></p>
        <p><span class="info-label">Data:</span> ${fmtDate(o.createdAt)}</p>
        <p><span class="info-label">Status:</span> ${slabels[o.status] ?? o.status}</p>
        <hr>
        <table>
            ${lines}
            <tr class="total"><td>TOTAL</td><td style="text-align:right">${fmtMoney(o.total)}</td></tr>
        </table>
        <hr>
        <p><span class="info-label">Entrega:</span> ${o.deliveryType === 'delivery' ? 'Entrega a domicílio' : 'Retirada na loja'}</p>
        ${o.address ? `<p><span class="info-label">Endereço:</span> ${escHtml(o.address)}</p>` : ''}
        <p><span class="info-label">Pagamento:</span> ${escHtml(o.payment)}${escHtml(payDt)}</p>
        ${o.notes ? `<hr><p><span class="info-label">Obs:</span> ${escHtml(o.notes)}</p>` : ''}
        <hr>
        <p style="text-align:center;font-size:11px;color:#aaa">Obrigado pela preferência! 🐾</p>
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
    </body></html>`);
    win.document.close();
}

function openOrderWhatsApp(o) {
    const labels = { pending:'Recebido', confirmed:'Confirmado', preparing:'Em preparo', ready:'Pronto', delivered:'Entregue', cancelled:'Cancelado' };
    const lines  = o.items.map(i => `▪ ${i.qty}x ${i.name} — ${fmtMoney(i.price * i.qty)}`).join('\n');
    const msg    =
        `🐾 *Helvinho Rações*\n\nPedido *#${o._id.slice(-6).toUpperCase()}* — ${labels[o.status] ?? o.status}\n\n` +
        `*Itens:*\n${lines}\n\n*Total: ${fmtMoney(o.total)}*\n━━━━━━━━━━━━━\n` +
        (o.deliveryType === 'delivery' ? `🛵 Entrega: ${o.address ?? ''}` : `🛍️ Retirada na loja`) +
        `\n💳 ${o.payment}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

/* ---- Messages ---- */
async function loadMessages() {
    tableLoading('messages-tbody', 6);
    const res = await api('GET', '/contact?limit=100');
    if (!res?.ok) return;
    messages = res.data.messages ?? [];
    renderMessages();
}

function renderMessages() {
    const unreadOnly = document.getElementById('unread-only')?.checked ?? false;
    const list       = unreadOnly ? messages.filter(m => !m.replied) : messages;
    const tbody      = document.getElementById('messages-tbody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-inbox d-block fs-2 mb-2 opacity-25"></i>Nenhuma mensagem.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(m => `
        <tr>
            <td data-label="Data"><span class="text-muted small">${fmtDate(m.createdAt)}</span></td>
            <td data-label="Nome"><span class="fw-semibold small">${escHtml(m.name)}</span></td>
            <td data-label="E-mail"><a href="mailto:${escAttr(m.email)}" class="small" onclick="event.stopPropagation()">${escHtml(m.email)}</a></td>
            <td data-label="Mensagem"><span class="text-muted small">${escHtml(m.message.slice(0,65))}${m.message.length > 65 ? '…' : ''}</span></td>
            <td data-label="Status">
                <span class="badge rounded-pill ${m.replied ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">
                    ${m.replied ? 'Respondida' : 'Pendente'}
                </span>
            </td>
            <td data-label="Ações">
                <button class="btn btn-sm btn-outline-secondary" onclick="openMessage('${m._id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>`).join('');
}

function openMessage(id) {
    viewingMessageId = id;
    const m    = messages.find(x => x._id === id);
    if (!m) return;
    const body = document.getElementById('message-detail');
    const btn  = document.getElementById('btn-replied');
    if (body) {
        body.innerHTML = `
            <div class="mb-1 small"><strong>De:</strong> ${escHtml(m.name)}</div>
            <div class="mb-1 small"><strong>E-mail:</strong> <a href="mailto:${escAttr(m.email)}">${escHtml(m.email)}</a></div>
            <div class="mb-3 text-muted small">${fmtDate(m.createdAt)}</div>
            <div class="bg-light rounded-3 p-3 small" style="white-space:pre-wrap;line-height:1.6">${escHtml(m.message)}</div>`;
    }
    if (btn) btn.classList.toggle('d-none', !!m.replied);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('messageModal')).show();
}

async function markReplied() {
    if (!viewingMessageId) return;
    const res = await api('PATCH', '/contact/' + viewingMessageId + '/replied', {});
    if (res?.ok) {
        bootstrap.Modal.getInstance(document.getElementById('messageModal'))?.hide();
        toast('Marcada como respondida!', 'success');
        loadMessages(); loadStats();
    } else toast(res?.data?.error ?? 'Erro.', 'danger');
}

/* ---- Newsletter ---- */
async function loadNewsletter() {
    tableLoading('newsletter-tbody', 3);
    const res = await api('GET', '/contact/newsletter?limit=500');
    if (!res?.ok) return;
    newsletter = res.data.subscribers ?? [];
    renderNewsletter();
}

function renderNewsletter() {
    const activeOnly = document.getElementById('newsletter-active-only')?.checked ?? false;
    const list       = activeOnly ? newsletter.filter(n => n.active) : newsletter;
    const tbody      = document.getElementById('newsletter-tbody');
    const countEl    = document.getElementById('newsletter-count');

    if (countEl) {
        const ativos   = newsletter.filter(n => n.active).length;
        const inativos = newsletter.filter(n => !n.active).length;
        countEl.textContent = `${ativos} ativo${ativos !== 1 ? 's' : ''} · ${inativos} inativo${inativos !== 1 ? 's' : ''}`;
    }

    if (!tbody) return;
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-5"><i class="bi bi-envelope-heart d-block fs-2 mb-2 opacity-25"></i>Nenhum assinante.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(n => `
        <tr>
            <td data-label="E-mail"><span class="fw-semibold small">${escHtml(n.email)}</span></td>
            <td data-label="Cadastrado em"><span class="text-muted small">${fmtDate(n.subscribedAt)}</span></td>
            <td data-label="Status">
                <span class="badge rounded-pill ${n.active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                    ${n.active ? 'Ativo' : 'Inativo'}
                </span>
            </td>
        </tr>`).join('');
}

function exportNewsletterCSV() {
    if (!newsletter.length) { toast('Nenhum assinante para exportar.', 'warning'); return; }

    const activeOnly = document.getElementById('newsletter-active-only')?.checked ?? false;
    const list       = activeOnly ? newsletter.filter(n => n.active) : newsletter;

    const headers = ['E-mail', 'Data de Cadastro', 'Status'];
    const rows    = list.map(n => [n.email, fmtDate(n.subscribedAt), n.active ? 'Ativo' : 'Inativo']);

    const ativos   = list.filter(n => n.active).length;
    const inativos = list.filter(n => !n.active).length;
    const summary  = [[], [`Total: ${list.length}`, `Ativos: ${ativos}`, `Inativos: ${inativos}`]];

    const csv = '﻿' + [headers, ...rows, ...summary]
        .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
        .join('\r\n');

    const today    = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
    const filename = `newsletter_helvinho_${today}${activeOnly ? '_ativos' : ''}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);

    toast(`✅ ${list.length} e-mails exportados!`, 'success');
}

/* ---- Settings ---- */
async function loadSettings() {
    const res = await api('GET', '/settings');
    if (!res?.ok) return;
    const s = res.data;
    setVal('s-name',     s.storeName    ?? '');
    setVal('s-address',  s.storeAddress ?? '');
    setVal('s-city',     s.storeCity    ?? '');
    setVal('s-hours',    s.storeHours   ?? '');
    setVal('s-pix-key',  s.pixKey       ?? '');
    setVal('s-pix-type', s.pixKeyType   ?? 'aleatoria');
    setVal('s-whatsapp', s.whatsapp     ?? '');
    setVal('s-imgbb',    s.imgbbKey     ?? '');
    /* Atualiza badge de notificações com base na permissão atual */
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.toggle('d-none', Notification.permission !== 'granted');
}

async function saveSettings() {
    const body = {
        storeName:    (document.getElementById('s-name')?.value     ?? '').trim(),
        storeAddress: (document.getElementById('s-address')?.value  ?? '').trim(),
        storeCity:    (document.getElementById('s-city')?.value     ?? '').trim(),
        storeHours:   (document.getElementById('s-hours')?.value    ?? '').trim(),
        pixKey:       (document.getElementById('s-pix-key')?.value  ?? '').trim(),
        pixKeyType:   document.getElementById('s-pix-type')?.value  ?? 'aleatoria',
        whatsapp:     (document.getElementById('s-whatsapp')?.value ?? '').replace(/\D/g, ''),
        imgbbKey:     (document.getElementById('s-imgbb')?.value    ?? '').trim(),
    };

    const btn = document.getElementById('btn-save-settings');
    setBtnLoading(btn, true, 'Salvando...');
    const res = await api('PUT', '/settings', body);
    setBtnLoading(btn, false, '<i class="bi bi-check-lg me-1"></i>Salvar configurações');

    if (res?.ok) toast('Configurações salvas!', 'success');
    else toast(res?.data?.error ?? 'Erro ao salvar.', 'danger');
}

/* ======================================================
   FINANCEIRO
====================================================== */
let finEvolutionChart = null;
let finPaymentChart   = null;
let finCatChart       = null;
let finDeliveryChart  = null;
let finOrders         = [];
let finPeriod         = '30d';

async function loadFinanceiro() {
    const res = await api('GET', '/orders?limit=2000');
    if (!res?.ok) return;
    finOrders = res.data.orders ?? [];
    if (!products.length) {
        const pRes = await api('GET', '/products?limit=200');
        if (pRes?.ok) products = pRes.data.items ?? [];
    }
    renderFinanceiro();
}

/* Resolve o intervalo [start,end] e o período anterior equivalente para comparação */
function finPeriodRange(period) {
    const now = new Date();
    let start, end = new Date(now), prevStart, prevEnd, label;

    if (period === 'today') {
        start = new Date(now); start.setHours(0,0,0,0);
        prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
        prevEnd   = new Date(start); prevEnd.setMilliseconds(-1);
        label = 'Hoje';
    } else if (period === '7d') {
        start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
        prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
        prevEnd   = new Date(start); prevEnd.setMilliseconds(-1);
        label = 'Últimos 7 dias';
    } else if (period === '30d') {
        start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0,0,0,0);
        prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 30);
        prevEnd   = new Date(start); prevEnd.setMilliseconds(-1);
        label = 'Últimos 30 dias';
    } else if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd   = new Date(start); prevEnd.setMilliseconds(-1);
        label = 'Este mês — ' + start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else if (period === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd   = new Date(start); prevEnd.setMilliseconds(-1);
        label = 'Este ano — ' + now.getFullYear();
    } else if (period === 'custom') {
        const s = document.getElementById('fin-date-start')?.value;
        const e = document.getElementById('fin-date-end')?.value;
        start = s ? new Date(s + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
        end   = e ? new Date(e + 'T23:59:59') : new Date(now);
        const dur = end - start;
        prevEnd   = new Date(start); prevEnd.setMilliseconds(-1);
        prevStart = new Date(start - dur);
        label = `${start.toLocaleDateString('pt-BR')} até ${end.toLocaleDateString('pt-BR')}`;
    } else { /* all */
        start = new Date(2000, 0, 1);
        prevStart = null; prevEnd = null;
        label = 'Todo o período';
    }
    return { start, end, prevStart, prevEnd, label };
}

function setFinPeriod(period) {
    finPeriod = period;
    document.querySelectorAll('#fin-period-group button').forEach(b => {
        b.classList.toggle('active', b.dataset.period === period);
    });
    renderFinanceiro();
}

function renderFinanceiro() {
    const { start, end, prevStart, prevEnd, label } = finPeriodRange(finPeriod);
    setText('fin-period-label', `Período: ${label}`);

    const inRange = (o, s, e) => { const d = new Date(o.createdAt); return d >= s && d <= e; };

    /* Pedidos do período (todos e válidos) */
    const periodAll = finOrders.filter(o => inRange(o, start, end));
    const valid     = periodAll.filter(o => o.status !== 'cancelled');
    const cancelled = periodAll.filter(o => o.status === 'cancelled');
    const realized  = periodAll.filter(o => o.status === 'delivered');
    const pending   = periodAll.filter(o => ['pending','confirmed','preparing','ready'].includes(o.status));

    const revenue   = valid.reduce((s, o) => s + o.total, 0);
    const count     = valid.length;
    const ticket    = count ? revenue / count : 0;
    const itemsQty  = valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);

    /* Período anterior para comparação */
    let prevRevenue = null, prevCount = null, prevTicket = null;
    if (prevStart && prevEnd) {
        const prevValid = finOrders.filter(o => o.status !== 'cancelled' && inRange(o, prevStart, prevEnd));
        prevRevenue = prevValid.reduce((s, o) => s + o.total, 0);
        prevCount   = prevValid.length;
        prevTicket  = prevCount ? prevRevenue / prevCount : 0;
    }

    setText('fin-revenue', fmtMoney(revenue));
    setText('fin-count',   count);
    setText('fin-ticket',  fmtMoney(ticket));
    setText('fin-items',   itemsQty);
    setText('fin-items-sub', `${count} pedido${count !== 1 ? 's' : ''} válido${count !== 1 ? 's' : ''}`);

    applyChange('fin-revenue-change', revenue, prevRevenue, true);
    applyChange('fin-count-change',   count,   prevCount,   false);
    applyChange('fin-ticket-change',  ticket,  prevTicket,  true);

    /* Receita realizada / a receber / perdida */
    const realizedRev = realized.reduce((s, o) => s + o.total, 0);
    const pendingRev  = pending.reduce((s, o) => s + o.total, 0);
    const lostRev     = cancelled.reduce((s, o) => s + o.total, 0);
    setText('fin-realized', fmtMoney(realizedRev));
    setText('fin-pending',  fmtMoney(pendingRev));
    setText('fin-lost',     fmtMoney(lostRev));
    setText('fin-realized-sub', `${realized.length} pedido${realized.length !== 1 ? 's' : ''} entregue${realized.length !== 1 ? 's' : ''}`);
    setText('fin-pending-sub',  `${pending.length} em andamento`);
    setText('fin-lost-sub',     `${cancelled.length} cancelado${cancelled.length !== 1 ? 's' : ''}`);

    /* Evolução temporal — granularidade automática */
    const dayMs   = 86400000;
    const spanDays = Math.ceil((end - start) / dayMs);
    const buckets = [];
    if (finPeriod === 'all') {
        /* Mensal desde o primeiro pedido */
        const first = finOrders.length ? new Date(Math.min(...finOrders.map(o => +new Date(o.createdAt)))) : new Date();
        let cur = new Date(first.getFullYear(), first.getMonth(), 1);
        const last = new Date();
        while (cur <= last) {
            const bs = new Date(cur), be = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
            const mo = valid.filter(o => inRange(o, bs, be));
            buckets.push({ label: bs.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), revenue: mo.reduce((s, o) => s + o.total, 0) });
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
    } else if (spanDays <= 31) {
        for (let d = new Date(start); d <= end; d = new Date(+d + dayMs)) {
            const bs = new Date(d); bs.setHours(0,0,0,0);
            const be = new Date(d); be.setHours(23,59,59,999);
            const day = valid.filter(o => inRange(o, bs, be));
            buckets.push({ label: bs.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), revenue: day.reduce((s, o) => s + o.total, 0) });
        }
    } else {
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end) {
            const bs = new Date(cur), be = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
            const mo = valid.filter(o => inRange(o, bs, be));
            buckets.push({ label: bs.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), revenue: mo.reduce((s, o) => s + o.total, 0) });
            cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
        }
    }
    renderFinEvolutionChart(buckets);

    /* Por forma de pagamento (com contagem) */
    const byPay = {};
    valid.forEach(o => {
        if (!byPay[o.payment]) byPay[o.payment] = { total: 0, count: 0 };
        byPay[o.payment].total += o.total;
        byPay[o.payment].count += 1;
    });
    renderFinPaymentChart(byPay);
    renderFinPaymentBreakdown(byPay, revenue);

    /* Por categoria */
    const byCat = {};
    valid.forEach(o => o.items.forEach(i => {
        const prod = products.find(p => p._id === i.productId || p.name === i.name);
        const cat  = prod?.category ?? 'Outros';
        byCat[cat] = (byCat[cat] ?? 0) + i.price * i.qty;
    }));
    renderFinCatChart(byCat);

    /* Entrega x retirada */
    const byDelivery = { Entrega: 0, Retirada: 0 };
    valid.forEach(o => { byDelivery[o.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'] += o.total; });
    renderFinDeliveryChart(byDelivery);

    /* Top produtos */
    const byProd = {};
    valid.forEach(o => o.items.forEach(i => {
        if (!byProd[i.name]) byProd[i.name] = { qty: 0, rev: 0 };
        byProd[i.name].qty += i.qty;
        byProd[i.name].rev += i.price * i.qty;
    }));
    const topProds = Object.entries(byProd).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5);
    const tbody = document.getElementById('fin-top-products');
    if (tbody) {
        tbody.innerHTML = !topProds.length
            ? '<tr><td colspan="4" class="text-center text-muted py-3 small">Sem dados de vendas no período.</td></tr>'
            : topProds.map(([name, d], i) => `
                <tr>
                    <td><span class="badge bg-secondary-subtle text-secondary">${i + 1}°</span></td>
                    <td data-label="Produto" class="small fw-semibold">${escHtml(name.length > 28 ? name.slice(0,28)+'…' : name)}</td>
                    <td data-label="Vendas" class="small text-muted">${d.qty} un.</td>
                    <td data-label="Receita" class="small fw-semibold text-success">${fmtMoney(d.rev)}</td>
                </tr>`).join('');
    }
}

/* Aplica indicador de variação % vs período anterior */
function applyChange(id, current, previous, isMoney) {
    const el = document.getElementById(id);
    if (!el) return;
    if (previous === null) { el.textContent = ''; el.className = 'metric-change flat'; return; }
    if (previous === 0) {
        el.textContent = current > 0 ? '↑ novo no período' : 'sem dados anteriores';
        el.className = 'metric-change ' + (current > 0 ? 'up' : 'flat');
        return;
    }
    const pct = ((current - previous) / previous) * 100;
    const arrow = pct >= 0 ? '↑' : '↓';
    el.textContent = `${arrow} ${Math.abs(pct).toFixed(1)}% vs período anterior`;
    el.className = 'metric-change ' + (pct >= 0 ? 'up' : 'down');
}

function renderFinEvolutionChart(buckets) {
    const canvas = document.getElementById('fin-evolution-chart');
    if (!canvas) return;
    if (finEvolutionChart) { finEvolutionChart.destroy(); finEvolutionChart = null; }
    const data = buckets.map(b => b.revenue);
    const avg  = data.length ? data.reduce((s, v) => s + v, 0) / data.length : 0;
    finEvolutionChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: buckets.map(b => b.label),
            datasets: [
                {
                    label: 'Faturamento', data,
                    borderColor: '#2d9e5f', backgroundColor: 'rgba(45,158,95,.1)',
                    tension: 0.35, fill: true, pointBackgroundColor: '#2d9e5f', pointRadius: data.length > 31 ? 0 : 3,
                },
                {
                    label: 'Média', data: data.map(() => avg),
                    borderColor: '#9ca3af', borderDash: [6, 4], borderWidth: 1.5,
                    pointRadius: 0, fill: false,
                },
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtMoney(c.raw)}` } } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => 'R$' + Number(v).toFixed(0), font: { size: 11 } }, grid: { color: chartGrid() } },
                x: { ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
            },
        },
    });
}

function renderFinPaymentBreakdown(byPay, totalRev) {
    const tbody = document.getElementById('fin-payment-breakdown');
    if (!tbody) return;
    const entries = Object.entries(byPay).sort((a, b) => b[1].total - a[1].total);
    if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3 small">Sem dados no período.</td></tr>';
        return;
    }
    tbody.innerHTML = entries.map(([k, v]) => {
        const pct = totalRev > 0 ? (v.total / totalRev) * 100 : 0;
        return `
            <tr>
                <td data-label="Forma" class="small fw-semibold">${escHtml(k)}</td>
                <td data-label="Pedidos" class="small text-muted">${v.count}</td>
                <td data-label="Receita" class="small fw-semibold">${fmtMoney(v.total)}</td>
                <td data-label="%" class="small">
                    <div class="d-flex align-items-center gap-2">
                        <div style="flex:1;height:6px;background:var(--border);border-radius:3px;min-width:40px;overflow:hidden">
                            <div style="width:${pct.toFixed(0)}%;height:100%;background:#2d9e5f"></div>
                        </div>
                        <span style="min-width:38px;text-align:right">${pct.toFixed(1)}%</span>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function renderFinDeliveryChart(byDelivery) {
    const canvas = document.getElementById('fin-delivery-chart');
    if (!canvas) return;
    if (finDeliveryChart) { finDeliveryChart.destroy(); finDeliveryChart = null; }
    const entries = Object.entries(byDelivery).filter(([, v]) => v > 0);
    if (!entries.length) return;
    finDeliveryChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v),
                backgroundColor: ['#4285f4', '#2d9e5f'],
                borderWidth: 2, borderColor: '#fff',
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
                tooltip: { callbacks: { label: c => ` ${c.label}: ${fmtMoney(c.raw)}` } },
            },
        },
    });
}

function renderFinPaymentChart(byPay) {
    const canvas = document.getElementById('fin-payment-chart');
    if (!canvas) return;
    if (finPaymentChart) { finPaymentChart.destroy(); finPaymentChart = null; }
    const entries = Object.entries(byPay);
    if (!entries.length) return;
    finPaymentChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                data: entries.map(([, v]) => v.total),
                backgroundColor: ['#2d9e5f','#4285f4','#ff6b35','#fbbf24'],
                borderWidth: 2, borderColor: '#fff',
            }],
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
                tooltip: { callbacks: { label: c => ` ${c.label}: ${fmtMoney(c.raw)}` } },
            },
        },
    });
}

function renderFinCatChart(byCat) {
    const canvas = document.getElementById('fin-cat-chart');
    if (!canvas) return;
    if (finCatChart) { finCatChart.destroy(); finCatChart = null; }
    const entries = Object.entries(byCat).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (!entries.length) return;
    finCatChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: entries.map(([k]) => k),
            datasets: [{
                label: 'Receita', data: entries.map(([, v]) => v),
                backgroundColor: ['#2d9e5f','#4285f4','#ff6b35','#fbbf24'],
                borderRadius: 6,
            }],
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtMoney(c.raw) } } },
            scales: {
                x: { beginAtZero: true, ticks: { callback: v => 'R$' + Number(v).toFixed(0), font: { size: 11 } }, grid: { color: chartGrid() } },
                y: { ticks: { font: { size: 11 } }, grid: { display: false } },
            },
        },
    });
}

/* Métricas consolidadas do período atual — reutilizado por CSV e impressão */
function finComputeReport() {
    const { start, end, label } = finPeriodRange(finPeriod);
    const inRange = o => { const d = new Date(o.createdAt); return d >= start && d <= end; };
    const periodAll = finOrders.filter(inRange);
    const valid     = periodAll.filter(o => o.status !== 'cancelled');
    const cancelled = periodAll.filter(o => o.status === 'cancelled');
    const realized  = periodAll.filter(o => o.status === 'delivered');
    const pending   = periodAll.filter(o => ['pending','confirmed','preparing','ready'].includes(o.status));

    const total  = valid.reduce((s, o) => s + o.total, 0);
    const ticket = valid.length ? total / valid.length : 0;
    const items  = valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);

    const byPay = {};
    valid.forEach(o => {
        if (!byPay[o.payment]) byPay[o.payment] = { total: 0, count: 0 };
        byPay[o.payment].total += o.total; byPay[o.payment].count += 1;
    });

    const byCat = {};
    valid.forEach(o => o.items.forEach(i => {
        const prod = products.find(p => p._id === i.productId || p.name === i.name);
        const cat  = prod?.category ?? 'Outros';
        byCat[cat] = (byCat[cat] ?? 0) + i.price * i.qty;
    }));

    return {
        label, valid, cancelled, realized, pending, total, ticket, items, byPay, byCat,
        realizedRev: realized.reduce((s, o) => s + o.total, 0),
        pendingRev:  pending.reduce((s, o) => s + o.total, 0),
        lostRev:     cancelled.reduce((s, o) => s + o.total, 0),
    };
}

function exportFinanceiroCSV() {
    const r = finComputeReport();
    if (!r.valid.length) { toast('Nenhum dado para exportar no período.', 'warning'); return; }
    const brl = n => `R$${Number(n).toFixed(2).replace('.',',')}`;
    const statusMap = { pending:'Pendente', confirmed:'Confirmado', preparing:'Preparando', ready:'Pronto', delivered:'Entregue', cancelled:'Cancelado' };

    const rows = [
        ['RELATÓRIO FINANCEIRO — HELVINHO RAÇÕES'],
        [`Período: ${r.label}`],
        [`Gerado em: ${fmtDate(new Date().toISOString())}`],
        [],
        ['RESUMO EXECUTIVO'],
        ['Faturamento (válido)', brl(r.total)],
        ['Receita realizada (entregue)', brl(r.realizedRev)],
        ['A receber (em andamento)', brl(r.pendingRev)],
        ['Receita perdida (cancelados)', brl(r.lostRev)],
        ['Ticket médio', brl(r.ticket)],
        ['Total de pedidos válidos', r.valid.length],
        ['Itens vendidos', r.items],
        ['Pedidos cancelados', r.cancelled.length],
        [],
        ['POR FORMA DE PAGAMENTO'],
        ['Forma','Pedidos','Receita','% do total'],
        ...Object.entries(r.byPay).map(([k, v]) =>
            [k, v.count, brl(v.total), `${r.total > 0 ? ((v.total / r.total) * 100).toFixed(1) : 0}%`]),
        [],
        ['POR CATEGORIA'],
        ...Object.entries(r.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, brl(v)]),
        [],
        ['PEDIDOS DETALHADOS'],
        ['Nº Pedido','Data','Status','Total','Pagamento','Tipo Entrega'],
        ...r.valid.map(o => [
            '#' + o._id.slice(-6).toUpperCase(),
            fmtDate(o.createdAt),
            statusMap[o.status] ?? o.status,
            brl(o.total),
            o.payment,
            o.deliveryType === 'delivery' ? 'Entrega' : 'Retirada',
        ]),
    ];

    const csv = '﻿' + rows.map(row => row.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(';')).join('\r\n');
    const today = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = `financeiro_helvinho_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('Relatório financeiro exportado!', 'success');
}

function printFinanceiro() {
    const r = finComputeReport();
    if (!r.valid.length) { toast('Nenhum dado para imprimir no período.', 'warning'); return; }
    const brl = n => fmtMoney(n);

    const payRows = Object.entries(r.byPay).sort((a, b) => b[1].total - a[1].total).map(([k, v]) => `
        <tr><td>${escHtml(k)}</td><td style="text-align:center">${v.count}</td>
        <td style="text-align:right">${brl(v.total)}</td>
        <td style="text-align:right">${r.total > 0 ? ((v.total / r.total) * 100).toFixed(1) : 0}%</td></tr>`).join('');

    const catRows = Object.entries(r.byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
        <tr><td>${escHtml(k)}</td><td style="text-align:right">${brl(v)}</td></tr>`).join('');

    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) { toast('Permita popups para imprimir.', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>Relatório Financeiro — Helvinho Rações</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#1a202c;font-size:13px}
            h1{font-size:20px;color:#2d9e5f;margin-bottom:2px}
            .sub{color:#666;font-size:12px;margin-bottom:20px}
            .period{background:#e8f5ee;padding:8px 14px;border-radius:8px;font-weight:600;color:#1e7a47;display:inline-block;margin-bottom:20px}
            h2{font-size:14px;margin:22px 0 8px;padding-bottom:5px;border-bottom:2px solid #2d9e5f;color:#1a3d2b}
            .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px}
            .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:14px}
            .kpi .lbl{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.05em;font-weight:700}
            .kpi .val{font-size:18px;font-weight:700;margin-top:4px}
            .green{color:#16a34a}.orange{color:#ff6b35}.red{color:#e53935}
            table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
            th{background:#f5f7fa;text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;color:#666;border-bottom:1px solid #ddd}
            td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
            .footer{margin-top:30px;text-align:center;color:#aaa;font-size:11px}
            .btn-print{margin-top:24px;padding:10px 24px;background:#2d9e5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px}
            @media print{.btn-print{display:none}}
        </style></head><body>
        <h1>🐾 Helvinho Rações</h1>
        <div class="sub">Relatório Financeiro · gerado em ${new Date().toLocaleString('pt-BR')}</div>
        <div class="period">Período: ${escHtml(r.label)}</div>

        <h2>Resumo Executivo</h2>
        <div class="kpis">
            <div class="kpi"><div class="lbl">Faturamento</div><div class="val">${brl(r.total)}</div></div>
            <div class="kpi"><div class="lbl">Ticket médio</div><div class="val">${brl(r.ticket)}</div></div>
            <div class="kpi"><div class="lbl">Pedidos válidos</div><div class="val">${r.valid.length}</div></div>
            <div class="kpi"><div class="lbl">Receita realizada</div><div class="val green">${brl(r.realizedRev)}</div></div>
            <div class="kpi"><div class="lbl">A receber</div><div class="val orange">${brl(r.pendingRev)}</div></div>
            <div class="kpi"><div class="lbl">Receita perdida</div><div class="val red">${brl(r.lostRev)}</div></div>
        </div>

        <h2>Por Forma de Pagamento</h2>
        <table><thead><tr><th>Forma</th><th style="text-align:center">Pedidos</th><th style="text-align:right">Receita</th><th style="text-align:right">%</th></tr></thead><tbody>${payRows}</tbody></table>

        <h2>Por Categoria</h2>
        <table><thead><tr><th>Categoria</th><th style="text-align:right">Receita</th></tr></thead><tbody>${catRows}</tbody></table>

        <div class="footer">Helvinho Rações — Relatório gerado pelo painel administrativo</div>
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    </body></html>`);
    win.document.close();
}

/* ======================================================
   DESPESAS
====================================================== */
const EXPENSE_CATEGORIES = [
    'Compra de mercadoria','Aluguel','Salários','Contas (água/luz/internet)',
    'Impostos e taxas','Marketing','Manutenção','Transporte/Frete','Outros',
];
let expenses     = [];
let expenseYear  = new Date().getFullYear();

function fillYearSelect(id, selected) {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = new Date().getFullYear();
    let html = '';
    for (let y = cur; y >= cur - 5; y--) html += `<option value="${y}" ${y === selected ? 'selected' : ''}>${y}</option>`;
    el.innerHTML = html;
}

async function loadDespesas() {
    /* Popula selects de ano e categoria (uma vez) */
    fillYearSelect('exp-year', expenseYear);
    const catFilter = document.getElementById('exp-cat-filter');
    if (catFilter && catFilter.options.length <= 1) {
        catFilter.innerHTML = '<option value="">Todas categorias</option>' +
            EXPENSE_CATEGORIES.map(c => `<option value="${escAttr(c)}">${escHtml(c)}</option>`).join('');
    }

    expenseYear = Number(document.getElementById('exp-year')?.value ?? new Date().getFullYear());
    tableLoading('despesas-tbody', 5);

    /* Carrega despesas do ano + pedidos para calcular lucro */
    const [eRes, oRes] = await Promise.all([
        api('GET', `/expenses?year=${expenseYear}`),
        finOrders.length ? Promise.resolve({ ok: true, data: { orders: finOrders } }) : api('GET', '/orders?limit=2000'),
    ]);

    if (!eRes?.ok) return;
    expenses = eRes.data ?? [];
    if (oRes?.ok && !finOrders.length) finOrders = oRes.data.orders ?? [];

    /* Resumo do ano */
    const now       = new Date();
    const totalAno  = expenses.reduce((s, e) => s + e.amount, 0);
    const mesAtual  = (expenseYear === now.getFullYear()) ? now.getMonth() : null;
    const totalMes  = mesAtual !== null
        ? expenses.filter(e => new Date(e.date).getMonth() === mesAtual).reduce((s, e) => s + e.amount, 0)
        : 0;

    const receitaAno = finOrders
        .filter(o => o.status !== 'cancelled' && new Date(o.createdAt).getFullYear() === expenseYear)
        .reduce((s, o) => s + o.total, 0);
    const lucroAno = receitaAno - totalAno;

    setText('exp-total-ano', fmtMoney(totalAno));
    setText('exp-total-mes', mesAtual !== null ? fmtMoney(totalMes) : '—');
    setText('exp-receita-ano', fmtMoney(receitaAno));
    const lucroEl = document.getElementById('exp-lucro-ano');
    if (lucroEl) { setText('exp-lucro-ano', fmtMoney(lucroAno)); lucroEl.style.color = lucroAno >= 0 ? '#16a34a' : '#e53935'; }

    renderDespesas();
}

function renderDespesas() {
    const catF = document.getElementById('exp-cat-filter')?.value ?? '';
    const list = catF ? expenses.filter(e => e.category === catF) : expenses;
    const tbody = document.getElementById('despesas-tbody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5"><i class="bi bi-cash-coin d-block fs-2 mb-2 opacity-25"></i>Nenhuma despesa registrada neste ano.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(e => `
        <tr style="cursor:pointer" onclick="openExpenseModal('${e._id}')">
            <td data-label="Data"><span class="small text-muted">${new Date(e.date).toLocaleDateString('pt-BR')}</span></td>
            <td data-label="Descrição"><span class="small fw-semibold">${escHtml(e.description)}</span></td>
            <td data-label="Categoria"><span class="badge bg-secondary-subtle text-secondary rounded-pill" style="font-size:.68rem">${escHtml(e.category)}</span></td>
            <td data-label="Valor"><span class="small fw-semibold text-danger">- ${fmtMoney(e.amount)}</span></td>
            <td data-label="Ações" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-secondary" onclick="openExpenseModal('${e._id}')"><i class="bi bi-pencil"></i></button>
            </td>
        </tr>`).join('');
}

function openExpenseModal(id) {
    const errEl = document.getElementById('exp-error');
    errEl?.classList.add('d-none');
    const delBtn = document.getElementById('btn-del-expense');

    if (id) {
        const e = expenses.find(x => x._id === id);
        if (!e) return;
        setText('expense-modal-title', 'Editar despesa');
        setVal('exp-id', e._id);
        setVal('exp-desc', e.description);
        setVal('exp-category', e.category);
        setVal('exp-amount', e.amount);
        setVal('exp-date', new Date(e.date).toISOString().slice(0, 10));
        setVal('exp-notes', e.notes ?? '');
        delBtn?.classList.remove('d-none');
    } else {
        setText('expense-modal-title', 'Nova despesa');
        setVal('exp-id', '');
        setVal('exp-desc', ''); setVal('exp-category', ''); setVal('exp-amount', '');
        setVal('exp-date', new Date().toISOString().slice(0, 10));
        setVal('exp-notes', '');
        delBtn?.classList.add('d-none');
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('expenseModal')).show();
}

async function saveExpense() {
    const id    = document.getElementById('exp-id')?.value ?? '';
    const errEl = document.getElementById('exp-error');
    errEl?.classList.add('d-none');

    const body = {
        description: (document.getElementById('exp-desc')?.value ?? '').trim(),
        category:    document.getElementById('exp-category')?.value ?? '',
        amount:      parseFloat(document.getElementById('exp-amount')?.value ?? ''),
        date:        document.getElementById('exp-date')?.value ?? '',
        notes:       (document.getElementById('exp-notes')?.value ?? '').trim(),
    };

    if (!body.description || !body.category || !body.amount || body.amount <= 0 || !body.date) {
        if (errEl) { errEl.textContent = 'Preencha descrição, categoria, valor e data.'; errEl.classList.remove('d-none'); }
        return;
    }

    const btn = document.getElementById('btn-save-expense');
    setBtnLoading(btn, true, 'Salvando...');
    const res = await api(id ? 'PUT' : 'POST', id ? '/expenses/' + id : '/expenses', body);
    setBtnLoading(btn, false, '<i class="bi bi-check-lg me-1"></i>Salvar');

    if (!res?.ok) {
        if (errEl) { errEl.textContent = res?.data?.error ?? 'Erro ao salvar despesa.'; errEl.classList.remove('d-none'); }
        return;
    }
    bootstrap.Modal.getInstance(document.getElementById('expenseModal'))?.hide();
    toast(id ? 'Despesa atualizada!' : 'Despesa registrada!', 'success');
    loadDespesas();
}

async function deleteExpense() {
    const id = document.getElementById('exp-id')?.value ?? '';
    if (!id) return;
    const ok = await showConfirm('Excluir esta despesa?', 'Esta ação não pode ser desfeita.');
    if (!ok) return;
    const res = await api('DELETE', '/expenses/' + id);
    if (res?.ok) {
        bootstrap.Modal.getInstance(document.getElementById('expenseModal'))?.hide();
        toast('Despesa removida.', 'success');
        loadDespesas();
    } else toast(res?.data?.error ?? 'Erro ao excluir.', 'danger');
}

/* ======================================================
   RELATÓRIO ANUAL (DRE para imposto de renda)
====================================================== */
function openAnnualReport() {
    fillYearSelect('annual-year', new Date().getFullYear());
    bootstrap.Modal.getOrCreateInstance(document.getElementById('annualModal')).show();
}

async function generateAnnualReport() {
    const year = Number(document.getElementById('annual-year')?.value ?? new Date().getFullYear());

    /* Garante dados carregados */
    if (!finOrders.length) {
        const oRes = await api('GET', '/orders?limit=2000');
        if (oRes?.ok) finOrders = oRes.data.orders ?? [];
    }
    const eRes = await api('GET', `/expenses?year=${year}`);
    const yearExpenses = eRes?.ok ? (eRes.data ?? []) : [];

    bootstrap.Modal.getInstance(document.getElementById('annualModal'))?.hide();

    const MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    /* Receita por mês (pedidos não cancelados) */
    const ordersYear = finOrders.filter(o => o.status !== 'cancelled' && new Date(o.createdAt).getFullYear() === year);

    const monthly = MES.map((nome, m) => {
        const receita = ordersYear.filter(o => new Date(o.createdAt).getMonth() === m).reduce((s, o) => s + o.total, 0);
        const despesa = yearExpenses.filter(e => new Date(e.date).getMonth() === m).reduce((s, e) => s + e.amount, 0);
        return { nome, receita, despesa, lucro: receita - despesa };
    });

    const totReceita = monthly.reduce((s, m) => s + m.receita, 0);
    const totDespesa = monthly.reduce((s, m) => s + m.despesa, 0);
    const totLucro   = totReceita - totDespesa;
    const margem     = totReceita > 0 ? (totLucro / totReceita) * 100 : 0;

    /* Despesas por categoria */
    const byCat = {};
    yearExpenses.forEach(e => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount; });

    /* Receita por forma de pagamento */
    const byPay = {};
    ordersYear.forEach(o => { byPay[o.payment] = (byPay[o.payment] ?? 0) + o.total; });

    const brl = n => fmtMoney(n);
    const cls = n => n >= 0 ? 'pos' : 'neg';

    const monthlyRows = monthly.map(m => `
        <tr>
            <td>${m.nome}</td>
            <td class="num pos">${brl(m.receita)}</td>
            <td class="num neg">${m.despesa > 0 ? '- ' + brl(m.despesa) : '—'}</td>
            <td class="num ${cls(m.lucro)}"><strong>${brl(m.lucro)}</strong></td>
        </tr>`).join('');

    const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
        <tr><td>${escHtml(k)}</td><td class="num">${brl(v)}</td>
        <td class="num">${totDespesa > 0 ? ((v / totDespesa) * 100).toFixed(1) : 0}%</td></tr>`).join('')
        || '<tr><td colspan="3" style="text-align:center;color:#999">Nenhuma despesa registrada</td></tr>';

    const payRows = Object.entries(byPay).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
        <tr><td>${escHtml(k)}</td><td class="num">${brl(v)}</td>
        <td class="num">${totReceita > 0 ? ((v / totReceita) * 100).toFixed(1) : 0}%</td></tr>`).join('')
        || '<tr><td colspan="3" style="text-align:center;color:#999">Nenhuma receita registrada</td></tr>';

    const storeName = (typeof storeConfig !== 'undefined' && storeConfig.storeName) ? storeConfig.storeName : 'Helvinho Rações';

    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) { toast('Permita popups para gerar o relatório.', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
        <title>Relatório Anual ${year} — ${escHtml(storeName)}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Segoe UI',Arial,sans-serif;padding:36px 40px;color:#1a202c;font-size:13px}
            .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2d9e5f;padding-bottom:14px;margin-bottom:6px}
            h1{font-size:22px;color:#2d9e5f}
            .head .doc{font-size:13px;font-weight:700;color:#1a3d2b;text-align:right}
            .head .doc small{display:block;font-weight:400;color:#888;font-size:11px}
            .ano{font-size:30px;font-weight:800;color:#1a3d2b;letter-spacing:1px;margin:16px 0}
            h2{font-size:14px;margin:24px 0 8px;padding-bottom:5px;border-bottom:2px solid #e5e7eb;color:#1a3d2b}
            .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}
            .card{border:1px solid #e5e7eb;border-radius:10px;padding:14px}
            .card .lbl{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:.04em;font-weight:700}
            .card .val{font-size:17px;font-weight:800;margin-top:5px}
            table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
            th{background:#f5f7fa;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd}
            td{padding:7px 10px;border-bottom:1px solid #f0f0f0}
            .num{text-align:right;font-variant-numeric:tabular-nums}
            .pos{color:#16a34a}.neg{color:#dc2626}
            tfoot td{border-top:2px solid #1a3d2b;font-weight:800;font-size:13px;background:#f0f9f4}
            .green{color:#16a34a}.red{color:#dc2626}.dark{color:#1a3d2b}
            .disclaimer{margin-top:26px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#92400e}
            .footer{margin-top:22px;text-align:center;color:#aaa;font-size:11px}
            .btn-print{margin-top:24px;padding:11px 28px;background:#2d9e5f;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
            @media print{.btn-print{display:none}body{padding:20px}}
        </style></head><body>
        <div class="head">
            <div><h1>🐾 ${escHtml(storeName)}</h1></div>
            <div class="doc">DEMONSTRATIVO ANUAL<small>Entradas, Saídas e Lucro</small><small>Emitido em ${new Date().toLocaleDateString('pt-BR')}</small></div>
        </div>
        <div class="ano">Exercício ${year}</div>

        <div class="cards">
            <div class="card"><div class="lbl">Total de Entradas</div><div class="val green">${brl(totReceita)}</div></div>
            <div class="card"><div class="lbl">Total de Saídas</div><div class="val red">${brl(totDespesa)}</div></div>
            <div class="card"><div class="lbl">Lucro Líquido</div><div class="val ${totLucro >= 0 ? 'green' : 'red'}">${brl(totLucro)}</div></div>
            <div class="card"><div class="lbl">Margem de Lucro</div><div class="val dark">${margem.toFixed(1)}%</div></div>
        </div>

        <h2>Demonstrativo Mensal</h2>
        <table>
            <thead><tr><th>Mês</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Lucro</th></tr></thead>
            <tbody>${monthlyRows}</tbody>
            <tfoot><tr><td>TOTAL ${year}</td><td class="num green">${brl(totReceita)}</td><td class="num red">- ${brl(totDespesa)}</td><td class="num ${totLucro >= 0 ? 'green' : 'red'}">${brl(totLucro)}</td></tr></tfoot>
        </table>

        <h2>Entradas por Forma de Pagamento</h2>
        <table>
            <thead><tr><th>Forma</th><th class="num">Valor</th><th class="num">% do total</th></tr></thead>
            <tbody>${payRows}</tbody>
        </table>

        <h2>Saídas por Categoria</h2>
        <table>
            <thead><tr><th>Categoria</th><th class="num">Valor</th><th class="num">% do total</th></tr></thead>
            <tbody>${catRows}</tbody>
        </table>

        <div class="disclaimer">
            <strong>⚠️ Aviso:</strong> Este é um relatório gerencial gerado automaticamente a partir dos pedidos e despesas
            registrados no sistema. Não substitui a escrituração contábil oficial. Para a Declaração de Imposto de Renda,
            consulte seu contador e utilize os documentos fiscais (notas fiscais) como base oficial.
        </div>

        <div class="footer">${escHtml(storeName)} — Demonstrativo gerado pelo painel administrativo</div>
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    </body></html>`);
    win.document.close();
    toast('Relatório anual gerado!', 'success');
}

/* ======================================================
   ESTOQUE
====================================================== */
let stockProducts   = [];
let currentStockProductId   = null;
let currentStockProductName = '';
let currentStockQty         = 0;

async function loadEstoque() {
    tableLoading('stock-tbody', 7);
    tableLoading('movements-tbody', 4, 8);

    const [pRes, mvRes] = await Promise.all([
        api('GET', '/products?limit=100'),
        api('GET', '/products/stock/movements?limit=30'),
    ]);

    if (!pRes?.ok) return;
    stockProducts = pRes.data.items ?? [];

    /* Métricas */
    const active  = stockProducts.filter(p => p.active);
    const total   = active.reduce((s, p) => s + p.stock * p.price, 0);
    const low     = active.filter(p => p.stock > 0 && p.stock <= 5).length;
    const empty   = active.filter(p => p.stock === 0).length;
    setText('st-total', active.length);
    setText('st-value', fmtMoney(total));
    setText('st-low',   low);
    setText('st-empty', empty);

    renderStockTable();

    /* Movimentações */
    const mvTbody = document.getElementById('movements-tbody');
    if (mvTbody && mvRes?.ok) {
        const mvs = mvRes.data ?? [];
        mvTbody.innerHTML = !mvs.length
            ? '<tr><td colspan="4" class="text-center text-muted py-3 small">Nenhuma movimentação ainda.</td></tr>'
            : mvs.map(m => `
                <tr>
                    <td data-label="Produto"><span class="small">${escHtml(m.productName.length > 20 ? m.productName.slice(0,20)+'…' : m.productName)}</span></td>
                    <td data-label="Tipo"><span class="badge rounded-pill ${m.type === 'entrada' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}" style="font-size:.68rem">${m.type === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
                    <td data-label="Qtd"><span class="small fw-semibold ${m.type === 'entrada' ? 'text-success' : 'text-danger'}">${m.type === 'entrada' ? '+' : '-'}${m.quantity}</span></td>
                    <td data-label="Motivo"><span class="small text-muted">${escHtml(m.reason)}</span></td>
                </tr>`).join('');
    }
}

function renderStockTable() {
    const filter = document.getElementById('st-filter')?.value ?? '';
    let list = stockProducts.filter(p => p.active);

    if (filter === 'empty') list = list.filter(p => p.stock === 0);
    else if (filter === 'low') list = list.filter(p => p.stock > 0 && p.stock <= 5);
    else if (filter === 'ok')  list = list.filter(p => p.stock > 5);

    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5"><i class="bi bi-boxes d-block fs-2 mb-2 opacity-25"></i>Nenhum produto encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(p => {
        const stockVal = p.stock * p.price;
        const statusCls = p.stock === 0 ? 'bg-danger-subtle text-danger' : p.stock <= 5 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success';
        const statusLabel = p.stock === 0 ? 'Sem estoque' : p.stock <= 5 ? 'Baixo' : 'OK';
        return `
        <tr>
            <td data-label="Produto"><span class="small fw-semibold">${escHtml(p.name)}</span></td>
            <td data-label="Categoria"><span class="small text-muted">${escHtml(p.category)}</span></td>
            <td data-label="Estoque">
                <span class="stock-edit ${p.stock === 0 ? 'fw-bold text-danger' : p.stock <= 5 ? 'fw-semibold text-warning' : 'fw-semibold'}"
                      title="Clique para editar inline" onclick="editStockInline('${p._id}', ${p.stock}, this)">
                    ${p.stock} un.
                </span>
            </td>
            <td data-label="Preço"><span class="small">${fmtMoney(p.price)}</span></td>
            <td data-label="Valor"><span class="small fw-semibold">${fmtMoney(stockVal)}</span></td>
            <td data-label="Status"><span class="badge rounded-pill ${statusCls}">${statusLabel}</span></td>
            <td data-label="Ações">
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-success" title="Entrada de estoque" onclick="openStockModal('${p._id}','${escAttr(p.name)}',${p.stock},'entrada')">
                        <i class="bi bi-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" title="Saída de estoque" onclick="openStockModal('${p._id}','${escAttr(p.name)}',${p.stock},'saida')">
                        <i class="bi bi-dash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function exportStockCSV() {
    const active = stockProducts.filter(p => p.active);
    if (!active.length) { toast('Nenhum produto para exportar.', 'warning'); return; }

    const totalVal = active.reduce((s, p) => s + p.stock * p.price, 0);
    const headers  = ['Produto','Categoria','Estoque (un.)','Preço Unitário (R$)','Valor em Estoque (R$)','Status'];
    const rows     = active.map(p => {
        const s = p.stock === 0 ? 'Sem estoque' : p.stock <= 5 ? 'Estoque baixo' : 'OK';
        return [p.name, p.category, p.stock, p.price.toFixed(2).replace('.',','), (p.stock * p.price).toFixed(2).replace('.',','), s];
    });
    const summary  = [[], ['TOTAL','','','' , totalVal.toFixed(2).replace('.',','), '']];

    const csv = '﻿' + [headers, ...rows, ...summary]
        .map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(';'))
        .join('\r\n');

    const today = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url; a.download = `estoque_helvinho_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('Estoque exportado!', 'success');
}

/* --- Modal de ajuste de estoque --- */
const ENTRADA_REASONS = ['Chegou mercadoria','Devolução de cliente','Correção de contagem','Outros'];
const SAIDA_REASONS   = ['Venda avulsa','Produto danificado','Produto vencido','Doação','Correção de contagem','Outros'];

function openStockModal(id, name, currentQty, type = 'entrada') {
    currentStockProductId   = id;
    currentStockProductName = name;
    currentStockQty         = currentQty;

    setVal('stock-product-id', id);
    setVal('stock-qty', '');
    document.getElementById('stock-error')?.classList.add('d-none');
    document.getElementById('stock-preview')?.classList.add('d-none');

    setText('stock-modal-title', `Ajustar Estoque — ${name.length > 25 ? name.slice(0,25)+'…' : name}`);
    setStockType(type);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('stockModal')).show();
}

function setStockType(type) {
    setVal('stock-type', type);
    const reasons = type === 'entrada' ? ENTRADA_REASONS : SAIDA_REASONS;
    const sel = document.getElementById('stock-reason-select');
    if (sel) {
        sel.innerHTML = '<option value="">Selecionar motivo...</option>' +
            reasons.map(r => `<option value="${escAttr(r)}">${escHtml(r)}</option>`).join('');
    }
    document.getElementById('stock-reason')?.classList.add('d-none');

    const btnE = document.getElementById('btn-entrada');
    const btnS = document.getElementById('btn-saida');
    if (btnE) {
        btnE.style.background = type === 'entrada' ? '#e8f5ee' : 'var(--bg)';
        btnE.style.color      = type === 'entrada' ? '#2d9e5f' : 'var(--muted)';
        btnE.style.border     = type === 'entrada' ? '2px solid #2d9e5f' : '2px solid var(--border)';
    }
    if (btnS) {
        btnS.style.background = type === 'saida' ? '#fef2f2' : 'var(--bg)';
        btnS.style.color      = type === 'saida' ? '#dc2626' : 'var(--muted)';
        btnS.style.border     = type === 'saida' ? '2px solid #dc2626' : '2px solid var(--border)';
    }

    updateStockPreview();
}

function onStockReasonChange() {
    const sel    = document.getElementById('stock-reason-select');
    const input  = document.getElementById('stock-reason');
    const isOther = sel?.value === 'Outros';
    if (input) {
        input.style.display = isOther ? '' : 'none';
        if (!isOther) input.value = '';
    }
    updateStockPreview();
}

function updateStockPreview() {
    const qty  = parseInt(document.getElementById('stock-qty')?.value ?? '0') || 0;
    const type = document.getElementById('stock-type')?.value ?? 'entrada';
    if (!qty) { document.getElementById('stock-preview')?.classList.add('d-none'); return; }
    const delta    = type === 'entrada' ? qty : -qty;
    const newStock = Math.max(0, currentStockQty + delta);
    const prevEl   = document.getElementById('stock-preview');
    if (prevEl) prevEl.className = `alert py-2 small ${type === 'entrada' ? 'alert-success' : 'alert-warning'}`;
    setText('prev-stock',      currentStockQty + ' un.');
    setText('new-stock-preview', newStock + ' un.');
    document.getElementById('stock-preview')?.classList.remove('d-none');
}

/* Liga o preview ao input de quantidade */
document.addEventListener('input', e => {
    if (e.target && e.target.id === 'stock-qty') updateStockPreview();
});

async function confirmStockAdjust() {
    const id     = document.getElementById('stock-product-id')?.value ?? '';
    const type   = document.getElementById('stock-type')?.value ?? 'entrada';
    const qty    = parseInt(document.getElementById('stock-qty')?.value ?? '0') || 0;
    const selVal = document.getElementById('stock-reason-select')?.value ?? '';
    const reason = selVal === 'Outros'
        ? (document.getElementById('stock-reason')?.value ?? '').trim()
        : selVal;

    const errEl = document.getElementById('stock-error');
    if (errEl) errEl.classList.add('d-none');

    if (!qty || qty < 1)  { showStockErr('Informe uma quantidade válida.'); return; }
    if (!reason)          { showStockErr('Selecione ou descreva o motivo.'); return; }

    const btn = document.getElementById('btn-confirm-stock');
    setBtnLoading(btn, true, 'Salvando...');

    const res = await api('POST', `/products/${id}/stock`, { type, quantity: qty, reason });

    setBtnLoading(btn, false, '<i class="bi bi-check-lg me-1"></i>Confirmar');

    if (!res?.ok) { showStockErr(res?.data?.error ?? 'Erro ao ajustar estoque.'); return; }

    bootstrap.Modal.getInstance(document.getElementById('stockModal'))?.hide();
    const delta = type === 'entrada' ? qty : -qty;
    toast(`Estoque atualizado! ${delta > 0 ? '+' : ''}${delta} un.`, 'success');
    loadEstoque();
    loadProducts(); /* atualiza a view de produtos também */
}

function showStockErr(msg) {
    const el = document.getElementById('stock-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('d-none');
}

/* ---- Dark mode ---- */
function setTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    /* data-bs-theme deixa todos os componentes Bootstrap (tabelas, badges,
       dropdowns, inputs, modais) cientes do tema automaticamente */
    root.setAttribute('data-bs-theme', theme);
    const icon = document.getElementById('dark-icon');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
    /* Cores padrão dos gráficos seguem o tema */
    if (window.Chart) {
        Chart.defaults.color       = theme === 'dark' ? '#94a3b8' : '#6b7280';
        Chart.defaults.borderColor = theme === 'dark' ? '#334155' : '#f3f4f6';
    }
}

function applyTheme() {
    const saved = localStorage.getItem('adminTheme') ??
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(saved);
}

/* Cor das linhas de grade dos gráficos conforme o tema */
function chartGrid() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#f3f4f6';
}

function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const theme  = isDark ? 'light' : 'dark';
    setTheme(theme);
    localStorage.setItem('adminTheme', theme);
    /* Re-renderiza a view atual para os gráficos pegarem as novas cores */
    if (typeof showView === 'function' && document.getElementById('admin-app') &&
        !document.getElementById('admin-app').classList.contains('d-none')) {
        showView(currentView);
    }
}

/* ---- PWA + notificações ---- */
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) { toast('Notificações não suportadas neste navegador.', 'warning'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
        const badge = document.getElementById('notif-badge');
        badge?.classList.remove('d-none');
        toast('🔔 Notificações ativadas! Você será avisado de novos pedidos.', 'success');
    } else {
        toast('Permissão de notificação negada.', 'warning');
    }
}

/* Chamada pelo polling quando detecta novo pedido */
function showBrowserNotification(title, body) {
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/assets/dog.png', tag: 'helvinho-pedido' });
}

/* ---- Busca global ---- */
function globalSearch(q) {
    const query = q.trim().toLowerCase();
    if (!query || query.length < 2) { hideSearch(); return; }

    const pHits = products.filter(p =>
        p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    ).slice(0, 4);

    const oHits = orders.filter(o =>
        o._id.slice(-6).toLowerCase().includes(query) ||
        o.items.some(i => i.name.toLowerCase().includes(query))
    ).slice(0, 3);

    const mHits = messages.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.message.toLowerCase().includes(query)
    ).slice(0, 3);

    const el = document.getElementById('search-results');
    if (!el) return;

    if (!pHits.length && !oHits.length && !mHits.length) {
        el.innerHTML = `<div class="srch-empty"><i class="bi bi-search me-2"></i>Nenhum resultado para "<strong>${escHtml(q)}</strong>"</div>`;
        el.classList.remove('d-none');
        return;
    }

    let html = '';
    if (pHits.length) {
        html += `<div class="srch-group-label">Produtos</div>` +
            pHits.map(p => `
                <div class="srch-item" onclick="openProductModal('${p._id}');hideSearch()">
                    <i class="bi bi-box-seam text-success" style="flex-shrink:0"></i>
                    <div>
                        <div class="small fw-semibold">${highlight(p.name, query)}</div>
                        <div style="font-size:.72rem;color:var(--muted)">${p.category} · ${fmtMoney(p.price)}</div>
                    </div>
                </div>`).join('');
    }
    if (oHits.length) {
        html += `<div class="srch-group-label">Pedidos</div>` +
            oHits.map(o => `
                <div class="srch-item" onclick="showView('orders');openOrderDetail('${o._id}');hideSearch()">
                    <i class="bi bi-bag-check text-warning" style="flex-shrink:0"></i>
                    <div>
                        <div class="small fw-semibold">#${o._id.slice(-6).toUpperCase()} · ${fmtMoney(o.total)}</div>
                        <div style="font-size:.72rem;color:var(--muted)">${statusBadge(o.status)}</div>
                    </div>
                </div>`).join('');
    }
    if (mHits.length) {
        html += `<div class="srch-group-label">Mensagens</div>` +
            mHits.map(m => `
                <div class="srch-item" onclick="showView('messages');openMessage('${m._id}');hideSearch()">
                    <i class="bi bi-envelope text-primary" style="flex-shrink:0"></i>
                    <div>
                        <div class="small fw-semibold">${highlight(m.name, query)}</div>
                        <div style="font-size:.72rem;color:var(--muted)">${escHtml(m.email)}</div>
                    </div>
                </div>`).join('');
    }

    el.innerHTML = html;
    el.classList.remove('d-none');
}

function hideSearch() {
    document.getElementById('search-results')?.classList.add('d-none');
}

function highlight(text, query) {
    const safe = escHtml(text);
    const re   = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(re, '<mark style="background:#fef08a;border-radius:2px;padding:0 1px">$1</mark>');
}

/* ---- Upload de imagem (ImgBB) ---- */
async function handleImageUpload(input) {
    const file = input?.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('upload-status');
    if (statusEl) statusEl.textContent = 'Carregando...';

    /* Lê chave ImgBB das configurações carregadas */
    const settingsRes = await api('GET', '/settings');
    const imgbbKey    = settingsRes?.data?.imgbbKey ?? '';

    if (!imgbbKey) {
        toast('Configure a chave ImgBB em Configurações antes de fazer upload.', 'warning');
        if (statusEl) statusEl.textContent = '';
        return;
    }

    try {
        const base64  = await fileToBase64(file);
        const formData = new FormData();
        formData.append('image', base64.split(',')[1]);

        const res  = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: 'POST', body: formData });
        const data = await res.json();

        if (!data.success) throw new Error(data.error?.message ?? 'Falha no upload');

        const url = data.data.url;
        setVal('p-img', url);
        previewImg();
        toast('Imagem enviada com sucesso!', 'success');
        if (statusEl) statusEl.textContent = '';
    } catch (err) {
        toast('Erro no upload: ' + String(err), 'danger');
        if (statusEl) statusEl.textContent = '';
    } finally {
        input.value = '';
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ---- Activity log ---- */
async function loadActivity() {
    tableLoading('activity-tbody', 4);
    const res = await api('GET', '/activity?limit=100');
    if (!res?.ok) return;
    const logs = res.data ?? [];
    const tbody = document.getElementById('activity-tbody');
    if (!tbody) return;

    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5"><i class="bi bi-clock-history d-block fs-2 mb-2 opacity-25"></i>Nenhuma atividade registrada.</td></tr>';
        return;
    }

    const icons = {
        'Produto criado':          'bi-plus-circle text-success',
        'Produto editado':         'bi-pencil text-primary',
        'Status do pedido alterado': 'bi-bag-check text-warning',
        'Login realizado':         'bi-box-arrow-in-right text-info',
        'Configurações atualizadas': 'bi-gear text-secondary',
    };

    tbody.innerHTML = logs.map(l => `
        <tr>
            <td data-label="Data/Hora"><span class="text-muted small">${fmtDate(l.createdAt)}</span></td>
            <td data-label="Admin"><span class="small">${escHtml(l.adminEmail)}</span></td>
            <td data-label="Ação">
                <i class="bi ${icons[l.action] ?? 'bi-activity text-muted'} me-1"></i>
                <span class="small fw-semibold">${escHtml(l.action)}</span>
            </td>
            <td data-label="Detalhe"><span class="text-muted small">${escHtml(l.details)}</span></td>
        </tr>`).join('');
}

/* ---- Confirm dialog ---- */
function showConfirm(message, subtext) {
    return new Promise(resolve => {
        const modal  = document.getElementById('confirmModal');
        const btnYes = document.getElementById('confirm-yes');
        if (!modal || !btnYes) { resolve(true); return; }
        setText('confirm-text', message);
        setText('confirm-sub',  subtext ?? '');

        const bs = bootstrap.Modal.getOrCreateInstance(modal);
        let resolved = false;

        function done(val) {
            if (resolved) return; resolved = true;
            btnYes.removeEventListener('click', onYes);
            modal.removeEventListener('hidden.bs.modal', onHide);
            resolve(val);
        }
        function onYes()  { done(true);  bs.hide(); }
        function onHide() { done(false); }

        btnYes.addEventListener('click', onYes, { once: true });
        modal.addEventListener('hidden.bs.modal', onHide, { once: true });
        bs.show();
    });
}

/* ---- Utils ---- */
function toast(msg, type = 'success') {
    const el   = document.getElementById('adminToast');
    const body = document.getElementById('adminToastBody');
    if (!el || !body) return;
    body.textContent = msg;
    el.className = `toast align-items-center border-0 text-bg-${type}`;
    bootstrap.Toast.getOrCreateInstance(el, { delay: 3500 }).show();
}

function tableLoading(tbodyId, cols, rows = 5) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const cell = '<td><span class="sk sk-sm"></span></td>';
    tbody.innerHTML = Array(rows).fill(`<tr>${Array(cols).fill(cell).join('')}</tr>`).join('');
}

function setBtnLoading(btn, loading, html) {
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? '<span class="spinner-border spinner-border-sm me-2"></span>' + html : html;
}

function statusBadge(status) {
    const map = {
        pending:   ['warning', 'Pendente'],
        confirmed: ['info',    'Confirmado'],
        preparing: ['primary', 'Preparando'],
        ready:     ['success', 'Pronto'],
        delivered: ['success', 'Entregue'],
        cancelled: ['danger',  'Cancelado'],
    };
    const [color, label] = map[status] ?? ['secondary', status ?? '—'];
    return `<span class="badge rounded-pill bg-${color}-subtle text-${color}" style="font-size:.73rem">${label}</span>`;
}

function paymentBadge(o) {
    const pd = o.paymentDetails;
    if (!pd) return '';
    if (o.payment === 'Cartão' && pd.cardType)
        return ` <span class="badge bg-primary-subtle text-primary rounded-pill" style="font-size:.67rem">${pd.cardType === 'credito' ? 'Crédito' : 'Débito'}</span>`;
    return '';
}

function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.classList.toggle('d-none', count === 0);
}

function fmtMoney(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = String(val ?? ''); }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value       = String(val ?? ''); }
function show(el, msg)    { if (!el) return; el.textContent = msg; el.classList.remove('d-none'); }
function hide(el)         { el?.classList.add('d-none'); }

function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
