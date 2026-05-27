# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Populate exactly 10 n8n Variables for the GitHub-to-Discord pipeline: `GITHUB_WEBHOOK_SECRET`, `DEV_ALERTS_ROLE_ID`, and the eight `DISCORD_WH_*` URLs, then validate them through a disposable n8n workflow.
- Current task is blocked before implementation because required dependency outputs are unavailable and n8n Variables are not enabled on the instance.

## Important Decisions
- Do not implement the TechSpec's credentials fallback silently. `task_04` requires exact `$vars.*` names, and downstream tasks explicitly read `$vars.*`; changing storage would require a PRD/TechSpec/ADR amendment first.

## Learnings
- `task_01` memory says the `@dev-alerts` role still requires manual Discord UI creation and role ID capture before `DEV_ALERTS_ROLE_ID` can be populated.
- `task_03` memory says the eight webhook URLs created in that run were delivery-tested and then deleted because no supported n8n Variables target existed for secure handoff; those URLs must not be reused.
- Available n8n MCP tools expose workflows, credentials, executions, validation, and workflow versions, but no Variables CRUD surface. Prior direct `/api/v1/variables` access returned HTTP 403 for missing `feat:variables`.
- A URL-safe `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='` secret generation path produces 43 characters, satisfying the >=32 character requirement when the task is unblocked.

## Files / Surfaces
- Read PRD/TechSpec/ADRs and task files under `.compozy/tasks/discord-novo`.
- Read workflow memory files: `.compozy/tasks/discord-novo/memory/MEMORY.md`, `task_01.md`, `task_03.md`, and `task_04.md`.

## Errors / Corrections
- `rg` is unavailable in this environment; used `find`, `grep`, and `sed` fallbacks.
- `.git` exists as an empty directory, but `git status`/`rev-parse` fail, so normal Git diff status is unavailable.

## Ready for Next Run
- Unblockers: create `@dev-alerts` manually and capture its numeric role ID; enable/license n8n Variables or formally amend the TechSpec/ADR to a supported secret store; recreate the eight Discord channel webhooks and transfer their fresh URLs directly into the chosen secure store.
- After Variables are available, create the 10 entries in Settings -> Variables, validate every value is non-empty in the UI, run the disposable `test-vars` workflow checks, delete the disposable workflow, then update task tracking.
