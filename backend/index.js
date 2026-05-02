const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import models to register schemas
require('./models/users');
require('./models/roles');
require('./models/categories');
require('./models/branches');
require('./models/items');
require('./models/itemUnits');
require('./models/stock');
require('./models/suppliers');
require('./models/issueNotes');
require('./models/issueNoteItems');
require('./models/purchaseOrder');
require('./models/goodsReceived');

const Userrouter = require('./routes/users');
const rolesRouter = require('./routes/roles');
const itemsRouter = require('./routes/items');
const categoriesRouter = require('./routes/categories');
const BranchRouter = require('./routes/branches');
const suppliersRouter = require('./routes/suppliers');
const stockRouter = require('./routes/stock');
const issueNotesRouter = require('./routes/issueNotes');
const purchaseOrdersRouter = require('./routes/purchaseOrders');
const chatRoutes = require('./routes/chat');
const goodsReceivedRouter = require('./routes/goodsReceived');
const imageSearchRouter = require('./routes/imageSearch');
const dashboardRouter = require('./routes/dashboard');



const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// MongoDB connection event listeners
mongoose.connection.on('connected', () => {
  console.log('🚀 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});





// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// DEBUG: Environment variables for image search
app.get('/api/debug/env', (req, res) => {
  console.log('🔍 [DEBUG] Environment variables:');
  console.log(`   ML_SERVICE_URL = ${process.env.ML_SERVICE_URL}`);
  console.log(`   IMAGE_UPLOAD_MAX_MB = ${process.env.IMAGE_UPLOAD_MAX_MB}`);
  console.log(`   NODE_ENV = ${process.env.NODE_ENV}`);

  res.json({
    ML_SERVICE_URL: process.env.ML_SERVICE_URL,
    IMAGE_UPLOAD_MAX_MB: process.env.IMAGE_UPLOAD_MAX_MB,
    NODE_ENV: process.env.NODE_ENV
  });
});



// Routes - Register BEFORE app.listen()
app.use('/api/users', Userrouter);
app.use('/api/roles', rolesRouter);
app.use('/api/items', itemsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/branches', BranchRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/stock', stockRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/issue-notes', issueNotesRouter);
app.use('/api/goods-received', goodsReceivedRouter);
app.use('/api/chat', chatRoutes);
app.use('/api/image-search', imageSearchRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Frontend URL: http://localhost:3000`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
});




