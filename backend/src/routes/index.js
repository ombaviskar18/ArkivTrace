import { Router } from 'express';
import testRoutes from './testEntity.routes.js';
import { testEntityController } from '../controllers/testEntity.controller.js';
import shopRoutes from './shop.routes.js';
import dispatchRoutes from './dispatch.routes.js';
import receiptRoutes from './receipt.routes.js';
import stockReportRoutes from './stock-report.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import recordsRoutes from './records.routes.js';
import discrepancyRoutes from './discrepancy.routes.js';

const apiRouter = Router();

// Root API ping
apiRouter.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ArkivTrace API is active',
    timestamp: new Date().toISOString(),
  });
});

// Existing test entity and health routes (kept intact)
apiRouter.use('/test', testRoutes);

// ArkivTrace Core v1 Modules
apiRouter.get('/v1/network/status', testEntityController.getHealth);
apiRouter.use('/v1/shops', shopRoutes);
apiRouter.use('/v1/dispatches', dispatchRoutes);
apiRouter.use('/v1/receipts', receiptRoutes);
apiRouter.use('/v1/stock-reports', stockReportRoutes);
apiRouter.use('/v1/dashboard', dashboardRoutes);
apiRouter.use('/v1/records', recordsRoutes);
apiRouter.use('/v1/discrepancies', discrepancyRoutes);

export default apiRouter;

