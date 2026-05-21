const path = require('path');
const { createCmsApp } = require('./cms-app');
const PORT = process.env.PORT || 8080;

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const { app, ensureAdminCredentials, useSupabase } = createCmsApp({
  dataPath: path.join(__dirname, 'data.json'),
  uploadsDir: path.join(__dirname, 'uploads'),
  serveStaticRoot: __dirname
});

(async function init() {
  try {
    const created = await ensureAdminCredentials();
    if (created) {
      console.log('Default admin credentials created (username: admin, password: admin123)');
    }
    app.listen(PORT, () => {
      console.log(`CMS server running on http://localhost:${PORT}`);
      if (useSupabase) console.log('Supabase integration enabled — saves go to site_data (key global)');
      else console.log('Data store: local data.json (Supabase off)');
    });
  } catch (err) {
    console.error('Startup failed:', err.message || err);
    process.exit(1);
  }
})();