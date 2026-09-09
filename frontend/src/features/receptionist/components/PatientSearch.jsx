import React, { useState, useEffect, useCallback } from 'react';
import receptionistApi from '../services/receptionistApi';

// ─── Status badge ──────────────────────────────────────────────────────────────
function QueueBadge({ queueNumber, doctorName }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Queue #{queueNumber}
      </span>
      {doctorName && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-violet-50 text-violet-700 text-[11px] font-semibold border border-violet-100">
          <svg className="w-3 h-3 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Dr. {doctorName}
        </span>
      )}
    </div>
  );
}

// ─── PatientSearch ─────────────────────────────────────────────────────────────
export default function PatientSearch({ onQueueSuccess }) {
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState(null); // null = not searched yet
  const [searching, setSearching]     = useState(false);
  const [searchError, setSearchError] = useState('');

  // Doctor list state
  const [doctors, setDoctors]               = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError]     = useState('');

  // Per-patient queue and assignment states
  const [assigningPatientId, setAssigningPatientId] = useState(null); // ID of patient currently selecting doctor
  const [selectedDoctorId, setSelectedDoctorId]     = useState({});   // { [patientId]: doctorId }
  const [selectedPriority, setSelectedPriority]     = useState({});   // { [patientId]: 'Routine' | 'Urgent' }
  const [queueState, setQueueState]                 = useState({});   // { [patientId]: 'idle' | 'loading' | 'done' | 'error' }
  const [queueError, setQueueError]                 = useState({});   // { [patientId]: errorMessage }
  const [queueNumbers, setQueueNumbers]             = useState({});   // { [patientId]: queueNumber }
  const [assignedDoctors, setAssignedDoctors]       = useState({});   // { [patientId]: doctorName }
  const [queuePriorities, setQueuePriorities]       = useState({});   // { [patientId]: 'Routine' | 'Urgent' }

  // ── Fetch facility doctors on mount ────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      setDoctorsError('');
      try {
        const res = await receptionistApi.getFacilityDoctors();
        if (active) {
          setDoctors(res.data.doctors || []);
        }
      } catch (err) {
        if (active) {
          setDoctorsError(err.response?.data?.message || 'Failed to load doctors list.');
        }
      } finally {
        if (active) setLoadingDoctors(false);
      }
    };
    fetchDoctors();
    return () => { active = false; };
  }, []);

  // ── Search handler ────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchError('Please enter at least 2 characters.');
      return;
    }
    setSearchError('');
    setSearching(true);
    setResults(null);
    setAssigningPatientId(null);
    setQueueState({});
    setQueueNumbers({});
    try {
      const res = await receptionistApi.searchPatients(q);
      setResults(res.data.patients || []);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Search failed. Please try again.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  // ── Open doctor assignment for a patient ───────────────────────────────────
  const handleOpenAssign = (patient) => {
    setAssigningPatientId(patient._id);
    // Pre-select first doctor if available and not yet set
    if (!selectedDoctorId[patient._id] && doctors.length > 0) {
      setSelectedDoctorId((prev) => ({ ...prev, [patient._id]: doctors[0]._id }));
    }
    // Default priority to Routine
    if (!selectedPriority[patient._id]) {
      setSelectedPriority((prev) => ({ ...prev, [patient._id]: 'Routine' }));
    }
  };

  // ── Confirm adding to queue with assigned doctor ──────────────────────────
  const handleConfirmAddToQueue = useCallback(async (patient) => {
    const pid      = patient._id;
    const docId    = selectedDoctorId[pid];
    const priority = selectedPriority[pid] || 'Routine';

    if (!docId) {
      setQueueError((e) => ({ ...e, [pid]: 'Please select a doctor to assign.' }));
      return;
    }

    setQueueState((s) => ({ ...s, [pid]: 'loading' }));
    setQueueError((e) => ({ ...e, [pid]: '' }));

    try {
      const res = await receptionistApi.addToQueue(pid, docId, undefined, priority);
      const qNum = res.data.appointment?.queueNumber;
      const assignedDoc = doctors.find((d) => d._id === docId);
      const doctorName = assignedDoc ? assignedDoc.name : res.data.appointment?.doctorName || 'Doctor';

      setQueueNumbers((n) => ({ ...n, [pid]: qNum }));
      setAssignedDoctors((d) => ({ ...d, [pid]: doctorName }));
      setQueuePriorities((p) => ({ ...p, [pid]: priority }));
      setQueueState((s) => ({ ...s, [pid]: 'done' }));
      setAssigningPatientId(null);

      onQueueSuccess?.({ patient, doctorName, queueNumber: qNum, priority });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add to queue.';
      setQueueState((s) => ({ ...s, [pid]: 'error' }));
      setQueueError((e) => ({ ...e, [pid]: msg }));
    }
  }, [doctors, onQueueSuccess, selectedDoctorId, selectedPriority]);

  return (
    <div className="space-y-4">

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          Search by Name or Phone Number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="patient-search-input"
              type="text"
              placeholder="e.g. Ramesh or 9876543210"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResults(null); setSearchError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400
                focus:bg-white transition-all"
            />
          </div>
          <button
            id="patient-search-btn"
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold
              hover:bg-violet-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center gap-2 shrink-0"
          >
            {searching ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchError && (
          <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {searchError}
          </p>
        )}
      </div>

      {/* ── Doctor status notification if any issue ────────────────────────── */}
      {doctorsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{doctorsError}</span>
        </div>
      )}

      {/* ── Results list ───────────────────────────────────────────────────── */}
      {results !== null && (
        <div>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium">No patients found</p>
              <p className="text-xs mt-0.5">Try a different name or phone number</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </p>
                <p className="text-[11px] text-slate-400">
                  {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} on duty
                </p>
              </div>

              {results.map((patient) => {
                const state       = queueState[patient._id] || 'idle';
                const qNum        = queueNumbers[patient._id];
                const docName     = assignedDoctors[patient._id];
                const isAssigning = assigningPatientId === patient._id;
                const err         = queueError[patient._id];

                return (
                  <div
                    key={patient._id}
                    className={`bg-white rounded-2xl p-4 transition-all hover:shadow-sm border
                      ${patient.pendingReferral
                        ? 'border-emerald-400 ring-1 ring-emerald-300'
                        : 'border-slate-200 hover:border-violet-200'}`}
                  >
                    {/* ── ASHA Referral Banner ─────────────────────────────── */}
                    {patient.pendingReferral && (
                      <div className="mb-3 flex items-start gap-2 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2.5">
                        <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-emerald-800">
                            ✅ Valid ASHA Referral Found
                          </p>
                          <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                            <strong>Reason:</strong> {patient.pendingReferral.reasonForReferral}
                          </p>
                          {patient.pendingReferral.referredBy?.name && (
                            <p className="text-[11px] text-emerald-600 mt-0.5">
                              Referred by ASHA: <strong>{patient.pendingReferral.referredBy.name}</strong>
                            </p>
                          )}
                          <p className="text-[10px] text-emerald-500 mt-0.5">
                            Adding to queue will automatically mark this referral as <strong>Arrived</strong>.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Patient information */}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{patient.fullName}</p>
                        <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                          {patient.contactPhone && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {patient.contactPhone}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">{patient.gender}</span>
                          {patient.dob && (
                            <span className="text-[11px] text-slate-400">
                              DOB: {new Date(patient.dob).toLocaleDateString('en-IN')}
                            </span>
                          )}
                          {patient.abhaId && (
                            <span className="text-[10px] font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                              ABHA: {patient.abhaId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Queue action / Status */}
                      <div className="shrink-0 flex items-center gap-2">
                        {state === 'done' ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                            <QueueBadge queueNumber={qNum} doctorName={docName} />
                            {queuePriorities[patient._id] === 'Urgent' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                URGENT
                              </span>
                            )}
                          </div>
                        ) : !isAssigning ? (
                          <button
                            id={`assign-btn-${patient._id}`}
                            type="button"
                            onClick={() => handleOpenAssign(patient)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
                              bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.97] transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Assign to Doctor
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* ── Inline Doctor Assignment Drawer ─────────────────── */}
                    {isAssigning && state !== 'done' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 bg-violet-50/60 rounded-xl p-3.5">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-violet-900 mb-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Select Consulting Doctor <span className="text-rose-500">*</span>
                            </label>

                            {loadingDoctors ? (
                              <p className="text-xs text-slate-500 py-2">Loading facility doctors…</p>
                            ) : doctors.length === 0 ? (
                              <p className="text-xs text-rose-600 py-1">
                                No doctors found for this facility. Please register doctors first.
                              </p>
                            ) : (
                              <select
                                id={`doctor-select-${patient._id}`}
                                value={selectedDoctorId[patient._id] || ''}
                                onChange={(e) =>
                                  setSelectedDoctorId((prev) => ({
                                    ...prev,
                                    [patient._id]: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-lg border border-violet-200 text-xs bg-white text-slate-800
                                  focus:outline-none focus:ring-2 focus:ring-violet-400"
                              >
                                <option value="">-- Choose a doctor --</option>
                                {doctors.map((doc) => (
                                  <option key={doc._id} value={doc._id}>
                                    Dr. {doc.name} ({doc.email})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Priority / Urgency select */}
                          <div className="sm:w-36">
                            <label className="block text-[11px] font-bold text-violet-900 mb-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                              </svg>
                              Urgency
                            </label>
                            <select
                              id={`priority-select-${patient._id}`}
                              value={selectedPriority[patient._id] || 'Routine'}
                              onChange={(e) =>
                                setSelectedPriority((prev) => ({
                                  ...prev,
                                  [patient._id]: e.target.value,
                                }))
                              }
                              className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold
                                focus:outline-none focus:ring-2 focus:ring-violet-400
                                ${
                                  (selectedPriority[patient._id] || 'Routine') === 'Urgent'
                                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                                    : 'border-violet-200 bg-white text-slate-700'
                                }`}
                            >
                              <option value="Routine">✔ Routine</option>
                              <option value="Urgent">⚠️ Urgent</option>
                            </select>
                          </div>

                          {/* Confirm & Cancel buttons */}
                          <div className="flex items-center gap-2 sm:self-end">
                            <button
                              id={`confirm-queue-${patient._id}`}
                              type="button"
                              disabled={
                                !selectedDoctorId[patient._id] ||
                                state === 'loading' ||
                                doctors.length === 0
                              }
                              onClick={() => handleConfirmAddToQueue(patient)}
                              className={`px-4 py-2 rounded-lg text-white text-xs font-bold
                                disabled:opacity-50 disabled:cursor-not-allowed
                                flex items-center gap-1.5 transition-colors shadow-sm
                                ${
                                  (selectedPriority[patient._id] || 'Routine') === 'Urgent'
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : 'bg-violet-600 hover:bg-violet-700'
                                }`}
                            >
                              {state === 'loading' ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Assigning…
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Confirm Queue
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningPatientId(null);
                                setQueueError((e) => ({ ...e, [patient._id]: '' }));
                              }}
                              disabled={state === 'loading'}
                              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600
                                hover:bg-white text-xs font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>

                        {/* Inline error */}
                        {err && (
                          <p className="text-[11px] text-rose-600 mt-2 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {err}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (not yet searched) ───────────────────────────────── */}
      {results === null && !searching && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">Search for an existing patient</p>
          <p className="text-xs text-slate-300 mt-0.5">by name or 10-digit phone number, then assign to a doctor</p>
        </div>
      )}
    </div>
  );
}
