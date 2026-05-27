import assert from 'node:assert/strict';
import test from 'node:test';

// Mirror of the deployed n8n "Code - Format PR" node body.
// Keep in sync with the workflow `mtRu7rZlq0p5GJ6G` -- see tests/README.md.
function formatPr(body, vars = { DISCORD_WH_PRS: 'https://discord.invalid/prs' }) {
  const pr = body.pull_request || {};
  const action = body.action;
  const repository = body.repository || {};
  const sender = body.sender || {};
  const targetChannelUrl = vars.DISCORD_WH_PRS;

  function truncate(text, max) {
    const t = String(text == null ? '' : text);
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + '…';
  }

  function prStatus() {
    if (action === 'opened' || action === 'reopened') {
      return 'Aberto';
    }
    if (action === 'synchronize' || action === 'synchronized') {
      return 'Atualizado';
    }
    if (action === 'review_requested') {
      return 'Review solicitado';
    }
    if (action === 'closed') {
      return pr.merged === true ? 'Merged' : 'Fechado';
    }
    // pull_request_review's `submitted` action is delivered under a different
    // event and is not routed here -- the `submitted` branch was unreachable
    // (review round 1, issue 009).
    return null;
  }

  const status = prStatus();
  if (!status) {
    return [];
  }

  const repoName = repository.full_name || pr.base?.repo?.full_name || 'unknown/repository';
  const prNumber = pr.number || body.number || '?';
  const prTitle = pr.title || '(sem titulo)';
  const authorName = pr.user?.login || sender.login || 'unknown';
  const branch = `${pr.head?.ref || 'unknown'} → ${pr.base?.ref || 'unknown'}`;
  const url = pr.html_url || repository.html_url || '';
  const timestamp = pr.updated_at || pr.created_at || new Date().toISOString();

  return [
    {
      json: {
        targetChannelUrl,
        discordPayload: {
          username: 'Future Station GitHub',
          embeds: [
            {
              title: truncate(`${repoName} · #${prNumber} · ${prTitle}`, 256),
              url,
              color: 0xe67e22,
              fields: [
                { name: 'Autor', value: truncate(authorName, 1024), inline: true },
                { name: 'Branch', value: truncate(branch, 1024), inline: true },
                { name: 'Status', value: truncate(status, 1024), inline: true },
              ],
              author: {
                name: sender.login || authorName,
                icon_url: sender.avatar_url,
              },
              timestamp,
            },
          ],
        },
      },
    },
  ];
}

function prPayload(overrides = {}) {
  const payload = {
    action: 'opened',
    repository: {
      full_name: 'future-station/app',
      html_url: 'https://github.com/future-station/app',
    },
    sender: {
      login: 'reviewer',
      avatar_url: 'https://github.com/reviewer.png',
    },
    pull_request: {
      number: 42,
      title: 'Add checkout flow',
      html_url: 'https://github.com/future-station/app/pull/42',
      merged: false,
      created_at: '2026-05-27T12:00:00Z',
      updated_at: '2026-05-27T13:00:00Z',
      user: { login: 'author' },
      head: { ref: 'feature/checkout' },
      base: { ref: 'main', repo: { full_name: 'future-station/app' } },
    },
  };

  return {
    ...payload,
    ...overrides,
    pull_request: {
      ...payload.pull_request,
      ...(overrides.pull_request || {}),
    },
  };
}

function embedFor(payload) {
  return formatPr(payload)[0].json.discordPayload.embeds[0];
}

test('action=opened emits one orange item with Aberto status', () => {
  const result = formatPr(prPayload({ action: 'opened' }));

  assert.equal(result.length, 1);
  assert.equal(result[0].json.targetChannelUrl, 'https://discord.invalid/prs');
  assert.equal(result[0].json.discordPayload.content, undefined);
  assert.equal(result[0].json.discordPayload.embeds[0].color, 0xe67e22);
  assert.deepEqual(
    result[0].json.discordPayload.embeds[0].fields.find((field) => field.name === 'Status'),
    { name: 'Status', value: 'Aberto', inline: true },
  );
});

test('action=closed with merged=true maps to Merged', () => {
  const embed = embedFor(prPayload({ action: 'closed', pull_request: { merged: true } }));

  assert.equal(embed.fields.find((field) => field.name === 'Status').value, 'Merged');
});

test('action=closed with merged=false maps to Fechado', () => {
  const embed = embedFor(prPayload({ action: 'closed', pull_request: { merged: false } }));

  assert.equal(embed.fields.find((field) => field.name === 'Status').value, 'Fechado');
});

test('action=labeled is filtered', () => {
  assert.deepEqual(formatPr(prPayload({ action: 'labeled' })), []);
});

test('embed includes source to target branch field', () => {
  const embed = embedFor(prPayload());

  assert.deepEqual(
    embed.fields.find((field) => field.name === 'Branch'),
    { name: 'Branch', value: 'feature/checkout → main', inline: true },
  );
});

test('relevant review and update actions produce readable statuses', () => {
  assert.equal(
    embedFor(prPayload({ action: 'synchronize' })).fields.find((field) => field.name === 'Status').value,
    'Atualizado',
  );
  assert.equal(
    embedFor(prPayload({ action: 'review_requested' })).fields.find((field) => field.name === 'Status').value,
    'Review solicitado',
  );
});

test('action=submitted is filtered (pull_request_review is not routed here)', () => {
  assert.deepEqual(formatPr(prPayload({ action: 'submitted' })), []);
});

test('PR embed title is clamped to Discord 256-char limit', () => {
  const longTitle = 'x'.repeat(400);
  const embed = embedFor(prPayload({ pull_request: { title: longTitle } }));

  assert.equal(embed.title.length, 256);
  assert.equal(embed.title.endsWith('…'), true);
});

test('fallback fields keep Discord payload valid when optional PR data is absent', () => {
  const result = formatPr({
    action: 'reopened',
    number: 7,
    repository: {},
    sender: {},
    pull_request: {
      html_url: '',
      created_at: '2026-05-27T14:00:00Z',
      base: { repo: { full_name: 'fallback/repo' } },
    },
  });
  const embed = result[0].json.discordPayload.embeds[0];

  assert.equal(embed.title, 'fallback/repo · #7 · (sem titulo)');
  assert.equal(embed.fields.find((field) => field.name === 'Autor').value, 'unknown');
  assert.equal(embed.fields.find((field) => field.name === 'Branch').value, 'unknown → unknown');
  assert.equal(embed.fields.find((field) => field.name === 'Status').value, 'Aberto');
  assert.equal(embed.url, '');
  assert.equal(embed.author.name, 'unknown');
  assert.equal(embed.timestamp, '2026-05-27T14:00:00Z');
});

test('alternate synchronized spelling maps to Atualizado', () => {
  const embed = embedFor(prPayload({ action: 'synchronized' }));

  assert.equal(embed.fields.find((field) => field.name === 'Status').value, 'Atualizado');
});
