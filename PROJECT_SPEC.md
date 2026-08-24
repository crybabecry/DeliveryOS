# PROJECT_SPEC.md

## 1. Product

**Working name:** DeliveryOS  
**Category:** Contract-to-Delivery / Delivery Readiness SaaS  
**Target:** Aerospace, industrial-equipment and other regulated/complex manufacturing SMEs.

### Product statement
DeliveryOS is a SaaS layer above ERP/PLM/QMS/project tools. It converts contract and technical documents into structured requirements and deliverables, links them to evidence, verification and acceptance, and calculates whether a project is ready for delivery.

### Core question
> Can we deliver this contract on time, and can we prove that every contractual obligation is fulfilled?

### MVP boundary
The MVP is a **commercial-information workflow tool**. It must not be positioned or designed for classified/state-secret or otherwise restricted data.

---

## 2. Product Principles

1. **Do not replace ERP/PLM/QMS.** Integrate later; aggregate first.
2. **One source of truth:** all project objects are linked in a traceable graph.
3. **AI proposes; humans approve.** AI must never silently mark a requirement verified.
4. **Evidence over claims:** readiness is based on traceable evidence and verification.
5. **Blockers override percentages:** a project can be 95% complete but still blocked.
6. **Auditability by default:** important changes are recorded immutably/append-only.
7. **EU-first architecture:** tenant isolation, EU data region, privacy/security baseline.
8. **Vertical-slice delivery:** every major feature must work end-to-end before broadening scope.
9. **Simple deterministic rules first:** predictive AI comes only after sufficient real data.
10. **Document-grounded AI:** extracted facts must retain source document/page references.

---

## 3. Target Users

### Primary
- Project / Delivery Manager
- Quality Manager / QA
- Technical Documentation Manager
- Engineering Lead

### Secondary
- Engineer
- Test/verification engineer
- Document controller
- Executive/view-only stakeholder

### Initial ICP
Small and medium aerospace/industrial/regulated manufacturers that receive contracts containing technical requirements, deliverables, tests, certificates and acceptance obligations and currently coordinate delivery across PDF/Word/Excel/email/Jira/Drive.

---

## 4. Core Workflow

```text
CONTRACT / RFQ / SOW / SPECIFICATION
                |
                v
       DOCUMENT INGESTION
                |
                v
       REQUIREMENT EXTRACTION
                |
                v
        HUMAN REVIEW / APPROVAL
                |
                v
          DELIVERABLES
                |
                v
       DOCUMENTS / EVIDENCE
                |
                v
          VERIFICATION
                |
                v
           ACCEPTANCE
                |
                v
      DELIVERY READINESS ENGINE
                |
                v
       BLOCKERS / RISKS / FORECAST
                |
                v
         DELIVERY PACKAGE
```

---

## 5. MVP Modules

1. Organizations & Users
2. Projects
3. Contracts & Source Documents
4. Requirements
5. Deliverables
6. Documents & Versions
7. Evidence
8. Verification
9. Acceptance
10. Delivery Readiness
11. Blockers / Risks
12. Dashboard
13. Audit Log
14. Export / Delivery Package
15. Billing

### Explicitly out of MVP
- Full ERP
- Full PLM/PDM
- Full QMS
- MES
- Supplier marketplace
- External supplier intelligence
- Predictive supply-chain ML
- CAD integrations
- Government procurement integrations
- Mobile app
- SSO/SAML
- On-premise deployment
- Classified-data infrastructure

---

## 6. Domain Model

### Core hierarchy

```text
Organization
  -> Project
      -> Contract
          -> Requirement
          -> Deliverable
      -> Document
          -> DocumentVersion
      -> Evidence
      -> VerificationRecord
      -> AcceptanceItem
      -> Risk
      -> Task
```

### Core traceability graph

```text
Source Document
      |
      v
Requirement <----> Deliverable
      |                 |
      v                 v
Evidence ----------> Document
      |
      v
Verification
      |
      v
Acceptance
      |
      v
Delivery Readiness
```

A requirement may have many deliverables/evidence items; a deliverable may satisfy multiple requirements. Use explicit junction tables for many-to-many relations.

---

## 7. Database Schema

All tables must include `id`, timestamps and tenant ownership directly or through a parent entity. UUIDs are preferred.

### `organizations`
- `id`
- `name`
- `slug`
- `created_at`

### `users`
Managed by Supabase Auth; application profile data may live in `user_profiles`.

### `organization_members`
- `id`
- `organization_id`
- `user_id`
- `role`
- `created_at`

Roles: `OWNER`, `ADMIN`, `MANAGER`, `ENGINEER`, `QA`, `VIEWER`.

### `projects`
- `id`
- `organization_id`
- `name`
- `code`
- `description`
- `status`
- `target_delivery_date`
- `created_by`
- `created_at`
- `updated_at`

### `contracts`
- `id`
- `project_id`
- `name`
- `contract_number`
- `customer_name`
- `effective_date`
- `delivery_date`
- `status`
- `source_document_id`

### `documents`
- `id`
- `project_id`
- `name`
- `document_type`
- `status`
- `current_revision`
- `owner_id`
- `created_by`

### `document_versions`
- `id`
- `document_id`
- `revision`
- `storage_path`
- `checksum`
- `mime_type`
- `file_size`
- `approval_status`
- `uploaded_by`
- `uploaded_at`
- `approved_by`
- `approved_at`

### `requirements`
- `id`
- `project_id`
- `contract_id`
- `source_document_id`
- `source_page`
- `source_locator`
- `source_text`
- `normalized_text`
- `category`
- `priority`
- `mandatory`
- `owner_id`
- `status`
- `verification_method`
- `due_date`
- `ai_confidence`
- `human_review_status`
- `created_at`
- `updated_at`

Statuses: `DRAFT`, `REVIEW`, `OPEN`, `IN_PROGRESS`, `PARTIALLY_VERIFIED`, `VERIFIED`, `FAILED`, `WAIVED`.

### `deliverables`
- `id`
- `project_id`
- `name`
- `type`
- `owner_id`
- `due_date`
- `status`
- `criticality`
- `acceptance_criteria`

### `requirement_deliverables`
- `requirement_id`
- `deliverable_id`

### `evidence`
- `id`
- `project_id`
- `requirement_id`
- `document_id`
- `type`
- `description`
- `verification_status`
- `verified_by`
- `verified_at`

### `verification_records`
- `id`
- `project_id`
- `requirement_id`
- `method`
- `status`
- `result`
- `notes`
- `performed_by`
- `performed_at`

Methods: `DOCUMENT_REVIEW`, `TEST`, `INSPECTION`, `CERTIFICATE`, `ANALYSIS`, `DEMONSTRATION`.

### `acceptance_items`
- `id`
- `project_id`
- `deliverable_id`
- `requirement_id`
- `status`
- `acceptance_criteria`
- `evidence_required`
- `accepted_by`
- `accepted_at`

### `risks`
- `id`
- `project_id`
- `type`
- `severity`
- `status`
- `source_object_type`
- `source_object_id`
- `description`
- `due_date`
- `mitigation`

### `tasks`
- `id`
- `project_id`
- `title`
- `owner_id`
- `status`
- `priority`
- `due_date`
- `linked_object_type`
- `linked_object_id`

### `comments`
- `id`
- `project_id`
- `author_id`
- `object_type`
- `object_id`
- `body`
- `created_at`

### `activity_log`
- `id`
- `organization_id`
- `project_id`
- `actor_id`
- `action`
- `object_type`
- `object_id`
- `old_value`
- `new_value`
- `metadata`
- `created_at`

### Billing
- `subscriptions`
- `subscription_events`

Store Stripe customer/subscription identifiers; never store raw card data.

---

## 8. State Machines

### Requirement
`DRAFT -> REVIEW -> OPEN -> IN_PROGRESS -> PARTIALLY_VERIFIED -> VERIFIED`

Alternative terminal states: `FAILED`, `WAIVED`.

### Document
`UPLOADED -> PROCESSING -> READY -> SUPERSEDED -> ARCHIVED`

### Verification
`NOT_STARTED -> IN_PROGRESS -> PASSED | FAILED`

### Acceptance
`OPEN -> READY -> ACCEPTED | REJECTED`

### Risk
`OPEN -> MITIGATING -> RESOLVED | ACCEPTED`

Invalid state transitions must be rejected server-side.

---

## 9. AI Architecture

### Principle
AI is an extraction and assistance layer, not the authority of record.

### AI pipeline

```text
Upload
  -> validate
  -> parse
  -> classify
  -> extract
  -> validate schema
  -> save draft objects
  -> human review
  -> approved objects enter workflow
```

### AI use cases MVP
1. Document classification
2. Contract requirement extraction
3. Deadline extraction
4. Deliverable extraction
5. Acceptance criterion extraction
6. Requirement categorization
7. Duplicate/similarity suggestions
8. Source citation/page mapping

### AI output requirements
Every extracted item must contain:
- source document
- page/locator where available
- exact source text or excerpt reference
- normalized value
- confidence
- extraction model/version
- extraction timestamp

### Never allow AI to silently
- mark requirement `VERIFIED`
- mark acceptance `ACCEPTED`
- delete evidence
- modify approved records
- override human decisions

### Structured output
All machine-consumed AI responses must use strict JSON schemas. Free-form model output must never be parsed with brittle string matching.

---

## 10. Document Processing

### Supported MVP inputs
- PDF
- DOCX
- XLSX/CSV for structured imports
- common image formats only when needed

### Processing stages
1. File validation
2. Malware scanning
3. Metadata extraction
4. Text extraction
5. Page/section preservation
6. AI classification
7. AI extraction
8. Validation
9. Persistence

Large/long-running processing must execute asynchronously.

### Storage convention
```text
/{organization_id}/{project_id}/{document_id}/{revision}/{filename}
```

Use private buckets and signed access, never public file URLs for project data.

---

## 11. Delivery Readiness Engine

### Goal
Produce a decision-support score plus explicit blockers.

### Dimensions
- Requirement readiness
- Deliverable readiness
- Evidence readiness
- Verification readiness
- Acceptance readiness

### Criticality weights
- `CRITICAL = 5`
- `HIGH = 3`
- `NORMAL = 1`

### Base dimension score
```text
weighted_completed / weighted_total * 100
```

### Overall readiness
For MVP:
```text
overall =
  requirement_score
  * deliverable_score
  * evidence_score
  * verification_score
  * acceptance_score
  normalized to 0..100
```

The exact normalization must be implemented in a single backend service/function and covered by tests.

### Blocker rule
A critical unmet obligation can set:
```text
delivery_status = BLOCKED
```
regardless of percentage score.

### Delivery status
- `ON_TRACK`
- `AT_RISK`
- `BLOCKED`
- `READY`

### Explainability
Every score must be drillable to the underlying records causing it.

---

## 12. Risk Engine MVP

Rule-based only.

Examples:

```text
IF mandatory requirement is not VERIFIED
AND due_date < target_delivery_date
THEN HIGH risk
```

```text
IF critical requirement lacks required evidence
THEN P0 blocker
```

```text
IF required document revision != approved/current revision
THEN HIGH risk
```

```text
IF acceptance item is incomplete and mandatory
THEN P0/P1 blocker according to criticality
```

AI/predictive risk models are post-MVP.

---

## 13. UI Routes

```text
/auth/login
/auth/signup

/app
/app/projects
/app/projects/[projectId]
/app/projects/[projectId]/requirements
/app/projects/[projectId]/requirements/[requirementId]
/app/projects/[projectId]/deliverables
/app/projects/[projectId]/documents
/app/projects/[projectId]/documents/[documentId]
/app/projects/[projectId]/evidence
/app/projects/[projectId]/verification
/app/projects/[projectId]/acceptance
/app/projects/[projectId]/risks
/app/projects/[projectId]/delivery
/app/projects/[projectId]/activity

/app/settings
/app/settings/team
/app/settings/billing
```

### Primary project navigation
```text
Overview | Requirements | Deliverables | Documents | Verification | Acceptance | Risks | Delivery | Activity
```

---

## 14. API Boundaries

Prefer server-side typed functions/services first; expose HTTP routes where required.

### Core
```text
/projects
/contracts
/requirements
/deliverables
/documents
/evidence
/verification
/acceptance
/risks
/readiness
/delivery
```

### AI
```text
/ai/classify-document
/ai/extract-contract
/ai/extract-requirements
/ai/check-consistency
```

### Billing
```text
/billing/checkout
/billing/portal
/billing/webhook
```

All mutations require authorization and tenant checks server-side.

---

## 15. Async Jobs

Use Trigger.dev (or equivalent durable job system) for:
- document ingestion
- OCR/parsing when needed
- AI extraction
- bulk imports
- readiness recalculation for large projects
- report generation
- scheduled deadline/risk checks
- notifications

Jobs must be:
- idempotent
- retryable
- observable
- bounded by time/size

Every job must persist status:
`QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELED`.

---

## 16. Security

### MVP baseline
- Supabase Auth
- Postgres RLS on tenant-owned data
- Server-only privileged credentials
- Private object storage
- Signed URLs for authorized access
- HTTPS
- Secure cookies
- Input validation
- Rate limiting
- Upload limits
- Malware scanning
- Audit logging
- Backup strategy
- Secret management
- Error logs must not expose document contents/secrets

### Tenant isolation
Every query touching tenant data must derive authorization from authenticated membership, never from a user-provided `organization_id` alone.

### Sensitive-data boundary
The application must clearly prohibit classified/state-secret data in MVP terms and onboarding.

---

## 17. Data Residency / Privacy

Default production target:
- Supabase database/storage: EU region, preferably Frankfurt
- Application execution: EU where practical
- AI/data-processing vendors: documented before production use

Required legal/product documents before public launch:
- Terms of Service
- Privacy Policy
- Data Processing Agreement where applicable
- Subprocessor list
- Data retention/deletion policy
- Security overview

EU hosting is not itself a GDPR certification.

---

## 18. Auditability

All material actions must create `activity_log` records.

Examples:
- requirement created/edited/status changed
- document uploaded/replaced/approved
- evidence linked/unlinked
- verification passed/failed
- acceptance changed
- user/role changes
- risk changes
- project deadline changes

Audit records are append-only from the application perspective.

---

## 19. Export / Delivery Package

MVP export:
- Requirements Matrix XLSX
- Deliverables List XLSX
- Evidence Index XLSX
- Verification Status XLSX
- Acceptance Status XLSX
- Document Index XLSX

Later:
- combined PDF report
- ZIP package
- configurable customer templates
- signed release package

---

## 20. Analytics

Track:
- organizations created
- users invited
- projects created
- contracts uploaded
- documents uploaded
- requirements extracted
- requirements approved/rejected
- AI correction rate
- evidence linked
- verification completed
- blockers created/resolved
- delivery packages generated
- trial-to-paid conversion
- weekly/monthly active projects

### Core product metrics
- Time to First Value
- Contract-to-first-matrix time
- AI extraction acceptance rate
- Requirement correction rate
- % projects reaching delivery dashboard
- % projects using delivery package export
- Number of unresolved blockers per project

Do not collect unnecessary customer document content in product analytics.

---

## 21. AI Evaluation

Create `/evals` dataset with synthetic contract packages.

Each benchmark case must contain expected:
- requirement count/range
- source pages
- deadlines
- deliverables
- acceptance criteria
- categories

### Metrics
- requirement precision
- requirement recall
- source-page accuracy
- deadline accuracy
- deliverable accuracy
- classification accuracy
- false-positive rate

Every prompt/model change must run the evaluation suite before release.

Target MVP quality gates are defined empirically from the benchmark and must not be invented from a single test case.

---

## 22. Testing Strategy

### Unit tests
- domain rules
- readiness calculations
- state transitions
- permission helpers
- parsing/normalization

### Integration tests
- DB + RLS
- document upload
- background job lifecycle
- AI persistence
- billing webhooks

### E2E tests
Critical path:
```text
signup
 -> create org
 -> create project
 -> upload contract
 -> AI extraction
 -> approve requirements
 -> create evidence
 -> verify
 -> readiness
 -> export
```

### Security tests
- cross-tenant access attempts
- unauthorized file access
- privilege escalation
- webhook signature validation
- malicious upload cases

---

## 23. Development Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + React + TypeScript |
| UI | Tailwind CSS + component library |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Authorization | PostgreSQL RLS |
| Storage | Supabase Storage |
| AI | OpenAI Responses API |
| Structured AI output | JSON Schema / Structured Outputs |
| Async jobs | Trigger.dev |
| Hosting | Vercel |
| Billing | Stripe |
| Version control | GitHub |
| Testing | Vitest + Playwright |
| Package manager | pnpm |

The stack is intentionally compact for one developer.

---

## 24. Repository Structure

```text
/
├── app/
├── components/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── storage/
│   ├── domain/
│   ├── readiness/
│   ├── permissions/
│   └── billing/
├── ai/
│   ├── schemas/
│   ├── prompts/
│   ├── extractors/
│   └── evaluators/
├── trigger/
├── db/
│   ├── migrations/
│   ├── seeds/
│   └── policies/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── evals/
├── docs/
├── scripts/
└── public/
```

---

## 25. Coding Standards

- TypeScript strict mode.
- No `any` unless explicitly justified.
- Server-side authorization on every mutation.
- Zod (or equivalent) validation at boundaries.
- Domain/business rules isolated from UI.
- Database migrations committed to Git.
- No secrets in source control.
- No direct DB access from presentation components.
- No AI call from UI directly; always through server/job boundary.
- All external API calls wrapped with timeout/error handling.
- Prefer small pure functions for scoring/rules.
- Every non-trivial feature gets tests.

---

## 26. AI Coding Rules

AI coding assistants are development tools, not architecture owners.

For each coding task, provide:
1. Goal
2. Relevant files
3. Constraints from this spec
4. Acceptance criteria
5. Test requirements
6. Security considerations

Never ask an AI coding assistant to rewrite the entire repository for a feature.

After generated code:
```text
inspect -> test -> typecheck -> lint -> security review -> commit
```

---

## 27. MVP Vertical Slices

### Slice 1 — Contract Intelligence
```text
Signup
 -> Organization
 -> Project
 -> Upload PDF
 -> Parse
 -> AI extraction
 -> Human review
 -> Requirements matrix
```

### Slice 2 — Evidence & Verification
```text
Requirement
 -> Deliverable
 -> Upload document/evidence
 -> Verification
 -> Verified requirement
```

### Slice 3 — Delivery Readiness
```text
Project
 -> requirement/deliverable/evidence states
 -> readiness engine
 -> blockers
 -> delivery dashboard
```

### Slice 4 — Delivery Package
```text
Dashboard
 -> export
 -> delivery package
 -> audit history
```

Only after Slice 4 works end-to-end should we broaden the feature set.

---

## 28. MVP Acceptance Criteria

The MVP is considered functionally complete only when a test customer can:

1. Create an organization.
2. Invite at least one user.
3. Create a project.
4. Upload a sample contract PDF.
5. Receive structured AI-extracted requirements with source references.
6. Review/approve/edit/reject extracted requirements.
7. Create/link deliverables.
8. Upload and version documents.
9. Link evidence to requirements.
10. Record verification results.
11. Record acceptance state.
12. See readiness score and explainable blockers.
13. See how changing a core status affects readiness.
14. Export a delivery package.
15. See an audit trail of material project actions.
16. Be prevented from accessing another organization’s data.

---

## 29. Post-MVP Roadmap

### V1.1
- document consistency checks
- revision impact analysis
- configurable requirement templates
- configurable acceptance checklists
- email notifications

### V1.2
- supplier compliance passport
- supplier documents/expiry tracking
- customer delivery templates
- role-specific dashboards

### V2
- Jira/Teams integrations
- ERP/PLM connectors
- delivery forecasting
- advanced change impact analysis

### V3
- supplier risk intelligence
- supply-chain dependency graph
- external data integrations
- predictive delivery risk

### V4
- enterprise SSO/SAML
- private-cloud/on-premise option
- advanced compliance/security packages

---

## 30. Product Boundaries / Non-goals

DeliveryOS will not become:
- a CAD system
- a manufacturing execution system
- a general ERP
- a replacement PLM
- a general-purpose document management platform
- a battlefield/operational command system
- a weapon-control or targeting system

Its domain is **contract execution, evidence, verification, acceptance and delivery readiness**.

---

## 31. First Development Backlog

### Epic A — Foundation
- [ ] Initialize Next.js/TypeScript/pnpm repo.
- [ ] Configure lint/format/typecheck.
- [ ] Create Supabase project in EU region.
- [ ] Configure environments: local/preview/production.
- [ ] Configure secrets.
- [ ] Configure GitHub CI.

### Epic B — Auth / Tenant
- [ ] Supabase Auth.
- [ ] Organization creation.
- [ ] Membership model.
- [ ] Roles.
- [ ] RLS.
- [ ] Invitation flow.

### Epic C — Project
- [ ] Project CRUD.
- [ ] Project dashboard shell.
- [ ] Project navigation.

### Epic D — Documents
- [ ] Document table.
- [ ] Storage bucket/policies.
- [ ] Upload UI.
- [ ] Document metadata.
- [ ] Versioning.

### Epic E — AI Ingestion
- [ ] Background job.
- [ ] PDF processing.
- [ ] Contract classifier.
- [ ] Requirement extraction schema.
- [ ] Requirement extractor.
- [ ] Source references.
- [ ] Human review UI.

### Epic F — Requirements / Deliverables
- [ ] Requirement CRUD.
- [ ] Requirement filters.
- [ ] Deliverables.
- [ ] Requirement-deliverable links.

### Epic G — Evidence / Verification
- [ ] Evidence linking.
- [ ] Verification records.
- [ ] Acceptance items.
- [ ] Status transitions.

### Epic H — Readiness
- [ ] Readiness service.
- [ ] Blocker rules.
- [ ] Risk rules.
- [ ] Dashboard.
- [ ] Drill-down explanation.

### Epic I — Export / Audit
- [ ] Activity log.
- [ ] XLSX export.
- [ ] Delivery package.

### Epic J — Billing / Launch
- [ ] Stripe Checkout.
- [ ] Webhooks.
- [ ] Subscription gating.
- [ ] Trial.
- [ ] Terms/privacy.
- [ ] Production monitoring.

---

## 32. Definition of Done

A task is DONE only when:

```text
Implementation
+ validation
+ authorization
+ error handling
+ UI loading/empty/error states
+ tests
+ typecheck/lint
+ documentation where needed
+ Git commit
```

For AI features additionally:
```text
structured schema
+ source citations
+ evaluation case
+ failure handling
+ human-review path
```

---

## 33. Source of Truth Rules

This file is the authoritative project specification.

If code, tickets, prompts or UI designs conflict with this file:
1. stop implementation;
2. resolve the specification conflict;
3. update this file first;
4. then update code.

Do not silently introduce architecture or domain-model changes.

---

## 34. First Objective

The first engineering objective is **Vertical Slice 1**:

```text
User
 -> Organization
 -> Project
 -> Contract PDF
 -> AI extraction
 -> Human review
 -> Requirements Matrix
```

Success means the complete path works in a real deployed environment using synthetic aerospace/industrial contract documents, with tenant isolation, source-page traceability and audit logging.

Everything else is secondary until this vertical slice is stable.
