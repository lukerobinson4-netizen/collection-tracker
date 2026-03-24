-- ═══════════════════════════════════════════════════════════════════════════
-- Collection Tracker v2 — Supabase Schema
-- Run this in the Supabase SQL editor for a fresh setup.
-- For existing installs, run the migration block at the bottom.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── collections ─────────────────────────────────────────────────────────────
create table if not exists public.collections (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  type          text not null default 'custom',
  description   text,
  display_mode  text not null default 'shelf',
  accent_color  text,
  is_public     boolean not null default false,
  public_slug   text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── rooms ───────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  name          text not null,
  description   text,
  position_x    integer,
  position_y    integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── shelves ─────────────────────────────────────────────────────────────────
create table if not exists public.shelves (
  id          uuid primary key default uuid_generate_v4(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  name        text not null,
  slots_wide  integer not null default 6 check (slots_wide between 1 and 30),
  slots_tall  integer not null default 4 check (slots_tall between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── items ───────────────────────────────────────────────────────────────────
create table if not exists public.items (
  id              uuid primary key default uuid_generate_v4(),
  collection_id   uuid not null references public.collections(id) on delete cascade,
  shelf_id        uuid references public.shelves(id) on delete set null,
  shelf_row       integer,
  shelf_col       integer,
  name            text not null,
  brand           text,
  type            text,
  year            integer,
  region          text,
  abv             numeric(5,2),
  notes           text,
  rating          numeric(3,1) check (rating between 0 and 10),
  status          text not null default 'owned',
  purchase_price  numeric(10,2),
  purchase_date   date,
  purchase_store  text,
  photo_url       text,
  tags            text[] not null default '{}',
  wishlist        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_collections_user_id on public.collections(user_id);
create index if not exists idx_rooms_collection_id on public.rooms(collection_id);
create index if not exists idx_shelves_room_id     on public.shelves(room_id);
create index if not exists idx_items_collection_id on public.items(collection_id);
create index if not exists idx_items_shelf_id      on public.items(shelf_id);
create index if not exists idx_items_wishlist      on public.items(collection_id, wishlist);

-- ─── Updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger trg_collections_updated before update on public.collections
    for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
end $$;
do $$ begin
  create trigger trg_rooms_updated before update on public.rooms
    for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
end $$;
do $$ begin
  create trigger trg_shelves_updated before update on public.shelves
    for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
end $$;
do $$ begin
  create trigger trg_items_updated before update on public.items
    for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
end $$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.collections enable row level security;
alter table public.rooms       enable row level security;
alter table public.shelves     enable row level security;
alter table public.items       enable row level security;

create policy "collections_owner" on public.collections
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "collections_public_read" on public.collections
  for select using (is_public = true);

create policy "rooms_owner" on public.rooms
  using (exists (
    select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()
  ));

create policy "shelves_owner" on public.shelves
  using (exists (
    select 1 from public.rooms r
    join public.collections c on c.id = r.collection_id
    where r.id = room_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.rooms r
    join public.collections c on c.id = r.collection_id
    where r.id = room_id and c.user_id = auth.uid()
  ));

create policy "items_owner" on public.items
  using (exists (
    select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()
  ));

-- ─── Storage: item-photos bucket ─────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('item-photos', 'item-photos', true)
  on conflict (id) do nothing;

create policy "item_photos_upload" on storage.objects for insert
  with check (bucket_id = 'item-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "item_photos_update" on storage.objects for update
  using (bucket_id = 'item-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "item_photos_delete" on storage.objects for delete
  using (bucket_id = 'item-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "item_photos_public_read" on storage.objects for select
  using (bucket_id = 'item-photos');


-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION — upgrading from v1 (run these if you already have a database)
-- ═══════════════════════════════════════════════════════════════════════════
/*
alter table public.collections
  add column if not exists display_mode text not null default 'shelf',
  add column if not exists accent_color text,
  add column if not exists is_public    boolean not null default false,
  add column if not exists public_slug  text unique;

alter table public.items
  add column if not exists tags     text[] not null default '{}',
  add column if not exists wishlist boolean not null default false;
*/
