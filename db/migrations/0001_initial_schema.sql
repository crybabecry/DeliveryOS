-- DeliveryOS - Initial database schema
-- Target: Supabase PostgreSQL
-- Scope: MVP domain model, tenant isolation, audit foundation.
-- NOTE: This migration must be reviewed before production use.

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

do $$ begin
  create type public.organization_role as enum (
    'OWNER', 'ADMIN', 'MANAGER', 'ENGINEER', 'QA', 'VIEWER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_status as enum (
    'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contract_status as enum (
    'DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum (
    'UPLOADED', 'PROCESSING', 'READY', 'SUPERSEDED', 'ARCHIVED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_approval_status as enum (
    'PENDING', 'APPROVED', 'REJECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.requirement_status as enum (
    'DRAFT', 'REVIEW', 'OPEN', 'IN_PROGRESS', 'PARTIALLY_VERIFIED',
    'VERIFIED', 'FAILED', 'WAIVED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.requirement_priority as enum (
    'CRITICAL', 'HIGH', 'NORMAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_method as enum (
    'DOCUMENT_REVIEW', 'TEST', 'INSPECTION', 'CERTIFICATE', 'ANALYSIS', 'DEMONSTRATION'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.human_review_status as enum (
    'PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.deliverable_status as enum (
    'OPEN', 'IN_PROGRESS', 'READY', 'DELIVERED', 'ACCEPTED', 'REJECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.criticality_level as enum (
    'CRITICAL', 'HIGH', 'NORMAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.evidence_verification_status as enum (
    'UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum (
    'NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.acceptance_status as enum (
    'OPEN', 'READY', 'ACCEPTED', 'REJECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_status as enum (
    'OPEN', 'MITIGATING', 'RESOLVED', 'ACCEPTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_severity as enum (
    'P0', 'P1', 'P2', 'P3'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.readiness_delivery_status as enum (
    'ON_TRACK', 'AT_RISK', 'BLOCKED', 'READY'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum (
    'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- COMMON FUNCTIONS
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = auth.uid()
      and om.role = any(p_roles)
  );
$$;

-- ------------------------------------------------------------
-- ORGANIZATIONS / USERS
-- ------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(trim(name)) between 2 and 200),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members(user_id);
create index organization_members_org_idx on public.organization_members(organization_id);

-- ------------------------------------------------------------
-- PROJECTS / CONTRACTS
-- ------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  status public.project_status not null default 'PLANNING',
  target_delivery_date date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  constraint projects_name_length check (char_length(trim(name)) between 1 and 200),
  constraint projects_code_length check (char_length(trim(code)) between 1 and 80)
);

create index projects_org_idx on public.projects(organization_id);
create index projects_org_status_idx on public.projects(organization_id, status);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  contract_number text,
  customer_name text,
  effective_date date,
  delivery_date date,
  status public.contract_status not null default 'DRAFT',
  source_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contracts_project_idx on public.contracts(project_id);
create index contracts_project_status_idx on public.contracts(project_id, status);

-- ------------------------------------------------------------
-- DOCUMENTS / VERSIONS
-- ------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  document_type text not null,
  status public.document_status not null default 'UPLOADED',
  current_revision text not null default 'A',
  owner_id uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_name_length check (char_length(trim(name)) between 1 and 500),
  constraint documents_type_length check (char_length(trim(document_type)) between 1 and 100)
);

create index documents_project_idx on public.documents(project_id);
create index documents_project_status_idx on public.documents(project_id, status);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  revision text not null,
  storage_path text not null unique,
  checksum text not null,
  mime_type text not null,
  file_size bigint not null,
  approval_status public.document_approval_status not null default 'PENDING',
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  unique (document_id, revision),
  constraint document_versions_file_size_positive check (file_size > 0),
  constraint document_versions_checksum_length check (char_length(trim(checksum)) between 8 and 200)
);

create index document_versions_document_idx on public.document_versions(document_id);
create index document_versions_checksum_idx on public.document_versions(checksum);

alter table public.contracts
  add constraint contracts_source_document_fk
  foreign key (source_document_id) references public.documents(id) on delete set null;

-- ------------------------------------------------------------
-- REQUIREMENTS / DELIVERABLES
-- ------------------------------------------------------------

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  source_page integer,
  source_locator text,
  source_text text not null,
  normalized_text text,
  category text,
  priority public.requirement_priority not null default 'NORMAL',
  mandatory boolean not null default true,
  owner_id uuid references auth.users(id),
  status public.requirement_status not null default 'DRAFT',
  verification_method public.verification_method,
  due_date date,
  ai_confidence numeric(5,4),
  human_review_status public.human_review_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requirements_source_page_positive check (source_page is null or source_page > 0),
  constraint requirements_ai_confidence_range check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  constraint requirements_source_text_length check (char_length(trim(source_text)) >= 1)
);

create index requirements_project_idx on public.requirements(project_id);
create index requirements_contract_idx on public.requirements(contract_id);
create index requirements_project_status_idx on public.requirements(project_id, status);
create index requirements_project_due_idx on public.requirements(project_id, due_date);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  type text not null,
  owner_id uuid references auth.users(id),
  due_date date,
  status public.deliverable_status not null default 'OPEN',
  criticality public.criticality_level not null default 'NORMAL',
  acceptance_criteria text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliverables_name_length check (char_length(trim(name)) between 1 and 500),
  constraint deliverables_type_length check (char_length(trim(type)) between 1 and 100)
);

create index deliverables_project_idx on public.deliverables(project_id);
create index deliverables_project_status_idx on public.deliverables(project_id, status);
create index deliverables_project_due_idx on public.deliverables(project_id, due_date);

create table public.requirement_deliverables (
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  deliverable_id uuid not null references public.deliverables(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (requirement_id, deliverable_id)
);

create index requirement_deliverables_deliverable_idx on public.requirement_deliverables(deliverable_id);

-- ------------------------------------------------------------
-- EVIDENCE / VERIFICATION / ACCEPTANCE
-- ------------------------------------------------------------

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  type text not null,
  description text,
  verification_status public.evidence_verification_status not null default 'UNVERIFIED',
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_type_length check (char_length(trim(type)) between 1 and 100)
);

create index evidence_project_idx on public.evidence(project_id);
create index evidence_requirement_idx on public.evidence(requirement_id);
create index evidence_document_idx on public.evidence(document_id);

create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  method public.verification_method not null,
  status public.verification_status not null default 'NOT_STARTED',
  result text,
  notes text,
  performed_by uuid references auth.users(id),
  performed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_records_project_idx on public.verification_records(project_id);
create index verification_records_requirement_idx on public.verification_records(requirement_id);
create index verification_records_status_idx on public.verification_records(project_id, status);

create table public.acceptance_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_id uuid references public.deliverables(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete cascade,
  status public.acceptance_status not null default 'OPEN',
  acceptance_criteria text not null,
  evidence_required boolean not null default true,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acceptance_items_parent_check check (deliverable_id is not null or requirement_id is not null)
);

create index acceptance_items_project_idx on public.acceptance_items(project_id);
create index acceptance_items_deliverable_idx on public.acceptance_items(deliverable_id);
create index acceptance_items_requirement_idx on public.acceptance_items(requirement_id);
create index acceptance_items_status_idx on public.acceptance_items(project_id, status);

-- ------------------------------------------------------------
-- RISKS / TASKS / COMMENTS / AUDIT
-- ------------------------------------------------------------

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  severity public.risk_severity not null default 'P2',
  status public.risk_status not null default 'OPEN',
  source_object_type text,
  source_object_id uuid,
  description text not null,
  due_date date,
  mitigation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index risks_project_idx on public.risks(project_id);
create index risks_project_status_idx on public.risks(project_id, status);
create index risks_project_severity_idx on public.risks(project_id, severity);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  owner_id uuid references auth.users(id),
  status text not null default 'OPEN',
  priority public.criticality_level not null default 'NORMAL',
  due_date date,
  linked_object_type text,
  linked_object_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length check (char_length(trim(title)) between 1 and 500)
);

create index tasks_project_idx on public.tasks(project_id);
create index tasks_owner_idx on public.tasks(owner_id);
create index tasks_project_due_idx on public.tasks(project_id, due_date);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  object_type text not null,
  object_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (char_length(trim(body)) between 1 and 10000)
);

create index comments_project_idx on public.comments(project_id);
create index comments_object_idx on public.comments(object_type, object_id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  object_type text not null,
  object_id uuid,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_org_created_idx on public.activity_log(organization_id, created_at desc);
create index activity_log_project_created_idx on public.activity_log(project_id, created_at desc);
create index activity_log_object_idx on public.activity_log(object_type, object_id, created_at desc);

-- ------------------------------------------------------------
-- READINESS SNAPSHOTS / JOBS
-- ------------------------------------------------------------

create table public.readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requirement_score numeric(5,2) not null default 0,
  deliverable_score numeric(5,2) not null default 0,
  evidence_score numeric(5,2) not null default 0,
  verification_score numeric(5,2) not null default 0,
  acceptance_score numeric(5,2) not null default 0,
  overall_score numeric(5,2) not null default 0,
  delivery_status public.readiness_delivery_status not null default 'ON_TRACK',
  blocker_count integer not null default 0,
  calculated_at timestamptz not null default now(),
  calculation_version text not null default 'v1',
  explanation jsonb not null default '{}'::jsonb,
  constraint readiness_scores_range check (
    requirement_score between 0 and 100 and
    deliverable_score between 0 and 100 and
    evidence_score between 0 and 100 and
    verification_score between 0 and 100 and
    acceptance_score between 0 and 100 and
    overall_score between 0 and 100
  ),
  constraint readiness_blocker_count_nonnegative check (blocker_count >= 0)
);

create index readiness_project_calc_idx on public.readiness_snapshots(project_id, calculated_at desc);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  job_type text not null,
  status public.job_status not null default 'QUEUED',
  external_job_id text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint processing_jobs_attempt_nonnegative check (attempt_count >= 0)
);

create index processing_jobs_org_idx on public.processing_jobs(organization_id);
create index processing_jobs_status_idx on public.processing_jobs(status);
create index processing_jobs_project_idx on public.processing_jobs(project_id);

-- ------------------------------------------------------------
-- BILLING
-- ------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_code text not null default 'TRIAL',
  status text not null default 'TRIALING',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index subscription_events_subscription_idx on public.subscription_events(subscription_id);

-- ------------------------------------------------------------
-- TRIGGERS
-- ------------------------------------------------------------

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_contracts_updated_at on public.contracts;
create trigger trg_contracts_updated_at
before update on public.contracts
for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_requirements_updated_at on public.requirements;
create trigger trg_requirements_updated_at
before update on public.requirements
for each row execute function public.set_updated_at();

drop trigger if exists trg_deliverables_updated_at on public.deliverables;
create trigger trg_deliverables_updated_at
before update on public.deliverables
for each row execute function public.set_updated_at();

drop trigger if exists trg_evidence_updated_at on public.evidence;
create trigger trg_evidence_updated_at
before update on public.evidence
for each row execute function public.set_updated_at();

drop trigger if exists trg_verification_records_updated_at on public.verification_records;
create trigger trg_verification_records_updated_at
before update on public.verification_records
for each row execute function public.set_updated_at();

drop trigger if exists trg_acceptance_items_updated_at on public.acceptance_items;
create trigger trg_acceptance_items_updated_at
before update on public.acceptance_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_risks_updated_at on public.risks;
create trigger trg_risks_updated_at
before update on public.risks
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_processing_jobs_updated_at on public.processing_jobs;
create trigger trg_processing_jobs_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.contracts enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.requirements enable row level security;
alter table public.deliverables enable row level security;
alter table public.requirement_deliverables enable row level security;
alter table public.evidence enable row level security;
alter table public.verification_records enable row level security;
alter table public.acceptance_items enable row level security;
alter table public.risks enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.activity_log enable row level security;
alter table public.readiness_snapshots enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;

-- Organization policies
create policy organizations_select_member
on public.organizations for select to authenticated
using (public.is_org_member(id));

create policy organizations_insert_authenticated
on public.organizations for insert to authenticated
with check (true);

-- Membership policies
create policy organization_members_select_member
on public.organization_members for select to authenticated
using (public.is_org_member(organization_id));

create policy organization_members_insert_admin
on public.organization_members for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['OWNER','ADMIN']::public.organization_role[]
  )
  or not exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_members.organization_id
  )
);

create policy organization_members_update_admin
on public.organization_members for update to authenticated
using (
  public.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
)
with check (
  public.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
);

create policy organization_members_delete_admin
on public.organization_members for delete to authenticated
using (
  public.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
);

-- Profile policies
create policy user_profiles_select_self
on public.user_profiles for select to authenticated
using (user_id = auth.uid());

create policy user_profiles_insert_self
on public.user_profiles for insert to authenticated
with check (user_id = auth.uid());

create policy user_profiles_update_self
on public.user_profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Project policies
create policy projects_select_member
on public.projects for select to authenticated
using (public.is_org_member(organization_id));

create policy projects_insert_manager
on public.projects for insert to authenticated
with check (
  public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.organization_role[])
  and created_by = auth.uid()
);

create policy projects_update_manager
on public.projects for update to authenticated
using (
  public.has_org_role(organization_id, array['OWNER','ADMIN','MANAGER']::public.organization_role[])
)
with check (
  public.is_org_member(organization_id)
);

create policy projects_delete_admin
on public.projects for delete to authenticated
using (
  public.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[])
);

-- Project descendant policies use project membership through parent project.
-- SELECT
create policy contracts_select_member
on public.contracts for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy contracts_write_manager
on public.contracts for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id
    and public.has_org_role(p.organization_id, array['OWNER','ADMIN','MANAGER']::public.organization_role[])
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id
    and public.has_org_role(p.organization_id, array['OWNER','ADMIN','MANAGER']::public.organization_role[])
));

create policy documents_select_member
on public.documents for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy documents_write_member
on public.documents for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy document_versions_select_member
on public.document_versions for select to authenticated
using (exists (
  select 1
  from public.documents d
  join public.projects p on p.id = d.project_id
  where d.id = document_id and public.is_org_member(p.organization_id)
));

create policy document_versions_write_member
on public.document_versions for all to authenticated
using (exists (
  select 1
  from public.documents d
  join public.projects p on p.id = d.project_id
  where d.id = document_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1
  from public.documents d
  join public.projects p on p.id = d.project_id
  where d.id = document_id and public.is_org_member(p.organization_id)
));

create policy requirements_select_member
on public.requirements for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy requirements_write_member
on public.requirements for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy deliverables_select_member
on public.deliverables for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy deliverables_write_member
on public.deliverables for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy requirement_deliverables_select_member
on public.requirement_deliverables for select to authenticated
using (exists (
  select 1
  from public.requirements r
  join public.projects p on p.id = r.project_id
  where r.id = requirement_id and public.is_org_member(p.organization_id)
));

create policy requirement_deliverables_write_member
on public.requirement_deliverables for all to authenticated
using (exists (
  select 1
  from public.requirements r
  join public.projects p on p.id = r.project_id
  where r.id = requirement_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1
  from public.requirements r
  join public.projects p on p.id = r.project_id
  where r.id = requirement_id and public.is_org_member(p.organization_id)
));

create policy evidence_select_member
on public.evidence for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy evidence_write_member
on public.evidence for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy verification_select_member
on public.verification_records for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy verification_write_member
on public.verification_records for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy acceptance_select_member
on public.acceptance_items for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy acceptance_write_member
on public.acceptance_items for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy risks_select_member
on public.risks for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy risks_write_member
on public.risks for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy tasks_select_member
on public.tasks for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy tasks_write_member
on public.tasks for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy comments_select_member
on public.comments for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy comments_write_member
on public.comments for all to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
))
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_id and public.is_org_member(p.organization_id)
  )
);

create policy activity_log_select_member
on public.activity_log for select to authenticated
using (public.is_org_member(organization_id));

-- Audit writes are intentionally server-side in application code/service role.
-- No INSERT/UPDATE/DELETE policy is granted to authenticated clients.

create policy readiness_select_member
on public.readiness_snapshots for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and public.is_org_member(p.organization_id)
));

create policy processing_jobs_select_member
on public.processing_jobs for select to authenticated
using (public.is_org_member(organization_id));

-- Job mutation is server-side only.

create policy subscriptions_select_member
on public.subscriptions for select to authenticated
using (public.is_org_member(organization_id));

create policy subscription_events_select_member
on public.subscription_events for select to authenticated
using (exists (
  select 1
  from public.subscriptions s
  where s.id = subscription_id
    and public.is_org_member(s.organization_id)
));

-- ------------------------------------------------------------
-- GRANTS
-- ------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Authenticated access is governed by RLS.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

comment on table public.organizations is 'Tenant root for DeliveryOS. One organization represents one customer workspace.';
comment on table public.requirements is 'Contractual/technical obligations. AI may create drafts; human approval is required before workflow use.';
comment on table public.activity_log is 'Append-only application audit trail. Authenticated clients can read but not write directly.';
comment on table public.readiness_snapshots is 'Explainable delivery-readiness calculations. Each calculation stores the engine version and explanation payload.';
comment on table public.processing_jobs is 'Durable background job state for document/AI workflows.';

commit;
