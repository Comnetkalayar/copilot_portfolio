const crypto = require('crypto');
const { readData, writeData, hashPassword, isAuthenticated } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'Method not allowed' })); }
    if (!isAuthenticated(req)) { res.statusCode = 401; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'Unauthorized' })); }

    let body = '';
    for await (const chunk of req) body += chunk;
    const { currentPassword, newPassword } = body ? JSON.parse(body) : {};
    if (!currentPassword || !newPassword) { res.statusCode = 400; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'Both current and new passwords are required' })); }

    const data = await readData();
    const currentHash = hashPassword(currentPassword, data.adminSalt || '');
    if (currentHash !== data.adminPasswordHash) { res.statusCode = 401; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: 'Current password is incorrect' })); }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);

    await writeData({
      ...data,
      adminSalt: newSalt,
      adminPasswordHash: newHash,
    });

    res.setHeader('Content-Type','application/json');
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500; res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ error: err.message || 'Could not update password' }));
  }
};