const path = require('path');
const { createCmsApp } = require('../cms-app');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const { app, ensureAdminCredentials } = createCmsApp();

let initPromise = null;

async function ensureInit() {
  if (!initPromise) {
    initPromise = ensureAdminCredentials().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureInit();
    return app(req, res);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server init failed' });
  }
};
