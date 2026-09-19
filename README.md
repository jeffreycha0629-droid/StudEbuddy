# StudEbuddy

An AI-powered study planning companion for students — task tracking, manual
and AI-generated study plans, a study timer, daily check-ins, and an AI
"Study Buddy" chat. Built with Next.js (App Router), TypeScript, Tailwind
CSS, Supabase (Postgres + Auth), and the Anthropic API.

This is a desktop-first, responsive web application.

See also: `PRODUCT_SPEC.md` (what it does), `FEATURE_STATUS.md` (exactly
what's built vs. planned), `DATABASE_SCHEMA.md`, `DESIGN_SYSTEM.md`,
`SECURITY.md`, `PROJECT_RULES.md`, `CLAUDE.md`, and `TRANSFER_NOTES.md`
(architecture notes and known issues for whoever picks this up next).

## Prerequisites

- Node.js 18.18+ (tested with Node 22)
- npm (tested with npm 10)
- A [Supabase](https://supabase.com) project (free tier is fine) — required
  for auth and every database-backed feature
- An [Anthropic API key](https://console.anthropic.com/) — required for the
  AI features (Study Buddy, AI study plans, assignment breakdown, concept
  explanation)

Neither Supabase nor Anthropic credentials are required just to install and
start the dev server — the app starts and the public marketing pages work
with zero configuration. Pages that need a database or the AI will show a
clear in-app error telling you what's missing until you configure it.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from
     your Supabase project's Dashboard → Project Settings → API.
   - `ANTHROPIC_API_KEY` — from console.anthropic.com, only needed for the
     AI features to actually respond.

   No real values are required for `npm run dev` to start.

3. **Apply the database schema** to your Supabase project. This project
   doesn't have the Supabase CLI wired up yet, so migrations are applied by
   hand — see `supabase/README.md` for the exact, file-by-file steps (open
   each file in `supabase/migrations/` in order, paste into the Supabase
   SQL Editor, run). This step is required before any auth-gated page or
   database feature will work.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

5. **Before committing any change**, verify:
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```
   `npm run build` requires `.env.local` to have at least placeholder-looking
   values for the two `NEXT_PUBLIC_SUPABASE_*` variables — Next.js needs to
   determine which routes are static vs. dynamic at build time, and the
   Supabase client throws if those variables are entirely absent. Real
   values are only needed for the app to actually *function*, not to build.

## Project structure

```
studebuddy/
├── public/                    # static assets (currently empty)
├── src/
│   ├── app/                   # Next.js App Router: pages, layouts, route handlers
│   │   ├── (marketing)/       # public pages: home, login, signup, password reset
│   │   ├── (app)/             # authenticated shell: dashboard, study-plan,
│   │   │                        calendar, study-buddy, progress, profile, settings
│   │   ├── onboarding/        # 7-step onboarding flow, own minimal shell
│   │   └── auth/confirm/      # Supabase email-link confirmation route
│   ├── components/            # React components, grouped by feature area
│   │   └── ui/                # shared primitives: Button, Card, Input, Select, etc.
│   ├── lib/
│   │   ├── actions/           # Server Actions — all mutations and AI calls live here
│   │   ├── ai/                # the one file that talks to the Anthropic API
│   │   ├── supabase/          # the three Supabase client factories (browser/server/middleware)
│   │   ├── validation/        # shared client-side validation helpers
│   │   └── utils/              # small shared helpers (date formatting, class-name joining)
│   └── types/                 # hand-written TypeScript types mirroring the DB schema
├── supabase/
│   ├── migrations/            # SQL migrations, apply in filename order
│   └── README.md              # how to apply migrations without the Supabase CLI
├── tests/                     # currently a placeholder — see tests/README.md
├── .env.local.example         # documents every environment variable; copy to .env.local
├── .gitignore
├── package.json
├── package-lock.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── (the documentation files listed above)
```

This follows Next.js App Router conventions rather than a Vite/CRA-style
`App.jsx`/`main.jsx`/`index.html` layout, because that's what this app was
actually built with — it needs server-side rendering, Server Actions, and
Supabase's server/browser client split, which App Router provides directly.
See `TRANSFER_NOTES.md` for more on this.

## Known limitations

- `npm run build` fails if `.env.local` is completely absent (see step 5
  above) — this is a real, minor gap, not expected framework behavior; see
  `TRANSFER_NOTES.md` for the one-line fix if you want to address it.
- `npm audit` reports vulnerabilities in Next.js 14 with no patched release
  in the 14.x line; fixing them requires upgrading to Next.js 15/16, which
  is a breaking change out of scope for this transfer. See
  `TRANSFER_NOTES.md`.
- No automated tests exist yet (see `tests/README.md` and
  `FEATURE_STATUS.md`).
- The Dashboard's "Upcoming Deadlines" and "Progress" cards are static
  placeholders, not wired to real data — see `FEATURE_STATUS.md`.
