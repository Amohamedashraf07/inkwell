/* ============================================================
   INKWELL — now backed by a real API (Node/Express + MongoDB)
   instead of in-memory data. Everything you buy, borrow, or
   save now lives in a real database and survives refreshes,
   logouts, and redeploys.

   ⚠️ THE ONE LINE YOU MUST EDIT AFTER DEPLOYING YOUR BACKEND:
   Change API_BASE below to wherever your backend ends up
   running (see README.md for hosting steps).
   ============================================================ */
const API_BASE = window.INKWELL_API_BASE || 'http://localhost:5000/api';

let authToken = localStorage.getItem('inkwell_token') || null;
let currentUser = null; // { id, name, email, username, role, status, joined, borrowed }

async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    const res = await fetch(API_BASE + path, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
        const err = new Error((data && data.message) || `Request failed (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}

function shade(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + percent, g = ((n >> 8) & 0xff) + percent, b = (n & 0xff) + percent;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
}
function initials(name) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function toast(msg, isError) {
    const wrap = document.getElementById('toastWrap');
    const t = document.createElement('div'); t.className = 'toast';
    if (isError) t.style.borderLeftColor = 'var(--coral)';
    t.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>${msg}</span>`;
    wrap.appendChild(t); setTimeout(() => t.remove(), 2700);
}
function animateCount(el, target, suffix) {
    suffix = suffix || '';
    const t0 = performance.now(); const dur = 900;
    function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}
document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const r = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.className = 'ripple'; r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size / 2) + 'px';
    r.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(r); setTimeout(() => r.remove(), 600);
});

const GENRES = ['All', 'Fiction', 'Sci-Fi', 'Romance', 'Mystery', 'Biography', 'Business', 'Poetry', 'History'];

/* ============================================================
   LOGIN GATE
   ============================================================ */
async function setupGate() {
    try {
        const [publicBooks, stats] = await Promise.all([
            apiFetch('/books'),
            apiFetch('/stats/public').catch(() => ({ titles: 0, readers: 0, pct: 98 })),
        ]);
        const shelf = document.getElementById('shelf');
        const topBooks = [...publicBooks].sort((a, b) => b.borrowed - a.borrowed).slice(0, 10);
        topBooks.forEach((b, i) => {
            const el = document.createElement('div');
            el.className = 'spine';
            const h = 84 + Math.round(b.rating * 10) + (i % 3) * 6;
            el.style.height = h + 'px';
            el.style.background = `linear-gradient(180deg, ${b.spine}, ${shade(b.spine, -18)})`;
            el.style.animationDelay = (i * 0.07) + 's';
            el.title = `${b.title} — ${b.author}`;
            el.innerHTML = `<span>${b.title}</span>`;
            shelf.appendChild(el);
        });
        setTimeout(() => {
            animateCount(document.getElementById('statTitles'), publicBooks.length, '+');
            animateCount(document.getElementById('statReaders'), stats.readers || 0);
            animateCount(document.getElementById('statPct'), stats.pct || 98, '%');
        }, 400);
    } catch (ex) {
        // gate stats are decorative — fail quietly if the API isn't reachable yet
        console.warn('Could not load gate stats:', ex.message);
    }

    const hero = document.getElementById('hero');
    for (let i = 0; i < 10; i++) {
        const d = document.createElement('div');
        d.className = 'drift';
        const size = 4 + Math.random() * 10;
        d.style.width = size + 'px'; d.style.height = (size * 1.4) + 'px';
        d.style.left = Math.random() * 100 + '%'; d.style.bottom = '-40px';
        d.style.animationDuration = (10 + Math.random() * 10) + 's';
        d.style.animationDelay = (Math.random() * 8) + 's';
        hero.appendChild(d);
    }
}

const tabs = document.querySelectorAll('.tab');
const panels = { user: document.getElementById('panelUser'), admin: document.getElementById('panelAdmin'), signup: document.getElementById('panelSignup') };
function showTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    Object.keys(panels).forEach(k => panels[k].style.display = k === name ? 'block' : 'none');
}
tabs.forEach(t => t.onclick = () => showTab(t.dataset.tab));
document.querySelectorAll('[data-goto]').forEach(a => a.onclick = (e) => { e.preventDefault(); showTab(a.dataset.goto); });

document.getElementById('userLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('userIdInput').value.trim();
    const pw = document.getElementById('userPassInput').value.trim();
    const err = document.getElementById('userLoginError');
    const btn = document.getElementById('userLoginSubmit');
    err.style.display = 'none';
    btn.textContent = 'Opening the shelf…'; btn.disabled = true;
    try {
        const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username: id, password: pw, wantAdmin: false }) });
        authToken = data.token; localStorage.setItem('inkwell_token', authToken);
        await enterUserApp(data.user);
    } catch (ex) {
        err.textContent = ex.message; err.style.display = 'block';
    } finally {
        btn.textContent = 'Enter the library'; btn.disabled = false;
    }
});

document.getElementById('adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('adminIdInput').value.trim();
    const pw = document.getElementById('adminPassInput').value.trim();
    const err = document.getElementById('adminLoginError');
    const btn = document.getElementById('adminLoginSubmit');
    err.style.display = 'none';
    btn.textContent = 'Unlocking the desk…'; btn.disabled = true;
    try {
        const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username: id, password: pw, wantAdmin: true }) });
        authToken = data.token; localStorage.setItem('inkwell_token', authToken);
        await enterAdminApp(data.user);
    } catch (ex) {
        err.textContent = ex.message; err.style.display = 'block';
    } finally {
        btn.textContent = 'Enter the admin desk'; btn.disabled = false;
    }
});

document.getElementById('signupForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('suName').value.trim();
    const email = document.getElementById('suEmail').value.trim();
    const id = document.getElementById('suId').value.trim();
    const pw = document.getElementById('suPass').value.trim();
    const err = document.getElementById('signupError');
    const btn = document.getElementById('signupSubmit');
    err.style.display = 'none';
    btn.textContent = 'Setting up your shelf…'; btn.disabled = true;
    try {
        const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, username: id, password: pw }) });
        authToken = data.token; localStorage.setItem('inkwell_token', authToken);
        await enterUserApp(data.user);
    } catch (ex) {
        err.textContent = ex.message; err.style.display = 'block';
    } finally {
        btn.textContent = 'Create my account'; btn.disabled = false;
    }
});

async function enterUserApp(user) {
    currentUser = user;
    document.getElementById('loginGate').classList.add('hidden');
    document.getElementById('appUser').classList.add('visible');
    const ini = initials(user.name);
    document.getElementById('userSbAvatar').textContent = ini;
    document.getElementById('userSbName').textContent = user.name;
    document.getElementById('userSbId').textContent = user.username;
    document.getElementById('userHeaderAvatar').textContent = ini;
    document.getElementById('profileAvatar').textContent = ini;
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileJoined').textContent = 'Member since ' + new Date(user.joined).toISOString().slice(0, 10);
    await initUserApp();
}
async function enterAdminApp(user) {
    currentUser = user;
    document.getElementById('loginGate').classList.add('hidden');
    document.getElementById('appAdmin').classList.add('visible');
    const ini = initials(user.name);
    document.getElementById('adminSbAvatar').textContent = ini;
    document.getElementById('adminSbName').textContent = user.name;
    document.getElementById('adminSbId').textContent = user.username;
    document.getElementById('adminHeaderAvatar').textContent = ini;
    await initAdminApp();
}
document.querySelectorAll('[data-logout]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        currentUser = null; authToken = null; localStorage.removeItem('inkwell_token');
        document.getElementById('appUser').classList.remove('visible');
        document.getElementById('appAdmin').classList.remove('visible');
        document.getElementById('loginGate').classList.remove('hidden');
        showTab('user');
    });
});
document.querySelectorAll('[data-collapse]').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.collapse).classList.toggle('collapsed'));
});

/* try to resume a saved session before showing the login gate */
(async function boot() {
    await setupGate();
    if (!authToken) return;
    try {
        const data = await apiFetch('/auth/me');
        if (['Admin', 'Editor'].includes(data.user.role)) await enterAdminApp(data.user);
        else await enterUserApp(data.user);
    } catch (ex) {
        authToken = null; localStorage.removeItem('inkwell_token');
    }
})();

/* ============================================================
   USER APP LOGIC
   ============================================================ */
let userAppInit = false;
let books = [], library = [], wishlist = [], cart = [];

async function loadUserData() {
    const [b, l, w, c] = await Promise.all([
        apiFetch('/books'), apiFetch('/library'), apiFetch('/wishlist'), apiFetch('/cart'),
    ]);
    books = b; library = l; wishlist = w; cart = c;
}
function ownedIds() { return new Set(library.map(l => l.bookId)); }
function wishedIds() { return new Set(wishlist.map(w => w.bookId)); }

async function initUserApp() {
    if (userAppInit) { await refreshUserDynamic(); return; }
    userAppInit = true;

    document.querySelectorAll('#appUser .spine-link').forEach(link => {
        link.onclick = () => {
            document.querySelectorAll('#appUser .spine-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('#appUser .section').forEach(s => s.classList.remove('active'));
            document.getElementById('sec-' + link.dataset.section).classList.add('active');
            if (link.dataset.section === 'library') renderLibrary();
            if (link.dataset.section === 'profile') renderProfile();
            if (link.dataset.section === 'wishlist') renderWishlist();
            if (link.dataset.section === 'cart') renderCart();
            if (link.dataset.section === 'orders') renderOrders();
        };
    });

    let activeGenre = 'All', query = '';
    const chipRow = document.getElementById('genreChips');
    GENRES.forEach(g => {
        const c = document.createElement('div');
        c.className = 'chip' + (g === 'All' ? ' active' : '');
        c.textContent = g;
        c.onclick = () => { activeGenre = g; document.querySelectorAll('#genreChips .chip').forEach(x => x.classList.remove('active')); c.classList.add('active'); renderGrid(); };
        chipRow.appendChild(c);
    });
    document.getElementById('searchInput').addEventListener('input', e => { query = e.target.value.toLowerCase(); renderGrid(); });

    function showSkeleton() {
        document.getElementById('bookGrid').innerHTML = Array.from({ length: 8 }).map(() => `
<div class="skel-card"><div class="skel-cover"></div><div class="skel-line"></div><div class="skel-line short"></div></div>`).join('');
    }

    function renderGrid() {
        const grid = document.getElementById('bookGrid');
        const filtered = books.filter(b =>
            (activeGenre === 'All' || b.genre === activeGenre) &&
            (b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query))
        );
        document.getElementById('countLabel').textContent = `${filtered.length} title${filtered.length !== 1 ? 's' : ''} available`;
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No books match your search.</p></div>`;
            return;
        }
        grid.innerHTML = '';
        const owned = ownedIds();
        filtered.forEach((b, i) => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.style.animationDelay = (i * 0.035) + 's';
            const available = b.copies - b.borrowed;
            const isOwned = owned.has(b._id);
            const wished = wishedIds().has(b._id);
            card.innerHTML = `
<div class="cover" style="background-image:url('${b.coverUrl}');">
<span class="genre-tag">${b.genre}</span>
<button class="wish-btn ${wished ? 'active' : ''}" data-wish="${b._id}" title="Wishlist"><svg class="icon" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
<span class="avail-tag">${isOwned ? 'In your library' : (available > 0 ? available + ' avail.' : 'Waitlist')}</span>
</div>
<div class="book-info">
<h3>${b.title}</h3>
<p class="author">${b.author}</p>
<div class="book-meta">
<span class="stars"><svg class="icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${b.rating.toFixed(1)}</span>
<span>${b.year}</span>
</div>
<div class="card-buy-row">
<span class="price-tag">$${b.price.toFixed(2)}</span>
<button class="btn btn-brass btn-sm" data-addcart="${b._id}">Add to cart</button>
</div>
</div>`;
            card.onclick = () => openDetail(b._id);
            card.querySelector('[data-wish]').onclick = async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                try {
                    const result = await apiFetch('/wishlist/toggle', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                    wishlist = await apiFetch('/wishlist');
                    toast(result.wishlisted ? `Added "${b.title}" to wishlist` : `Removed "${b.title}" from wishlist`);
                    btn.classList.toggle('active', result.wishlisted);
                    btn.querySelector('svg').setAttribute('fill', result.wishlisted ? 'currentColor' : 'none');
                    updateCartWishCounts();
                } catch (ex) { toast(ex.message, true); }
            };
            card.querySelector('[data-addcart]').onclick = async (e) => {
                e.stopPropagation();
                try {
                    await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                    cart = await apiFetch('/cart');
                    toast(`"${b.title}" added to cart`);
                    updateCartWishCounts();
                } catch (ex) { toast(ex.message, true); }
            };
            grid.appendChild(card);
        });
    }

    const overlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    function closeModal() { overlay.classList.remove('open'); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    async function openDetail(id) {
        const b = books.find(x => x._id === id);
        if (!b) return;
        const isOwned = ownedIds().has(id);
        const available = b.copies - b.borrowed;
        const wished = wishedIds().has(b._id);

        let revData = { average: b.rating, count: 0, reviews: [] };
        try { revData = await apiFetch('/reviews/' + id); if (revData.average == null) revData.average = b.rating; } catch (ex) { /* fall back to base rating */ }
        const mine = revData.reviews.find(r => r.userId === currentUser.id);

        modalContent.innerHTML = `
<div class="detail-head">
<div class="detail-cover" style="background-image:url('${b.coverUrl}');"></div>
<div class="detail-body">
<h2>${b.title}</h2>
<p class="author">by ${b.author} · ${b.year}</p>
<div class="detail-tags">
<span class="badge badge-brass">${b.genre}</span>
<span class="badge badge-sage">★ ${revData.average.toFixed(1)} (${revData.count} review${revData.count !== 1 ? 's' : ''})</span>
<span class="badge badge-coral">${b.pages} pages</span>
</div>
<p class="mono" style="font-size:0.77rem; color:var(--muted);">${available} of ${b.copies} copies available</p>
<p style="font-family:'Fraunces',serif; font-weight:600; font-size:1.4rem; color:var(--brass-dark); margin-top:10px;">$${b.price.toFixed(2)}</p>
</div>
</div>
<p class="detail-desc">${b.desc}</p>
<div class="detail-footer">
<button class="btn btn-ghost" id="closeModalBtn">Close</button>
<button class="btn btn-ghost" id="wishBtn">${wished ? '♥ Wishlisted' : '♡ Wishlist'}</button>
<button class="btn btn-ghost" id="cartBtn">Add to cart</button>
<button class="btn btn-brass grow" id="buyBtn">Buy now</button>
</div>
<div class="detail-footer" style="margin-top:8px;">
<button class="btn btn-ghost grow" id="borrowBtn" ${isOwned || available <= 0 ? 'disabled' : ''}>
${isOwned ? 'Already in your library' : (available <= 0 ? 'No copies available' : 'Borrow this book')}
</button>
</div>
<div class="review-section">
<h3 style="font-size:1rem; margin-bottom:10px;">Reviews</h3>
<div id="reviewForm"></div>
<div id="reviewList">${revData.reviews.length === 0 ? '<p class="mono" style="font-size:0.8rem;color:var(--muted);">No reviews yet — be the first.</p>' : revData.reviews.map(r => `
<div class="review-item">
<div class="review-item-head"><strong>${r.userName}</strong><span class="stars">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</span></div>
<p>${r.text}</p><span class="mono" style="font-size:0.7rem;color:var(--muted);">${new Date(r.date).toISOString().slice(0, 10)}</span>
</div>`).join('')}</div>
</div>`;
        overlay.classList.add('open');
        document.getElementById('closeModalBtn').onclick = closeModal;
        document.getElementById('wishBtn').onclick = async () => {
            try {
                const result = await apiFetch('/wishlist/toggle', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                wishlist = await apiFetch('/wishlist');
                toast(result.wishlisted ? `Added "${b.title}" to wishlist` : `Removed from wishlist`);
                document.getElementById('wishBtn').textContent = result.wishlisted ? '♥ Wishlisted' : '♡ Wishlist';
                updateCartWishCounts();
            } catch (ex) { toast(ex.message, true); }
        };
        document.getElementById('cartBtn').onclick = async () => {
            try {
                await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                cart = await apiFetch('/cart');
                toast(`"${b.title}" added to cart`);
                updateCartWishCounts();
            } catch (ex) { toast(ex.message, true); }
        };
        document.getElementById('buyBtn').onclick = async () => {
            try {
                await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                cart = await apiFetch('/cart');
                updateCartWishCounts();
                closeModal();
                openCheckout();
            } catch (ex) { toast(ex.message, true); }
        };
        document.getElementById('borrowBtn').onclick = async () => {
            try {
                library = await apiFetch('/library/borrow', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                books = await apiFetch('/books');
                toast(`"${b.title}" added to your library`);
                closeModal(); renderGrid(); updateLibCount();
            } catch (ex) { toast(ex.message, true); }
        };
        renderReviewForm(b._id, mine);
    }

    function renderReviewForm(bookId, mine) {
        const box = document.getElementById('reviewForm');
        let sel = mine ? mine.rating : 0;
        box.innerHTML = `
<div class="review-form">
<div class="star-picker" id="starPicker">${[1, 2, 3, 4, 5].map(n => `<svg data-star="${n}" class="icon star-pick ${n <= sel ? 'on' : ''}" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('')}</div>
<textarea id="reviewText" rows="2" placeholder="Share your thoughts on this book…">${mine ? mine.text : ''}</textarea>
<button class="btn btn-brass btn-sm" id="submitReviewBtn">${mine ? 'Update review' : 'Post review'}</button>
</div>`;
        box.querySelectorAll('[data-star]').forEach(s => {
            s.onclick = () => {
                sel = +s.dataset.star;
                box.querySelectorAll('[data-star]').forEach(x => x.classList.toggle('on', +x.dataset.star <= sel));
            };
        });
        document.getElementById('submitReviewBtn').onclick = async () => {
            const text = document.getElementById('reviewText').value.trim();
            if (!sel || !text) { toast('Add a star rating and a comment'); return; }
            try {
                await apiFetch('/reviews/' + bookId, { method: 'POST', body: JSON.stringify({ rating: sel, text }) });
                toast('Review posted — thank you');
                openDetail(bookId);
            } catch (ex) { toast(ex.message, true); }
        };
    }

    function renderLibrary() {
        const list = document.getElementById('libraryList');
        if (library.length === 0) {
            list.innerHTML = `<div class="empty-state"><svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>Your library is empty — borrow a book from Discover to start reading.</p></div>`;
            return;
        }
        list.innerHTML = '';
        library.forEach((m, i) => {
            const b = m.book;
            if (!b) return;
            const row = document.createElement('div');
            row.className = 'lib-card';
            row.style.animationDelay = (i * 0.06) + 's';
            row.innerHTML = `
<div class="lib-cover" style="background-image:url('${b.coverUrl}');"></div>
<div class="lib-body">
<h3>${b.title} <span class="badge ${m.source === 'Purchased' ? 'badge-azure' : 'badge-sage'}" style="font-size:0.62rem;">${m.source || 'Borrowed'}</span></h3>
<p class="author">${b.author}</p>
<div class="progress-track"><div class="progress-fill" data-w="${m.progress}"></div></div>
<div class="progress-label"><span>${m.status}</span><span>${m.progress}%</span></div>
</div>
<div class="lib-actions">
<button class="btn btn-sm btn-ghost" data-progress="${m.bookId}">${m.progress >= 100 ? 'Read again' : '+10% progress'}</button>
${m.source === 'Purchased' ? '' : `<button class="btn btn-sm btn-danger" data-return="${m.bookId}">Return</button>`}
</div>`;
            list.appendChild(row);
        });
        requestAnimationFrame(() => setTimeout(() => {
            list.querySelectorAll('.progress-fill').forEach(el => { el.style.width = el.dataset.w + '%'; });
        }, 60));
        list.querySelectorAll('[data-progress]').forEach(btn => {
            btn.onclick = async () => {
                const bookId = btn.dataset.progress;
                const m = library.find(x => x.bookId === bookId);
                const next = m.progress >= 100 ? 0 : Math.min(100, m.progress + 10);
                try {
                    library = await apiFetch('/library/' + bookId + '/progress', { method: 'PUT', body: JSON.stringify({ progress: next }) });
                    renderLibrary();
                    if (next >= 100) toast('Nicely done — book finished!');
                } catch (ex) { toast(ex.message, true); }
            };
        });
        list.querySelectorAll('[data-return]').forEach(btn => {
            btn.onclick = async () => {
                const bookId = btn.dataset.return;
                const b = library.find(x => x.bookId === bookId).book;
                try {
                    library = await apiFetch('/library/return', { method: 'POST', body: JSON.stringify({ bookId }) });
                    books = await apiFetch('/books');
                    toast(`Returned "${b.title}"`);
                    renderLibrary(); renderGrid(); updateLibCount();
                } catch (ex) { toast(ex.message, true); }
            };
        });
    }

    function renderProfile() {
        animateCount(document.getElementById('pStat1'), library.filter(m => m.status === 'Reading').length);
        animateCount(document.getElementById('pStat2'), library.filter(m => m.status === 'Finished').length);
    }
    function updateLibCount() { document.getElementById('libCountPill').textContent = library.length; }
    function updateCartWishCounts() {
        document.getElementById('cartCountPill').textContent = cart.reduce((s, c) => s + c.qty, 0);
        document.getElementById('wishCountPill').textContent = wishlist.length;
    }

    function renderWishlist() {
        const grid = document.getElementById('wishlistGrid');
        if (wishlist.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><svg class="icon" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg><p>Your wishlist is empty — tap the heart on any book to save it here.</p></div>`;
            return;
        }
        grid.innerHTML = '';
        wishlist.forEach((w, i) => {
            const b = w.book;
            const card = document.createElement('div');
            card.className = 'book-card';
            card.style.animationDelay = (i * 0.05) + 's';
            card.innerHTML = `
<div class="cover" style="background-image:url('${b.coverUrl}');">
<span class="genre-tag">${b.genre}</span>
<button class="wish-btn active" data-wish="${b._id}" title="Remove from wishlist"><svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
</div>
<div class="book-info">
<h3>${b.title}</h3>
<p class="author">${b.author}</p>
<div class="card-buy-row">
<span class="price-tag">$${b.price.toFixed(2)}</span>
<button class="btn btn-brass btn-sm" data-addcart="${b._id}">Add to cart</button>
</div>
</div>`;
            card.onclick = (e) => { if (!e.target.closest('button')) openDetail(b._id); };
            card.querySelector('[data-wish]').onclick = async () => {
                await apiFetch('/wishlist/toggle', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                wishlist = await apiFetch('/wishlist');
                renderWishlist(); updateCartWishCounts();
            };
            card.querySelector('[data-addcart]').onclick = async () => {
                await apiFetch('/cart', { method: 'POST', body: JSON.stringify({ bookId: b._id }) });
                cart = await apiFetch('/cart');
                toast(`"${b.title}" added to cart`); updateCartWishCounts();
            };
            grid.appendChild(card);
        });
    }

    function renderCart() {
        const list = document.getElementById('cartList');
        const summary = document.getElementById('cartSummary');
        if (cart.length === 0) {
            list.innerHTML = `<div class="empty-state"><svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg><p>Your cart is empty — add a few books from Discover.</p></div>`;
            summary.style.display = 'none';
            return;
        }
        list.innerHTML = '';
        cart.forEach((c, i) => {
            const b = c.book;
            const row = document.createElement('div');
            row.className = 'cart-row';
            row.style.animationDelay = (i * 0.05) + 's';
            row.innerHTML = `
<div class="cover-thumb" style="background-image:url('${b.coverUrl}');"></div>
<div class="cart-body">
<h3 style="font-size:0.95rem;">${b.title}</h3>
<p class="author" style="font-size:0.78rem;color:var(--muted);">${b.author} · $${b.price.toFixed(2)} each</p>
</div>
<div class="qty-stepper">
<button data-dec="${c.bookId}">−</button><span class="mono">${c.qty}</span><button data-inc="${c.bookId}">+</button>
</div>
<strong class="mono">$${(b.price * c.qty).toFixed(2)}</strong>
<button class="icon-btn danger" title="Remove" data-remove="${c.bookId}"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
            list.appendChild(row);
        });
        list.querySelectorAll('[data-inc]').forEach(btn => btn.onclick = async () => { const c = cart.find(x => x.bookId === btn.dataset.inc); cart = await apiFetch('/cart/' + btn.dataset.inc, { method: 'PUT', body: JSON.stringify({ qty: c.qty + 1 }) }); renderCart(); updateCartWishCounts(); });
        list.querySelectorAll('[data-dec]').forEach(btn => btn.onclick = async () => {
            const c = cart.find(x => x.bookId === btn.dataset.dec);
            if (c.qty <= 1) { cart = await apiFetch('/cart/' + btn.dataset.dec, { method: 'DELETE' }); }
            else { cart = await apiFetch('/cart/' + btn.dataset.dec, { method: 'PUT', body: JSON.stringify({ qty: c.qty - 1 }) }); }
            renderCart(); updateCartWishCounts();
        });
        list.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = async () => { cart = await apiFetch('/cart/' + btn.dataset.remove, { method: 'DELETE' }); toast('Removed from cart'); renderCart(); updateCartWishCounts(); });
        const subtotal = cart.reduce((s, c) => s + c.book.price * c.qty, 0);
        const tax = Math.round(subtotal * 0.08 * 100) / 100;
        summary.style.display = 'block';
        document.getElementById('cartSubtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('cartTax').textContent = '$' + tax.toFixed(2);
        document.getElementById('cartTotalAmt').textContent = '$' + (subtotal + tax).toFixed(2);
        document.getElementById('checkoutBtn').onclick = openCheckout;
    }

    function openCheckout() {
        if (cart.length === 0) { toast('Your cart is empty'); return; }
        const subtotal = cart.reduce((s, c) => s + c.book.price * c.qty, 0);
        const tax = Math.round(subtotal * 0.08 * 100) / 100;
        modalContent.innerHTML = `
<div class="modal-head"><h2 style="font-size:1.3rem;">Checkout</h2></div>
<div class="form-grid">
<div class="field" style="grid-column:1/-1;"><label>Name on card</label><input id="fCardName" value="${currentUser.name}"></div>
<div class="field" style="grid-column:1/-1;"><label>Card number</label><input id="fCardNum" placeholder="4242 4242 4242 4242" maxlength="19"></div>
<div class="field"><label>Expiry</label><input id="fExp" placeholder="MM/YY" maxlength="5"></div>
<div class="field"><label>CVC</label><input id="fCvc" placeholder="123" maxlength="4"></div>
</div>
<p class="mono" style="padding:0 26px; font-size:0.72rem; color:var(--muted);">This is a mock checkout — no real payment is processed. Your order is still saved for real in the database.</p>
<div class="cart-summary" style="margin:14px 26px;">
<div class="sum-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
<div class="sum-row"><span>Estimated tax</span><span>$${tax.toFixed(2)}</span></div>
<div class="sum-row total"><span>Total</span><span>$${(subtotal + tax).toFixed(2)}</span></div>
</div>
<div class="modal-foot">
<button class="btn btn-ghost" id="cancelCheckoutBtn">Cancel</button>
<button class="btn btn-brass" id="confirmCheckoutBtn">Place order</button>
</div>`;
        overlay.classList.add('open');
        document.getElementById('cancelCheckoutBtn').onclick = closeModal;
        document.getElementById('confirmCheckoutBtn').onclick = async () => {
            const num = document.getElementById('fCardNum').value.trim();
            if (num.replace(/\s/g, '').length < 12) { toast('Enter a card number'); return; }
            try {
                const order = await apiFetch('/orders/checkout', { method: 'POST' });
                closeModal();
                toast(`Order placed — $${order.total.toFixed(2)}`);
                [books, library, cart] = await Promise.all([apiFetch('/books'), apiFetch('/library'), apiFetch('/cart')]);
                updateCartWishCounts(); updateLibCount(); renderGrid();
            } catch (ex) { toast(ex.message, true); }
        };
    }

    async function renderOrders() {
        const list = document.getElementById('ordersList');
        list.innerHTML = `<div class="empty-state"><p>Loading your orders…</p></div>`;
        let orders;
        try { orders = await apiFetch('/orders'); } catch (ex) { toast(ex.message, true); return; }
        if (orders.length === 0) {
            list.innerHTML = `<div class="empty-state"><p>No orders yet — your purchases will show up here.</p></div>`;
            return;
        }
        list.innerHTML = orders.map((o, i) => `
<div class="order-card" style="animation-delay:${i * 0.06}s">
<div class="order-card-head"><strong class="mono">#${String(o.id).slice(-8)}</strong><span class="badge badge-sage">${o.status}</span></div>
<p class="mono" style="font-size:0.72rem; color:var(--muted); margin-bottom:8px;">${new Date(o.date).toISOString().slice(0, 10)}</p>
${o.items.map(it => `<div class="order-item-line"><span>${it.qty} × ${it.title}</span><span>$${(it.price * it.qty).toFixed(2)}</span></div>`).join('')}
<div class="order-item-line" style="border-top:1px dashed var(--line); margin-top:6px; padding-top:8px; font-weight:700; color:var(--ink-text);"><span>Total</span><span>$${o.total.toFixed(2)}</span></div>
</div>`).join('');
    }

    window._refreshUserDynamic = async () => { await loadUserData(); renderGrid(); updateLibCount(); updateCartWishCounts(); };
    showSkeleton();
    await loadUserData();
    renderGrid(); updateLibCount(); updateCartWishCounts();
}
async function refreshUserDynamic() { if (window._refreshUserDynamic) await window._refreshUserDynamic(); }

/* ============================================================
   ADMIN APP LOGIC
   ============================================================ */
let adminAppInit = false;
let bookSort = { key: null, dir: 1 };
let userSort = { key: null, dir: 1 };
let adminBooks = [], adminUsers = [], adminOrders = [];

async function initAdminApp() {
    if (adminAppInit) { await renderDashboard(); return; }
    adminAppInit = true;

    document.querySelectorAll('#appAdmin .spine-link').forEach(link => {
        link.onclick = () => {
            document.querySelectorAll('#appAdmin .spine-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('#appAdmin .section').forEach(s => s.classList.remove('active'));
            document.getElementById('sec-' + link.dataset.section).classList.add('active');
            if (link.dataset.section === 'dashboard') renderDashboard();
            if (link.dataset.section === 'books') renderBooks();
            if (link.dataset.section === 'users') renderUsers();
            if (link.dataset.section === 'adminorders') renderAdminOrders();
        };
    });

    async function renderAdminOrders() {
        const tbody = document.getElementById('ordersTbody');
        let orders;
        try { orders = await apiFetch('/orders/all'); } catch (ex) { toast(ex.message, true); return; }
        adminOrders = orders;
        if (orders.length === 0) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No orders placed yet.</div></td></tr>`; return; }
        tbody.innerHTML = orders.map(o => `
<tr>
<td class="mono">#${String(o.id).slice(-8)}</td>
<td class="row-title">${o.userName}</td>
<td>${o.items.reduce((s, i) => s + i.qty, 0)} item${o.items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : ''}</td>
<td class="mono">$${o.total.toFixed(2)}</td>
<td>${new Date(o.date).toISOString().slice(0, 10)}</td>
<td><span class="badge badge-sage">${o.status}</span></td>
</tr>`).join('');
    }

    const overlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    function closeModal() { overlay.classList.remove('open'); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    async function renderDashboard() {
        let books, users, orders;
        try {
            [books, users, orders] = await Promise.all([apiFetch('/books'), apiFetch('/users'), apiFetch('/orders/all')]);
        } catch (ex) { toast(ex.message, true); return; }
        adminBooks = books; adminUsers = users; adminOrders = orders;

        const totalCopies = books.reduce((s, b) => s + b.copies, 0);
        const totalBorrowed = books.reduce((s, b) => s + b.borrowed, 0);
        const activeUsers = users.filter(u => u.status === 'Active' && u.role !== 'Admin').length;
        const avgRating = books.length ? (books.reduce((s, b) => s + b.rating, 0) / books.length).toFixed(1) : '0.0';
        const revenue = orders.reduce((s, o) => s + o.total, 0);
        const stats = [
            { label: 'Total titles', value: books.length, delta: `${totalCopies} copies total`, bg: 'rgba(198,151,73,0.15)', color: 'var(--brass-dark)', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
            { label: 'Copies circulating', value: totalBorrowed, delta: `of ${totalCopies} total`, bg: 'rgba(95,122,104,0.15)', color: 'var(--sage)', icon: '<path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/>' },
            { label: 'Active readers', value: activeUsers, delta: `${users.length} total accounts`, bg: 'rgba(62,92,118,0.15)', color: 'var(--azure)', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' },
            { label: 'Avg. rating', value: avgRating, delta: 'across catalog', bg: 'rgba(217,105,79,0.15)', color: 'var(--coral-dark)', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
            { label: 'Revenue', value: '$' + revenue.toFixed(2), delta: `${orders.length} orders`, bg: 'rgba(198,151,73,0.2)', color: 'var(--brass-dark)', icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
        ];
        const row = document.getElementById('statRow');
        row.innerHTML = stats.map((s, i) => `
<div class="stat-card" style="animation-delay:${i * 0.06}s">
<div class="top"><span class="label">${s.label}</span><span class="ic-badge" style="background:${s.bg}; color:${s.color};"><svg class="icon" viewBox="0 0 24 24">${s.icon}</svg></span></div>
<strong id="statVal${i}">0</strong><span class="delta">${s.delta}</span>
</div>`).join('');
        stats.forEach((s, i) => {
            const el = document.getElementById('statVal' + i);
            setTimeout(() => { if (typeof s.value === 'number') animateCount(el, s.value); else el.textContent = s.value; }, 150);
        });

        const top = [...books].sort((a, b) => b.borrowed - a.borrowed).slice(0, 6);
        const max = Math.max(...top.map(b => b.borrowed), 1);
        document.getElementById('barChart').innerHTML = top.map(b => `
<div class="bar-row"><div class="name">${b.title}</div>
<div class="bar-track"><div class="bar-fill" style="background:linear-gradient(90deg, ${b.spine}, ${shade(b.spine, -20)})" data-w="${(b.borrowed / max * 100)}"></div></div>
<div class="val">${b.borrowed}</div></div>`).join('');
        setTimeout(() => document.getElementById('barChart').querySelectorAll('.bar-fill').forEach(el => { el.style.width = el.dataset.w + '%'; }), 100);

        // recent activity — built from the newest real orders and newest accounts
        const activity = [];
        orders.slice(0, 4).forEach(o => activity.push({ text: `${o.userName} purchased ${o.items.length} book${o.items.length !== 1 ? 's' : ''} for $${o.total.toFixed(2)}`, time: new Date(o.date) }));
        [...users].sort((a, b) => new Date(b.joined) - new Date(a.joined)).slice(0, 2).forEach(u => activity.push({ text: `${u.name} joined Inkwell`, time: new Date(u.joined) }));
        activity.sort((a, b) => b.time - a.time);
        document.getElementById('activityFeed').innerHTML = activity.length ? activity.slice(0, 6).map(a => `
<div class="activity-item"><div class="activity-dot"></div><div><p>${a.text}</p><span>${a.time.toISOString().slice(0, 10)}</span></div></div>`).join('')
            : `<div class="empty-state">No activity yet.</div>`;

        const byGenre = {};
        books.forEach(b => { byGenre[b.genre] = (byGenre[b.genre] || 0) + 1; });
        const genreList = Object.entries(byGenre).sort((a, b) => b[1] - a[1]);
        const donutColors = ['#C69749', '#5F7A68', '#3E5C76', '#D9694F', '#8A5A3D', '#6B4C6B', '#3F5747', '#7A4F3A'];
        let acc = 0; const segments = [];
        genreList.forEach(([g, count], i) => { const pct = books.length ? count / books.length * 100 : 0; segments.push(`${donutColors[i % donutColors.length]} ${acc}% ${acc + pct}%`); acc += pct; });
        document.getElementById('donut').style.background = `conic-gradient(${segments.join(',') || '#eee 0% 100%'})`;
        animateCount(document.getElementById('donutTotal'), books.length);
        document.getElementById('donutLegend').innerHTML = genreList.map(([g, count], i) => `
<div class="legend-item"><span class="legend-dot" style="background:${donutColors[i % donutColors.length]}"></span>${g} <span style="color:var(--muted); margin-left:auto;">${count}</span></div>`).join('');

        const health = [
            { label: 'Copies available', value: totalCopies - totalBorrowed, max: totalCopies || 1, color: 'var(--sage)' },
            { label: 'Copies borrowed', value: totalBorrowed, max: totalCopies || 1, color: 'var(--brass)' },
            { label: 'Overdue (est.)', value: Math.round(totalBorrowed * 0.08), max: totalCopies || 1, color: 'var(--coral)' },
        ];
        document.getElementById('circHealth').innerHTML = health.map(h => `
<div class="bar-row"><div class="name">${h.label}</div>
<div class="bar-track"><div class="bar-fill" style="background:${h.color}" data-w="${(h.value / h.max * 100)}"></div></div>
<div class="val">${h.value}</div></div>`).join('');
        setTimeout(() => document.getElementById('circHealth').querySelectorAll('.bar-fill').forEach(el => { el.style.width = el.dataset.w + '%'; }), 150);
    }

    function sortData(arr, key, dir) {
        if (!key) return arr;
        return [...arr].sort((a, b) => {
            const av = a[key], bv = b[key];
            if (typeof av === 'number') return (av - bv) * dir;
            return String(av).localeCompare(String(bv)) * dir;
        });
    }

    let bookQuery = '';
    async function renderBooks() {
        const tbody = document.getElementById('booksTbody');
        try { adminBooks = await apiFetch('/books'); } catch (ex) { toast(ex.message, true); return; }
        let books = adminBooks.filter(b => b.title.toLowerCase().includes(bookQuery) || b.author.toLowerCase().includes(bookQuery));
        books = sortData(books, bookSort.key, bookSort.dir);
        if (books.length === 0) { tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state">No books match "${bookQuery}".</div></td></tr>`; return; }
        tbody.innerHTML = books.map(b => `
<tr>
<td><span class="swatch" style="background-image:url('${b.coverUrl}');"></span></td>
<td class="row-title">${b.title}</td>
<td>${b.author}</td>
<td><span class="badge badge-brass">${b.genre}</span></td>
<td>${b.copies}</td>
<td>${b.borrowed}</td>
<td>★ ${b.rating}</td>
<td class="mono">$${(b.price || 0).toFixed(2)}</td>
<td><div class="row-actions">
<button class="icon-btn" title="Edit" data-edit="${b._id}"><svg class="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
<button class="icon-btn danger" title="Delete" data-del="${b._id}"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
</div></td>
</tr>`).join('');
        tbody.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => openBookForm(btn.dataset.edit));
        tbody.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
            const b = adminBooks.find(x => x._id === btn.dataset.del);
            if (confirm(`Delete "${b.title}" from the catalog?`)) {
                try { await apiFetch('/books/' + btn.dataset.del, { method: 'DELETE' }); toast(`Deleted "${b.title}"`); renderBooks(); }
                catch (ex) { toast(ex.message, true); }
            }
        });
    }
    document.getElementById('bookSearch').addEventListener('input', e => { bookQuery = e.target.value.toLowerCase(); renderBooks(); });
    document.getElementById('addBookBtn').onclick = () => openBookForm(null);
    document.querySelectorAll('#sec-books thead th[data-sort]').forEach(th => {
        th.onclick = () => { const key = th.dataset.sort; bookSort.dir = (bookSort.key === key) ? -bookSort.dir : 1; bookSort.key = key; renderBooks(); };
    });

    async function fetchCoverFromGoogleBooks(title, author) {
        try {
            const q = encodeURIComponent(`intitle:${title}${author ? ' inauthor:' + author : ''}`);
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
            if (!res.ok) return '';
            const data = await res.json();
            const item = data.items && data.items[0];
            const img = item && item.volumeInfo && item.volumeInfo.imageLinks;
            if (!img) return '';
            return (img.thumbnail || img.smallThumbnail || '').replace('http://', 'https://').replace('zoom=1', 'zoom=2');
        } catch (e) { return ''; }
    }

    function openBookForm(id) {
        const editing = !!id;
        const b = editing ? adminBooks.find(x => x._id === id) : { title: '', author: '', genre: 'Fiction', year: new Date().getFullYear(), copies: 5, rating: 4.0, pages: 250, desc: '', price: 12.99, coverUrl: `https://picsum.photos/seed/inkwell-new/400/600` };
        modalContent.innerHTML = `
<div class="modal-head"><h2 style="font-size:1.3rem;">${editing ? 'Edit book' : 'Add a new book'}</h2></div>
<div style="padding:0 26px 6px; display:flex; gap:14px; align-items:center;">
<div id="coverPreview" style="width:64px; height:90px; border-radius:8px; background-size:cover; background-position:center; background-color:var(--parchment-3); flex-shrink:0; background-image:url('${b.coverUrl}');"></div>
<div>
<p class="mono" id="coverStatus" style="font-size:0.72rem; color:var(--muted);">${b.cover ? 'Real cover on file' : 'Cover will be fetched automatically from Google Books on save'}</p>
<div style="display:flex; gap:8px; margin-top:6px;">
<button type="button" class="btn btn-ghost btn-sm" id="refetchCoverBtn">Fetch cover now</button>
<button type="button" class="btn btn-ghost btn-sm" id="uploadCoverBtn">Upload from device</button>
<input type="file" id="coverFileInput" accept="image/*" style="display:none;">
</div>
</div>
</div>
<div class="form-grid">
<div class="field"><label>Title</label><input id="fTitle" value="${b.title}" required></div>
<div class="field"><label>Author</label><input id="fAuthor" value="${b.author}" required></div>
<div class="field"><label>Genre</label><select id="fGenre">${GENRES.filter(g => g !== 'All').map(g => `<option ${g === b.genre ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
<div class="field"><label>Year</label><input id="fYear" type="number" value="${b.year}"></div>
<div class="field"><label>Total copies</label><input id="fCopies" type="number" min="1" value="${b.copies}"></div>
<div class="field"><label>Rating (0-5)</label><input id="fRating" type="number" step="0.1" min="0" max="5" value="${b.rating}"></div>
<div class="field"><label>Price ($)</label><input id="fPrice" type="number" step="0.01" min="0" value="${(b.price || 0).toFixed(2)}"></div>
<div class="field" style="grid-column:1/-1;"><label>Description</label><textarea id="fDesc" rows="3">${b.desc}</textarea></div>
</div>
<div class="modal-foot">
<button class="btn btn-ghost" id="cancelBtn">Cancel</button>
<button class="btn btn-brass" id="saveBookBtn">${editing ? 'Save changes' : 'Add book'}</button>
</div>`;
        overlay.classList.add('open');
        let fetchedCover = b.cover || '';
        document.getElementById('cancelBtn').onclick = closeModal;
        document.getElementById('refetchCoverBtn').onclick = async () => {
            const title = document.getElementById('fTitle').value.trim();
            const author = document.getElementById('fAuthor').value.trim();
            if (!title) { toast('Enter a title first'); return; }
            document.getElementById('coverStatus').textContent = 'Looking up cover…';
            const url = await fetchCoverFromGoogleBooks(title, author);
            if (url) {
                fetchedCover = url;
                document.getElementById('coverPreview').style.backgroundImage = `url('${url}')`;
                document.getElementById('coverStatus').textContent = 'Real cover found';
                if (editing) { try { await apiFetch('/books/' + id, { method: 'PUT', body: JSON.stringify({ cover: url }) }); toast('Cover updated'); renderBooks(); } catch (ex) { toast(ex.message, true); } }
            } else {
                document.getElementById('coverStatus').textContent = 'No cover found — using placeholder';
            }
        };
        document.getElementById('uploadCoverBtn').onclick = () => document.getElementById('coverFileInput').click();
        document.getElementById('coverFileInput').addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { toast('Please choose an image file', true); return; }
            if (file.size > 5 * 1024 * 1024) { toast('Image is too large (max 5MB)', true); return; }
            const reader = new FileReader();
            reader.onload = async () => {
                fetchedCover = reader.result;
                document.getElementById('coverPreview').style.backgroundImage = `url('${fetchedCover}')`;
                document.getElementById('coverStatus').textContent = 'Custom cover uploaded from device';
                if (editing) {
                    try { await apiFetch('/books/' + id, { method: 'PUT', body: JSON.stringify({ cover: fetchedCover }) }); toast('Cover updated'); renderBooks(); }
                    catch (ex) { toast(ex.message, true); }
                }
            };
            reader.onerror = () => toast('Could not read that image', true);
            reader.readAsDataURL(file);
        });
        document.getElementById('saveBookBtn').onclick = async () => {
            const title = document.getElementById('fTitle').value.trim();
            const author = document.getElementById('fAuthor').value.trim();
            if (!title || !author) { toast('Title and author are required'); return; }
            const saveBtn = document.getElementById('saveBookBtn');
            saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
            const patch = { title, author, genre: document.getElementById('fGenre').value, year: +document.getElementById('fYear').value, copies: +document.getElementById('fCopies').value, rating: +document.getElementById('fRating').value, price: +document.getElementById('fPrice').value, desc: document.getElementById('fDesc').value };
            if (fetchedCover) patch.cover = fetchedCover;
            try {
                if (editing) { await apiFetch('/books/' + id, { method: 'PUT', body: JSON.stringify(patch) }); toast('Book updated'); }
                else { await apiFetch('/books', { method: 'POST', body: JSON.stringify(patch) }); toast('Book added to catalog'); }
                closeModal(); renderBooks();
            } catch (ex) { saveBtn.disabled = false; saveBtn.textContent = editing ? 'Save changes' : 'Add book'; toast(ex.message, true); }
        };
    }

    let userQuery = '';
    async function renderUsers() {
        const tbody = document.getElementById('usersTbody');
        try { adminUsers = await apiFetch('/users'); } catch (ex) { toast(ex.message, true); return; }
        let users = adminUsers.filter(u => u.name.toLowerCase().includes(userQuery) || u.username.toLowerCase().includes(userQuery) || u.email.toLowerCase().includes(userQuery));
        users = sortData(users, userSort.key, userSort.dir);
        if (users.length === 0) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">No users match "${userQuery}".</div></td></tr>`; return; }
        tbody.innerHTML = users.map(u => `
<tr>
<td class="row-title">${u.name}</td>
<td class="mono">${u.username}</td>
<td><span class="pw-cell mono" style="color:var(--muted);" title="Passwords are encrypted and can't be viewed — use Edit to set a new one.">••••••••</span></td>
<td><span class="badge ${u.role === 'Admin' ? 'badge-coral' : (u.role === 'Editor' ? 'badge-azure' : 'badge-brass')}">${u.role}</span></td>
<td>${u.borrowed}</td>
<td><span class="badge ${u.status === 'Active' ? 'badge-sage' : 'badge-coral'}">${u.status}</span></td>
<td><div class="row-actions">
<button class="icon-btn" title="Edit credentials" data-edit="${u.id}"><svg class="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
<button class="icon-btn" title="Toggle status" data-toggle="${u.id}"><svg class="icon" viewBox="0 0 24 24"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"/><path d="M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg></button>
<button class="icon-btn danger" title="Remove" data-del="${u.id}"><svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
</div></td>
</tr>`).join('');
        tbody.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => openUserForm(btn.dataset.edit));
        tbody.querySelectorAll('[data-toggle]').forEach(btn => btn.onclick = async () => {
            const u = adminUsers.find(x => x.id === btn.dataset.toggle);
            try { await apiFetch('/users/' + u.id, { method: 'PUT', body: JSON.stringify({ status: u.status === 'Active' ? 'Suspended' : 'Active' }) }); toast(`${u.name} is now ${u.status === 'Active' ? 'Suspended' : 'Active'}`); renderUsers(); }
            catch (ex) { toast(ex.message, true); }
        });
        tbody.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
            const u = adminUsers.find(x => x.id === btn.dataset.del);
            if (confirm(`Remove ${u.name} from Inkwell?`)) {
                try { await apiFetch('/users/' + u.id, { method: 'DELETE' }); toast(`Removed ${u.name}`); renderUsers(); }
                catch (ex) { toast(ex.message, true); }
            }
        });
    }
    document.getElementById('userSearch').addEventListener('input', e => { userQuery = e.target.value.toLowerCase(); renderUsers(); });
    document.querySelectorAll('#sec-users thead th[data-sort]').forEach(th => {
        th.onclick = () => { const key = th.dataset.sort; userSort.dir = (userSort.key === key) ? -userSort.dir : 1; userSort.key = key; renderUsers(); };
    });

    function openUserForm(id) {
        const editing = !!id;
        const u = editing ? adminUsers.find(x => x.id === id) : { name: '', email: '', username: '', role: 'Member' };
        modalContent.innerHTML = `
<div class="modal-head"><h2 style="font-size:1.3rem;">${editing ? 'Edit user credentials' : 'Add a new user'}</h2></div>
<div class="form-grid">
<div class="field"><label>Full name</label><input id="uName" value="${u.name}" required></div>
<div class="field"><label>Email</label><input id="uEmail" type="email" value="${u.email || ''}" required></div>
<div class="field"><label>Login ID</label><input id="uUsername" value="${u.username}" required></div>
<div class="field"><label>${editing ? 'New password (leave blank to keep current)' : 'Password'}</label><input id="uPassword" type="text" placeholder="${editing ? '••••••••' : ''}" ${editing ? '' : 'required'}></div>
<div class="field" style="grid-column:1/-1;"><label>Role</label><select id="uRole"><option ${u.role === 'Member' ? 'selected' : ''}>Member</option><option ${u.role === 'Editor' ? 'selected' : ''}>Editor</option><option ${u.role === 'Admin' ? 'selected' : ''}>Admin</option></select></div>
</div>
<p class="error-msg" id="userFormError" style="margin:0 24px 10px;">That login ID is already in use.</p>
<div class="modal-foot">
<button class="btn btn-ghost" id="cancelBtn2">Cancel</button>
<button class="btn btn-brass" id="saveUserBtn">${editing ? 'Save changes' : 'Add user'}</button>
</div>`;
        overlay.classList.add('open');
        document.getElementById('cancelBtn2').onclick = closeModal;
        document.getElementById('saveUserBtn').onclick = async () => {
            const name = document.getElementById('uName').value.trim();
            const email = document.getElementById('uEmail').value.trim();
            const username = document.getElementById('uUsername').value.trim();
            const password = document.getElementById('uPassword').value.trim();
            const role = document.getElementById('uRole').value;
            const err = document.getElementById('userFormError');
            if (!name || !email || !username || (!editing && !password)) { toast('All fields are required'); return; }
            err.style.display = 'none';
            try {
                if (editing) {
                    const patch = { name, email, username, role };
                    if (password) patch.password = password;
                    await apiFetch('/users/' + id, { method: 'PUT', body: JSON.stringify(patch) });
                    toast('User credentials updated');
                } else {
                    await apiFetch('/users', { method: 'POST', body: JSON.stringify({ name, email, username, password, role }) });
                    toast('User added');
                }
                closeModal(); renderUsers(); renderDashboard();
            } catch (ex) {
                if (ex.status === 409) { err.style.display = 'block'; } else { toast(ex.message, true); }
            }
        };
    }
    document.getElementById('addUserBtn').onclick = () => openUserForm(null);

    await renderDashboard();
}