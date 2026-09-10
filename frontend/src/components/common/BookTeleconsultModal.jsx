import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─── API helpers ────────────────────────────────────────────────────────────
function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const teleconsultApi = {
  bookTeleconsult: (data) =>
    axios.post('/api/teleconsult/book', data, { headers: getAuthHeader() }),

  // Unified patient search with resilient fallback chain
  searchPatients: async (q) => {
    const headers = getAuthHeader();
    const params = { q: q.trim() };
    try {
      return await axios.get('/api/teleconsult/patients/search', { params, headers });
    } catch {
      try {
        return await axios.get('/api/referrals/patients/search', { params, headers });
      } catch {
        return await axios.get('/api/asha/patients/search', { params, headers });
      }
    }
  },

  // Unified hospital fetch with resilient fallback chain
  getHospitals: async () => {
    const headers = getAuthHeader();
    try {
      return await axios.get('/api/teleconsult/hospitals', { headers });
    } catch {
      try {
        return await axios.get('/api/referrals/hospitals', { headers });
      } catch {
        return await axios.get('/api/asha/hospitals', { headers });
      }
    }
  },
};

// ─── Time slot options ────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM',
  '12:00 PM',
  '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM',
];

// ─── BookTeleconsultModal ─────────────────────────────────────────────────────
// Props:
//   isOpen       – boolean
//   onClose      – () => void
//   onSuccess    – (appointment) => void
//   callerRole   – 'ASHA' | 'AshaWorker' | 'Nurse' | 'Patient'
//   patientUser  – (for Patient role) { patientProfileId, name } from localStorage/session
export default function BookTeleconsultModal({
  isOpen,
  onClose,
  onSuccess,
  callerRole = 'Patient',
  patientUser = null,
}) {
  // ── Form state ────────────────────────────────────────────────────────────
  const [step, setStep]                         = useState(1); // 1=Select Patient, 2=Booking Details
  const [hospitals, setHospitals]               = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [hospitalLoadError, setHospitalLoadError] = useState(false);

  // Patient search state (for Nurse / ASHA roles)
  const [patientQuery, setPatientQuery]         = useState('');
  const [patientResults, setPatientResults]     = useState([]);
  const [loadingPatients, setLoadingPatients]   = useState(false);
  const [hasSearched, setHasSearched]           = useState(false);
  const [selectedPatient, setSelectedPatient]   = useState(null);

  // Booking form fields
  const [selectedFacility, setSelectedFacility] = useState('');
  const [scheduledDate, setScheduledDate]       = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [chiefComplaint, setChiefComplaint]     = useState('');

  // Submission state
  const [submitting, setSubmitting]             = useState(false);
  const [error, setError]                       = useState('');

  // Is the caller a field worker / triage staff booking FOR a patient?
  const isFieldWorker = ['ASHA', 'AshaWorker', 'Nurse'].includes(callerRole);

  const searchInputRef = useRef(null);

  // ── Fetch hospitals on mount / open ───────────────────────────────────────
  const fetchHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    setHospitalLoadError(false);
    try {
      const res = await teleconsultApi.getHospitals();
      const list = res.data?.hospitals || res.data || [];
      setHospitals(Array.isArray(list) ? list : []);
    } catch {
      setHospitalLoadError(true);
      setHospitals([]);
    } finally {
      setLoadingHospitals(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchHospitals();
  }, [isOpen, fetchHospitals]);

  // ── Pre-fill patient for Patient role ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (!isFieldWorker && patientUser) {
      setSelectedPatient(patientUser);
    }
  }, [isOpen, isFieldWorker, patientUser]);

  // Focus search input when modal opens on Step 1
  useEffect(() => {
    if (isOpen && isFieldWorker && step === 1) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isFieldWorker, step]);

  // ── Reset on close ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setStep(1);
    setPatientQuery('');
    setPatientResults([]);
    setHasSearched(false);
    setSelectedPatient(null);
    setSelectedFacility('');
    setScheduledDate('');
    setSelectedTimeSlot('');
    setChiefComplaint('');
    setError('');
    onClose();
  }, [onClose]);

  // ── Patient search execution ──────────────────────────────────────────────
  const executeSearch = useCallback(async (query) => {
    const term = (query !== undefined ? query : patientQuery).trim();
    if (term.length < 2) {
      setPatientResults([]);
      setHasSearched(false);
      return;
    }

    setLoadingPatients(true);
    setError('');
    try {
      const res = await teleconsultApi.searchPatients(term);
      const list = res.data?.patients || [];
      setPatientResults(list);
      setHasSearched(true);
    } catch {
      setPatientResults([]);
      setHasSearched(true);
    } finally {
      setLoadingPatients(false);
    }
  }, [patientQuery]);

  // Debounced auto-search as user types (350ms)
  useEffect(() => {
    const trimmed = patientQuery.trim();
    if (trimmed.length < 2) {
      setPatientResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 350);

    return () => clearTimeout(timer);
  }, [patientQuery, executeSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };

  // ── Today string (min date for datepicker) ────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Submit Teleconsultation Request ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedPatient) {
      setError('Please select a patient.');
      return;
    }
    if (!selectedFacility) {
      setError('Please select a hospital.');
      return;
    }
    if (!scheduledDate) {
      setError('Please select a preferred date.');
      return;
    }
    if (!selectedTimeSlot) {
      setError('Please select a time slot.');
      return;
    }
    if (!chiefComplaint.trim()) {
      setError('Please describe the chief complaint / reasons for visit.');
      return;
    }

    const patientId = selectedPatient._id || selectedPatient.patientProfileId;
    if (!patientId) {
      setError('Invalid patient selection. Please search and re-select the patient.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await teleconsultApi.bookTeleconsult({
        patientId,
        facilityId: selectedFacility,
        scheduledDate,
        timeSlot: selectedTimeSlot,
        chiefComplaint: chiefComplaint.trim(),
      });
      onSuccess?.(res.data?.appointment);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit teleconsult request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10 border border-slate-100">
        
        {/* Header Gradient */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xl shadow-inner">
              📹
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Book Video Teleconsultation
              </h2>
              <p className="text-violet-200 text-xs font-medium mt-0.5">
                {isFieldWorker
                  ? `Scheduling specialist consultation as ${callerRole}`
                  : 'Schedule a direct video call with a hospital specialist'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>

        {/* Step Tabs for Field Workers */}
        {isFieldWorker && (
          <div className="flex border-b border-slate-100 bg-slate-50/50 shrink-0">
            {[
              { num: 1, title: 'Select Patient', subtitle: selectedPatient ? (selectedPatient.fullName || `${selectedPatient.firstName} ${selectedPatient.lastName}`) : 'Find citizen' },
              { num: 2, title: 'Booking Details', subtitle: selectedFacility ? 'Facility & schedule' : 'Choose facility & time' },
            ].map(({ num, title, subtitle }) => {
              const isActive = step === num;
              const isEnabled = num === 1 || Boolean(selectedPatient);

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => isEnabled && setStep(num)}
                  disabled={!isEnabled}
                  className={`flex-1 py-3 px-4 text-left border-b-2 transition-all cursor-pointer flex items-center gap-3 ${
                    isActive
                      ? 'border-violet-600 bg-violet-50/60 text-violet-900'
                      : isEnabled
                      ? 'border-transparent text-slate-600 hover:bg-slate-100/60'
                      : 'border-transparent text-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 transition-all ${
                      isActive
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-300'
                        : selectedPatient && num === 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {selectedPatient && num === 1 && !isActive ? '✓' : num}
                  </div>
                  <div className="truncate">
                    <p className={`text-xs font-extrabold ${isActive ? 'text-violet-900' : 'text-slate-800'}`}>
                      {title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-sm text-rose-700 shadow-sm animate-in fade-in">
              <span className="shrink-0 text-base">⚠️</span>
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STEP 1: PATIENT SELECTION (Nurse / ASHA / Field Worker)
             ════════════════════════════════════════════════════════════════════ */}
          {isFieldWorker && step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Search Patient <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
                      🔍
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type patient name, phone number, or ABHA ID..."
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all shadow-inner"
                    />
                    {patientQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setPatientQuery('');
                          setPatientResults([]);
                          setHasSearched(false);
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center transition-colors"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => executeSearch()}
                    disabled={loadingPatients || patientQuery.trim().length < 2}
                    className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm shadow-md shadow-violet-200 disabled:shadow-none transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {loadingPatients ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Searching…</span>
                      </>
                    ) : (
                      <span>Search</span>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 ml-1">
                  💡 Tip: Enter at least 2 characters (e.g. &ldquo;Ramesh&rdquo; or &ldquo;86684&rdquo;) and results will auto-populate.
                </p>
              </div>

              {/* Loading Indicator Bar */}
              {loadingPatients && (
                <div className="flex items-center gap-3 p-4 bg-violet-50/70 border border-violet-100 rounded-2xl text-xs font-semibold text-violet-700 animate-pulse">
                  <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  <span>Searching patient registry for &ldquo;{patientQuery.trim()}&rdquo;…</span>
                </div>
              )}

              {/* Search Results List */}
              {!loadingPatients && patientResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                    <span>Found {patientResults.length} matching patient{patientResults.length !== 1 ? 's' : ''}</span>
                    <span className="text-violet-600">Click a patient to select</span>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white">
                    {patientResults.map((p) => {
                      const isSelected = selectedPatient?._id === p._id;
                      const displayName = p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
                      const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() || 'P';

                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setError('');
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-violet-50/80 border-l-4 border-l-violet-600'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-slate-900 truncate">
                                {displayName}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                {p.contactPhone && (
                                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                                    📞 {p.contactPhone}
                                  </span>
                                )}
                                {p.gender && (
                                  <span>· {p.gender}</span>
                                )}
                                {p.abhaId && (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono text-[10px]">
                                    ABHA: {p.abhaId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 text-white font-extrabold text-xs shadow-sm">
                                ✓ Selected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 font-bold text-xs transition-colors">
                                Select →
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Results Empty State */}
              {!loadingPatients && hasSearched && patientResults.length === 0 && patientQuery.trim().length >= 2 && (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto text-xl">
                    🔍
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    No patients found matching &ldquo;{patientQuery.trim()}&rdquo;
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Try searching by 10-digit mobile number, first name, last name, or ABHA ID. Make sure the patient has been registered in the system.
                  </p>
                </div>
              )}

              {/* Selected Patient Banner */}
              {selectedPatient && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-md shadow-emerald-200">
                      {(selectedPatient.firstName || selectedPatient.name || 'P')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide uppercase">
                          Selected Patient
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-900 truncate mt-0.5">
                        {selectedPatient.fullName || `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim() || selectedPatient.name}
                      </p>
                      <p className="text-xs text-emerald-700 font-medium truncate">
                        {selectedPatient.contactPhone ? `Phone: ${selectedPatient.contactPhone}` : ''}
                        {selectedPatient.gender ? ` · ${selectedPatient.gender}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Next Step Button */}
              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Booking Details</span>
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              STEP 2 / PATIENT ROLE: BOOKING DETAILS
             ════════════════════════════════════════════════════════════════════ */}
          {(!isFieldWorker || step === 2) && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Patient Badge */}
              <div className="flex items-center justify-between gap-3 bg-violet-50/80 border border-violet-200/80 rounded-2xl p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-violet-200">
                    {(selectedPatient?.firstName || selectedPatient?.name || patientUser?.name || 'P')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">
                      {isFieldWorker ? 'Consultation For' : 'Booking For Yourself'}
                    </p>
                    <p className="text-sm font-black text-slate-900 truncate">
                      {selectedPatient?.fullName || `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''}`.trim() || selectedPatient?.name || patientUser?.name || 'Patient'}
                    </p>
                    {(selectedPatient?.contactPhone) && (
                      <p className="text-xs text-slate-500 font-medium">
                        📞 {selectedPatient.contactPhone}
                      </p>
                    )}
                  </div>
                </div>

                {isFieldWorker && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-1.5 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Hospital Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Select Hospital / Specialist Facility <span className="text-rose-500">*</span>
                  </label>
                  {hospitalLoadError && (
                    <button
                      type="button"
                      onClick={fetchHospitals}
                      className="text-xs font-bold text-violet-600 hover:underline cursor-pointer"
                    >
                      ↻ Retry loading
                    </button>
                  )}
                </div>

                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  required
                  disabled={loadingHospitals}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all shadow-inner"
                >
                  <option value="">
                    {loadingHospitals
                      ? 'Loading available hospitals…'
                      : hospitals.length === 0
                      ? 'No hospitals found'
                      : '— Choose a hospital / specialist facility —'}
                  </option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.hospitalName || h.name} {h.city ? `(${h.city})` : h.address ? `(${h.address})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred Date */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Preferred Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={todayStr}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              {/* Time Slot Selection */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Preferred Time Slot <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200 scale-[1.02]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-violet-400 hover:bg-violet-50/50 hover:text-violet-700'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chief Complaint / Reasons for Consultation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Describe patient's symptoms, duration, vitals, or reason for specialist consultation…"
                  rows={3}
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 focus:bg-white transition-all resize-none shadow-inner"
                />
              </div>

              {/* Explanatory Info Card */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-800">
                <span className="text-base shrink-0">ℹ️</span>
                <span className="leading-relaxed font-medium">
                  The hospital receptionist will review your request, confirm doctor availability, and finalize the appointment. A secure video room link will be issued immediately upon confirmation.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                {isFieldWorker && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-all cursor-pointer"
                  >
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-violet-200 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Request…</span>
                    </>
                  ) : (
                    <>
                      <span>📹</span>
                      <span>Submit Teleconsult Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
