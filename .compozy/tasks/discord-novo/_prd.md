# PRD: Discord + GitHub + n8n Automation for Future Station

## Overview

The Future Station Discord server is a 22-member workspace shared between the internal team and clients. Today, all nine text channels live in a single generic "Canais de Texto" category, with no separation between team-only and client-facing space, and no automated visibility into what is happening in the team's GitHub repositories.

The team operates an n8n instance (`n8n.futurestation.com.br`) with 26 existing workflows and a centralized error handler (`WF-ERR Global`), making it the natural intermediary for any incoming integration.

This effort delivers two outcomes:

1. A minimal, additive reorganization of the Discord server — two new categories (`🔗 GITHUB` and `🤖 AUTOMAÇÕES`) — without disturbing any existing channel.
2. An end-to-end automation that takes GitHub events (commits, pull requests, releases, GitHub Actions) and posts formatted messages to the right Discord channel in near real time, with `@dev-alerts` mentions on critical failures.

It exists because today the team only learns about commits, broken deploys, and failed Actions by manually checking GitHub. That delay slows reaction time and lets regressions linger. The minimal scope is intentional: prove the pipeline with one test repository, validate the message format, then roll out to real repositories.

## Goals

- **Visibility**: every push, pull request, release, and workflow_run in connected GitHub repositories appears in the right Discord channel within 30 seconds of occurring.
- **Awareness on failure**: every failed GitHub Actions run, failed deployment, and production error mentions the `@dev-alerts` role so on-call team members get a push notification — and only them.
- **Low-friction adoption**: the change adds only two new Discord categories and one new role; no existing channel, name, or permission is altered in Phase 1.
- **Safe rollout**: validate the full pipeline against a single test repository before connecting any production-critical repo.
- **Operability**: pipeline failures land in `#n8n-logs` and `#erros-producao` so the team can detect and fix them without checking the n8n UI.
- **Timeline**: Phase 1 (MVP, test repo) is shippable inside one working session; Phase 2 (real repositories) follows once formatting is approved.

## User Stories

### Primary persona: Future Station team member (developer / founder)

- As a team member, I want to see new commits in `#github-commits` so that I know what changed across our repositories without opening GitHub.
- As a team member, I want to see new pull requests in `#github-pull-requests` so that I can react quickly when a teammate needs review.
- As a team member, I want a clear release announcement in `#github-releases` so that I know what was shipped and when.
- As an on-call team member, I want failed GitHub Actions and broken deploys to mention `@dev-alerts` so that I get a push notification immediately, but only when something is actually broken.
- As a team member who does not want notification noise, I want to opt out of `@dev-alerts` so that I see the messages but my phone doesn't ring.
- As an admin, I want the GitHub and Automações categories to be hidden from clients so that internal engineering activity stays internal.

### Secondary persona: Future Station client (in `#chat-clientes`)

- As a client, I want my existing channels (`#chat-clientes`, etc.) to continue working exactly as they do today so that the rollout does not interrupt my relationship with the team.

### Tertiary persona: Future Station admin (during rollout)

- As the server admin, I want to validate the full pipeline against one safe test repository so that I see real Discord messages before exposing real repositories.
- As the server admin, I want the new structure to be additive only so that I can roll back by deleting two categories if anything goes wrong.

## Core Features

### F1 — New Discord category: `🔗 GITHUB`

Hosts every channel that receives GitHub-sourced messages.

Channels (in order):

- `#github-teste` — Phase 1 validation channel; receives every event during testing. Removable in Phase 2 once real channels are validated.
- `#github-commits` — push events, one Discord message per individual commit.
- `#github-pull-requests` — pull_request events: opened, reopened, synchronized, review_requested, reviewed, merged, closed.
- `#github-releases` — release events: published, edited.
- `#github-actions` — workflow_run, deployment_status, and check_run events.

Visibility: hidden from any client-facing role.

### F2 — New Discord category: `🤖 AUTOMAÇÕES`

Operational channels for the automation itself and adjacent ops surfaces.

Channels (in order):

- `#n8n-logs` — non-critical execution traces from the n8n workflow (info-level).
- `#deploys` — deployment-related notifications (initially tied to GitHub `deployment_status`, extensible later to other deploy systems).
- `#erros-producao` — workflow exceptions, delivery failures, and any payload the central error handler routes here.

Visibility: hidden from any client-facing role.

### F3 — Discord role: `@dev-alerts`

A new mentionable role used exclusively for critical pings. Team members opt in by self-assigning the role (or being assigned by an admin). Only failure events trigger the mention.

### F4 — n8n workflow: `WF-GH-Discord`

A single n8n workflow that:

- Receives every GitHub webhook delivery for connected repositories.
- Identifies the event type from the GitHub headers.
- Applies filters (event-specific: e.g., only `released` action on releases, ignore bot pushes if configured).
- Formats a Discord-style embed message containing repository, branch, author, push actor, commit hash, link, and timestamp where applicable.
- Posts the message to the Discord channel webhook that corresponds to the event type.
- On failure conditions (workflow_run conclusion=failure, deployment_status state=failure, manually classified critical errors), injects an `<@&dev-alerts>` mention into the message.
- Routes any in-workflow exception through the existing `WF-ERR Global` handler, which surfaces the failure to `#erros-producao`.

### F5 — Per-event message format

Each event type renders a consistent, scannable embed:

- **Commit**: emoji + repo + branch · author · "push by" sender · commit message (first line) · short SHA · link.
- **Pull request**: emoji + repo + status (opened / merged / closed / reviewed) · title · author · source → target branch · link.
- **Release**: emoji + repo + version tag · publisher · short description · link.
- **GitHub Action**: emoji + repo + workflow name · branch · status · `@dev-alerts` if failure · link.
- **Failure**: 🚨 prefix, red embed color when supported, `@dev-alerts` mention, link to run.

### F6 — Phase 1 validation harness

A `#github-teste` channel and a single test repository connected end-to-end so the team can fire push / PR / release / failure events and visually confirm each format before opening the pipeline to real repos.

## User Experience

### Primary flow: a team member sees a commit land

1. Developer pushes a commit to a connected repository.
2. GitHub fires a webhook to the n8n endpoint.
3. Within ~30 seconds, a formatted message appears in `#github-commits`.
4. Team member sees the message in their channel list (no push, no mention).
5. If they want details, they click the embedded link to GitHub.

### Failure flow: a deploy breaks

1. GitHub Actions reports a `workflow_run` with conclusion=failure.
2. n8n formats a 🚨 message and posts it to `#github-actions` with `<@&dev-alerts>` in the content.
3. Anyone in the `@dev-alerts` role gets a Discord push notification immediately.
4. They tap the link and land directly on the failed run.

### Onboarding flow: a new team member joins

1. Admin grants them visibility into the GitHub and Automações categories.
2. Admin offers them the `@dev-alerts` role; they opt in or skip.
3. From that point, they see the same stream as the rest of the team.

### Setup flow: connecting a new repository

1. Admin opens the repository's GitHub Settings → Webhooks.
2. Adds the n8n Webhook Trigger URL.
3. Selects the events (push, pull_request, release, workflow_run).
4. (Optional but recommended) sets a secret for signature verification.
5. Saves; subsequent events flow automatically.

### Accessibility / discoverability considerations

- Channel names use the existing lowercase-with-hyphens convention so they sort and read consistently with current channels.
- Category names start with an emoji to make the new sections scannable in the sidebar.
- `@dev-alerts` is opt-in to avoid pinging team members who are off-shift or non-technical.

## High-Level Technical Constraints

- The single integration point on the n8n side is one Webhook Trigger URL exposed by the `n8n.futurestation.com.br` instance.
- Discord rate limits on webhooks are per-channel; the pipeline must not flood any single channel with more than the per-channel allowance during normal operation. Burst protection is deferred to Phase 4 unless triggered earlier.
- The Discord bot already present (`claudinha#3001`) requires the permissions Manage Channels, Manage Webhooks, Manage Roles, View Channels, and Send Messages to perform the additive setup. Administrator is not required and must not be granted.
- GitHub webhook configuration uses repository-scoped permissions (`admin:repo_hook`) where possible; an org-scoped token is out of scope for MVP.
- Latency target from GitHub event to Discord message: under 30 seconds for the 95th percentile.
- All webhook URLs (n8n trigger URL, Discord channel webhook URLs) are treated as secrets; they must not appear in any committed file or shared transcript.

## Non-Goals (Out of Scope)

- Reorganizing existing channels (no moves, no renames, no deletions of `#geral`, `#prompts`, `#deixe-uma-música-aqui`, `#isights-vídeos`, `#n8n-videos-tutoriais`, `#para-sites`, `#banco-de-dados`, `#links`, `#chat-clientes`).
- Fixing the existing `#isights-vídeos` typo (deferred — see Open Questions).
- Creating a `💻 DESENVOLVIMENTO` category with per-stack channels (`#frontend`, `#backend`, `#flutter`).
- Creating `📌 INFORMAÇÕES`, `📝 CONTEÚDOS E IDEIAS`, or `💼 CLIENTES E PROJETOS` categories.
- Bridging GitHub Issues, Discussions, or Projects into Discord.
- Bidirectional flow (replying to a Discord message to comment on the PR).
- Multi-tenant per-client routing (each client gets their own GitHub feed).
- Aggregation / digest formats (per-hour summaries, daily roll-ups).
- Mobile-specific formatting variants.
- Auditing or modifying the visibility of existing channels for the client role.

## Phased Rollout Plan

### MVP (Phase 1) — Test pipeline against a single repository

Deliverables:

- Two new categories created: `🔗 GITHUB`, `🤖 AUTOMAÇÕES`.
- `#github-teste` channel created and used as the destination for all events during validation.
- `@dev-alerts` role created.
- `WF-GH-Discord` workflow created in n8n with Switch by event type and an HTTP Request posting to the `#github-teste` webhook.
- One test repository connected via GitHub webhook to the n8n trigger URL.
- A test push, test PR (opened + merged), test release (draft published), and a deliberately failed workflow run all produce visually-correct messages in `#github-teste`.

Success criteria to proceed to Phase 2:

- All four message formats look correct in Discord without manual edits.
- Failure event mentions `@dev-alerts` and pushes a notification to a member with the role.
- No accidental modification of any existing channel.
- Average end-to-end latency under 30 seconds.

### Phase 2 — Promote to dedicated event channels

Deliverables:

- Channels `#github-commits`, `#github-pull-requests`, `#github-releases`, `#github-actions` created.
- `WF-GH-Discord` updated to route each event to its dedicated channel webhook.
- `#n8n-logs`, `#deploys`, `#erros-producao` created and wired (workflow logs go to `#n8n-logs`; in-workflow exceptions surface in `#erros-producao` via `WF-ERR Global`).
- `#github-teste` kept temporarily as a fallback; deletion deferred to end of Phase 3.

Success criteria to proceed to Phase 3:

- All four event-type channels receive their respective events for ≥48 hours without misrouting.
- `#erros-producao` has been validated at least once with a synthetic failure.

### Phase 3 — Connect real repositories

Deliverables:

- Two to three real Future Station repositories connected to the n8n webhook.
- Per-repo filters applied if needed (e.g., ignore noisy branches, ignore bot commits).
- `#github-teste` archived or deleted.

Long-term success criteria:

- Team members report they no longer need to check GitHub manually for "what changed".
- On-call members confirm `@dev-alerts` pings them only on actual failures (low false-positive rate).
- Zero loss of events for ≥7 consecutive days.

### Phase 4 — Evolution (deferred, optional)

- Daily / weekly digest of commits and PRs per repository.
- Stalled-PR reminders (PR open >N days with no review).
- Integration with GitHub Issues.
- Cross-channel summaries posted to `#geral` for client-facing visibility (curated, not raw events).
- Per-stack `💻 DESENVOLVIMENTO` channels if traffic justifies them.
- Permissions audit of existing channels for the client role.

## Success Metrics

- **Coverage**: ≥95% of GitHub events from connected repos appear in Discord (measured by spot-comparing GitHub activity feed to Discord history once per week).
- **Latency**: 95th percentile end-to-end time from GitHub event to Discord message ≤30 seconds.
- **Signal quality**: ≥90% of `@dev-alerts` pings correspond to real failures requiring action (low false-positive rate, measured by retrospective review of alerts).
- **Adoption**: ≥80% of active team members have the `@dev-alerts` role within two weeks of Phase 3 rollout (proxy for trust in the channel).
- **Stability**: Zero accidental modifications of pre-existing channels through the rollout.
- **Reliability**: Pipeline failure rate (events expected vs delivered) under 1% per rolling 7-day window after Phase 3.

## Risks and Mitigations

- **Risk**: Team finds the volume of commit messages noisy once real repos are connected.
  - **Mitigation**: Phase 4 includes digest patterns; Phase 3 supports per-repo filters; team members can mute `#github-commits` individually.
- **Risk**: Clients accidentally gain visibility into the new GITHUB/AUTOMAÇÕES categories.
  - **Mitigation**: Phase 1 acceptance criteria explicitly verify the two new categories are hidden from any non-team role before any real repository is connected.
- **Risk**: GitHub webhook URL or Discord webhook URLs are leaked in commits or shared transcripts.
  - **Mitigation**: PRD treats these as secrets; webhook URLs never appear in any file checked in to the repository; n8n trigger URL is documented only inside n8n.
- **Risk**: GitHub does not deliver an expected event (e.g., misconfigured webhook).
  - **Mitigation**: Phase 1 explicitly tests each event type once before declaring success; if an event type is missing, the configuration is fixed before scaling.
- **Risk**: Team members ignore `@dev-alerts` once they trust the pipeline less.
  - **Mitigation**: Signal quality success metric tracks false-positive rate; any spike triggers a tuning pass on the failure-classification logic in `WF-GH-Discord`.
- **Risk**: A future change to the n8n instance breaks the workflow silently.
  - **Mitigation**: Routing failures land in `#erros-producao` via the existing `WF-ERR Global`; team checks that channel as part of normal operations.

## Architecture Decision Records

- [ADR-001: n8n as Central Hub for GitHub → Discord Pipeline](adrs/adr-001.md) — Use one centralized n8n workflow (`WF-GH-Discord`) instead of native Discord/GitHub webhooks or per-event modular workflows, because it is the only option that supports the `@dev-alerts` mention requirement while keeping operational overhead low.
- [ADR-002: Minimal MVP Scope — Only GITHUB and AUTOMAÇÕES Categories](adrs/adr-002.md) — Create only the two new categories needed for the automation; leave every existing channel exactly as it is.
- [ADR-003: Organize GitHub Notifications by Event Type, not Repository or Owner](adrs/adr-003.md) — One channel per event type so failure events can route cleanly to `#github-actions` with `@dev-alerts`, and the channel count stays bounded regardless of how many repositories are connected.

## Open Questions

- Should the `#isights-vídeos` typo be corrected at the same time as this rollout, or deferred to a separate cleanup pass? Currently deferred.
- Are there any existing channels (e.g., `#prompts`, `#banco-de-dados`) that should not be visible to the client role? A permissions audit is out of scope for this PRD; flagged for a future effort.
- Which specific GitHub repository will be used as the Phase 1 test target? To be picked at the start of execution — should be low-traffic, ideally with a sandbox branch the team can push to safely.
- Should a webhook secret be enforced from Phase 1, or introduced in Phase 2 once the format is locked? Recommendation is to enforce from Phase 1 if convenient, but acceptable to defer.
- Which existing n8n credential profile should `WF-GH-Discord` use for outbound Discord webhook calls? Likely the same HTTP Request convention used by `WF1`–`WF5`; to be confirmed during implementation.
- Should the n8n workflow store delivered-event IDs for replay/deduplication? Deferred unless duplicates are observed in practice.
