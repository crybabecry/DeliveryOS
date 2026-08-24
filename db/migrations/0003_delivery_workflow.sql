-- DeliveryOS - Delivery Workflow
-- Requirement -> Deliverable -> Evidence -> Verification -> Acceptance
begin;

create unique index if not exists verification_records_requirement_method_uidx
on public.verification_records(requirement_id, method);

create or replace function public.validate_requirement_project_consistency()
returns trigger language plpgsql as $$
declare requirement_project uuid;
begin
  select project_id into requirement_project from public.requirements where id = new.requirement_id;
  if requirement_project is null then raise exception 'Requirement % does not exist', new.requirement_id; end if;
  if requirement_project <> new.project_id then raise exception 'Project mismatch for requirement %', new.requirement_id; end if;
  return new;
end;
$$;

drop trigger if exists trg_evidence_requirement_project on public.evidence;
create trigger trg_evidence_requirement_project before insert or update on public.evidence for each row execute function public.validate_requirement_project_consistency();
drop trigger if exists trg_verification_requirement_project on public.verification_records;
create trigger trg_verification_requirement_project before insert or update on public.verification_records for each row execute function public.validate_requirement_project_consistency();

create or replace function public.validate_acceptance_parent_project_consistency()
returns trigger language plpgsql as $$
declare parent_project uuid;
begin
  if new.deliverable_id is not null then
    select project_id into parent_project from public.deliverables where id = new.deliverable_id;
    if parent_project is null or parent_project <> new.project_id then raise exception 'Project mismatch for acceptance deliverable %', new.deliverable_id; end if;
  end if;
  if new.requirement_id is not null then
    select project_id into parent_project from public.requirements where id = new.requirement_id;
    if parent_project is null or parent_project <> new.project_id then raise exception 'Project mismatch for acceptance requirement %', new.requirement_id; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_acceptance_parent_project on public.acceptance_items;
create trigger trg_acceptance_parent_project before insert or update on public.acceptance_items for each row execute function public.validate_acceptance_parent_project_consistency();

create or replace function public.recalculate_requirement_status(p_requirement_id uuid)
returns public.requirement_status
language plpgsql security definer set search_path = public as $$
declare
  verified_count integer;
  failed_count integer;
  pending_evidence integer;
  review_status public.human_review_status;
  requirement_project uuid;
  requirement_org uuid;
  new_status public.requirement_status;
begin
  select r.human_review_status, r.project_id, p.organization_id
    into review_status, requirement_project, requirement_org
  from public.requirements r
  join public.projects p on p.id = r.project_id
  where r.id = p_requirement_id;
  if review_status is null then raise exception 'Requirement % not found', p_requirement_id; end if;
  if not public.is_org_member(requirement_org) then raise exception 'Not authorized for requirement %', p_requirement_id; end if;
  if review_status <> 'APPROVED' then
    new_status := 'DRAFT';
  else
    select count(*) filter (where status = 'PASSED'), count(*) filter (where status = 'FAILED')
      into verified_count, failed_count
    from public.verification_records where requirement_id = p_requirement_id;
    select count(*) into pending_evidence from public.evidence
      where requirement_id = p_requirement_id and verification_status in ('UNVERIFIED', 'PENDING');
    if failed_count > 0 then new_status := 'FAILED';
    elsif verified_count > 0 and pending_evidence = 0 then new_status := 'VERIFIED';
    elsif verified_count > 0 or pending_evidence = 0 then new_status := 'PARTIALLY_VERIFIED';
    else new_status := 'OPEN'; end if;
  end if;
  update public.requirements set status = new_status, updated_at = now() where id = p_requirement_id;
  return new_status;
end;
$$;

commit;
