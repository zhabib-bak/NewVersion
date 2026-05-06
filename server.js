#!/usr/bin/env node
console.log('[server.js] Starting server...');
try {
  // Set environment variables before importing server.mjs
  process.env.DB_TYPE = process.env.DB_TYPE || 'postgres';
  process.env.DB_HOST = process.env.DB_HOST || '34.159.196.244';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_NAME = process.env.DB_NAME || 'postgres';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASS = process.env.DB_PASS || 'tweakDenseicky%0';
  
  await import('./server.mjs');
  console.log('[server.js] Server started successfully');
} catch (error) {
  console.error('[server.js] Failed to start server:', error);
  process.exit(1);
}
