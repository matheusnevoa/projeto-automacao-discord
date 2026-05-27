import assert from 'node:assert/strict';
import test from 'node:test';

// Mirror of the deployed n8n "Code - Format Release" node body.
// Keep in sync with the workflow `mtRu7rZlq0p5GJ6G` -- see tests/README.md.
function formatRelease(body, vars = { DISCORD_WH_RELEASES: 'https://discord.invalid/releases' }) {
  if (body.action !== 'published') {
    return [];
  }

  const release = body.release || {};
  const repository = body.repository || {};
  const sender = body.sender || {};
  const targetChannelUrl = vars.DISCORD_WH_RELEASES;

  function truncate(value, maxLength) {
    const text = String(value || '').trim();
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 1).trimEnd() + '…';
  }

  const repoName = repository.full_name || release.html_url?.match(/github\.com\/([^/]+\/[^/]+)/)?.[1] || 'unknown/repository';
  const tagName = release.tag_name || release.name || 'untagged';
  const publisher = release.author?.login || sender.login || 'unknown';
  const url = release.html_url || repository.html_url || '';
  const timestamp = release.published_at || release.created_at || new Date().toISOString();
  const description = truncate(release.body, 500);
  const embed = {
    title: truncate(`🏷️ ${repoName} · ${tagName}`, 256),
    url,
    color: 0x3498db,
    fields: [
      { name: 'Publicado por', value: truncate(publisher, 1024), inline: true },
    ],
    author: {
      name: sender.login || publisher,
      icon_url: sender.avatar_url,
    },
    timestamp,
  };

  if (description) {
    embed.description = description;
  }

  return [
    {
      json: {
        targetChannelUrl,
        discordPayload: {
          username: 'Future Station GitHub',
          embeds: [embed],
        },
      },
    },
  ];
}

function releasePayload(overrides = {}) {
  const payload = {
    action: 'published',
    repository: {
      full_name: 'future-station/app',
      html_url: 'https://github.com/future-station/app',
    },
    sender: {
      login: 'release-manager',
      avatar_url: 'https://github.com/release-manager.png',
    },
    release: {
      tag_name: 'v1.2.3',
      name: 'Version 1.2.3',
      body: 'Changelog curto',
      html_url: 'https://github.com/future-station/app/releases/tag/v1.2.3',
      published_at: '2026-05-27T15:00:00Z',
      created_at: '2026-05-27T14:00:00Z',
      author: { login: 'publisher' },
    },
  };

  return {
    ...payload,
    ...overrides,
    repository: {
      ...payload.repository,
      ...(overrides.repository || {}),
    },
    sender: {
      ...payload.sender,
      ...(overrides.sender || {}),
    },
    release: {
      ...payload.release,
      ...(overrides.release || {}),
    },
  };
}

function embedFor(payload) {
  return formatRelease(payload)[0].json.discordPayload.embeds[0];
}

test('action=published emits one blue release item', () => {
  const result = formatRelease(releasePayload());
  const embed = result[0].json.discordPayload.embeds[0];

  assert.equal(result.length, 1);
  assert.equal(result[0].json.targetChannelUrl, 'https://discord.invalid/releases');
  assert.equal(result[0].json.discordPayload.content, undefined);
  assert.equal(embed.color, 0x3498db);
  assert.equal(embed.title.includes('future-station/app · v1.2.3'), true);
  assert.equal(embed.description, 'Changelog curto');
});

test('action=created is filtered', () => {
  assert.deepEqual(formatRelease(releasePayload({ action: 'created' })), []);
});

test('action=edited is filtered', () => {
  assert.deepEqual(formatRelease(releasePayload({ action: 'edited' })), []);
});

test('long release body is truncated to about 500 chars with ellipsis', () => {
  const embed = embedFor(releasePayload({ release: { body: 'a'.repeat(1500) } }));

  assert.equal(embed.description.length, 500);
  assert.equal(embed.description.endsWith('…'), true);
});

test('empty release body omits description without error', () => {
  const embed = embedFor(releasePayload({ release: { body: '' } }));

  assert.equal(embed.description, undefined);
});

test('null release body omits description without error', () => {
  const embed = embedFor(releasePayload({ release: { body: null } }));

  assert.equal(embed.description, undefined);
});

test('release payload includes publisher and release URL', () => {
  const embed = embedFor(releasePayload());

  assert.deepEqual(
    embed.fields.find((field) => field.name === 'Publicado por'),
    { name: 'Publicado por', value: 'publisher', inline: true },
  );
  assert.equal(embed.url, 'https://github.com/future-station/app/releases/tag/v1.2.3');
  assert.equal(embed.author.name, 'release-manager');
  assert.equal(embed.timestamp, '2026-05-27T15:00:00Z');
});

test('no formatted release item has discordPayload.content', () => {
  for (const action of ['published', 'created', 'edited', 'prereleased']) {
    for (const item of formatRelease(releasePayload({ action }))) {
      assert.equal(item.json.discordPayload.content, undefined);
    }
  }
});

test('release embed title is clamped to Discord 256-char limit', () => {
  const longTag = 'v' + '9'.repeat(400);
  const embed = embedFor(releasePayload({ release: { tag_name: longTag } }));

  assert.equal(embed.title.length, 256);
  assert.equal(embed.title.endsWith('…'), true);
});
