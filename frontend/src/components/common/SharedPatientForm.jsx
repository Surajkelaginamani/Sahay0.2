import React, { useState } from 'react';

// ─── Field config ──────────────────────────────────────────────────────────────
const GENDERS    = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const EMPTY_FORM = {
  firstName: '', lastName: '', dob: '', gender: 'Male',
  bloodGroup: '', contactPhone: '',
  address: { village: '', district: '', state: '', pincode: '' },
  abhaId: '',
  email: '', password: '',
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
  loading = false,
  apiError = '',
  successAlert = '',
}) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

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
    if (!form.contactPhone.trim()) {
      e.contactPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(form.contactPhone.trim())) {
      e.contactPhone = 'Must be a 10-digit number';
    }
    if (form.email && form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    // Password validation only for self-registration
    if (isSelfRegister) {
      if (!form.password || form.password.length < 6) {
        e.password = 'Password must be at least 6 characters';
      }
    } else {
      if (form.password && form.password.length < 6) {
        e.password = 'Minimum 6 characters';
      }
    }
    if (form.abhaId && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(form.abhaId.trim())) {
      e.abhaId = 'Format: XX-XXXX-XXXX-XXXX';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      firstName:    form.firstName.trim(),
      lastName:     form.lastName.trim(),
      name:         `${form.firstName.trim()} ${form.lastName.trim()}`,
      dob:          form.dob,
      gender:       form.gender,
      email:        form.email.trim().toLowerCase() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      phone:        form.contactPhone.trim() || undefined,
      bloodGroup:   form.bloodGroup          || undefined,
      address:      form.address,
      abhaId:       form.abhaId.trim()       || undefined,
      isSelfRegister,
    };

    if (isSelfRegister) {
      payload.password = form.password.trim();
    } else {
      // Receptionist mode: use entered password or fallback to default
      payload.password = form.password ? form.password.trim() : 'Sahay@123';
    }

    onSubmit?.(payload, () => {
      // Reset callback — parent can call this after successful submission
      setForm(EMPTY_FORM);
      setErrors({});
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

      {/* Phone */}
      <div>
        <Label required>Contact Phone</Label>
        <Input
          type="tel" placeholder="10-digit mobile number"
          value={form.contactPhone}
          onChange={(e) => setField('contactPhone', e.target.value)}
          error={errors.contactPhone}
        />
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

      {/* Password — visible for self-register, optional/hidden-default for receptionist */}
      <div>
        <Label required={isSelfRegister}>
          Password
          {!isSelfRegister && (
            <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">(Defaults to Sahay@123 if blank)</span>
          )}
        </Label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={isSelfRegister ? 'Create a strong password (min 6 chars)' : 'Default: Sahay@123'}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl text-white text-sm font-bold shadow-sm transition-all
          active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2
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
    </form>
  );
}
