const AdminCRM = {
  currentUser: null,
  users: [],
  editingUserId: null,

  async init() {
    try {
      const { user } = await SaqartourAPI.get('/auth/me');
      if (user && (user.role === 'admin' || user.role === 'moderator')) {
        this.currentUser = user;
        this.showApp();
        await this.loadDashboard();
      } else {
        this.showLogin();
      }
    } catch {
      this.showLogin();
    }
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-app').classList.add('hidden');
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    document.getElementById('admin-welcome').textContent = this.currentUser.username;
  },

  async login() {
    try {
      const data = await SaqartourAPI.post('/auth/login', {
        identifier: document.getElementById('admin-email').value.trim(),
        password: document.getElementById('admin-password').value
      });
      if (data.user.role !== 'admin' && data.user.role !== 'moderator') {
        alert('Admin or moderator access required.');
        return;
      }
      SaqartourAPI.setToken(data.token);
      this.currentUser = data.user;
      this.showApp();
      await this.loadDashboard();
    } catch (e) {
      document.getElementById('login-error').textContent = e.message;
    }
  },

  async logout() {
    await SaqartourAPI.post('/auth/logout').catch(() => {});
    SaqartourAPI.setToken(null);
    this.showLogin();
  },

  showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${id}`)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === id));
    const loaders = { dashboard: () => this.loadDashboard(), users: () => this.loadUsers(), threads: () => this.loadThreads(), tours: () => this.loadTours(), bookings: () => this.loadBookings(), chat: () => this.loadChat(), iplogs: () => this.loadIpLogs(), audit: () => this.loadAudit() };
    loaders[id]?.();
  },

  async loadDashboard() {
    try {
      const data = await SaqartourAPI.get('/admin/dashboard');
      const s = data.stats;
      document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card"><div class="label">Users</div><div class="value">${s.users}</div></div>
        <div class="stat-card"><div class="label">Verified</div><div class="value">${s.verified}</div></div>
        <div class="stat-card"><div class="label">Bookings</div><div class="value">${s.bookings}</div></div>
        <div class="stat-card"><div class="label">Revenue</div><div class="value">$${Number(s.revenue).toFixed(0)}</div></div>
        <div class="stat-card"><div class="label">Pending Threads</div><div class="value">${s.pendingThreads}</div></div>
        <div class="stat-card"><div class="label">Active Tours</div><div class="value">${s.tours}</div></div>
        <div class="stat-card"><div class="label">Banned</div><div class="value">${s.banned}</div></div>
        <div class="stat-card"><div class="label">Logins Today</div><div class="value">${s.todayLogins}</div></div>`;

      document.getElementById('recent-logins').innerHTML = (data.recentLogins || []).map(l => `
        <tr><td>${l.username || '—'}</td><td class="ip-mono">${l.ip}</td><td>${l.action}</td><td>${new Date(l.created_at).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="4">No recent logins</td></tr>';

      document.getElementById('recent-audit').innerHTML = (data.recentActivity || []).map(a => `
        <tr><td>${a.admin_name}</td><td>${a.action}</td><td>${a.target_type || '—'}</td><td>${new Date(a.created_at).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="4">No activity</td></tr>';
    } catch (e) { console.error(e); }
  },

  async loadUsers() {
    const search = document.getElementById('user-search')?.value || '';
    const status = document.getElementById('user-status-filter')?.value || '';
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    try {
      const { users } = await SaqartourAPI.get(`/admin/users?${q}`);
      this.users = users;
      document.getElementById('users-table').innerHTML = users.map(u => `
        <tr>
          <td><strong>${u.username}</strong><br><span class="text-muted" style="color:var(--muted);font-size:0.75rem">${u.email}</span></td>
          <td><span class="badge badge-${u.role}">${u.role}</span> ${u.account_type === 'host' ? '🏠' : '🧳'}</td>
          <td><span class="badge badge-${u.status}">${u.status}</span></td>
          <td class="ip-mono">${u.registration_ip || '—'}</td>
          <td class="ip-mono">${u.last_login_ip || '—'}</td>
          <td>${u.points}</td>
          <td>$${(u.wallet || 0).toFixed(2)}</td>
          <td>${u.verified_email ? '✓' : '✗'}</td>
          <td>${new Date(u.registered_at).toLocaleDateString()}</td>
          <td><div class="btn-group">
            <button class="btn btn-sm" onclick="AdminCRM.viewUser('${u.id}')">View</button>
            <button class="btn btn-sm" onclick="AdminCRM.editUser('${u.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="AdminCRM.deleteUser('${u.id}')">Delete</button>
          </div></td>
        </tr>`).join('') || '<tr><td colspan="10">No users found</td></tr>';
    } catch (e) { alert(e.message); }
  },

  async viewUser(id) {
    try {
      const data = await SaqartourAPI.get(`/admin/users/${id}`);
      const u = data.user;
      document.getElementById('user-detail-content').innerHTML = `
        <h3>${u.username} <span class="badge badge-${u.role}">${u.role}</span></h3>
        <div class="form-grid mt-4">
          <div><label>Email</label><p>${u.email}</p></div>
          <div><label>Status</label><p><span class="badge badge-${u.status}">${u.status}</span></p></div>
          <div><label>Registration IP</label><p class="ip-mono">${u.registration_ip || '—'}</p></div>
          <div><label>Last Login IP</label><p class="ip-mono">${u.last_login_ip || '—'}</p></div>
          <div><label>Points / Wallet</label><p>${u.points} pts · $${(u.wallet||0).toFixed(2)}</p></div>
          <div><label>Referral</label><p>${u.referral_code}</p></div>
        </div>
        <h4 class="mt-6 mb-2">IP History</h4>
        <table><thead><tr><th>IP</th><th>Action</th><th>Date</th></tr></thead>
        <tbody>${(data.ipHistory||[]).map(l=>`<tr><td class="ip-mono">${l.ip}</td><td>${l.action}</td><td>${new Date(l.created_at).toLocaleString()}</td></tr>`).join('')}</tbody></table>
        <h4 class="mt-6 mb-2">Bookings</h4>
        <table><thead><tr><th>Tour</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>${(data.bookings||[]).map(b=>`<tr><td>${b.tour_title}</td><td><span class="badge badge-${b.status}">${b.status}</span></td><td>$${b.total_price}</td></tr>`).join('') || '<tr><td colspan="3">None</td></tr>'}</tbody></table>`;
      document.getElementById('user-detail-modal').classList.remove('hidden');
    } catch (e) { alert(e.message); }
  },

  openAddUser() {
    this.editingUserId = null;
    document.getElementById('user-form-title').textContent = 'Add New User';
    document.getElementById('user-form').reset();
    document.getElementById('user-form-id').value = '';
    document.getElementById('user-form-modal').classList.remove('hidden');
  },

  editUser(id) {
    const u = this.users.find(x => x.id === id);
    if (!u) return;
    this.editingUserId = id;
    document.getElementById('user-form-title').textContent = 'Edit User';
    document.getElementById('user-form-id').value = id;
    document.getElementById('uf-username').value = u.username;
    document.getElementById('uf-email').value = u.email;
    document.getElementById('uf-address').value = u.address || '';
    document.getElementById('uf-nationality').value = u.nationality || 'Georgia';
    document.getElementById('uf-points').value = u.points;
    document.getElementById('uf-wallet').value = u.wallet;
    document.getElementById('uf-role').value = u.role;
    document.getElementById('uf-account-type').value = u.account_type || 'traveler';
    document.getElementById('uf-status').value = u.status;
    document.getElementById('uf-verified').checked = u.verified_email;
    document.getElementById('uf-password').value = '';
    document.getElementById('user-form-modal').classList.remove('hidden');
  },

  async saveUser() {
    const body = {
      username: document.getElementById('uf-username').value.trim(),
      email: document.getElementById('uf-email').value.trim(),
      address: document.getElementById('uf-address').value,
      nationality: document.getElementById('uf-nationality').value,
      points: parseInt(document.getElementById('uf-points').value) || 0,
      wallet: parseFloat(document.getElementById('uf-wallet').value) || 0,
      role: document.getElementById('uf-role').value,
      account_type: document.getElementById('uf-account-type')?.value || 'traveler',
      status: document.getElementById('uf-status').value,
      verified_email: document.getElementById('uf-verified').checked
    };
    const pw = document.getElementById('uf-password').value;
    if (pw) body.password = pw;
    try {
      if (this.editingUserId) {
        await SaqartourAPI.put(`/admin/users/${this.editingUserId}`, body);
      } else {
        if (!pw) { alert('Password required for new user'); return; }
        body.password = pw;
        await SaqartourAPI.post('/admin/users', body);
      }
      document.getElementById('user-form-modal').classList.add('hidden');
      this.loadUsers();
      alert('User saved.');
    } catch (e) { alert(e.message); }
  },

  async deleteUser(id) {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await SaqartourAPI.delete(`/admin/users/${id}`);
      this.loadUsers();
    } catch (e) { alert(e.message); }
  },

  async loadThreads() {
    try {
      const { threads } = await SaqartourAPI.get('/admin/threads/pending');
      document.getElementById('threads-table').innerHTML = threads.map(t => `
        <tr>
          <td>${t.title}</td><td>${t.category}</td><td>${t.author_name}</td>
          <td>${new Date(t.created_at).toLocaleDateString()}</td>
          <td><div class="btn-group">
            <button class="btn btn-sm btn-primary" onclick="AdminCRM.reviewThread('${t.id}','approved')">Approve</button>
            <button class="btn btn-sm btn-danger" onclick="AdminCRM.reviewThread('${t.id}','rejected')">Reject</button>
          </div></td>
        </tr>`).join('') || '<tr><td colspan="5">No pending threads</td></tr>';
    } catch (e) { alert(e.message); }
  },

  async reviewThread(id, status) {
    await SaqartourAPI.patch(`/admin/threads/${id}`, { status });
    this.loadThreads();
  },

  async loadTours() {
    try {
      const { tours } = await SaqartourAPI.get('/admin/tours');
      document.getElementById('tours-table').innerHTML = tours.map(t => `
        <tr>
          <td>${t.title}</td><td>${t.destination}</td><td>$${t.price}</td><td>${t.duration_days}d</td>
          <td><span class="badge badge-${t.status}">${t.status}</span></td>
          <td><button class="btn btn-sm btn-danger" onclick="AdminCRM.deleteTour('${t.id}')">Delete</button></td>
        </tr>`).join('');
    } catch (e) { alert(e.message); }
  },

  async addTour() {
    const title = document.getElementById('new-tour-title').value.trim();
    if (!title) return;
    await SaqartourAPI.post('/admin/tours', {
      title, destination: document.getElementById('new-tour-dest').value,
      price: parseFloat(document.getElementById('new-tour-price').value) || 99,
      duration_days: parseInt(document.getElementById('new-tour-days').value) || 1,
      description: document.getElementById('new-tour-desc').value
    });
    document.getElementById('new-tour-title').value = '';
    this.loadTours();
  },

  async deleteTour(id) {
    if (!confirm('Delete tour?')) return;
    await SaqartourAPI.delete(`/admin/tours/${id}`);
    this.loadTours();
  },

  async loadBookings() {
    try {
      const { bookings } = await SaqartourAPI.get('/admin/bookings');
      document.getElementById('bookings-table').innerHTML = bookings.map(b => `
        <tr>
          <td>${b.tour_title}</td><td>${b.username}<br><span style="color:var(--muted);font-size:0.75rem">${b.email}</span></td>
          <td class="ip-mono">${b.last_login_ip || b.registration_ip || '—'}</td>
          <td>${b.guests}</td><td>$${b.total_price}</td><td>${b.travel_date || 'TBD'}</td>
          <td><span class="badge badge-${b.status}">${b.status}</span></td>
          <td><div class="btn-group">
            <button class="btn btn-sm btn-primary" onclick="AdminCRM.updateBooking('${b.id}','confirmed')">Confirm</button>
            <button class="btn btn-sm" onclick="AdminCRM.updateBooking('${b.id}','completed')">Complete</button>
            <button class="btn btn-sm btn-danger" onclick="AdminCRM.updateBooking('${b.id}','cancelled')">Cancel</button>
          </div></td>
        </tr>`).join('') || '<tr><td colspan="8">No bookings</td></tr>';
    } catch (e) { alert(e.message); }
  },

  async updateBooking(id, status) {
    await SaqartourAPI.patch(`/admin/bookings/${id}`, { status });
    this.loadBookings();
  },

  async loadChat() {
    try {
      const { messages } = await SaqartourAPI.get('/admin/chat');
      document.getElementById('chat-table').innerHTML = messages.map(m => `
        <tr>
          <td>${m.username}</td><td>${m.category}</td><td>${m.message.slice(0,80)}</td>
          <td>${new Date(m.created_at).toLocaleString()}</td>
          <td><button class="btn btn-sm btn-danger" onclick="AdminCRM.deleteChat('${m.id}')">Delete</button></td>
        </tr>`).join('');
    } catch (e) { alert(e.message); }
  },

  async deleteChat(id) {
    await SaqartourAPI.delete(`/admin/chat/${id}`);
    this.loadChat();
  },

  async loadIpLogs() {
    try {
      const { logs } = await SaqartourAPI.get('/admin/ip-logs');
      document.getElementById('iplogs-table').innerHTML = logs.map(l => `
        <tr>
          <td>${l.username || '—'}<br><span style="color:var(--muted);font-size:0.75rem">${l.email || ''}</span></td>
          <td class="ip-mono">${l.ip}</td><td>${l.action}</td>
          <td style="font-size:0.75rem;max-width:200px;overflow:hidden">${(l.user_agent||'').slice(0,60)}</td>
          <td>${new Date(l.created_at).toLocaleString()}</td>
        </tr>`).join('');
    } catch (e) { alert(e.message); }
  },

  async loadAudit() {
    try {
      const { logs } = await SaqartourAPI.get('/admin/audit');
      document.getElementById('audit-table').innerHTML = logs.map(l => `
        <tr>
          <td>${l.admin_name}</td><td>${l.action}</td><td>${l.target_type || '—'}</td>
          <td class="ip-mono">${l.ip || '—'}</td><td>${new Date(l.created_at).toLocaleString()}</td>
        </tr>`).join('');
    } catch (e) { alert(e.message); }
  }
};

document.addEventListener('DOMContentLoaded', () => AdminCRM.init());