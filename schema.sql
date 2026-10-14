-- Goat Farm Manager: Supabase PostgreSQL setup
-- Run this whole script in Supabase Dashboard > SQL Editor > New query.
-- Uses authenticated user membership and row-level security (RLS).
create extension if not exists pgcrypto;

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table if not exists public.farm_members (
  farm_id uuid not null references public.farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','staff','viewer')),
  created_at timestamptz not null default now(),
  primary key (farm_id,user_id)
);
create or replace function public.is_farm_member(check_farm uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.farm_members m where m.farm_id=check_farm and m.user_id=auth.uid()); $$;

create table if not exists public.goats (
 id uuid primary key default gen_random_uuid(),
 farm_id uuid not null references public.farms(id) on delete cascade,
 goat_id text not null,
 ear_tag text,
 name text,
 sex text check (sex in ('Male','Female','Unknown')),
 breed text,
 date_of_birth date,
 weight_kg numeric(8,2) check (weight_kg is null or weight_kg>=0),
 source text,
 status text not null default 'Active' check (status in ('Active','Sold','Dead','Transferred')),
 pen text,
 mother_goat_id text,
 father_goat_id text,
 notes text,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(farm_id,goat_id)
);
create table if not exists public.health_records (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 goat_id text not null, record_type text not null, record_date date not null, item_name text not null,
 dose text, batch_number text, expiry_date date, next_due_date date, administered_by text, cost numeric(12,2), outcome_notes text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.breeding_records (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 female_goat_id text not null, male_goat_id text, mating_date date not null, method text,
 pregnancy_check_date date, pregnancy_result text, expected_kidding_date date, notes text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.birth_records (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 mother_goat_id text not null, father_goat_id text, birth_date date not null, male_kids integer not null default 0 check (male_kids>=0),
 female_kids integer not null default 0 check (female_kids>=0), stillborn_kids integer not null default 0 check (stillborn_kids>=0),
 birth_type text, notes text, created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.mortality_records (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 goat_id text not null, death_date date not null, cause text, vet_findings text, estimated_loss numeric(12,2), disposal_details text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 transaction_type text not null check (transaction_type in ('Purchase','Sale')), transaction_date date not null,
 party_name text, phone text, goat_ids text, quantity integer, total_amount numeric(12,2) not null default 0,
 amount_paid numeric(12,2) not null default 0, invoice_number text, notes text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.inventory (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 item_name text not null, category text, unit text, opening_stock numeric(12,3) default 0, quantity_added numeric(12,3) default 0,
 quantity_used numeric(12,3) default 0, reorder_level numeric(12,3) default 0, supplier text, expiry_date date, unit_cost numeric(12,2), notes text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.finance_entries (
 id uuid primary key default gen_random_uuid(), farm_id uuid not null references public.farms(id) on delete cascade,
 entry_type text not null check (entry_type in ('Income','Expense')), entry_date date not null, category text not null,
 amount numeric(12,2) not null check (amount>=0), payment_method text, description text,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

-- Farm creation: after signing up, replace YOUR_AUTH_USER_UUID and run this snippet once.
-- insert into public.farms(name,created_by) values ('My Goat Farm','YOUR_AUTH_USER_UUID') returning id;
-- insert into public.farm_members(farm_id,user_id,role) values ('RETURNED_FARM_UUID','YOUR_AUTH_USER_UUID','owner');

alter table public.farms enable row level security;
alter table public.farm_members enable row level security;
alter table public.goats enable row level security;
alter table public.health_records enable row level security;
alter table public.breeding_records enable row level security;
alter table public.birth_records enable row level security;
alter table public.mortality_records enable row level security;
alter table public.transactions enable row level security;
alter table public.inventory enable row level security;
alter table public.finance_entries enable row level security;

drop policy if exists "members can view farms" on public.farms;
create policy "members can view farms" on public.farms for select to authenticated using (public.is_farm_member(id) or created_by=auth.uid());
drop policy if exists "owners can create farms" on public.farms;
create policy "owners can create farms" on public.farms for insert to authenticated with check (created_by=auth.uid());

drop policy if exists "members can view membership" on public.farm_members;
create policy "members can view membership" on public.farm_members for select to authenticated using (user_id=auth.uid() or public.is_farm_member(farm_id));
drop policy if exists "farm creator can add first membership" on public.farm_members;
create policy "farm creator can add first membership" on public.farm_members for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.farms f where f.id=farm_id and f.created_by=auth.uid()));

do $$
declare tbl text;
begin
 foreach tbl in array array['goats','health_records','breeding_records','birth_records','mortality_records','transactions','inventory','finance_entries'] loop
   execute format('drop policy if exists "farm members read %1$s" on public.%1$I',tbl);
   execute format('create policy "farm members read %1$s" on public.%1$I for select to authenticated using (public.is_farm_member(farm_id))',tbl);
   execute format('drop policy if exists "farm members insert %1$s" on public.%1$I',tbl);
   execute format('create policy "farm members insert %1$s" on public.%1$I for insert to authenticated with check (public.is_farm_member(farm_id) and created_by=auth.uid())',tbl);
   execute format('drop policy if exists "farm members update %1$s" on public.%1$I',tbl);
   execute format('create policy "farm members update %1$s" on public.%1$I for update to authenticated using (public.is_farm_member(farm_id)) with check (public.is_farm_member(farm_id))',tbl);
   execute format('drop policy if exists "farm members delete %1$s" on public.%1$I',tbl);
   execute format('create policy "farm members delete %1$s" on public.%1$I for delete to authenticated using (public.is_farm_member(farm_id))',tbl);
 end loop;
end $$;

create index if not exists goats_farm_goat_id_idx on public.goats(farm_id,goat_id);
create index if not exists health_farm_due_idx on public.health_records(farm_id,next_due_date);
create index if not exists breeding_farm_expected_idx on public.breeding_records(farm_id,expected_kidding_date);
create index if not exists finance_farm_date_idx on public.finance_entries(farm_id,entry_date);
