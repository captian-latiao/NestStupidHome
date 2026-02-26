import express from 'express';
import cors from 'cors';
import { closeDb } from './db.js';
import stateRouter from './routes/state.js';
import authRouter from './routes/auth.js';
import actionsRouter from './routes/actions.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002', 'http://127.0.0.1:3002'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Protected routes (auth required — handled inside stateRouter)
app.use('/api/state', stateRouter);

// Shortcuts action routes (API Key auth — handled inside actionsRouter)
app.use('/api/actions', actionsRouter);

// Health check (public)
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Nest Backend',
        timestamp: new Date().toISOString()
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`\n  🏠 Nest Backend Server`);
    console.log(`  ➜  API:     http://localhost:${PORT}/api`);
    console.log(`  ➜  Health:  http://localhost:${PORT}/api/health`);
    console.log(`  ➜  Auth:    http://localhost:${PORT}/api/auth/login`);
    console.log(`  ➜  SQLite:  server/nest.db\n`);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    closeDb();
    server.close(() => {
        console.log('[Server] Closed.');
        process.exit(0);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
