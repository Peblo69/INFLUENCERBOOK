# Quick Database Setup

1. Open Supabase SQL Editor.
2. Run these migration files in order:
   - `supabase/migrations/001_create_memories_system.sql`
   - `supabase/migrations/002_create_profiles_system.sql`
   - `supabase/migrations/003_seedream_results.sql`
   - `supabase/migrations/003_social_media_schema.sql`
   - `supabase/migrations/004_ai_generation_system.sql`
   - `supabase/migrations/005_knowledge_base.sql`
   - `supabase/migrations/006_profiles_auth_billing.sql`
   - `supabase/migrations/007_credits_and_transactions.sql`
   - `supabase/migrations/008_billing_events.sql`
   - `supabase/migrations/009_chat_conversations_messages.sql`
3. Run `supabase/setup-storage.sql` to create buckets and policies.
4. Enable Email auth with confirmation required.
5. Set Site URL to `http://localhost:5173` and add Redirect URL `http://localhost:5173/auth`.

Profiles are stored in the `profiles` table and created automatically on signup.
