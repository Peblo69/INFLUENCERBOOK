# Supabase AI Access Guide

Quick reference for AI assistants to connect and manage Supabase.

---

## Quick Connect

```bash
# Set token (already saved in .claude/settings.local.json)
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"

# Link to project (run once per session if needed)
npx supabase link --project-ref fxukbijtgezuehmlaeps
```

---

## Project Info

| Field | Value |
|-------|-------|
| **Project Name** | DEADPROMPT |
| **Project Ref** | `fxukbijtgezuehmlaeps` |
| **Region** | West EU (Ireland) |
| **Dashboard** | https://supabase.com/dashboard/project/fxukbijtgezuehmlaeps |

---

## Run SQL Queries

### Option 1: Management API (Recommended)

```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"

curl -s -X POST "https://api.supabase.com/v1/projects/fxukbijtgezuehmlaeps/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM your_table LIMIT 5;"}'
```

### Option 2: Use the migration script

```bash
# For complex SQL files, use the migration runner:
npx tsx scripts/run-sql-migration.ts
```

---

## Edge Functions

### List Functions
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
npx supabase functions list --project-ref fxukbijtgezuehmlaeps
```

### Deploy Function
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
npx supabase functions deploy <function-name> --project-ref fxukbijtgezuehmlaeps
```

### View Logs
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
npx supabase functions logs <function-name> --project-ref fxukbijtgezuehmlaeps
```

### Set Secrets
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
npx supabase secrets set MY_SECRET=value --project-ref fxukbijtgezuehmlaeps
```

---

## Database Migrations

### Run a specific SQL file
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"

# Read and execute SQL file via API
SQL=$(cat supabase/migrations/your_file.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/fxukbijtgezuehmlaeps/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL\"}"
```

### Or use the TypeScript runner
```bash
# Edit scripts/run-sql-migration.ts to point to your SQL file, then:
npx tsx scripts/run-sql-migration.ts
```

---

## Knowledge Base Ingestion

```bash
# Drop files in knowledge-base/inbox/ then run:
npx tsx scripts/ingest-knowledge.ts
```

**Supported files:** `.md`, `.txt`, `.json`, `.html`

---

## Current Active Services

| Service | Status | Notes |
|---------|--------|-------|
| kiara-models | ACTIVE | Model registry endpoint |
| kiara-generate | ACTIVE | Image generation endpoint |
| Knowledge Base | ACTIVE | 33 chunks indexed |

---

## Environment Variables (in .env)

```bash
# Supabase
VITE_SUPABASE_URL=https://fxukbijtgezuehmlaeps.supabase.co
VITE_SUPABASE_ANON_KEY=***
VITE_SUPABASE_SERVICE_ROLE_KEY=***

# Embeddings
COHERE_API_KEY=*** # For knowledge base

# AI
XAI_API_KEY=*** # Grok
FAL_API_KEY=*** # Image generation
```

---

## Troubleshooting

### "Access token not provided"
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
```

### "Project not linked"
```bash
npx supabase link --project-ref fxukbijtgezuehmlaeps
```

### Check connection
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fxukbijtgezuehmlaeps/database/query" \
  -H "Authorization: Bearer sbp_3165b6cc60f2c652464901942e6a00f8b0db6340" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT 1;"}'
# Should return: [{"?column?":1}]
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Run SQL | `curl -X POST .../database/query` |
| List edge functions | `npx supabase functions list` |
| Deploy edge function | `npx supabase functions deploy <name>` |
| View logs | `npx supabase functions logs <name>` |
| Ingest knowledge | `npx tsx scripts/ingest-knowledge.ts` |
| Run migration | `npx tsx scripts/run-sql-migration.ts` |

---

**Last Updated:** 2025-02-05
**Token Location:** `.claude/settings.local.json`
