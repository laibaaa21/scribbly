const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();
const noteRoutes = require('./routes/noteRoutes');
const userRoutes = require('./routes/userRoutes');
const mindmapRoutes = require('./routes/mindmapRoutes');
const ocrRoutes = require('./routes/ocrRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use routes
app.use('/api/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mindmaps', mindmapRoutes);
app.use('/api/ocr', ocrRoutes);

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
