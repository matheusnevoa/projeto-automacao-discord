---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: tests/code-format-action.test.mjs
line: 4
severity: medium
author: claude-code
provider_ref:
---

# Issue 008: Tests duplicate node logic, have drifted, and are not wired to a runner

## Review Comment

The formatter logic is copy-pasted into test files rather than imported from a
shared source, so the tests validate copies — not the code deployed in n8n — and
the copies have already diverged:

- `.compozy/tasks/discord-novo/tests/task_10_pin_data_unit_tests.cjs` `formatAction`
  omits the `Branch` field, hardcodes `timestamp: '2026-05-27T13:42:11Z'`, and
  lacks the `head_branch`/`deployment.ref` handling that exists in the deployed
  `Code - Format Action` node and in `tests/code-format-action.test.mjs`.
- The three `tests/*.mjs` files redefine `formatPr`/`formatRelease`/`formatAction`
  inline; any change to the n8n node must be hand-mirrored in two or three places.

There is also no `package.json` / test script, so nothing runs these on a regular
basis — they only pass when invoked manually. A formatter bug in the deployed node
(e.g., Issue 002's narrow failure detection) would not be caught because the tests
exercise a separate implementation.

Suggested fix: extract each formatter into a single source module that both the
n8n Code node and the tests consume (n8n Code nodes can't import, but the canonical
function can live in one `.mjs` and be pasted verbatim, with a test asserting the
node's code matches), or at minimum delete the stale `.cjs` duplicate, keep one
test file per formatter, and add an `npm test` script (`node --test tests/`) so the
suite is runnable and drift is visible.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied:
    - Added top-level `package.json` exposing `npm test` that lists the
      three `.mjs` test files explicitly (sidesteps the Node 22
      `MODULE_NOT_FOUND` bug for `node --test <dir>`).
    - Added `tests/README.md` documenting the mirror-maintenance contract
      and listing every Code-node ↔ test-file pairing.
    - Prepended a deprecation banner to
      `.compozy/tasks/discord-novo/tests/task_10_pin_data_unit_tests.cjs`
      (kept as a historical artifact; banner directs readers to the live
      `.mjs` suite). Mid-fix I overwrote the `.cjs` accidentally; restored
      it from the in-conversation copy and verified it still runs 10/10.
  - Verified: `npm test` → 34/34 pass. Full extraction to a single shared
    formatter module is out of scope (n8n Code nodes cannot `import`).
