import assert from 'node:assert/strict';
import test from 'node:test';

// Mirror of the deployed n8n "Code - Format Action" node body.
// Keep in sync with the workflow `mtRu7rZlq0p5GJ6G` -- see tests/README.md.
// Differences from the deployed node:
//   - `targetChannelUrl` is read from vars (the deployed code uses
//     $vars.DISCORD_WH_ACTIONS or $vars.DISCORD_WH_DEPLOYS depending on the
//     event type). Tests pass the relevant vars explicitly.
function formatAction(
  item,
  vars = {
    DISCORD_WH_ACTIONS: 'https://discord.invalid/actions',
    DISCORD_WH_DEPLOYS: 'https://discord.invalid/deploys',
    DEV_ALERTS_ROLE_ID: '123456789012345678',
  },
  logger = console,
) {
  const headers = item.headers || {};
  const body = item.body || {};
  const eventType = headers['x-github-event'] || headers['X-GitHub-Event'];
  const repository = body.repository || {};
  const sender = body.sender || {};
  const roleId = String(vars.DEV_ALERTS_ROLE_ID || '').trim();

  // GitHub workflow_run conclusions that are genuine failures. `cancelled` is
  // intentionally excluded -- typically user-initiated, not on-call.
  const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure']);

  function truncate(text, max) {
    const t = String(text == null ? '' : text);
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + '…';
  }

  function buildMention(summary) {
    if (!roleId) {
      logger.warn('WARN: DEV_ALERTS_ROLE_ID is empty; emitting failure without role mention');
      return undefined;
    }
    return `<@&${roleId}> 🚨 ${summary}`;
  }

  function actionStatus(conclusion) {
    if (FAILED_CONCLUSIONS.has(conclusion)) {
      return { label: conclusion, failed: true };
    }
    return { label: conclusion || 'success', failed: false };
  }

  function deploymentStatus(state) {
    if (state === 'failure') {
      return { label: 'Failure', failed: true };
    }
    return { label: 'Success', failed: false };
  }

  let title;
  let url;
  let timestamp;
  let branch;
  let status;
  let subjectFieldName;
  let subjectFieldValue;
  let failureSummary;
  let targetChannelUrl;

  if (eventType === 'workflow_run') {
    const run = body.workflow_run || {};
    if (body.action !== 'completed') {
      return [];
    }

    status = actionStatus(run.conclusion);
    title = `${repository.full_name || 'unknown/repository'} · ${run.name || 'workflow'}`;
    url = run.html_url || repository.html_url || '';
    timestamp = run.updated_at || run.created_at || new Date().toISOString();
    branch = run.head_branch || body.workflow?.head_branch || undefined;
    subjectFieldName = 'Workflow';
    subjectFieldValue = run.name || body.workflow?.name || 'workflow';
    failureSummary = `${subjectFieldValue} failed in ${repository.full_name || 'unknown/repository'}`;
    targetChannelUrl = vars.DISCORD_WH_ACTIONS;
  } else if (eventType === 'deployment_status') {
    const deploymentStatusBody = body.deployment_status || {};
    const deployment = body.deployment || {};
    if (!['success', 'failure'].includes(deploymentStatusBody.state)) {
      return [];
    }

    status = deploymentStatus(deploymentStatusBody.state);
    subjectFieldName = 'Environment';
    subjectFieldValue = deployment.environment || deploymentStatusBody.environment || 'environment';
    title = `${repository.full_name || 'unknown/repository'} · ${subjectFieldValue}`;
    url = deploymentStatusBody.target_url || deploymentStatusBody.log_url || deploymentStatusBody.html_url || repository.html_url || '';
    timestamp = deploymentStatusBody.updated_at || deploymentStatusBody.created_at || new Date().toISOString();
    branch = deployment.ref;
    failureSummary = `${subjectFieldValue} deployment failed in ${repository.full_name || 'unknown/repository'}`;
    targetChannelUrl = vars.DISCORD_WH_DEPLOYS;
  } else {
    return [];
  }

  const fields = [
    { name: subjectFieldName, value: truncate(subjectFieldValue, 1024), inline: true },
    { name: 'Status', value: truncate(status.label, 1024), inline: true },
    { name: 'Link', value: truncate(url || repository.html_url || 'unavailable', 1024), inline: false },
  ];

  if (branch) {
    fields.splice(1, 0, { name: 'Branch', value: truncate(branch, 1024), inline: true });
  }

  const discordPayload = {
    username: 'Future Station GitHub',
    embeds: [
      {
        title: truncate(title, 256),
        url,
        color: status.failed ? 0xe74c3c : 0x2ecc71,
        fields,
        author: {
          name: sender.login || 'github',
          icon_url: sender.avatar_url,
        },
        timestamp,
      },
    ],
  };

  const mention = status.failed ? buildMention(failureSummary) : undefined;
  if (mention) {
    discordPayload.content = mention;
  }

  return [
    {
      json: {
        targetChannelUrl,
        discordPayload,
      },
    },
  ];
}

function baseItem(eventType, bodyOverrides = {}) {
  return {
    headers: { 'x-github-event': eventType },
    body: {
      repository: {
        full_name: 'future-station/app',
        html_url: 'https://github.com/future-station/app',
      },
      sender: {
        login: 'github-user',
        avatar_url: 'https://github.com/github-user.png',
      },
      ...bodyOverrides,
    },
  };
}

function workflowRunItem(overrides = {}) {
  return baseItem('workflow_run', {
    action: 'completed',
    workflow_run: {
      name: 'CI',
      conclusion: 'success',
      head_branch: 'main',
      html_url: 'https://github.com/future-station/app/actions/runs/100',
      created_at: '2026-05-27T12:00:00Z',
      updated_at: '2026-05-27T12:05:00Z',
    },
    ...overrides,
    workflow_run: {
      name: 'CI',
      conclusion: 'success',
      head_branch: 'main',
      html_url: 'https://github.com/future-station/app/actions/runs/100',
      created_at: '2026-05-27T12:00:00Z',
      updated_at: '2026-05-27T12:05:00Z',
      ...(overrides.workflow_run || {}),
    },
  });
}

function deploymentStatusItem(overrides = {}) {
  return baseItem('deployment_status', {
    deployment: {
      environment: 'production',
      ref: 'main',
    },
    deployment_status: {
      state: 'success',
      target_url: 'https://deploy.example.com/100',
      created_at: '2026-05-27T13:00:00Z',
      updated_at: '2026-05-27T13:02:00Z',
    },
    ...overrides,
    deployment: {
      environment: 'production',
      ref: 'main',
      ...(overrides.deployment || {}),
    },
    deployment_status: {
      state: 'success',
      target_url: 'https://deploy.example.com/100',
      created_at: '2026-05-27T13:00:00Z',
      updated_at: '2026-05-27T13:02:00Z',
      ...(overrides.deployment_status || {}),
    },
  });
}

function embedFor(item, vars, logger) {
  return formatAction(item, vars, logger)[0].json.discordPayload.embeds[0];
}

test('workflow_run completed failure emits mention and red embed', () => {
  const result = formatAction(workflowRunItem({ workflow_run: { conclusion: 'failure' } }));
  const payload = result[0].json.discordPayload;

  assert.equal(result.length, 1);
  assert.equal(payload.content.startsWith('<@&123456789012345678> 🚨'), true);
  assert.equal(payload.embeds[0].color, 0xe74c3c);
});

test('workflow_run completed success emits green embed without mention', () => {
  const result = formatAction(workflowRunItem());
  const payload = result[0].json.discordPayload;

  assert.equal(result.length, 1);
  assert.equal(payload.content, undefined);
  assert.equal(payload.embeds[0].color, 0x2ecc71);
});

test('workflow_run requested and in_progress actions are filtered', () => {
  assert.deepEqual(formatAction(workflowRunItem({ action: 'requested' })), []);
  assert.deepEqual(formatAction(workflowRunItem({ action: 'in_progress' })), []);
});

test('deployment_status failure emits mention and red embed', () => {
  const result = formatAction(deploymentStatusItem({ deployment_status: { state: 'failure' } }));
  const payload = result[0].json.discordPayload;

  assert.equal(result.length, 1);
  assert.equal(payload.content.startsWith('<@&123456789012345678> 🚨'), true);
  assert.equal(payload.embeds[0].color, 0xe74c3c);
});

test('deployment_status success emits green embed without mention', () => {
  const result = formatAction(deploymentStatusItem());
  const payload = result[0].json.discordPayload;

  assert.equal(result.length, 1);
  assert.equal(payload.content, undefined);
  assert.equal(payload.embeds[0].color, 0x2ecc71);
});

test('deployment_status pending is filtered', () => {
  assert.deepEqual(formatAction(deploymentStatusItem({ deployment_status: { state: 'pending' } })), []);
});

test('empty DEV_ALERTS_ROLE_ID emits failure without mention and logs warning', () => {
  const warnings = [];
  const result = formatAction(
    workflowRunItem({ workflow_run: { conclusion: 'failure' } }),
    {
      DISCORD_WH_ACTIONS: 'https://discord.invalid/actions',
      DISCORD_WH_DEPLOYS: 'https://discord.invalid/deploys',
      DEV_ALERTS_ROLE_ID: '',
    },
    { warn: (message) => warnings.push(message) },
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].json.discordPayload.content, undefined);
  assert.deepEqual(warnings, ['WARN: DEV_ALERTS_ROLE_ID is empty; emitting failure without role mention']);
});

test('workflow_run timed_out conclusion emits mention and red embed', () => {
  const result = formatAction(workflowRunItem({ workflow_run: { conclusion: 'timed_out' } }));
  const payload = result[0].json.discordPayload;

  assert.equal(payload.content.startsWith('<@&123456789012345678> 🚨'), true);
  assert.equal(payload.embeds[0].color, 0xe74c3c);
});

test('workflow_run startup_failure conclusion emits mention and red embed', () => {
  const result = formatAction(workflowRunItem({ workflow_run: { conclusion: 'startup_failure' } }));
  const payload = result[0].json.discordPayload;

  assert.equal(payload.content.startsWith('<@&123456789012345678> 🚨'), true);
  assert.equal(payload.embeds[0].color, 0xe74c3c);
});

test('workflow_run cancelled is reported as non-failure without mention', () => {
  const result = formatAction(workflowRunItem({ workflow_run: { conclusion: 'cancelled' } }));
  const payload = result[0].json.discordPayload;

  assert.equal(payload.content, undefined);
  assert.equal(payload.embeds[0].color, 0x2ecc71);
});

test('workflow_run routes to DISCORD_WH_ACTIONS, not DEPLOYS', () => {
  const result = formatAction(workflowRunItem());

  assert.equal(result[0].json.targetChannelUrl, 'https://discord.invalid/actions');
});

test('deployment_status routes to DISCORD_WH_DEPLOYS, not ACTIONS', () => {
  const result = formatAction(deploymentStatusItem());

  assert.equal(result[0].json.targetChannelUrl, 'https://discord.invalid/deploys');
});

test('action embed title is clamped to Discord 256-char limit', () => {
  const longName = 'x'.repeat(400);
  const result = formatAction(workflowRunItem({ workflow_run: { name: longName } }));
  const embed = result[0].json.discordPayload.embeds[0];

  assert.equal(embed.title.length, 256);
  assert.equal(embed.title.endsWith('…'), true);
});

test('action embeds include required fields', () => {
  const result = formatAction(workflowRunItem());
  const embed = result[0].json.discordPayload.embeds[0];

  assert.equal(result[0].json.targetChannelUrl, 'https://discord.invalid/actions');
  assert.deepEqual(embed.fields.find((field) => field.name === 'Workflow'), {
    name: 'Workflow',
    value: 'CI',
    inline: true,
  });
  assert.deepEqual(embed.fields.find((field) => field.name === 'Branch'), {
    name: 'Branch',
    value: 'main',
    inline: true,
  });
  assert.deepEqual(embed.fields.find((field) => field.name === 'Status'), {
    name: 'Status',
    value: 'success',
    inline: true,
  });
  assert.deepEqual(embed.fields.find((field) => field.name === 'Link'), {
    name: 'Link',
    value: 'https://github.com/future-station/app/actions/runs/100',
    inline: false,
  });
});

test('deployment embeds include environment, branch, status, and link fields', () => {
  const embed = embedFor(deploymentStatusItem());

  assert.deepEqual(embed.fields.find((field) => field.name === 'Environment'), {
    name: 'Environment',
    value: 'production',
    inline: true,
  });
  assert.deepEqual(embed.fields.find((field) => field.name === 'Branch'), {
    name: 'Branch',
    value: 'main',
    inline: true,
  });
  assert.deepEqual(embed.fields.find((field) => field.name === 'Status'), {
    name: 'Status',
    value: 'Success',
    inline: true,
  });
  assert.deepEqual(embed.fields.find((field) => field.name === 'Link'), {
    name: 'Link',
    value: 'https://deploy.example.com/100',
    inline: false,
  });
});
