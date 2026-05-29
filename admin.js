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
    document.getElementById('login-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') login();
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
function showView(view) {
    closeSidebar();
    ['dashboard','products','orders','messages','newsletter','settings'].forEach(v => {
        document.getElementById('view-' + v)?.classList.toggle('d-none', v !== view);
        document.getElementById('nav-'  + v)?.classList.toggle('active', v === view);
    });
    const titles = { dashboard:'Dashboard', products:'Produtos', orders:'Pedidos', messages:'Mensagens', newsletter:'Newsletter', settings:'Configurações' };
    setText('topbar-title', titles[view] ?? '');

    if (view === 'dashboard') loadDashboard();
    if (view === 'products')  loadProducts();
    if (view === 'orders')    loadOrders();
    if (view === 'messages')  loadMessages();
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
            const n = total - lastOrderTotal;
            playSound();
            toast(`🛍️ ${n} novo${n > 1 ? 's' : ''} pedido${n > 1 ? 's' : ''}!`, 'success');
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
async function loadDashboard() {
    await loadStats();
    loadSalesChart(7);
    loadMetrics();
    tableLoading('dash-orders',   4, 4);
    tableLoading('dash-messages', 2, 4);

    const [oRes, mRes] = await Promise.all([
        api('GET', '/orders?limit=5'),
        api('GET', '/contact?limit=5'),
    ]);

    const ot = document.getElementById('dash-orders');
    if (ot && oRes?.ok) {
        const list = oRes.data.orders ?? [];
        ot.innerHTML = !list.length
            ? '<tr><td colspan="4" class="text-center text-muted py-4 small">Nenhum pedido ainda.</td></tr>'
            : list.map(o => `
                <tr style="cursor:pointer" onclick="showView('orders')">
                    <td data-label="Pedido"><span class="font-monospace fw-semibold small">#${o._id.slice(-6).toUpperCase()}</span></td>
                    <td data-label="Total"><strong class="small">${fmtMoney(o.total)}</strong></td>
                    <td data-label="Tipo"><span class="small text-muted">${o.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}</span></td>
                    <td data-label="Status">${statusBadge(o.status)}</td>
                </tr>`).join('');
    }

    const mt = document.getElementById('dash-messages');
    if (mt && mRes?.ok) {
        const list = mRes.data.messages ?? [];
        mt.innerHTML = !list.length
            ? '<tr><td colspan="2" class="text-center text-muted py-4 small">Nenhuma mensagem ainda.</td></tr>'
            : list.map(m => `
                <tr style="cursor:pointer" onclick="showView('messages')">
                    <td data-label="Nome"><span class="small fw-semibold">${escHtml(m.name)}</span></td>
                    <td data-label="Status"><span class="badge rounded-pill ${m.replied ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">${m.replied ? 'Respondida' : 'Pendente'}</span></td>
                </tr>`).join('');
    }
}

/* ---- Métricas do mês ---- */
async function loadMetrics() {
    const res = await api('GET', '/orders?limit=500');
    if (!res?.ok) return;
    const all = res.data.orders ?? [];

    const now     = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lstStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lstEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const valid   = all.filter(o => o.status !== 'cancelled');
    const curMon  = valid.filter(o => new Date(o.createdAt) >= curStart);
    const lstMon  = valid.filter(o => new Date(o.createdAt) >= lstStart && new Date(o.createdAt) <= lstEnd);

    const curTotal  = curMon.reduce((s, o) => s + o.total, 0);
    const lstTotal  = lstMon.reduce((s, o) => s + o.total, 0);
    const ticket    = curMon.length ? curTotal / curMon.length : 0;
    const change    = lstTotal > 0 ? ((curTotal - lstTotal) / lstTotal) * 100 : null;

    /* Produto mais vendido (por quantidade em todos os pedidos) */
    const qty = {};
    valid.forEach(o => o.items.forEach(i => { qty[i.name] = (qty[i.name] ?? 0) + i.qty; }));
    const [bestName, bestQty] = Object.entries(qty).sort((a, b) => (b[1] as number) - (a[1] as number))[0] ?? ['—', 0];

    setText('metric-month',  fmtMoney(curTotal));
    setText('metric-ticket', fmtMoney(ticket));
    setText('metric-ticket-sub', `${curMon.length} pedido${curMon.length !== 1 ? 's' : ''} este mês`);

    /* Variação mês a mês */
    const chgEl = document.getElementById('metric-month-change');
    if (chgEl) {
        if (change === null) { chgEl.textContent = 'Primeiro mês de dados'; chgEl.className = 'metric-change flat'; }
        else if (change >= 0) { chgEl.textContent = `+${change.toFixed(1)}% vs mês anterior`; chgEl.className = 'metric-change up'; }
        else { chgEl.textContent = `${change.toFixed(1)}% vs mês anterior`; chgEl.className = 'metric-change down'; }
    }

    /* Produto mais vendido */
    const nameShort = String(bestName).length > 22 ? String(bestName).substring(0, 22) + '…' : String(bestName);
    setText('metric-bestseller',     nameShort);
    setText('metric-bestseller-qty', bestQty ? `${bestQty} unidades vendidas` : 'Sem vendas ainda');
}

/* ---- Sales Chart ---- */
async function loadSalesChart(days) {
    document.getElementById('chart-7d')?.classList.toggle('active',  days === 7);
    document.getElementById('chart-30d')?.classList.toggle('active', days === 30);

    const res = await api('GET', '/orders?limit=500');
    if (!res?.ok) return;
    const all = res.data.orders ?? [];

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
                y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + Number(v).toFixed(0), font: { size: 11 } }, grid: { color: '#f3f4f6' } },
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

    async function save() {
        const newStock = Math.max(0, parseInt(input.value) || 0);
        if (newStock !== currentStock) {
            const res = await api('PUT', '/products/' + id, { stock: newStock });
            if (res?.ok) {
                const p = products.find(x => x._id === id);
                if (p) p.stock = newStock;
                toast('Estoque atualizado!', 'success');
            }
        }
        renderProducts();
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') renderProducts(); });
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
    };

    const btn = document.getElementById('btn-save-settings');
    setBtnLoading(btn, true, 'Salvando...');
    const res = await api('PUT', '/settings', body);
    setBtnLoading(btn, false, '<i class="bi bi-check-lg me-1"></i>Salvar configurações');

    if (res?.ok) toast('Configurações salvas!', 'success');
    else toast(res?.data?.error ?? 'Erro ao salvar.', 'danger');
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
