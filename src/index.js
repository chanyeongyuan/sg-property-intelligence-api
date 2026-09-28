import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

// Import routes
import btoRoutes from './routes/bto.js';
import resaleRoutes from './routes/resale.js';
import demographicsRoutes from './routes/demographics.js';
import intelligenceRoutes from './routes/intelligence.js';
import hubspotRoutes from './routes/hubspot.js';
import privatePropertyRoutes from './routes/private-property.js';
import { getCacheStats, clearCache } from './services/datagovsg.js';
import { createSimulationApp } from './simulation/app.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// Middleware
// Configure CORS for HubSpot and local development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://app.hubspot.com',
      'https://app-eu1.hubspot.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    // Allow HubSpot subdomains
    if (origin.includes('.hubspot.com') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, can restrict later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rate limiting middleware
app.use((req, res, next) => {
  // Skip rate limiting for health check
  if (req.path === '/' || req.path === '/health') {
    return next();
  }

  const identifier = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(identifier)) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const userData = requestCounts.get(identifier);

  if (now > userData.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userData.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil((userData.resetTime - now) / 1000),
      limit: MAX_REQUESTS,
      window: `${RATE_LIMIT_WINDOW / 1000} seconds`
    });
  }

  userData.count++;
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Singapore Property Intelligence API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      bto: '/api/bto/*',
      resale: '/api/resale/*',
      demographics: '/api/demographics/*',
      intelligence: '/api/intelligence/*',
      hubspot: '/api/hubspot/*',
      privateProperty: '/api/private-property/*'
    },
    documentation: '/api/docs'
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/simulation', createSimulationApp());
app.use('/api/bto', btoRoutes);
app.use('/api/resale', resaleRoutes);
app.use('/api/demographics', demographicsRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/hubspot', hubspotRoutes);
app.use('/api/private-property', privatePropertyRoutes);

// Cache management endpoints
app.get('/api/cache/stats', (req, res) => {
  const stats = getCacheStats();
  res.json({
    success: true,
    ...stats
  });
});

app.post('/api/cache/clear', (req, res) => {
  clearCache();
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    service: 'Singapore Property Intelligence API',
    version: '1.0.0',
    description: 'Real-time property and demographic intelligence for lead targeting in Singapore',
    baseUrl: `http://localhost:${PORT}/api`,
    endpoints: {
      bto: {
        description: 'BTO (Build-To-Order) project data',
        endpoints: [
          'GET /bto/all - Get all BTO projects',
          'GET /bto/upcoming?quarterStart=2024Q1&quarterEnd=2025Q4 - Get upcoming BTOs',
          'GET /bto/by-town/:town - Get BTOs for specific town',
          'GET /bto/current-year - Get current year BTOs',
          'GET /bto/next-6-months - Get BTOs completing in next 6 months'
        ]
      },
      resale: {
        description: 'HDB resale transaction data',
        endpoints: [
          'GET /resale/recent?months=3&town=TAMPINES - Get recent resale transactions',
          'GET /resale/by-town/:town?months=3 - Get resales for specific town',
          'GET /resale/high-value?minPrice=800000&months=3 - Get high-value transactions',
          'GET /resale/hot-areas?months=3&limit=10 - Get areas with highest activity',
          'GET /resale/price-range?minPrice=500000&maxPrice=800000 - Get resales in price range'
        ]
      },
      demographics: {
        description: 'Population and age demographics by planning area',
        endpoints: [
          'GET /demographics/area/:area - Get demographics for specific area',
          'GET /demographics/affluent-areas?limit=10 - Get areas with high affluent population',
          'GET /demographics/high-spending-power?limit=10 - Get areas with high spending power',
          'GET /demographics/compare?areas=TAMPINES,BEDOK,BISHAN - Compare multiple areas',
          'GET /demographics/age-distribution/:area - Get detailed age distribution'
        ]
      },
      intelligence: {
        description: 'Combined intelligence and lead scoring',
        endpoints: [
          'POST /intelligence/score-area - Score an area for targeting potential',
          'GET /intelligence/hot-targets?limit=10 - Get top areas to target',
          'GET /intelligence/new-movers?quarters=2&limit=15 - Identify areas with new movers'
        ]
      },
      hubspot: {
        description: 'HubSpot CRM integration',
        endpoints: [
          'POST /hubspot/enrich-contact - Enrich contact with property data',
          'POST /hubspot/create-target-list - Create target list based on intelligence',
          'POST /hubspot/webhook/contact-created - Webhook for auto-enrichment',
          'GET /hubspot/custom-properties - Get recommended HubSpot properties'
        ]
      },
      cache: {
        description: 'Cache management',
        endpoints: [
          'GET /cache/stats - Get cache statistics',
          'POST /cache/clear - Clear all cached data'
        ]
      }
    },
    rateLimit: {
      maxRequests: MAX_REQUESTS,
      window: `${RATE_LIMIT_WINDOW / 1000} seconds`
    },
    caching: {
      enabled: true,
      ttl: `${process.env.CACHE_TTL || 3600} seconds`
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    suggestion: 'Visit /api/docs for available endpoints'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🇸🇬 ========================================');
  console.log('   Singapore Property Intelligence API    ');
  console.log('   ========================================');
  console.log('');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
  console.log('');
  console.log('   Endpoints:');
  console.log(`   🏗️  BTO Data:        /api/bto/*`);
  console.log(`   🏠 Resale Data:     /api/resale/*`);
  console.log(`   👥 Demographics:    /api/demographics/*`);
  console.log(`   🎯 Intelligence:    /api/intelligence/*`);
  console.log(`   🔗 HubSpot:         /api/hubspot/*`);
  console.log('');
  console.log(`⚡ Rate limit: ${MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW / 1000}s`);
  console.log(`💾 Cache TTL: ${process.env.CACHE_TTL || 3600}s`);
  console.log('');
  console.log('🇸🇬 ========================================');
  console.log('');
});

export default app;
