#!/usr/bin/env node
/**
 * Smoke test for the ticket tracker server.
 * Starts the server, runs checks against the API, then tears down.
 */

import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const PORT = '19191';
const BASE = `http://localhost:${PORT}`;
const DATA_DIR = './data/smoke-tmp';

// ── helpers ──────────────────────────────────────────────────────────────────

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function get(path, headers = {}) {
  const url = new URL(path, BASE);
  return httpRequest({
    hostname: url.hostname,
    port: Number(url.port),
    path: url.pathname + url.search,
    method: 'GET',
    headers
  });
}

function post(path, data, headers = {}) {
  const body = JSON.stringify(data);
  const url = new URL(path, BASE);
  return httpRequest(
    {
      hostname: url.hostname,
      port: Number(url.port),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    },
    body
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(maxMs = 10_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await get('/api/health');
      if (res.status === 200) return true;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  return false;
}

// ── result tracking ───────────────────────────────────────────────────────────

const results = [];

function check(name, passed, detail = '') {
  const label = passed ? 'PASS' : 'FAIL';
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`  [${label}] ${name}${suffix}`);
  results.push({ name, passed });
}

// ── main ──────────────────────────────────────────────────────────────────────

console.log('Starting smoke test...\n');

// 1. Spawn server
const server = spawn('node', ['server.mjs'], {
  env: {
    ...process.env,
    PORT,
    DATA_DIR,
    NODE_ENV: 'test',
    TICKET_APP_DEFAULT_PASSWORD: 'ChangeMe!2026'
  },
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe']
});

server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[server:err] ${d}`));

let exitCode = 0;

try {
  // 2. Wait for server to be ready
  console.log('Waiting for server to be ready...');
  const ready = await waitForServer(10_000);
  if (!ready) {
    console.error('Server did not start within 10 seconds.');
    process.exitCode = 1;
    server.kill();
    process.exit(1);
  }
  console.log('Server ready.\n');

  // 3. Run checks

  // Check 1: GET /api/health
  {
    const res = await get('/api/health');
    const passed = res.status === 200 && res.body && res.body.status === 'ok';
    check('GET /api/health → body.status === "ok"', passed,
      passed ? '' : `status=${res.status} body=${JSON.stringify(res.body)}`);
  }

  // Check 2: POST /api/auth/login → csrf_token + Set-Cookie
  let cookie = '';
  let csrfToken = '';
  {
    const res = await post('/api/auth/login', { name: 'Jawad', password: 'ChangeMe!2026' });
    const hasCsrf = res.body && typeof res.body.csrf_token === 'string' && res.body.csrf_token.length > 0;
    const rawCookie = res.headers['set-cookie'];
    const cookieStr = Array.isArray(rawCookie) ? rawCookie[0] : (rawCookie || '');
    const hasCookie = cookieStr.includes('session_id=');
    const passed = res.status === 200 && hasCsrf && hasCookie;
    check('POST /api/auth/login → csrf_token + Set-Cookie session', passed,
      passed ? '' : `status=${res.status} csrf=${hasCsrf} cookie=${hasCookie}`);
    if (hasCsrf) csrfToken = res.body.csrf_token;
    if (hasCookie) {
      cookie = cookieStr.split(';')[0];
    }
  }

  const authHeaders = {
    Cookie: cookie,
    'X-CSRF-Token': csrfToken
  };

  // Check 3: GET /api/tickets → body.tickets is an array
  {
    const res = await get('/api/tickets', authHeaders);
    const passed = res.status === 200 && res.body && Array.isArray(res.body.tickets);
    check('GET /api/tickets → body.tickets is an array', passed,
      passed ? '' : `status=${res.status} body=${JSON.stringify(res.body)}`);
  }

  // Check 4: GET /api/meta → body.categories is an array
  {
    const res = await get('/api/meta', authHeaders);
    const passed = res.status === 200 && res.body && Array.isArray(res.body.categories);
    check('GET /api/meta → body.categories is an array', passed,
      passed ? '' : `status=${res.status} body=${JSON.stringify(res.body)}`);
  }

  // Check 5: GET /api/import-history → body.batches is an array
  {
    const res = await get('/api/import-history', authHeaders);
    const passed = res.status === 200 && res.body && Array.isArray(res.body.batches);
    check('GET /api/import-history → body.batches is an array', passed,
      passed ? '' : `status=${res.status} body=${JSON.stringify(res.body)}`);
  }

  // Check 6: GET /api/dashboard → body.totals exists
  {
    const res = await get('/api/dashboard', authHeaders);
    const passed = res.status === 200 && res.body && res.body.totals !== undefined;
    check('GET /api/dashboard → body.totals exists', passed,
      passed ? '' : `status=${res.status} body=${JSON.stringify(res.body)}`);
  }

} finally {
  // 4. Kill server
  console.log('\nStopping server...');
  server.kill('SIGTERM');
  await sleep(500);

  // 5. Clean up data dir
  try {
    await rm(resolve(ROOT, 'data', 'smoke-tmp'), { recursive: true, force: true });
    console.log('Cleaned up smoke-tmp data directory.');
  } catch (err) {
    console.warn('Warning: could not remove smoke-tmp:', err.message);
  }

  // 6. Report and exit
  console.log('\n── Results ─────────────────────────────────────────────');
  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);
  console.log(`  Passed: ${passed.length} / ${results.length}`);
  if (failed.length > 0) {
    console.log(`  Failed: ${failed.map((r) => r.name).join(', ')}`);
    exitCode = 1;
  } else {
    console.log('  All checks passed!');
  }
}

process.exit(exitCode);
