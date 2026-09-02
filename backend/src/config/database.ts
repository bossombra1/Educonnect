import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: '+00:00',
    });
    console.log(
      `[Database] Pool created for ${env.mysql.user}@${env.mysql.host}:${env.mysql.port}/${env.mysql.database}`
    );
  }
  return pool;
}

export async function testConnection(): Promise<void> {
  const connection = await getPool().getConnection();
  try {
    await connection.query('SELECT 1 AS test');
    console.log('[Database] Connection successful');
  } finally {
    connection.release();
  }
}
