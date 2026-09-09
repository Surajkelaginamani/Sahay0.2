import React, { useState, useEffect, useCallback } from 'react';
import referralApi from '../../services/referralApi';

/**
 * Shared CreateReferralForm Component (Prompt 15.2)
 *
 * Used by ASHA workers and Nurses to initiate outbound patient referrals
 * to higher-level/specialty healthcare facilities.
 *
 * Workflow:
 * 1. Search & Select Patient
 * 2. Select Destination Hospital
 * 3. Fill Referral Reason & Clinical Notes
 * 4. Submit to shared /api/referrals endpoint
 */
export default function CreateReferralForm({ onSuccess, onCancel, defaultPatient = null, role = 'Nurse' }) {
  // Step 1: Patient search state
  const [patientQuery, setPatientQuery]         = useState('');
  const [patientResults, setPatientResults]     = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient]   = useState(defaultPatient);

  // Step 2: Destination Hospital state
  const [hospitals, setHospitals]               = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');

  // Step 3: Referral Details
  const [referralReason, setReferralReason]     = useState('');
  const [clinicalNotes, setClinicalNotes]       = useState('');
  const [submitting, setSubmitting]             = useState(false);

  // UI feedback
  const [errorMessage, setErrorMessage]         = useState('');
  const [successMessage, setSuccessMessage]     = useState('');

  // Synchronize if defaultPatient changes
  useEffect(() => {
    if (defaultPatient) {
      setSelectedPatient(defaultPatient);
    }
  }, [defaultPatient]);

  // Load available destination hospitals
  useEffect(() => {
    let active = true;
    setLoadingHospitals(true);
    referralApi.getHospitals()
      .then((res) => {
        if (active) {
          setHospitals(res.data.hospitals || []);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMessage('Unable to load recipient facilities. Please refresh.');
        }
      })
      .finally(() => {
        if (active) setLoadingHospitals(false);
      });

    return () => { active = false; };
  }, []);

  // Patient search handler
  const handlePatientSearch = useCallback(async () => {
    const q = patientQuery.trim();
    if (q.length < 2) return;
    setSearchingPatient(true);
    setErrorMessage('');
    setPatientResults(null);

    try {
      const res = await referralApi.searchPatients(q);
      setPatientResults(res.data.patients || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Patient search failed. Please try again.');
    } finally {
      setSearchingPatient(false);
    }
  }, [patientQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePatientSearch();
    }
  };

  // Submit referral handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedPatient) {
      setErrorMessage('Please search and select a patient first.');
      return;
    }
    if (!selectedHospital) {
      setErrorMessage('Please choose a destination hospital.');
      return;
    }
    if (!referralReason.trim()) {
      setErrorMessage('Please enter the clinical reason for referral.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient._id,
        referredToFacility: selectedHospital,
        reasonForReferral: referralReason.trim(),
        clinicalNotes: clinicalNotes.trim(),
      };

      const res = await referralApi.createReferral(payload);
      const msg = res.data.message || 'Outbound referral created successfully.';
      setSuccessMessage(msg);

      // Reset form fields
      if (!defaultPatient) {
        setSelectedPatient(null);
        setPatientQuery('');
        setPatientResults(null);
      }
      setSelectedHospital('');
      setReferralReason('');
      setClinicalNotes('');

      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <span className="text-sm">✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Step 1: Patient Search ────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-black">
            1
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Identify Patient</h3>
            <p className="text-[11px] text-slate-500">Search system-wide patient registry by name or phone</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {!selectedPatient ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    id="referral-patient-search-input"
                    type="text"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter patient name or phone number…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 transition-all"
                  />
                </div>
                <button
                  type="button"
                  id="referral-patient-search-btn"
                  onClick={handlePatientSearch}
                  disabled={searchingPatient || patientQuery.trim().length < 2}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-teal-700 transition-colors shrink-0 shadow-sm"
                >
                  {searchingPatient ? 'Searching…' : 'Search'}
                </button>
              </div>

              {/* Search results list */}
              {patientResults !== null && (
                <div className="pt-2">
                  {patientResults.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No matching patients found.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {patientResults.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientResults(null);
                          }}
                          className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/60 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {p.firstName?.[0]}{p.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-xs truncate">{p.fullName}</p>
                              <p className="text-[11px] text-slate-500">
                                {p.gender} · {p.contactPhone || '—'} {p.abhaId ? `· ABHA: ${p.abhaId}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-teal-600 font-bold shrink-0">Select →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Selected Patient Banner */
            <div className="flex items-center justify-between gap-3 p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                  {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-teal-950 text-sm truncate">
                    {selectedPatient.fullName || `${selectedPatient.firstName} ${selectedPatient.lastName || ''}`}
                  </p>
                  <p className="text-xs text-teal-700">
                    {selectedPatient.gender} · {selectedPatient.contactPhone || 'No phone'}
                    {selectedPatient.abhaId ? ` · ABHA: ${selectedPatient.abhaId}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientResults(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-100/80 transition-colors shrink-0"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Step 2: Destination Hospital ──────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 bg-gradient-to-r from-sky-50 to-blue-50 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-black">
            2
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Select Recipient Facility</h3>
            <p className="text-[11px] text-slate-500">Destination hospital for clinical escalation</p>
          </div>
        </div>

        <div className="p-5">
          {loadingHospitals ? (
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <select
              id="referral-hospital-select"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 text-slate-700 transition-all"
            >
              <option value="">— Select destination facility —</option>
              {hospitals.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.hospitalName} {h.address ? `· ${h.address}` : ''}
                </option>
              ))}
            </select>
          )}
          {hospitals.length === 0 && !loadingHospitals && (
            <p className="text-xs text-slate-400 mt-2 text-center">No recipient hospitals available.</p>
          )}
        </div>
      </div>

      {/* ── Step 3: Referral Details ──────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">
            3
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Clinical Referral Details</h3>
            <p className="text-[11px] text-slate-500">Reason for escalation and patient notes</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason for Referral <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="referral-reason-input"
              rows={3}
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              placeholder="e.g. Critical vitals, suspected cardiac event, specialized diagnostics required…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Clinical Notes & Observations <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="referral-notes-input"
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Additional findings, vitals summary, triage observations…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Action Buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          id="submit-referral-btn"
          onClick={handleSubmit}
          disabled={submitting || !selectedPatient || !selectedHospital || !referralReason.trim()}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-extrabold text-sm shadow-md shadow-teal-200 disabled:opacity-40 disabled:cursor-not-allowed hover:from-teal-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span>Processing Referral…</span>
          ) : (
            <>
              <span>📤</span>
              <span>Submit Outbound Referral</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
