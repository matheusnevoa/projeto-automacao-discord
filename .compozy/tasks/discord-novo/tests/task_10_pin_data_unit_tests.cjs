// DEPRECATED — drifted snapshot from task_10 (review round 1, issue 008).
//
// This is a historical pin-data harness written during task_10 and kept here
// as a task-time artifact. It does NOT match the deployed n8n workflow:
//   - `formatAction` omits the Branch field and hardcodes a timestamp;
//   - target URLs and failure conclusions diverge from the live node.
//
// Do not use this file for verification. The authoritative unit tests are the
// mirrors in `/tests/*.test.mjs`, runnable via `npm test`.
// See `/tests/README.md` for the mirror-maintenance contract.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const vars = {
  GITHUB_WEBHOOK_SECRET: 'task-10-secret',
  DISCORD_WH_TESTE: 'https://discord.com/api/webhooks/test/token',
  DEV_ALERTS_ROLE_ID: '123456789012345678',
};

const sender = {
  login: 'matheusnevoa',
  avatar_url: 'https://github.com/avatar.png',
};

const repository = {
  full_name: 'future-station/app',
  html_url: 'https://github.com/future-station/app',
};

function verifyHmac(item) {
  const json = item.json || {};
  const headers = json.headers || {};
  const sigHeader = headers['x-hub-signature-256'] || headers['X-Hub-Signature-256'] || '';
  const secret = vars.GITHUB_WEBHOOK_SECRET;

  function fail() {
    throw new Error('HMAC_INVALID');
  }

  if (!secret || !sigHeader.startsWith('sha256=')) {
    fail();
  }

  let body = json.rawBody ?? json.body;
  if (body === undefined || body === null) {
    body = '';
  } else if (typeof body !== 'string' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  const actualBuffer = Buffer.from(sigHeader);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    fail();
  }

  return [item];
}

function formatPush(item) {
  const body = item.json.body || {};
  const commits = Array.isArray(body.commits) ? body.commits : [];
  if (commits.length === 0) return [];

  const repoName = body.repository?.full_name || 'unknown/repository';
  const branch = typeof body.ref === 'string' ? body.ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '') : 'unknown';

  return commits.map((commit) => {
    const sha = String(commit.id || commit.sha || '').slice(0, 7);
    return {
      json: {
        targetChannelUrl: vars.DISCORD_WH_TESTE,
        discordPayload: {
          username: 'Future Station GitHub',
          embeds: [{
            title: `${repoName} · ${branch}`,
            description: String(commit.message || '').split(/\r?\n/)[0].trim(),
            url: commit.url,
            color: 0x2ecc71,
            fields: [
              { name: 'Autor', value: commit.author?.name || sender.login, inline: true },
              { name: 'Commit', value: `\`${sha}\``, inline: true },
            ],
            author: { name: body.sender?.login || sender.login, icon_url: body.sender?.avatar_url },
            timestamp: commit.timestamp,
            footer: { text: sha },
          }],
        },
      },
    };
  });
}

function formatPr(item) {
  const body = item.json.body || {};
  const pr = body.pull_request || {};
  const action = body.action;
  let status = null;
  if (action === 'opened' || action === 'reopened') status = 'Aberto';
  if (action === 'synchronize' || action === 'synchronized') status = 'Atualizado';
  if (action === 'review_requested') status = 'Review solicitado';
  if (action === 'submitted') status = 'Review submetido';
  if (action === 'closed') status = pr.merged === true ? 'Merged' : 'Fechado';
  if (!status) return [];

  return [{
    json: {
      targetChannelUrl: vars.DISCORD_WH_TESTE,
      discordPayload: {
        username: 'Future Station GitHub',
        embeds: [{
          title: `${body.repository?.full_name || repository.full_name} · #${pr.number || body.number} · ${pr.title}`,
          url: pr.html_url,
          color: 0xe67e22,
          fields: [
            { name: 'Autor', value: pr.user?.login || body.sender?.login || sender.login, inline: true },
            { name: 'Branch', value: `${pr.head?.ref || 'unknown'} → ${pr.base?.ref || 'unknown'}`, inline: true },
            { name: 'Status', value: status, inline: true },
          ],
          author: { name: body.sender?.login || sender.login, icon_url: body.sender?.avatar_url },
          timestamp: pr.updated_at || pr.created_at,
        }],
      },
    },
  }];
}

function formatRelease(item) {
  const body = item.json.body || {};
  if (body.action !== 'published') return [];
  const release = body.release || {};
  const description = String(release.body || '').trim();
  const embed = {
    title: `🏷️ ${body.repository?.full_name || repository.full_name} · ${release.tag_name}`,
    url: release.html_url,
    color: 0x3498db,
    fields: [{ name: 'Publicado por', value: release.author?.login || body.sender?.login || sender.login, inline: true }],
    author: { name: body.sender?.login || sender.login, icon_url: body.sender?.avatar_url },
    timestamp: release.published_at,
  };
  if (description) embed.description = description.length > 500 ? description.slice(0, 499).trimEnd() + '…' : description;
  return [{ json: { targetChannelUrl: vars.DISCORD_WH_TESTE, discordPayload: { username: 'Future Station GitHub', embeds: [embed] } } }];
}

function formatAction(item) {
  const headers = item.json.headers || {};
  const body = item.json.body || {};
  const eventType = headers['x-github-event'] || headers['X-GitHub-Event'];
  let failed;
  let label;
  let title;
  let url;
  let subject;

  if (eventType === 'workflow_run') {
    const run = body.workflow_run || {};
    if (body.action !== 'completed') return [];
    failed = run.conclusion === 'failure';
    label = failed ? 'Failure' : run.conclusion || 'success';
    subject = run.name || 'workflow';
    title = `${body.repository?.full_name || repository.full_name} · ${subject}`;
    url = run.html_url;
  } else if (eventType === 'deployment_status') {
    const status = body.deployment_status || {};
    const deployment = body.deployment || {};
    if (!['success', 'failure'].includes(status.state)) return [];
    failed = status.state === 'failure';
    label = failed ? 'Failure' : 'Success';
    subject = deployment.environment || status.environment || 'environment';
    title = `${body.repository?.full_name || repository.full_name} · ${subject}`;
    url = status.target_url || status.log_url || status.html_url;
  } else {
    return [];
  }

  const discordPayload = {
    username: 'Future Station GitHub',
    embeds: [{
      title,
      url,
      color: failed ? 0xe74c3c : 0x2ecc71,
      fields: [
        { name: eventType === 'workflow_run' ? 'Workflow' : 'Environment', value: subject, inline: true },
        { name: 'Status', value: label, inline: true },
        { name: 'Link', value: url, inline: false },
      ],
      author: { name: body.sender?.login || sender.login, icon_url: body.sender?.avatar_url },
      timestamp: '2026-05-27T13:42:11Z',
    }],
  };

  if (failed && vars.DEV_ALERTS_ROLE_ID) {
    discordPayload.content = `<@&${vars.DEV_ALERTS_ROLE_ID}> 🚨 ${subject} failed in ${body.repository?.full_name || repository.full_name}`;
  }

  return [{ json: { targetChannelUrl: vars.DISCORD_WH_TESTE, discordPayload } }];
}

function signedRaw(rawBody) {
  return 'sha256=' + crypto.createHmac('sha256', vars.GITHUB_WEBHOOK_SECRET).update(rawBody).digest('hex');
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const rawBody = JSON.stringify({ action: 'opened' });
test('Code - Verify HMAC: valid body and signature passes', () => {
  assert.equal(verifyHmac({ json: { rawBody, headers: { 'x-hub-signature-256': signedRaw(rawBody) } } }).length, 1);
});
test('Code - Verify HMAC: invalid signature throws', () => {
  assert.throws(() => verifyHmac({ json: { rawBody, headers: { 'x-hub-signature-256': signedRaw(rawBody).replace(/.$/, '0') } } }), /HMAC_INVALID/);
});
test('Code - Verify HMAC: missing signature throws', () => {
  assert.throws(() => verifyHmac({ json: { rawBody, headers: {} } }), /HMAC_INVALID/);
});

test('Code - Format Push: three commits emit three distinct SHA items', () => {
  const out = formatPush({ json: { body: {
    repository,
    sender,
    ref: 'refs/heads/main',
    commits: [1, 2, 3].map((n) => ({
      id: `abcdef${n}1234567890`,
      message: `Commit ${n}`,
      url: `${repository.html_url}/commit/${n}`,
      timestamp: `2026-05-27T13:42:1${n}Z`,
      author: { name: `Author ${n}` },
    })),
  } } });
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map((item) => item.json.discordPayload.embeds[0].footer.text)).size, 3);
  assert.ok(out.every((item) => item.json.discordPayload.embeds[0].color === 0x2ecc71));
});

function prPayload(action, merged) {
  return { json: { body: {
    action,
    number: 42,
    repository,
    sender,
    pull_request: {
      number: 42,
      title: 'Add Discord pipeline',
      html_url: `${repository.html_url}/pull/42`,
      user: { login: 'octocat' },
      head: { ref: 'feature/github-discord' },
      base: { ref: 'main' },
      merged,
      updated_at: '2026-05-27T13:42:11Z',
    },
  } } };
}
test('Code - Format PR: opened emits one item with Aberto', () => {
  const out = formatPr(prPayload('opened', false));
  assert.equal(out.length, 1);
  assert.equal(out[0].json.discordPayload.embeds[0].fields.find((field) => field.name === 'Status').value, 'Aberto');
  assert.equal(out[0].json.discordPayload.embeds[0].color, 0xe67e22);
});
test('Code - Format PR: closed merged emits Merged', () => {
  const out = formatPr(prPayload('closed', true));
  assert.equal(out[0].json.discordPayload.embeds[0].fields.find((field) => field.name === 'Status').value, 'Merged');
});

function releasePayload(action) {
  return { json: { body: {
    action,
    repository,
    sender,
    release: {
      tag_name: 'v1.2.3',
      html_url: `${repository.html_url}/releases/tag/v1.2.3`,
      body: 'Release notes',
      author: { login: 'release-bot' },
      published_at: '2026-05-27T13:42:11Z',
    },
  } } };
}
test('Code - Format Release: published emits one item', () => {
  const out = formatRelease(releasePayload('published'));
  assert.equal(out.length, 1);
  assert.equal(out[0].json.discordPayload.embeds[0].color, 0x3498db);
});
test('Code - Format Release: created emits zero items', () => {
  assert.equal(formatRelease(releasePayload('created')).length, 0);
});

function actionPayload(conclusion) {
  return { json: {
    headers: { 'x-github-event': 'workflow_run' },
    body: {
      action: 'completed',
      repository,
      sender,
      workflow_run: {
        name: 'CI',
        conclusion,
        html_url: `${repository.html_url}/actions/runs/1`,
      },
    },
  } };
}
test('Code - Format Action: workflow_run failure emits mention', () => {
  const out = formatAction(actionPayload('failure'));
  assert.equal(out.length, 1);
  assert.ok(out[0].json.discordPayload.content.startsWith(`<@&${vars.DEV_ALERTS_ROLE_ID}>`));
  assert.equal(out[0].json.discordPayload.embeds[0].color, 0xe74c3c);
});
test('Code - Format Action: workflow_run success emits no mention', () => {
  const out = formatAction(actionPayload('success'));
  assert.equal(out.length, 1);
  assert.equal(out[0].json.discordPayload.content, undefined);
  assert.equal(out[0].json.discordPayload.embeds[0].color, 0x2ecc71);
});

let passed = 0;
for (const { name, fn } of tests) {
  fn();
  passed += 1;
  console.log(`ok ${passed} - ${name}`);
}

const coverage = Math.round((passed / tests.length) * 100);
console.log(`\n${passed}/${tests.length} required pin-data scenarios passed`);
console.log(`Scenario coverage: ${coverage}%`);
