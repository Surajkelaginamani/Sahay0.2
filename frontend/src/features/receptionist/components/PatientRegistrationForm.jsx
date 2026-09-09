import React, { useState, useEffect, useCallback } from 'react';
import receptionistApi from '../services/receptionistApi';

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

// ─── PatientRegistrationForm ───────────────────────────────────────────────────
export default function PatientRegistrationForm({ onSuccess }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successAlert, setSuccessAlert] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Doctors list for optional walk-in queue assignment
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [autoQueue, setAutoQueue] = useState(false);
  const [assignedDoctorId, setAssignedDoctorId] = useState('');

  // ── Fetch facility doctors on mount ────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const res = await receptionistApi.getFacilityDoctors();
        if (active) {
          const docs = res.data.doctors || [];
          setDoctors(docs);
          if (docs.length > 0) setAssignedDoctorId(docs[0]._id);
        }
      } catch {
        // Fallback silently if doctors fail to load
      } finally {
        if (active) setLoadingDoctors(false);
      }
    };
    fetchDoctors();
    return () => { active = false; };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setSuccessAlert('');
  };
  const setAddress = (key, val) =>
    setForm((f) => ({ ...f, address: { ...f.address, [key]: val } }));

  // ── Validation (Prompt 12.1 & 12.2) ─────────────────────────────────────────
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
    if (form.password && form.password.length < 6) {
      e.password = 'Minimum 6 characters';
    }
    if (form.abhaId && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(form.abhaId.trim())) {
      e.abhaId = 'Format: XX-XXXX-XXXX-XXXX';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Search existing patient ────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchPhone.trim() || searchPhone.trim().length < 2) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await receptionistApi.searchPatients(searchPhone.trim());
      setSearchResults(res.data.patients || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchPhone]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    setSuccessAlert('');
    try {
      const payload = {
        firstName:    form.firstName.trim(),
        lastName:     form.lastName.trim(),
        dob:          form.dob,
        gender:       form.gender,
        email:        form.email.trim().toLowerCase() || undefined,
        password:     form.password ? form.password.trim() : 'Sahay@123',
        contactPhone: form.contactPhone.trim() || undefined,
        bloodGroup:   form.bloodGroup          || undefined,
        address:      form.address,
        abhaId:       form.abhaId.trim()       || undefined,
      };
      const res = await receptionistApi.registerPatient(payload);
      const newPatient = res.data.patient;
      let queueInfo = null;

      // Optional immediate walk-in queue assignment
      if (autoQueue && assignedDoctorId) {
        try {
          const queueRes = await receptionistApi.addToQueue(newPatient._id, assignedDoctorId);
          queueInfo = queueRes.data.appointment;
        } catch {
          // If queue addition fails after registration, still proceed with registration success
        }
      }

      const successMsg = 'Patient registered. They can log in using their phone number and default password: Sahay@123';
      setSuccessAlert(successMsg);

      onSuccess?.({
        type: 'registered',
        patient: newPatient,
        queueInfo,
        message: successMsg,
      });
      setForm(EMPTY_FORM);
      setErrors({});
      setAutoQueue(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      // If duplicate phone, the API returns the existing patient — surface it
      const existing = err.response?.data?.existingPatient;
      if (existing) {
        setApiError(`${msg} (Existing: ${existing.fullName}, ${existing.contactPhone})`);
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Search existing patient ───────────────────────────────────────── */}
      <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-sky-800 mb-2.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Check if patient already registered
        </p>
        <div className="flex gap-2">
          <input
            type="text" placeholder="Enter name or phone number…"
            value={searchPhone}
            onChange={(e) => { setSearchPhone(e.target.value); setSearchResults(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 rounded-xl border border-sky-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors disabled:opacity-60"
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>
        {searchResults !== null && (
          <div className="mt-3">
            {searchResults.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">No existing records found — proceed to register below.</p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((p) => (
                  <div key={p._id}
                    className="flex items-center justify-between bg-white border border-sky-200 rounded-xl px-3.5 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{p.fullName}</p>
                      <p className="text-[11px] text-slate-400">{p.contactPhone} · {p.gender}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSuccess?.({ type: 'found', patient: p })}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 transition-colors"
                    >
                      Use this patient →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Registration form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-px bg-slate-100" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">New Patient Details</p>
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
          <Label>Contact Phone</Label>
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Patient Login Credentials</p>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
        <p className="text-[11px] text-slate-400 -mt-3">
          These credentials allow the patient to log in to the SAHAY patient portal later.
        </p>

        {/* Success Alert Banner (Prompt 12.2) */}
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

        <div>
          <Label>Password
            <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">(Defaults to Sahay@123 if blank)</span>
          </Label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Default: Sahay@123"
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

        {/* ── Optional Immediate Queue Assignment ──────────────────────── */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="auto-queue-checkbox"
              checked={autoQueue}
              onChange={(e) => setAutoQueue(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
            />
            <span className="text-xs font-bold text-amber-900">
              Immediately add patient to today's queue for doctor consultation
            </span>
          </label>

          {autoQueue && (
            <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-2">
              <label className="block text-[11px] font-bold text-amber-900">
                Select Consulting Doctor <span className="text-rose-500">*</span>
              </label>
              {loadingDoctors ? (
                <p className="text-xs text-slate-500">Loading facility doctors…</p>
              ) : doctors.length === 0 ? (
                <p className="text-xs text-rose-600">
                  No doctors registered at this facility.
                </p>
              ) : (
                <select
                  id="auto-queue-doctor-select"
                  value={assignedDoctorId}
                  onChange={(e) => setAssignedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white text-slate-800
                    focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({doc.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
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
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm
            font-bold shadow-sm shadow-rose-200 hover:from-rose-600 hover:to-pink-700 transition-all
            active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Registering…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Register Patient
            </>
          )}
        </button>
      </form>
    </div>
  );
}
