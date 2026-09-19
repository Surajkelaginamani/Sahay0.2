import crypto from 'crypto';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import AuditLog from '../models/AuditLog.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

// ─── Staff Email Password Reset (Section 2) ───────────────────────────────────

/**
 * @desc    Generate password reset token & email reset link to staff member
 * @route   POST /api/auth/staff/forgot-password
 * @access  Public
 */
export const staffForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please provide a registered staff email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Return 200/404 based on UX preference; returning 404 with clean message
      return res.status(404).json({ message: 'No staff account found with this email address.' });
    }

    if (user.role === 'Patient') {
      return res.status(403).json({
        message: 'Patient accounts must use reception-mediated PIN recovery at a SAHAY clinic.',
      });
    }

    // Generate random 32-byte crypto hex token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token via SHA-256 for secure DB persistence
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
    await user.save({ validateBeforeSave: false });

    // Construct clickable password reset link
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/staff/reset-password/${resetToken}`;

    const subject = 'SAHAY Portal — Hospital Staff Password Reset Request';
    const text = `Hello ${user.name},\n\nYou requested a password reset for your SAHAY Hospital Staff account.\n\nPlease click the link below or copy and paste it into your browser to reset your password:\n\n${resetUrl}\n\nThis link is valid for 15 minutes.\n\nIf you did not make this request, please contact your hospital administrator immediately.\n\nSAHAY National Health Network`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px;">
        <h2 style="color: #0369a1; margin-top: 0;">SAHAY National Health Network</h2>
        <p style="font-size: 14px; color: #334155;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 14px; color: #334155;">You recently requested to reset your password for your SAHAY staff account (Role: <strong>${user.role}</strong>).</p>
        <p style="font-size: 14px; color: #334155;">Click the button below to choose a new password. This secure link expires in <strong>15 minutes</strong>.</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Reset My Password</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Or copy this link to your browser:<br/><a href="${resetUrl}" style="color: #0284c7;">${resetUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">If you did not request this password reset, please notify your facility administrator immediately.</p>
      </div>
    `;

    await sendEmail({ to: user.email, subject, text, html });

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to your registered email address.',
      resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
    });
  } catch (error) {
    console.error('[Staff Forgot Password] Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Reset staff password using unhashed token, clear token, and log user in
 * @route   PATCH /api/auth/staff/reset-password/:token
 * @access  Public
 */
export const staffResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Password reset token is required.' });
    }

    if (!password || String(password).trim().length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Hash token from param to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired password reset link. Please submit a new reset request.',
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = String(password).trim();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    console.log(`[Staff Reset Password] Password successfully reset for: ${user.email}`);

    // Generate login token
    const jwtToken = generateToken(user._id, user.role, user.hospitalId);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      token: jwtToken,
      role: user.role,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
      },
    });
  } catch (error) {
    console.error('[Staff Reset Password] Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// ─── Secure Patient PIN Reset (Section 3) ─────────────────────────────────────

/**
 * @desc    Receptionist/Admin 3-step security gate to verify & assign temporary PIN
 * @route   PATCH /api/auth/patient/:id/verify-and-reset-pin
 * @access  Private (Receptionist, HospitalAdmin, Admin, FacilityAdmin)
 */
export const verifyAndResetPatientPin = async (req, res) => {
  try {
    const { id } = req.params;
    const { recoveryCode, fatherOrGuardianName, yearOfBirth, newTemporaryPin } = req.body;

    if (!recoveryCode || !fatherOrGuardianName || !yearOfBirth || !newTemporaryPin) {
      return res.status(400).json({
        message: 'Please provide all required fields: recoveryCode, fatherOrGuardianName, yearOfBirth, and newTemporaryPin.',
      });
    }

    // Validate 4-digit temporary PIN
    const cleanPin = String(newTemporaryPin).trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ message: 'Temporary PIN must be exactly 4 numeric digits.' });
    }

    // Look up patient by ObjectId or UHID
    let patient = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(id);
    }
    if (!patient) {
      patient = await Patient.findOne({ uhid: id.trim().toUpperCase() });
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient record not found.' });
    }

    // Rate Limiting: If 3 or more failed attempts, block the request
    if ((patient.pinResetAttempts || 0) >= 3) {
      return res.status(429).json({
        message: 'Security Lockout: Maximum PIN reset attempts (3) exceeded for this patient. Contact hospital administrator to unlock.',
        isLocked: true,
      });
    }

    // ── Challenge 1: Physical Proof (Recovery Code from Physical Card) ────────
    const cleanRecoveryCode = String(recoveryCode).trim().toUpperCase();
    let isCodeMatch = false;
    if (patient.recoveryCodeHash) {
      isCodeMatch = await bcrypt.compare(cleanRecoveryCode, patient.recoveryCodeHash);
    }

    // ── Challenge 2: Identity Challenge (Year of Birth) ──────────────────────
    const cleanYob = String(yearOfBirth).trim();
    const patientYob = patient.dob ? new Date(patient.dob).getFullYear().toString() : '';
    const isYobMatch = Boolean(patientYob && cleanYob === patientYob);

    // ── Challenge 3: Identity Challenge (Guardian Name) ──────────────────────
    const cleanInputGuardian = String(fatherOrGuardianName).trim().toLowerCase();
    const patientGuardian = (patient.fatherOrGuardianName || patient.emergencyContact?.name || '')
      .trim()
      .toLowerCase();
    const isGuardianMatch = Boolean(cleanInputGuardian && patientGuardian && cleanInputGuardian === patientGuardian);

    // Verification evaluation
    if (!isCodeMatch || !isYobMatch || !isGuardianMatch) {
      patient.pinResetAttempts = (patient.pinResetAttempts || 0) + 1;
      await patient.save();

      const remainingAttempts = Math.max(0, 3 - patient.pinResetAttempts);
      const failureReason = !isCodeMatch
        ? 'Physical Recovery Code is invalid.'
        : !isYobMatch
        ? 'Year of Birth does not match patient records.'
        : 'Father or Guardian Name does not match patient records.';

      return res.status(400).json({
        message: `Security validation failed: ${failureReason} Remaining attempts before lockout: ${remainingAttempts}`,
        pinResetAttempts: patient.pinResetAttempts,
        remainingAttempts,
      });
    }

    // ── Success Logic ────────────────────────────────────────────────────────
    // Set temporary PIN on patient
    patient.pin = cleanPin;
    patient.isTemporaryPin = true;
    patient.pinResetAttempts = 0;
    await patient.save();

    // Synchronize to linked User if exists
    if (patient.userId) {
      const user = await User.findById(patient.userId);
      if (user) {
        user.pin = cleanPin;
        user.isTemporaryPin = true;
        await user.save();
      }
    }

    // Log immutable event in AuditLog
    await AuditLog.create({
      action: 'PATIENT_PIN_RESET',
      performedBy: req.user._id,
      targetId: patient._id,
      targetModel: 'Patient',
      uhid: patient.uhid || '—',
      details: {
        receptionistId: req.user._id,
        receptionistName: req.user.name,
        patientName: `${patient.firstName} ${patient.lastName}`,
        resetTimestamp: new Date(),
      },
    });

    console.log(
      `[Patient PIN Reset] Receptionist "${req.user.name}" reset PIN for patient UHID: "${patient.uhid}"`
    );

    return res.status(200).json({
      success: true,
      message: 'Temporary PIN successfully assigned. The patient must change this PIN upon next login.',
      isTemporaryPin: true,
      patient: {
        _id: patient._id,
        uhid: patient.uhid,
        fullName: `${patient.firstName} ${patient.lastName}`,
        isTemporaryPin: true,
      },
    });
  } catch (error) {
    console.error('[Verify & Reset PIN] Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Patient first-use block: Force change temporary PIN to secret PIN
 * @route   PATCH /api/auth/patient/change-temporary-pin
 * @access  Private (Patient)
 */
export const changeTemporaryPin = async (req, res) => {
  try {
    const { newPin } = req.body;

    if (!newPin || !/^\d{4}$/.test(String(newPin).trim())) {
      return res.status(400).json({ message: 'New PIN must be exactly 4 numeric digits.' });
    }

    const cleanPin = String(newPin).trim();

    // Fetch user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    user.pin = cleanPin;
    user.isTemporaryPin = false;
    await user.save();

    // Synchronize linked patient profile
    let patient = null;
    if (user.patientProfileId) {
      patient = await Patient.findById(user.patientProfileId);
    } else {
      patient = await Patient.findOne({ userId: user._id });
    }

    if (patient) {
      patient.pin = cleanPin;
      patient.isTemporaryPin = false;
      patient.pinResetAttempts = 0;
      await patient.save();
    }

    console.log(`[Change Temporary PIN] Patient "${user.name}" successfully created new secret PIN.`);

    return res.status(200).json({
      success: true,
      message: 'New secret PIN created successfully. Your account is now fully secured.',
      isTemporaryPin: false,
    });
  } catch (error) {
    console.error('[Change Temporary PIN] Error:', error);
    return res.status(500).json({ message: error.message });
  }
};
