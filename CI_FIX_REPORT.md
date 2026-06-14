CI Fix Report
==============

Workflows modified:
- .github/workflows/playwright.yml
- .github/workflows/deploy-web.yml

Root cause:
- CI failures reported: "Unable to locate executable file: pnpm". Investigation showed pnpm was being used before it was reliably installed/available in the runner PATH in some workflow runs.
- Workflows relied solely on `actions/setup-node` caching or had pnpm setup after some pnpm commands or without explicit verification.

Fixes applied:
1. Ensure `pnpm/action-setup@v4` is invoked before any pnpm commands in workflows.
   - Added an explicit `Install pnpm` step early in the workflows.
   - Added `Verify pnpm` step (`pnpm -v`) immediately after to confirm availability.
2. Keep `actions/setup-node@v4` to configure Node and enable pnpm caching.
   - `setup-node` kept with `cache: 'pnpm'` and `cache-dependency-path: pnpm-lock.yaml` where present.
3. Added an explicit restore of the pnpm store using `actions/cache@v4` for faster installs and stronger caching.
   - Cache key: `${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}`
   - Path: `~/.pnpm-store`
4. Verified `pnpm install --frozen-lockfile` remains the dependency install step and happens after setup steps.
5. Ensured Playwright workflow order is stable and includes artifact upload step after tests.

Files changed (high level):
- `playwright.yml`: moved/added pnpm setup and verification, added pnpm store cache restore, ensured setup-node remains with pnpm cache config.
- `deploy-web.yml`: added pnpm verification and pnpm store cache restore.

Final workflow sequence (applies to modified workflows)
1. Checkout repository (`actions/checkout@v4`)
2. Install pnpm (`pnpm/action-setup@v4`)
3. Verify pnpm availability (`pnpm -v`)
4. Setup Node.js (`actions/setup-node@v4` with `cache: 'pnpm'`)
5. Restore pnpm store cache (`actions/cache@v4` for `~/.pnpm-store`)
6. `pnpm install --frozen-lockfile`
7. Build (if applicable)
8. Run tests (Playwright e2e)
9. Upload artifacts / deploy steps

Notes & recommendations:
- The `pnpm/action-setup` action may assume Node runtime is present; in most cases installing pnpm early then running `actions/setup-node` works, but if your runner requires Node first (older runners), you can swap steps. The sequence above follows the requested ordering and includes a verification step to avoid "pnpm not found" failures.
- Keep `cache-dependency-path` pointing to `pnpm-lock.yaml` to ensure cache invalidation when lockfile changes.
- Optionally add a step to run `pnpm -v` and `node -v` as a quick sanity check in other workflows.
- If your monorepo uses a custom pnpm store location, update the cache `path` accordingly.

If you want, I can:
- Push these workflow changes and open a PR (requires remote permission).
- Run a local validation script to lint the YAML files.
- Add an additional workflow-level step to explicitly run `corepack enable && corepack prepare pnpm@latest --activate` as an alternative pnpm setup.

End of report.
