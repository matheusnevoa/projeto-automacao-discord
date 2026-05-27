---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/Code - Format Action
line: 30
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Failure detection only matches conclusion=='failure'

## Review Comment

`Code - Format Action` classifies a `workflow_run` as failed only when
`run.conclusion === 'failure'`:

```js
function actionStatus(conclusion) {
  if (conclusion === 'failure') {
    return { label: 'Failure', failed: true };
  }
  return { label: conclusion || 'success', failed: false };
}
```

GitHub `workflow_run.conclusion` also includes `timed_out` and `startup_failure`
(and `cancelled`), which are genuine failures. With the current logic a CI run
that times out or fails to start is rendered with the green success color
(`0x2ecc71`) and does **not** mention `<@&dev-alerts>`. This violates PRD Goal
"Awareness on failure" and the F5 rule "GitHub Action: @dev-alerts if failure",
and undermines the Signal-quality success metric (on-call misses real failures).

Suggested fix: treat the failing conclusions as failure explicitly:

```js
const FAILED = new Set(['failure', 'timed_out', 'startup_failure']);
function actionStatus(conclusion) {
  return FAILED.has(conclusion)
    ? { label: conclusion, failed: true }
    : { label: conclusion || 'success', failed: false };
}
```

Decide deliberately whether `cancelled` should ping (usually not) and document
the choice.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied: `Code - Format Action` introduces
    `const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out',
    'startup_failure'])` and `actionStatus()` checks set membership.
    `cancelled` deliberately stays non-failed (documented in node comment).
  - Mirrored in `tests/code-format-action.test.mjs` and covered by three new
    regression tests: timed_out → red+mention, startup_failure → red+mention,
    cancelled → green+no mention. All 34 tests pass.
