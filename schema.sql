-- Collection Tracker — Supabase Schema
-- Run this in your Supabase SQL editor

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table collections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  type         text not null default 'custom',   -- whiskey | wine | beer | books | custom
  icon         text default '📦',
  description  text,
  accent_color text default '#c8a96e',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table rooms (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid references collections(id) on delete cascade not null,
  name          text not null,
  description   text,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create table shelves (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid references rooms(id) on delete cascade not null,
  name       text not null,
  slots_wide int not null default 6,
  slots_tall int not null default 4,
  wall       text default 'north',    -- north | south | east | west | centre
  sort_order int default 0,
  created_at timestamptz default now()
);

create table items (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid references collections(id) on delete cascade not null,
  shelf_id       uuid references shelves(id) on delete set null,
  slot_row       int,
  slot_col       int,
  name           text not null,
  brand          text,
  type           text,
  subtype        text,
  photo_url      text,
  rating         numeric(3,1) check (rating >= 0 and rating <= 10),
  notes          text,
  purchase_price numeric(10,2),
  purchase_date  date,
  purchase_store text,
  status         text default 'full',  -- full | partial | empty | gifted | sold
  year           int,
  region         text,
  abv            numeric(4,1),
  custom_fields  jsonb default '{}',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table collections enable row level security;
alter table rooms       enable row level security;
alter table shelves     enable row level security;
alter table items       enable row level security;

-- Collections
create policy "Own collections — select" on collections for select using (auth.uid() = user_id);
create policy "Own collections — insert" on collections for insert with check (auth.uid() = user_id);
create policy "Own collections — update" on collections for update using (auth.uid() = user_id);
create policy "Own collections — delete" on collections for delete using (auth.uid() = user_id);

-- Rooms (owned via collection)
create policy "Own rooms — select" on rooms for select using (
  exists (select 1 from collections where id = rooms.collection_id and user_id = auth.uid())
);
create policy "Own rooms — insert" on rooms for insert with check (
  exists (select 1 from collections where id = collection_id and user_id = auth.uid())
);
create policy "Own rooms — update" on rooms for update using (
  exists (select 1 from collections where id = rooms.collection_id and user_id = auth.uid())
);
create policy "Own rooms — delete" on rooms for delete using (
  exists (select 1 from collections where id = rooms.collection_id and user_id = auth.uid())
);

-- Shelves (owned via room → collection)
create policy "Own shelves — select" on shelves for select using (
  exists (
    select 1 from rooms r join collections c on c.id = r.collection_id
    where r.id = shelves.room_id and c.user_id = auth.uid()
  )
);
create policy "Own shelves — insert" on shelves for insert with check (
  exists (
    select 1 from rooms r join collections c on c.id = r.collection_id
    where r.id = room_id and c.user_id = auth.uid()
  )
);
create policy "Own shelves — update" on shelves for update using (
  exists (
    select 1 from rooms r join collections c on c.id = r.collection_id
    where r.id = shelves.room_id and c.user_id = auth.uid()
  )
);
create policy "Own shelves — delete" on shelves for delete using (
  exists (
    select 1 from rooms r join collections c on c.id = r.collection_id
    where r.id = shelves.room_id and c.user_id = auth.uid()
  )
);

-- Items (owned via collection)
create policy "Own items — select" on items for select using (
  exists (select 1 from collections where id = items.collection_id and user_id = auth.uid())
);
create policy "Own items — insert" on items for insert with check (
  exists (select 1 from collections where id = collection_id and user_id = auth.uid())
);
create policy "Own items — update" on items for update using (
  exists (select 1 from collections where id = items.collection_id and user_id = auth.uid())
);
create policy "Own items — delete" on items for delete using (
  exists (select 1 from collections where id = items.collection_id and user_id = auth.uid())
);

-- ─── Triggers ────────────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger collections_updated_at before update on collections
  for each row execute function update_updated_at();

create trigger items_updated_at before update on items
  for each row execute function update_updated_at();

-- ─── Storage ─────────────────────────────────────────────────────────────────
-- In Supabase dashboard → Storage, create a bucket named: item-photos
-- Set it to PUBLIC so photo URLs work without auth tokens.
-- Add the following storage policy:
--
--   Policy name: Authenticated users can manage their own photos
--   Target roles: authenticated
--   Allowed operations: SELECT, INSERT, UPDATE, DELETE
--   Policy definition:
--     (storage.foldername(name))[1] = auth.uid()::text
--
-- This ensures each user's photos are stored under their user ID folder.
