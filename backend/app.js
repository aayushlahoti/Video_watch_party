import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config/config.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

const app = express();

const isProduction = config.env === 'production';

// 1. Security Headers
app.use(helmet());

// 2. CORS setup
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Rate Limiting (Prevent DDoS/Brute Force)
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 4. Request Parsing
app.use(express.json());
app.use(mongoSanitize());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.cookie.secret));

// 5. Development Logging
if (!isProduction) {
  app.use(morgan('dev'));
}

// 6. Base Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Watch Party API is running smoothly',
    timestamp: new Date(),
    env: config.env
  });
});

// 7. API Routes
app.get('/api', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Watch Party REST API v1',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// 8. 404 Route Not Found Middleware
app.use((req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// 9. Global Error Handling Middleware
app.use((err, req, res, _next) => {
  console.error('API Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || null,
    // Avoid exposing stack trace in production
    stack: isProduction ? undefined : err.stack,
  });
});

export default app;
