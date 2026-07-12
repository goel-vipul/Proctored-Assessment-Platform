const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const env = require('./config/env');
const { initializeWebSocket } = require('./websocket/handler');

// Route imports
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const questionRoutes = require('./routes/questions');
const candidateRoutes = require('./routes/candidate');
const submissionRoutes = require('./routes/submissions');
const resultRoutes = require('./routes/results');
const proctoringRoutes = require('./routes/proctoring');
const plagiarismRoutes = require('./routes/plagiarism');
const adminRoutes = require('./routes/admin');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize socket.io
const io = new Server(server, {
  cors: {
    origin: env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to routes (for emitting events from controllers)
app.set('io', io);

// Initialize WebSocket handlers
initializeWebSocket(io);

// ---- Middleware ----

app.use(cors({
  origin: env.NODE_ENV === 'production' ? false : '*',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ---- Routes ----

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api', questionRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api', resultRoutes);
app.use('/api', proctoringRoutes);
app.use('/api', plagiarismRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---- Start Server ----

server.listen(env.PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Proctored Assessment Platform — API Server          ║
║  Running on port ${env.PORT}                              ║
║  Environment: ${env.NODE_ENV}                        ║
║  WebSocket: enabled                                  ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
