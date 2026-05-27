# Task Memory: task_12.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Promote WF-GH-Discord Phase 1 (single `#github-teste` channel) to Phase 2 (4 dedicated channels). Update formatter `targetChannelUrl` vars and add 4 dedicated HTTP Request nodes.

## Important Decisions

- **Removed `HTTP Request - Send to #github-teste` node**: n8n validation rejects disconnected nodes even when disabled. Keeping it with no incoming connections is impossible. Deviation from SHOULD requirement: the Discord channel `#github-teste` and `$vars.DISCORD_WH_TESTE` remain intact as the misrouting fallback; only the n8n node was removed.
- Batched all 17 operations into a single atomic `n8n_update_partial_workflow` call after two failed partial attempts (adding nodes before connections existed caused disconnected-node validation errors).

## Learnings

- n8n forbids saving a workflow with any disconnected node — including disabled nodes. addNode + rewire must be done atomically in one call that simultaneously removes old connections and adds new ones.
- `disableNode` does NOT bypass the disconnected-node validation error.

## Files / Surfaces

- n8n workflow `WF-GH-Discord` id `mtRu7rZlq0p5GJ6G` — updated, version 23
- 4 new nodes added: `http_send_github_commits`, `http_send_github_pull_requests`, `http_send_github_releases`, `http_send_github_actions`
- 1 node removed: `http_send_github_teste`
- 4 Code formatter nodes patched (jsCode field — `targetChannelUrl` variable name only)

## Errors / Corrections

- First batch attempt: added nodes without connections → validation rejected (disconnected nodes)
- Second attempt: added disableNode → still rejected
- Third attempt: added removeNode + all connections in one atomic batch → saved ✓

## Ready for Next Run

- Runtime pin-data tests and E2E blocked until `$vars` (DISCORD_WH_COMMITS/PRS/RELEASES/ACTIONS) are populated in n8n UI and workflow is activated
- Same blocker carried forward from task_11 (feat:variables 403 via MCP API)
- Implementation is structurally complete and validates with 0 errors
