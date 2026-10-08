// Main Express server
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { initializeDatabase, closeDatabase } from './utils/database';
import { errorHandler, asyncHandler } from './middleware/errors';
import { ipLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import developerRoutes from './routes/developer';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '1mb' }));
app.use(express.urlencoded({ limit: process.env.MAX_REQUEST_SIZE || '1mb', extended: true }));
app.use(cookieParser());
app.use(ipLimiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/developer', developerRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize and start server
async function start() {
  try {
    // Initialize database
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation available at ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      console.log('\nAvailable endpoints:');
      console.log('  POST /api/auth/callback - GitHub OAuth callback');
      console.log('  GET  /api/auth/user - Get current user');
      console.log('  POST /api/auth/developer/login - Developer login');
      console.log('  POST /api/auth/logout - Logout');
      console.log('  POST /api/chat/message - Send message');
      console.log('  GET  /api/chat/conversations - List conversations');
      console.log('  GET  /api/developer/overview - Dashboard overview');
      console.log('  GET  /health - Health check');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

start();

export default app;
