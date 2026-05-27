---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/HTTP Request - Send to #github-commits
line: 1
severity: medium
author: claude-code
provider_ref:
---

# Issue 005: HTTP Request nodes have no retry; documented 429 handling absent

## Review Comment

All four outbound nodes (`HTTP Request - Send to #github-commits`,
`#github-pull-requests`, `#github-releases`, `#github-actions`) are configured
with default error handling: no `retryOnFail`, no `onError`. n8n's HTTP Request
node does **not** retry automatically.

This contradicts what the design relies on:

- TechSpec API Endpoints: "429 — rate limited; honor `Retry-After`. MVP relies on
  n8n's default retry behavior."
- ADR-004 risk mitigation: "HTTP Request already retries on 429 by default."

Both statements are incorrect — there is no default retry. A transient Discord
`429` (30 req/min per webhook, a real risk once 2–3 repos are connected) or a
`5xx` will throw, route to `WF-ERR Global`, and the message is lost rather than
re-sent. For `push` fanout (one POST per commit) a burst can hit the limit
quickly.

Suggested fix: enable `retryOnFail: true` with a sensible `maxTries`/`waitBetween`
on the four nodes, and/or honor `Retry-After` on 429. Then correct the TechSpec /
ADR-004 wording so the documented behavior matches the configuration.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied: all four outbound HTTP Request nodes (`#github-commits`,
    `#github-pull-requests`, `#github-releases`, `#github-actions`) now carry
    `retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 1500`. Persisted in
    workflow v28 and confirmed by get_workflow(full). The four
    "HTTP Request node without error handling" validator warnings cleared
    (warningCount 16 → 12).
  - Follow-up not done in this round: explicit `Retry-After` parsing for 429s
    (n8n's built-in retry uses fixed waits). TechSpec wording correction is
    left for a doc pass.
