window.SaqartourSocket = {
  socket: null,

  connect() {
    if (this.socket?.connected) return this.socket;
    if (typeof io === 'undefined') return null;

    this.socket = io({
      auth: { token: SaqartourAPI.token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      if (window.App) App.onSocketConnect?.();
    });

    this.socket.on('new_message', (msg) => {
      if (window.App) App.onSocketMessage?.(msg);
    });

    this.socket.on('error', (data) => {
      if (data?.error) alert('❌ ' + data.error);
    });

    return this.socket;
  },

  join(country, city) {
    const s = this.connect();
    if (!s) return;
    s.emit('join', { country, city: city || '' });
  },

  send(message, country, city) {
    const s = this.connect();
    if (!s) return false;
    s.emit('send_message', { message, country, city: city || '' });
    return true;
  },

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
};