-- Zelanos Tours — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Vehicles (fleet)
create table vehicles (
  id bigint generated always as identity primary key,
  name text not null,
  seats text default '',
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. Guides
create table guides (
  id bigint generated always as identity primary key,
  name text not null,
  email text default '',
  phone text default '',
  languages text default '',
  fee text default '',
  drives text default 'no',
  notes text default '',
  created_at timestamptz default now()
);

-- 3. Tour catalog
create table catalog (
  id bigint generated always as identity primary key,
  name text not null,
  languages text[] default '{}',
  sale_price numeric default 0,
  child_price numeric default 0,
  duration text default '',
  needs_car boolean default true,
  is_evening boolean default false,
  description text default '',
  created_at timestamptz default now()
);

-- 4. Tours (main table)
create table tours (
  id bigint generated always as identity primary key,
  month int,
  year int,
  month_name text default '',
  pay_note text default '',
  supplier text default '',
  booking_number text default '',
  date text default '',
  tour text default '',
  catalog_id bigint references catalog(id) on delete set null,
  tour_language text default '',
  is_evening boolean default false,
  name text default '',
  client_phone text default '',
  client_email text default '',
  adults int default 0,
  children int default 0,
  hotel text default '',
  pickup_time text default '',
  price_to_us numeric default 0,
  sale_price numeric default 0,
  sale_price_child numeric default 0,
  guide text default '',
  driver text default '',
  car_number text default '',
  guide_is_driver boolean default false,
  exp_guide numeric default 0,
  exp_driver numeric default 0,
  exp_fuel numeric default 0,
  exp_audio_guide numeric default 0,
  exp_entry_fees numeric default 0,
  exp_lunch numeric default 0,
  exp_parking numeric default 0,
  reservation_made text default '',
  email_sent_to_guide text default '',
  tour_type text default 'guide_driver',
  tour_status text default 'reservation',
  notes text default '',
  balance_bgn numeric default 0,
  created_at timestamptz default now()
);

-- 5. Fuel records
create table fuel (
  id bigint generated always as identity primary key,
  date text default '',
  vehicle text default '',
  driver text default '',
  tour text default '',
  km_start numeric default 0,
  km_end numeric default 0,
  total_km numeric default 0,
  price_per_liter numeric default 0,
  total_fuel_cost numeric default 0,
  liters numeric default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- 6. Fines
create table fines (
  id bigint generated always as identity primary key,
  vehicle text default '',
  fine_date text default '',
  driver text default '',
  amount_eur numeric default 0,
  pay_date text default '',
  status text default '',
  created_at timestamptz default now()
);

-- 7. Car tasks
create table car_tasks (
  id bigint generated always as identity primary key,
  car text default '',
  report_date text default '',
  task text default '',
  reported_by text default '',
  priority text default 'NORMAL',
  status text default 'NEW',
  notes text default '',
  created_at timestamptz default now()
);

-- 8. Car/bus stops (unavailability)
create table stops_car (
  id bigint generated always as identity primary key,
  vehicle text default '',
  start_date text default '',
  end_date text default '',
  who text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- 9. Guide stops (unavailability)
create table stops_guide (
  id bigint generated always as identity primary key,
  start_date text default '',
  end_date text default '',
  guide_name text default '',
  created_at timestamptz default now()
);

-- 10. Round trips
create table round_trips (
  id bigint generated always as identity primary key,
  name text default '',
  date_from text default '',
  date_to text default '',
  vehicle text default '',
  guide text default '',
  driver text default '',
  client text default '',
  client_phone text default '',
  client_email text default '',
  adults int default 0,
  children int default 0,
  total_price numeric default 0,
  price_per_day numeric default 0,
  status text default 'planned',
  route text default '',
  notes text default '',
  days jsonb default '[]',
  created_at timestamptz default now()
);

-- 11. Car rentals
create table car_rentals (
  id bigint generated always as identity primary key,
  date_from text default '',
  date_to text default '',
  time_from text default '',
  time_to text default '',
  client text default '',
  client_phone text default '',
  client_email text default '',
  vehicle text default '',
  price_per_day numeric default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- 12. Tour languages (simple list)
create table tour_languages (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- Insert default languages
insert into tour_languages (name) values
  ('English'),('Spanish'),('Italian'),('French'),
  ('German'),('Portuguese'),('Russian'),('Bulgarian');

-- Insert default vehicles
insert into vehicles (name, seats, active) values
  ('СВ 0470 ММ - H1бус','8+1',true),
  ('РВ 4806 ХС-Е класа','3+1',true),
  ('V class Silver РВ 2142 АЕ','6+1',true),
  ('РВ 7269 НХ - V-клас-ръчни скорости','6+1',true),
  ('РВ 8455 КС','8+1',true),
  ('Рено Трафик СВ 1455 РА','8+1',true),
  ('СВ 5702 ТЕ - V класа','6+1',true),
  ('РВ 9418 КС','8+1',true),
  ('Хюндай Елантра СВ0827ММ','3+1',true),
  ('Opel Insignia','3+1',true),
  ('V class NEW Silver','6+1',true),
  ('Външен транспорт','',true);

-- Enable Row Level Security on all tables
alter table vehicles enable row level security;
alter table guides enable row level security;
alter table catalog enable row level security;
alter table tours enable row level security;
alter table fuel enable row level security;
alter table fines enable row level security;
alter table car_tasks enable row level security;
alter table stops_car enable row level security;
alter table stops_guide enable row level security;
alter table round_trips enable row level security;
alter table car_rentals enable row level security;
alter table tour_languages enable row level security;

-- For now: allow all operations for authenticated and anon users
-- (you can tighten this later when you add auth)
create policy "Allow all" on vehicles for all using (true) with check (true);
create policy "Allow all" on guides for all using (true) with check (true);
create policy "Allow all" on catalog for all using (true) with check (true);
create policy "Allow all" on tours for all using (true) with check (true);
create policy "Allow all" on fuel for all using (true) with check (true);
create policy "Allow all" on fines for all using (true) with check (true);
create policy "Allow all" on car_tasks for all using (true) with check (true);
create policy "Allow all" on stops_car for all using (true) with check (true);
create policy "Allow all" on stops_guide for all using (true) with check (true);
create policy "Allow all" on round_trips for all using (true) with check (true);
create policy "Allow all" on car_rentals for all using (true) with check (true);
create policy "Allow all" on tour_languages for all using (true) with check (true);
