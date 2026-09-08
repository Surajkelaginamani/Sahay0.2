import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import pharmacyApi from '../../features/pharmacy/services/pharmacyApi';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-2xl border ${color.border} p-4 flex items-center gap-3.5 shadow-sm`}>
      <div className={`w-11 h-11 rounded-xl ${color.icon} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className={`text-xl font-extrabold ${color.text} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dispenseSubmitting, setDispenseSubmitting] = useState(false);
  const [dispensedCount, setDispensedCount] = useState(0);
  const [verifiedCheck, setVerifiedCheck] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/hospital/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Pharmacist') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/hospital/login');
  };

  // ── Fetch Active Prescriptions (Prompt 9.1) ─────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await pharmacyApi.getActivePrescriptions();
      const list = res.data?.prescriptions || [];
      setPrescriptions(list);
      // If currently selected prescription was dispensed or removed, update or keep
      setSelectedRx((prev) => {
        if (!prev) return list[0] || null;
        const exists = list.find((r) => r._id === prev._id);
        return exists || list[0] || null;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load active prescription queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchQueue();
    }
  }, [user, fetchQueue]);

  // Reset verification check when changing selected prescription
  useEffect(() => {
    setVerifiedCheck(false);
  }, [selectedRx?._id]);

  // ── Search & Filter ─────────────────────────────────────────────────────────
  const filteredPrescriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter((rx) => {
      const name = (rx.patientFullName || '').toLowerCase();
      const phone = (rx.patientId?.contactPhone || '').toLowerCase();
      const abha = (rx.patientId?.abhaId || '').toLowerCase();
      const doctor = (rx.doctorId?.name || '').toLowerCase();
      const diagnosis = (rx.consultationId?.diagnosis || '').toLowerCase();
      const medicines = (rx.medications || [])
        .map((m) => (m.medicineName || m.drugName || '').toLowerCase())
        .join(' ');

      return (
        name.includes(q) ||
        phone.includes(q) ||
        abha.includes(q) ||
        doctor.includes(q) ||
        diagnosis.includes(q) ||
        medicines.includes(q)
      );
    });
  }, [prescriptions, searchQuery]);

  // ── Dispense Medication Action (Prompt 9.1 & 9.2) ───────────────────────────
  const handleDispense = async (e) => {
    e.preventDefault();
    if (!selectedRx) return;

    setDispenseSubmitting(true);
    try {
      await pharmacyApi.dispenseMedication(selectedRx._id);
      showToast(
        'success',
        'Medication Dispensed',
        `Prescription for ${selectedRx.patientFullName} has been marked as Dispensed.`
      );
      setDispensedCount((c) => c + 1);

      // Remove from local list immediately
      setPrescriptions((prev) => prev.filter((r) => r._id !== selectedRx._id));
      setSelectedRx(null);
      setVerifiedCheck(false);
    } catch (err) {
      showToast(
        'error',
        'Dispensing Failed',
        err.response?.data?.message || 'Failed to complete dispensing.'
      );
    } finally {
      setDispenseSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white ${
            toast.type === 'error' ? 'border-rose-200' : 'border-emerald-200'
          } text-sm font-medium max-w-sm`}
        >
          <div
            className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
              toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {toast.type === 'error' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm">{toast.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-200 shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">Hospital Pharmacy & Dispensary</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  ● Dispensary Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pharmacist: <span className="font-semibold text-emerald-700">{user.name}</span>
                {user.hospitalName && <span className="text-slate-400"> · {user.hospitalName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={fetchQueue}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all border border-slate-200 disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Queue</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ── Live Stats Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            label="Pending Prescriptions"
            value={prescriptions.length}
            sub="Awaiting dispensing"
            color={{ border: 'border-amber-100', icon: 'bg-amber-100 text-amber-700', text: 'text-amber-800' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Dispensed Today"
            value={dispensedCount}
            sub="Fulfilled prescriptions"
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            label="Active Patients"
            value={new Set(prescriptions.map((r) => r.patientId?._id)).size}
            sub="Waiting at counter"
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-700', text: 'text-sky-800' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            label="Total Prescribed Drugs"
            value={prescriptions.reduce((acc, r) => acc + (r.medications?.length || 0), 0)}
            sub="Medication items"
            color={{ border: 'border-violet-100', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-700' }}
          />
        </div>

        {/* ── Main Workspace: Queue (Left) + Detail & Dispense (Right) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Prescription Queue (Prompt 9.2) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Queue Header & Search */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {prescriptions.length}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Active Prescriptions</h2>
                    <p className="text-[11px] text-slate-400">Incoming from doctor consultations</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                  Step 4.5
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by patient, doctor, medicine..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800
                    placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 mx-4 my-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={fetchQueue} className="font-bold underline ml-2">Retry</button>
              </div>
            )}

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[350px] max-h-[640px]">
              {loading && (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && prescriptions.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-slate-700">Dispensary Queue is Clear</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No pending digital prescriptions waiting for fulfillment.
                  </p>
                </div>
              )}

              {!loading && prescriptions.length > 0 && filteredPrescriptions.length === 0 && (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold">No matching prescriptions</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-emerald-600 font-bold mt-1 underline"
                  >
                    Reset search
                  </button>
                </div>
              )}

              {!loading &&
                filteredPrescriptions.map((rx) => {
                  const isSelected = selectedRx?._id === rx._id;
                  const patient = rx.patientId || {};
                  const doctor = rx.doctorId || {};

                  return (
                    <div
                      key={rx._id}
                      onClick={() => setSelectedRx(rx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/40'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {rx.patientFullName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Pending
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {patient.gender && <span>{patient.gender}</span>}
                            {rx.patientAge !== null && <span> · {rx.patientAge} yrs</span>}
                            {patient.contactPhone && <span> · 📞 {patient.contactPhone}</span>}
                          </p>
                        </div>

                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                          <span>💊</span>
                          <span>{rx.medicationCount} Drugs</span>
                        </span>
                      </div>

                      {/* Doctor & Diagnosis snippet */}
                      <div className="mt-2 text-[11px] text-slate-600 bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="truncate">
                          <strong className="text-slate-400 uppercase text-[9px] mr-1">Dr:</strong>
                          {doctor.name || 'OPD Physician'}
                        </span>
                        {rx.consultationId?.diagnosis && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                            {rx.consultationId.diagnosis}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/70">
                        <span>Rx #{rx._id.slice(-6).toUpperCase()}</span>
                        <span>{new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Column: Detailed Prescription View & Dispense Action (Prompt 9.2) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedRx ? (
              <div className="space-y-4">
                {/* Patient Profile Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                      {selectedRx.patientFullName?.[0] || 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900">
                          {selectedRx.patientFullName}
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Digital Prescription
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedRx.patientId?.gender && <span className="capitalize">{selectedRx.patientId.gender}</span>}
                        {selectedRx.patientAge !== null && ` · ${selectedRx.patientAge} yrs`}
                        {selectedRx.patientId?.bloodGroup && ` · Blood: ${selectedRx.patientId.bloodGroup}`}
                        {selectedRx.patientId?.contactPhone && ` · 📞 ${selectedRx.patientId.contactPhone}`}
                      </p>
                      {selectedRx.patientId?.abhaId && (
                        <p className="text-[11px] font-mono text-sky-700 font-semibold mt-0.5">
                          ABHA ID: {selectedRx.patientId.abhaId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Prescribed By</p>
                    <p className="text-xs font-extrabold text-slate-800">
                      Dr. {selectedRx.doctorId?.name || 'Physician'}
                    </p>
                    {selectedRx.doctorId?.specialization && (
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        {selectedRx.doctorId.specialization}
                      </p>
                    )}
                  </div>
                </div>

                {/* Consultation Remarks & Diagnosis */}
                {selectedRx.consultationId && (
                  <div className="bg-gradient-to-r from-white to-emerald-50/30 rounded-3xl border border-emerald-100 p-4 shadow-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Clinical Diagnosis:</span>
                        <p className="font-extrabold text-slate-900 mt-0.5">
                          {selectedRx.consultationId.diagnosis || 'General OPD Consultation'}
                        </p>
                      </div>
                      {selectedRx.consultationId.chiefComplaint && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">Chief Complaint:</span>
                          <p className="text-slate-700 mt-0.5 truncate">
                            {selectedRx.consultationId.chiefComplaint}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prescribed Medications Table (Prompt 9.2) */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                        💊
                      </span>
                      <span>Prescribed Medication Schedule ({selectedRx.medications?.length || 0})</span>
                    </h3>

                    <span className="text-[10px] font-bold text-slate-400">
                      Rx #{selectedRx._id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  {/* Medications List */}
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <div className="col-span-4">Medicine / Drug</div>
                      <div className="col-span-2">Dosage</div>
                      <div className="col-span-3">Frequency</div>
                      <div className="col-span-3">Duration</div>
                    </div>

                    {(selectedRx.medications || []).map((med, idx) => (
                      <div key={idx} className="px-4 py-3 grid grid-cols-12 text-xs items-center hover:bg-slate-50/50">
                        <div className="col-span-4 font-bold text-slate-900">
                          <span className="mr-1.5 text-emerald-600">#{idx + 1}</span>
                          {med.medicineName || med.drugName || 'Unnamed Medicine'}
                          {med.instructions && (
                            <p className="text-[10px] font-normal text-slate-500 mt-0.5 italic">
                              Note: {med.instructions}
                            </p>
                          )}
                        </div>

                        <div className="col-span-2 text-slate-700 font-semibold font-mono">
                          {med.dosage || '—'}
                        </div>

                        <div className="col-span-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold">
                            {med.frequency || 'As directed'}
                          </span>
                        </div>

                        <div className="col-span-3 text-slate-700 font-semibold">
                          {med.duration || (med.durationDays ? `${med.durationDays} days` : 'Standard')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* General Instructions */}
                  {selectedRx.instructions && (
                    <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80 text-xs">
                      <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-0.5">
                        <span>⚠️</span>
                        <span>Doctor's Special Instructions for Patient:</span>
                      </p>
                      <p className="text-amber-800 leading-relaxed pl-5 font-medium">
                        {selectedRx.instructions}
                      </p>
                    </div>
                  )}

                  {/* Pharmacist Dispense Form (Prompt 9.2) */}
                  <form onSubmit={handleDispense} className="pt-3 border-t border-slate-100 space-y-4">
                    <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                      <input
                        type="checkbox"
                        checked={verifiedCheck}
                        onChange={(e) => setVerifiedCheck(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        I confirm that the medications, dosages, and quantities have been inspected and prepared for{' '}
                        <strong className="text-slate-900">{selectedRx.patientFullName}</strong>.
                      </span>
                    </label>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        * Clicking dispense updates the electronic record and closes this pharmacy token.
                      </span>

                      <button
                        type="submit"
                        disabled={dispenseSubmitting || !verifiedCheck}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {dispenseSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Dispensing Medications...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Mark as Dispensed</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-base font-extrabold text-slate-800">Select a Prescription to Begin Dispensing</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click on any patient in the active queue on the left to inspect the doctor's prescribed medications, dosages, and dispensing instructions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
