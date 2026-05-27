---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/settings
line: 0
severity: medium
author: claude-code
provider_ref:
---

# Issue 006: Discord webhook URLs persisted in execution data

## Review Comment

Each formatter resolves the secret Discord channel webhook URL into
`json.targetChannelUrl`, and the workflow settings are:

```json
"saveDataSuccessExecution": "all",
"saveDataErrorExecution": "all",
"saveExecutionProgress": true
```

With these settings n8n stores the full item JSON of every node for every
execution — including the resolved `targetChannelUrl` (a full
`https://discord.com/api/webhooks/<id>/<token>` URL) and the rendered
`discordPayload`. The PRD treats Discord webhook URLs as secrets ("All webhook
URLs … must not appear in any committed file or shared transcript", and
TechSpec: "stored only in n8n Variables, never in workflow JSON"). Persisting the
resolved URL in execution history reintroduces the secret into a readable store
and, on error, copies it into `WF-ERR Global` (Airtable + email) as well —
defeating the `$vars` indirection chosen in ADR-004/005.

Suggested fix: avoid carrying the raw URL through item data — read
`$vars.DISCORD_WH_*` directly in the HTTP Request node's URL field instead of via
`{{$json.targetChannelUrl}}`, or set `saveDataSuccessExecution` to `none`/limit
retention and ensure error payloads redact the URL. Anyone who can compromise a
single token can post into that channel.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied (lighter fix): workflow settings now
    `saveDataSuccessExecution: "none"`, `saveExecutionProgress: false`,
    `saveDataErrorExecution: "all"` (kept for debuggability). Persisted in v28.
    Success executions no longer persist the resolved Discord webhook URL.
  - Residual exposure on error executions is intentional and accepted for now
    (debuggability beats redaction while the pipeline is being stabilised).
    Logged as a follow-up: redact `targetChannelUrl` in error payloads or move
    URL resolution into the HTTP Request URL expression so it is never carried
    in item data. Defer until a Phase 2 hardening pass.
