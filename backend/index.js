const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();
const noteRoutes = require('./routes/noteRoutes');
const userRoutes = require('./routes/userRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const youtubeRoutes = require('./routes/youtube');

// Connect to MongoDB
connectDB();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours in seconds
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Add security headers middleware
app.use((req, res, next) => {
  // Ensure proper CORS headers
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Add security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Max-Age', '86400');
  }
  
  next();
});

// CORS middleware
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use routes
app.use('/api/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/youtube', youtubeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    cors: {
      origin: req.headers.origin,
      method: req.method,
      credentials: req.headers['access-control-request-credentials'],
      headers: req.headers['access-control-request-headers']
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }

  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('CORS Configuration:', {
    origins: corsOptions.origin,
    methods: corsOptions.methods,
    headers: corsOptions.allowedHeaders
  });
});
