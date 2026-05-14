@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

BikinMacro is a micro SaaS web app that generates Excel VBA macros from natural language descriptions (Indonesian/English). It is built for non-programmers who need Excel automation.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run lint     # Run ESLint
```

There are no tests configured in this project.

## Tech Stack

- **Next.js 16.2.4** (App Router) — see AGENTS.md: this version has breaking changes from training data
- **React 19 / TypeScript**
- **Tailwind CSS v4** — utility-first, with `@tailwindcss/postcss`
- **Supabase** — Auth (email OTP + Google OAuth) + Postgres DB
- **AI SDK (`ai` package)** — wraps Anthropic, OpenAI, and OpenRouter; uses `generateText` (not streaming)
- **Midtrans** — payment gateway; Snap.js loaded globally via `<Script strategy="beforeInteractive">` in root layout
- **Shiki** — VBA syntax highlighting
- **Recharts** — charts in admin dashboard

## Architecture Overview

### Route Structure

| Route | Who | Notes |
|---|---|---|
| `/` | Public/authenticated | Landing for guests, dashboard for logged-in users |
| `/generate` | Auth required | Core feature: prompt → VBA macro |
| `/history` | Auth required | Past generations |
| `/pricing` | Public | Plan comparison |
| `/settings` | Auth required | User profile & billing |
| `/auth/login`, `/auth/register` | Guest only | Redirect to `/` if already logged in |
| `/north/*` | Admin only (`role = 'admin'`) | Admin dashboard at a separate layout with sidebar |

### Middleware & Auth

`src/middleware.ts` → delegates to `src/utils/supabase/middleware.ts`.

Protected routes: `/generate`, `/history`, `/settings` — redirect to `/auth/login` if unauthenticated.  
Admin routes: `/north/*` (except `/north/login`) — redirect to `/north/login` if not admin.  
Auth routes: redirect to `/` if already authenticated.

Always use `createClient()` from `src/utils/supabase/server.ts` in Server Components and Route Handlers. Never import from `src/utils/supabase/client.ts` in server-side code.

### Database Schema (Supabase)

Key tables:
- `public.users` — extends `auth.users`; fields: `role` (`'user'|'admin'`), `plan` (`'free'|'addon'|'starter'|'pro'`), `credits_used`, `credits_limit`, `reset_at`
- `public.generations` — stores every VBA generation: `user_id`, `prompt`, `category`, `output_vba`
- `public.generation_chats` — chat refinement history per generation: `generation_id`, `user_id`, `role`, `content`
- `public.payments` — payment records: `user_id`, `plan`, `amount`, `status`, `midtrans_id`
- `public.plan_settings` — per-plan AI config: `plan`, `ai_provider`, `ai_model`, `system_context`, `credits_limit`, `max_chat_per_generation`
- `public.admin_settings` — global admin config (id=1): `payment_provider`, `lynk_url_addon/starter/pro`

All tables have Row Level Security: users can only read/write their own data; admins can read all.

### AI Provider System

Both `/api/generate` and `/api/chat` use the same `getAiModel()` pattern supporting three providers:
- `anthropic` — uses `ANTHROPIC_API_KEY`
- `openai` — uses `OPENAI_API_KEY`
- `openrouter` — uses `OPENROUTER_API_KEY` (default if key is present)

Provider and model are configured **per plan** in the `plan_settings` table via the admin `/north/settings` page. The fallback order if not configured: env `AI_PROVIDER` → OpenRouter → OpenAI → Anthropic.

### Generate Flow

1. `POST /api/generate` — checks quota, calls AI, strips VBA code fences, saves to `generations`, decrements `credits_used`
2. `POST /api/chat` — refines an existing generation; checks `max_chat_per_generation` limit from `plan_settings`; saves messages to `generation_chats` and updates `generations.output_vba` with the latest code

### Payment Flow (Midtrans)

1. `POST /api/checkout` — creates Midtrans transaction, returns Snap token; client fires `window.dispatchEvent(new CustomEvent('start-payment', ...))` 
2. `PaymentManager` component (mounted in root layout) listens for `start-payment` events, opens Midtrans Snap popup, manages countdown timer via localStorage
3. `POST /api/webhooks/midtrans` — verifies SHA-512 signature, updates `users.plan` and `credits_limit` based on amount or `plan_settings`
4. `GET /api/payments/status` — polled by client after payment popup closes

A secondary payment provider (Lynk) is supported via static payment links configured in `admin_settings`.

### Admin Panel (`/north`)

Separate layout with sidebar (`src/app/north/Sidebar.tsx`). Has its own login at `/north/login` that checks `role = 'admin'` from `public.users`. Pages: dashboard overview, users table, transactions, feedback, settings (per-plan AI config + payment provider).

### Component Responsibilities

- `LayoutShell` — wraps Navbar + Footer, conditionally hides them on `/north/*` routes
- `ThemeProvider` — dark/light mode via `next-themes`
- `PaymentManager` — global payment state machine (no server state), mounted once in root layout
- `MacroChat` — inline chat refinement UI on `/generate` page
- `GenerateForm` — the main generate form with quota gate logic

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # Used only in webhook handlers (admin client)
ANTHROPIC_API_KEY
OPENAI_API_KEY
OPENROUTER_API_KEY
AI_PROVIDER                        # Optional: 'anthropic' | 'openai' | 'openrouter'
MIDTRANS_SERVER_KEY
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
NEXT_PUBLIC_MIDTRANS_MODE          # 'production' | 'sandbox'
```
