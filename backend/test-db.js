const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scribbly');
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

testConnection(); 