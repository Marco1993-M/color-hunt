create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  location text not null,
  start_date date,
  end_date date,
  share_id uuid default gen_random_uuid(),
  is_public boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.trips
add column if not exists share_id uuid;

alter table public.trips
add column if not exists is_public boolean not null default false;

update public.trips
set share_id = gen_random_uuid()
where share_id is null;

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  color_name text not null,
  color_hex text not null,
  prompt text not null,
  max_photos integer not null default 9,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.photos (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  storage_path text not null,
  sort_order integer,
  caption text,
  dominant_color text,
  color_match_score numeric,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.photos
add column if not exists sort_order integer;

with ranked_photos as (
  select
    id,
    row_number() over (partition by trip_id order by created_at asc, id asc) - 1 as next_sort_order
  from public.photos
)
update public.photos
set sort_order = ranked_photos.next_sort_order
from ranked_photos
where public.photos.id = ranked_photos.id
  and public.photos.sort_order is null;

create table if not exists public.collages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text,
  image_url text,
  storage_path text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  trip_id uuid references public.trips(id) on delete set null,
  share_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  path text,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.missions enable row level security;
alter table public.photos enable row level security;
alter table public.collages enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "users can view own profile" on public.users;
create policy "users can view own profile"
on public.users for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users can upsert own profile" on public.users;
create policy "users can upsert own profile"
on public.users for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.users;
create policy "users can update own profile"
on public.users for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "users can manage own trips" on public.trips;
create policy "users can manage own trips"
on public.trips for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "public can view shared trips" on public.trips;
create policy "public can view shared trips"
on public.trips for select
to public
using (is_public = true and share_id is not null);

drop policy if exists "users can manage missions on own trips" on public.missions;
create policy "users can manage missions on own trips"
on public.missions for all
to authenticated
using (
  exists (
    select 1
    from public.trips
    where trips.id = missions.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips
    where trips.id = missions.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "public can view missions on shared trips" on public.missions;
create policy "public can view missions on shared trips"
on public.missions for select
to public
using (
  exists (
    select 1
    from public.trips
    where trips.id = missions.trip_id
      and trips.is_public = true
      and trips.share_id is not null
  )
);

drop policy if exists "users can manage own photos" on public.photos;
create policy "users can manage own photos"
on public.photos for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "public can view photos on shared trips" on public.photos;
create policy "public can view photos on shared trips"
on public.photos for select
to public
using (
  exists (
    select 1
    from public.trips
    where trips.id = photos.trip_id
      and trips.is_public = true
      and trips.share_id is not null
  )
);

drop policy if exists "users can manage collages on own trips" on public.collages;
create policy "users can manage collages on own trips"
on public.collages for all
to authenticated
using (
  exists (
    select 1
    from public.trips
    where trips.id = collages.trip_id
      and trips.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips
    where trips.id = collages.trip_id
      and trips.user_id = auth.uid()
  )
);

drop policy if exists "public can insert analytics events" on public.analytics_events;
create policy "public can insert analytics events"
on public.analytics_events for insert
to public
with check (char_length(event_name) > 0);

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

drop policy if exists "users can upload own trip photos" on storage.objects;
create policy "users can upload own trip photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'trip-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "users can update own trip photos" on storage.objects;
create policy "users can update own trip photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'trip-photos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'trip-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "users can delete own trip photos" on storage.objects;
create policy "users can delete own trip photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'trip-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "public can view trip photos" on storage.objects;
create policy "public can view trip photos"
on storage.objects for select
to public
using (bucket_id = 'trip-photos');
