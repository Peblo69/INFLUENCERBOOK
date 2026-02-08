# Edge Functions Deployment Guide

This project uses Supabase Edge Functions to secure API keys, credit checks, and Stripe billing.

## Prerequisites
1. Supabase CLI installed
2. Project linked (`supabase link`)
3. Secrets set (WAVESPEED, REPLICATE, STRIPE, etc.)

## Deploy functions

```bash
supabase functions deploy generate-image
supabase functions deploy train-lora
supabase functions deploy check-training-status
supabase functions deploy training-signed-url
supabase functions deploy stripe-webhook
supabase functions deploy stripe-prices
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-invoices
```

You can also deploy everything:

```bash
supabase functions deploy
```

## Function URLs
- generate-image: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/generate-image`
- train-lora: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/train-lora`
- check-training-status: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/check-training-status`
- training-signed-url: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/training-signed-url`
- stripe-webhook: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-webhook`
- stripe-prices: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-prices`
- stripe-checkout: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-checkout`
- stripe-portal: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-portal`
- stripe-invoices: `https://fonzxpqtsdfhvlyvqjru.supabase.co/functions/v1/stripe-invoices`

## Required secrets
Set these in Supabase secrets (not in Vite):
- `SUPABASE_SERVICE_ROLE_KEY`
- `WAVESPEED_API_KEY`
- `REPLICATE_API_KEY`
- `XAI_API_KEY` (or `GROK_API_KEY`) for `kiara-grok`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Notes
- `training-signed-url` returns signed URLs for private training ZIPs.
- `generate-image` and `train-lora` use `profiles` + `credit_transactions` for credits.
- `stripe-webhook` updates `profiles` plan/stripe fields and logs events in `billing_events`.
- `stripe-prices`, `stripe-checkout`, `stripe-portal`, and `stripe-invoices` require `STRIPE_SECRET_KEY`.
- In Stripe, set price/product metadata:
  - `plan`: `free | pro | premium | enterprise` (for subscription prices)
  - `credits`: integer string (for one-time credit packs)
