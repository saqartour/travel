window.SaqartourAPI = {
  token: localStorage.getItem('gtf_token') || null,

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('gtf_token', token);
    else localStorage.removeItem('gtf_token');
  },

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  },

  get: (path) => SaqartourAPI.request(path),
  post: (path, body) => SaqartourAPI.request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => SaqartourAPI.request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => SaqartourAPI.request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => SaqartourAPI.request(path, { method: 'DELETE' })
};