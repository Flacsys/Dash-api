import 'dotenv/config';
import express from 'express';
import connect from './config/mongodb';
import cors from 'cors';
import morgan from 'morgan';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import programRoutes from './routes/program';
import moduleRoutes from './routes/modules';
import participantRoutes from './routes/participant';
import importRoutes from './routes/import';
import { errorHandler } from './middleware/errorMiddleware';

const app = express();
app.use(cors());
app.use(express.json());

// Morgan HTTP request logging streaming to Winston
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/imports', importRoutes);

app.get('/', (req, res) => res.json({ ok: true, message: 'participant mgmt API' }));

// Global Error Handler
app.use(errorHandler);

export default app;

/**
 * Start the DB connection and HTTP server.
 * Exported so tests can import app without starting the server.
 */
const DEFAULT_PORT = parseInt(process.env.PORT || '4000', 10);
const ENV_MONGO_URI = process.env.MONGO_URI || '';

export async function startServer(options?: { port?: number; mongoUri?: string }) {
  const PORT = options?.port || DEFAULT_PORT;
  const MONGO_URI = options?.mongoUri || ENV_MONGO_URI;

  // Masking URI for security in logs
  logger.info(`Mongo URI: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);

  await connect(MONGO_URI);
  const server = app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason as any);
  });
}
