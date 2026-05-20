const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();
const DATA_PATH = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cookieParser());

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map(cookie => {
    const parts = cookie.split('=');
    return [decodeURIComponent(parts.shift().trim()), decodeURIComponent(parts.join('=').trim())];
  }));
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies.cmsAuth === 'true';
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const initialData = readData();
if (!initialData.adminSalt || !initialData.adminPasswordHash) {
  const defaultSalt = crypto.randomBytes(16).toString('hex');
  const defaultHash = hashPassword('admin123', defaultSalt);
  writeData({ ...initialData, adminSalt: defaultSalt, adminPasswordHash: defaultHash });
}

app.get('/admin.html', (req, res) => {
  if (isAuthenticated(req)) {
    return res.sendFile(path.join(__dirname, 'admin.html'));
  }
  res.redirect('/login.html');
});

app.get('/api/verify', (req, res) => {
  res.json({ ok: isAuthenticated(req) });
});

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const data = readData();
  if (!data.adminSalt || !data.adminPasswordHash) {
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  const passwordHash = hashPassword(password, data.adminSalt);
  if (passwordHash !== data.adminPasswordHash) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.cookie('cmsAuth', 'true', {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  maxAge: 24 * 60 * 60 * 1000
});
  res.json({ ok: true });
});

app.post('/api/logout', requireAuth, (req, res) => {
  res.clearCookie('cmsAuth');
  res.json({ ok: true });
});

app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new passwords are required' });
  }

  const data = readData();
  const currentHash = hashPassword(currentPassword, data.adminSalt || '');

  if (currentHash !== data.adminPasswordHash) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);
  writeData({ ...data, adminSalt: newSalt, adminPasswordHash: newHash });
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname)));
// serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// configure multer for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

function readData() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/data', (req, res) => {
  const data = readData();
  const { adminPasswordHash, adminSalt, ...publicData } = data;
  res.json(publicData);
});

app.post('/api/data', requireAuth, (req, res) => {
  const payload = req.body;
  if (!payload) return res.status(400).json({ error: 'No data provided' });
  try {
    const existing = readData();
    writeData({ ...existing, ...payload, adminSalt: existing.adminSalt, adminPasswordHash: existing.adminPasswordHash });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

app.listen(PORT, () => {
  console.log(`CMS server running on http://localhost:${PORT}`);
});
