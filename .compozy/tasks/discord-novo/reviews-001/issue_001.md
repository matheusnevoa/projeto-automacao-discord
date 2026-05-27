---
provider: manual
pr:
round: 1
round_created_at: 2026-05-27T21:01:38Z
status: resolved
file: n8n/WF-GH-Discord/Code - Verify HMAC
line: 14
severity: high
author: claude-code
provider_ref:
---

# Issue 001: HMAC computed over re-serialized JSON, not the raw body

## Review Comment

`Code - Verify HMAC` resolves the body to sign with:

```js
let body = json.rawBody ?? json.body;
// ...
} else if (typeof body !== 'string' && !Buffer.isBuffer(body)) {
  body = JSON.stringify(body);
}
```

GitHub signs the **exact raw bytes** of the request body. Two problems make this
verification likely to reject every legitimate delivery:

1. The n8n Webhook node (typeVersion 2.1, `options.rawBody: true`) does **not**
   expose the raw body as `json.rawBody`. With `application/json` it parses the
   payload into `json.body` (an object) and keeps the raw bytes in the node's
   binary output (`$input.first().binary.data`, base64). So `json.rawBody` is
   `undefined` and the code falls through to `json.body`.
2. `JSON.stringify(json.body)` re-serializes the parsed object. Key ordering,
   whitespace, and unicode escaping will differ from GitHub's original bytes, so
   `crypto.timingSafeEqual` will never match. The control fails closed and the
   pipeline silently drops 100% of valid events — the core feature (visibility)
   never works.

This path is currently untested at runtime (see `_phase1-bugs.md` — `$vars` not
populated, workflow inactive), so the defect is latent.

Suggested fix: enable raw-body capture as a string and HMAC over those exact
bytes. In the Webhook node set a binary property for the raw body, then in the
Code node decode it once:

```js
const bin = $input.first().binary?.data;
const raw = bin ? Buffer.from(bin.data, 'base64') : Buffer.from(json.body ?? '', 'utf8');
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
```

Validate with a real GitHub redelivery (or a curl signed over the identical raw
string) before activating the workflow.

## Triage

- Decision: `RESOLVED`
- Notes:
  - Applied: Webhook node now carries `options.binaryPropertyName: "raw"`
    alongside `rawBody: true`. `Code - Verify HMAC` rewritten to decode from
    `item.binary.raw|body|data` (base64) first, then fall back to a string or
    Buffer body, and refuse to verify (fail-closed) when no raw bytes are
    available. Re-parses JSON into `json.body` for downstream formatters when
    the raw bytes came from binary.
  - Verified: n8n_validate_workflow reports 0 errors on v28; node body persisted
    correctly per get_workflow(full). Live GitHub-delivery proof is blocked by
    `_phase1-bugs.md` (Variables unlicensed, workflow inactive); must be
    re-confirmed end-to-end once those blockers clear before activation.
