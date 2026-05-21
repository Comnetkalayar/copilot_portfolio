const { readData, writeData, isAuthenticated } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const data = await readData();
      const { adminPasswordHash, adminSalt, ...publicData } = data;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(publicData));
    }

    if (req.method === 'POST') {
      if (!isAuthenticated(req)) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }

      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = body ? JSON.parse(body) : {};

      if (!payload) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'No data provided' }));
      }

      const existing = await readData();
      await writeData({ ...existing, ...payload, adminSalt: existing.adminSalt, adminPasswordHash: existing.adminPasswordHash });

      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true }));
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Server error' }));
  }
};