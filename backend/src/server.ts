import dotenv from 'dotenv';
dotenv.config();

import { validateEnv } from './config/env.js';
import { testConnection } from './config/database.js';
import { startScheduler } from './jobs/scheduler.js';
import app from './app.js';
import { env } from './config/env.js';

async function start() {
  validateEnv();

  try {
    await testConnection();
  } catch (err) {
    console.error('[Server] Failed to connect to database:', (err as Error).message);
    console.error('[Server] Please check your MySQL configuration and try again.');
    process.exit(1);
  }

  startScheduler();

  const server = app.listen(env.api.port, () => {
    console.log('');
    console.log('============================================');
    console.log(`  EduConnect API Server`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Port: ${env.api.port}`);
    console.log(`  Database: ${env.mysql.host}:${env.mysql.port}/${env.mysql.database}`);
    console.log(`  API URL: http://localhost:${env.api.port}/api`);
    console.log('============================================');
    console.log('');
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${env.api.port} is already in use.`);
    } else {
      console.error('[Server] Error:', err.message);
    }
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  });
}

start().catch((err) => {
  console.error('[Server] Fatal error during startup:', err);
  process.exit(1);
});
