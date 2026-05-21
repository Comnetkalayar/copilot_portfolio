const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();
const SUPABASE_BUCKET = (process.env.SUPABASE_BUCKET || 'profilepicture').trim();
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
const supabase = useSupabase ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const dataPath = path.join(process.cwd(), 'data.json');

function parseCookies(req) {
  const header = req.headers && req.headers.cookie ? req.headers.cookie : '';
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

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies.cmsAuth === 'true';
}

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
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
  } catch (err) {
    return {};
  }
}

async function writeData(payload) {
  if (useSupabase && supabase) {
    const data = { key: 'global', value: payload };
    const { error } = await supabase.from('site_data').upsert(data, { onConflict: 'key' });
    if (error) throw new Error(error.message || 'Supabase write failed');
    return;
  }

  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2), 'utf8');
}

module.exports = { readData, writeData, isAuthenticated, parseCookies, hashPassword, supabase, SUPABASE_BUCKET };