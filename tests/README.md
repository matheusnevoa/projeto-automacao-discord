# tests/ — local mirrors of n8n Code node bodies

These files unit-test the formatter logic that ships inside the **n8n workflow
`WF-GH-Discord`** (id `mtRu7rZlq0p5GJ6G`). n8n Code nodes cannot `import` from
disk, so there is no single source of truth that both sides can consume; the
formatter function in each test file is a manually maintained copy of the
deployed node body.

## Running

```bash
npm test
```

This invokes `node --test` against the three `.mjs` suites explicitly. `node
--test tests/` does **not** work on Node 22 — it treats the directory as a CJS
module path and aborts with `MODULE_NOT_FOUND`. Always go through `npm test`.

## Mirror responsibility

When a Code node changes in the deployed workflow, the matching test file must
be updated in the same change. Drift between the test mirror and the deployed
node hides bugs:

| Deployed n8n node            | Test mirror                              |
|------------------------------|------------------------------------------|
| `Code - Format Push`         | _no mirror yet — TODO_                   |
| `Code - Format PR`           | `tests/code-format-pr.test.mjs`          |
| `Code - Format Release`      | `tests/code-format-release.test.mjs`     |
| `Code - Format Action`       | `tests/code-format-action.test.mjs`      |
| `Code - Verify HMAC`         | _no mirror yet — TODO_                   |

The historical `.compozy/tasks/discord-novo/tests/task_10_pin_data_unit_tests.cjs`
file is a task-time snapshot that has drifted from the deployed code. Do not use
it for verification; the `.mjs` suite above is authoritative.

## Adding tests

- Keep each test focused on observable behaviour of one formatter.
- Pass `vars` explicitly per test so a future Variables-name change is a single
  search-and-replace.
- For regression tests tied to a review-round issue, reference the issue
  number in the test name or a comment so the link survives.
