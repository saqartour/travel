const App = {
  t(key, vars) { return SaqartourI18n.t(key, vars); },

  currentUser: null,
  forumCountry: 'GE',
  forumCity: 'Tbilisi',
  forumSubcategory: 'all',
  chatCountry: 'GE',
  chatCity: '',
  tours: [],
  destinations: [],
  faqs: [],
  accountType: 'traveler',
  stripeEnabled: false,
  socketMessages: [],
  chatMessageIds: new Set(),

  async init() {
    const theme = localStorage.getItem('gtf_theme') || 'dark';
    document.body.dataset.theme = theme;
    document.querySelector('#theme-toggle i').className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    await SaqartourRegions.load();
    this.initForumFilters();
    this.initChatFilters();

    try {
      const { user } = await SaqartourAPI.get('/auth/me');
      if (user) {
        this.currentUser = user;
        SaqartourAPI.setToken(localStorage.getItem('gtf_token'));
      }
    } catch { /* offline */ }

    this.updateNav();
    try {
      const cfg = await SaqartourAPI.get('/payments/config');
      this.stripeEnabled = cfg.stripeEnabled;
    } catch { /* offline */ }

    await Promise.all([
      this.loadTours(), this.loadDestinations(), this.renderForum(),
      this.renderChat(), this.renderWallet(), this.renderProfile(),
      this.renderBookings(), this.loadFaqs(), this.loadHostListings(),
      this.renderDashboard()
    ]);
    this.handlePaymentReturn();
    this.handlePasswordResetLink();
    SaqartourSocket.connect();
    this.bindEvents();
    this.bindModalCloses();
    this.updateAuthUI();
  },

  bindEvents() {
    document.getElementById('tour-search')?.addEventListener('input', () => this.loadTours());
    document.getElementById('tour-destination-filter')?.addEventListener('change', () => this.loadTours());
  },

  bindModalCloses() {
    document.querySelectorAll('[data-modal]').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeModal(backdrop.id);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('[data-modal]:not(.hidden)').forEach(m => this.closeModal(m.id));
      }
    });
  },

  toggleMobileNav(show) {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;
    const open = show !== undefined ? show : nav.classList.contains('hidden');
    nav.classList.toggle('hidden', !open);
  },

  showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('nav-active', b.dataset.nav === id));
    if (id === 'wallet') { this.renderWallet(); this.loadTransactions(); }
    if (id === 'host-panel') this.renderHostPanel();
    if (id === 'profile') this.renderProfile();
    if (id === 'bookings') this.renderBookings();
    if (id === 'tours') this.loadTours();
    if (id === 'destinations') this.loadDestinations();
    if (id === 'faq') this.loadFaqs();
    if (id === 'forum') this.renderForum();
    if (id === 'live-chat') this.renderChat();
    if (id === 'dashboard') this.renderDashboard();
  },

  async refreshI18n() {
    SaqartourI18n.applyDom();
    this.updateNav();
    this.updateAuthUI();
    this.updateVerifyBanner();
    await Promise.all([
      this.renderDashboard(), this.loadTours(), this.renderForum(),
      this.renderChat(), this.renderWallet(), this.renderProfile(),
      this.renderBookings(), this.loadFaqs(), this.loadHostListings()
    ]);
    this.initForumFilters();
    this.initChatFilters();
  },

  updateVerifyBanner() {
    const el = document.getElementById('verify-banner');
    if (!el) return;
    el.classList.toggle('hidden', !this.currentUser || this.currentUser.verified_email);
  },

  async renderDashboard() {
    const el = document.getElementById('dashboard-content');
    if (!el) return;
    if (!this.currentUser) {
      el.innerHTML = `<p class="text-[#7a9bb6] col-span-full">${this.t('joinUnlock')}</p>`;
      return;
    }
    let stats = { bookings: 0, threads: 0, points: this.currentUser.points, wallet: this.currentUser.wallet || 0 };
    try {
      const data = await SaqartourAPI.get('/auth/dashboard');
      stats = data.stats;
      this.currentUser = data.user;
    } catch { /* offline */ }
    const hostBtn = this.currentUser.account_type === 'host'
      ? `<button onclick="App.showSection('host-panel')" class="dashboard-card glass-card p-6 text-left hover:border-[#8b5cf6]/40"><span class="text-2xl">🏠</span><h3 class="font-semibold mt-2">${this.t('quickHosts')}</h3></button>` : '';
    el.innerHTML = `
      <div class="glass-card p-6 lg:col-span-3 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h3 class="text-2xl font-bold">${this.currentUser.username}</h3>
          <p class="text-[#7a9bb6] text-sm mt-1">${this.currentUser.account_type === 'host' ? '🏠 ' + this.t('hostBadge') : '🧳 ' + this.t('travelerBadge')} · ⭐ ${stats.points} ${this.t('pts')} · 💰 $${(stats.wallet || 0).toFixed(2)}</p>
        </div>
        <button onclick="navigator.clipboard.writeText('${this.currentUser.referral_code}');alert('${this.t('copied')}')" class="btn-pill px-4 py-2 text-sm">${this.t('copyReferral')}: <code>${this.currentUser.referral_code}</code></button>
      </div>
      <button onclick="App.showSection('bookings')" class="dashboard-card glass-card p-6 text-left"><span class="text-2xl">🎫</span><h3 class="font-semibold mt-2">${this.t('quickBookings')}</h3><p class="text-[#7a9bb6] text-sm">${stats.bookings}</p></button>
      <button onclick="App.showSection('wallet')" class="dashboard-card glass-card p-6 text-left"><span class="text-2xl">💰</span><h3 class="font-semibold mt-2">${this.t('quickWallet')}</h3><p class="text-[#5eead4]">$${(stats.wallet || 0).toFixed(2)}</p></button>
      <button onclick="App.showSection('forum')" class="dashboard-card glass-card p-6 text-left"><span class="text-2xl">💬</span><h3 class="font-semibold mt-2">${this.t('quickForum')}</h3><p class="text-[#7a9bb6] text-sm">${stats.threads} threads</p></button>
      <button onclick="App.showSection('live-chat')" class="dashboard-card glass-card p-6 text-left"><span class="text-2xl">⚡</span><h3 class="font-semibold mt-2">${this.t('quickChat')}</h3></button>
      <button onclick="App.showSection('profile')" class="dashboard-card glass-card p-6 text-left"><span class="text-2xl">👤</span><h3 class="font-semibold mt-2">${this.t('quickProfile')}</h3></button>
      ${hostBtn}`;
  },

  toggleTheme() {
    const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = next;
    localStorage.setItem('gtf_theme', next);
    document.querySelector('#theme-toggle i').className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  },

  modal(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('hidden', !show);
    const anyOpen = document.querySelector('[data-modal]:not(.hidden)');
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  },

  closeModal(id) {
    this.modal(id, false);
  },

  setAccountType(type) {
    this.accountType = type;
    document.querySelectorAll('.account-type-btn').forEach(b => {
      b.classList.toggle('ring-2', b.dataset.type === type);
      b.classList.toggle('ring-[#5eead4]', b.dataset.type === type);
      b.classList.toggle('opacity-60', b.dataset.type !== type);
    });
  },

  updateNav() {
    const nav = document.getElementById('user-nav');
    if (!nav) return;
    const joinLabel = this.t('joinFree');
    const logoutLabel = this.t('logout');
    if (!this.currentUser) {
      nav.innerHTML = `<button onclick="App.modal('login-modal',true)" class="btn-pill px-4 py-2 text-sm">${this.t('loginBtn')}</button>
        <button onclick="App.modal('register-modal',true)" class="btn-pill bg-[#5eead4] text-slate-950 px-6 py-2 text-sm font-medium">✨ ${joinLabel}</button>`;
      this.updateAuthUI();
      return;
    }
    const badge = this.currentUser.account_type === 'host' ? '🏠' : '🧳';
    const verified = this.currentUser.verified_email ? '✅' : '⚠️';
    const hostLink = this.currentUser.account_type === 'host'
      ? `<button onclick="App.showSection('host-panel')" class="text-[10px] text-[#8b5cf6] block">${this.t('hostPanelLink')}</button>` : '';
    nav.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-right cursor-pointer" onclick="App.showSection('profile')">
          <div class="font-semibold">${badge} ${this.currentUser.username} ${verified}</div>
          <div class="text-xs text-[#5eead4]">⭐ ${this.currentUser.points} ${this.t('pts')}</div>
          ${hostLink}
        </div>
        <button onclick="App.logout()" class="text-red-400 text-sm">${logoutLabel}</button>
      </div>`;
    this.updateAuthUI();
  },

  updateAuthUI() {
    const guest = document.getElementById('home-guest-actions');
    const user = document.getElementById('home-user-welcome');
    const nameEl = document.getElementById('home-welcome-name');
    if (guest) guest.classList.toggle('hidden', !!this.currentUser);
    if (user) user.classList.toggle('hidden', !this.currentUser);
    if (nameEl && this.currentUser) nameEl.textContent = this.currentUser.username;
    this.updateVerifyBanner();
    ['nav-dashboard-btn', 'nav-dashboard-mobile'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !this.currentUser);
    });
  },

  requireVerified(action) {
    if (!this.currentUser) { this.modal('login-modal', true); return false; }
    if (!this.currentUser.verified_email) {
      this.modal('verify-email-modal', true);
      return false;
    }
    return true;
  },

  async register() {
    const pw = document.getElementById('reg-password').value;
    const pw2 = document.getElementById('reg-password-confirm').value;
    if (pw !== pw2) return alert('❌ ' + this.t('passwordMismatch'));
    try {
      const data = await SaqartourAPI.post('/auth/register', {
        username: document.getElementById('reg-username').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: pw,
        password_confirm: pw2,
        address: document.getElementById('reg-address').value.trim(),
        nationality: document.getElementById('reg-nationality').value,
        referral: document.getElementById('reg-referral').value.trim(),
        account_type: this.accountType
      });
      SaqartourAPI.setToken(data.token);
      this.currentUser = data.user;
      this.closeModal('register-modal');
      this.updateNav();
      document.getElementById('verify-email-address').textContent = data.user.email;
      document.getElementById('verify-account-type').textContent = data.user.account_type === 'host' ? '🏠 Host' : '🧳 Traveler';
      this.modal('verify-email-modal', true);
      this.showEmailDeliveryHint();
      alert(data.message || '📧 ' + this.t('checkEmail'));
      this.renderDashboard();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async login() {
    try {
      const data = await SaqartourAPI.post('/auth/login', {
        identifier: document.getElementById('login-identifier').value.trim(),
        password: document.getElementById('login-password').value
      });
      SaqartourAPI.setToken(data.token);
      this.currentUser = data.user;
      this.closeModal('login-modal');
      this.updateNav();
      await this.renderProfile();
      if (data.needsVerification) {
        this.modal('verify-email-modal', true);
        alert('⚠️ ' + this.t('verifyUnlock'));
      } else {
        alert('👋 ' + this.t('welcomeBackUser', { name: data.user.username }));
      }
      this.renderDashboard();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async logout() {
    await SaqartourAPI.post('/auth/logout').catch(() => {});
    SaqartourAPI.setToken(null);
    SaqartourSocket.disconnect();
    this.currentUser = null;
    this.updateNav();
    this.showSection('home');
  },

  async verifyEmail() {
    try {
      const { user, message } = await SaqartourAPI.post('/auth/verify-email', {
        code: document.getElementById('verification-code').value.trim()
      });
      this.currentUser = user;
      this.modal('verify-email-modal', false);
      this.updateNav();
      alert(message || '🎉 Verified!');
    } catch (e) { alert('❌ ' + e.message); }
  },

  async resendVerification() {
    try {
      const data = await SaqartourAPI.post('/auth/resend-verification');
      this.showEmailDeliveryHint();
      alert('📧 ' + (data.message || this.t('newCodeSent')));
    } catch (e) { alert('❌ ' + e.message); }
  },

  async showEmailDeliveryHint() {
    const el = document.getElementById('verify-delivery-hint');
    if (!el) return;
    try {
      const s = await SaqartourAPI.get('/auth/email-status');
      if (!s.smtpConfigured) {
        el.classList.remove('hidden');
        el.textContent = '⚠️ ' + this.t('verifyDeliveryHint');
      } else {
        el.classList.add('hidden');
      }
    } catch { el.classList.add('hidden'); }
  },

  async forgotPassword() {
    try {
      const data = await SaqartourAPI.post('/auth/forgot-password', {
        email: document.getElementById('forgot-email').value.trim()
      });
      this.modal('forgot-modal', false);
      alert(data.message);
    } catch (e) { alert('❌ ' + e.message); }
  },

  async resetPassword() {
    try {
      const data = await SaqartourAPI.post('/auth/reset-password', {
        token: document.getElementById('reset-token').value.trim(),
        password: document.getElementById('reset-password').value,
        password_confirm: document.getElementById('reset-password-confirm').value
      });
      this.modal('reset-modal', false);
      alert(data.message);
      this.modal('login-modal', true);
    } catch (e) { alert('❌ ' + e.message); }
  },

  handlePasswordResetLink() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset');
    if (token) {
      document.getElementById('reset-token').value = token;
      this.modal('reset-modal', true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  },

  async handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    if (payment === 'cancelled') {
      alert(this.t('paymentCancelled'));
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (!payment || !sessionId) return;

    try {
      const result = await SaqartourAPI.get(`/payments/verify-session/${sessionId}`);
      if (result.paid) {
        if (payment === 'wallet_success') alert('💰 ' + this.t('walletToppedUp'));
        if (payment === 'booking_success') alert('🎫 ' + this.t('bookingPaid'));
        this.renderWallet();
        this.renderBookings();
        this.updateNav();
      }
    } catch (e) { console.error(e); }
    window.history.replaceState({}, '', window.location.pathname);
  },

  insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    if (input) { input.value += emoji; input.focus(); }
  },

  initForumFilters() {
    const fc = document.getElementById('forum-country');
    const fci = document.getElementById('forum-city');
    const fs = document.getElementById('forum-subcategory');
    if (fc) {
      fc.innerHTML = SaqartourRegions.countryOptions(this.forumCountry);
      fc.onchange = () => { this.forumCountry = fc.value; fci.innerHTML = SaqartourRegions.cityOptions(fc.value, this.forumCity); this.renderForumSidebar(); this.renderForum(); };
    }
    if (fci) {
      fci.innerHTML = SaqartourRegions.cityOptions(this.forumCountry, this.forumCity);
      fci.onchange = () => { this.forumCity = fci.value; this.renderForumSidebar(); this.renderForum(); };
    }
    if (fs) {
      fs.innerHTML = SaqartourRegions.subcategoryOptions(this.forumSubcategory);
      fs.onchange = () => { this.forumSubcategory = fs.value; this.renderForum(); };
    }
    const search = document.getElementById('forum-country-search');
    if (search && !search.dataset.bound) {
      search.dataset.bound = '1';
      search.addEventListener('input', () => this.filterForumCountries(search.value.trim()));
    }
    this.renderForumSidebar();
  },

  renderForumSidebar() {
    const list = document.getElementById('forum-country-list');
    if (!list) return;
    const allCities = this.t('allCities');
    list.innerHTML = SaqartourRegions.countries.map(c => {
      const active = c.code === this.forumCountry;
      const cities = (c.cities || []).map(city => `
        <button type="button" class="forum-city-btn ${this.forumCity === city && active ? 'is-active' : ''}"
          data-country="${c.code}" data-city="${this.escapeHtml(city)}"
          onclick="App.selectForumLocation(this.dataset.country, this.dataset.city)">🏙️ ${city}</button>`
      ).join('');
      return `
        <div class="forum-country-item ${active ? 'is-active' : ''}" data-country="${c.code}" data-name="${c.name.toLowerCase()}">
          <button type="button" class="forum-country-btn" data-country="${c.code}" data-city=""
            onclick="App.selectForumLocation(this.dataset.country, '')">
            <span class="forum-country-flag">${c.flag}</span>
            <span class="forum-country-name">${c.name}</span>
            <span class="forum-country-chevron"><i class="fa-solid fa-chevron-right"></i></span>
          </button>
          <div class="forum-city-flyout" role="menu">
            <button type="button" class="forum-city-btn forum-city-btn-all ${active && !this.forumCity ? 'is-active' : ''}"
              data-country="${c.code}" data-city=""
              onclick="App.selectForumLocation(this.dataset.country, '')">${allCities}</button>
            ${cities}
          </div>
        </div>`;
    }).join('');
  },

  filterForumCountries(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.forum-country-item').forEach(el => {
      const name = el.dataset.name || '';
      const code = (el.dataset.country || '').toLowerCase();
      el.style.display = !q || name.includes(q) || code.includes(q) ? '' : 'none';
    });
  },

  selectForumLocation(country, city) {
    this.forumCountry = country;
    this.forumCity = city || '';
    const fc = document.getElementById('forum-country');
    const fci = document.getElementById('forum-city');
    if (fc) fc.value = country;
    if (fci) {
      fci.innerHTML = SaqartourRegions.cityOptions(country, this.forumCity);
      fci.value = this.forumCity;
    }
    this.renderForumSidebar();
    this.renderForum();
    if (window.innerWidth < 1024) {
      document.querySelectorAll('.forum-country-item').forEach(el => el.classList.remove('is-expanded'));
      document.querySelector(`.forum-country-item[data-country="${country}"]`)?.classList.add('is-expanded');
    }
  },

  getPointsTier(points) {
    const tiers = [
      { id: 'elite', min: 600, labelKey: 'tierElite', icon: '👑' },
      { id: 'ambassador', min: 300, labelKey: 'tierAmbassador', icon: '🌟' },
      { id: 'voyager', min: 120, labelKey: 'tierVoyager', icon: '✈️' },
      { id: 'explorer', min: 0, labelKey: 'tierExplorer', icon: '🧭' }
    ];
    const current = tiers.find(t => points >= t.min) || tiers[tiers.length - 1];
    const currentIdx = tiers.indexOf(current);
    const next = currentIdx > 0 ? tiers[currentIdx - 1] : null;
    const nextAt = next ? next.min : null;
    const prevMin = current.min;
    const progress = nextAt
      ? Math.min(100, Math.round(((points - prevMin) / (nextAt - prevMin)) * 100))
      : 100;
    return { current, next, nextAt, progress, pointsToNext: nextAt ? Math.max(0, nextAt - points) : 0 };
  },

  initChatFilters() {
    const cc = document.getElementById('chat-country');
    const cci = document.getElementById('chat-city');
    if (cc) {
      cc.innerHTML = SaqartourRegions.countryOptions(this.chatCountry);
      cc.onchange = () => { this.chatCountry = cc.value; this.updateChatCitySelect(); this.loadChatMessages(); this.renderChatTabs(); };
    }
    if (cci) {
      this.updateChatCitySelect();
      cci.onchange = () => { this.chatCity = cci.value; this.loadChatMessages(); };
    }
    this.renderChatTabs();
  },

  updateChatCitySelect() {
    const cci = document.getElementById('chat-city');
    if (!cci) return;
    cci.innerHTML = `<option value="">🌍 ${this.t('countryWide')}</option>` +
      (SaqartourRegions.getCountry(this.chatCountry)?.cities || []).map(c =>
        `<option value="${c}" ${c === this.chatCity ? 'selected' : ''}>🏙️ ${c}</option>`
      ).join('');
  },

  renderChatTabs() {
    const tabs = document.getElementById('chat-country-tabs');
    if (!tabs) return;
    const popular = ['GE', 'AM', 'AZ', 'TR', 'FR', 'IT', 'ES', 'US', 'JP', 'TH', 'AE', 'GB', 'DE', 'GR'];
    tabs.innerHTML = popular.map(code => {
      const c = SaqartourRegions.getCountry(code);
      if (!c) return '';
      return `<button onclick="App.selectChatCountry('${code}')" class="chat-pill px-3 py-2 rounded-full text-sm ${code === this.chatCountry ? 'active' : ''}">${c.flag} ${c.name}</button>`;
    }).join('');
  },

  selectChatCountry(code) {
    this.chatCountry = code;
    this.chatCity = '';
    document.getElementById('chat-country').value = code;
    this.updateChatCitySelect();
    this.renderChatTabs();
    this.loadChatMessages();
  },

  async loadFaqs(category) {
    try {
      const q = category ? `?category=${category}` : '';
      const { faqs } = await SaqartourAPI.get(`/faq${q}`);
      this.faqs = faqs;
      this.renderFaqs();
    } catch { /* offline */ }
  },

  renderFaqs() {
    const el = document.getElementById('faq-list');
    if (!el) return;
    if (!this.faqs.length) { el.innerHTML = `<p class="text-[#7a9bb6]">${this.t('loadingFaqs')}</p>`; return; }
    el.innerHTML = this.faqs.map(f => `
      <details class="faq-item glass-card p-5 mb-3 rounded-2xl">
        <summary class="font-semibold cursor-pointer flex items-center gap-3">
          <span class="text-2xl">${f.emoji || '❓'}</span>
          <span>${f.question}</span>
        </summary>
        <p class="text-[#a0b9da] mt-4 pl-10 leading-relaxed">${f.answer}</p>
      </details>`).join('');
  },

  filterFaqs(cat) {
    document.querySelectorAll('.faq-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    this.loadFaqs(cat === 'all' ? '' : cat);
  },

  async loadTours() {
    const search = document.getElementById('tour-search')?.value || '';
    const dest = document.getElementById('tour-destination-filter')?.value || '';
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (dest) q.set('destination', dest);
    try {
      const { tours } = await SaqartourAPI.get(`/tours?${q}`);
      this.tours = tours;
      this.renderTours();
    } catch {
      document.getElementById('tours-grid').innerHTML = `<p class="text-[#7a9bb6] p-8">${this.t('runServer')}</p>`;
    }
  },

  renderTours() {
    const grid = document.getElementById('tours-grid');
    if (!grid) return;
    if (!this.tours.length) { grid.innerHTML = `<p class="text-[#7a9bb6] col-span-full p-8">${this.t('noTours')}</p>`; return; }
    grid.innerHTML = this.tours.map(t => `
      <div class="tour-card glass-card overflow-hidden">
        <img src="${t.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800'}" alt="${t.title}">
        <div class="p-5">
          <div class="text-xs uppercase tracking-widest text-[#7a9bb6]">📍 ${t.destination} · ⏱️ ${t.duration_days}d</div>
          <h3 class="text-xl font-semibold mt-2">${t.title}</h3>
          <p class="text-[#a0b9da] text-sm mt-2 line-clamp-2">${t.description || ''}</p>
          <div class="flex items-center justify-between mt-4">
            <div><span class="text-2xl font-bold text-[#5eead4]">$${t.price}</span><span class="text-xs text-[#7a9bb6]"> ${this.t('perPerson')}</span></div>
            <div class="text-amber-300 text-sm">⭐ ${t.rating}</div>
          </div>
          <button onclick="App.openBooking('${t.id}')" class="btn-pill w-full mt-4 bg-[#5eead4] text-slate-950 py-3">🎫 ${this.t('bookNow')}</button>
        </div>
      </div>`).join('');
  },

  async loadDestinations() {
    try {
      const { destinations } = await SaqartourAPI.get('/tours/destinations');
      this.destinations = destinations;
      this.renderDestinations();
      const filter = document.getElementById('tour-destination-filter');
      if (filter) filter.innerHTML = `<option value="">🌍 ${this.t('allDestinations')}</option>` + destinations.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    } catch { /* offline */ }
  },

  renderDestinations() {
    const grid = document.getElementById('destinations-grid');
    if (!grid) return;
    grid.innerHTML = this.destinations.map(d => `
      <div class="dest-card glass-card cursor-pointer" onclick="document.getElementById('tour-destination-filter').value='${d.name}';App.showSection('tours');App.loadTours();">
        <img src="${d.image_url}" alt="${d.name}">
        <div class="overlay">
          <h3 class="text-2xl font-bold">🌄 ${d.name}</h3>
          <p class="text-sm text-[#a0b9da] mt-2">${d.description || ''}</p>
          <p class="text-xs text-[#5eead4] mt-2">🌤️ ${this.t('bestSeason')}: ${d.best_season || this.t('yearRound')}</p>
        </div>
      </div>`).join('');
  },

  openBooking(tourId) {
    if (!this.requireVerified()) return;
    const tour = this.tours.find(t => t.id === tourId);
    if (!tour) return;
    document.getElementById('booking-tour-id').value = tourId;
    document.getElementById('booking-tour-title').textContent = tour.title;
    document.getElementById('booking-tour-price').textContent = `$${tour.price} per person`;
    this.modal('booking-modal', true);
  },

  async submitBooking() {
    try {
      const data = await SaqartourAPI.post('/payments/booking-checkout', {
        tour_id: document.getElementById('booking-tour-id').value,
        guests: document.getElementById('booking-guests').value,
        travel_date: document.getElementById('booking-date').value
      });
      this.modal('booking-modal', false);
      window.location.href = data.url;
    } catch (e) { alert('❌ ' + e.message); }
  },

  async renderBookings() {
    const el = document.getElementById('bookings-list');
    if (!el) return;
    if (!this.currentUser) { el.innerHTML = `<p class="text-[#7a9bb6]">🔐 ${this.t('loginBookings')}</p>`; return; }
    try {
      const { bookings } = await SaqartourAPI.get('/bookings/my');
      if (!bookings.length) { el.innerHTML = `<p class="text-[#7a9bb6]">${this.t('noBookings')}</p>`; return; }
      el.innerHTML = bookings.map(b => `
        <div class="thread-card mb-4">
          <div class="flex justify-between items-start gap-4">
            <div>
              <h3 class="text-xl font-semibold">🎫 ${b.tour_title}</h3>
              <p class="text-[#7a9bb6] text-sm mt-1">📍 ${b.destination} · 👥 ${b.guests} · 📅 ${b.travel_date || 'TBD'}</p>
            </div>
            <span class="status-pill status-${b.status}">${b.status}</span>
          </div>
          <div class="text-[#5eead4] font-bold mt-3">💰 $${b.total_price.toFixed(2)}</div>
        </div>`).join('');
    } catch { el.innerHTML = `<p class="text-[#7a9bb6]">${this.t('unableBookings')}</p>`; }
  },

  async renderForum() {
    const sort = document.getElementById('sort-threads')?.value || 'newest';
    const country = document.getElementById('forum-country')?.value || this.forumCountry;
    const city = document.getElementById('forum-city')?.value || this.forumCity;
    const sub = document.getElementById('forum-subcategory')?.value || this.forumSubcategory;
    this.forumCountry = country;
    this.forumCity = city;
    this.renderForumSidebar();
    const q = new URLSearchParams({ sort, country, city, subcategory: sub });
    try {
      const { threads } = await SaqartourAPI.get(`/forum/threads?${q}`);
      const list = document.getElementById('threads-list');
      const c = SaqartourRegions.getCountry(country);
      const locLabel = document.getElementById('forum-location-label');
      if (locLabel) {
        locLabel.textContent = city
          ? `${c?.flag || ''} ${c?.name || country} → 🏙️ ${city}`
          : `${c?.flag || ''} ${c?.name || country} · ${this.t('forumAllCountry')}`;
      }
      if (!threads.length) {
        list.innerHTML = `<div class="p-8 text-[#7a9bb6]">${this.t('noThreads')}</div>`;
        return;
      }
      list.innerHTML = threads.map(t => `
        <div class="thread-card border-b border-white/10 cursor-pointer" onclick="App.openThread('${t.id}')">
          <div class="flex flex-wrap gap-2 text-xs">
            <span class="rounded-full bg-[#5eead4]/10 px-3 py-1">${t.country_flag || ''} ${t.city}</span>
            <span class="rounded-full bg-[#8b5cf6]/10 px-3 py-1">${t.subcategory_emoji || ''} ${t.subcategory_label || t.subcategory}</span>
          </div>
          <h3 class="text-xl font-semibold mt-3">${t.title}</h3>
          <p class="text-[#a0b9da] mt-2">${(t.body || '').slice(0, 200)}</p>
          <div class="flex gap-3 mt-4 text-xs text-[#7a9bb6]">
            <span>👤 ${t.author_name}</span><span>⭐ ${t.points || 0}</span><span>💬 ${t.comment_count || 0}</span>
          </div>
        </div>`).join('');
    } catch { /* offline */ }
  },

  openCreateThread() {
    if (!this.requireVerified()) return;
    const country = document.getElementById('forum-country')?.value || 'GE';
    const city = document.getElementById('forum-city')?.value || 'Tbilisi';
    document.getElementById('thread-country').innerHTML = SaqartourRegions.countryOptions(country);
    const cities = SaqartourRegions.getCountry(country)?.cities || [];
    document.getElementById('thread-city').innerHTML = cities.map(c => `<option value="${c}" ${c===city?'selected':''}>🏙️ ${c}</option>`).join('');
    document.getElementById('thread-subcategory').innerHTML = SaqartourRegions.subcategories.map(s =>
      `<option value="${s.id}">${s.emoji} ${s.label}</option>`
    ).join('');
    this.modal('create-thread-modal', true);
  },

  onThreadCountryChange() {
    const country = document.getElementById('thread-country').value;
    const cities = SaqartourRegions.getCountry(country)?.cities || [];
    document.getElementById('thread-city').innerHTML = cities.map(c => `<option value="${c}">🏙️ ${c}</option>`).join('');
  },

  async openThread(id) {
    try {
      const { thread, comments } = await SaqartourAPI.get(`/forum/threads/${id}`);
      document.getElementById('thread-detail-title').textContent = thread.title;
      document.getElementById('thread-detail-body').textContent = thread.body || '';
      document.getElementById('thread-detail-meta').textContent =
        `${thread.country_flag || ''} ${thread.city} · ${thread.subcategory_emoji || ''} ${thread.subcategory_label || ''} · 👤 ${thread.author_name}`;
      document.getElementById('thread-detail-id').value = id;
      document.getElementById('thread-comments').innerHTML = (comments || []).map(c =>
        `<div class="rounded-2xl border border-white/10 p-4 mb-3"><strong>💬 ${c.author_name}</strong><p class="mt-2 text-[#a0b9da]">${this.escapeHtml(c.body)}</p></div>`
      ).join('') || `<p class="text-[#7a9bb6]">${this.t('noComments')}</p>`;
      this.modal('thread-modal', true);
    } catch (e) { alert('❌ ' + e.message); }
  },

  async submitThread() {
    if (!this.requireVerified()) return;
    try {
      await SaqartourAPI.post('/forum/threads', {
        title: document.getElementById('thread-title').value.trim(),
        country: document.getElementById('thread-country').value,
        city: document.getElementById('thread-city').value,
        subcategory: document.getElementById('thread-subcategory').value,
        body: document.getElementById('thread-body').value.trim()
      });
      this.modal('create-thread-modal', false);
      alert('✅ ' + this.t('threadSubmitted'));
      this.renderForum();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async postComment() {
    if (!this.requireVerified()) return;
    const id = document.getElementById('thread-detail-id').value;
    const body = document.getElementById('thread-comment-input').value.trim();
    if (!body) return;
    try {
      await SaqartourAPI.post(`/forum/threads/${id}/comments`, { body });
      document.getElementById('thread-comment-input').value = '';
      this.openThread(id);
      this.renderForum();
    } catch (e) { alert('❌ ' + e.message); }
  },

  onSocketConnect() {
    SaqartourSocket.join(this.chatCountry, this.chatCity);
  },

  onSocketMessage(msg) {
    if (msg.country !== this.chatCountry) return;
    const msgCity = msg.city || '';
    const viewCity = this.chatCity || '';
    if (viewCity && msgCity !== viewCity) return;
    if (!viewCity && msgCity) return;
    this.appendChatMessage(msg);
  },

  appendChatMessage(m) {
    const box = document.getElementById('chat-messages');
    if (!box || !m?.id) return;
    if (this.chatMessageIds.has(m.id)) return;
    this.chatMessageIds.add(m.id);
    const mine = this.currentUser && (m.user_id === this.currentUser.id || m.username === this.currentUser.username);
    const loc = m.city ? `🏙️ ${m.city}` : '🌍';
    const badge = m.account_type === 'host' ? '🏠 ' : '';
    const html = `<div class="flex ${mine ? 'justify-end' : ''}" data-chat-id="${m.id}"><div class="max-w-[80%] ${mine ? 'bg-[#5eead4] text-slate-950' : 'bg-[#08182b] border border-white/10'} rounded-2xl px-5 py-3 chat-bubble"><div class="text-xs mb-1 opacity-70 flex gap-2"><span>${badge}👤 ${m.username}</span><span>${loc}</span></div><div>${this.escapeHtml(m.message)}</div></div></div>`;
    if (box.innerHTML.includes('No messages yet') || box.innerHTML.includes('Say hello') || box.innerHTML.includes('შეტყობინება')) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', html);
    box.scrollTop = box.scrollHeight;
  },

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },

  async renderChat() {
    SaqartourSocket.join(this.chatCountry, this.chatCity);
    await this.loadChatMessages();
  },

  async loadChatMessages() {
    const country = this.chatCountry;
    const city = this.chatCity;
    const q = new URLSearchParams({ country });
    if (city) q.set('city', city);
    const c = SaqartourRegions.getCountry(country);
    document.getElementById('chat-channel-label').textContent =
      `${c?.flag || ''} ${c?.name || country}${city ? ' · 🏙️ ' + city : ' · Country-wide'}`;
    try {
      const { messages } = await SaqartourAPI.get(`/chat/messages?${q}`);
      const box = document.getElementById('chat-messages');
      this.chatMessageIds = new Set();
      if (!messages.length) {
        box.innerHTML = `<div class="text-[#7a9bb6] text-center py-12">💬 ${this.t('noMessages', { place: (c?.flag || '') + ' ' + (c?.name || country) })}</div>`;
        return;
      }
      box.innerHTML = '';
      messages.forEach(m => this.appendChatMessage(m));
      SaqartourSocket.join(this.chatCountry, this.chatCity);
    } catch { /* offline */ }
  },

  async sendChat() {
    if (!this.requireVerified()) return;
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    const city = this.chatCity && this.chatCity.trim() ? this.chatCity.trim() : null;
    try {
      await SaqartourAPI.post('/chat/messages', { message: msg, country: this.chatCountry, city });
      input.value = '';
    } catch (e) { alert('❌ ' + e.message); }
  },

  async renderWallet() {
    if (!this.currentUser) {
      ['wallet-balance', 'points-balance', 'verification-level'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = id.includes('level') ? '1' : '0';
      });
      return;
    }
    try {
      const data = await SaqartourAPI.get('/wallet/balance');
      document.getElementById('wallet-balance').textContent = (data.wallet || 0).toFixed(2);
      document.getElementById('points-balance').textContent = data.points || 0;
      document.getElementById('verification-level').textContent = data.verified_level || 1;
      Object.assign(this.currentUser, data);
    } catch { /* offline */ }
  },

  async topUpWallet() {
    if (!this.requireVerified()) return;
    try {
      const data = await SaqartourAPI.post('/payments/wallet-checkout', {
        amount: document.getElementById('topup-amount').value
      });
      window.location.href = data.url;
    } catch (e) { alert('❌ ' + e.message); }
  },

  async loadTransactions() {
    const el = document.getElementById('transactions-list');
    if (!el || !this.currentUser) return;
    try {
      const { transactions } = await SaqartourAPI.get('/wallet/transactions');
      el.innerHTML = transactions.length ? transactions.map(t => `
        <div class="flex justify-between items-center py-3 border-b border-white/10 text-sm">
          <span>${t.type.replace('_', ' ')} · ${new Date(t.created_at).toLocaleDateString()}</span>
          <span class="${t.amount >= 0 ? 'text-[#5eead4]' : 'text-red-400'}">${t.amount >= 0 ? '+' : ''}$${Math.abs(t.amount).toFixed(2)}</span>
          <span class="status-pill status-${t.status}">${t.status}</span>
        </div>`).join('') : `<p class="text-[#7a9bb6]">${this.t('noTransactions')}</p>`;
    } catch { el.innerHTML = ''; }
  },

  async loadHostListings() {
    try {
      const { listings } = await SaqartourAPI.get('/hosts/listings');
      const grid = document.getElementById('host-listings-public');
      if (!grid) return;
      const typeEmoji = { hotel: '🏨', car_rental: '🚗', tour: '🗺️', experience: '✨' };
      grid.innerHTML = listings.length ? listings.map(l => `
        <div class="glass-card p-5">
          <div class="text-xs text-[#7a9bb6]">${typeEmoji[l.type] || '📌'} ${l.type} · ${l.country} ${l.city}</div>
          <h3 class="font-semibold mt-2">${l.title}</h3>
          <p class="text-sm text-[#a0b9da] mt-1">${(l.description || '').slice(0, 120)}</p>
          <div class="text-[#5eead4] font-bold mt-3">$${l.price}/${l.price_unit}</div>
          <p class="text-xs text-[#7a9bb6] mt-2">🏠 ${l.host_name} · ${l.contact_email}</p>
        </div>`).join('') : `<p class="text-[#7a9bb6] col-span-full">${this.t('noListings')}</p>`;
    } catch { /* offline */ }
  },

  async renderHostPanel() {
    const el = document.getElementById('host-panel-content');
    if (!el) return;
    if (!this.currentUser) { el.innerHTML = `<p>${this.t('loginHost')}</p>`; return; }
    if (this.currentUser.account_type !== 'host') {
      el.innerHTML = `<p class="text-[#7a9bb6]">${this.t('registerHost')}</p>`;
      return;
    }
    try {
      const { listings } = await SaqartourAPI.get('/hosts/my-listings');
      el.innerHTML = `
        <div class="mb-6">
          <h3 class="text-xl font-bold mb-4">➕ ${this.t('addListing')}</h3>
          <div class="grid sm:grid-cols-2 gap-3">
            <select id="hl-type" class="custom-select rounded-full px-4 py-3"><option value="hotel">🏨 Hotel</option><option value="car_rental">🚗 Car</option><option value="tour">🗺️ Tour</option><option value="experience">✨ Experience</option></select>
            <input id="hl-title" placeholder="${this.t('title')}" class="custom-select rounded-full px-4 py-3">
            <select id="hl-country" class="custom-select rounded-full px-4 py-3"></select>
            <select id="hl-city" class="custom-select rounded-full px-4 py-3"></select>
            <input id="hl-price" type="number" placeholder="${this.t('price')}" class="custom-select rounded-full px-4 py-3">
            <input id="hl-image" placeholder="${this.t('imageUrl')}" class="custom-select rounded-full px-4 py-3">
          </div>
          <textarea id="hl-desc" rows="3" placeholder="${this.t('description')}" class="w-full custom-select rounded-2xl px-4 py-3 mt-3"></textarea>
          <button onclick="App.createListing()" class="btn-pill bg-[#5eead4] text-slate-950 px-6 py-3 mt-3">${this.t('publishListing')}</button>
        </div>
        <h3 class="text-xl font-bold mb-4">${this.t('yourListings')}</h3>
        <div class="space-y-3">${listings.map(l => `
          <div class="rounded-2xl border border-white/10 p-4 flex justify-between items-center">
            <div><strong>${l.title}</strong><br><span class="text-sm text-[#7a9bb6]">${l.status} · $${l.price}</span></div>
            <button onclick="App.deleteListing('${l.id}')" class="text-red-400 text-sm">${this.t('delete')}</button>
          </div>`).join('') || `<p class="text-[#7a9bb6]">${this.t('noListings')}</p>`}</div>`;
      document.getElementById('hl-country').innerHTML = SaqartourRegions.countryOptions('GE');
      document.getElementById('hl-city').innerHTML = SaqartourRegions.cityOptions('GE', 'Tbilisi');
      document.getElementById('hl-country').onchange = (e) => {
        document.getElementById('hl-city').innerHTML = SaqartourRegions.cityOptions(e.target.value, '');
      };
    } catch (e) { el.innerHTML = `<p>${this.t('couldNotLoadHost')}</p>`; }
  },

  async createListing() {
    try {
      await SaqartourAPI.post('/hosts/listings', {
        type: document.getElementById('hl-type').value,
        title: document.getElementById('hl-title').value,
        country: document.getElementById('hl-country').value,
        city: document.getElementById('hl-city').value,
        price: document.getElementById('hl-price').value,
        image_url: document.getElementById('hl-image').value,
        description: document.getElementById('hl-desc').value
      });
      alert('✅ ' + this.t('listingSubmitted'));
      this.renderHostPanel();
      this.loadHostListings();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async deleteListing(id) {
    if (!confirm(this.t('deleteListingConfirm'))) return;
    await SaqartourAPI.delete(`/hosts/listings/${id}`);
    this.renderHostPanel();
    this.loadHostListings();
  },

  async redeemFunds() {
    if (!this.requireVerified()) return;
    try {
      const data = await SaqartourAPI.post('/wallet/redeem', { amount: document.getElementById('redeem-amount').value });
      alert('💸 ' + data.message);
      this.renderWallet();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async requestVerification() {
    if (!this.currentUser) { this.modal('login-modal', true); return; }
    try {
      const data = await SaqartourAPI.post('/wallet/verify-level');
      alert('🎖️ ' + data.message);
      this.renderWallet();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async renderProfile() {
    const el = document.getElementById('profile-content');
    if (!el) return;
    if (!this.currentUser) {
      el.innerHTML = `<div class="glass-card p-8"><p class="text-[var(--muted)]">✨ ${this.t('joinUnlock')}</p></div>`;
      return;
    }
    const u = this.currentUser;
    const tier = this.getPointsTier(u.points || 0);
    const typeBadge = u.account_type === 'host' ? '🏠 ' + this.t('hostBadge') : '🧳 ' + this.t('travelerBadge');
    const verifiedLvl = u.verified_level || 1;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?ref=${u.referral_code}`;
    const progressText = tier.next
      ? this.t('profileNextTier', { pts: tier.pointsToNext, tier: this.t(tier.next.labelKey) })
      : this.t('profileMaxTier');
    const rewards = [
      { icon: '🎁', title: this.t('pointsRewardReferral'), desc: this.t('pointsRewardReferralDesc') },
      { icon: '🏠', title: this.t('pointsRewardHost'), desc: this.t('pointsRewardHostDesc') },
      { icon: '💬', title: this.t('pointsRewardThread'), desc: this.t('pointsRewardThreadDesc') },
      { icon: '💸', title: this.t('pointsRewardRedeem'), desc: this.t('pointsRewardRedeemDesc') },
      { icon: '🎖️', title: this.t('pointsRewardL2'), desc: this.t('pointsRewardL2Desc') }
    ];
    el.innerHTML = `
      <div class="profile-invite-card glass-card">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-xl">
            <h3 class="text-xl font-bold">${this.t('profileInviteTitle')}</h3>
            <p class="text-sm text-[var(--muted)] mt-2">${this.t('profileInviteDesc')}</p>
          </div>
          <div class="text-right">
            <div class="profile-referral-code">${u.referral_code}</div>
            <div class="flex flex-wrap gap-2 mt-3 justify-end">
              <button onclick="navigator.clipboard.writeText('${u.referral_code}');alert('${this.t('copied')}')" class="btn-pill px-4 py-2 text-sm">${this.t('copyReferral')}</button>
              <button onclick="navigator.clipboard.writeText('${inviteUrl}');alert('${this.t('copied')}')" class="btn-pill px-4 py-2 text-sm bg-[var(--hover-bg)]">${this.t('copyReferralLink')}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="profile-hero">
        <div class="profile-identity-card glass-card">
          <div class="relative z-10 flex flex-wrap items-center gap-4">
            <div class="profile-avatar-ring">${u.account_type === 'host' ? '🏠' : '🧳'}</div>
            <div class="min-w-0 flex-1">
              <h3 class="text-2xl lg:text-3xl font-bold truncate">${u.username}</h3>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="text-sm text-[var(--primary)]">${typeBadge}</span>
                <span class="profile-tier-badge">${tier.current.icon} ${this.t(tier.current.labelKey)}</span>
                ${verifiedLvl >= 2 ? `<span class="profile-tier-badge">L${verifiedLvl} ✓</span>` : ''}
              </div>
              <p class="text-sm text-[var(--muted)] mt-3">📧 ${u.email} ${u.verified_email ? '✅' : '⚠️ ' + this.t('unverified')}</p>
              <p class="text-sm text-[var(--muted)] mt-1">🌍 ${u.nationality || '—'}</p>
            </div>
          </div>
          <div class="relative z-10 profile-progress-wrap">
            <div class="flex justify-between text-xs text-[var(--muted)] mb-1">
              <span>${this.t('profileTier')}</span>
              <span>${progressText}</span>
            </div>
            <div class="profile-progress-bar"><div class="profile-progress-fill" style="width:${tier.progress}%"></div></div>
          </div>
          <div class="relative z-10 profile-stats-grid">
            <div class="profile-stat"><strong>${u.points || 0}</strong><span>${this.t('points')}</span></div>
            <div class="profile-stat"><strong>$${(u.wallet || 0).toFixed(0)}</strong><span>${this.t('balance')}</span></div>
            <div class="profile-stat"><strong>L${verifiedLvl}</strong><span>${this.t('level')}</span></div>
          </div>
        </div>
        <div class="profile-rewards-card glass-card">
          <h4 class="font-bold text-lg mb-1">${this.t('profilePointsTitle')}</h4>
          <p class="text-xs text-[var(--muted)] mb-3">${this.t('profilePointsDesc')}</p>
          ${rewards.map(r => `
            <div class="profile-reward-item">
              <div class="profile-reward-icon">${r.icon}</div>
              <div>
                <div class="font-semibold text-sm">${r.title}</div>
                <div class="text-xs text-[var(--muted)] mt-0.5">${r.desc}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="profile-settings-card glass-card">
        <h4 class="font-bold text-lg mb-4">${this.t('profileSettings')}</h4>
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-4">
            <div>
              <label class="text-xs text-[var(--muted)] uppercase">${this.t('changeUsername')}</label>
              <div class="flex gap-2 mt-1">
                <input id="profile-username" value="${u.username}" class="flex-1 custom-select rounded-full px-4 py-3 border border-white/10">
                <button onclick="App.changeUsername()" class="btn-pill px-4 py-3">${this.t('save')}</button>
              </div>
            </div>
            <input id="profile-address" value="${u.address || ''}" placeholder="${this.t('regAddress')}" class="w-full custom-select rounded-full px-4 py-3 border border-white/10">
            <select id="profile-nationality" class="w-full custom-select rounded-full px-4 py-3 border border-white/10">
              ${SaqartourRegions.countries.map(c => `<option value="${c.name}" ${u.nationality===c.name?'selected':''}>${c.flag} ${c.name}</option>`).join('')}
            </select>
            <button onclick="App.saveProfile()" class="btn-pill w-full py-3 font-semibold" style="background:var(--primary);color:#041018">${this.t('saveProfile')}</button>
            ${!u.verified_email ? `<button onclick="App.modal('verify-email-modal',true)" class="btn-pill w-full border border-amber-400/50 py-3">✉️ ${this.t('verifyNow')}</button>` : ''}
          </div>
          <div class="pt-0 lg:pt-0 lg:pl-4 lg:border-l border-[var(--border)]">
            <label class="text-xs text-[var(--muted)] uppercase">${this.t('changePassword')}</label>
            <input id="profile-current-pass" type="password" placeholder="${this.t('currentPassword')}" class="w-full custom-select rounded-full px-4 py-3 mt-2 border border-white/10">
            <input id="profile-new-pass" type="password" placeholder="${this.t('newPass')}" class="w-full custom-select rounded-full px-4 py-3 mt-2 border border-white/10">
            <input id="profile-new-pass2" type="password" placeholder="${this.t('confirmPass')}" class="w-full custom-select rounded-full px-4 py-3 mt-2 border border-white/10">
            <button onclick="App.changePassword()" class="btn-pill w-full mt-3 py-3">${this.t('changePasswordBtn')}</button>
          </div>
        </div>
      </div>`;
  },

  async changePassword() {
    const password = document.getElementById('profile-new-pass')?.value;
    const password_confirm = document.getElementById('profile-new-pass2')?.value;
    if (password !== password_confirm) return alert('❌ ' + this.t('passwordMismatch'));
    try {
      const data = await SaqartourAPI.post('/auth/change-password', {
        current_password: document.getElementById('profile-current-pass')?.value,
        password, password_confirm
      });
      if (data.token) SaqartourAPI.setToken(data.token);
      alert('✅ ' + this.t('passwordChanged'));
      this.renderProfile();
    } catch (e) { alert('❌ ' + e.message); }
  },

  async changeUsername() {
    try {
      const data = await SaqartourAPI.put('/auth/username', { username: document.getElementById('profile-username').value.trim() });
      if (data.token) SaqartourAPI.setToken(data.token);
      this.currentUser = data.user;
      this.updateNav();
      alert(data.message || '✏️ ' + this.t('usernameUpdated'));
    } catch (e) { alert('❌ ' + e.message); }
  },

  async saveProfile() {
    try {
      const { user } = await SaqartourAPI.put('/wallet/profile', {
        address: document.getElementById('profile-address').value,
        nationality: document.getElementById('profile-nationality').value
      });
      this.currentUser = user;
      alert('💾 ' + this.t('profileSaved'));
    } catch (e) { alert('❌ ' + e.message); }
  }
};

window.App = App;