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
- For the fastest path to a fully working prototype (recommended, see below):
  [Docker](https://docs.docker.com/get-docker/) — no Supabase account needed.
- For a persistent/shared backend instead: a [Supabase](https://supabase.com)
  project (free tier is fine).
- An [Anthropic API key](https://console.anthropic.com/) — required for the
  AI features (Study Buddy, AI study plans, assignment breakdown, concept
  explanation) regardless of which backend option you pick above. There's no
  local/free substitute for this one — it's a billed third-party API call.

Neither is required just to install and start the dev server — the app
starts and the public marketing pages work with zero configuration. Pages
that need a database or the AI will show a clear in-app error telling you
what's missing until you configure it.

## Setup — fastest path to a fully working, clickable prototype (no account signup)

This runs the *real* Supabase stack (Postgres, Auth, REST API) entirely on
your own machine via Docker — not a mock, not a simulation. Every feature
except the AI ones works exactly as it would against a real cloud project:
real signup/login, real Row Level Security, real data that persists across
reloads. This was the exact setup used to verify the app end-to-end before
this note was written (see `TRANSFER_NOTES.md`'s changelog).

```bash
npm install
npx supabase start   # pulls and starts Postgres/Auth/REST locally, applies
                      # every migration in supabase/migrations/ automatically
```

`supabase start` prints an `API_URL` and `ANON_KEY` — copy them into
`.env.local`:

```bash
cp .env.local.example .env.local
# then set:
#   NEXT_PUBLIC_SUPABASE_URL=<the API_URL it printed, e.g. http://127.0.0.1:54321>
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<the ANON_KEY it printed>
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up with any email
(no real inbox needed — local Auth doesn't require email confirmation by
default) and click through the real app: onboarding, tasks, study plans,
the timer, calendar, profile, settings. Everything writes to the local
Postgres database (`npx supabase studio` — or the Studio URL `start` also
prints — gives you a GUI to inspect it). AI features will show "AI isn't
configured yet" until you also add a real `ANTHROPIC_API_KEY` to
`.env.local` and restart the dev server.

When you're done, `npx supabase stop` shuts the local stack down.

## Setup — using your own cloud Supabase project instead

Use this if you want a persistent backend you can share with others, or
don't want to run Docker locally.

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

3. **Apply the database schema** to your Supabase project. The Supabase CLI
   is set up in this repo (`supabase/config.toml`), so the easiest way is
   `npx supabase link --project-ref <your-project-ref>` once, then
   `npx supabase db push` to apply every migration in
   `supabase/migrations/`. See `supabase/README.md` for that, plus a
   manual (copy-paste into the SQL Editor) fallback if you'd rather not
   link the CLI to your project. This step is required before any
   auth-gated page or database feature will work.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

5. **Before committing any change**, verify:
   ```bash
   npm run type-check
   npm run lint
   npm test
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
├── tests/unit/                # Vitest unit tests for pure logic — see tests/README.md
├── vitest.config.ts
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
- Only a first slice of automated tests exists (`npm test`): pure-logic unit
  tests, no Server Action/integration/E2E coverage yet — see
  `tests/README.md` and `FEATURE_STATUS.md`.
- The Dashboard's "Progress" card is a static placeholder, not wired to real
  data (the "Upcoming Deadlines" card was fixed and now queries real tasks)
  — see `FEATURE_STATUS.md`.
