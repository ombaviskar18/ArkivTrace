import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import apiRouter from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Security and standard middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const hasClerkKeys = Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
if (hasClerkKeys) {
  app.use(clerkMiddleware());
}

// Lightweight request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'ArkivTrace API',
    description: 'Blockchain-Powered Ration Distribution Transparency System for India',
    network: 'Arkiv Tiramisu (7738577)',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      ping: '/api/ping',
      networkHealth: '/api/test/health',
      shops: {
        create: 'POST /api/v1/shops (Clerk-authenticated admin)',
        list: 'GET /api/v1/shops',
        get: 'GET /api/v1/shops/:id',
      },
      dispatches: {
        create: 'POST /api/v1/dispatches (Clerk-authenticated admin)',
        list: 'GET /api/v1/dispatches',
        get: 'GET /api/v1/dispatches/:id',
      },
      dashboard: {
        summary: 'GET /api/v1/dashboard/summary',
      },
      records: {
        list: 'GET /api/v1/records',
      },
      discrepancies: {
        list: 'GET /api/v1/discrepancies',
        report: 'POST /api/v1/discrepancies',
        review: 'POST /api/v1/discrepancies/:id/review (Clerk-authenticated admin)',
      },
      test: {
        createTestEntity: 'POST /api/test/create (protected in production)',
        getEntityByKey: 'GET /api/test/entity/:key',
        listTestEntities: 'GET /api/test/list',
      },
    },
  });
});

// Mount modular API routes under /api
app.use('/api', apiRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
