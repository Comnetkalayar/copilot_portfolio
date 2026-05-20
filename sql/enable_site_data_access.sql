-- Run once in Supabase SQL Editor if you use the anon / publishable API key from the server
-- (Service role key bypasses RLS and does not need these policies.)
--
-- If RLS is enabled on site_data with no policies, all requests fail and your app falls back
-- or errors depending on server settings.

alter table site_data enable row level security;

drop policy if exists "site_data_select" on site_data;
drop policy if exists "site_data_insert" on site_data;
drop policy if exists "site_data_update" on site_data;

-- Portfolio JSON is served publicly via your Express API (hashed admin fields stay server-side only
-- if clients never query Supabase directly). Adjust if you expose this table to the browser.
create policy "site_data_select" on site_data
  for select using (true);

create policy "site_data_insert" on site_data
  for insert with check (true);

create policy "site_data_update" on site_data
  for update using (true) with check (true);
