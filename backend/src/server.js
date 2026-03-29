import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initDB } from './config/db.js';
import { debugInterswitchConfig, getInterswitchToken } from './utils/interswitchAuth.js';

import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import applianceRoutes from './routes/applianceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import { getElectricityPaymentCode, validateCustomer } from './services/billsPaymentService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'MeterMate API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/appliances', applianceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/sessions', sessionRoutes);

if (process.env.ENABLE_DEBUG_ROUTES === 'true') {
  app.get('/debug/test-token', async (_req, res) => {
    try {
      const token = await getInterswitchToken();
      res.json({ success: true, token: `${token.slice(0, 50)}...`, tokenLength: token.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/debug/validate-meter/:meterNumber', async (req, res) => {
    try {
      const paymentCode = process.env.INTERSWITCH_ELECTRICITY_PAYMENT_CODE || (await getElectricityPaymentCode()).paymentCode;
      const result = await validateCustomer(req.params.meterNumber, paymentCode);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  debugInterswitchConfig();
  const dbInitialized = await initDB();
  if (!dbInitialized) {
    console.warn('API started, but database initialization failed. Check DATABASE_URL and database accessibility.');
  }
});
