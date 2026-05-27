# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implement `Code - Format Release` in n8n workflow `WF-GH-Discord` so only `release.published` emits a Phase 1 Discord embed to `$vars.DISCORD_WH_TESTE`.

## Important Decisions
- Mirror existing `Code - Format PR`/`Push` pattern: formatter returns `{ targetChannelUrl, discordPayload }`, no HTTP Request wiring in this task.

## Learnings
- Current workflow draft has Switch output rules for `release`, `workflow_run`, and `deployment_status`, but only `push` and `pull_request` outputs were connected before this task.
- For Switch branch connections through `n8n_update_partial_workflow`, use `case: 2` for the third `main` output; `sourceOutputIndex`/`outputIndex` did not target the intended Switch branch.
- `n8n_test_workflow` cannot trigger `WF-GH-Discord` while inactive; the release integration test remains blocked until the workflow is allowed to activate or a manual UI execution is performed.

## Files / Surfaces
- n8n workflow `WF-GH-Discord` (`mtRu7rZlq0p5GJ6G`)
- Local tests under `tests/`

## Errors / Corrections
- Initial partial connection attempt attached `Code - Format Release` beside the `push` output. Corrected it by removing that connection and re-adding with `case: 2`, verified in workflow structure.

## Ready for Next Run
- `Code - Format Release` exists in the draft and Switch `main[2]` routes to it.
- Local unit coverage passes: `node --test --experimental-test-coverage tests/*.test.mjs` reports 16/16 tests passing and all-files branch coverage at 80.00%.
- Do not mark task complete until the required release integration test has been run in n8n/Phase 1 conditions.
