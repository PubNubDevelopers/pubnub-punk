# Repository Guidelines

## Project Structure & Module Organization
Core TypeScript/React UI lives under `src/`, with route-level views in `src/pages` and composable UI in `src/components`. Shared logic sits in `src/lib` and `src/utils`, reusable hooks in `src/hooks`, and providers in `src/contexts`. Legacy Playwright suites remain parked in `tests/` for reference but are not actively maintained; new specs should live alongside source modules. Build artefacts land in `dist/`, and deeper architecture notes are collected in `architecture_docs/`.

## Build, Test, and Development Commands
- `npm run dev` — Starts the Vite dev server on `http://localhost:5173` for iterative UI work.
- `npm run build` — Generates the production bundle in `dist/`; run when validating a release candidate.
- `npm run preview` — Serves the built app locally to sanity-check production output.
- `npm run check` — Runs `tsc` for static type validation; fix any reported issues before merging.
- `npm test`, `npm run test:coverage` — Execute Vitest-based suites and coverage passes. Playwright commands (`npm run test:e2e*`) exist but are deprecated and should only be used when reviving end-to-end coverage.

## Coding Style & Naming Conventions
React components prefer functional patterns with TypeScript types and a two-space indent matching existing files. Exported components use `PascalCase` names, file names follow kebab-case (for example, `app-shell.tsx`), and module imports rely on the `@/` alias defined in `tsconfig.json`. Tailwind CSS powers styling; compose utility classes deliberately and consolidate shared variants under `src/components/ui`.

## Testing Guidelines
Vitest is the source of truth for automated coverage. Add or update `*.spec.ts` files near the modules they validate, and re-run `npm run test:coverage` when touching shared logic to confirm regressions surface early. Playwright suites in `tests/` are currently dormant; feel free to rework or remove them when rewriting flows, and document any revived scenarios in the same directory.

## Commit & Pull Request Guidelines
Follow the conventional commit style already in the log (`feat(pubsub): …`, `refactor(...)`) so automated tooling stays coherent. Because the tool has not shipped to production, breaking changes are acceptable—just call them out prominently in the PR description and document any migration steps. For each PR, outline the user-facing impact, note the commands you ran (even when tests are skipped), link supporting issues, and attach screenshots or recordings for visual updates.

## Configuration & Secrets
The repository no longer relies on `secrets.sh`; treat it as historical and avoid committing secrets there or elsewhere. Manage temporary credentials through local `.env` files added to `.gitignore`, and scrub real PubNub or AI keys before syncing. Keep exploratory notes in `local_files/` light and free of customer data, and when introducing new configuration toggles, document defaults in `README.md` to keep fresh installs operable without private keys.
