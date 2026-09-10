require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const authRouter     = require('./routes/auth');
const habitsRouter   = require('./routes/habits');
const checkinsRouter = require('./routes/checkins');
const notesRouter    = require('./routes/notes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors()); // preflight

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));       // reject huge payloads
app.use(express.urlencoded({ extended: true }));

// ── HTTP logging (dev only) ───────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ── Global rate limiting ─────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX       || 100),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter limit on auth routes to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      10,
  message: { success: false, error: 'Too many auth attempts, please wait 15 minutes.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Health check (no auth required) ─────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    uptime:  Math.floor(process.uptime()),
    env:     process.env.NODE_ENV,
    version: require('../package.json').version,
    mongo:   mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/habits',   habitsRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/notes',    notesRouter);

// ── Root info ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:    'Habit Tracker API',
    version: '1.0.0',
    docs:    'See README.md for full API documentation',
    endpoints: {
      health:   'GET  /health',
      auth:     'POST /api/auth/register | /api/auth/login | /api/auth/refresh',
      me:       'GET|PATCH|DELETE /api/auth/me',
      habits:   'GET|POST /api/habits  |  GET|PATCH|DELETE /api/habits/:id',
      reorder:  'POST /api/habits/reorder',
      checkins: 'GET /api/checkins  |  POST /api/checkins/toggle  |  PUT|DELETE /api/checkins/:date',
      analytics:'GET /api/checkins/analytics/summary',
      notes:    'GET|PUT /api/notes  |  GET|DELETE /api/notes/:habitId/:date',
    },
  });
});

// ── 404 + global error handler (must be last) ─────────────────
app.use(notFound);
app.use(errorHandler);

// ── MongoDB connection + server start ─────────────────────────
const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/habit_tracker', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    console.log('⚠️   Starting in degraded mode (DB unavailable)');
  }

  app.listen(PORT, () => {
    console.log(`\n🚀  Habit Tracker API running`);
    console.log(`    http://localhost:${PORT}`);
    console.log(`    ENV: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app; // for testing
