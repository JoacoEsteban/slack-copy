# Repository Guidelines

## Project Structure & Module Organization
- `popup.tsx` renders the extension popup UI; bells and whistles should live here rather than in content scripts.
- `contents/` hosts Slack DOM helpers (`copy-button.ts`, `observer.ts`, etc.) that inject buttons into message rows. Keep each module scoped to one responsibility and export pure helpers for reuse.
- `assets/` stores static metadata and icons referenced by the manifest.
- `build/` contains dev or production bundles produced by Plasmo; never edit files here directly.
- `tsconfig.json`, `package.json`, and `pnpm-lock.yaml` define the TypeScript surface, dependencies, and reproducible builds.

## Build, Test, and Development Commands
- `pnpm dev` (or `npm run dev`) launches `plasmo dev`, producing hot-reloaded bundles under `build/<browser>-mv3-dev` for manual Slack testing.
- `pnpm build` creates optimized artifacts in `build/<browser>-mv3-prod`; run this before packaging or publishing.
- `pnpm package` wraps the latest production build into distro-ready archives inside `build/*.zip`.

## Coding Style & Naming Conventions
- TypeScript + React with functional components only; prefer hooks over classes.
- Follow Prettier defaults plus `@ianvs/prettier-plugin-sort-imports` for grouped, alphabetized import blocks. Run `pnpm prettier --write` before committing if you add a script.
- Use 2-space indentation, camelCase for variables/functions, PascalCase for React components, and dash-case for filenames inside `contents/`.
- Keep content scripts side-effect free on import; expose an `init` or `mount` entry to simplify testing.

## Testing Guidelines
- There is no automated suite yet. Add Vitest or Playwright-based checks when touching complex DOM logic.
- Name test files `<module>.test.ts` beside the implementation and stub Slack DOM nodes rather than hitting the network.
- Always perform manual verification in a Slack workspace covering hover state, copy confirmation, and clipboard writes.

## Commit & Pull Request Guidelines
- Follow the existing Conventional Commit style observed in history (`feat:`, `chore:`, etc.) so changelogs stay parseable.
- Scope PRs narrowly, include a short summary, reproduction steps, and screenshots/GIFs when UI changes are involved.
- Link related issues, call out any manifest or permission changes, and describe manual test coverage in the PR body.

## Security & Configuration Notes
- The manifest currently requests `clipboardWrite` plus `https://*.slack.com/*`; justify any new permissions explicitly in PR descriptions.
- Store API keys or workspace secrets in browser storage, not source control, and document any required env vars in `README.md`.
