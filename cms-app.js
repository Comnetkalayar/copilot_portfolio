const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .filter(Boolean)
      .map((cookie) => {
        const parts = cookie.split('=');
        return [
          decodeURIComponent(parts.shift().trim()),
          decodeURIComponent(parts.join('=').trim()),
        ];
      })
  );
}

function createCmsApp(options = {}) {
  const app = express();

  const isVercel = !!process.env.VERCEL;

  const dataPath =
    options.dataPath ||
    (isVercel
      ? path.join('/tmp', 'data.json')
      : path.join(process.cwd(), 'data.json'));

  const uploadsDir = options.uploadsDir || path.join(process.cwd(), 'uploads');

  const serveStaticRoot = options.serveStaticRoot || null;

  const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
  const SUPABASE_KEY = (
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const SUPABASE_BUCKET = (process.env.SUPABASE_BUCKET || '').trim();

  const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

  const supabase = useSupabase
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  app.use(cors());
  app.use(bodyParser.json({ limit: '1mb' }));

  if (serveStaticRoot) {
    app.use(express.static(serveStaticRoot));

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    app.use('/uploads', express.static(uploadsDir));
  }

  const upload = multer({ storage: multer.memoryStorage() });

  function isAuthenticated(req) {
    const cookies = parseCookies(req);
    return cookies.cmsAuth === 'true';
  }

  function requireAuth(req, res, next) {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  }

  async function readData() {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('site_data')
        .select('value')
        .eq('key', 'global')
        .maybeSingle();

      if (error) throw new Error(error.message || 'Supabase read failed');

      return (data && data.value) || {};
    }

    try {
      const raw = fs.readFileSync(dataPath, 'utf8');

      try {
        return raw ? JSON.parse(raw) : {};
      } catch (err) {
        return {};
      }
    } catch {
      return {};
    }
  }

  async function writeData(data) {
    if (useSupabase && supabase) {
      const payload = { key: 'global', value: data };

      const { error } = await supabase
        .from('site_data')
        .upsert(payload, { onConflict: 'key' });

      if (error) throw new Error(error.message || 'Supabase write failed');
      return;
    }

    try {
      const dir = path.dirname(dataPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        dataPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch (err) {
      console.error('writeData failed:', err);
      throw err;
    }
  }

  app.get('/api/verify', (req, res) => {
    res.json({ ok: isAuthenticated(req) });
  });

  app.post('/api/login', async (req, res) => {
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    try {
      const data = await readData();

      if (!data.adminSalt || !data.adminPasswordHash) {
        return res
          .status(500)
          .json({ error: 'Admin credentials not configured' });
      }

      const passwordHash = hashPassword(password, data.adminSalt);

      if (passwordHash !== data.adminPasswordHash) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      res.cookie('cmsAuth', 'true', {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({
        error: err.message || 'Could not verify credentials',
      });
    }
  });

  app.post('/api/logout', requireAuth, (req, res) => {
    res.clearCookie('cmsAuth');
    res.json({ ok: true });
  });

  app.post('/api/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Both current and new passwords are required',
      });
    }

    try {
      const data = await readData();

      const currentHash = hashPassword(
        currentPassword,
        data.adminSalt || ''
      );

      if (currentHash !== data.adminPasswordHash) {
        return res
          .status(401)
          .json({ error: 'Current password is incorrect' });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHash = hashPassword(newPassword, newSalt);

      await writeData({
        ...data,
        adminSalt: newSalt,
        adminPasswordHash: newHash,
      });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({
        error: err.message || 'Could not update password',
      });
    }
  });

  app.get('/api/data', async (req, res) => {
    try {
      const data = await readData();
      const { adminPasswordHash, adminSalt, ...publicData } = data;
      return res.json(publicData);
    } catch (err) {
      return res.status(500).json({
        error: err.message || 'Could not read data',
      });
    }
  });

  app.post('/api/data', requireAuth, async (req, res) => {
    const payload = req.body;

    if (!payload) {
      return res.status(400).json({ error: 'No data provided' });
    }

    try {
      const existing = await readData();

      await writeData({
        ...existing,
        ...payload,
        adminSalt: existing.adminSalt,
        adminPasswordHash: existing.adminPasswordHash,
      });

      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({
        error: err.message || 'Could not save data',
      });
    }
  });

  app.post(
    '/api/upload',
    requireAuth,
    upload.single('file'),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const ext = path.extname(req.file.originalname || '') || '';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

      if (useSupabase && SUPABASE_BUCKET && supabase) {
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(filename, req.file.buffer, {
            upsert: true,
            contentType: req.file.mimetype,
          });

        if (uploadError) {
          return res.status(500).json({
            error: uploadError.message || 'Upload failed',
          });
        }

        const { data: urlData } = supabase.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(filename);

        return res.json({ url: urlData.publicUrl });
      }

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(uploadsDir, filename),
        req.file.buffer
      );

      return res.json({ url: `/uploads/${filename}` });
    }
  );

  app.get('/api/health', async (req, res) => {
    if (!useSupabase || !supabase) {
      return res.json({ ok: true, store: 'local-file' });
    }

    const { error } = await supabase
      .from('site_data')
      .select('key')
      .limit(1);

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }

    return res.json({ ok: true, store: 'supabase' });
  });

  async function ensureAdminCredentials() {
    const initialData = await readData();

    if (!initialData.adminSalt || !initialData.adminPasswordHash) {
      const defaultSalt = crypto.randomBytes(16).toString('hex');
      const defaultHash = hashPassword('admin123', defaultSalt);

      await writeData({
        ...initialData,
        adminSalt: defaultSalt,
        adminPasswordHash: defaultHash,
      });

      return true;
    }

    return false;
  }

  return {
    app,
    ensureAdminCredentials,
    useSupabase,
  };
}

module.exports = { createCmsApp };