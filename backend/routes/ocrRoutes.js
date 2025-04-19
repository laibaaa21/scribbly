const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const { protect } = require('../middleware/authMiddleware');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Process image with Tesseract OCR
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    
    const imagePath = req.file.path;
    const language = req.body.language || 'eng';
    
    console.log('OCR Request:', {
      imagePath,
      language,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
    
    // Basic validation for language code (to prevent command injection)
    if (!/^[a-z]{3}$/.test(language)) {
      return res.status(400).json({ message: 'Invalid language code' });
    }
    
    // Execute tesseract with specified language
    console.log(`Running tesseract command with language: ${language}`);
    
    // Properly quote the image path to handle special characters
    const quotedImagePath = `"${imagePath}"`;
    const command = `tesseract ${quotedImagePath} stdout -l ${language} --psm 3`;
    console.log(`Command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && stderr.trim().length > 0) {
      console.warn('Tesseract stderr:', stderr);
    }
    
    // For confidence, we'll simply estimate based on word count
    // Real OCR confidence would need tessdata output parsing
    const words = stdout.trim().split(/\s+/).filter(w => w.length > 0);
    const confidence = Math.min(100, Math.max(0, words.length * 5));
    
    // Clean up the uploaded file
    fs.unlinkSync(imagePath);
    
    console.log('OCR processing complete:', {
      confidence,
      wordCount: words.length,
      textLength: stdout.trim().length
    });
    
    return res.status(200).json({
      text: stdout.trim(),
      confidence: confidence
    });
    
  } catch (error) {
    console.error('OCR Error details:', error);
    return res.status(500).json({ 
      message: 'Error processing image', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router; 