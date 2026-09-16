import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './src/models/User.js';
import Patient from './src/models/Patient.js';

dotenv.config({ path: './.env' });

const BASE_URL = 'http://localhost:5000/api';

async function testPrompt71() {
  console.log('🧪 Starting Prompt 7.1 Patient PIN Authentication Verification...\n');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const testPhone = `99${Date.now().toString().slice(-8)}`;
  const testPin = '7890';
  const testSyncPhone = `88${Date.now().toString().slice(-8)}`;
  const testSyncPin = '3456';

  try {
    // 1. Test Self-Registration with 4-Digit PIN
    console.log(`\n--- Test 1: Self-Registration with 4-Digit PIN (${testPhone}) ---`);
    const regPayload = {
      firstName: 'Aarav',
      lastName: 'Sharma',
      dob: '1995-04-12',
      gender: 'Male',
      contactPhone: testPhone,
      pin: testPin,
      isSelfRegister: true,
    };

    const regRes = await fetch(`${BASE_URL}/patients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });
    const regData = await regRes.json();

    if (regRes.status !== 201 || !regData.token) {
      throw new Error(`Registration failed (${regRes.status}): ${JSON.stringify(regData)}`);
    }
    console.log('✅ Registered successfully with PIN. Token received.');
    if (regData.pin || regData.patient?.pin) {
      throw new Error('❌ PIN leaked in registration response!');
    }
    console.log('✅ PIN is NOT leaked in registration response');

    // 2. Direct DB verification: PIN is hashed with bcrypt
    console.log('\n--- Test 2: Database Hash Verification ---');
    const userDoc = await User.findById(regData._id);
    const patientDoc = await Patient.findById(regData.patientId);

    if (!userDoc.pin || !userDoc.pin.startsWith('$2')) {
      throw new Error(`User PIN is not a bcrypt hash! Found: ${userDoc.pin}`);
    }
    console.log(`✅ User.pin is hashed with bcrypt: ${userDoc.pin.slice(0, 15)}...`);

    if (!patientDoc.pin || !patientDoc.pin.startsWith('$2')) {
      throw new Error(`Patient PIN is not a bcrypt hash! Found: ${patientDoc.pin}`);
    }
    console.log(`✅ Patient.pin is hashed with bcrypt: ${patientDoc.pin.slice(0, 15)}...`);

    // Verify bcrypt compare
    const isUserPinValid = await bcrypt.compare(testPin, userDoc.pin);
    const isPatientPinValid = await bcrypt.compare(testPin, patientDoc.pin);
    if (!isUserPinValid || !isPatientPinValid) {
      throw new Error('bcrypt.compare failed on stored pin hashes!');
    }
    console.log('✅ Stored bcrypt hashes successfully verify entered PIN.');

    // 3. Test POST /api/auth/patient/login with correct credentials
    console.log('\n--- Test 3: POST /api/auth/patient/login (Success Case) ---');
    const loginRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, pin: testPin }),
    });
    const loginData = await loginRes.json();

    if (loginRes.status !== 200 || !loginData.token) {
      throw new Error(`Login at /api/auth/patient/login failed (${loginRes.status}): ${JSON.stringify(loginData)}`);
    }
    console.log('✅ POST /api/auth/patient/login succeeded. Token received.');
    if (loginData.pin || loginData.patient?.pin) {
      throw new Error('❌ PIN leaked in login response!');
    }
    console.log('✅ PIN is NOT leaked in login response');

    // 4. Test POST /api/auth/patient/login with incorrect PIN -> 401
    console.log('\n--- Test 4: POST /api/auth/patient/login (Wrong PIN -> 401) ---');
    const wrongPinRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, pin: '0000' }),
    });
    const wrongPinData = await wrongPinRes.json();
    if (wrongPinRes.status !== 401) {
      throw new Error(`Expected 401 for wrong PIN, got ${wrongPinRes.status}: ${JSON.stringify(wrongPinData)}`);
    }
    console.log(`✅ Wrong PIN correctly rejected with 401: "${wrongPinData.message}"`);

    // 5. Test Missing Phone / Missing PIN -> 400
    console.log('\n--- Test 5: Missing Phone / PIN Validation (400) ---');
    const missingPinRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    if (missingPinRes.status !== 400) {
      throw new Error(`Expected 400 for missing PIN, got ${missingPinRes.status}`);
    }
    console.log('✅ Missing PIN correctly rejected with 400');

    const missingPhoneRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: testPin }),
    });
    if (missingPhoneRes.status !== 400) {
      throw new Error(`Expected 400 for missing Phone, got ${missingPhoneRes.status}`);
    }
    console.log('✅ Missing Phone correctly rejected with 400');

    // 6. Test Dual Endpoint: POST /api/patients/login
    console.log('\n--- Test 6: Dual Endpoint POST /api/patients/login ---');
    const dualRes = await fetch(`${BASE_URL}/patients/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, pin: testPin }),
    });
    const dualData = await dualRes.json();
    if (dualRes.status !== 200 || !dualData.token) {
      throw new Error(`Dual endpoint login failed (${dualRes.status}): ${JSON.stringify(dualData)}`);
    }
    console.log('✅ POST /api/patients/login also works seamlessly.');

    // 7. Test Offline Sync with PIN: POST /api/patients/sync
    console.log('\n--- Test 7: Offline ASHA Sync with PIN (POST /api/patients/sync) ---');
    const syncRes = await fetch(`${BASE_URL}/patients/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Priya',
        lastName: 'Patel',
        dob: '1998-08-20',
        gender: 'Female',
        contactPhone: testSyncPhone,
        pin: testSyncPin,
      }),
    });
    const syncData = await syncRes.json();
    if (syncRes.status !== 201) {
      throw new Error(`Sync failed (${syncRes.status}): ${JSON.stringify(syncData)}`);
    }
    console.log('✅ Offline patient synced successfully with PIN.');

    // Verify synced patient can log in with their PIN
    const syncLoginRes = await fetch(`${BASE_URL}/auth/patient/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testSyncPhone, pin: testSyncPin }),
    });
    const syncLoginData = await syncLoginRes.json();
    if (syncLoginRes.status !== 200 || !syncLoginData.token) {
      throw new Error(`Synced patient login failed (${syncLoginRes.status}): ${JSON.stringify(syncLoginData)}`);
    }
    console.log('✅ Offline synced patient successfully authenticated with PIN.');

    // Clean up test documents
    console.log('\n--- Cleanup ---');
    await User.deleteMany({ phone: { $in: [testPhone, testSyncPhone] } });
    await Patient.deleteMany({ contactPhone: { $in: [testPhone, testSyncPhone] } });
    console.log('✅ Cleaned up test records');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY FOR PROMPT 7.1 BACKEND! 🎉\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testPrompt71();
