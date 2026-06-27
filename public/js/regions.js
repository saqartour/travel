window.SaqartourRegions = {
  countries: [],
  subcategories: [],

  async load() {
    try {
      const data = await SaqartourAPI.get('/regions');
      this.countries = data.countries || [];
      this.subcategories = data.subcategories || [];
    } catch {
      this.countries = [{ code: 'GE', name: 'Georgia', flag: '🇬🇪', cities: ['Tbilisi', 'Batumi'] }];
      this.subcategories = [{ id: 'general', label: 'General', emoji: '💬' }, { id: 'hotels', label: 'Hotels', emoji: '🏨' }];
    }
    return this;
  },

  getCountry(code) {
    return this.countries.find(c => c.code === code);
  },

  countryOptions(selected) {
    return this.countries.map(c =>
      `<option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${c.flag} ${c.name}</option>`
    ).join('');
  },

  cityOptions(countryCode, selected) {
    const c = this.getCountry(countryCode);
    if (!c) return '<option value="">—</option>';
    const all = window.SaqartourI18n?.t('allCities') || 'All cities';
    return `<option value="">${all}</option>` + c.cities.map(city =>
      `<option value="${city}" ${city === selected ? 'selected' : ''}>🏙️ ${city}</option>`
    ).join('');
  },

  subcategoryOptions(selected) {
    const all = window.SaqartourI18n?.t('allTopics') || 'All topics';
    return `<option value="all">${all}</option>` + this.subcategories.map(s =>
      `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${s.emoji} ${s.label}</option>`
    ).join('');
  }
};