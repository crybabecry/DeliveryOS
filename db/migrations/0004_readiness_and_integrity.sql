-- DeliveryOS - Readiness engine persistence and integrity hardening
begin;

create or replace function public.record_readiness_snapshot(
  p_project_id uuid,
  p_requirement_score numeric,
  p_deliverable_score numeric,
  p_evidence_score numeric,
  p_verification_score numeric,
  p_acceptance_score numeric,
  p_overall_score numeric,
  p_delivery_status public.readiness_delivery_status,
  p_blocker_count integer,
  p_explanation jsonb,
  p_calculation_version text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot_id uuid;
  v_org_id uuid;
begin
  select organization_id into v_org_id from public.projects where id = p_project_id;
  if v_org_id is null then raise exception 'Project not found'; end if;
  if not public.is_org_member(v_org_id) then raise exception 'Not authorized'; end if;
  insert into public.readiness_snapshots(
    project_id, requirement_score, deliverable_score, evidence_score,
    verification_score, acceptance_score, overall_score, delivery_status,
    blocker_count, explanation, calculation_version
  ) values (
    p_project_id, p_requirement_score, p_deliverable_score, p_evidence_score,
    p_verification_score, p_acceptance_score, p_overall_score, p_delivery_status,
    p_blocker_count, coalesce(p_explanation, '{}'::jsonb), coalesce(p_calculation_version, 'v2')
  ) returning id into v_snapshot_id;
  return v_snapshot_id;
end;
$$;

grant execute on function public.record_readiness_snapshot(uuid,numeric,numeric,numeric,numeric,numeric,numeric,public.readiness_delivery_status,integer,jsonb,text) to authenticated;

create or replace function public.assert_evidence_consistency()
returns trigger
language plpgsql
as $$
declare
  v_req_project uuid;
  v_doc_project uuid;
begin
  select project_id into v_req_project from public.requirements where id = new.requirement_id;
  if v_req_project is null or v_req_project <> new.project_id then
    raise exception 'Evidence requirement/project mismatch';
  end if;
  if new.document_id is not null then
    select project_id into v_doc_project from public.documents where id = new.document_id;
    if v_doc_project is null or v_doc_project <> new.project_id then
      raise exception 'Evidence document/project mismatch';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_evidence_consistency on public.evidence;
create trigger trg_evidence_consistency
before insert or update on public.evidence
for each row execute function public.assert_evidence_consistency();

create or replace function public.assert_requirement_deliverable_project_consistency()
returns trigger
language plpgsql
as $$
declare
  v_req_project uuid;
  v_del_project uuid;
begin
  select project_id into v_req_project from public.requirements where id = new.requirement_id;
  select project_id into v_del_project from public.deliverables where id = new.deliverable_id;
  if v_req_project is null or v_del_project is null or v_req_project <> v_del_project then
    raise exception 'Requirement and deliverable belong to different projects';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_req_deliverable_consistency on public.requirement_deliverables;
create trigger trg_req_deliverable_consistency
before insert or update on public.requirement_deliverables
for each row execute function public.assert_requirement_deliverable_project_consistency();

create or replace function public.assert_verification_method_requirement_consistency()
returns trigger
language plpgsql
as $$
declare
  v_expected public.verification_method;
begin
  select verification_method into v_expected from public.requirements where id = new.requirement_id;
  if v_expected is not null and v_expected <> new.method then
    raise exception 'Verification method does not match requirement method';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verification_method_consistency on public.verification_records;
create trigger trg_verification_method_consistency
before insert or update on public.verification_records
for each row execute function public.assert_verification_method_requirement_consistency();

commit;
