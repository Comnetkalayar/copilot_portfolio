module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', 'cmsAuth=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ ok: true }));
};