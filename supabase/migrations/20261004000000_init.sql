-- Dinner Sorted: initial schema.
-- Every table has row-level security so people can only see and change their own data.
-- Premium status lives in `entitlements`, which only the server (service role) can write.

create extension if not exists pgcrypto;

-- Profile and food preferences -------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  diet text not null default 'all' check (diet in ('all', 'pesc', 'veg', 'vegan')),
  allergies text[] not null default '{}',
  allergy_other text[] not null default '{}',
  tastes jsonb not null default '{"meats":["chicken","beef","pork","lamb","turkey","fish","seafood"],"veg":[],"cuisines":[],"spice":"medium","avoid":[]}',
  -- Weight goal. Health data: only stored after the person gives consent in the app.
  goal jsonb,
  health_consent_at timestamptz,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create an empty profile when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Premium entitlement (written by the RevenueCat webhook only) ----------------
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_premium boolean not null default false,
  expires_at timestamptz,
  product_id text,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;
create policy "entitlements: read own" on public.entitlements for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role can write.

create function public.has_premium(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_premium and (expires_at is null or expires_at > now())
                   from public.entitlements where user_id = uid), false);
$$;

-- Kitchen ---------------------------------------------------------------------
create table public.pantry_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  label text not null,
  custom boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.pantry_items enable row level security;
create policy "pantry: all own" on public.pantry_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Favourites (free plan: up to 10) --------------------------------------------
create table public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text not null,
  title text not null,
  image text,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.favourites enable row level security;
create policy "favourites: all own" on public.favourites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create function public.enforce_favourite_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_premium(new.user_id)
     and (select count(*) from public.favourites where user_id = new.user_id) >= 10 then
    raise exception 'FREE_FAVOURITE_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger favourites_limit before insert on public.favourites
  for each row execute function public.enforce_favourite_limit();

-- Weight log (Premium) --------------------------------------------------------
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null default current_date,
  kg numeric(5, 1) not null check (kg between 30 and 400),
  unique (user_id, logged_on)
);

alter table public.weight_logs enable row level security;
create policy "weight: read own" on public.weight_logs for select using (auth.uid() = user_id);
create policy "weight: write own (premium)" on public.weight_logs for insert
  with check (auth.uid() = user_id and public.has_premium(auth.uid()));
create policy "weight: update own (premium)" on public.weight_logs for update
  using (auth.uid() = user_id and public.has_premium(auth.uid()));
create policy "weight: delete own" on public.weight_logs for delete using (auth.uid() = user_id);

-- Meal plans (Premium; written by the recipes function) -----------------------
create table public.meal_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  days jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.meal_plans enable row level security;
create policy "plans: read own" on public.meal_plans for select using (auth.uid() = user_id);
create policy "plans: delete own" on public.meal_plans for delete using (auth.uid() = user_id);

-- Free-tier usage counter (written by the recipes function) -------------------
create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  kitchen_searches int not null default 0,
  primary key (user_id, day)
);

alter table public.usage_counters enable row level security;
create policy "usage: read own" on public.usage_counters for select using (auth.uid() = user_id);

-- Atomically use one free kitchen search. Returns false when the daily limit is reached.
create function public.use_kitchen_search(uid uuid, daily_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into public.usage_counters (user_id, day, kitchen_searches) values (uid, current_date, 0)
    on conflict (user_id, day) do nothing;
  update public.usage_counters set kitchen_searches = kitchen_searches + 1
    where user_id = uid and day = current_date and kitchen_searches < daily_limit
    returning kitchen_searches into used;
  return used is not null;
end $$;
revoke execute on function public.use_kitchen_search(uuid, int) from public, anon, authenticated;
grant execute on function public.use_kitchen_search(uuid, int) to service_role;

-- Feedback --------------------------------------------------------------------
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('DS-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  user_id uuid references auth.users (id) on delete set null,
  category text not null check (category in ('bug', 'recipe', 'allergen', 'billing', 'idea', 'other')),
  message text not null check (char_length(message) between 10 and 2000),
  context text,
  device jsonb,
  screenshot_path text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
create policy "feedback: insert own" on public.feedback for insert with check (auth.uid() = user_id);
create policy "feedback: read own" on public.feedback for select using (auth.uid() = user_id);

-- Screenshots attached to feedback (private bucket, one folder per user)
insert into storage.buckets (id, name, public) values ('feedback-screenshots', 'feedback-screenshots', false)
  on conflict (id) do nothing;
create policy "screenshots: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

-- Short-lived cache of provider recipes (keep the TTL within each provider's terms)
create table public.recipe_cache (
  id text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.recipe_cache enable row level security;
-- No policies: only the service role reads and writes the cache.

-- Keep updated_at fresh
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
