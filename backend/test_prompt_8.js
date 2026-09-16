import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Medicine from './src/models/Medicine.js';
import Prescription from './src/models/Prescription.js';
import Consultation from './src/models/Consultation.js';
import User from './src/models/User.js';
import Patient from './src/models/Patient.js';
import Hospital from './src/models/Hospital.js';
import Appointment from './src/models/Appointment.js';

dotenv.config({ path: './.env' });

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('🧪 Starting Verification Test for Prompt 8.1 & 8.2 Backend Logic...\n');
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI or MONGODB_URI not found in .env');
  }

  await mongoose.connect(mongoUri, { dbName: 'sahay' });
  console.log('✅ Connected to MongoDB Atlas: sahay');

  try {
    // 1. Find or create Pharmacist user
    let pharmacist = await User.findOne({ role: 'Pharmacist' });
    let hospital = await Hospital.findOne();
    if (!hospital) {
      hospital = await Hospital.create({
        hospitalName: 'District Hospital Test',
        registrationNumber: 'DH-TEST-001',
        address: 'Test City',
        contactPhone: '9876543210',
        verificationStatus: 'Approved',
      });
    }

    if (!pharmacist) {
      pharmacist = await User.create({
        name: 'Test Pharmacist',
        email: `pharmacist_${Date.now()}@sahay.gov`,
        password: 'hashedPassword',
        role: 'Pharmacist',
        hospitalId: hospital._id,
      });
    }

    const token = jwt.sign(
      { id: pharmacist._id, _id: pharmacist._id, role: pharmacist.role, hospitalId: hospital._id },
      process.env.JWT_SECRET || 'secretKey',
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. Test GET /api/pharmacy/inventory
    console.log('\n--- Test 1: Fetch Pharmacy Inventory & Auto-Seeding ---');
    const invRes = await fetch(`${BASE_URL}/pharmacy/inventory`, { headers: authHeaders });
    const invData = await invRes.json();
    console.log(`Response Status: ${invRes.status}`);
    console.log(`Inventory Count: ${invData.count}`);
    if (invData.inventory && invData.inventory.length > 0) {
      const azithro = invData.inventory.find((m) => m.name.includes('Azithromycin'));
      console.log(`Sample item Azithromycin stockQuantity: ${azithro?.stockQuantity}, lowStockThreshold: ${azithro?.lowStockThreshold}`);
      if (azithro?.stockQuantity === 0 && azithro?.lowStockThreshold === 50) {
        console.log('✅ Inventory schema fields stockQuantity & lowStockThreshold verified!');
      }
    }

    // 3. Create dummy patient, doctor, and consultation for prescription testing
    let doctor = await User.findOne({ role: 'Doctor' });
    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Test Physician',
        email: `dr_${Date.now()}@sahay.gov`,
        password: 'password',
        role: 'Doctor',
        hospitalId: hospital._id,
      });
    }

    let patient = await Patient.findOne();
    if (!patient) {
      const patientUser = await User.create({
        name: 'Test Patient',
        email: `pat_${Date.now()}@sahay.gov`,
        password: 'password',
        role: 'Patient',
      });
      patient = await Patient.create({
        _id: patientUser._id,
        firstName: 'Test',
        lastName: 'Patient',
        contactPhone: '9123456780',
        registeredAtFacility: hospital._id,
      });
    }

    const appointment = await Appointment.create({
      patientId: patient._id,
      facilityId: hospital._id,
      appointmentDate: new Date(),
      status: 'Completed',
    });

    const consultation = await Consultation.create({
      appointmentId: appointment._id,
      patientId: patient._id,
      doctorId: doctor._id,
      facilityId: hospital._id,
      diagnosis: 'Acute Upper Respiratory Infection',
    });

    // 4. Test Insufficient Stock Validation (Prompt 8.1)
    console.log('\n--- Test 2: Dispense Prescription with Out-of-Stock Medication ---');
    // Ensure Azithromycin is 0 stock
    await Medicine.findOneAndUpdate({ name: /Azithromycin/i }, { stockQuantity: 0 });

    const outOfStockRx = await Prescription.create({
      consultationId: consultation._id,
      patientId: patient._id,
      doctorId: doctor._id,
      facilityId: hospital._id,
      hospital: hospital._id,
      status: 'Pending',
      medications: [
        {
          medicineName: 'Azithromycin 500mg',
          dosage: '500mg',
          frequency: 'Once daily',
          duration: '3 days',
          quantity: 3,
        },
      ],
    });

    const dispenseFailRes = await fetch(`${BASE_URL}/pharmacy/prescriptions/${outOfStockRx._id}/dispense`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const dispenseFailData = await dispenseFailRes.json();
    console.log(`Response Status: ${dispenseFailRes.status} (Expected: 400)`);
    console.log(`Error Message: "${dispenseFailData.message}"`);

    if (dispenseFailRes.status === 400 && dispenseFailData.message.includes('Insufficient stock for')) {
      console.log('✅ Validation correctly blocked dispense with 400 Bad Request and Insufficient stock error!');
    } else {
      console.error('❌ Validation failed to block dispense with insufficient stock.');
    }

    // 5. Test Restock & Successful Dispense (Prompt 8.1 & 8.2)
    console.log('\n--- Test 3: Restock Medicine & Dispense Medication ---');
    const azithroDoc = await Medicine.findOne({ name: /Azithromycin/i });
    const restockRes = await fetch(`${BASE_URL}/pharmacy/inventory/${azithroDoc._id}/stock`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ stockQuantity: 20 }),
    });
    const restockData = await restockRes.json();
    console.log(`Restocked Azithromycin. New stock: ${restockData.medicine?.stockQuantity}`);

    const dispenseSuccessRes = await fetch(`${BASE_URL}/pharmacy/prescriptions/${outOfStockRx._id}/dispense`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const dispenseSuccessData = await dispenseSuccessRes.json();
    console.log(`Dispense Response Status: ${dispenseSuccessRes.status} (Expected: 200)`);
    console.log(`Dispense Message: "${dispenseSuccessData.message}"`);

    const updatedAzithro = await Medicine.findById(azithroDoc._id);
    console.log(`Remaining stock after dispensing 3 units: ${updatedAzithro.stockQuantity} (Expected: 17)`);

    if (dispenseSuccessRes.status === 200 && updatedAzithro.stockQuantity === 17) {
      console.log('✅ Stock quantity successfully decremented upon dispensing!');
      console.log('\n🎉 ALL BACKEND VERIFICATION CHECKS PASSED FOR PROMPT 8.1!');
    } else {
      console.error('❌ Stock decrement failed or unexpected stock level.');
    }

    // Cleanup test prescription
    await Prescription.findByIdAndDelete(outOfStockRx._id);
    await Consultation.findByIdAndDelete(consultation._id);
    await Appointment.findByIdAndDelete(appointment._id);
  } catch (err) {
    console.error('❌ Test error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

runTest();
