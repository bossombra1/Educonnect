import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import routes from './routes/index.js';
import { env } from './config/env.js';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(env.upload.dir)));

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

  res.status(500).json({ success: false, error: 'Erreur interne du serveur.' });
});

export default app;
