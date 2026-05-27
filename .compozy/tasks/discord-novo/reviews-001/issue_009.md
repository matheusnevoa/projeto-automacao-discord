---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/Code - Format PR
line: 18
severity: low
author: claude-code
provider_ref:
---

# Issue 009: Dead 'submitted' branch in Format PR

## Review Comment

`Code - Format PR` maps `action === 'submitted'` to "Review submetido":

```js
if (action === 'submitted') {
  return 'Review submetido';
}
```

`submitted` is an action of the `pull_request_review` event, not `pull_request`.
The Switch only routes the `pull_request` event into this node, and the GitHub
webhook subscription (TechSpec Integration Points) does not include
`pull_request_review`, so this branch can never execute. The PRD F1 reference to
"reviewed" PRs would require subscribing to and routing the
`pull_request_review` event.

Suggested fix: either remove the dead `submitted` branch to avoid implying
unsupported behavior, or, if review notifications are desired, add a
`pull_request_review` case to the webhook subscription and the Switch and route it
here. Low severity — no runtime impact, just misleading code.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied: dead `submitted` branch removed from `Code - Format PR` and
    replaced by an inline comment explaining why it was unreachable (citing
    review round 1, issue 009). Same change mirrored in
    `tests/code-format-pr.test.mjs`; a regression test now asserts
    `action=submitted` is filtered out.
  - Adding `pull_request_review` support requires a webhook-subscription and
    Switch-routing change — explicitly out of scope for this round.
