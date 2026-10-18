import 'dotenv/config';
import app from './src/app.js';

// Export the Express app for Vercel Serverless Function execution
export default app;

// If run directly (e.g. node index.js in local development)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 ArkivTrace Backend Server running on http://localhost:${PORT}`);
  });
}
