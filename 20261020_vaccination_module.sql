-- Repeatable vaccination module migration. Existing health_records remain unchanged.
-- Vaccine schedule rows are templates only; no medical values are prefilled.

alter table public.goats
  add column if not exists maternal_vaccination_status text not null default 'Unknown';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goats_maternal_vaccination_status_check'
      and conrelid = 'public.goats'::regclass
  ) then
    alter table public.goats add constraint goats_maternal_vaccination_status_check
      check (maternal_vaccination_status in ('Vaccinated','Not vaccinated','Unknown'));
  end if;
end $$;

create table if not exists public.vaccination_schedules (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  vaccine_name text not null,
  disease text not null,
  minimum_age_days integer check (minimum_age_days is null or minimum_age_days >= 0),
  maternal_status_rule text,
  primary_dose_count smallint check (primary_dose_count is null or primary_dose_count > 0),
  primary_dose_interval_days integer check (primary_dose_interval_days is null or primary_dose_interval_days > 0),
  booster_interval_days integer check (booster_interval_days is null or booster_interval_days > 0),
  recurring_interval_days integer check (recurring_interval_days is null or recurring_interval_days > 0),
  seasonal_months smallint[] not null default '{}',
  dose_amount numeric(12,4) check (dose_amount is null or dose_amount > 0),
  dose_unit text,
  administration_route text,
  product_name text,
  manufacturer text,
  storage_instructions text,
  withdrawal_instructions text,
  precautions text,
  source_name text,
  source_url text,
  protocol_version text not null default 'Unconfigured',
  veterinarian_confirmed boolean not null default false,
  last_reviewed_at date,
  active boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id,id),
  unique (farm_id,vaccine_name,protocol_version),
  check (seasonal_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  check (primary_dose_count is distinct from 1 or primary_dose_interval_days is null),
  check (not active or (
    veterinarian_confirmed and minimum_age_days is not null and primary_dose_count is not null
    and (primary_dose_count = 1 or primary_dose_interval_days is not null)
    and dose_amount is not null and dose_unit is not null and administration_route is not null
    and product_name is not null and manufacturer is not null and storage_instructions is not null
    and precautions is not null and source_name is not null and source_url is not null
    and protocol_version <> 'Unconfigured' and last_reviewed_at is not null
  ))
);

create table if not exists public.vaccination_inventory (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  vaccine_name text not null,
  product_name text not null,
  batch_number text not null,
  expiry_date date not null,
  quantity_received numeric(12,3) not null check (quantity_received >= 0),
  quantity_used numeric(12,3) not null default 0 check (quantity_used >= 0 and quantity_used <= quantity_received),
  quantity_remaining numeric(12,3) generated always as (quantity_received - quantity_used) stored,
  low_stock_threshold numeric(12,3) not null default 0 check (low_stock_threshold >= 0),
  unit text not null,
  storage_notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id,id),
  unique (farm_id,product_name,batch_number)
);

create table if not exists public.vaccination_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  goat_id text not null,
  vaccination_schedule_id uuid not null,
  inventory_id uuid,
  vaccine_name_snapshot text not null,
  disease_snapshot text not null,
  product_name_snapshot text,
  vaccination_date date not null,
  dose_number smallint not null check (dose_number > 0),
  dose_amount numeric(12,4) check (dose_amount is null or dose_amount > 0),
  dose_unit text,
  administration_route text,
  batch_number text,
  expiry_date date,
  stock_quantity_used numeric(12,3),
  next_due_date date,
  administered_by text,
  adverse_reaction text,
  notes text,
  veterinarian_reviewed boolean not null default false,
  veterinarian_review_notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (farm_id,id),
  unique (farm_id,goat_id,vaccination_schedule_id,dose_number),
  foreign key (farm_id,goat_id) references public.goats(farm_id,goat_id) on delete restrict,
  foreign key (farm_id,vaccination_schedule_id) references public.vaccination_schedules(farm_id,id) on delete restrict,
  foreign key (farm_id,inventory_id) references public.vaccination_inventory(farm_id,id) on delete restrict,
  check ((inventory_id is null and stock_quantity_used is null) or (inventory_id is not null and stock_quantity_used is not null and stock_quantity_used > 0))
);

create table if not exists public.vaccination_due_overrides (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  goat_id text not null,
  vaccination_schedule_id uuid not null,
  dose_number smallint not null check (dose_number > 0),
  vaccination_record_id uuid,
  previous_due_date date,
  new_due_date date not null,
  reason text not null check (length(trim(reason)) > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (farm_id,goat_id) references public.goats(farm_id,goat_id) on delete restrict,
  foreign key (farm_id,vaccination_schedule_id) references public.vaccination_schedules(farm_id,id) on delete restrict,
  foreign key (farm_id,vaccination_record_id) references public.vaccination_records(farm_id,id) on delete restrict
);

create index if not exists vaccination_schedules_farm_active_idx on public.vaccination_schedules(farm_id,active,vaccine_name);
create index if not exists vaccination_records_farm_goat_date_idx on public.vaccination_records(farm_id,goat_id,vaccination_date desc);
create index if not exists vaccination_records_farm_due_idx on public.vaccination_records(farm_id,next_due_date);
create index if not exists vaccination_inventory_farm_expiry_idx on public.vaccination_inventory(farm_id,expiry_date);
create index if not exists vaccination_due_overrides_dose_idx on public.vaccination_due_overrides(farm_id,goat_id,vaccination_schedule_id,dose_number,created_at desc);

create or replace function public.set_vaccination_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at:=now();
  return new;
end;
$$;
drop trigger if exists vaccination_schedules_updated_at on public.vaccination_schedules;
create trigger vaccination_schedules_updated_at before update on public.vaccination_schedules
  for each row execute function public.set_vaccination_updated_at();
drop trigger if exists vaccination_inventory_updated_at on public.vaccination_inventory;
create trigger vaccination_inventory_updated_at before update on public.vaccination_inventory
  for each row execute function public.set_vaccination_updated_at();

alter table public.vaccination_schedules enable row level security;
alter table public.vaccination_inventory enable row level security;
alter table public.vaccination_records enable row level security;
alter table public.vaccination_due_overrides enable row level security;

grant select,insert,update,delete on public.vaccination_schedules to authenticated;
grant select,insert,update,delete on public.vaccination_inventory to authenticated;
grant select on public.vaccination_records to authenticated;
grant select,insert on public.vaccination_due_overrides to authenticated;

-- Schedules are readable by all farm members; only managers may maintain them.
drop policy if exists "vax schedule read" on public.vaccination_schedules;
create policy "vax schedule read" on public.vaccination_schedules for select to authenticated using (public.is_farm_member(farm_id));
drop policy if exists "vax schedule manager insert" on public.vaccination_schedules;
create policy "vax schedule manager insert" on public.vaccination_schedules for insert to authenticated with check (exists (select 1 from public.farm_members m where m.farm_id=vaccination_schedules.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')) and created_by=auth.uid());
drop policy if exists "vax schedule manager update" on public.vaccination_schedules;
create policy "vax schedule manager update" on public.vaccination_schedules for update to authenticated using (exists (select 1 from public.farm_members m where m.farm_id=vaccination_schedules.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager'))) with check (exists (select 1 from public.farm_members m where m.farm_id=vaccination_schedules.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')));
drop policy if exists "vax schedule manager delete" on public.vaccination_schedules;
create policy "vax schedule manager delete" on public.vaccination_schedules for delete to authenticated using (exists (select 1 from public.farm_members m where m.farm_id=vaccination_schedules.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')));

-- Batch management is restricted to owners and managers.
drop policy if exists "vax inventory read" on public.vaccination_inventory;
create policy "vax inventory read" on public.vaccination_inventory for select to authenticated using (public.is_farm_member(farm_id));
drop policy if exists "vax inventory manager insert" on public.vaccination_inventory;
create policy "vax inventory manager insert" on public.vaccination_inventory for insert to authenticated with check (exists (select 1 from public.farm_members m where m.farm_id=vaccination_inventory.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')) and created_by=auth.uid());
drop policy if exists "vax inventory manager update" on public.vaccination_inventory;
create policy "vax inventory manager update" on public.vaccination_inventory for update to authenticated using (exists (select 1 from public.farm_members m where m.farm_id=vaccination_inventory.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager'))) with check (exists (select 1 from public.farm_members m where m.farm_id=vaccination_inventory.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')));
drop policy if exists "vax inventory manager delete" on public.vaccination_inventory;
create policy "vax inventory manager delete" on public.vaccination_inventory for delete to authenticated using (exists (select 1 from public.farm_members m where m.farm_id=vaccination_inventory.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')));

-- Dose history is readable by members and inserted only through the checked atomic RPC below.
drop policy if exists "vax records read" on public.vaccination_records;
create policy "vax records read" on public.vaccination_records for select to authenticated using (public.is_farm_member(farm_id));
revoke insert,update,delete on public.vaccination_records from authenticated;

drop policy if exists "vax override read" on public.vaccination_due_overrides;
create policy "vax override read" on public.vaccination_due_overrides for select to authenticated using (public.is_farm_member(farm_id));
drop policy if exists "vax override manager insert" on public.vaccination_due_overrides;
create policy "vax override manager insert" on public.vaccination_due_overrides for insert to authenticated with check (exists (select 1 from public.farm_members m where m.farm_id=vaccination_due_overrides.farm_id and m.user_id=auth.uid() and m.role in ('owner','manager')) and created_by=auth.uid());

create or replace function public.record_vaccination(p_record jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_farm uuid := (p_record->>'farm_id')::uuid;
  v_goat_id text := p_record->>'goat_id';
  v_schedule_id uuid := (p_record->>'vaccination_schedule_id')::uuid;
  v_inventory_id uuid := nullif(p_record->>'inventory_id','')::uuid;
  v_role text;
  v_schedule public.vaccination_schedules%rowtype;
  v_goat public.goats%rowtype;
  v_batch public.vaccination_inventory%rowtype;
  v_last public.vaccination_records%rowtype;
  v_dose smallint := (p_record->>'dose_number')::smallint;
  v_date date := (p_record->>'vaccination_date')::date;
  v_stock numeric(12,3) := nullif(p_record->>'stock_quantity_used','')::numeric;
  v_interval integer;
  v_next date;
  v_override_due date;
  v_dose_amount numeric(12,4);
  v_has_legacy boolean;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if v_date > current_date then raise exception 'Vaccination date cannot be in the future'; end if;
  select m.role into v_role from public.farm_members m where m.farm_id=v_farm and m.user_id=auth.uid();
  if v_role is null or v_role not in ('owner','manager','staff') then raise exception 'Farm role cannot record vaccinations'; end if;
  select * into v_goat from public.goats g where g.farm_id=v_farm and g.goat_id=v_goat_id for update;
  if not found then raise exception 'Goat does not belong to this farm'; end if;
  select * into v_schedule from public.vaccination_schedules s where s.farm_id=v_farm and s.id=v_schedule_id and s.active and s.veterinarian_confirmed for share;
  if not found then raise exception 'An active veterinarian-approved schedule is required'; end if;
  v_dose_amount := nullif(p_record->>'dose_amount','')::numeric;
  if v_dose_amount is distinct from v_schedule.dose_amount
     or nullif(p_record->>'dose_unit','') is distinct from v_schedule.dose_unit
     or nullif(p_record->>'administration_route','') is distinct from v_schedule.administration_route then
    raise exception 'Dose amount, unit, and route must match the approved schedule';
  end if;
  if v_schedule.maternal_status_rule is not null and v_goat.maternal_vaccination_status='Unknown' and (not coalesce((p_record->>'veterinarian_reviewed')::boolean,false) or nullif(trim(p_record->>'veterinarian_review_notes'),'') is null) then
    raise exception 'Veterinarian review required for unknown maternal vaccination status';
  end if;
  if v_goat.date_of_birth is null or v_date < v_goat.date_of_birth+v_schedule.minimum_age_days then
    if not coalesce((p_record->>'veterinarian_reviewed')::boolean,false) or nullif(trim(p_record->>'veterinarian_review_notes'),'') is null then
      raise exception 'Veterinarian review required because goat age is unknown or below the approved minimum';
    end if;
  end if;
  select * into v_last from public.vaccination_records r where r.farm_id=v_farm and r.goat_id=v_goat_id and r.vaccination_schedule_id=v_schedule_id order by r.dose_number desc limit 1;
  if found then
    if v_dose <> v_last.dose_number+1 then raise exception 'Dose numbers must be sequential'; end if;
    select o.new_due_date into v_override_due from public.vaccination_due_overrides o
      where o.farm_id=v_farm and o.goat_id=v_goat_id and o.vaccination_schedule_id=v_schedule_id and o.dose_number=v_dose
      order by o.created_at desc limit 1;
    if v_last.dose_number < v_schedule.primary_dose_count and coalesce(v_override_due,v_last.next_due_date) is not null and coalesce(v_override_due,v_last.next_due_date) < v_date and (not coalesce((p_record->>'veterinarian_reviewed')::boolean,false) or nullif(trim(p_record->>'veterinarian_review_notes'),'') is null) then
      raise exception 'Veterinarian review required for an interrupted primary course';
    end if;
  elsif v_dose <> 1 then raise exception 'First recorded dose must be dose 1';
  else
    select exists (
      select 1 from public.health_records h
      where h.farm_id=v_farm and h.goat_id=v_goat_id and h.record_date<=v_date
        and (lower(h.record_type)='vaccination' or lower(h.record_type)=lower(v_schedule.vaccine_name)
          or lower(h.item_name) like '%'||lower(v_schedule.vaccine_name)||'%')
    ) into v_has_legacy;
    if v_has_legacy and (not coalesce((p_record->>'veterinarian_reviewed')::boolean,false) or nullif(trim(p_record->>'veterinarian_review_notes'),'') is null) then
      raise exception 'Veterinarian review required to reconcile a legacy health vaccination record';
    end if;
    if v_goat.date_of_birth is not null and v_date > v_goat.date_of_birth+v_schedule.minimum_age_days
      and (not coalesce((p_record->>'veterinarian_reviewed')::boolean,false) or nullif(trim(p_record->>'veterinarian_review_notes'),'') is null) then
      raise exception 'Veterinarian review required for a late first dose';
    end if;
  end if;

  if v_dose < v_schedule.primary_dose_count then v_interval:=v_schedule.primary_dose_interval_days;
  elsif v_dose = v_schedule.primary_dose_count then v_interval:=coalesce(v_schedule.booster_interval_days,v_schedule.recurring_interval_days);
  else v_interval:=coalesce(v_schedule.recurring_interval_days,v_schedule.booster_interval_days); end if;
  if v_interval is not null then v_next:=v_date+v_interval; end if;

  if v_inventory_id is not null then
    if v_stock is null or v_stock<=0 then raise exception 'Positive stock quantity is required'; end if;
    select * into v_batch from public.vaccination_inventory i where i.farm_id=v_farm and i.id=v_inventory_id for update;
    if not found or v_batch.vaccine_name<>v_schedule.vaccine_name or v_batch.product_name<>v_schedule.product_name or v_batch.expiry_date<v_date or v_batch.quantity_remaining<v_stock then
      raise exception 'Batch is expired, mismatched, or has insufficient stock';
    end if;
    update public.vaccination_inventory set quantity_used=quantity_used+v_stock,updated_by=auth.uid(),updated_at=now() where farm_id=v_farm and id=v_inventory_id;
  elsif v_stock is not null then raise exception 'Select a batch for stock usage'; end if;

  insert into public.vaccination_records (farm_id,goat_id,vaccination_schedule_id,inventory_id,vaccine_name_snapshot,disease_snapshot,product_name_snapshot,vaccination_date,dose_number,dose_amount,dose_unit,administration_route,batch_number,expiry_date,stock_quantity_used,next_due_date,administered_by,adverse_reaction,notes,veterinarian_reviewed,veterinarian_review_notes,created_by)
  values (v_farm,v_goat_id,v_schedule_id,v_inventory_id,v_schedule.vaccine_name,v_schedule.disease,v_schedule.product_name,v_date,v_dose,v_schedule.dose_amount,v_schedule.dose_unit,v_schedule.administration_route,v_batch.batch_number,v_batch.expiry_date,v_stock,v_next,nullif(p_record->>'administered_by',''),nullif(p_record->>'adverse_reaction',''),nullif(p_record->>'notes',''),coalesce((p_record->>'veterinarian_reviewed')::boolean,false),nullif(p_record->>'veterinarian_review_notes',''),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.record_vaccination(jsonb) from public,anon;
grant execute on function public.record_vaccination(jsonb) to authenticated;

insert into public.vaccination_schedules (farm_id,vaccine_name,disease,source_name,protocol_version,active,veterinarian_confirmed,created_by)
select f.id,t.vaccine_name,t.disease,'Veterinarian confirmation required','Unconfigured',false,false,f.created_by
from public.farms f cross join (values
  ('PPR','Peste des petits ruminants'),('FMD','Foot-and-mouth disease'),('ET','Enterotoxaemia'),
  ('HS','Haemorrhagic septicaemia'),('Goat Pox','Goat pox'),('Anthrax','Anthrax'),('ORF','Contagious ecthyma (ORF)')
) as t(vaccine_name,disease)
where not exists (select 1 from public.vaccination_schedules s where s.farm_id=f.id and s.vaccine_name=t.vaccine_name and s.protocol_version='Unconfigured');
