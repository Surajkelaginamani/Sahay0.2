import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/config/db.js';
import patientRoutes from './src/routes/patientRoutes.js';
import hospitalAuthRoutes from './src/routes/hospitalAuthRoutes.js';
import govtRoutes from './src/routes/govtRoutes.js';
import hospitalAdminRoutes from './src/routes/hospitalAdminRoutes.js';
import staffAuthRoutes from './src/routes/staffAuthRoutes.js';
import labRoutes from './src/modules/laboratory/labRoutes.js';
import receptionistRoutes from './src/modules/receptionist/receptionistRoutes.js';
import doctorRoutes from './src/modules/doctor/doctorRoutes.js';
import nurseRoutes from './src/modules/nurse/nurseRoutes.js';
import pharmacyRoutes from './src/modules/pharmacy/pharmacyRoutes.js';
import ashaRoutes from './src/modules/asha/ashaRoutes.js';
import referralRoutes from './src/routes/referralRoutes.js';
import teleconsultRoutes from './src/routes/teleconsultRoutes.js';
import aiRoutes from './src/modules/ai/aiRoutes.js';
import queueRoutes from './src/modules/queue/queueRoutes.js';
import followUpRoutes from './src/routes/followUpRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import whatsappRoutes from './src/routes/whatsappRoutes.js';
import scribeRoutes from './src/routes/scribeRoutes.js';
import { initEpidemicScannerCron } from './cron/epidemicScanner.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[NETWORK REACHED] ${req.method} request to: ${req.url}`);
  next();
});

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/hospital-auth', hospitalAuthRoutes);
app.use('/api/govt', govtRoutes);
app.use('/api/hospital', hospitalAdminRoutes);
app.use('/api/auth', staffAuthRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/reception', receptionistRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/asha', ashaRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/teleconsult', teleconsultRoutes);
app.use('/api/appointments', teleconsultRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/follow-up', followUpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/scribe', scribeRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'SAHAY Backend API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send('SAHAY Backend API is running');
});

const startServer = async () => {
  try {
    await connectDB();
    // Initialize hourly Epidemic Radar scanner cron job
    initEpidemicScannerCron();
    app.listen(PORT, () => {
      console.log(`SAHAY backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
