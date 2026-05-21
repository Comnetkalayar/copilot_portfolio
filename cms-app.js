const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
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
  const SUPABASE_KEY = (process.env.SUPABASE_KEY || '').trim();
  const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

  const SUPABASE_BUCKET = (process.env.SUPABASE_BUCKET || 'profilepicture').trim();

  const useSupabase = Boolean(SUPABASE_URL && (SUPABASE_KEY || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));

  const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  const supabaseService = SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

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

  app.post('/api/upload', requireAuth, async (req, res) => {
    try {
      const contentType = (req.headers['content-type'] || '').toLowerCase();

      let buffer;
      let filename;
      let mimeType = 'application/octet-stream';

      if (contentType.includes('multipart/form-data')) {
        // parse multipart with multer
        await new Promise((resolve, reject) => {
          upload.single('file')(req, res, (err) => {
            if (err) return reject(err);
            return resolve();
          });
        });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        buffer = req.file.buffer;
        const ext = path.extname(req.file.originalname || '') || '';
        filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        mimeType = req.file.mimetype || mimeType;
      } else if (contentType.includes('application/json') || contentType.includes('text/json')) {
        const body = req.body || {};
        const data = body.data || body.file || null;
        if (!data) return res.status(400).json({ error: 'No file data' });
        buffer = Buffer.from(data, 'base64');
        const ext = path.extname(body.filename || '') || '';
        filename = body.filename || `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        mimeType = body.contentType || body.mimeType || mimeType;
      } else {
        return res.status(400).json({ error: 'Unsupported content type' });
      }

      // Ensure uploads dir exists for fallback
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      if (useSupabase && SUPABASE_BUCKET && supabase) {
        try {
          const fileData = buffer instanceof Buffer ? buffer : Buffer.from(buffer);

          const { error: uploadError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filename, fileData, {
              upsert: true,
              contentType: mimeType,
            });

          if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            throw uploadError;
          }

          const { data: urlData, error: urlError } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(filename);

          if (urlError) console.error('getPublicUrl error:', urlError);

          return res.json({ url: (urlData && urlData.publicUrl) || `/uploads/${filename}` });
        } catch (err) {
          console.error('Supabase upload failed, falling back to local store:', err && err.message ? err.message : err);

          try {
            fs.writeFileSync(path.join(uploadsDir, filename), buffer);
            return res.json({ url: `/uploads/${filename}`, fallback: true });
          } catch (fsErr) {
            console.error('Local fallback write failed:', fsErr);
            return res.status(500).json({ error: fsErr.message || 'Upload failed' });
          }
        }
      }

      // local storage
      try {
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        return res.json({ url: `/uploads/${filename}` });
      } catch (fsErr) {
        console.error('Local write failed:', fsErr);
        return res.status(500).json({ error: fsErr.message || 'Upload failed' });
      }
    } catch (err) {
      console.error('Upload handler error:', err);
      return res.status(500).json({ error: err.message || 'Upload error' });
    }
  });

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