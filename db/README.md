# DeliveryOS database

Target: Supabase PostgreSQL.

Apply migrations in order:

1. `0001_initial_schema.sql` — domain model, roles, RLS, audit foundation and billing tables.
2. `0002_document_storage.sql` — private Storage bucket and tenant-scoped object policies.
3. `0003_delivery_workflow.sql` — workflow integrity and requirement-status recalculation.
4. `0004_readiness_and_integrity.sql` — readiness snapshot RPC and cross-object integrity hardening.

Do not skip migrations or apply them out of order.

The Storage bucket is private. The application is designed for commercial/non-restricted information only.
