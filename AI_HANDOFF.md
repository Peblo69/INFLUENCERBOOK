# AI Handoff Document - GOONERPROJECT

**Last Updated:** 2026-02-06
**Project:** AI Influencerbook - Kiara AI Assistant Platform

---

## Supabase Connection

**CRITICAL FILE:** `/mnt/d/GOONERPROJECT/SUPABASE_AI_ACCESS.md`

### Quick Connect
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
```

### Run SQL Queries
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/fxukbijtgezuehmlaeps/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL HERE"}'
```

### Project Info
| Field | Value |
|-------|-------|
| Project Ref | `fxukbijtgezuehmlaeps` |
| Supabase URL | `https://fxukbijtgezuehmlaeps.supabase.co` |
| Region | West EU (Ireland) |
| Dashboard | https://supabase.com/dashboard/project/fxukbijtgezuehmlaeps |

### Deploy Edge Functions
```bash
export SUPABASE_ACCESS_TOKEN="sbp_3165b6cc60f2c652464901942e6a00f8b0db6340"
npx supabase functions deploy <function-name> --project-ref fxukbijtgezuehmlaeps
```

---

## Current Work: AI Chat System

### What We Built

#### 1. Chat Persistence (Supabase)
- **Migration file:** `supabase/migrations/009_chat_conversations_messages.sql` (ALREADY RUN)
- **Service file:** `src/services/chatService.ts`

**Database Schema:**
- `conversations` table - stores chat sessions
  - `id`, `user_id`, `title`, `model`, `summary`, `tags`
  - `total_messages`, `total_tokens`, `is_archived`
  - `last_message_at`, `is_deleted`, `deleted_at` (NEW COLUMNS)

- `messages` table - stores individual messages
  - `id`, `conversation_id`, `role`, `content`
  - `tool_calls`, `tool_results`, `images`
  - `attachments` (NEW COLUMN - JSONB)
  - `tokens`, `metadata`, `created_at`

**Trigger:** `messages_update_conversation_stats` - auto-updates conversation stats when messages are added/deleted

#### 2. Frontend Integration

**Files Modified:**
- `src/sections/AssistantPage/index.tsx` - Main page with conversation state management
- `src/sections/AssistantPage/components/AssistantSidebar.tsx` - Sidebar with conversation list
- `src/sections/AssistantPage/components/ChatArea.tsx` - Chat UI with streaming

**Features Implemented:**
- ✅ Conversations load from Supabase on mount
- ✅ New Chat button clears current conversation
- ✅ Click conversation to load its messages
- ✅ Messages saved to DB (user + AI)
- ✅ Conversation auto-created on first message (title from message content)
- ✅ Sidebar shows conversations grouped by date (Today, Yesterday, Last 7 Days, etc.)
- ✅ Rename conversation (inline edit)
- ✅ Delete conversation (soft delete)
- ✅ Streaming responses from Grok API
- ✅ Markdown rendering with ReactMarkdown + Tailwind Typography

#### 3. Streaming Implementation

**Service:** `src/services/grokService.ts`
- `streamMessageToGrok()` - SSE streaming with callbacks
- Uses `kiara-grok` edge function as proxy to xAI API
- Callbacks: `onToken`, `onComplete`, `onError`

**Edge Function:** `supabase/functions/kiara-grok/index.ts`
- Proxies requests to `https://api.x.ai/v1/chat/completions`
- Handles streaming pass-through
- Uses `XAI_API_KEY` secret

#### 4. Auto-scroll System

**Features:**
- Auto-follows new content during streaming
- Scroll UP to disable auto-follow (no glitching)
- Floating "scroll to bottom" button appears when scrolled up
- Click button to jump to bottom AND re-enable auto-follow
- Smooth scrolling with proper debouncing

---

## Recent Bug Fixes

### Fixed: First Message Not Showing AI Response
**Problem:** When creating a new conversation, `setCurrentConversationId()` triggered a useEffect that loaded messages from DB, overwriting the local state with empty array.

**Solution:** Added `skipNextLoad` flag in `AssistantPage`:
- Set to `true` before setting new conversation ID in `ensureConversation()`
- useEffect checks flag and skips DB load if true
- Preserves local messages during first message flow

### Fixed: Nested Button Warning
Changed conversation item from `<button>` to `<div>` with `cursor-pointer` to avoid nesting buttons.

---

## System Prompt (Kiara AI)

**Location:** `src/services/grokService.ts` - `SYSTEM_INSTRUCTION` constant

Kiara is configured as an AI Influencerbook assistant with expertise in:
- Platform management (OnlyFans, Fansly, Instagram, TikTok, Twitter, Reddit)
- Content creation strategies
- Monetization (PPV, subscriptions, tips)
- Engagement (sexting scripts, DM sales)
- AI image generation

Response formatting rules enforce:
- Headers for structure
- Bold for key points
- Bullet/numbered lists
- Code blocks for templates
- Short paragraphs

---

## Key Files Reference

### Frontend
| File | Purpose |
|------|---------|
| `src/sections/AssistantPage/index.tsx` | Main chat page, state management |
| `src/sections/AssistantPage/components/ChatArea.tsx` | Chat UI, streaming, message display |
| `src/sections/AssistantPage/components/AssistantSidebar.tsx` | Conversation list, rename/delete |
| `src/sections/AssistantPage/components/Modals.tsx` | Settings/Upgrade modals |

### Services
| File | Purpose |
|------|---------|
| `src/services/chatService.ts` | Supabase CRUD for conversations/messages |
| `src/services/grokService.ts` | Grok API streaming |
| `src/services/kiaraClient.ts` | Base URL helper for edge functions |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `kiara-grok` | Proxy to xAI/Grok API |
| `kiara-models` | Model registry |
| `kiara-generate` | Image generation |

### Config
| File | Purpose |
|------|---------|
| `.env` | Environment variables |
| `SUPABASE_AI_ACCESS.md` | AI connection instructions |
| `tailwind.config.js` | Includes @tailwindcss/typography plugin |

---

## Environment Variables (.env)

```
VITE_SUPABASE_URL=https://fxukbijtgezuehmlaeps.supabase.co
VITE_SUPABASE_ANON_KEY=***
VITE_SUPABASE_SERVICE_ROLE_KEY=***
VITE_COHERE_API_KEY=*** (for embeddings)
XAI_API_KEY=*** (in Supabase secrets)
FAL_API_KEY=*** (in Supabase secrets)
```

---

## Debug Logs (Currently Active)

These console.logs are in the code for debugging:
- `[ChatArea] Ensuring conversation exists...`
- `[ChatArea] Conversation ID: xxx`
- `[ChatArea] Starting stream to Grok...`
- `[ChatArea] First token received: xxx`
- `[ChatArea] Token: X chars, total: Y`
- `[ChatArea] Stream complete, total length: X`
- `[grokService] Fetching: url`
- `[grokService] Response status: 200`

Remove these when debugging is complete.

---

## Pending/Known Issues

1. **Debug logs** - Should be removed after confirming everything works
2. **Attachment storage** - Currently only stores metadata, not actual files (base64 data not persisted)
3. **Message history limit** - No pagination for long conversations yet

---

## Build & Run

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

---

## Testing Checklist

- [ ] Send first message in new chat → AI responds with streaming
- [ ] Send second message → AI responds
- [ ] Refresh page → Conversation appears in sidebar
- [ ] Click conversation → Messages load
- [ ] New Chat button → Clears chat, ready for new conversation
- [ ] Rename conversation → Updates in sidebar
- [ ] Delete conversation → Removes from sidebar
- [ ] Scroll up during streaming → Auto-scroll stops
- [ ] Click scroll button → Jumps to bottom, resumes auto-scroll

---

## Architecture Overview

```
User Input
    ↓
ChatArea.tsx (handleSubmit)
    ↓
ensureConversation() → Creates conversation in Supabase if needed
    ↓
streamMessageToGrok() → grokService.ts
    ↓
fetch() to kiara-grok edge function
    ↓
Edge function proxies to xAI API
    ↓
SSE stream back through all layers
    ↓
onToken callback updates React state
    ↓
ReactMarkdown renders content
    ↓
onComplete saves AI message to Supabase
```

---

**END OF HANDOFF DOCUMENT**
