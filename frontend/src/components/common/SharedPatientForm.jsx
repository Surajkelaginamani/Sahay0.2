import React, { useState } from 'react';
import { AlertTriangle, ClipboardList, CreditCard, Info, Key, MapPin, Phone, Shield, UserPlus, X } from 'lucide-react';

// ─── Field config ──────────────────────────────────────────────────────────────
const GENDERS    = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY_FORM = {
  firstName: '', lastName: '', dob: '', gender: 'Male',
  fatherOrGuardianName: '',
  bloodGroup: '', contactPhone: '',
  address: { village: '', district: '', state: '', pincode: '' },
  abhaId: '',
  email: '', password: '',
  pin: '', // Prompt 7.1
};

// ─── Tiny field components ─────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

function Input({ error, ...props }) {
  return (
    <>
      <input
        {...props}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2
          focus:ring-rose-400 focus:border-rose-400 transition-all bg-slate-50 focus:bg-white
          ${error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'}`}
      />
      {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
    </>
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none
        focus:ring-2 focus:ring-rose-400 bg-slate-50 focus:bg-white transition-all"
    >
      {children}
    </select>
  );
}

// ─── SharedPatientForm ─────────────────────────────────────────────────────────
// Props:
//   isSelfRegister — if true, password is visible/required; if false, hidden (Receptionist mode)
//   onSubmit(payload) — called with the validated form payload
//   loading — external loading state
//   apiError — external error message to show
//   successAlert — external success message to show
export default function SharedPatientForm({
  isSelfRegister = false,
  onSubmit,
  onUseExisting,
  loading = false,
  apiError = '',
  successAlert = '',
}) {
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin]           = useState(false);
  const [consentProvided, setConsentProvided] = useState(false); // Prompt 9.2: Mandatory consent checkbox

  // ── Prompt 2.3: Disambiguation modal state ──────────────────────────────────
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    matches: [],
    payload: null,
  });
  const [isProceeding, setIsProceeding] = useState(false);
  const [adviceNotice, setAdviceNotice] = useState(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
  };
  const setAddress = (key, val) =>
    setForm((f) => ({ ...f, address: { ...f.address, [key]: val } }));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.dob)              e.dob       = 'Date of birth is required';
    if (!form.gender)           e.gender    = 'Gender is required';
    if (!form.fatherOrGuardianName.trim()) {
      e.fatherOrGuardianName = 'Father or Guardian name is required';
    }
    if (!form.contactPhone.trim()) {
      e.contactPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(form.contactPhone.trim())) {
      e.contactPhone = 'Must be a 10-digit number';
    }
    if (form.email && form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    // 4-digit PIN validation (Prompt 7.1)
    if (isSelfRegister) {
      if (!form.pin || !form.pin.trim()) {
        e.pin = '4-digit PIN is required';
      } else if (!/^\d{4}$/.test(form.pin.trim())) {
        e.pin = 'PIN must be exactly 4 numeric digits (0-9)';
      }
    } else {
      if (form.pin && !/^\d{4}$/.test(form.pin.trim())) {
        e.pin = 'PIN must be exactly 4 numeric digits';
      }
    }
    // Password validation only for self-registration if entered
    if (isSelfRegister && form.password && form.password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }
    if (form.abhaId && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(form.abhaId.trim())) {
      e.abhaId = 'Format: XX-XXXX-XXXX-XXXX';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!validate()) return;
    setAdviceNotice(null);

    const cleanPin = form.pin ? form.pin.trim() : (isSelfRegister ? undefined : '1234');

    const payload = {
      firstName:    form.firstName.trim(),
      lastName:     form.lastName.trim(),
      name:         `${form.firstName.trim()} ${form.lastName.trim()}`,
      dob:          form.dob,
      gender:       form.gender,
      fatherOrGuardianName: form.fatherOrGuardianName.trim(),
      email:        form.email.trim().toLowerCase() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      phone:        form.contactPhone.trim() || undefined,
      bloodGroup:   form.bloodGroup          || undefined,
      address:      form.address,
      abhaId:       form.abhaId.trim()       || undefined,
      pin:          cleanPin,
      isSelfRegister,
      consentProvided: true, // Prompt 9.1 & 9.2: Explicit patient consent
    };

    if (isSelfRegister) {
      payload.password = form.password ? form.password.trim() : (cleanPin ? `Sahay@${cleanPin}` : undefined);
    } else {
      // Receptionist mode: use entered password or fallback to default
      payload.password = form.password ? form.password.trim() : `Sahay@${cleanPin}`;
    }

    const resetCallback = () => {
      setForm(EMPTY_FORM);
      setConsentProvided(false);
      setErrors({});
      setAdviceNotice(null);
    };

    const res = await onSubmit?.(payload, resetCallback);
    if (res?.requiresConfirmation || res?.data?.requiresConfirmation) {
      const matches = res.matches || res.data?.matches || [];
      setConfirmationModal({
        isOpen: true,
        matches,
        payload,
      });
    }
  };

  // ── Prompt 2.3 Modal Actions ────────────────────────────────────────────────
  // Button 1: "Use Existing Profile"
  const handleUseExisting = (match) => {
    const targetUhid = match?.uhid;
    const matchName = match?.name || `${match?.firstName || ''} ${match?.lastName || ''}`.trim();
    setConfirmationModal({ isOpen: false, matches: [], payload: null });
    setAdviceNotice({
      name: matchName,
      uhid: targetUhid,
      message: targetUhid && targetUhid !== '—'
        ? `Registration cancelled. Please search for UHID: ${targetUhid} to access ${matchName || 'this patient'}'s existing profile.`
        : 'Registration cancelled. Please search for this patient in the system to access their existing profile.',
    });
    onUseExisting?.(match);
  };

  // Button 2: "This is a Different Person (Proceed)"
  const handleProceedCreateNew = async () => {
    if (!confirmationModal.payload) return;
    const forcePayload = {
      ...confirmationModal.payload,
      forceCreateNew: true,
    };
    setIsProceeding(true);
    setAdviceNotice(null);

    const resetCallback = () => {
      setForm(EMPTY_FORM);
      setConsentProvided(false);
      setErrors({});
      setAdviceNotice(null);
    };

    try {
      await onSubmit?.(forcePayload, resetCallback);
      setConfirmationModal({ isOpen: false, matches: [], payload: null });
    } finally {
      setIsProceeding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative" noValidate>
      {/* ── Advice Notice (when existing profile chosen) ────────────────────── */}
      {adviceNotice && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-start justify-between gap-3 text-xs text-sky-900 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{adviceNotice.message}</p>
              {adviceNotice.uhid && adviceNotice.uhid !== '—' && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-sky-200 font-mono font-bold text-violet-700 text-xs">
                    <CreditCard className="w-3.5 h-3.5 text-violet-600" />
                    ID: {adviceNotice.uhid}
                  </span>
                  <span className="text-[11px] text-sky-600 font-medium">Use this ID to find existing profile</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdviceNotice(null)}
            className="text-sky-400 hover:text-sky-600 text-xs font-bold"
          ><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-px bg-slate-100" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {isSelfRegister ? 'Your Details' : 'New Patient Details'}
        </p>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>First Name</Label>
          <Input
            type="text" placeholder="e.g. Ramesh"
            value={form.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            error={errors.firstName}
          />
        </div>
        <div>
          <Label required>Last Name</Label>
          <Input
            type="text" placeholder="e.g. Kumar"
            value={form.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            error={errors.lastName}
          />
        </div>
      </div>

      {/* DOB / Gender / Blood Group */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label required>Date of Birth</Label>
          <Input
            type="date" value={form.dob}
            onChange={(e) => setField('dob', e.target.value)}
            error={errors.dob}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div>
          <Label required>Gender</Label>
          <Select value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </div>
        <div>
          <Label>Blood Group</Label>
          <Select value={form.bloodGroup} onChange={(e) => setField('bloodGroup', e.target.value)}>
            <option value="">— Select —</option>
            {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </div>
      </div>

      {/* Phone & Guardian Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label required>Contact Phone</Label>
          <Input
            type="tel" placeholder="10-digit mobile number"
            value={form.contactPhone}
            onChange={(e) => setField('contactPhone', e.target.value)}
            error={errors.contactPhone}
          />
        </div>
        <div>
          <Label required>Father / Guardian Name</Label>
          <Input
            type="text" placeholder="e.g. Suresh Kumar"
            value={form.fatherOrGuardianName}
            onChange={(e) => setField('fatherOrGuardianName', e.target.value)}
            error={errors.fatherOrGuardianName}
          />
        </div>
      </div>

      {/* ABHA ID */}
      <div>
        <Label>ABHA ID
          <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">
            (Ayushman Bharat Health Account — optional)
          </span>
        </Label>
        <Input
          type="text" placeholder="XX-XXXX-XXXX-XXXX"
          value={form.abhaId}
          onChange={(e) => setField('abhaId', e.target.value)}
          error={errors.abhaId}
        />
      </div>

      {/* ── Login Credentials ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-slate-100" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {isSelfRegister ? 'Create Your Login' : 'Patient Login Credentials'}
        </p>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {!isSelfRegister && (
        <p className="text-[11px] text-slate-400 -mt-3">
          These credentials allow the patient to log in to the SAHAY patient portal later.
        </p>
      )}

      {/* Success Alert Banner */}
      {successAlert && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-xs animate-fadeIn">
          <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-bold text-emerald-900 text-sm">Registration Successful!</p>
            <p className="mt-0.5 text-emerald-800">{successAlert}</p>
          </div>
        </div>
      )}

      <div>
        <Label>Email Address <span className="text-[10px] font-normal text-slate-400 normal-case">(Optional)</span></Label>
        <Input
          type="email" placeholder="patient@example.com (optional)"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          error={errors.email}
        />
      </div>

      {/* ── Set 4-Digit PIN (Prompt 7.1) ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label required={isSelfRegister}>
            Set 4-Digit PIN
            {!isSelfRegister && (
              <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">(Defaults to 1234 if blank)</span>
            )}
          </Label>
          <span className="text-[10px] text-mint-700 bg-mint-50 px-2 py-0.5 rounded-full font-medium border border-mint-200">
            For Citizen Portal Login
          </span>
        </div>
        <div className="relative">
          <input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder={isSelfRegister ? 'Create a 4-digit PIN (e.g. 1234)' : 'Default: 1234'}
            value={form.pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setField('pin', val);
            }}
            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm font-mono tracking-widest focus:outline-none focus:ring-2
              focus:ring-mint-500 focus:border-mint-500 transition-all bg-slate-50 focus:bg-white
              ${errors.pin ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'}`}
          />
          <button
            type="button"
            onClick={() => setShowPin((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
            title={showPin ? 'Hide PIN' : 'Show PIN'}
          >
            {showPin ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.pin ? (
          <p className="text-[11px] text-rose-600 mt-1">{errors.pin}</p>
        ) : (
          <p className="text-[11px] text-slate-400 mt-1">
            4-digit security PIN used with your phone number to sign into the patient portal.
          </p>
        )}
      </div>

      {/* Optional Password */}
      <div>
        <Label>
          Account Password <span className="text-[10px] font-normal text-slate-400 normal-case">(Optional fallback)</span>
        </Label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={isSelfRegister ? 'Optional backup password (min 6 chars)' : 'Default: Sahay@123'}
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm focus:outline-none focus:ring-2
              focus:ring-rose-400 focus:border-rose-400 transition-all bg-slate-50 focus:bg-white
              ${errors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="text-[11px] text-rose-600 mt-1">{errors.password}</p>}
      </div>

      {/* Address */}
      <div>
        <Label>Address</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'village', placeholder: 'Village / Area' },
            { key: 'district', placeholder: 'District' },
            { key: 'state', placeholder: 'State' },
            { key: 'pincode', placeholder: 'Pincode' },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              type="text"
              placeholder={placeholder}
              value={form.address[key]}
              onChange={(e) => setAddress(key, e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 bg-slate-50 focus:bg-white transition-all"
            />
          ))}
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{apiError}</span>
        </div>
      )}

      {/* ── Prompt 9.2: Digital Health Record Consent Checkbox ──────────────── */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 transition-all hover:bg-slate-100/60">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={consentProvided}
            onChange={(e) => setConsentProvided(e.target.checked)}
            required
            className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 shrink-0 cursor-pointer"
          />
          <span className="text-xs text-slate-700 leading-relaxed font-medium">
            The patient/family explicitly agrees to share these health records between the ASHA worker, hospital, and lab for treatment purposes. <span className="text-rose-500 font-bold">*</span>
          </span>
        </label>
        {!consentProvided && (
          <p className="text-[11px] text-amber-600 font-semibold mt-1.5 pl-7 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Mandatory consent required by ABDM guidelines to create a health record.</span>
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !consentProvided}
        className={`w-full py-3 px-4 rounded-xl text-white text-sm font-bold shadow-sm transition-all
          active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
          ${isSelfRegister
            ? 'bg-gradient-to-r from-mint-500 to-emerald-600 hover:from-mint-600 hover:to-emerald-700 shadow-mint-200'
            : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-rose-200'
          }`}
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {isSelfRegister ? 'Creating Account…' : 'Registering…'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {isSelfRegister ? 'Create My Account' : 'Register Patient'}
          </>
        )}
      </button>

      {/* ── Prompt 2.3: "Possible Existing Patient Found" Modal ─────────────── */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-amber-100 bg-amber-50/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg shrink-0 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Possible Existing Patient Found
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    A patient with the same name and date of birth is already registered.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmationModal({ isOpen: false, matches: [], payload: null })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors"
                title="Dismiss"
              ><X className="w-4 h-4" /></button>
            </div>

            {/* Modal Body: Matched patient cards */}
            <div className="p-5 space-y-3 overflow-y-auto max-h-[50vh] bg-slate-50/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {confirmationModal.matches.length} Existing Record{confirmationModal.matches.length > 1 ? 's' : ''} Found:
              </p>

              {confirmationModal.matches.map((match, idx) => {
                const matchName = match.name || `${match.firstName || ''} ${match.lastName || ''}`.trim();
                const addr = match.address || {};
                const addressStr = [addr.village, addr.district, addr.state, addr.pincode].filter(Boolean).join(', ');

                return (
                  <div key={match._id || idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">{matchName}</span>
                          {match.gender && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              {match.gender}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>DOB: <strong>{match.dob ? new Date(match.dob).toLocaleDateString('en-IN') : '—'}</strong></span>
                          {match.contactPhone && <span>· <Phone className="w-3 h-3 inline mr-1" />{match.contactPhone}</span>}
                        </div>
                      </div>

                      {match.uhid && match.uhid !== '—' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-xs font-bold text-violet-700 font-mono tracking-wide shrink-0">
                          <CreditCard className="w-3 h-3 inline mr-1 text-slate-400" />{match.uhid}
                        </span>
                      )}
                    </div>

                    {addressStr ? (
                      <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{addressStr}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No address on file</div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleUseExisting(match)}
                        className="text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Use This Profile (Search UHID)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => handleUseExisting(confirmationModal.matches[0])}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4 inline mr-1" />Use Existing Profile
              </button>
              <button
                type="button"
                onClick={handleProceedCreateNew}
                disabled={isProceeding}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProceeding ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                This is a Different Person (Proceed)
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
