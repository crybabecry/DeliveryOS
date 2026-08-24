# Deployment checklist

## Supabase
- Create an EU-region project.
- Apply migrations in order.
- Confirm RLS is enabled on all public application tables.
- Create the private `documents` bucket via migration `0002`.
- Configure Auth email provider/redirect URLs.

## Vercel
- Set all `.env.example` values needed for the environment.
- Use an EU execution region where available/appropriate.
- Configure the production URL in `NEXT_PUBLIC_APP_URL`.

## OpenAI
- Create a project API key.
- Set `OPENAI_API_KEY`.
- Set a model supported by the account/region. The default in this repository is configurable through `OPENAI_MODEL`.

## Stripe
- Create Products/Prices for Starter, Team and Business.
- Set the three price environment variables.
- Configure a webhook for `/api/billing/webhook`.
- Set `STRIPE_WEBHOOK_SECRET`.

## Verification
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
