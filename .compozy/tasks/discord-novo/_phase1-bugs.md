# Phase 1 Bugs / Blockers

## Open

- **BLOCKER: `WF-GH-Discord` is not active for Phase 1 E2E.**
  - Evidence: n8n workflow `mtRu7rZlq0p5GJ6G` returned `active: false`, `activeVersionId: null`, `triggerCount: 0`, and no executions.
  - Impact: GitHub webhook deliveries cannot produce the required 200/204 acceptance responses or Discord messages.
  - Required before task_11: complete the unresolved task_10 activation gate after true runtime configuration and pin/manual tests pass.

- **BLOCKER: Phase 1 runtime secrets/config are not confirmed available in n8n.**
  - Evidence: workflow formatters and HMAC verifier depend on `$vars.GITHUB_WEBHOOK_SECRET`, `$vars.DISCORD_WH_TESTE`, and `$vars.DEV_ALERTS_ROLE_ID`; prior task memory says n8n Variables API is blocked by `feat:variables` licensing and fresh Discord webhook URLs were deleted after rollback.
  - Impact: even if the workflow were activated, HMAC verification and Discord posting would fail or emit failure messages without the required role mention.
  - Required before task_11: enable/license n8n Variables or formally amend the TechSpec/ADR to a supported secure store, recreate fresh Discord channel webhooks, and store `DEV_ALERTS_ROLE_ID` plus `GITHUB_WEBHOOK_SECRET`.

## Candidate Test Repo

- `matheusnevoa/foguete-fs`
  - `viewerPermission=ADMIN`
  - default branch `main`
  - no existing webhooks returned by GitHub API at baseline
