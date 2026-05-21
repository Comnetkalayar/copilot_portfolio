const { supabase, supabaseService, SUPABASE_BUCKET } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : null;
    if (!payload || !payload.data) {
      res.statusCode = 400; return res.end(JSON.stringify({ error: 'No file data' }));
    }

    const filename = payload.filename || `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    const contentType = payload.contentType || 'application/octet-stream';
    const buffer = Buffer.from(payload.data, 'base64');

    // upload to supabase storage
    const storageClient = supabaseService || supabase;
    if (!storageClient) {
      res.statusCode = 500; return res.end(JSON.stringify({ error: 'Supabase not configured' }));
    }

    const { error: uploadError } = await storageClient.storage.from(SUPABASE_BUCKET).upload(filename, buffer, { contentType, upsert: true });
    if (uploadError) {
      // return server error with message
      res.statusCode = 500; return res.end(JSON.stringify({ error: uploadError.message || 'Upload failed' }));
    }

    const { data: urlData, error: urlError } = storageClient.storage.from(SUPABASE_BUCKET).getPublicUrl(filename);
    if (urlError) console.error('getPublicUrl error', urlError);

    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ url: (urlData && urlData.publicUrl) || null }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Upload error' }));
  }
};