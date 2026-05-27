# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- Discord guild `1402242287110590596` now has category `🔗 GITHUB` id `1509246632514814134` at position 2 and category `🤖 AUTOMAÇÕES` id `1509246652781821972` at position 3.
- Task 2 created the eight Discord text channels needed for webhook setup:
  - `github-teste` `1509247712166416566`
  - `github-commits` `1509247713827622962`
  - `github-pull-requests` `1509247715140174075`
  - `github-releases` `1509247716213919929`
  - `github-actions` `1509247717627658412`
  - `n8n-logs` `1509247719842250864`
  - `deploys` `1509247721851326515`
  - `erros-producao` `1509247723701014649`
- Client-facing role `Clientes` id `1407449603485470881` has `View Channel` denied on the `🔗 GITHUB` and `🤖 AUTOMAÇÕES` categories and their synced child channels.
- n8n workflow `WF-GH-Discord` id `mtRu7rZlq0p5GJ6G`, inactive, version 23. Phase 2 structure is in place:
  - `Code - Format Push` → `$vars.DISCORD_WH_COMMITS` → `HTTP Request - Send to #github-commits`
  - `Code - Format PR` → `$vars.DISCORD_WH_PRS` → `HTTP Request - Send to #github-pull-requests`
  - `Code - Format Release` → `$vars.DISCORD_WH_RELEASES` → `HTTP Request - Send to #github-releases`
  - `Code - Format Action` → `$vars.DISCORD_WH_ACTIONS` → `HTTP Request - Send to #github-actions`
  - `HTTP Request - Send to #github-teste` node removed (n8n disallows disconnected nodes); Discord channel and `$vars.DISCORD_WH_TESTE` preserved.
- Workflow validates with 0 errors. E2E and runtime pin-data blocked until `$vars` are populated in n8n UI and workflow is activated.

## Shared Decisions

## Shared Learnings
- When connecting n8n Switch branches through `n8n_update_partial_workflow`, use `case: N` for the desired `main[N]` output. `sourceOutputIndex`/`outputIndex` did not target the expected branch in task_08.
- n8n rejects saving a workflow with any disconnected node — even disabled ones. When rewiring, always remove old connections AND add new connections in the same atomic call. Adding nodes without connecting them in the same batch will fail validation.

## Open Risks
- `@dev-alerts` still requires manual Discord UI creation and a copied numeric role ID before task_04 can populate `$vars.DEV_ALERTS_ROLE_ID`.
- n8n currently rejects `/api/v1/variables` with HTTP 403 (`feat:variables` not licensed), so tasks depending on `$vars.*` cannot complete until Variables are enabled/licensed or the PRD/TechSpec is amended to use a supported secret store such as credentials.
- `n8n_test_workflow` requires a workflow to be active for webhook triggering; task_05 requires `WF-GH-Discord` to remain inactive until task_10, so automated webhook integration tests are blocked unless a later task permits activation or manual UI execution.

## Handoffs
