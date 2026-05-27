---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/Code - Format PR
line: 30
severity: medium
author: claude-code
provider_ref:
---

# Issue 007: Embed title not bounded to Discord's 256-char limit

## Review Comment

`Code - Format PR` builds the embed title from untrusted, unbounded input:

```js
title: `${repoName} · #${prNumber} · ${prTitle}`,
```

Discord rejects an embed whose `title` exceeds 256 characters with HTTP 400.
A long PR title (GitHub allows up to 256 chars for the title alone, plus the repo
prefix) will overflow, the HTTP Request throws, the message is lost, and the
exception routes to `WF-ERR Global`. `Code - Format Release` has the same exposure
in its `🏷️ ${repoName} · ${tagName}` title (release `name`/tag can be long), and
embed field `value`s (max 1024) are likewise unbounded.

Note `Code - Format Push` already truncates its description to 2000 chars, so the
pattern is understood — it just isn't applied to titles/fields. Suggested fix: add
a shared `truncate(text, max)` and clamp title to 256 and each field value to
1024 before building the embed, e.g.:

```js
title: truncate(`${repoName} · #${prNumber} · ${prTitle}`, 256),
```

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied: `truncate(text, max)` helper added to `Code - Format PR`,
    `Code - Format Release`, and `Code - Format Action`. Title clamped to 256;
    every field value clamped to 1024. `Code - Format Push` already truncated
    its description, so its body was not touched.
  - Mirrored in all three local `.mjs` test files. New regression tests cover
    long-input title clamping for PR, Release, and Action embeds. All 34 tests
    pass via `npm test`.
