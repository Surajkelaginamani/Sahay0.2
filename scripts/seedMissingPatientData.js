/**
 * Prompt 13.3 — Database Migration Script (Dummy Data Backfill)
 *
 * Purpose:
 *   Backfill missing fields for existing Patient documents so the new
 *   dashboard UI does not break, and ensure every Patient has a linked
 *   User account for logging in.
 *
 * Usage:
 *   node scripts/seedMissingPatientData.js
 *
 * Environment:
 *   Reads MONGO_URI from backend/.env (or defaults to localhost).
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Resolve paths ────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sahay';

// ── Inline schemas (self-contained script — no import from backend) ─────────
const patientSchema = new mongoose.Schema({
  firstName:            String,
  lastName:             String,
  dob:                  Date,
  gender:               { type: String, enum: ['Male', 'Female', 'Other'] },
  bloodGroup:           { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  contactPhone:         String,
  address: {
    village:  String,
    district: String,
    state:    String,
    pincode:  String,
  },
  abhaId:               { type: String, sparse: true },
  userId:               { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  registeredAtFacility: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name:              String,
  email:             { type: String, sparse: true },
  phone:             { type: String, sparse: true },
  password:          String,
  role:              String,
  hospitalId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  patientProfileId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
}, { timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
const User    = mongoose.models.User    || mongoose.model('User', userSchema);

// ── Helper: generate random ABHA ID (XX-XXXX-XXXX-XXXX) ────────────────────
function generateAbhaId() {
  const digits = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const twoD   = () => String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${twoD()}-${digits()}-${digits()}-${digits()}`;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Prompt 13.3 — Patient Data Backfill & Auth Link Check  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Connect to MongoDB
  console.log(`📡 Connecting to MongoDB: ${MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  const patients = await Patient.find({});
  console.log(`📋 Found ${patients.length} Patient document(s).\n`);

  const DEFAULT_PASSWORD = 'Sahay@123';
  const hashedPassword   = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let backfilledCount = 0;
  let authLinkedCount = 0;
  let authCreatedCount = 0;

  for (const patient of patients) {
    const updates = {};
    let needsSave = false;

    // ── Backfill missing demographic fields ──────────────────────────────────
    if (!patient.dob) {
      updates.dob = new Date('1995-01-15');
      needsSave = true;
    }

    if (!patient.gender) {
      updates.gender = Math.random() < 0.5 ? 'Male' : 'Female';
      needsSave = true;
    }

    if (!patient.bloodGroup) {
      updates.bloodGroup = 'O+';
      needsSave = true;
    }

    if (!patient.address || (!patient.address.village && !patient.address.district)) {
      updates.address = {
        village:  '123 Main Street',
        district: 'Local Village',
        state:    'Karnataka',
        pincode:  '000000',
      };
      needsSave = true;
    }

    if (!patient.abhaId) {
      // Generate a unique ABHA ID (retry if collision)
      let abha;
      let attempts = 0;
      do {
        abha = generateAbhaId();
        attempts++;
      } while (attempts < 5 && await Patient.findOne({ abhaId: abha }));
      updates.abhaId = abha;
      needsSave = true;
    }

    if (needsSave) {
      await Patient.updateOne({ _id: patient._id }, { $set: updates });
      backfilledCount++;
      console.log(`  🔧 Backfilled: ${patient.firstName || '?'} ${patient.lastName || '?'} (${patient._id})`);
    }

    // ── Auth Link Check ─────────────────────────────────────────────────────
    if (!patient.userId) {
      const phone = patient.contactPhone;
      let user = null;

      // Try to find an existing User by phone
      if (phone) {
        user = await User.findOne({ phone, role: 'Patient' });
      }

      // If no User exists, create one
      if (!user) {
        const fullName = `${patient.firstName || 'Patient'} ${patient.lastName || 'Citizen'}`;
        const userEmail = phone
          ? `${phone}@patient.sahay.gov.in`
          : `patient_${patient._id}@patient.sahay.gov.in`;

        try {
          user = await User.create({
            name:     fullName,
            email:    userEmail,
            phone:    phone || undefined,
            password: hashedPassword, // already hashed
            role:     'Patient',
          });
          authCreatedCount++;
          console.log(`  🆕 Created User for: ${fullName} (phone: ${phone || 'N/A'})`);
        } catch (err) {
          // If duplicate email/phone, try to find the existing user
          if (err.code === 11000) {
            user = await User.findOne({
              $or: [
                ...(phone ? [{ phone }] : []),
                { email: userEmail },
              ],
              role: 'Patient',
            });
            if (user) {
              console.log(`  🔗 Found existing User for: ${fullName} (duplicate)`);
            } else {
              console.log(`  ⚠️  Could not create/find User for patient ${patient._id}: ${err.message}`);
              continue;
            }
          } else {
            console.log(`  ⚠️  Error creating User for patient ${patient._id}: ${err.message}`);
            continue;
          }
        }
      } else {
        console.log(`  🔗 Found existing User for: ${patient.firstName} ${patient.lastName}`);
      }

      // Link Patient → User
      patient.userId = user._id;
      await patient.save();

      // Link User → Patient (two-way)
      if (!user.patientProfileId || user.patientProfileId.toString() !== patient._id.toString()) {
        user.patientProfileId = patient._id;
        await User.updateOne({ _id: user._id }, { $set: { patientProfileId: patient._id } });
      }

      authLinkedCount++;
    }
  }

  console.log('\n────────────────────────────────────────────────');
  console.log('📊 Migration Summary:');
  console.log(`   Total patients scanned:    ${patients.length}`);
  console.log(`   Fields backfilled:         ${backfilledCount}`);
  console.log(`   Auth links established:    ${authLinkedCount}`);
  console.log(`   New User accounts created: ${authCreatedCount}`);
  console.log('────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB. Migration complete.\n');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
