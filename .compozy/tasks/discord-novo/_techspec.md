# TechSpec: Discord + GitHub + n8n Automation for Future Station

## Executive Summary

`WF-GH-Discord` is a single n8n workflow on `n8n.futurestation.com.br` that ingests GitHub webhook deliveries, verifies their HMAC signature, routes each event by `x-github-event`, formats a Discord embed in JavaScript, and POSTs the payload to the matching Discord channel webhook URL using HTTP Request nodes. Channel URLs, the `@dev-alerts` role ID, and the GitHub webhook secret are stored as n8n Variables (`$vars.*`) instead of credentials, so rotation is a single-UI-edit. Pipeline exceptions route to the existing `WF-ERR Global` handler, which already records errors in Airtable and emails the team.

Primary technical trade-off: choosing one centralized workflow with per-event Code formatters keeps the entire pipeline auditable from a single place and aligns with the existing `WF-*` convention, at the cost of four small Code nodes that share helper logic by convention rather than by import.

## System Architecture

### Component Overview

| Component | Type | Status | Responsibility |
|---|---|---|---|
| `WF-GH-Discord` | n8n workflow | **new** | Webhook → HMAC verify → route by event → format embed → POST to Discord webhook |
| `WF-ERR Global` | n8n workflow | existing | Sink for any uncaught exception inside `WF-GH-Discord`; records to Airtable, emails team, posts to `#erros-producao` |
| `🔗 GITHUB` category | Discord category | **new** | Holds all GitHub-sourced channels |
| `🤖 AUTOMAÇÕES` category | Discord category | **new** | Holds operational channels (logs, deploys, production errors) |
| `#github-teste`, `#github-commits`, `#github-pull-requests`, `#github-releases`, `#github-actions` | Discord channels | **new** | Per-event-type destinations |
| `#n8n-logs`, `#deploys`, `#erros-producao` | Discord channels | **new** | Operational destinations |
| `@dev-alerts` | Discord role | **new** | Mentioned only on failure events |
| GitHub repository webhook | GitHub config | **new** | Sends `push`, `pull_request`, `release`, `workflow_run`, `deployment_status` events to the n8n endpoint |
| `$vars.DISCORD_WH_*`, `$vars.DEV_ALERTS_ROLE_ID`, `$vars.GITHUB_WEBHOOK_SECRET` | n8n Variables | **new** | Centralized configuration |

### Data Flow

```
GitHub repository
   └── webhook POST (HMAC signed) ──► n8n Webhook Trigger URL
                                             │
                                             ▼
                                ┌─ Code - Verify HMAC ─┐ (throws HMAC_INVALID on mismatch)
                                │                      │
                                └──────── on valid ────┘
                                             │
                                             ▼
                                       Switch on x-github-event
                                             │
            ┌──────────────┬──────────────┬──────────────┬──────────────┐
            ▼              ▼              ▼              ▼              ▼
   Code - Format Push  PR Format    Release Format  Action Format   (default: ignore)
   (1 item per commit) (1 item)      (1 item)        (1 item;
                                                     adds @dev-alerts
                                                     on failure)
            │              │              │              │
            ▼              ▼              ▼              ▼
   HTTP Request -    HTTP Request -  HTTP Request -  HTTP Request -
   Send to #commits  Send to #PRs    Send to #rel    Send to #actions
                     (POST Discord channel webhook URL with JSON body)
                                             │
                                             ▼
                                       Discord channel
```

Any uncaught exception inside any node propagates to `WF-ERR Global` (configured via the workflow's Error Workflow setting). Recoverable warnings (filtered events, HMAC mismatches) post a single line to `#n8n-logs`.

### External System Interactions

- **GitHub Webhooks**: outbound from GitHub, inbound to n8n. Authentication = HMAC-SHA256 over the raw body using `$vars.GITHUB_WEBHOOK_SECRET`.
- **Discord Webhooks API**: outbound from n8n to `https://discord.com/api/webhooks/{webhook.id}/{webhook.token}`. Authentication = the URL token itself.

## Implementation Design

### Core Interfaces

GitHub event item (shape produced by the n8n `Webhook` trigger):

```typescript
type GitHubWebhookItem = {
  headers: {
    'x-github-event': 'push' | 'pull_request' | 'release' | 'workflow_run' | 'deployment_status';
    'x-github-delivery': string;
    'x-hub-signature-256': string;
    'content-type': 'application/json';
  };
  body: {
    repository: { full_name: string; html_url: string; owner: { login: string } };
    sender: { login: string; avatar_url: string };
    // event-specific fields: commits[], pull_request, release, workflow_run, deployment_status
    [key: string]: unknown;
  };
};
```

Item produced by every `Code - Format <Event>` node and consumed by every HTTP Request node:

```typescript
type FormattedItem = {
  json: {
    targetChannelUrl: string;                    // resolved from $vars at format time
    discordPayload: DiscordWebhookExecuteBody;
  };
};

type DiscordWebhookExecuteBody = {
  username?: string;                              // "Future Station GitHub"
  avatar_url?: string;
  content?: string;                               // "<@&{ROLE_ID}>" only on failures
  embeds: DiscordEmbed[];                         // exactly one per item in MVP
};
```

Discord embed (subset relevant to MVP):

```typescript
type DiscordEmbed = {
  title: string;
  description?: string;
  url: string;
  color: number;                                  // 0x2ecc71 success, 0xe67e22 PR, 0x3498db release, 0xe74c3c failure
  fields: { name: string; value: string; inline?: boolean }[];
  author: { name: string; icon_url?: string };
  timestamp: string;                              // ISO 8601 from event payload
  footer?: { text: string };                      // short SHA or run id
};
```

### Data Models

Three classes of state matter to this pipeline. None of them live in a database in MVP.

**n8n Variables (single source of truth for configuration)**

| Name | Type | Source | Purpose |
|---|---|---|---|
| `GITHUB_WEBHOOK_SECRET` | string | manual | HMAC-SHA256 key shared with every connected GitHub repo |
| `DEV_ALERTS_ROLE_ID` | string | Discord (right-click role → Copy ID) | Used inside `Code - Format Action` to build `<@&...>` mention |
| `DISCORD_WH_TESTE` | string | Discord channel webhook URL | Destination during Phase 1 |
| `DISCORD_WH_COMMITS` | string | Discord channel webhook URL | Destination for `push` events from Phase 2 |
| `DISCORD_WH_PRS` | string | Discord channel webhook URL | Destination for `pull_request` |
| `DISCORD_WH_RELEASES` | string | Discord channel webhook URL | Destination for `release` |
| `DISCORD_WH_ACTIONS` | string | Discord channel webhook URL | Destination for `workflow_run` + `deployment_status` |
| `DISCORD_WH_N8N_LOGS` | string | Discord channel webhook URL | Destination for workflow warnings |
| `DISCORD_WH_DEPLOYS` | string | Discord channel webhook URL | Destination for deployment-related notices |
| `DISCORD_WH_ERROS_PRODUCAO` | string | Discord channel webhook URL | Destination for `WF-ERR Global` to post critical failures |

**In-flight data per execution**

The `GitHubWebhookItem` flows through the workflow without persistence. After formatting, the `FormattedItem` carries `targetChannelUrl` and `discordPayload`. Nothing is persisted between executions in MVP.

**Error sink data**

`WF-ERR Global` already persists every error in Airtable (table `Erros`) and sends an email. `WF-GH-Discord` reuses that path by setting its Error Workflow to `WF-ERR Global`. A future Phase 4 enhancement may add a row identifying the workflow source (`WF-GH-Discord`) so failures are filterable in Airtable.

### API Endpoints

Inbound (one endpoint, exposed by n8n):

| Method | Path | Auth | Used by |
|---|---|---|---|
| `POST` | `https://n8n.futurestation.com.br/webhook/<n8n-generated-path>` | HMAC-SHA256 header `x-hub-signature-256` (verified inside workflow) | Every connected GitHub repository |

Outbound (one Discord channel webhook URL per destination channel):

| Method | Pattern | Auth | Used by |
|---|---|---|---|
| `POST` | `https://discord.com/api/webhooks/<id>/<token>` | URL token | `WF-GH-Discord` HTTP Request nodes |

Outbound body (Discord's "Execute Webhook" API):

```json
{
  "username": "Future Station GitHub",
  "content": "<@&123456789012345678> 🚨 Deploy falhou",
  "embeds": [{
    "title": "future-station/app-flutter · main",
    "description": "Ajusta validação da tela de login",
    "url": "https://github.com/...",
    "color": 3066993,
    "fields": [
      {"name": "Autor", "value": "Matheus Névoa", "inline": true},
      {"name": "Commit", "value": "`abc1234`", "inline": true}
    ],
    "author": {"name": "matheusnevoa", "icon_url": "https://..."},
    "timestamp": "2026-05-27T13:42:11Z"
  }]
}
```

Response codes:

- `204 No Content` — success.
- `400` — payload schema invalid; treated as an exception, routed to `WF-ERR Global`.
- `429` — rate limited; honor `Retry-After`. MVP relies on n8n's default retry behavior; explicit backoff is deferred.

## Integration Points

### GitHub Webhooks

- Configured per repository (one webhook per repo, all pointing to the same n8n URL).
- Events selected: `push`, `pull_request`, `release`, `workflow_run`, `deployment_status`.
- Secret: same value across all repos, equal to `$vars.GITHUB_WEBHOOK_SECRET`.
- Content type: `application/json`.
- SSL verification: enabled.

### Discord Webhooks API

- One channel webhook URL per destination channel (8 total in MVP).
- Created via the Discord MCP (`mcp__discord__discord_create_webhook`) at category/channel setup time.
- URLs are sensitive — stored only in n8n Variables, never in workflow JSON.

### n8n Variables

- Read at runtime via `{{$vars.NAME}}` expressions inside Code nodes and HTTP Request URL fields.
- Edited in n8n Settings → Variables.
- Rotation: edit the variable; the next execution picks up the new value (no workflow redeploy).

### `WF-ERR Global` (existing)

- Linked via `WF-GH-Discord`'s "Settings → Error Workflow" pointing to workflow id `9LyR0kYZIl6x8Dgk`.
- Triggered automatically when any node throws.
- Writes a row to Airtable and emails the team; Phase 1 leaves this behavior untouched.

## Impact Analysis

| Component | Impact Type | Description and Risk | Required Action |
|---|---|---|---|
| `WF-GH-Discord` workflow | new | Sole new code artifact in n8n; isolated from other workflows. Risk: misconfigured node breaks the pipeline for every event. | Build incrementally, validate each event type with pinned-data execution before activating. |
| `WF-ERR Global` workflow | modified (settings only) | Becomes the Error Workflow target for `WF-GH-Discord`. No code change. Low risk. | Verify Airtable + email already work; no new fields required for MVP. |
| Discord categories `🔗 GITHUB` and `🤖 AUTOMAÇÕES` | new | Two new categories; permissions must be hidden from client-facing roles. Risk: misconfigured visibility leaks engineering activity to clients. | Set "View Channel" override = deny for any client role before posting any real event. |
| Discord channels (8 new) | new | Created via MCP. Each has one outbound webhook for the workflow to post to. Risk: a webhook URL leak lets anyone post into a channel. | Create webhooks last, copy URLs immediately into n8n Variables, do not paste into chat or logs. |
| Discord role `@dev-alerts` | new | Mentionable role; opt-in. MCP cannot create roles — manual creation via Discord UI. Risk: forgotten role ID breaks failure mentions. | Create role manually, copy ID into `$vars.DEV_ALERTS_ROLE_ID`. |
| GitHub repositories (test, then real) | modified (webhook config only) | Webhook added; existing repo code untouched. Risk: bad secret value blocks all events silently. | Verify HMAC in n8n logs the first delivery after attaching. |
| n8n Variables | new | 10 new variables. Risk: missing value yields `undefined` substitution in URLs. | Add all variables before activating the workflow. |
| Existing Discord channels and existing n8n workflows | untouched | Not modified, moved, or renamed. | Verify post-rollout that nothing in the existing list of 9 text and 5 voice channels was changed. |

## Testing Approach

### Unit Tests (per Code node, inside n8n)

n8n does not run unit tests in the traditional sense; the equivalent is the **"Execute Node" with pinned input data** workflow. Each Code node MUST be validated with at least one pinned input before the workflow is activated.

- **`Code - Verify HMAC`**: pin a known body + a precomputed signature using `$vars.GITHUB_WEBHOOK_SECRET`; assert pass. Then pin a body with a tampered signature; assert `HMAC_INVALID` throw.
- **`Code - Format Push`**: pin a `push` payload with three commits; assert three items emitted, each with a distinct `discordPayload.embeds[0].title` and short SHA.
- **`Code - Format PR`**: pin one `pull_request` payload with `action=opened`; assert one item with green color. Pin one with `action=closed, merged=true`; assert "Merged" status.
- **`Code - Format Release`**: pin one `release` payload with `action=published`; assert one item.
- **`Code - Format Action`**: pin a `workflow_run` payload with `conclusion=failure`; assert `content` contains `<@&{$vars.DEV_ALERTS_ROLE_ID}>` and red color. Pin one with `conclusion=success`; assert no mention and green color.

Mocking boundaries: every Code node receives a deterministic JSON via Pin Data, so no external mocks are needed.

### Integration Tests (end-to-end)

Done as part of the Phase 1 acceptance criteria documented in the PRD:

- One test repository configured with the n8n webhook + the shared HMAC secret.
- Manual test push to a sandbox branch → message lands in `#github-teste`.
- Manual test PR opened, then merged → two messages land.
- Manual test release (draft → publish) → one message lands.
- A deliberately-failing GitHub Action → one message lands with `<@&dev-alerts>` mention.

Environment dependencies for integration tests:

- The test GitHub repository must exist and grant the operator permission to add a webhook (`admin:repo_hook` on a personal token, or repo settings access).
- The Discord server must already have the new role and the new channels with webhooks; otherwise the test cannot validate role mentions.
- `n8n.futurestation.com.br` must be reachable from GitHub's IP ranges (it is, since other webhooks already work).

## Development Sequencing

### Build Order

1. **Create Discord role `@dev-alerts`** manually in the Discord UI (the MCP does not expose role creation). No dependencies. Copy the role ID.
2. **Create n8n Variables shells**: add empty entries for `GITHUB_WEBHOOK_SECRET`, `DEV_ALERTS_ROLE_ID`, and the eight `DISCORD_WH_*` variables in n8n Settings → Variables. Set `DEV_ALERTS_ROLE_ID` to the value from step 1 and `GITHUB_WEBHOOK_SECRET` to a freshly generated random string. Depends on step 1.
3. **Create the two Discord categories** (`🔗 GITHUB`, `🤖 AUTOMAÇÕES`) via `mcp__discord__discord_create_category`, ordered after the existing "Canais de Texto" and "Canais de Voz". No dependencies.
4. **Create the eight Discord channels** inside the new categories via `mcp__discord__discord_create_text_channel` (`#github-teste`, `#github-commits`, `#github-pull-requests`, `#github-releases`, `#github-actions`, `#n8n-logs`, `#deploys`, `#erros-producao`). Depends on step 3.
5. **Apply channel/category permissions**: deny "View Channel" to the client-facing role(s) on both new categories. Depends on step 3.
6. **Create one Discord channel webhook per channel** via `mcp__discord__discord_create_webhook`. Copy each URL into the matching `$vars.DISCORD_WH_*` immediately. Depends on steps 2 and 4.
7. **Create the `WF-GH-Discord` workflow skeleton in n8n**: Webhook Trigger node + Code - Verify HMAC node + Switch on `headers["x-github-event"]`. Leave the workflow **inactive**. Depends on step 2 (HMAC reads `$vars.GITHUB_WEBHOOK_SECRET`).
8. **Add `Code - Format Push` and the HTTP Request node `HTTP Request - Send to #github-teste`** (Phase 1: every event lands in `#github-teste`). Depends on steps 6 and 7.
9. **Pin-data unit-test each Code node** as described in Testing Approach. Depends on step 8.
10. **Set the workflow's Error Workflow to `WF-ERR Global`** in workflow settings. Depends on step 7.
11. **Add the remaining Code nodes** (`Code - Format PR`, `Code - Format Release`, `Code - Format Action`) and connect them to the same HTTP Request - Send to #github-teste during Phase 1. Depends on step 8.
12. **Activate the workflow**. Depends on steps 9 and 10.
13. **Configure the GitHub webhook on the chosen test repository**: URL = n8n trigger URL, content type JSON, secret = `$vars.GITHUB_WEBHOOK_SECRET`, events = push + pull_request + release + workflow_run + deployment_status. Depends on step 12.
14. **Trigger one test event of each type** (push, PR, release, failed Action) on the test repository and visually confirm formatting in `#github-teste`. Depends on step 13.
15. **(Phase 2)** Add four new HTTP Request nodes (`Send to #github-commits`, `Send to #github-pull-requests`, `Send to #github-releases`, `Send to #github-actions`) and rewire each Format node to its dedicated HTTP Request. Re-validate end-to-end. Depends on step 14.
16. **(Phase 3)** Connect the real Future Station repositories one at a time, using the same secret. Optionally archive or delete `#github-teste`. Depends on step 15.

### Technical Dependencies

- n8n instance reachable from GitHub's outbound webhook IPs (already true).
- Discord MCP (`mcp-discord`) authenticated with a bot that has Manage Channels and Manage Webhooks permissions in the Future Station server.
- An n8n user with permission to create workflows and edit Settings → Variables.
- A GitHub repository where the operator can attach a webhook (`admin:repo_hook` scope or repo-admin UI access).
- Bot member `claudinha#3001` already present in the Future Station server (verified during PRD discovery).

## Monitoring and Observability

### Key Metrics

- **Deliveries received** — count of executions of `WF-GH-Discord` per day (visible in n8n Executions UI).
- **HMAC rejections** — count of `HMAC_INVALID` throws per day (visible in n8n Executions + posted to `#n8n-logs`).
- **HTTP Request failures** — count of non-2xx responses from Discord per day (visible in n8n + posted to `#erros-producao` via `WF-ERR Global`).
- **Latency** — wall-clock time from webhook trigger to HTTP Request completion (visible per execution in n8n).

### Log Events

- Phase 1 logs the following warning lines to `#n8n-logs`:
  - `WARN: HMAC_INVALID rejected delivery {x-github-delivery}`
  - `WARN: filtered event {x-github-event} from {repository.full_name} (bot or excluded branch)`
- Phase 1 logs the following error lines to `#erros-producao` (via `WF-ERR Global`):
  - `ERROR: WF-GH-Discord exception {error.message} | delivery {x-github-delivery}`

### Alerting Thresholds

- Any single `HMAC_INVALID` → no automatic alert (informational); investigate manually.
- More than 3 `HMAC_INVALID` per hour → manually rotate the secret (possible leak).
- Any HTTP Request 4xx from Discord → automatic post to `#erros-producao` with `@dev-alerts` (handled by `Code - Format Action` if the event itself is a failure; otherwise by `WF-ERR Global`).
- Discord 429 sustained for more than one minute → manually add a Wait/Batch node (deferred from MVP).

## Technical Considerations

### Key Decisions

- **HTTP Request, not Discord node, for outbound** (see ADR-004). Rationale: stable embed + role-mention support; per-channel URLs map cleanly to per-channel `$vars`. Trade-off: maintain the embed JSON shape by hand.
- **n8n Variables, not Credentials, for webhook URLs and role ID**. Rationale: one UI to edit, supports many similarly-shaped values; n8n Variables are encrypted at rest like credentials. Trade-off: variables are global to the n8n instance, not workflow-scoped; readers of the n8n instance can see them — acceptable since the n8n admin boundary already protects credentials.
- **HMAC-SHA256 verification from Phase 1** (see ADR-005). Rationale: webhook URL is the only authentication otherwise; HMAC eliminates payload forgery risk. Trade-off: one extra Code node per execution.
- **One Code node per event type, not a single Code or per-branch Set** (see ADR-006). Rationale: per-event isolation, easy unit testing, matches `WF1`'s `Code - <Purpose>` convention. Trade-off: small helper duplication across four Code nodes.
- **`#n8n-logs` receives warnings only**. Rationale: the n8n native execution UI already shows full success traces; duplicating them in Discord would create noise. Trade-off: requires a small Switch branch in the formatter to decide whether to post a warning.
- **Phase 1 routes every event to `#github-teste`, not to dedicated channels**. Rationale: validate formatting against a single visual baseline before fanning out. Trade-off: a short period (Phase 1 only) where event-type channels exist but are empty.

### Known Risks

- **Discord MCP cannot create roles**. Likelihood: certain. Mitigation: step 1 of Build Order creates the role manually via the Discord UI; no automation depends on it being scripted.
- **Discord webhook rate limits (30/min per webhook)**. Likelihood: low for single-repo MVP; medium once 2–3 real repos are connected. Mitigation: HTTP Request already retries on 429 by default; explicit `Wait` node added in Phase 4 if sustained 429s appear.
- **GitHub retries on n8n timeout could duplicate deliveries**. Likelihood: low (n8n is fast). Mitigation: dedup via `x-github-delivery` is deferred per PRD Open Questions; revisit if observed.
- **Code node Node.js runtime variance across n8n versions**. Likelihood: low. Mitigation: write `Code - Verify HMAC` using only Node's `crypto` builtins, with a manual byte-compare fallback if `crypto.timingSafeEqual` is missing.
- **Misconfigured visibility leaks engineering activity to clients**. Likelihood: low if the Build Order step 5 is followed. Mitigation: Phase 1 acceptance criterion explicitly verifies both new categories are hidden from any non-team role before any real repository is connected.
- **`$vars` leak via workflow export**. Likelihood: low. Mitigation: variables are stored separately from workflow JSON in n8n; exported workflow files only reference them by name, not by value.

## Architecture Decision Records

- [ADR-001: n8n as Central Hub for GitHub → Discord Pipeline](adrs/adr-001.md) — Use one centralized n8n workflow instead of native Discord/GitHub webhooks or per-event modular workflows.
- [ADR-002: Minimal MVP Scope — Only GITHUB and AUTOMAÇÕES Categories](adrs/adr-002.md) — Create only the two new categories needed for the automation; leave every existing channel exactly as it is.
- [ADR-003: Organize GitHub Notifications by Event Type, not Repository or Owner](adrs/adr-003.md) — One channel per event type so failure events route cleanly to `#github-actions` with `@dev-alerts`.
- [ADR-004: HTTP Request to Discord Channel Webhook](adrs/adr-004.md) — Use HTTP Request nodes posting Discord webhook JSON instead of the native Discord node, because it gives clean control over embeds and role mentions.
- [ADR-005: GitHub Webhook HMAC-SHA256 Verification in Phase 1](adrs/adr-005.md) — Verify HMAC signatures on every incoming GitHub delivery starting in Phase 1, not deferred.
- [ADR-006: One Code Node per Event Type for Formatting](adrs/adr-006.md) — Place one Code formatter per branch of the Switch (per event type), instead of a single Code or per-branch Set nodes.
