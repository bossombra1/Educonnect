function getEnv(key: string, defaultValue: string = ''): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

function getEnvList(key: string): string[] {
  return getEnv(key, '').split(',').map((value) => value.trim()).filter(Boolean);
}

export const env = {
  mysql: {
    host: getEnv('MYSQL_HOST', 'localhost'),
    port: getEnvInt('MYSQL_PORT', 3306),
    database: getEnv('MYSQL_DATABASE', 'educonnect'),
    user: getEnv('MYSQL_USER', 'root'),
    password: getEnv('MYSQL_PASSWORD', ''),
  },
  jwt: {
    secret: getEnv('JWT_SECRET', 'educonnect-default-secret-change-me'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '24h'),
  },
  api: {
    port: getEnvInt('API_PORT', 3000),
    corsOrigins: getEnvList('CORS_ORIGINS'),
  },
  firebase: {
    projectId: getEnv('FIREBASE_PROJECT_ID', ''),
    privateKey: getEnv('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    clientEmail: getEnv('FIREBASE_CLIENT_EMAIL', ''),
  },
  upload: {
    dir: getEnv('UPLOAD_DIR', './uploads'),
    maxFileSize: getEnvInt('MAX_FILE_SIZE', 5 * 1024 * 1024),
  },
};

export function validateEnv(): void {
  const required = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  const isProduction = process.env.NODE_ENV === 'production';
  const insecureSecret = !process.env.JWT_SECRET
    || process.env.JWT_SECRET.length < 32
    || process.env.JWT_SECRET.includes('change-me')
    || process.env.JWT_SECRET.includes('default');
  if (isProduction && (missing.length > 0 || insecureSecret)) {
    throw new Error(`Configuration de production invalide. Variables manquantes: ${missing.join(', ') || 'aucune'}; JWT_SECRET doit contenir au moins 32 caractères aléatoires.`);
  }
  if (missing.length > 0 || insecureSecret) {
    console.warn(`[Config] Configuration incomplète: ${missing.join(', ') || 'JWT_SECRET faible'}.`);
  }
  if (isProduction && env.api.corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS doit être défini en production.');
  }
}
