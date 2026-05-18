/* --- BANCO DE DADOS --- */
const products = [
    { id: 1, name: "Ração Natural Premium 15kg", price: 219.90, category: "Ração", img: "https://images.unsplash.com/photo-1589924691195-41432c84c161?auto=format&fit=crop&w=400&q=80" },
    { id: 2, name: "Mordedor Ecológico Corda", price: 45.00, category: "Brinquedos", img: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=400&q=80" },
    { id: 3, name: "Cama Soft Nuvem Cinza", price: 180.00, category: "Acessórios", img: "https://images.unsplash.com/photo-1591946614720-90a587da4a36?auto=format&fit=crop&w=400&q=80" },
    { id: 4, name: "Coleira Verde Oliva Ajustável", price: 69.90, category: "Acessórios", img: "https://plus.unsplash.com/premium_photo-1675802528760-49652a265696?auto=format&fit=crop&w=400&q=80" },
    { id: 5, name: "Snacks Veganos Pote", price: 35.50, category: "Ração", img: "https://images.unsplash.com/photo-1623366302587-b38b1ddaefd9?auto=format&fit=crop&w=400&q=80" },
    { id: 6, name: "Shampoo Hipoalergênico", price: 42.00, category: "Higiene", img: "https://images.unsplash.com/photo-1631729372330-23405dd6263d?auto=format&fit=crop&w=400&q=80" },
    { id: 7, name: "Arranhador Torre Luxo", price: 350.00, category: "Brinquedos", img: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400&q=80" },
    { id: 8, name: "Bebedouro Fonte Cerâmica", price: 120.00, category: "Acessórios", img: "https://images.unsplash.com/photo-1551717743-49959800b1f6?auto=format&fit=crop&w=400&q=80" }
];

let cart = JSON.parse(localStorage.getItem('cart')) || [];

/* --- INICIALIZAÇÃO --- */
document.addEventListener('DOMContentLoaded', () => {
    if (window.AOS) {
        AOS.init({ once: true, offset: 50 });
    }
    
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if (!loader) return;
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }, 800);

    renderProducts(products);
    updateCartUI();

    // Atualiza AOS após render inicial
    if (window.AOS && typeof AOS.refresh === 'function') {
        AOS.refresh();
    }

    // Rota inicial
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(`view-${initialHash}`)) {
        router(initialHash);
    } else {
        router('home');
    }

    // Efeito da navbar ao rolar
    handleNavScroll();
    window.addEventListener('scroll', handleNavScroll);
});

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) router(hash);
});

/* --- NAVBAR SCROLL --- */
function handleNavScroll() {
    const nav = document.querySelector('.glass-nav');
    if (!nav) return;
    if (window.scrollY > 10) {
        nav.classList.add('nav-scrolled');
    } else {
        nav.classList.remove('nav-scrolled');
    }
}

/* --- ROTEAMENTO (SPA) --- */
function router(viewId) {
    window.location.hash = viewId;

    // Atualiza navegação e aria-current
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        if (link.getAttribute('data-target') === viewId) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });

    // Alterna seções
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('d-none');
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('d-none');
        setTimeout(() => target.classList.add('active'), 10);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Fecha menu mobile se estiver aberto
    const navCollapse = document.getElementById('navbarNav');
    if (navCollapse && navCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
    }
}

/* --- LOJA --- */
function renderProducts(list) {
    const container = document.getElementById('products-grid');
    if (!container) return;

    container.innerHTML = '';
    if (list.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5 text-muted">Nenhum produto encontrado.</div>`;
        return;
    }

    list.forEach((p, index) => {
        const card = `
        <div class="col-12 col-md-6 col-lg-3" data-aos="fade-up" data-aos-delay="${index * 50}">
            <div class="card-premium h-100 position-relative">
                <div class="img-wrapper">
                    <img src="${p.img}" alt="${p.name}" class="img-fluid">
                    <div class="position-absolute top-0 start-0 p-3">
                        <span class="badge bg-soft-green text-primary small">${p.category}</span>
                    </div>
                    <div class="position-absolute bottom-0 end-0 p-3 d-flex gap-2">
                        <button class="action-btn" onclick="openQuickView(${p.id})" aria-label="Visualizar ${p.name}"><i class="bi bi-eye"></i></button>
                        <button class="action-btn bg-primary text-white" onclick="addToCart(${p.id})" aria-label="Adicionar ${p.name} à sacola"><i class="bi bi-bag-plus"></i></button>
                    </div>
                </div>
                <div class="card-body p-3">
                    <h6 class="fw-bold mb-1 text-truncate">${p.name}</h6>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-primary fw-bold">${formatMoney(p.price)}</span>
                        <small class="text-muted"><i class="bi bi-star-fill text-warning"></i> 4.9</small>
                    </div>
                </div>
            </div>
        </div>`;
        container.innerHTML += card;
    });

    // Garante que o AOS reconheça os novos elementos
    if (window.AOS && typeof AOS.refresh === 'function') {
        AOS.refresh();
    }
}

function filterProducts(category) {
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(category) || (category === 'all' && btn.innerText === 'Todos')) {
            btn.classList.add('active');
        }
    });
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    renderProducts(filtered);
}

function searchProducts() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const term = input.value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term));
    renderProducts(filtered);
}

function filterAndGo(category) {
    router('shop');
    setTimeout(() => filterProducts(category), 500);
}

/* --- QUICK VIEW & CARRINHO --- */
function openQuickView(id) {
    const p = products.find(i => i.id === id);
    if (!p) return;

    const imgEl = document.getElementById('qv-img');
    const nameEl = document.getElementById('qv-name');
    const priceEl = document.getElementById('qv-price');
    const catEl = document.getElementById('qv-category');
    const btnEl = document.getElementById('qv-btn');
    const modalEl = document.getElementById('quickViewModal');

    if (!imgEl || !nameEl || !priceEl || !catEl || !btnEl || !modalEl) return;

    imgEl.src = p.img;
    imgEl.alt = p.name;
    nameEl.innerText = p.name;
    priceEl.innerText = formatMoney(p.price);
    catEl.innerText = p.category;
    btnEl.onclick = () => { addToCart(p.id); };

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
    updateCartUI();
    showToast(`Adicionado: ${product.name}`);

    const modalEl = document.getElementById('quickViewModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
}

function updateQty(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge');
    const subtotalEl = document.getElementById('cart-subtotal');
    if (!container || !badge || !subtotalEl) return;

    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    badge.innerText = totalQty;
    badge.classList.toggle('d-none', totalQty === 0);

    if (cart.length === 0) {
        container.innerHTML = `
        <div class="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50 text-center">
            <i class="bi bi-basket3 fs-1 mb-3"></i>
            <p class="mb-1">Sua sacola está vazia</p>
            <button onclick="bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas')).hide(); router('shop')" class="btn btn-sm btn-outline-success mt-2">Ir para Loja</button>
        </div>`;
    } else {
        container.innerHTML = cart.map(item => `
            <div class="d-flex gap-3 mb-4">
                <img src="${item.img}" class="rounded-3 border" style="width: 60px; height: 60px; object-fit: cover;" alt="${item.name}">
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between mb-1">
                        <h6 class="mb-0 fw-semibold text-dark text-truncate" style="max-width: 140px;">${item.name}</h6>
                        <span class="fw-bold text-primary">${formatMoney(item.price * item.qty)}</span>
                    </div>
                    <div class="d-flex align-items-center justify-content-between">
                        <small class="text-muted">Un: ${formatMoney(item.price)}</small>
                        <div class="d-flex align-items-center bg-white border rounded px-2 shadow-sm">
                            <i class="bi bi-dash cursor-pointer p-1 text-muted" onclick="updateQty(${item.id}, -1)" aria-label="Diminuir quantidade"></i>
                            <span class="mx-2 small fw-bold">${item.qty}</span>
                            <i class="bi bi-plus cursor-pointer p-1 text-success" onclick="updateQty(${item.id}, 1)" aria-label="Aumentar quantidade"></i>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    subtotalEl.innerText = formatMoney(subtotal);
}

function checkoutWhatsApp() {
    if (cart.length === 0) {
        showToast("Adicione itens à sacola primeiro!");
        return;
    }
    const offcanvasEl = document.getElementById('cartOffcanvas');
    if (offcanvasEl) {
        const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
        if (offcanvas) offcanvas.hide();
    }
    const modalEl = document.getElementById('checkoutModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function finalizeOrder() {
    const deliveryTab = document.getElementById('pills-delivery-tab');
    const addressEl = document.getElementById('delivery-address');
    const paymentEl = document.getElementById('payment-method');

    const isDelivery = deliveryTab && deliveryTab.classList.contains('active');
    const address = addressEl ? addressEl.value : '';
    const payment = paymentEl ? paymentEl.value : 'Pix';

    if (isDelivery && address.trim() === "") {
        alert("Por favor, digite seu endereço para entrega.");
        return;
    }

    let msg = "Olá, *EcoPet*! 🌿\nGostaria de finalizar meu pedido:\n\n";
    let total = 0;
    cart.forEach(item => {
        const parcial = item.price * item.qty;
        total += parcial;
        msg += `▪ ${item.qty}x ${item.name} | ${formatMoney(parcial)}\n`;
    });
    msg += `\n*TOTAL: ${formatMoney(total)}*`;
    msg += "\n----------------------\n";

    if (isDelivery) {
        msg += `🛵 *ENTREGA*\n📍 Endereço: ${address}\n💳 Pagamento: ${payment}`;
    } else {
        msg += `🛍️ *RETIRADA NA LOJA*\nCliente irá buscar o pedido.`;
    }

    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, '_blank');

    const modalEl = document.getElementById('checkoutModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    }
}

function bookService(serviceName) {
    const msg = `Olá! Gostaria de agendar o serviço: *${serviceName}* no Spa EcoPet.`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, '_blank');
}

function showToast(message) {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    const body = toastEl.querySelector('.toast-body');
    if (body) body.innerText = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function formatMoney(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
