// server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDB } from './config/db.js';
import { debugInterswitchConfig } from './utils/interswitchAuth.js';

// Import all your routes
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import applianceRoutes from './routes/applianceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'MeterMate API is running normally.' });
});

// Mount the Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sessions', sessionRoutes);

// ===== DEBUG ENDPOINTS (For Testing) =====
import { getInterswitchToken } from './utils/interswitchAuth.js';
import { validateCustomer, getElectricityPaymentCode, makePayment } from './services/billsPaymentService.js';

// Test token generation
app.get('/debug/test-token', async (req, res) => {
  try {
    console.log('Testing token generation...');
    const token = await getInterswitchToken();
    res.json({
      success: true,
      message: 'Token generated successfully!',
      token: token.substring(0, 50) + '...',
      tokenLength: token.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test meter validation
app.post('/debug/validate-meter/:meterNumber', async (req, res) => {
  try {
    console.log(`Testing meter validation for: ${req.params.meterNumber}`);
    const { paymentCode } = await getElectricityPaymentCode();
    const result = await validateCustomer(req.params.meterNumber, paymentCode);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test get electricity payment code
app.get('/debug/electricity-code', async (req, res) => {
  try {
    console.log('Testing electricity payment code fetch...');
    const result = await getElectricityPaymentCode();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start Server and Initialize DB
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  debugInterswitchConfig(); // Show Interswitch configuration
  await initDB();
});