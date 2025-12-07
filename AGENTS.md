# Repository Guidelines

## Project Structure & Module Organization
ryact-utils is a pnpm workspace: reusable libraries live in `packages/*` and runnable demos under `apps/*`. Each package mirrors the same layout—TypeScript sources in `src/`, generated bundles in `dist/`, and per-package configs (`tsconfig.json`, `vite.config.ts`, `eslint.config.ts`). The `packages/state` module ships the pane store API via `src/index.ts` and `src/react.ts`, so add new exports there and re-run the build before publishing. Shared workspace configuration sits at the repo root (`pnpm-workspace.yaml`, `publish-packages.sh`) and should not be package-specific.

## Build, Test, and Development Commands
- `pnpm install`: install all workspace dependencies (run from repo root).
- `pnpm --filter @ryact-utils/pane build`: type-check with `tsc` and emit both ESM and declaration bundles via Vite.
- `pnpm --filter @ryact-utils/pane preview`: serve the latest build with Vite’s preview server for manual verification.
- `pnpm exec eslint packages/state/src --max-warnings=0`: lint the state package using the shared flat config.
- `pnpm --filter @ryact-utils/attempt test` / `test:watch`: reference Vitest usage; mirror that setup when introducing tests for other packages.

## Coding Style & Naming Conventions
Write TypeScript modules with tab indentation, double quotes inside JSON, and named exports for public APIs. Follow the ESLint flat config plus TypeScript-ESLint and `eslint-plugin-react` recommendations; prefer hooks and derived selectors inside `src/react.ts`. Run `pnpm exec prettier --check .` before committing, and name files with kebab-case (e.g., `external-store.ts`).

## Testing Guidelines
Vitest is the preferred runner (`test`/`test:watch` scripts in existing packages). Place `.test.ts` files next to the unit they verify or inside `src/__tests__`. Cover the store snapshot lifecycle (creation, subscription, notification) and any React bindings; target high-level behavior rather than implementation. Add regression cases referencing issue numbers when bugs are fixed.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit pattern (`feat:`, `fix:`, `docs:`, etc.) visible in `git log`. Keep commits focused on one logical change and include workspace filters in the body when relevant (`affects: packages/state`). Pull requests should summarize the change, describe testing performed (`pnpm --filter @ryact-utils/pane build`, `pnpm vitest`), and link issues or screenshots when updating demos. Await CI/preview success before requesting review.

## Security & Publishing Tips
Environment secrets are not stored in the repo; configure them locally when running demo apps. Use `publish-packages.sh` to release—ensure `pnpm --filter ... build` has been executed and the `dist/` folder matches the exported surface before tagging.
