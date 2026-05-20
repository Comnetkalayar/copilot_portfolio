-- Create site_data table to store global JSON
create table if not exists site_data (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text,
  image_url text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Uploads table
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  url text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Optional admins table (recommended to use Supabase Auth instead)
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  salt text,
  created_at timestamptz default now()
);
