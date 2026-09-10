import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ashaApi from '../../services/ashaApi';
import BookTeleconsultModal from '../../components/common/BookTeleconsultModal';
import VideoRoom from '../../components/common/VideoRoom';

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm pointer-events-auto
            ${t.type === 'success' ? 'bg-white border-emerald-200' : 'bg-white border-rose-200'}`}
        >
          <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
            ${t.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {t.type === 'success'
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm">{t.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.message}</p>
          </div>
          <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-700 shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    Pending:   'bg-amber-100 text-amber-700 border-amber-200',
    Arrived:   'bg-sky-100 text-sky-700 border-sky-200',
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  const dot = { Pending: 'bg-amber-500', Arrived: 'bg-sky-500', Completed: 'bg-emerald-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || 'bg-slate-400'} ${status === 'Pending' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded-lg w-3/4" />
          <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded-lg w-5/6" />
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AshaDashboard() {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [activeTab, setActiveTab] = useState('refer'); // 'refer' | 'active'

  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toastRef = useRef(0);
  const addToast = useCallback((type, title, message) => {
    const id = ++toastRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);
  const removeToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // ── Refer Patient form state ──────────────────────────────────────────────────
  const [patientQuery, setPatientQuery]       = useState('');
  const [patientResults, setPatientResults]   = useState(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [hospitals, setHospitals]             = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [referralReason, setReferralReason]   = useState('');
  const [clinicalNotes, setClinicalNotes]     = useState('');
  const [submitting, setSubmitting]           = useState(false);

  // ── Active Referrals state ────────────────────────────────────────────────────
  const [referrals, setReferrals]           = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralFilter, setReferralFilter] = useState('all'); // 'all' | 'Pending' | 'Arrived' | 'Completed'

  // ── Teleconsult state (Prompt 17.2 & 17.4) ────────────────────────────────────
  const [showTeleconsultModal, setShowTeleconsultModal] = useState(false);
  const [myTeleconsults, setMyTeleconsults]             = useState([]);
  const [loadingTeleconsults, setLoadingTeleconsults]   = useState(false);
  const [activeVideoRoom, setActiveVideoRoom]           = useState(null); // { roomId, patientName }

  // ── Auth guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) { navigate('/auth/hospital/login'); return; }
    const parsed = JSON.parse(stored);
    if (!['ASHA', 'AshaWorker'].includes(parsed.role)) { navigate('/'); return; }
    setUser(parsed);
  }, [navigate]);

  // ── Load hospitals ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingHospitals(true);
    ashaApi.getHospitals()
      .then((res) => { if (active) setHospitals(res.data.hospitals || []); })
      .catch(() => { if (active) addToast('error', 'Failed to load hospitals', 'Please refresh and try again.'); })
      .finally(() => { if (active) setLoadingHospitals(false); });
    return () => { active = false; };
  }, [user, addToast]);

  // ── Load referrals ────────────────────────────────────────────────────────────
  const loadReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const res = await ashaApi.getMyReferrals();
      setReferrals(res.data.referrals || []);
    } catch {
      addToast('error', 'Failed to load referrals', 'Please try again.');
    } finally {
      setLoadingReferrals(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user && activeTab === 'active') loadReferrals();
  }, [user, activeTab, loadReferrals]);

  // ── Load my teleconsults (Prompt 17.4) ────────────────────────────────────────
  const loadMyTeleconsults = useCallback(async () => {
    setLoadingTeleconsults(true);
    try {
      const res = await fetch('/api/teleconsult/my', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('sahay_token')}`,
        },
      });
      const data = await res.json();
      setMyTeleconsults(data.teleconsults || []);
    } catch {
      // non-blocking
    } finally {
      setLoadingTeleconsults(false);
    }
  }, []);

  // ── Enter Waiting Room / Start Call (Prompt 18.2) ──────────────────────────
  const handleStartCall = async (tc) => {
    try {
      await fetch(`/api/teleconsult/${tc._id}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('sahay_token')}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Failed to notify waiting room:', err);
    }
    setActiveVideoRoom({
      roomId: tc.teleconsultRoomId || `sahay-room-${tc._id}`,
      patientName: tc.patientFullName,
      doctorName: tc.doctorName || 'Doctor',
      appointmentId: tc._id,
    });
    loadMyTeleconsults();
  };

  useEffect(() => {
    if (user && activeTab === 'teleconsults') loadMyTeleconsults();
  }, [user, activeTab, loadMyTeleconsults]);

  // ── Patient search ────────────────────────────────────────────────────────────
  const handlePatientSearch = useCallback(async () => {
    const q = patientQuery.trim();
    if (q.length < 2) return;
    setSearchingPatient(true);
    setPatientResults(null);
    setSelectedPatient(null);
    try {
      const res = await ashaApi.searchPatients(q);
      setPatientResults(res.data.patients || []);
    } catch (err) {
      addToast('error', 'Search failed', err.response?.data?.message || 'Unable to search patients.');
    } finally {
      setSearchingPatient(false);
    }
  }, [patientQuery, addToast]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') handlePatientSearch(); };

  // ── Submit referral ───────────────────────────────────────────────────────────
  const handleSubmitReferral = async () => {
    if (!selectedPatient) return addToast('error', 'No patient selected', 'Please search and select a patient first.');
    if (!selectedHospital) return addToast('error', 'No hospital selected', 'Please choose a destination hospital.');
    if (!referralReason.trim()) return addToast('error', 'Reason required', 'Please describe the reason for referral.');

    setSubmitting(true);
    try {
      const res = await ashaApi.createReferral({
        patientId: selectedPatient._id,
        referredToFacility: selectedHospital,
        reasonForReferral: referralReason.trim(),
        clinicalNotes: clinicalNotes.trim(),
      });
      addToast('success', '✅ Referral Created', res.data.message);
      // Reset form
      setSelectedPatient(null);
      setPatientQuery('');
      setPatientResults(null);
      setSelectedHospital('');
      setReferralReason('');
      setClinicalNotes('');
      // Switch to active tab
      setActiveTab('active');
    } catch (err) {
      addToast('error', 'Referral failed', err.response?.data?.message || 'Could not create referral.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered referrals ────────────────────────────────────────────────────────
  const filteredReferrals = referralFilter === 'all'
    ? referrals
    : referrals.filter((r) => r.status === referralFilter);

  const pendingCount = referrals.filter((r) => r.status === 'Pending').length;
  const scheduledTeleconsults = myTeleconsults.filter((t) => t.status === 'Teleconsult Scheduled');

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/30 to-sky-50/20">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Teleconsult Modal ── */}
      <BookTeleconsultModal
        isOpen={showTeleconsultModal}
        onClose={() => setShowTeleconsultModal(false)}
        callerRole={user?.role}
        onSuccess={(appt) => {
          addToast('success', '📹 Teleconsult Requested!', 'Your request has been submitted for hospital review.');
          setShowTeleconsultModal(false);
          loadMyTeleconsults();
          setActiveTab('teleconsults');
        }}
      />

      {/* ── Active video room overlay ── */}
      {activeVideoRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl" style={{ height: '80vh' }}>
            <VideoRoom
              roomName={activeVideoRoom.roomId}
              displayName={`${user.name} (ASHA)`}
              onClose={() => setActiveVideoRoom(null)}
            />
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/50 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 leading-tight truncate">SAHAY ASHA Portal</h1>
              <p className="text-[11px] text-slate-500 truncate">{user.name} · {user.hospitalName || 'Field Worker'}</p>
            </div>
          </div>
          <button
            onClick={() => { ['token','sahay_token','user','sahay_user'].forEach((k) => localStorage.removeItem(k)); navigate('/auth/hospital/login'); }}
            className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Tab bar ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1.5">
          {[
            { id: 'refer', label: '📤 Refer Patient', active: 'bg-emerald-500 text-white' },
            {
              id: 'active',
              label: pendingCount > 0 ? `📋 My Referrals (${pendingCount} pending)` : '📋 My Referrals',
              active: 'bg-sky-600 text-white',
            },
            {
              id: 'teleconsults',
              label: scheduledTeleconsults.length > 0 ? `📹 Teleconsults (${scheduledTeleconsults.length})` : '📹 Teleconsults',
              active: 'bg-violet-600 text-white',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all
                ${activeTab === tab.id ? tab.active + ' shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Book Teleconsult Quick Action Card ── */}
        {activeTab === 'refer' && (
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-violet-200/50">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">📹</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Book Video Doctor Consult</p>
              <p className="text-violet-200 text-xs mt-0.5">Schedule a teleconsultation at a hospital for a villager</p>
            </div>
            <button
              id="book-teleconsult-btn"
              onClick={() => setShowTeleconsultModal(true)}
              className="shrink-0 px-4 py-2 rounded-xl bg-white text-violet-700 font-bold text-xs hover:bg-violet-50 transition-colors"
            >
              Book Now
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: REFER PATIENT                                             */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'refer' && (
          <div className="space-y-4">

            {/* Step 1: Patient Search */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">1</div>
                <h2 className="text-sm font-bold text-slate-800">Search Patient</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input
                      id="patient-search-input"
                      type="text"
                      value={patientQuery}
                      onChange={(e) => setPatientQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Name or phone number…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                    />
                  </div>
                  <button
                    id="patient-search-btn"
                    onClick={handlePatientSearch}
                    disabled={searchingPatient || patientQuery.trim().length < 2}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-emerald-600 transition-colors shrink-0"
                  >
                    {searchingPatient ? '…' : 'Search'}
                  </button>
                </div>

                {/* Selected patient banner */}
                {selectedPatient && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-emerald-900 text-sm truncate">{selectedPatient.fullName}</p>
                      <p className="text-xs text-emerald-700">{selectedPatient.gender} · {selectedPatient.contactPhone || 'No phone'}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedPatient(null); setPatientResults(null); setPatientQuery(''); }}
                      className="text-emerald-400 hover:text-rose-500 shrink-0 transition-colors"
                      title="Change patient"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}

                {/* Search results */}
                {!selectedPatient && patientResults !== null && (
                  <div>
                    {patientResults.length === 0 ? (
                      <p className="text-center py-4 text-sm text-slate-500">No patients found. Try a different name or phone.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {patientResults.map((p) => (
                          <button
                            key={p._id}
                            onClick={() => { setSelectedPatient(p); setPatientResults(null); }}
                            className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                          >
                            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {p.firstName?.[0]}{p.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{p.fullName}</p>
                              <p className="text-xs text-slate-500">{p.gender} · {p.contactPhone || '—'} · {p.abhaId ? `ABHA: ${p.abhaId}` : 'No ABHA'}</p>
                            </div>
                            <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Destination Hospital */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 bg-gradient-to-r from-sky-50 to-blue-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-black">2</div>
                <h2 className="text-sm font-bold text-slate-800">Select Destination Hospital</h2>
              </div>
              <div className="p-4">
                {loadingHospitals ? (
                  <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    id="hospital-select"
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 text-slate-700"
                  >
                    <option value="">— Choose a hospital —</option>
                    {hospitals.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.hospitalName} {h.address ? `· ${h.address.substring(0, 30)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {hospitals.length === 0 && !loadingHospitals && (
                  <p className="text-xs text-slate-400 mt-2 text-center">No approved hospitals available.</p>
                )}
              </div>
            </div>

            {/* Step 3: Referral Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black">3</div>
                <h2 className="text-sm font-bold text-slate-800">Referral Details</h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Reason for Referral <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="referral-reason"
                    rows={3}
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                    placeholder="e.g. High blood pressure, needs specialist consultation…"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Clinical Notes <span className="text-slate-400">(optional)</span></label>
                  <textarea
                    id="clinical-notes"
                    rows={2}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Additional observations or vitals…"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              id="submit-referral-btn"
              onClick={handleSubmitReferral}
              disabled={submitting || !selectedPatient || !selectedHospital || !referralReason.trim()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-base shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all"
            >
              {submitting ? '⏳ Submitting Referral…' : '📤 Submit Referral'}
            </button>

            {/* Mini guide */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                How referrals work
              </p>
              <ul className="space-y-1 text-[11px] text-amber-700">
                <li>1. You search a patient and select a hospital</li>
                <li>2. Referral is sent → Receptionist at that hospital sees it</li>
                <li>3. When patient arrives, receptionist marks them "Arrived"</li>
                <li>4. Track all your referrals in the "My Referrals" tab</li>
              </ul>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: MY REFERRALS                                              */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'active' && (
          <div className="space-y-4">

            {/* Filter pills */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1.5 overflow-x-auto">
              {[
                { id: 'all',       label: `All (${referrals.length})` },
                { id: 'Pending',   label: `⏳ Pending (${referrals.filter(r=>r.status==='Pending').length})` },
                { id: 'Arrived',   label: `✅ Arrived (${referrals.filter(r=>r.status==='Arrived').length})` },
                { id: 'Completed', label: `🎉 Done (${referrals.filter(r=>r.status==='Completed').length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  id={`filter-${f.id}`}
                  onClick={() => setReferralFilter(f.id)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all
                    ${referralFilter === f.id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            <button
              id="refresh-referrals-btn"
              onClick={loadReferrals}
              disabled={loadingReferrals}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className={`w-4 h-4 ${loadingReferrals ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {loadingReferrals ? 'Refreshing…' : 'Refresh Referrals'}
            </button>

            {/* Referral cards */}
            {loadingReferrals ? (
              <div className="space-y-3">
                {[1,2,3].map((n) => <SkeletonCard key={n} />)}
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-600">No referrals found</p>
                <p className="text-xs text-slate-400 mt-1">Create your first referral from the "Refer Patient" tab.</p>
                <button
                  onClick={() => setActiveTab('refer')}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                >
                  Refer a Patient
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReferrals.map((ref) => (
                  <div
                    key={ref._id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                      ${ref.status === 'Pending' ? 'border-amber-200' : ref.status === 'Arrived' ? 'border-sky-200' : 'border-emerald-200'}`}
                  >
                    {/* Status bar */}
                    <div className={`h-1 w-full ${ref.status === 'Pending' ? 'bg-amber-400' : ref.status === 'Arrived' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                    <div className="p-4 space-y-3">

                      {/* Patient & status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {ref.patientId?.firstName?.[0]}{ref.patientId?.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">
                              {ref.patientFullName || `${ref.patientId?.firstName} ${ref.patientId?.lastName}`}
                            </p>
                            <p className="text-xs text-slate-500">{ref.patientId?.gender} · {ref.patientId?.contactPhone || '—'}</p>
                          </div>
                        </div>
                        <StatusPill status={ref.status} />
                      </div>

                      {/* Hospital destination */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        <span className="font-semibold truncate">{ref.referredToFacility?.hospitalName || 'Unknown Hospital'}</span>
                      </div>

                      {/* Reason */}
                      <div className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Reason</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{ref.reasonForReferral}</p>
                      </div>

                      {/* Date */}
                      <p className="text-[11px] text-slate-400">
                        Created: {new Date(ref.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MY TELECONSULTS (Prompt 17.4)                              */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'teleconsults' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-semibold">
                {loadingTeleconsults ? 'Loading…' : `${myTeleconsults.length} teleconsult request(s)`}
              </p>
              <button
                onClick={loadMyTeleconsults}
                disabled={loadingTeleconsults}
                className="text-xs font-bold text-violet-600 hover:text-violet-800 disabled:opacity-50 flex items-center gap-1"
              >
                <svg className={`w-3.5 h-3.5 ${loadingTeleconsults ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>

            {myTeleconsults.length === 0 && !loadingTeleconsults ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="text-4xl mb-3">📹</div>
                <p className="text-sm font-bold text-slate-700">No teleconsults booked yet</p>
                <p className="text-xs text-slate-400 mt-1">Book a video consultation for a villager from the "Refer Patient" tab</p>
                <button
                  onClick={() => setShowTeleconsultModal(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-colors"
                >
                  Book Teleconsult Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myTeleconsults.map((tc) => {
                  const isScheduled = tc.status === 'Teleconsult Scheduled';
                  const isRequested = tc.status === 'Teleconsult Requested';
                  return (
                    <div
                      key={tc._id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                        ${isScheduled ? 'border-violet-300 ring-1 ring-violet-200' : 'border-slate-200'}`}
                    >
                      <div className={`h-1 w-full ${isScheduled ? 'bg-gradient-to-r from-violet-500 to-purple-500' : isRequested ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {tc.patientFullName}
                            </p>
                            <p className="text-xs text-slate-500">{tc.facilityName}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border
                            ${isScheduled ? 'bg-violet-100 text-violet-700 border-violet-200' :
                              isRequested ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              'bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isScheduled ? 'bg-violet-500' : isRequested ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {tc.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div><span className="text-slate-400">Doctor:</span> <span className="font-semibold">{tc.doctorName}</span></div>
                          <div><span className="text-slate-400">Time Slot:</span> <span className="font-semibold">{tc.timeSlot || '—'}</span></div>
                          <div><span className="text-slate-400">Date:</span> <span className="font-semibold">{tc.scheduledDate ? new Date(tc.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
                          <div><span className="text-slate-400">Source:</span> <span className="font-semibold">{tc.teleconsultSource || 'ASHA'}</span></div>
                        </div>

                        {tc.chiefComplaint && (
                          <div className="bg-slate-50 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Chief Complaint</p>
                            <p className="text-xs text-slate-700">{tc.chiefComplaint}</p>
                          </div>
                        )}

                        {['Teleconsult Confirmed', 'Patient Waiting in Room', 'Teleconsult Scheduled'].includes(tc.status) && tc.teleconsultRoomId && (
                          <button
                            id={`join-teleconsult-${tc._id}`}
                            onClick={() => handleStartCall(tc)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-sm
                              hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
                          >
                            📹 Enter Waiting Room / Start Call
                          </button>
                        )}

                        {isRequested && (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            Awaiting hospital review and doctor assignment…
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowTeleconsultModal(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-violet-300 text-violet-600 font-bold text-sm hover:bg-violet-50 transition-colors"
            >
              + Book Another Teleconsult
            </button>
          </div>
        )}

        {/* ── Jitsi Video Room Modal (Prompt 18.2) ────────────────────────── */}
        {activeVideoRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-800">
              <VideoRoom
                roomName={activeVideoRoom.roomId}
                displayName={`ASHA (${user?.name || 'Worker'}) - for ${activeVideoRoom.patientName}`}
                waitingBanner={`Waiting for ${activeVideoRoom.doctorName} to connect... Your connection is live.`}
                onClose={() => {
                  setActiveVideoRoom(null);
                  loadMyTeleconsults();
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom safe area spacer for mobile */}
        <div className="h-8" />
      </div>
    </div>
  );
}
