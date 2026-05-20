require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA_PATH = path.join(__dirname, '..', 'data.json');

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('No data.json found at', DATA_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse data.json:', err.message);
    process.exit(1);
  }

  // Upsert global site_data
  try {
    const payload = { key: 'global', value: data };
    const { error } = await supabase.from('site_data').upsert(payload, { onConflict: 'key' });
    if (error) throw error;
    console.log('Upserted site_data (global)');
  } catch (err) {
    console.error('Failed to upsert site_data:', err.message || err);
  }

  // Migrate projects if present
  if (Array.isArray(data.projects) && data.projects.length) {
    const toInsert = data.projects.map(p => ({
      id: p.id || undefined,
      title: p.title || null,
      description: p.description || null,
      url: p.url || null,
      image_url: p.image_url || p.image || null,
      metadata: p.metadata || null
    }));

    try {
      const { error } = await supabase.from('projects').insert(toInsert);
      if (error) throw error;
      console.log(`Inserted ${toInsert.length} projects`);
    } catch (err) {
      console.error('Failed to insert projects:', err.message || err);
    }
  } else {
    console.log('No projects array found in data.json');
  }

  // Migrate uploads if present
  if (Array.isArray(data.uploads) && data.uploads.length) {
    const toInsert = data.uploads.map(u => ({
      id: u.id || undefined,
      filename: u.filename || path.basename(u.url || ''),
      url: u.url || null,
      metadata: u.metadata || null
    }));

    try {
      const { error } = await supabase.from('uploads').insert(toInsert);
      if (error) throw error;
      console.log(`Inserted ${toInsert.length} uploads`);
    } catch (err) {
      console.error('Failed to insert uploads:', err.message || err);
    }
  } else {
    console.log('No uploads array found in data.json');
  }

  console.log('Migration complete');
}

main().catch(err => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
