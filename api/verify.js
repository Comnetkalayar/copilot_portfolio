const { isAuthenticated } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    return res.end(JSON.stringify({ ok: isAuthenticated(req) }));
  } catch (err) {
    res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};