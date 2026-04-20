# Agent Instructions for Success Roadmap Builder

## What this repository is

- A frontend-first Vite + React + TypeScript application.
- Uses Tailwind CSS for styling and Supabase for authentication and data persistence.
- No separate backend service code is present in this repository; all app logic runs in the browser and talks directly to Supabase.
- Main app code is under `src/`; routing and page composition are in `src/App.tsx` and `src/pages/`.

## Key commands

- `npm install` – install dependencies
- `npm run dev` – run development server
- `npm run build` – build production bundle
- `npm run lint` – run ESLint across the repo
- `npm run typecheck` – run `tsc --noEmit` using `tsconfig.app.json`

## Important files and directories

- `README.md` – setup and feature overview
- `package.json` – scripts and dependencies
- `src/main.tsx` – app bootstrap
- `src/App.tsx` – top-level app with `AuthProvider`, `ThemeProvider`, and router logic
- `src/contexts/` – auth and theme providers
- `src/pages/` – page-level screens like `Dashboard`, `Login`, `RoadmapBuilder`, and import workflows
- `src/lib/supabase.ts` – Supabase client and roadmap type definitions
- `supabase/migrations/` – database schema and RLS migration history

## Project conventions and behavior

- Environment variables are required at runtime: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/lib/supabase.ts` explicitly throws when those env vars are missing.
- Routing is custom and based on pathname matching in `src/App.tsx`.
- Roadmap state is stored as JSON inside Supabase `roadmaps` rows.
- Authentication flows are handled client-side with Supabase Auth.

## What to prioritize when modifying code

- Keep Supabase config and auth flow intact when changing page or data loading logic.
- Preserve JSON roadmap data shapes defined in `src/lib/supabase.ts`; these types are relied on across the app.
- When refactoring UI, prefer existing `src/pages/`, `src/components/`, and `src/lib/` module boundaries.
- Avoid assumptions about a separate server—changes should reflect a frontend app with direct Supabase integration.

## When in doubt

- Check `README.md` for setup instructions and feature expectations.
- Review `supabase/migrations/` for database structure and security policy changes.
- Use `npm run lint` and `npm run typecheck` to verify code quality and type safety.
