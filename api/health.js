const { supabase } = require('./_lib');
module.exports = async (req, res) => {
  try {
    if (!supabase) return res.end(JSON.stringify({ ok: true, store: 'local-file' }));
    const { error } = await supabase.from('site_data').select('key').limit(1);
    if (error) { res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: error.message })); }
    return res.end(JSON.stringify({ ok: true, store: 'supabase' }));
  } catch (err) {
    res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};