# Security baseline

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` and Stripe secrets server-only.
- Keep the `documents` Storage bucket private.
- Enforce tenant access using Postgres RLS.
- Do not expose direct public document URLs.
- Record material changes in `activity_log`.
- Treat AI output as untrusted draft data until human review.
- Validate all mutation inputs at the server boundary.
- Do not place customer document content into product analytics.
- Use synthetic/non-restricted data in local development and early pilots.
- Review retention/deletion policies before production use.
