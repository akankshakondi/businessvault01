import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/auth.ts';
import accountsRoutes from './server/routes/accounts.ts';
import onboardingRoutes from './server/routes/onboarding.ts';
import adminRoutes from './server/routes/admin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // JSON Body Parser
  app.use(express.json());

  // Security Headers & CORS for development
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Backend API Routing
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountsRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/admin', adminRoutes);

  // Health and System Info Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      application: 'BalanceVault Financial Account Management System',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        jwtAuth: true,
        bcryptHashing: true,
        redisRateLimiting: true,
        rbacSecurity: true,
        onboardingKyc: true,
      },
    });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BalanceVault] Server operational at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BalanceVault] Fatal server bootstrap failure:', err);
  process.exit(1);
});
