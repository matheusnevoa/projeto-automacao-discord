#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const child = spawn('mcp-discord', process.argv.slice(2), {
  env: process.env,
  stdio: ['pipe', 'pipe', 'inherit'],
});

process.stdin.pipe(child.stdin);

const stdout = createInterface({ input: child.stdout });

stdout.on('line', (line) => {
  try {
    const message = JSON.parse(line);
    if (message?.jsonrpc === '2.0' && message?.method === 'log') {
      console.error(`[mcp-discord] ${message.params?.level ?? 'info'}: ${message.params?.message ?? ''}`);
      return;
    }
  } catch {
    // Non-JSON output is not valid MCP stdio traffic. Keep it off stdout.
    console.error(`[mcp-discord] ${line}`);
    return;
  }

  process.stdout.write(`${line}\n`);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
