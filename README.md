# DeliveryOS

DeliveryOS is a contract-to-delivery SaaS for aerospace, industrial-equipment and other regulated/complex manufacturing SMEs.

It sits above existing ERP/PLM/QMS/project tools and connects:

`Source document -> Requirement -> Deliverable -> Evidence -> Verification -> Acceptance -> Delivery Readiness`

## Scope of this release

- Supabase Auth + tenant isolation
- Organizations / members / roles
- Projects
- Contracts + controlled documents
- Private Supabase Storage
- Document versions + checksum
- PDF AI requirement extraction with source-page references
- Human review of extracted requirements
- Deliverables and requirement links
- Evidence and verification records
- Acceptance items
- Explainable readiness calculation
- Persistent readiness snapshots
- Automatic blocker rules
- Audit log
- XLSX delivery export
- Optional Stripe subscription billing
- Basic member invitation flow
- Unit-test foundation and Playwright E2E foundation

## Important data boundary

The MVP is for commercial, synthetic and otherwise non-restricted information. Do not use classified/state-secret or other restricted data. EU hosting does not itself constitute GDPR compliance.

## Stack

- Next.js / React / TypeScript
- Supabase PostgreSQL / Auth / Storage / RLS
- OpenAI Responses API for document extraction
- Stripe for optional billing
- XLSX export
- Vitest / Playwright

## Setup

1. Create a Supabase project in an EU region.
2. In Supabase SQL Editor, run migrations in `db/migrations/` in numeric order: `0001`, `0002`, `0003`, `0004`.
3. Copy `.env.example` to `.env.local` and fill the public Supabase variables.
4. Set `OPENAI_API_KEY` for PDF extraction. `OPENAI_MODEL` defaults to `gpt-5.6-luna` and can be overridden.
5. For invitations, set the server-only `SUPABASE_SERVICE_ROLE_KEY`.
6. For billing, set Stripe secret/webhook/price IDs.
7. Install dependencies with `pnpm install`.
8. Run `pnpm dev`.

## First-use path

`Sign up -> Create workspace -> Create project -> Upload PDF -> Process -> Review requirements -> Create/link deliverables -> Add evidence -> Verify -> Accept -> Recalculate -> Export`

## Checks

Run before a release:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

For browser E2E:

```bash
pnpm e2e
```

## AI rules

AI is never the authority of record. It creates draft requirements only. Human users explicitly approve requirements and record verification/acceptance states.

Every extracted requirement stores its source document and page reference when available.

## Repository layout

```text
app/                 Next.js routes and server actions
components/          UI components
lib/                 domain, readiness, validation, AI, billing helpers
db/migrations/       Supabase migrations
tests/               unit and E2E test suites
evals/               synthetic AI evaluation data
docs/                operational docs
scripts/             helper scripts
PROJECT_SPEC.md      architecture/source of truth
```
