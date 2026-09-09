import React, { useState, useEffect, useCallback } from 'react';
import receptionistApi from '../services/receptionistApi';
import SharedPatientForm from '../../../components/common/SharedPatientForm';

// ─── PatientRegistrationForm (Prompt 13.1) ─────────────────────────────────────
// Wraps the SharedPatientForm in Receptionist mode (isSelfRegister=false).
// Adds receptionist-specific features: search existing patient, auto-queue option.
export default function PatientRegistrationForm({ onSuccess }) {
  const [loading, setLoading]           = useState(false);
  const [apiError, setApiError]         = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  // ── Search existing patient ────────────────────────────────────────────────
  const [searchPhone, setSearchPhone]     = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching]         = useState(false);

  // ── Doctors list for optional walk-in queue assignment ─────────────────────
  const [doctors, setDoctors]             = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [autoQueue, setAutoQueue]         = useState(false);
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

  // ── Handle form submission (Receptionist mode) ─────────────────────────────
  const handleFormSubmit = async (payload, resetForm) => {
    setLoading(true);
    setApiError('');
    setSuccessAlert('');
    try {
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
      resetForm?.();
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

      {/* ── Shared Patient Registration Form (Receptionist Mode) ──────────── */}
      <SharedPatientForm
        isSelfRegister={false}
        onSubmit={handleFormSubmit}
        loading={loading}
        apiError={apiError}
        successAlert={successAlert}
      />

      {/* ── Optional Immediate Queue Assignment ──────────────────────── */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 -mt-2">
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
    </div>
  );
}
