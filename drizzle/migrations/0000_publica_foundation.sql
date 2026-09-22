-- Roles ---------------------------------------------------------------
create type public.app_role as enum ('citizen','officer','dept_admin','oversight','super_admin');
create type public.application_status as enum ('draft','submitted','under_review','documents_required','verified','approved','rejected','completed');

-- Profiles ------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  full_name text not null default 'Citizen',
  email text,
  phone text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null default 'citizen',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "own citizen role insert" on public.user_roles for insert to authenticated with check (auth.uid() = user_id and role = 'citizen');

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Departments & services ---------------------------------------------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.departments to anon, authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "departments public read" on public.departments for select to anon, authenticated using (true);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  department_id uuid not null references public.departments(id) on delete cascade,
  processing_time_days integer not null default 14,
  sla_days integer not null default 21,
  fee_cents integer not null default 0,
  required_documents text[] not null default '{}',
  icon text not null default 'FileText',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public read" on public.services for select to anon, authenticated using (is_active);

-- Applications --------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique,
  citizen_id uuid not null,
  service_id uuid not null references public.services(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  status public.application_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  expected_completion date,
  sla_deadline date,
  is_demo boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "applications own or demo select" on public.applications for select to authenticated using (auth.uid() = citizen_id or is_demo);
create policy "applications own insert" on public.applications for insert to authenticated with check (auth.uid() = citizen_id and is_demo = false);
create policy "applications own update" on public.applications for update to authenticated using (auth.uid() = citizen_id);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  status public.application_status not null,
  actor_label text not null default 'System',
  note text,
  created_at timestamptz not null default now()
);
grant select, insert on public.application_status_history to authenticated;
grant all on public.application_status_history to service_role;
alter table public.application_status_history enable row level security;
create policy "history visible with application" on public.application_status_history for select to authenticated
  using (exists (select 1 from public.applications a where a.id = application_id and (a.citizen_id = auth.uid() or a.is_demo)));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  is_read boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications own or demo select" on public.notifications for select to authenticated using (auth.uid() = user_id or is_demo);
create policy "notifications own update" on public.notifications for update to authenticated using (auth.uid() = user_id);

create table public.grievances (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  citizen_id uuid not null,
  department_id uuid references public.departments(id) on delete set null,
  subject text not null,
  details text not null default '',
  status text not null default 'open',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert on public.grievances to authenticated;
grant all on public.grievances to service_role;
alter table public.grievances enable row level security;
create policy "grievances own or demo select" on public.grievances for select to authenticated using (auth.uid() = citizen_id or is_demo);
create policy "grievances own insert" on public.grievances for insert to authenticated with check (auth.uid() = citizen_id and is_demo = false);

-- Seed data -----------------------------------------------------------
insert into public.departments (slug, name, description) values
  ('revenue','Revenue Department','Certificates, land records and citizen entitlements.'),
  ('transport','Transport Department','Vehicle registration, licensing and road permits.'),
  ('municipal','Municipal Services','Building permits, sanitation and civic infrastructure.'),
  ('welfare','Social Welfare Department','Pensions, scholarships and welfare schemes.'),
  ('licensing','Business Licensing Department','Trade licences and business compliance.');

insert into public.services (slug, name, description, department_id, processing_time_days, sla_days, fee_cents, required_documents, icon)
select v.slug, v.name, v.description, d.id, v.days, v.sla, v.fee, v.docs, v.icon
from (values
  ('birth-certificate','Birth Certificate','Official record of birth issued from the civil registry, usable for school admission, passports and welfare enrolment.','revenue',7,10,5000,array['Hospital birth record','Parent ID proof','Address proof'],'ScrollText'),
  ('income-certificate','Income Certificate','Certified statement of annual household income used for scholarships, subsidies and welfare eligibility.','revenue',10,14,3000,array['Salary slips or income declaration','ID proof','Address proof'],'Receipt'),
  ('business-license','Business License','Trade licence authorising commercial operations within the municipal jurisdiction.','licensing',21,30,150000,array['Business registration','Owner ID proof','Premises lease or ownership proof','Tax identification number'],'Store'),
  ('building-permit','Building Permit','Approval for new construction or structural modification, reviewed against zoning and safety codes.','municipal',30,45,250000,array['Approved site plan','Structural drawings','Land ownership document','Engineer certification'],'Building2'),
  ('vehicle-registration','Vehicle Registration','Registration of a new or transferred vehicle including issuance of the registration certificate.','transport',14,21,90000,array['Invoice or sale deed','Insurance certificate','Pollution certificate','Owner ID proof'],'Car'),
  ('welfare-scheme','Welfare Scheme Application','Enrolment into state welfare programmes such as pension, housing support or education assistance.','welfare',20,30,0,array['Income certificate','ID proof','Bank account details','Residence proof'],'HeartHandshake')
) as v(slug,name,description,dept,days,sla,fee,docs,icon)
join public.departments d on d.slug = v.dept;

-- Demo (fictional) applications visible to every signed-in user
insert into public.applications (application_number, citizen_id, service_id, department_id, status, submitted_at, expected_completion, sla_deadline, is_demo, notes)
select v.num, '00000000-0000-4000-8000-000000000001'::uuid, s.id, s.department_id, v.status::public.application_status,
       now() - (v.age || ' days')::interval, (now() + (v.eta || ' days')::interval)::date, (now() + (v.sla || ' days')::interval)::date, true, v.note
from (values
  ('PUB-2026-000481','birth-certificate','under_review',4,3,6,'Verification in progress at the civil registry desk.'),
  ('PUB-2026-000377','income-certification-placeholder','submitted',2,8,12,'Awaiting officer assignment.'),
  ('PUB-2026-000214','vehicle-registration','documents_required',9,5,11,'Pollution certificate is unreadable, please re-upload.'),
  ('PUB-2026-000112','welfare-scheme','approved',24,1,3,'Approved by the Social Welfare Department.'),
  ('PUB-2025-009984','business-license','completed',60,0,0,'Licence issued and downloadable.')
) as v(num,slug,status,age,eta,sla,note)
join public.services s on s.slug = (case when v.slug = 'income-certification-placeholder' then 'income-certificate' else v.slug end);

insert into public.application_status_history (application_id, status, actor_label, note, created_at)
select a.id, 'submitted', 'Citizen Portal', 'Application submitted online.', a.submitted_at from public.applications a where a.is_demo
union all
select a.id, a.status, 'Department Officer', coalesce(a.notes,''), a.submitted_at + interval '2 days' from public.applications a where a.is_demo and a.status <> 'submitted';

insert into public.notifications (title, body, kind, is_demo) values
  ('Document re-upload requested','Vehicle Registration PUB-2026-000214 needs a clearer pollution certificate.','action','true'),
  ('Application approved','Welfare Scheme Application PUB-2026-000112 was approved.','success','true'),
  ('Verification started','Birth Certificate PUB-2026-000481 moved to verification.','info','true');

insert into public.grievances (reference_number, citizen_id, department_id, subject, details, status, is_demo)
select 'GRV-2026-0142', '00000000-0000-4000-8000-000000000001'::uuid, d.id, 'Delay in certificate issuance', 'Birth certificate processing has exceeded the published service window.', 'open', true
from public.departments d where d.slug = 'revenue';