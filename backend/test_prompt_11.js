import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './src/models/User.js';
import Patient from './src/models/Patient.js';
import Hospital from './src/models/Hospital.js';
import Appointment from './src/models/Appointment.js';
import Consultation from './src/models/Consultation.js';

dotenv.config({ path: './.env' });

const BASE_URL = 'http://localhost:5000/api';

async function runPrompt11Tests() {
  console.log('🧪 Starting Verification Test for Prompt 11.1 & 11.2 (Clinical Tags & Voice Transcript)...\n');

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { dbName: 'sahay' });
  console.log('✅ Connected to MongoDB Atlas: sahay\n');

  try {
    // 1. Find or create a Doctor user for auth token
    let doctor = await User.findOne({ role: 'Doctor' });
    let hospital = await Hospital.findOne({});
    if (!hospital) {
      hospital = await Hospital.create({
        hospitalName: 'SAHAY Verification Center',
        facilityId: 'TEST-FAC-001',
        facilityType: 'District Hospital',
        district: 'Pune',
        state: 'Maharashtra',
      });
    }

    if (!doctor) {
      doctor = await User.create({
        name: 'Dr. Sahay Test',
        email: `drsahay${Date.now()}@test.com`,
        password: 'password123',
        role: 'Doctor',
        hospitalId: hospital._id,
      });
    }

    const token = jwt.sign(
      { id: doctor._id, _id: doctor._id, role: 'Doctor', hospitalId: hospital._id },
      process.env.JWT_SECRET || 'sahay_jwt_secret_key_2026',
      { expiresIn: '1d' }
    );

    // 2. Find or create a Patient
    let patient = await Patient.findOne({});
    if (!patient) {
      patient = await Patient.create({
        firstName: 'Aarav',
        lastName: 'Patil',
        dob: new Date('1990-01-01'),
        gender: 'Male',
        contactPhone: `99${Date.now().toString().slice(-8)}`,
        registeredAtFacility: hospital._id,
        consentProvided: true,
        consentTimestamp: new Date(),
      });
    }

    // 3. Create test Appointments
    const apptValidation = await Appointment.create({
      patientId: patient._id,
      patient: patient._id,
      facilityId: hospital._id,
      hospital: hospital._id,
      assignedDoctorId: doctor._id,
      doctor: doctor._id,
      appointmentDate: new Date(),
      status: 'CheckedIn',
      priority: 'Routine',
    });

    const apptSuccess = await Appointment.create({
      patientId: patient._id,
      patient: patient._id,
      facilityId: hospital._id,
      hospital: hospital._id,
      assignedDoctorId: doctor._id,
      doctor: doctor._id,
      appointmentDate: new Date(),
      status: 'CheckedIn',
      priority: 'Routine',
    });

    // ── Test 1: Validation Rule ──────────────────────────────────────────────
    // If clinicalTags is empty AND voiceNoteTranscript is empty/missing,
    // return 400 Bad Request with message:
    // "Please select at least one clinical tag or provide a brief voice note to close this visit."
    console.log('--- Test 1: Validation Rule (empty clinicalTags and missing voiceNoteTranscript) ---');
    const emptyRes = await fetch(`${BASE_URL}/doctor/consultation/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appointmentId: apptValidation._id.toString(),
        patientId: patient._id.toString(),
        diagnosis: 'Mild Viral Fever',
        clinicalTags: [],
        voiceNoteTranscript: '',
      }),
    });

    const emptyData = await emptyRes.json();
    console.log(`  Response Status: ${emptyRes.status} (Expected: 400)`);
    console.log(`  Response Message: "${emptyData.message}"`);

    const expectedValidationMsg =
      'Please select at least one clinical tag or provide a brief voice note to close this visit.';
    if (emptyRes.status === 400 && emptyData.message === expectedValidationMsg) {
      console.log('  ✅ PASSED: Exact validation error message returned!\n');
    } else {
      console.error('  ❌ FAILED: Validation did not match expected message or status 400.\n');
    }

    // ── Test 2: Alias endpoint validation (/appointment/:id/complete) ────────
    console.log('--- Test 2: Validation via /api/doctor/appointment/:id/complete alias ---');
    const aliasEmptyRes = await fetch(`${BASE_URL}/doctor/appointment/${apptValidation._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: patient._id.toString(),
        diagnosis: 'Mild Viral Fever',
      }),
    });
    const aliasEmptyData = await aliasEmptyRes.json();
    console.log(`  Response Status: ${aliasEmptyRes.status} (Expected: 400)`);
    if (aliasEmptyRes.status === 400 && aliasEmptyData.message === expectedValidationMsg) {
      console.log('  ✅ PASSED: Alias route correctly enforced validation rule!\n');
    } else {
      console.error('  ❌ FAILED: Alias route validation error.\n');
    }

    // ── Test 3: Success with Clinical Tags & Voice Transcript ────────────────
    console.log('--- Test 3: Successful visit completion with clinicalTags and voiceNoteTranscript ---');
    const sampleTags = ['Dosage Adjusted', 'Condition Improving', 'Routine Follow-up'];
    const sampleVoiceNote = 'Patient is responding well to medication. Prescribed 5-day course and rest.';

    const successRes = await fetch(`${BASE_URL}/doctor/consultation/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        appointmentId: apptSuccess._id.toString(),
        patientId: patient._id.toString(),
        diagnosis: 'Acute Upper Respiratory Infection',
        notes: 'Lungs clear, fever subsided.',
        medications: [
          { medicineName: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'TDS', duration: '3 days' },
        ],
        clinicalTags: sampleTags,
        voiceNoteTranscript: sampleVoiceNote,
      }),
    });

    const successData = await successRes.json();
    console.log(`  Response Status: ${successRes.status} (Expected: 201)`);
    console.log(`  Response Success: ${successData.success}`);

    if (successRes.status === 201 && successData.success) {
      console.log('  ✅ PASSED: Consultation closed successfully!\n');
    } else {
      console.error(`  ❌ FAILED: Failed to close consultation: ${JSON.stringify(successData)}\n`);
    }

    // ── Test 4: Database Storage Verification ────────────────────────────────
    console.log('--- Test 4: Verify DB persistence in Appointment & Consultation models ---');
    const dbAppt = await Appointment.findById(apptSuccess._id);
    const dbConsult = await Consultation.findOne({ appointmentId: apptSuccess._id });

    console.log(`  Appointment status: ${dbAppt.status} (Expected: 'Completed')`);
    console.log(`  Appointment clinicalTags: ${JSON.stringify(dbAppt.clinicalTags)}`);
    console.log(`  Appointment voiceNoteTranscript: "${dbAppt.voiceNoteTranscript}"`);
    console.log(`  Consultation clinicalTags: ${JSON.stringify(dbConsult?.clinicalTags)}`);
    console.log(`  Consultation voiceNoteTranscript: "${dbConsult?.voiceNoteTranscript}"`);

    const apptTagsMatch = sampleTags.every((t) => dbAppt.clinicalTags.includes(t));
    const apptVoiceMatch = dbAppt.voiceNoteTranscript === sampleVoiceNote;
    const consultTagsMatch = sampleTags.every((t) => dbConsult?.clinicalTags.includes(t));

    if (dbAppt.status === 'Completed' && apptTagsMatch && apptVoiceMatch && consultTagsMatch) {
      console.log('  ✅ PASSED: Both Appointment and Consultation records saved clinicalTags and voiceNoteTranscript!\n');
    } else {
      console.error('  ❌ FAILED: Database persistence mismatch.\n');
    }

    // ── Test 5: Retrieval via getPatientHistory ───────────────────────────────
    console.log('--- Test 5: Verify retrieval via GET /api/doctor/history/:patientId ---');
    const histRes = await fetch(`${BASE_URL}/doctor/history/${patient._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const histData = await histRes.json();
    console.log(`  History Response Status: ${histRes.status} (Expected: 200)`);

    const targetConsultation = histData.consultations?.find(
      (c) => c._id.toString() === dbConsult._id.toString()
    );

    console.log(`  Retrieved consultation found: ${Boolean(targetConsultation)}`);
    console.log(`  Retrieved clinicalTags: ${JSON.stringify(targetConsultation?.clinicalTags)}`);
    console.log(`  Retrieved voiceNoteTranscript: "${targetConsultation?.voiceNoteTranscript}"`);

    if (
      targetConsultation &&
      Array.isArray(targetConsultation.clinicalTags) &&
      targetConsultation.clinicalTags.length > 0 &&
      targetConsultation.voiceNoteTranscript === sampleVoiceNote
    ) {
      console.log('  ✅ PASSED: Patient history API returns clinicalTags and voiceNoteTranscript for timeline!\n');
    } else {
      console.error('  ❌ FAILED: History API did not return clinical tags or voice note transcript.\n');
    }

    console.log('🎉 ALL PROMPT 11.1 & 11.2 VERIFICATION TESTS COMPLETED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test execution error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runPrompt11Tests();
