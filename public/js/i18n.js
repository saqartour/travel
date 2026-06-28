window.SaqartourI18n = {
  lang: localStorage.getItem('gtf_language') || 'en',
  translations: {},
  ready: false,
  fallback: {},
  languages: [
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'ka', flag: '🇬🇪', label: 'KA' },
    { code: 'ru', flag: '🇷🇺', label: 'RU' },
    { code: 'ar', flag: '🇸🇦', label: 'AR' }
  ],

  async init() {
    try {
      const res = await fetch('/locales/en.json');
      this.fallback = await res.json();
    } catch {
      this.fallback = {};
    }
    await this.loadLocale(this.lang);
    this.ready = true;
  },

  async loadLocale(lang) {
    if (this.translations[lang]) return;
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error('missing');
      this.translations[lang] = await res.json();
    } catch {
      this.translations[lang] = this.fallback;
    }
  },

  t(key, vars = {}) {
    const dict = this.translations[this.lang] || this.fallback;
    let str = dict[key] || this.fallback[key] || key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''));
    });
    return str;
  },

  applyDom() {
    const dict = this.translations[this.lang] || this.fallback;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) el.placeholder = dict[key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      if (dict[key]) el.title = dict[key];
    });
    document.title = dict.pageTitle || 'Saqartour';
    const meta = document.querySelector('meta[name="description"]');
    if (meta && dict.metaDesc) meta.content = dict.metaDesc;
    this.renderLanguageSelect();
  },

  renderLanguageSelect() {
    const sel = document.getElementById('language-select');
    if (!sel) return;
    sel.innerHTML = this.languages.map(l =>
      `<option value="${l.code}">${l.flag} ${l.label}</option>`
    ).join('');
    sel.value = this.lang;
  },

  async setLanguage(lang) {
    if (!['en', 'ka', 'ru', 'ar'].includes(lang)) lang = 'en';
    await this.loadLocale(lang);
    this.lang = lang;
    localStorage.setItem('gtf_language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    this.applyDom();
    if (window.App?.refreshI18n) await App.refreshI18n();
  }
};