const { readData, hashPassword } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' })); }

    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : {};
    const password = payload.password;
    if (!password) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Password is required' })); }

    const data = await readData();
    if (!data.adminSalt || !data.adminPasswordHash) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'Admin credentials not configured' })); }

    const passwordHash = hashPassword(password, data.adminSalt);
    if (passwordHash !== data.adminPasswordHash) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'Invalid password' })); }

    // set cookie
    res.setHeader('Set-Cookie', 'cmsAuth=true; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400');
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500; return res.end(JSON.stringify({ error: err.message || 'Login failed' }));
  }
};