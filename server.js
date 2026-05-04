#!/usr/bin/env node
console.log('[server.js] Starting server...');
try {
  await import('./server.mjs');
  console.log('[server.js] Server started successfully');
} catch (error) {
  console.error('[server.js] Failed to start server:', error);
  process.exit(1);
}
