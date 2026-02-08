# Supabase Setup (Project, Schema, Storage, Edge Function)

This project integrates with Supabase for queueing and retrieving image/video generations. Follow these steps to get the backend in place and wire environment variables.

## 1) Create a Supabase Project
- Go to https://supabase.com/ and create a new project.
- In Project Settings → API, copy the `Project URL` and `anon public key`.
- Create a `.env` file (based on `.env.example`) in your project root and add:

```
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Restart your dev server after adding env vars.

## 2) Database Schema
Run the following SQL in the Supabase SQL editor to set up a minimal table for generation tracking.

```sql
-- Enable pgcrypto for gen_random_uuid, if needed
create extension if not exists pgcrypto;

-- Enumerations for status and type (optional; you can also use text)
do $$ begin
  create type generation_status as enum ('queued','processing','succeeded','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type generation_type as enum ('image','video','mask','remix');
exception when duplicate_object then null; end $$;

-- Core table
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  status generation_status not null default 'queued',
  type generation_type not null default 'image',
  model text,
  prompt text not null,
  image_url text,
  video_url text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional: index for sorting recent items
create index if not exists generations_created_at_idx on public.generations (created_at desc);
```

## 3) Storage Bucket
- In Storage, create a bucket named `generated`.
- Recommended: public read enabled (makes it easier to show images on the site). For private buckets, generate signed URLs in your edge function and store those.

## 4) Edge Function for Image Generation
You can use a Supabase Edge Function to run the model provider (e.g., Replicate) and store results.

Example function outline (TypeScript):

```ts
// supabase/functions/generate-image/index.ts
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";

export async function handle(req: Request): Promise<Response> {
  const { prompt, width = 768, height = 1024, model = "stability-ai/sdxl" } = await req.json();

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const replicateToken = Deno.env.get("REPLICATE_API_TOKEN")!;

  const supabase = createClient(url, serviceRoleKey);
  const replicate = new Replicate({ auth: replicateToken });

  try {
    // Run generation
    const output = await replicate.run(model, {
      input: { prompt, width, height },
    });

    const imageUrl = Array.isArray(output?.output) ? output.output[0] : output?.output;

    // Store in DB
    const { data, error } = await supabase
      .from("generations")
      .insert({ status: "succeeded", type: "image", prompt, model, image_url: imageUrl })
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
  } catch (err: any) {
    await supabase.from("generations").insert({ status: "failed", type: "image", prompt, model, error: String(err?.message ?? err) });
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status: 500 });
  }
}
```

### Deploying the function
- Install Supabase CLI: `npm i -g supabase`
- Create the function: `supabase functions new generate-image`
- Add the code above in `functions/generate-image/index.ts`
- Set secrets in your project:
  - `supabase secrets set REPLICATE_API_TOKEN=YOUR_REPLICATE_TOKEN`
  - `supabase secrets set SUPABASE_URL=YOUR_PROJECT_URL SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY`
- Deploy: `supabase functions deploy generate-image`

The frontend calls this via `supabase.functions.invoke("generate-image", { body: { prompt, ... } })`.

## 5) Frontend Notes
- When `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are missing, the app falls back to a safe stub client to avoid crashes. Add your env vars to enable real requests.
- PromptBar is wired to submit generation requests. The Create page shows recent generations and updates via realtime.

## 6) Optional enhancements
- Add authentication and a `user_id` column in `generations` to scope results per user.
- Store generated files in the `generated` bucket and save public URLs in `image_url`/`video_url`.
- Add a `styles` table and link preferred style settings.