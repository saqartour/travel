const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'saqartour.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      address TEXT DEFAULT '',
      nationality TEXT DEFAULT 'Georgia',
      points INTEGER DEFAULT 50,
      wallet REAL DEFAULT 0,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      verified_level INTEGER DEFAULT 1,
      verified_email INTEGER DEFAULT 0,
      two_factor_enabled INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      registration_ip TEXT,
      last_login_ip TEXT,
      last_seen_at TEXT,
      registered_at TEXT NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ip_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      ip TEXT NOT NULL,
      action TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      body TEXT,
      author_id TEXT,
      author_name TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS thread_comments (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      author_id TEXT,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tours (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      destination TEXT NOT NULL,
      description TEXT,
      duration_days INTEGER DEFAULT 1,
      price REAL NOT NULL,
      max_guests INTEGER DEFAULT 12,
      rating REAL DEFAULT 4.5,
      image_url TEXT,
      highlights TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      tour_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      guests INTEGER DEFAULT 1,
      total_price REAL NOT NULL,
      travel_date TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      country TEXT DEFAULT 'Georgia',
      description TEXT,
      image_url TEXT,
      highlights TEXT,
      best_season TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT,
      admin_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      crypto_type TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_ip_logs_user ON ip_logs(user_id);

    CREATE TABLE IF NOT EXISTS host_listings (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      host_name TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      price REAL NOT NULL,
      price_unit TEXT DEFAULT 'night',
      image_url TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'pending',
      metadata TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      emoji TEXT DEFAULT '❓',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );
  `);

  runMigrations();
  seedIfEmpty();
}

function runMigrations() {
  const addCol = (table, col, def) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  };
  addCol('users', 'account_type', "TEXT DEFAULT 'traveler'");
  addCol('users', 'verification_code', 'TEXT');
  addCol('users', 'verification_expires', 'TEXT');
  addCol('users', 'password_reset_token', 'TEXT');
  addCol('users', 'password_reset_expires', 'TEXT');
  addCol('bookings', 'payment_status', "TEXT DEFAULT 'unpaid'");
  addCol('bookings', 'stripe_session_id', 'TEXT');
  addCol('threads', 'country', "TEXT DEFAULT 'GE'");
  addCol('threads', 'city', "TEXT DEFAULT 'Tbilisi'");
  addCol('threads', 'subcategory', "TEXT DEFAULT 'general'");
  addCol('chat_messages', 'country', "TEXT DEFAULT 'GE'");
  addCol('chat_messages', 'city', 'TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_chat_country_city ON chat_messages(country, city, created_at)');
}

function seedIfEmpty() {
  const tourCount = db.prepare('SELECT COUNT(*) as c FROM tours').get().c;
  if (tourCount === 0) {
    const now = new Date().toISOString();
    const tours = [
      ['t1', 'Tbilisi Old Town & Wine Culture', 'tbilisi-old-town-wine', 'Tbilisi', 'Explore cobblestone streets, sulfur baths, and premium Georgian wine tastings in the capital.', 3, 299, 14, 4.9, 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800', 'Old Town,Sulfur Baths,Wine Tasting,Local Cuisine', 'active', now],
      ['t2', 'Kazbegi & Gergeti Trinity', 'kazbegi-gergeti', 'Kazbegi', 'Mountain adventure to Stepantsminda with iconic Gergeti Trinity Church views.', 2, 189, 10, 4.8, 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800', 'Gergeti Church,Mountain Views,Hiking,Caucasus', 'active', now],
      ['t3', 'Batumi Black Sea Escape', 'batumi-black-sea', 'Batumi', 'Coastal getaway with botanical gardens, modern architecture, and seaside dining.', 4, 349, 16, 4.7, 'https://images.unsplash.com/photo-1596484552834-065fdc446d5b?w=800', 'Black Sea,Botanical Garden,Seaside,Boulevard', 'active', now],
      ['t4', 'Kakheti Wine Region', 'kakheti-wine-region', 'Kakheti', 'Full-day journey through Georgia\'s premier wine region with cellar visits and feasts.', 2, 219, 12, 4.9, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', 'Wineries,Qvevri,Sighnaghi,Traditional Feast', 'active', now],
      ['t5', 'Svaneti UNESCO Heritage', 'svaneti-heritage', 'Svaneti', 'Discover medieval towers, alpine villages, and untouched Caucasus landscapes.', 5, 599, 8, 4.95, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'Mestia,Ushguli,UNESCO,Trekking', 'active', now],
      ['t6', 'Vardzia Cave City', 'vardzia-cave-city', 'Samtskhe-Javakheti', 'Ancient cave monastery complex and Borjomi mineral springs experience.', 2, 175, 15, 4.6, 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800', 'Vardzia Caves,Borjomi,History,Scenic Drive', 'active', now]
    ];
    const insertTour = db.prepare(`INSERT INTO tours (id, title, slug, destination, description, duration_days, price, max_guests, rating, image_url, highlights, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    tours.forEach(t => insertTour.run(...t));

    const destinations = [
      ['d1', 'Tbilisi', 'tbilisi', 'Georgia', 'The vibrant capital blending ancient history with a thriving creative scene.', 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800', 'Old Town,Nightlife,Wine Bars,Sulfur Baths', 'Spring–Autumn', 'active'],
      ['d2', 'Batumi', 'batumi', 'Georgia', 'Georgia\'s seaside resort city on the Black Sea with subtropical charm.', 'https://images.unsplash.com/photo-1596484552834-065fdc446d5b?w=800', 'Beach,Boulevard,Casino,Botanical Garden', 'Summer', 'active'],
      ['d3', 'Kazbegi', 'kazbegi', 'Georgia', 'Alpine gateway to the Greater Caucasus and Gergeti Trinity Church.', 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800', 'Mountains,Hiking,Skiing,Photography', 'Year-round', 'active'],
      ['d4', 'Kakheti', 'kakheti', 'Georgia', 'Heart of Georgian winemaking with rolling vineyards and hilltop towns.', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', 'Wine,Qvevri,Sighnaghi,Alaverdi', 'Harvest Season', 'active'],
      ['d5', 'Svaneti', 'svaneti', 'Georgia', 'Remote highland region with UNESCO-listed medieval tower villages.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'Mestia,Ushguli,Trekking,Culture', 'Summer', 'active']
    ];
    const insertDest = db.prepare(`INSERT INTO destinations (id, name, slug, country, description, image_url, highlights, best_season, status) VALUES (?,?,?,?,?,?,?,?,?)`);
    destinations.forEach(d => insertDest.run(...d));

    const threads = [
      ['th1', 'Best boutique hotels in Tbilisi old town?', 'hotels', 'Looking for refined yet affordable stays with local character.', null, 'maria_travels', 18, 3, 'approved', now, 'GE', 'Tbilisi', 'hotels'],
      ['th2', 'Is Batumi good for winter travel?', 'general', 'Curious about winter beach vibes and food scene.', null, 'travel_john', 0, 0, 'pending', now, 'GE', 'Batumi', 'general'],
      ['th3', 'Reliable car rental in Yerevan?', 'car_rentals', 'Need SUV for highland roads — any trusted companies?', null, 'armenia_fan', 12, 2, 'approved', now, 'AM', 'Yerevan', 'car_rentals']
    ];
    const insertThread = db.prepare(`INSERT INTO threads (id, title, category, body, author_id, author_name, points, comment_count, status, created_at, country, city, subcategory) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    threads.forEach(t => insertThread.run(...t));
  }

  const faqCount = db.prepare('SELECT COUNT(*) as c FROM faqs').get().c;
  if (faqCount === 0) {
    const faqs = [
      ['faq1', 'account', 'How do I register as a Host vs Traveler?', 'Choose your account type during signup. 🧳 Travelers explore and book. 🏠 Hosts list properties, tours, or rental services and get a host badge on their profile.', '👤', 1],
      ['faq2', 'account', 'How does email verification work?', 'After registering, a real 6-digit code is sent to your email inbox. Enter it within 30 minutes to unlock forum, chat, and bookings. Check spam if needed. ✉️', '✉️', 2],
      ['faq3', 'account', 'Can I change my username?', 'Yes! Go to Profile → Edit Username. Usernames must be unique and 3–24 characters. You can update anytime. ✏️', '✏️', 3],
      ['faq4', 'forum', 'How are forums organized?', 'Forums are split by 🌍 country → 🏙️ city → subcategory (Hotels 🏨, Car Rentals 🚗, Tours 🗺️, Food 🍽️, Tips 💡). Pick your destination and topic!', '🌍', 4],
      ['faq5', 'chat', 'How does live chat work?', 'Select a country flag, then optionally a city channel. Chat with travelers worldwide in real-time. 80+ countries available! 💬', '💬', 5],
      ['faq6', 'wallet', 'What is the points and wallet system?', 'Earn points from referrals (+30), forum activity, and redemptions. Top up wallet via crypto. Level 2 verification unlocks redemptions. 💰', '💰', 6],
      ['faq7', 'bookings', 'How do tour bookings work?', 'Browse tours, pick dates and guests, submit booking. Admin confirms within 24h. Track status in My Bookings. 🎫', '🎫', 7],
      ['faq8', 'hosts', 'What benefits do Hosts get?', 'Hosts get a 🏠 badge, priority forum visibility, +20 bonus points on signup, and access to list services in Hotels/Tours categories.', '🏠', 8]
    ];
    const ins = db.prepare('INSERT INTO faqs (id, category, question, answer, emoji, sort_order) VALUES (?,?,?,?,?,?)');
    faqs.forEach(f => ins.run(...f));
  }

  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
  if (adminCount === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'saqartour@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Sakartvelo2026!';
    const adminUser = process.env.ADMIN_USERNAME || 'saqartour_admin';
    const hash = bcrypt.hashSync(adminPass, 10);
    const id = 'admin-' + Date.now();
    db.prepare(`INSERT INTO users (id, username, email, password_hash, role, referral_code, verified_email, verified_level, points, registered_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, adminUser, adminEmail, hash, 'admin', 'GTFADMIN', 1, 2, 9999, new Date().toISOString()
    );
  }
}

function generateReferralCode() {
  return 'GTF' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

module.exports = { db, initDb, generateReferralCode };