---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/Code - Format Action
line: 7
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: deployment_status posts to #github-actions, not #deploys

## Review Comment

`deployment_status` events are routed (Switch output 4) into `Code - Format
Action`, which sets `targetChannelUrl = $vars.DISCORD_WH_ACTIONS` for both
`workflow_run` and `deployment_status`. As a result deployment notifications land
in `#github-actions`, and `$vars.DISCORD_WH_DEPLOYS` / the `#deploys` channel
created in task_02 receive nothing.

PRD F2 explicitly defines `#deploys` as the destination for deployment-related
notifications "initially tied to GitHub `deployment_status`". The implementation
follows the contradictory TechSpec component-table note ("#github-actions —
workflow_run, deployment_status…") instead. This is an unresolved spec conflict
that ships engineering deploy events to the wrong channel and leaves a created
channel + variable dead.

Suggested fix: in the `deployment_status` branch set
`targetChannelUrl = $vars.DISCORD_WH_DEPLOYS` (keep failure mention logic), and
reconcile the PRD vs TechSpec wording so the intended routing is unambiguous. If
the team genuinely wants deploys under `#github-actions`, update PRD F2 and
remove the unused `DISCORD_WH_DEPLOYS` variable instead.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied: `targetChannelUrl` is now assigned inside each event-type branch
    in `Code - Format Action` — `workflow_run` → `$vars.DISCORD_WH_ACTIONS`,
    `deployment_status` → `$vars.DISCORD_WH_DEPLOYS`. Failure-mention logic
    unchanged. Comment in node body cites PRD F1/F2.
  - Mirrored in `tests/code-format-action.test.mjs`; the test default `vars`
    block now exposes both URLs, and two new regression tests assert
    workflow_run → ACTIONS URL and deployment_status → DEPLOYS URL.
