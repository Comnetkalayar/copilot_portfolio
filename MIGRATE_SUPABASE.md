Migration guide — migrate local `data.json` into Supabase

1. Create tables in Supabase
   - Open Supabase project → SQL Editor and run the SQL in `sql/create_tables.sql`.

2. Configure environment
   - Copy `.env.example` to `.env` and add your `SUPABASE_SERVICE_ROLE_KEY` (server-only key)

3. Install dependencies locally

```bash
npm install
```

4. Row Level Security (if saves fail with “permission denied” or RLS errors)

If you use the **publishable / anon** key on the server, run **`sql/enable_site_data_access.sql`** in the SQL Editor so `site_data` can be read and written.  
Prefer **`SUPABASE_SERVICE_ROLE_KEY`** in `.env` (server only, never commit); it bypasses RLS.

5. Run migration script

```bash
node scripts/migrate_to_supabase.js
```

Notes
- The migration script upserts the full `data.json` into `site_data` with key `global` and attempts to insert `projects` and `uploads` arrays if present.
- You should create the storage bucket (e.g., `uploads`) and configure `SUPABASE_BUCKET` in `.env` if you plan to move actual files.
- Review inserted rows in the Supabase Table Editor after migration.
