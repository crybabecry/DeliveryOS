-- DeliveryOS - Document Storage
-- Private project document bucket with tenant-scoped Storage RLS.
-- Apply after 0001_initial_schema.sql.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage object path convention:
-- organization_id/project_id/document_id/version_id-filename

drop policy if exists "documents_storage_select_org_member" on storage.objects;
drop policy if exists "documents_storage_insert_org_member" on storage.objects;
drop policy if exists "documents_storage_delete_org_admin" on storage.objects;

create policy "documents_storage_select_org_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

create policy "documents_storage_insert_org_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

create policy "documents_storage_delete_org_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and public.has_org_role(
    (storage.foldername(name))[1]::uuid,
    array['OWNER'::public.organization_role, 'ADMIN'::public.organization_role]
  )
);

commit;
