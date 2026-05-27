---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: valid
file: n8n/WF-GH-Discord/Code - Verify HMAC
line: 9
severity: medium
author: claude-code
provider_ref:
---

# Issue 004: #n8n-logs warning path unimplemented; HMAC rejects over-escalate

## Review Comment

The TechSpec "Log Events" section specifies that Phase 1 posts warning lines to
`#n8n-logs` (`WARN: HMAC_INVALID rejected delivery …`, `WARN: filtered event …`),
and ADR-005 step 5 says HMAC mismatches should surface as a `#n8n-logs` warning
rather than a hard error. The deployed workflow implements neither:

- `Code - Verify HMAC` calls `throw new Error('HMAC_INVALID')`. Because the
  workflow's Error Workflow is `WF-ERR Global` (id `9LyR0kYZIl6x8Dgk`), every
  rejected delivery is recorded in Airtable, emailed to the team, and posted to
  `#erros-producao`. The n8n trigger URL is internet-reachable, so any scanner or
  forged POST triggers a team email — alert fatigue and an amplification vector.
- Filtered events (the Switch `ignored` fallback, and formatter early-returns
  such as non-`completed` workflow_run or non-`published` release) vanish with no
  record at all. `$vars.DISCORD_WH_N8N_LOGS` is never referenced by any node.

Suggested fix: convert HMAC rejection and filtered-event cases into warnings
routed to `#n8n-logs` (e.g., an NoOp/Set + HTTP Request branch posting to
`$vars.DISCORD_WH_N8N_LOGS`) instead of throwing, and reserve `WF-ERR Global`
for genuine in-workflow exceptions (Discord 4xx/5xx, code errors). This restores
the specified observability and stops routine probes from paging the team.

## Triage

- Decision: `VALID — DEFERRED`
- Notes:
  - Confirmed: `Code - Verify HMAC` throws `HMAC_INVALID`, which routes to
    `WF-ERR Global` (Airtable + email + `#erros-producao`). No node references
    `$vars.DISCORD_WH_N8N_LOGS`. Behavior contradicts ADR-005 step 5 and the
    TechSpec "Log Events" section.
  - Remediation blocked by `_phase1-bugs.md` — n8n Variables API returns
    `403 feat:variables not licensed`, so `$vars.DISCORD_WH_N8N_LOGS` cannot
    be populated and a warning branch posting to `#n8n-logs` cannot be wired
    end-to-end yet.
  - Deferred to a follow-up after Variables licensing/credential fallback is
    decided. Status stays `valid` (not `resolved`) so the next round picks it
    up. This is intentional per the workflow run plan: "Defer 004".
