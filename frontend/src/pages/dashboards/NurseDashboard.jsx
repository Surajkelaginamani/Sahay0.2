import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TriageQueue from '../../features/nurse/components/TriageQueue';
import VitalsForm from '../../features/nurse/components/VitalsForm';
import LabCoordination from '../../features/nurse/components/LabCoordination';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-2xl border ${color.border} p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`w-11 h-11 rounded-xl ${color.icon} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className={`text-xl font-extrabold ${color.text} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [user, setUser]                               = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab]                     = useState('triage'); // 'triage' | 'labCoordination'
  const [refreshTrigger, setRefreshTrigger]           = useState(0);
  const [vitalsCapturedCount, setVitalsCapturedCount] = useState(0);
  const [queueStats, setQueueStats]                   = useState({
    total: 0,
    urgent: 0,
    routine: 0,
  });
  const [toast, setToast]                             = useState(null);
  const [currentTime, setCurrentTime]                 = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Live time ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Auth & role check
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/hospital/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'Nurse') {
        navigate('/');
        return;
      }
      setUser(parsed);
    } catch {
      navigate('/auth/hospital/login');
    }
  }, [navigate]);

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/hospital/login');
  };

  const handleQueueLoaded = useCallback(({ summary }) => {
    if (summary) {
      setQueueStats(summary);
    }
  }, []);

  const handleVitalsSuccess = useCallback((data) => {
    const appt = data?.appointment;
    const pName = appt?.patientId?.firstName
      ? `${appt.patientId.firstName} ${appt.patientId.lastName || ''}`.trim()
      : selectedAppointment?.patientFullName || 'Patient';

    showToast(
      'success',
      'Vitals Recorded & Forwarded',
      `${pName}'s clinical vitals were saved. Appointment transitioned to "Waiting for Doctor" queue.`
    );

    setSelectedAppointment(null);
    setVitalsCapturedCount((c) => c + 1);
    setRefreshTrigger((r) => r + 1);
  }, [showToast, selectedAppointment]);

  if (!user) return null;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-50 px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white border-teal-200 text-sm font-medium max-w-sm transition-all animate-bounce-short">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
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
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-200 shrink-0 p-3">
              {/* Stethoscope / Cross Icon */}
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">Nurse & Triage Station</h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  On Duty
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff: <span className="font-semibold text-teal-800">{user.name}</span>
                {user.hospitalName && <span className="text-slate-400"> · {user.hospitalName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {/* Live Time indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{currentTime}</span>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => setRefreshTrigger((r) => r + 1)}
              title="Refresh Triage Queue"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-all border border-teal-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Logout */}
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

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            label="Waiting at Triage"
            value={queueStats.total}
            sub={`${queueStats.urgent} urgent flag(s)`}
            color={{ border: 'border-teal-100', icon: 'bg-teal-100 text-teal-700', text: 'text-teal-800' }}
          />

          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Urgent Priority"
            value={queueStats.urgent}
            sub="Immediate attention required"
            color={{ border: 'border-rose-100', icon: 'bg-rose-100 text-rose-600', text: 'text-rose-700' }}
          />

          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Vitals Recorded Today"
            value={vitalsCapturedCount}
            sub="Forwarded to doctor OPD"
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' }}
          />

          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            label="Routine Patients"
            value={queueStats.routine ?? (queueStats.total - queueStats.urgent)}
            sub="Standard screening"
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-700', text: 'text-sky-800' }}
          />
        </div>

        {/* ── Nurse Workspace Tabs (Prompt 8.2) ─────────────────────────── */}
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('triage')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'triage'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Triage & Vitals Queue</span>
              {queueStats.total > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'triage' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {queueStats.total}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('labCoordination')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'labCoordination'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>Lab Coordination</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'labCoordination' ? 'bg-teal-700 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                Step 4.2 / 4.4
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-semibold pr-3 hidden sm:inline">
            Clinical Workflow Coordination
          </span>
        </div>

        {/* ── Active Tab View ─────────────────────────────────────────────── */}
        {activeTab === 'triage' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Triage Queue Table */}
            <div className="lg:col-span-7 xl:col-span-7">
              <TriageQueue
                selectedAppointmentId={selectedAppointment?._id}
                onEnterVitals={setSelectedAppointment}
                refreshTrigger={refreshTrigger}
                onQueueLoaded={handleQueueLoaded}
              />
            </div>

            {/* Right Column: Vitals Form */}
            <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6">
              <VitalsForm
                appointment={selectedAppointment}
                onSuccess={handleVitalsSuccess}
                onCancel={() => setSelectedAppointment(null)}
              />
            </div>
          </div>
        ) : (
          <LabCoordination
            onActionSuccess={(msg) => showToast('success', 'Lab Coordination', msg)}
          />
        )}

      </div>
    </div>
  );
}
