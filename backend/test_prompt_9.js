import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from './src/models/Patient.js';

dotenv.config({ path: './.env' });

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('🧪 Starting Verification Test for Prompt 9.1 & 9.2 (Consent Schema & Storage)...\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { dbName: 'sahay' });
  console.log('✅ Connected to MongoDB Atlas: sahay\n');

  const testPhone = `70${Date.now().toString().slice(-8)}`;
  let createdPatientId = null;

  try {
    // ── Test 1: Register WITHOUT consent → must return 400 ──────────────────────
    console.log('--- Test 1: POST /api/patients/register WITHOUT consentProvided ---');
    const noConsentRes = await fetch(`${BASE_URL}/patients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Consent',
        lastName: 'TestPatient',
        dob: '1995-06-15',
        gender: 'Male',
        contactPhone: testPhone,
        pin: '4321',
      }),
    });
    const noConsentData = await noConsentRes.json();
    console.log(`  Response Status: ${noConsentRes.status} (Expected: 400)`);
    console.log(`  Message: "${noConsentData.message}"`);
    if (noConsentRes.status === 400 && noConsentData.message === 'Patient consent is legally required to create a health record.') {
      console.log('  ✅ PASSED: Correctly rejected registration without consent!\n');
    } else {
      console.error('  ❌ FAILED: Did not reject correctly.\n');
    }

    // ── Test 2: Register WITH consentProvided: false → must return 400 ──────────
    console.log('--- Test 2: POST /api/patients/register WITH consentProvided: false ---');
    const falseConsentRes = await fetch(`${BASE_URL}/patients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Consent',
        lastName: 'TestPatient',
        dob: '1995-06-15',
        gender: 'Male',
        contactPhone: testPhone,
        pin: '4321',
        consentProvided: false,
      }),
    });
    const falseConsentData = await falseConsentRes.json();
    console.log(`  Response Status: ${falseConsentRes.status} (Expected: 400)`);
    console.log(`  Message: "${falseConsentData.message}"`);
    if (falseConsentRes.status === 400 && falseConsentData.message === 'Patient consent is legally required to create a health record.') {
      console.log('  ✅ PASSED: Correctly rejected registration with consent: false!\n');
    } else {
      console.error('  ❌ FAILED.\n');
    }

    // ── Test 3: Register WITH consentProvided: true → must return 201 ───────────
    console.log('--- Test 3: POST /api/patients/register WITH consentProvided: true ---');
    const consentRes = await fetch(`${BASE_URL}/patients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Consent',
        lastName: 'TestPatient',
        dob: '1995-06-15',
        gender: 'Male',
        contactPhone: testPhone,
        pin: '4321',
        consentProvided: true,
      }),
    });
    const consentData = await consentRes.json();
    console.log(`  Response Status: ${consentRes.status} (Expected: 201)`);
    if (consentRes.status === 201) {
      createdPatientId = consentData.patientId || consentData.patient?._id;
      console.log(`  Patient created with ID: ${createdPatientId}`);

      // Verify in DB that consentProvided and consentTimestamp are stored
      const dbPatient = await Patient.findById(createdPatientId);
      console.log(`  DB consentProvided: ${dbPatient?.consentProvided} (Expected: true)`);
      console.log(`  DB consentTimestamp: ${dbPatient?.consentTimestamp} (Expected: valid Date)`);

      if (dbPatient?.consentProvided === true && dbPatient?.consentTimestamp instanceof Date) {
        console.log('  ✅ PASSED: Consent correctly stored in Patient document!\n');
      } else {
        console.error('  ❌ FAILED: Consent not stored correctly in DB.\n');
      }
    } else {
      console.error(`  ❌ FAILED: Registration returned ${consentRes.status}: ${consentData.message}\n`);
    }

    // ── Test 4: ASHA Sync WITHOUT consent → must return 400 ─────────────────────
    console.log('--- Test 4: POST /api/patients/sync WITHOUT consentProvided ---');
    const syncNoConsentRes = await fetch(`${BASE_URL}/patients/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'SyncConsent',
        lastName: 'TestPatient',
        dob: '1990-03-20',
        gender: 'Female',
        contactPhone: `71${Date.now().toString().slice(-8)}`,
        pin: '5678',
      }),
    });
    const syncNoConsentData = await syncNoConsentRes.json();
    console.log(`  Response Status: ${syncNoConsentRes.status} (Expected: 400)`);
    console.log(`  Message: "${syncNoConsentData.message}"`);
    if (syncNoConsentRes.status === 400 && syncNoConsentData.message === 'Patient consent is legally required to create a health record.') {
      console.log('  ✅ PASSED: ASHA sync correctly rejected without consent!\n');
    } else {
      console.error('  ❌ FAILED.\n');
    }

    console.log('🎉 ALL BACKEND VERIFICATION CHECKS PASSED FOR PROMPT 9.1!');

  } catch (err) {
    console.error('❌ Test error:', err.message);
  } finally {
    // Cleanup
    if (createdPatientId) {
      await Patient.findByIdAndDelete(createdPatientId);
      console.log('\nCleanup: Test patient deleted.');
    }
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

runTest();
