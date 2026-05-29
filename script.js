/**
 * Helvinho Rações — aplicação SPA client-side
 *
 * Roteamento via hash (#home, #shop, #about, #contact, #wishlist).
 * Estado do carrinho e da wishlist persistido em localStorage.
 * Checkout disparado por deep link wa.me — sem backend necessário.
 */

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://helvinho-racoes-api.onrender.com/api';

/* Populado via loadProducts() no DOMContentLoaded — nunca acessar antes da Promise resolver */
let products = [];

/* Dados de fallback usados apenas se a API estiver offline */
const PRODUCTS_FALLBACK = [
    {
        id: 1, name: "Ração Golden Adulto Cães 15kg", price: 189.90, originalPrice: 229.90, category: "Ração",
        rating: 4.9, reviews: 312, badge: "Oferta",
        img: "https://images.unsplash.com/photo-1589924691195-41432c84c161?auto=format&fit=crop&w=400&q=80",
        desc: "Ração completa para cães adultos de raças médias e grandes. Rica em proteínas e vitaminas essenciais para saúde e energia diária."
    },
    {
        id: 2, name: "Ração Premium Gatos Adultos 3kg", price: 89.90, category: "Ração",
        rating: 4.8, reviews: 187, badge: null,
        img: "https://images.unsplash.com/photo-1541943869728-4bd4f450c8f5?auto=format&fit=crop&w=400&q=80",
        desc: "Formulada especialmente para gatos adultos. Com taurina e ômega-3 para saúde ocular e pelagem brilhante."
    },
    {
        id: 3, name: "Petisco Natural Bifinho 250g", price: 24.90, category: "Ração",
        rating: 4.9, reviews: 428, badge: "Top",
        img: "https://images.unsplash.com/photo-1623366302587-b38b1ddaefd9?auto=format&fit=crop&w=400&q=80",
        desc: "Petisco saboroso e natural para cães. Ideal para recompensar no adestramento. Sem corantes artificiais."
    },
    {
        id: 4, name: "Ração Filhotes Cães 10kg", price: 149.90, originalPrice: 179.90, category: "Ração",
        rating: 4.8, reviews: 203, badge: "Promoção",
        img: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?auto=format&fit=crop&w=400&q=80",
        desc: "Nutrição balanceada para filhotes em fase de crescimento. Com DHA para desenvolvimento cerebral."
    },
    {
        id: 5, name: "Coleira Ajustável Nylon P/M/G", price: 39.90, category: "Acessórios",
        rating: 4.7, reviews: 156, badge: null,
        img: "https://plus.unsplash.com/premium_photo-1675802528760-49652a265696?auto=format&fit=crop&w=400&q=80",
        desc: "Coleira resistente em nylon com fivela de metal. Disponível em vários tamanhos e cores."
    },
    {
        id: 6, name: "Cama Pelúcia Antialérgica M", price: 119.90, originalPrice: 159.90, category: "Acessórios",
        rating: 4.8, reviews: 94, badge: "Promoção",
        img: "https://images.unsplash.com/photo-1591946614720-90a587da4a36?auto=format&fit=crop&w=400&q=80",
        desc: "Cama confortável com enchimento antialérgico. Lavável na máquina. Tamanho médio ideal para cães de até 12kg."
    },
    {
        id: 7, name: "Comedouro Inox Duplo", price: 59.90, category: "Acessórios",
        rating: 4.7, reviews: 211, badge: "Destaque",
        img: "https://images.unsplash.com/photo-1551717743-49959800b1f6?auto=format&fit=crop&w=400&q=80",
        desc: "Comedouro e bebedouro em inox com suporte antiderrapante. Fácil de limpar e higiênico."
    },
    {
        id: 8, name: "Guia Retátil 5 Metros", price: 69.90, category: "Acessórios",
        rating: 4.6, reviews: 143, badge: null,
        img: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80",
        desc: "Guia retátil com trava de segurança e cabo de nylon reforçado. Suporta até 25kg."
    },
    {
        id: 9, name: "Shampoo Hipoalergênico 500ml", price: 34.90, originalPrice: 49.90, category: "Higiene",
        rating: 4.8, reviews: 267, badge: "Oferta",
        img: "https://images.unsplash.com/photo-1631729372330-23405dd6263d?auto=format&fit=crop&w=400&q=80",
        desc: "Shampoo suave para cães e gatos com pele sensível. Sem parabenos, sulfatos ou corantes artificiais."
    },
    {
        id: 10, name: "Condicionador Pet Neutro 300ml", price: 29.90, category: "Higiene",
        rating: 4.6, reviews: 89, badge: "Novo",
        img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=400&q=80",
        desc: "Condicionador que desembaraça e hidrata a pelagem. Deixa o pelo macio e com brilho natural."
    },
    {
        id: 11, name: "Escova de Dentes Pet + Pasta", price: 22.90, category: "Higiene",
        rating: 4.5, reviews: 112, badge: null,
        img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
        desc: "Kit completo com escova e pasta dental pet. Sabor frango. Previne tártaro e mal hálito."
    },
    {
        id: 12, name: "Antipulgas e Carrapatos — Coleira 8 meses", price: 89.90, originalPrice: 119.90, category: "Medicamentos",
        rating: 4.9, reviews: 445, badge: "Oferta",
        img: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80",
        desc: "Coleira antiparasitária de longa duração. Protege contra pulgas e carrapatos por até 8 meses."
    },
    {
        id: 13, name: "Vermífugo Oral Cães — 4 comp.", price: 28.90, category: "Medicamentos",
        rating: 4.8, reviews: 389, badge: null,
        img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80",
        desc: "Vermífugo de amplo espectro para cães. Combate os principais tipos de vermes intestinais."
    },
    {
        id: 14, name: "Suplemento Vitamínico Cães 30 comp.", price: 54.90, category: "Medicamentos",
        rating: 4.7, reviews: 178, badge: null,
        img: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80",
        desc: "Suplemento multivitamínico para cães adultos. Fortalece imunidade, articulações e pelagem."
    },
    {
        id: 15, name: "Antipulgas Spot-on Gatos — 3 pipetas", price: 64.90, category: "Medicamentos",
        rating: 4.8, reviews: 223, badge: "Novo",
        img: "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?auto=format&fit=crop&w=400&q=80",
        desc: "Antipulgas em pipeta de aplicação tópica para gatos. Ação rápida e proteção de até 4 semanas."
    }
];

/* Busca todos os produtos da API e popula o array global.
   Mapeia _id → id para manter compatibilidade com cart/wishlist que usam p.id. */
async function loadProducts() {
    try {
        /* Timeout de 8s evita travar a tela no cold start do Render free tier */
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(API_BASE + '/products?limit=100', { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        products = data.items.map(p => ({
            id:            p._id,
            name:          p.name,
            price:         p.price,
            originalPrice: p.originalPrice ?? null,
            category:      p.category,
            rating:        p.rating,
            reviews:       p.reviews,
            badge:         p.badge ?? null,
            img:           p.img,
            desc:          p.desc,
            stock:         p.stock,
        }));
    } catch (err) {
        /* API offline: usa dados locais para não quebrar a experiência */
        console.warn('[API] Falha ao carregar produtos — usando dados locais.', err);
        products = PRODUCTS_FALLBACK;
    }
}

/* Estado global — carrinho e wishlist sobrevivem a reloads via localStorage */
let cart     = JSON.parse(localStorage.getItem('helvinhoCart'))     || [];
let wishlist = JSON.parse(localStorage.getItem('helvinhoWishlist')) || [];
let currentFilter   = 'all';
let _routerBusy     = false; // impede que window.location.hash = x dispare o hashchange listener em loop

/* getOrCreateInstance: garante no máximo uma instância Bootstrap por elemento,
   independente de quantas vezes a função for chamada */
function bsModal(id)    { return bootstrap.Modal.getOrCreateInstance(document.getElementById(id)); }
function bsOffcanvas(id){ const el = document.getElementById(id); return el ? bootstrap.Offcanvas.getOrCreateInstance(el) : null; }

/* O router é chamado em toda navegação; cachear as NodeLists evita
   querySelectorAll no DOM a cada troca de view */
let _domCache = null;
function dom() {
    if (!_domCache) {
        _domCache = {
            views:    Array.from(document.querySelectorAll('.view-section')),
            navLinks: Array.from(document.querySelectorAll('.nav-link[data-target]')),
            glassNav: document.querySelector('.glass-nav')
        };
    }
    return _domCache;
}

document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initAOS();
    initSwiper();
    initCustomCursor();
    initNavScroll();
    initSearchListeners();

    updateCartUI();
    updateWishlistBadge();

    const hash = window.location.hash.replace('#', '');
    router(hash && document.getElementById('view-' + hash) ? hash : 'home');

    /* Carrega produtos da API e renderiza — skeletons já foram mostrados pelo router */
    loadProducts().then(() => {
        renderProducts(products);
        renderFeaturedProducts();
    });

    /* { passive: true } libera o browser para fazer scroll sem esperar o callback;
       o flag _scrollTicking evita múltiplas chamadas por frame via RAF throttle */
    let _scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!_scrollTicking) {
            requestAnimationFrame(() => { handleNavScroll(); _scrollTicking = false; });
            _scrollTicking = true;
        }
    }, { passive: true });

    window.addEventListener('hashchange', () => {
        if (_routerBusy) return;
        const h = window.location.hash.replace('#', '');
        if (h) router(h);
    });
});

function initLoader() {
    const el = document.getElementById('loader');
    if (!el) return;
    /* 400 ms cobre o tempo de parse + primeiro render; qualquer valor maior
       só adiciona espera sem benefício perceptível para o usuário */
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        setTimeout(() => el.remove(), 500);
    }, 400);
}

function initAOS() {
    if (!window.AOS) return;
    AOS.init({ once: true, offset: 60, duration: 700, easing: 'ease-out-cubic', throttleDelay: 99 });
}

function initSwiper() {
    if (!window.Swiper) return;
    new Swiper('.testimonials-swiper', {
        slidesPerView: 1,
        spaceBetween: 24,
        loop: true,
        autoplay: { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
        pagination: { el: '.testimonials-pagination', clickable: true },
        watchSlidesProgress: false,
        breakpoints: {
            768:  { slidesPerView: 2 },
            1024: { slidesPerView: 3 }
        }
    });
}

function initCustomCursor() {
    const cursor   = document.getElementById('custom-cursor');
    const follower = document.getElementById('custom-cursor-follower');
    if (!cursor || !follower) return;

    /* pointer: coarse identifica telas touch; cursor customizado não faz sentido nelas */
    if (window.matchMedia('(pointer: coarse)').matches) {
        cursor.style.display = follower.style.display = 'none';
        return;
    }

    let mx = 0, my = 0, fx = 0, fy = 0, rafId = null, dirty = false;

    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        cursor.style.left = mx + 'px';
        cursor.style.top  = my + 'px';
        /* Só agenda RAF quando há movimento real — o loop para sozinho quando
           o follower converge, em vez de rodar indefinidamente */
        if (!dirty) { dirty = true; rafId = requestAnimationFrame(tick); }
    }, { passive: true });

    function tick() {
        const dx = mx - fx, dy = my - fy;
        fx += dx * 0.1; fy += dy * 0.1;
        follower.style.left = fx + 'px';
        follower.style.top  = fy + 'px';
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
            rafId = requestAnimationFrame(tick);
        } else {
            dirty = false;
        }
    }

    /* Cancela o RAF quando a aba vai para segundo plano — sem isso o loop
       continua consumindo CPU sem nenhum pixel ser renderizado */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = null; dirty = false; }
    });

    /* Delegation em vez de listeners por elemento: cobre automaticamente cards
       e botões renderizados dinamicamente após o DOMContentLoaded */
    document.addEventListener('mouseover', e => {
        if (e.target.closest('a, button, [role="button"], .cursor-pointer')) {
            document.body.classList.add('cursor-hover');
        }
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest('a, button, [role="button"], .cursor-pointer')) {
            document.body.classList.remove('cursor-hover');
        }
    });
}

function initNavScroll() { handleNavScroll(); }
function handleNavScroll() {
    const { glassNav } = dom();
    if (glassNav) glassNav.classList.toggle('nav-scrolled', window.scrollY > 10);
}

/* Transição SPA: o truque está na sequência precisa de operações.
   Remove d-none → o elemento entra no layout com opacity:0 (ainda sem .active).
   void offsetWidth força o browser a calcular o layout agora — sem isso ele
   agrupa a remoção do d-none e a adição do .active no mesmo frame e a
   transição CSS nunca é percebida (começa e termina em opacity:1).
   O RAF garante que .active só é adicionado no frame seguinte. */
function router(viewId) {
    _routerBusy = true;
    window.location.hash = viewId;
    _routerBusy = false;

    const { views, navLinks } = dom();

    navLinks.forEach(link => {
        const active = link.getAttribute('data-target') === viewId;
        link.classList.toggle('active', active);
        active ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current');
    });

    views.forEach(s => { s.classList.remove('active'); s.classList.add('d-none'); });

    const target = document.getElementById('view-' + viewId);
    if (target) {
        target.classList.remove('d-none');
        void target.offsetWidth; // força reflow — crítico para a transição funcionar
        requestAnimationFrame(() => {
            target.classList.add('active');
            if (window.AOS) AOS.refresh(); // no mesmo frame para não atrasar animações
            /* Skeleton cobre a transição da view — visível o tempo suficiente para a API responder.
               Com dados locais, o setTimeout simula latência de rede (será substituído por fetch). */
            if (viewId === 'shop') {
                showSkeletonCards(8);
                setTimeout(() => {
                    const list = currentFilter === 'all'
                        ? products
                        : products.filter(p => p.category === currentFilter);
                    renderProducts(list);
                }, 300);
            }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const nav = document.getElementById('navbarNav');
    if (nav && nav.classList.contains('show')) {
        const c = bootstrap.Collapse.getInstance(nav);
        if (c) c.hide();
    }

    if (viewId === 'wishlist') renderWishlistPage();
    if (viewId === 'about')    initStatCounters();
    if (viewId === 'contact')  updateLojaStatus();
}

/* -----------------------------------------------------------
   Renderização de produtos
----------------------------------------------------------- */
function renderProducts(list) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const count = document.getElementById('products-count');
    if (count) {
        count.textContent = list.length === products.length
            ? products.length + ' produtos disponíveis'
            : list.length + ' produto' + (list.length !== 1 ? 's' : '') + ' encontrado' + (list.length !== 1 ? 's' : '');
    }

    if (list.length === 0) {
        grid.innerHTML =
            '<div class="col-12 text-center py-5">' +
            '<i class="bi bi-search fs-1 text-muted opacity-25 d-block mb-3"></i>' +
            '<h5 class="text-muted fw-semibold">Nenhum produto encontrado</h5>' +
            '<p class="text-muted small">Tente outra categoria ou termo de busca.</p>' +
            '<button class="btn-hero-primary mt-2" onclick="filterProducts(\'all\')">Ver Todos</button>' +
            '</div>';
        return;
    }

    grid.innerHTML = list.map((p, i) => buildProductCard(p, i)).join('');
    if (window.AOS) AOS.refresh();
}

function buildProductCard(p, idx) {
    idx = idx || 0;
    const inWL  = wishlist.some(w => w.id === p.id);
    const stars = buildStars(p.rating);
    const delay = Math.min(idx * 60, 300);

    /* Desconto tem prioridade sobre badge textual — se existe originalPrice,
       o percentual calculado é mais informativo do que um rótulo genérico */
    let badgeHtml = '';
    if (p.originalPrice) {
        const pct = Math.round((1 - p.price / p.originalPrice) * 100);
        badgeHtml = '<div class="position-absolute top-0 start-0 p-2 z-2">' +
                    '<span class="badge badge-discount">−' + pct + '%</span></div>';
    } else if (p.badge) {
        const colors = { 'Oferta': 'bg-danger', 'Promoção': 'bg-danger', 'Top': 'bg-warning text-dark',
                         'Novo': 'bg-primary', 'Destaque': 'bg-success', 'Mais Vendido': 'bg-success', 'Premium': 'bg-dark' };
        const cls = colors[p.badge] || 'bg-success';
        badgeHtml = '<div class="position-absolute top-0 start-0 p-2 z-2">' +
                    '<span class="badge ' + cls + ' small px-2 py-1 rounded-pill">' + p.badge + '</span></div>';
    }

    const priceHtml = p.originalPrice
        ? '<div class="card-price-group">' +
              '<span class="card-price-original" aria-label="Preço anterior">' + formatMoney(p.originalPrice) + '</span>' +
              '<span class="card-price">' + formatMoney(p.price) + '</span>' +
          '</div>'
        : '<span class="card-price">' + formatMoney(p.price) + '</span>';

    return '<div class="col-6 col-md-4 col-lg-3" data-aos="fade-up" data-aos-delay="' + delay + '">' +
        '<div class="card-premium h-100">' +
            '<div class="img-wrapper">' +
                badgeHtml +
                '<img src="' + p.img + '" alt="' + escAttr(p.name) + '"' +
                     ' loading="lazy" decoding="async" width="400" height="300"' +
                     ' onerror="this.src=\'https://placehold.co/400x300/e8f5ee/2d9e5f?text=Produto\'">' +
                '<div class="card-actions" role="group" aria-label="Ações">' +
                    '<button class="action-btn" onclick="openQuickView(\'' + p.id + '\')"' +
                            ' aria-label="Ver detalhes de ' + escAttr(p.name) + '" title="Visualizar">' +
                        '<i class="bi bi-eye" aria-hidden="true"></i></button>' +
                    '<button class="action-btn' + (inWL ? ' wishlisted' : '') + '"' +
                            ' onclick="toggleWishlist(\'' + p.id + '\', this)"' +
                            ' aria-label="' + (inWL ? 'Remover dos favoritos' : 'Adicionar aos favoritos') + '"' +
                            ' title="Favoritar">' +
                        '<i class="bi bi-heart' + (inWL ? '-fill' : '') + '" aria-hidden="true"></i></button>' +
                '</div>' +
            '</div>' +
            '<div class="card-body-inner">' +
                '<div class="card-category-badge">' + p.category + '</div>' +
                '<p class="card-product-name" title="' + escAttr(p.name) + '">' + p.name + '</p>' +
                '<div class="d-flex align-items-center justify-content-between mb-3">' +
                    priceHtml +
                    '<div class="card-rating" aria-label="Nota ' + p.rating + ' de 5">' +
                        '<span class="stars" aria-hidden="true">' + stars + '</span>' +
                        '<small class="ms-1">(' + p.reviews + ')</small>' +
                    '</div>' +
                '</div>' +
                '<div class="card-btn-group">' +
                    '<button class="card-add-btn" onclick="addToCart(\'' + p.id + '\')"' +
                            ' aria-label="Adicionar ' + escAttr(p.name) + ' ao carrinho">' +
                        '<i class="bi bi-bag-plus me-1" aria-hidden="true"></i>Adicionar' +
                    '</button>' +
                    '<button class="card-wa-btn" onclick="orderDirectWhatsApp(\'' + p.id + '\')"' +
                            ' aria-label="Pedir ' + escAttr(p.name) + ' pelo WhatsApp" title="Pedir pelo WhatsApp">' +
                        '<i class="bi bi-whatsapp" aria-hidden="true"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div></div>';
}

function buildStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '<i class="bi bi-star-fill"></i>'.repeat(full) +
           (half ? '<i class="bi bi-star-half"></i>' : '') +
           '<i class="bi bi-star"></i>'.repeat(empty);
}

function renderFeaturedProducts() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    /* Um produto de cada categoria garante diversidade visual no home —
       slice(0,4) mostraria apenas rações, que são os primeiros do array */
    const categories = ['Ração', 'Acessórios', 'Higiene', 'Medicamentos'];
    const featured = categories.map(cat => products.find(p => p.category === cat)).filter(Boolean);
    if (featured.length < 4) {
        products.forEach(p => { if (featured.length < 4 && !featured.includes(p)) featured.push(p); });
    }
    grid.innerHTML = featured.map((p, i) => buildProductCard(p, i)).join('');
    if (window.AOS) AOS.refresh();
}

/* -----------------------------------------------------------
   Filtros e busca
----------------------------------------------------------- */
function filterProducts(category) {
    currentFilter = category;

    /* Comparo data-filter em vez de textContent para não depender de espaços
       ou caracteres Unicode que variam entre navegadores (ç, ã, etc.) */
    document.querySelectorAll('.btn-filter').forEach(btn => {
        const active = btn.getAttribute('data-filter') === category;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });

    const list = category === 'all' ? products : products.filter(p => p.category === category);
    renderProducts(list);
}

function filterAndGo(category) {
    router('shop');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) suggestions.classList.remove('visible');
    /* 460 ms cobre a transição de entrada da view (400 ms) + margem de segurança;
       aplicar o filtro antes causaria AOS.refresh() sem elementos visíveis */
    setTimeout(() => filterProducts(category), 460);
}

/* -----------------------------------------------------------
   Busca com autocomplete
----------------------------------------------------------- */
let _searchTimer;

function searchProducts() {
    clearTimeout(_searchTimer);
    /* 200 ms de debounce: responde rápido o suficiente para parecer instantâneo,
       mas evita filtrar a cada tecla em digitações contínuas */
    _searchTimer = setTimeout(_doSearch, 200);
}

function _doSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const term = input.value.toLowerCase().trim();
    const suggestions = document.getElementById('search-suggestions');

    if (suggestions) {
        if (term.length >= 2) {
            const hits = products.filter(p => p.name.toLowerCase().includes(term)).slice(0, 5);
            if (hits.length) {
                suggestions.innerHTML = hits.map(p =>
                    '<div class="suggestion-item" role="option" tabindex="0"' +
                         ' onclick="selectSuggestion(\'' + p.id + '\')"' +
                         ' onkeydown="if(event.key===\'Enter\')selectSuggestion(\'' + p.id + '\')">' +
                        '<img src="' + p.img + '" alt="" loading="lazy"' +
                             ' onerror="this.src=\'https://placehold.co/36x36/e8f5ee/2d9e5f?text=P\'">' +
                        '<div>' +
                            '<div class="fw-semibold">' + highlightTerm(p.name, term) + '</div>' +
                            '<small class="text-muted">' + p.category + ' · ' + formatMoney(p.price) + '</small>' +
                        '</div>' +
                    '</div>'
                ).join('');
            } else {
                suggestions.innerHTML =
                    '<div class="suggestion-item text-muted">' +
                    '<i class="bi bi-search me-2"></i>Sem resultados para "' + escHtml(term) + '"</div>';
            }
            suggestions.classList.add('visible');
        } else {
            suggestions.classList.remove('visible');
        }
    }

    const list = term
        ? products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term) ||
            (p.desc && p.desc.toLowerCase().includes(term))
          )
        : (currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter));

    renderProducts(list);
}

function highlightTerm(text, term) {
    if (!term) return escHtml(text);
    const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escHtml(text).replace(re, '<mark>$1</mark>');
}

function selectSuggestion(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const input = document.getElementById('search-input');
    if (input) input.value = product.name;
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) suggestions.classList.remove('visible');
    renderProducts([product]);
}

function initSearchListeners() {
    /* Ambos os listeners são globais — mais simples e mais confiável do que
       blur no input, que dispara antes do click na sugestão e esconde o dropdown */
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrapper')) {
            const s = document.getElementById('search-suggestions');
            if (s) s.classList.remove('visible');
        }
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const s = document.getElementById('search-suggestions');
            if (s) s.classList.remove('visible');
        }
    });
}

/* -----------------------------------------------------------
   Quick View
----------------------------------------------------------- */
function openQuickView(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;

    const img = document.getElementById('qv-img');
    if (img) { img.src = p.img; img.alt = p.name; }

    const name = document.getElementById('qv-name');
    if (name) name.textContent = p.name;

    const price = document.getElementById('qv-price');
    if (price) price.textContent = formatMoney(p.price);

    const origRow = document.getElementById('qv-original-price-row');
    const origEl = document.getElementById('qv-original-price');
    const discBadge = document.getElementById('qv-discount-badge');
    if (origRow && origEl && discBadge) {
        if (p.originalPrice) {
            const pct = Math.round((1 - p.price / p.originalPrice) * 100);
            origEl.textContent = formatMoney(p.originalPrice);
            discBadge.textContent = '-' + pct + '%';
            origRow.classList.remove('d-none');
        } else {
            origRow.classList.add('d-none');
        }
    }

    const cat = document.getElementById('qv-category');
    if (cat) cat.textContent = p.category;

    const desc = document.getElementById('qv-desc');
    if (desc) desc.textContent = p.desc || 'Produto premium selecionado para o bem-estar do seu pet.';

    const addBtn = document.getElementById('qv-btn');
    if (addBtn) {
        addBtn.innerHTML = '<i class="bi bi-bag-plus me-2"></i>Adicionar à Sacola';
        addBtn.onclick = () => addToCart(p.id);
    }

    const wishBtn = document.getElementById('qv-wish-btn');
    if (wishBtn) {
        const inWL = wishlist.some(w => w.id === p.id);
        wishBtn.innerHTML = '<i class="bi bi-heart' + (inWL ? '-fill' : '') + '"></i>';
        wishBtn.classList.toggle('active', inWL);
        wishBtn.setAttribute('aria-label', inWL ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        wishBtn.onclick = () => {
            toggleWishlist(p.id, null);
            const nowIn = wishlist.some(w => w.id === p.id);
            wishBtn.innerHTML = '<i class="bi bi-heart' + (nowIn ? '-fill' : '') + '"></i>';
            wishBtn.classList.toggle('active', nowIn);
            wishBtn.setAttribute('aria-label', nowIn ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        };
    }

    bsModal('quickViewModal').show();
}

/* -----------------------------------------------------------
   Carrinho
----------------------------------------------------------- */
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty++;
    } else {
        /* Persisto apenas os campos usados na UI do carrinho — desc, rating e
           originalPrice não são necessários aqui e aumentariam o payload no localStorage */
        cart.push({
            id:    product.id,
            name:  product.name,
            price: product.price,
            img:   product.img,
            qty:   1
        });
    }

    saveCart();
    updateCartUI();
    showToast('<i class="bi bi-bag-check-fill me-2"></i>' + product.name + ' adicionado!');

    const qvEl = document.getElementById('quickViewModal');
    if (qvEl) {
        const qvInstance = bootstrap.Modal.getInstance(qvEl);
        if (qvInstance) qvInstance.hide();
    }

    const cartBtn = document.querySelector('[data-bs-target="#cartOffcanvas"]');
    if (cartBtn) {
        cartBtn.style.transform = 'scale(1.35)';
        setTimeout(() => { cartBtn.style.transform = ''; }, 280);
    }
}

/* skipConfirm=true quando a remoção é consequência de qty chegar a zero —
   o usuário já expressou intenção ao clicar em "−" repetidamente */
async function removeFromCart(id, skipConfirm = false) {
    if (!skipConfirm) {
        const ok = await showConfirm('Remover este produto da sacola?');
        if (!ok) return;
    }
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
    showToast('<i class="bi bi-trash3 me-2"></i>Produto removido da sacola.');
}

function updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(id, true); // remoção implícita: qty chegou a zero, sem diálogo de confirmação
    } else {
        saveCart();
        updateCartUI();
    }
}

function saveCart() {
    localStorage.setItem('helvinhoCart', JSON.stringify(cart));
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const badge     = document.getElementById('cart-badge');
    const subtotalEl = document.getElementById('cart-subtotal');
    if (!container || !badge || !subtotalEl) return;

    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    badge.textContent = totalQty;
    badge.classList.toggle('d-none', totalQty === 0);

    if (cart.length === 0) {
        container.innerHTML =
            '<div class="cart-empty-state">' +
                '<i class="bi bi-handbag" aria-hidden="true"></i>' +
                '<p class="fw-semibold mb-1">Sua sacola está vazia</p>' +
                '<p class="small mb-3">Adicione produtos e volte aqui!</p>' +
                '<button class="btn-hero-primary" style="font-size:.82rem;padding:10px 22px;"' +
                        ' onclick="closeCartAndGo(\'shop\')">' +
                    '<i class="bi bi-shop me-2" aria-hidden="true"></i>Ir para Loja' +
                '</button>' +
            '</div>';
    } else {
        container.innerHTML = cart.map(item =>
            '<div class="cart-item">' +
                '<img src="' + item.img + '" class="cart-item-img" alt="' + escAttr(item.name) + '"' +
                     ' loading="lazy" onerror="this.src=\'https://placehold.co/64x64/e8f5ee/2d9e5f?text=Pet\'">' +
                '<div class="flex-grow-1" style="min-width:0">' +
                    '<div class="d-flex justify-content-between align-items-start gap-2 mb-1">' +
                        '<span class="fw-semibold text-dark small text-truncate" style="max-width:145px;">' +
                            escHtml(item.name) +
                        '</span>' +
                        '<span class="fw-bold text-success small flex-shrink-0">' +
                            formatMoney(item.price * item.qty) +
                        '</span>' +
                    '</div>' +
                    '<small class="text-muted d-block mb-2">' + formatMoney(item.price) + ' / un.</small>' +
                    '<div class="d-flex align-items-center justify-content-between">' +
                        '<div class="cart-item-qty">' +
                            '<button class="qty-btn" onclick="updateQty(' + item.id + ',-1)"' +
                                    ' aria-label="Diminuir quantidade">' +
                                '<i class="bi bi-dash" aria-hidden="true"></i></button>' +
                            '<span class="qty-num" aria-live="polite">' + item.qty + '</span>' +
                            '<button class="qty-btn" onclick="updateQty(' + item.id + ',1)"' +
                                    ' aria-label="Aumentar quantidade">' +
                                '<i class="bi bi-plus" aria-hidden="true"></i></button>' +
                        '</div>' +
                        '<button class="qty-btn" onclick="removeFromCart(' + item.id + ')"' +
                                ' aria-label="Remover do carrinho" style="color:#e53e3e;">' +
                            '<i class="bi bi-trash3" aria-hidden="true"></i></button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        ).join('');
    }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    subtotalEl.textContent = formatMoney(total);
}

/* Navega para outra view fechando o offcanvas primeiro.
   O evento hidden.bs.offcanvas garante que a navegação só acontece
   depois que a animação de fechamento do painel terminou */
function closeCartAndGo(viewId) {
    const oc = bsOffcanvas('cartOffcanvas');
    if (oc) {
        const el = document.getElementById('cartOffcanvas');
        el.addEventListener('hidden.bs.offcanvas', function handler() {
            el.removeEventListener('hidden.bs.offcanvas', handler);
            router(viewId);
        });
        oc.hide();
    } else {
        router(viewId);
    }
}

/* -----------------------------------------------------------
   Checkout via WhatsApp
----------------------------------------------------------- */
function checkoutWhatsApp() {
    if (cart.length === 0) {
        showToast('<i class="bi bi-exclamation-circle me-2"></i>Adicione itens à sacola primeiro!');
        return;
    }

    const oc = bsOffcanvas('cartOffcanvas');
    if (oc) {
        const el = document.getElementById('cartOffcanvas');
        /* Aguardo hidden.bs.offcanvas antes de abrir o modal de checkout —
           Bootstrap não empilha Offcanvas + Modal sem conflito de z-index */
        el.addEventListener('hidden.bs.offcanvas', function handler() {
            el.removeEventListener('hidden.bs.offcanvas', handler);
            bsModal('checkoutModal').show();
        });
        oc.hide();
    } else {
        bsModal('checkoutModal').show();
    }
}

function finalizeOrder() {
    const isDelivery = document.getElementById('pills-delivery-tab')?.classList.contains('active') ?? true;
    const address    = (document.getElementById('delivery-address')?.value || '').trim();
    const payment    = document.getElementById('payment-method')?.value || 'Pix';

    if (isDelivery && !address) {
        showToast('<i class="bi bi-exclamation-triangle me-2"></i>Informe o endereço de entrega.');
        return;
    }

    let msg   = '🐾 Olá, *Helvinho Rações*!\nGostaria de fazer um pedido:\n\n';
    let total = 0;

    cart.forEach(item => {
        const sub = item.price * item.qty;
        total += sub;
        msg += '▪ ' + item.qty + 'x ' + item.name + ' → ' + formatMoney(sub) + '\n';
    });

    msg += '\n*TOTAL: ' + formatMoney(total) + '*\n';
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += isDelivery
        ? '🛵 *ENTREGA*\n📍 ' + address + '\n💳 Pagamento: ' + payment
        : '🛍️ *RETIRADA NA LOJA*\nAv. das Patas, 1234 — Jardins, SP';

    window.open('https://wa.me/5511999999999?text=' + encodeURIComponent(msg), '_blank');

    /* Limpa o carrinho imediatamente após abrir o WhatsApp — o pedido já
       está na conversa e manter itens causaria confusão num próximo acesso */
    cart = [];
    saveCart();
    updateCartUI();

    const checkoutInst = bootstrap.Modal.getInstance(document.getElementById('checkoutModal'));
    if (checkoutInst) checkoutInst.hide();

    showToast('<i class="bi bi-check-circle-fill me-2"></i>Pedido enviado! Aguarde o contato da loja.');
}

/* Atalho para compra avulsa — abre WhatsApp direto sem passar pelo carrinho */
function orderDirectWhatsApp(id) {
    const p = products.find(pr => pr.id === id);
    if (!p) return;

    const precoInfo = p.originalPrice
        ? 'Por *' + formatMoney(p.price) + '* ~~' + formatMoney(p.originalPrice) + '~~'
        : '*' + formatMoney(p.price) + '*';

    const msg = '🐾 Olá, *Helvinho Rações*!\n\n' +
                'Gostaria de pedir:\n' +
                '▪ 1x ' + p.name + '\n' +
                precoInfo + '\n\n' +
                'Poderia confirmar disponibilidade e prazo de entrega? 😊';

    window.open('https://wa.me/5511999999999?text=' + encodeURIComponent(msg), '_blank');
}


/* -----------------------------------------------------------
   Wishlist
----------------------------------------------------------- */
function toggleWishlist(id, btnEl) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const idx = wishlist.findIndex(w => w.id === id);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast('<i class="bi bi-heart me-2"></i>Removido dos favoritos.');
    } else {
        wishlist.push({ id: product.id, name: product.name, price: product.price,
                        originalPrice: product.originalPrice, img: product.img,
                        category: product.category, rating: product.rating, reviews: product.reviews,
                        badge: product.badge, desc: product.desc });
        showToast('<i class="bi bi-heart-fill me-2"></i>' + product.name + ' nos favoritos!');
    }

    localStorage.setItem('helvinhoWishlist', JSON.stringify(wishlist));
    updateWishlistBadge();

    /* Atualiza só o botão clicado — re-renderizar o grid inteiro perderia
       a posição de scroll e piscaria visualmente */
    if (btnEl) {
        const nowIn = wishlist.some(w => w.id === id);
        btnEl.classList.toggle('wishlisted', nowIn);
        const icon = btnEl.querySelector('i');
        if (icon) icon.className = 'bi bi-heart' + (nowIn ? '-fill' : '');
        btnEl.setAttribute('aria-label', nowIn ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
    }
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlist-badge');
    if (!badge) return;
    badge.textContent = wishlist.length;
    badge.classList.toggle('d-none', wishlist.length === 0);
}

function renderWishlistPage() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    if (wishlist.length === 0) {
        grid.innerHTML =
            '<div class="col-12 wishlist-empty">' +
                '<i class="bi bi-heart" aria-hidden="true"></i>' +
                '<h5 class="fw-semibold">Sua lista de desejos está vazia</h5>' +
                '<p class="small">Explore a loja e salve seus produtos favoritos!</p>' +
                '<button class="btn-hero-primary mt-3" onclick="router(\'shop\')">' +
                    '<i class="bi bi-shop me-2"></i>Explorar Loja</button>' +
            '</div>';
        return;
    }
    grid.innerHTML = wishlist.map((p, i) => buildProductCard(p, i)).join('');
    if (window.AOS) AOS.refresh();
}

/* -----------------------------------------------------------
   Newsletter
----------------------------------------------------------- */
async function handleNewsletter(event) {
    event.preventDefault();
    const input = event.target.querySelector('input[type="email"]');
    if (!input) return;
    const email = input.value.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('<i class="bi bi-exclamation-circle me-2"></i>E-mail inválido!');
        return;
    }
    try {
        const res  = await fetch(API_BASE + '/contact/newsletter', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email }),
        });
        const data = await res.json();
        showToast('<i class="bi bi-envelope-check-fill me-2"></i>' + (data.message || 'Cadastrado com sucesso!'));
        event.target.reset();
    } catch {
        showToast('<i class="bi bi-exclamation-circle me-2"></i>Erro ao cadastrar. Tente novamente.');
    }
}

/* -----------------------------------------------------------
   Formulário de contato
----------------------------------------------------------- */
async function handleContactForm(event) {
    event.preventDefault();
    const name    = (document.getElementById('contact-name')?.value    || '').trim();
    const email   = (document.getElementById('contact-email')?.value   || '').trim();
    const message = (document.getElementById('contact-message')?.value || '').trim();

    if (!name || !message) {
        showToast('<i class="bi bi-exclamation-circle me-2"></i>Preencha nome e mensagem.');
        return;
    }

    const btn = event.target.querySelector('[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    try {
        await fetch(API_BASE + '/contact', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, email: email || 'nao-informado@helvinho.com', message }),
        });
        showToast('<i class="bi bi-check-circle-fill me-2"></i>Mensagem enviada! Retornaremos em breve.');
        event.target.reset();
    } catch {
        showToast('<i class="bi bi-exclamation-circle me-2"></i>Erro ao enviar. Tente novamente.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-send-fill me-2"></i>Enviar Mensagem'; }
    }
}

/* -----------------------------------------------------------
   Contador animado — página Sobre
----------------------------------------------------------- */
function initStatCounters() {
    const numbers = document.querySelectorAll('.stat-number[data-target]');
    if (!numbers.length) return;

    /* Reinicio em zero a cada entrada na view — quem volta à página Sobre
       espera ver a animação de novo, não o número já estático */
    numbers.forEach(el => { el.textContent = '0'; });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el       = entry.target;
            const target   = parseInt(el.getAttribute('data-target'), 10);
            const suffix   = el.getAttribute('data-suffix') || '+';
            const duration = 1800;
            const start    = performance.now();

            const tick = now => {
                const p = Math.min((now - start) / duration, 1);
                const v = Math.round((1 - Math.pow(1 - p, 3)) * target);
                el.textContent = (target >= 100 ? v.toLocaleString('pt-BR') : v) + suffix;
                if (p < 1) {
                    requestAnimationFrame(tick);
                } else {
                    el.textContent = (target >= 100 ? target.toLocaleString('pt-BR') : target) + suffix;
                }
            };
            requestAnimationFrame(tick);
            observer.unobserve(el);
        });
    }, { threshold: 0.4 });

    numbers.forEach(el => observer.observe(el));
}

/* -----------------------------------------------------------
   Status da loja em tempo real
----------------------------------------------------------- */
function updateLojaStatus() {
    const el = document.getElementById('loja-status');
    if (!el) return;

    const now    = new Date();
    const day    = now.getDay(); // 0 = domingo … 6 = sábado
    const hour   = now.getHours();
    const minute = now.getMinutes();
    const time   = hour + minute / 60; // hora decimal facilita comparação de intervalo

    /* Índice alinha com getDay(): schedule[0] = domingo, schedule[6] = sábado */
    const schedule = [
        { open: 10, close: 16 }, // Dom
        { open: 8,  close: 20 }, // Seg
        { open: 8,  close: 20 }, // Ter
        { open: 8,  close: 20 }, // Qua
        { open: 8,  close: 20 }, // Qui
        { open: 8,  close: 20 }, // Sex
        { open: 9,  close: 18 }  // Sáb
    ];

    const { open, close } = schedule[day];
    const isOpen = time >= open && time < close;

    if (isOpen) {
        const remaining = Math.round((close - time) * 60);
        const hrs  = Math.floor(remaining / 60);
        const mins = remaining % 60;
        const fechaEm = hrs > 0 ? hrs + 'h' + (mins > 0 ? mins + 'min' : '') : mins + 'min';
        el.textContent = '🟢 Aberto agora · Fecha em ' + fechaEm;
        el.className = 'hours-status aberto';
    } else {
        let nextDay  = (day + 1) % 7;
        let nextOpen = schedule[nextDay].open;
        const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        el.textContent = '🔴 Fechado agora · Abre ' + diasSemana[nextDay] + ' às ' + nextOpen + 'h';
        el.className = 'hours-status fechado';
    }
}

/* -----------------------------------------------------------
   Utilitários
----------------------------------------------------------- */
function showToast(htmlMsg) {
    const toastEl = document.getElementById('liveToast');
    if (!toastEl) return;
    const body = toastEl.querySelector('.toast-body');
    if (body) body.innerHTML = htmlMsg;
    /* Duração escala com o comprimento do texto — mensagens curtas somem rápido,
       mensagens longas ficam visíveis tempo suficiente para serem lidas */
    const len   = htmlMsg.replace(/<[^>]+>/g, '').length;
    const delay = Math.max(2000, Math.min(8000, 1500 + len * 15));
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay }).show();
}

function formatMoney(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* Preenche o grid com n cards placeholder enquanto os dados reais carregam.
   Cada card replica a estrutura de .card-premium para não causar reflow ao substituir. */
function showSkeletonCards(n) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    const card =
        '<div class="col-6 col-md-4 col-lg-3">' +
            '<div class="skeleton-card">' +
                '<div class="skeleton-img"></div>' +
                '<div class="skeleton-body">' +
                    '<div class="skeleton-line skeleton-line-title"></div>' +
                    '<div class="skeleton-line skeleton-line-sub"></div>' +
                    '<div class="skeleton-line skeleton-line-price"></div>' +
                '</div>' +
            '</div>' +
        '</div>';
    grid.innerHTML = Array(n).fill(card).join('');
}

/* Promise-based confirm — retorna true/false quando o usuário clica em Remover/Cancelar.
   Usar await neste ponto mantém o fluxo linear sem callbacks aninhados. */
function showConfirm(message) {
    return new Promise(resolve => {
        const modal  = document.getElementById('confirmModal');
        const msgEl  = document.getElementById('confirm-message');
        const btnYes = document.getElementById('confirm-yes');
        const btnNo  = document.getElementById('confirm-no');
        /* Fallback defensivo: se o modal não existir no DOM (ex.: testes unitários), confirma automaticamente */
        if (!modal || !btnYes || !btnNo) { resolve(true); return; }
        if (msgEl) msgEl.textContent = message;

        const bs = bootstrap.Modal.getOrCreateInstance(modal);

        function cleanup() {
            btnYes.removeEventListener('click', onYes);
            btnNo.removeEventListener('click', onNo);
            bs.hide();
        }
        function onYes() { cleanup(); resolve(true); }
        function onNo()  { cleanup(); resolve(false); }

        btnYes.addEventListener('click', onYes, { once: true });
        btnNo.addEventListener('click', onNo,  { once: true });
        bs.show();
    });
}

/* Funções de escape usadas em toda string que vai para innerHTML —
   sem isso, nomes de produtos com aspas ou < quebram o HTML gerado (XSS) */
function escAttr(str) {
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
