# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Create inactive n8n workflow `WF-GH-Discord` with `Webhook` -> `Code - Verify HMAC` -> `Switch - Route by Event`, Error Workflow `9LyR0kYZIl6x8Dgk`, and record the generated webhook path/URL for task_11.

## Important Decisions
- Use Webhook `options.rawBody=true` so the HMAC node can verify GitHub's signature against the raw request body when available.
- The n8n API validator requires an explicit Webhook `path`; a UUID-style generated path was used instead of a semantic path. Do not activate the workflow before task_10.

## Learnings
- Shared workflow memory and `_tasks.md` show task_04 is still pending; shared memory says `/api/v1/variables` returned 403 (`feat:variables` not licensed). This may block runtime HMAC tests that require `$vars.GITHUB_WEBHOOK_SECRET`, but the workflow skeleton can still reference `$vars.GITHUB_WEBHOOK_SECRET`.
- n8n connector exposes workflow create/update/validate/test APIs but no variables management tool in the loaded n8n namespace.
- `n8n_test_workflow` cannot trigger the Webhook while the workflow is inactive; it returned `Workflow must be active to trigger via this method`. This conflicts with task_05's requirement to leave the workflow inactive until task_10, so integration execution evidence is blocked without manual UI execution or temporarily activating the workflow.

## Files / Surfaces
- n8n instance `n8n.futurestation.com.br`: target workflow `WF-GH-Discord`; existing Error Workflow id `9LyR0kYZIl6x8Dgk` is active and named `WF-ERR - Error Handler Global`.
- Created n8n workflow `WF-GH-Discord` id `mtRu7rZlq0p5GJ6G`, inactive, with Webhook path `d4c50ac1-1cca-455f-b8f0-94155443dea9`; production URL is `https://n8n.futurestation.com.br/webhook/d4c50ac1-1cca-455f-b8f0-94155443dea9`.

## Errors / Corrections
- Initial validation without a Webhook path failed with `Webhook path is required`; corrected by setting the generated UUID-style path.
- Runtime integration tests were not executed because the workflow must remain inactive and `$vars.GITHUB_WEBHOOK_SECRET` is not confirmed available due the task_04 variables blocker.

## Ready for Next Run
- Validated workflow structure: 3 enabled nodes, 2 valid connections, 0 validation errors, 3 expected warnings.
- Local HMAC harness using the same logic passed valid signature, tampered signature, and missing signature scenarios; this is not a substitute for required n8n pin-data tests.
