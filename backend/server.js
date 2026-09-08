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

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/hospital-auth', hospitalAuthRoutes);
app.use('/api/govt', govtRoutes);
app.use('/api/hospital', hospitalAdminRoutes);
app.use('/api/auth', staffAuthRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

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

const server = app.listen(PORT, () => {
  console.log(`SAHAY backend server running on port ${PORT}`);
});

export default app;
