import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes/index.js';
import { env } from './config/env.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.api.corsOrigins.length === 0 || env.api.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origine CORS non autorisée.'));
  },
  credentials: false,
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée.' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);

  if (err.name === 'MulterError') {
    res.status(400).json({ success: false, error: `Erreur de téléchargement: ${err.message}` });
    return;
  }

  if (err.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: 'Fichier trop volumineux.' });
    return;
  }

  if (err.message === 'Origine CORS non autorisée.') {
    res.status(403).json({ success: false, error: err.message });
    return;
  }

  res.status(500).json({ success: false, error: 'Erreur interne du serveur.' });
});

export default app;
