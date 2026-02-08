# Supabase Setup Guide

This guide sets up Supabase for the AI Influencer Studio with secure auth, profiles, RLS, storage, and billing.

## 1) Create a Supabase project

1. Go to supabase.com and create a new project.
2. Save the database password and project URL.

## 2) Run database migrations

In the Supabase SQL Editor, run these files in order (each file as a separate query):

1. `supabase/migrations/001_create_memories_system.sql`
2. `supabase/migrations/002_create_profiles_system.sql`
3. `supabase/migrations/003_seedream_results.sql`
4. `supabase/migrations/003_social_media_schema.sql`
5. `supabase/migrations/004_ai_generation_system.sql`
6. `supabase/migrations/005_knowledge_base.sql`
7. `supabase/migrations/006_profiles_auth_billing.sql`
8. `supabase/migrations/007_credits_and_transactions.sql`
9. `supabase/migrations/008_billing_events.sql`
10. `supabase/migrations/009_chat_conversations_messages.sql`

This creates the canonical `profiles` table, AI generation tables, memory system, social schema, knowledge base, and credit/billing tables with RLS.

## 3) Create storage buckets and policies

Run this file in SQL Editor:

- `supabase/setup-storage.sql`

Buckets created:
- `generated-images` (public read)
- `lora-models` (public read)
- `avatars` (public read)
- `training-images` (private)

All write access is restricted to the authenticated user folder (`{user_id}/...`).

## 4) Enable email authentication (verification required)

1. Supabase Dashboard -> Authentication -> Providers
2. Enable Email provider
3. Require email confirmation

URL configuration:
- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/auth`

## 5) Configure environment variables

Add to `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Add these in Supabase project secrets (not Vite):
- `SUPABASE_SERVICE_ROLE_KEY`
- `WAVESPEED_API_KEY`
- `REPLICATE_API_KEY`
- `XAI_API_KEY` (or `GROK_API_KEY`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Restart the dev server after updating `.env`.

## 6) Deploy Edge Functions

See `EDGE_FUNCTIONS_DEPLOY.md` for the deploy list.

Stripe setup tip:
- For subscription prices, set `metadata.plan` to `free`, `pro`, `premium`, or `enterprise`.
- For one-time credit packs, set `metadata.credits` to the integer amount of credits to grant.

## 7) Quick verification

1. Sign up in the app.
2. Confirm your email from the verification email.
3. Sign in and open `Settings`.
4. Check `profiles` table in Supabase; you should see a profile with 1000 credits.

If you see RLS errors, re-run the migrations and storage policies in Steps 2 and 3.
