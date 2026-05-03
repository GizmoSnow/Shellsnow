# Agent Instructions for Success Roadmap Builder

## What this repository is

- A frontend-first Vite + React + TypeScript application.
- Uses Tailwind CSS for styling and Supabase for authentication and data persistence.
- No separate backend service code is present in this repository; all app logic runs in the browser and talks directly to Supabase.
- Main app code is under `src/`; routing and page composition are in `src/App.tsx` and `src/pages/`.
- Import staging and roadmap transformation logic live in `src/pages/ImportStagingPage.tsx` and `src/lib/import-*`.

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
- `src/pages/` – page-level screens such as `Dashboard`, `Login`, `RoadmapBuilder`, `ImportStagingPage`, `ImportWorkspace`
- `src/components/` – reusable UI components like modals, grid, and import workflow helpers
- `src/lib/supabase.ts` – Supabase client, auth helpers, and roadmap type definitions
- `src/lib/import-*` – import adapter, staging, normalization, validation, and execution logic
- `supabase/migrations/` – database schema and RLS migration history

## Project conventions and behavior

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required at runtime.
- Supabase client initialization in `src/lib/supabase.ts` throws if env vars are missing.
- The app is client-side only; do not introduce a separate backend service.
- Roadmap state is stored as JSON inside `roadmaps` rows.
- Most data operations are handled through Supabase and browser state.
- Avoid breaking page-level data loading or auth flows when updating import logic.

## Import workflow guidance

- The import staging UI is in `src/pages/ImportStagingPage.tsx`.
- Candidate normalization and validation logic is spread across `src/lib/import-*`.
- Data can be imported into roadmap goals, initiatives, or account-level spanning activities.
- Preserve the existing goal/initiative and account-spanning semantics when modifying import behavior.

## What to prioritize when modifying code

- Preserve Supabase config and auth flow.
- Respect type definitions in `src/lib/supabase.ts` and import candidate shapes in `src/lib/import-types.ts`.
- Prefer existing UI boundaries: `src/pages/`, `src/components/`, `src/lib/`.
- When refactoring, favor minimal changes to avoid altering import or roadmap state semantics.

## When in doubt

- Check `README.md` for setup instructions and feature expectations.
- Review `supabase/migrations/` for database structure and RLS policy changes.
- Use `npm run lint` and `npm run typecheck` to verify code quality and type safety.
