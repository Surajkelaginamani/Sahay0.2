import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorQueue from '../../features/doctor/components/DoctorQueue';
import ConsultationPanel from '../../features/doctor/components/ConsultationPanel';
import PatientHistory from '../../features/doctor/components/PatientHistory';
import VideoRoom from '../../components/common/VideoRoom';

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

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [user, setUser]                               = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [workspaceTab, setWorkspaceTab]               = useState('consultation'); // 'consultation' | 'history'
  const [queueRefresh, setQueueRefresh]               = useState(0);
  const [completedCount, setCompletedCount]           = useState(0);
  const [queueStats, setQueueStats]                   = useState({
    total: 0,
    urgent: 0,
    checkedIn: 0,
    waiting: 0,
    reportsReady: 0,
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) { navigate('/auth/hospital/login'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Doctor') { navigate('/'); return; }
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

  const handleQueueLoaded = useCallback(({ summary }) => {
    if (summary) {
      setQueueStats(summary);
    }
  }, []);

  const handleSelectPatient = useCallback((appt) => {
    setSelectedAppointment(appt);
    if (appt) {
      setWorkspaceTab('consultation');
    }
  }, []);

  const handleConsultationSaved = useCallback((data) => {
    const patientName = data?.consultation?.patientId?.firstName
      ? `${data.consultation.patientId.firstName} ${data.consultation.patientId.lastName || ''}`
      : 'Patient';

    showToast('success', 'Consultation Saved', `Consultation finalized and appointment marked completed for ${patientName}.`);
    setSelectedAppointment(null);
    setCompletedCount((c) => c + 1);
    setQueueRefresh((r) => r + 1);
  }, [showToast]);

  const handleLabRequested = useCallback((data) => {
    const testSummary = Array.isArray(data?.labOrders) && data.labOrders.length > 0
      ? data.labOrders.map((o) => o.testName).join(', ')
      : (data?.labOrder?.testName || 'Investigation');
    showToast('success', 'Lab Orders Placed', `"${testSummary}" requested. Patient status updated to Lab Pending.`);
    setSelectedAppointment(null);
    setQueueRefresh((r) => r + 1);
  }, [showToast]);

  if (!user) return null;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-50 px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white border-emerald-200 text-sm font-medium max-w-sm">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
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
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-md shadow-sky-200 shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">Doctor OPD Workspace</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  ● On Duty
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dr. <span className="font-semibold text-sky-700">{user.name}</span>
                {user.hospitalName && <span className="text-slate-400"> · {user.hospitalName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Quick link to longitudinal patient timeline / alternate workspace */}
            <button
              onClick={() => navigate('/doctor')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-all border border-sky-100"
            >
              <span>Clinical Timeline</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
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

        {/* ── Dynamic Live Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="Waiting in Queue"
            value={queueStats.total}
            sub={`${queueStats.checkedIn} checked in`}
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-600', text: 'text-sky-800' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Urgent Priority"
            value={queueStats.urgent}
            sub="Immediate triage required"
            color={{ border: 'border-rose-100', icon: 'bg-rose-100 text-rose-600', text: 'text-rose-700' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Consultations Today"
            value={completedCount}
            sub="Finalized sessions"
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
            label="Reports Ready"
            value={queueStats.reportsReady || 0}
            sub="Lab tests awaiting review"
            color={{ border: 'border-teal-100', icon: 'bg-teal-100 text-teal-700', text: 'text-teal-800' }}
          />
        </div>

        {/* ── Main Workspace: Queue Sidebar + Clinical Panel ─────────── */}
        {selectedAppointment && (selectedAppointment.type === 'Teleconsultation' || selectedAppointment.teleconsultRoomId) ? (
          /* ── Side-by-Side Teleconsultation Workspace (Prompt 17.4) ────────── */
          <div className="space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-950 text-white p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl border border-violet-700/50">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-400/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  📹
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">Virtual OPD Teleconsultation Session</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase tracking-wider animate-pulse">
                      Live Teleconsult Active
                    </span>
                  </div>
                  <p className="text-xs text-violet-200 mt-0.5">
                    Patient: <strong className="text-white">{selectedAppointment.patientFullName}</strong>
                    {selectedAppointment.patientId?.gender && ` (${selectedAppointment.patientId.gender})`}
                    {selectedAppointment.timeSlot && ` · Slot: ${selectedAppointment.timeSlot}`}
                    {selectedAppointment.teleconsultSource && ` · Via ${selectedAppointment.teleconsultSource}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 text-xs font-bold transition-all border border-white/10"
                >
                  ✕ Exit Video Session
                </button>
              </div>
            </div>

            {/* 50% Left (Video) / 50% Right (ABDM Panel) Split */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left Panel (50%): Live Jitsi Video Conference */}
              <div className="xl:col-span-6 space-y-3">
                <div className="bg-slate-950 rounded-3xl p-3 border border-slate-800 shadow-2xl overflow-hidden">
                  <VideoRoom
                    roomName={selectedAppointment.teleconsultRoomId || `room-sahay-${selectedAppointment._id}`}
                    displayName={`Dr. ${user.name}`}
                    onClose={() => setSelectedAppointment(null)}
                  />
                </div>
              </div>

              {/* Right Panel (50%): Standard ABDM Clinical Consultation Station */}
              <div className="xl:col-span-6 space-y-4">
                {/* 2-Tab Navigation Bar */}
                <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWorkspaceTab('consultation')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                        workspaceTab === 'consultation'
                          ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Current Consultation</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWorkspaceTab('history')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                        workspaceTab === 'history'
                          ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Medical History</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-semibold pr-3 hidden sm:inline">
                    ABDM Consultation Station
                  </span>
                </div>

                {/* Active Tab View */}
                {workspaceTab === 'consultation' ? (
                  <ConsultationPanel
                    appointment={selectedAppointment}
                    onConsultationSaved={handleConsultationSaved}
                    onLabRequested={handleLabRequested}
                    onCancel={() => setSelectedAppointment(null)}
                  />
                ) : (
                  <PatientHistory
                    patientId={selectedAppointment.patientId?._id || selectedAppointment.patientId}
                    patient={selectedAppointment.patientId}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Standard Physical OPD Layout: Queue (4 cols) + Workspace (8 cols) ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Doctor Queue */}
            <div className="lg:col-span-4 xl:col-span-4 sticky top-6">
              <DoctorQueue
                selectedAppointmentId={selectedAppointment?._id}
                onSelectPatient={handleSelectPatient}
                refreshTrigger={queueRefresh}
                onQueueLoaded={handleQueueLoaded}
              />
            </div>

            {/* Right Column: 2-Tab Clinical Workspace (Prompt 7.3) */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-4">
              {selectedAppointment ? (
                <>
                  {/* 2-Tab Navigation Bar */}
                  <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setWorkspaceTab('consultation')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                          workspaceTab === 'consultation'
                            ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Current Consultation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWorkspaceTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                          workspaceTab === 'history'
                            ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Medical History</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 font-semibold pr-3 hidden sm:inline">
                      Doctor Clinical Station
                    </span>
                  </div>

                  {/* Active Tab View */}
                  {workspaceTab === 'consultation' ? (
                    <ConsultationPanel
                      appointment={selectedAppointment}
                      onConsultationSaved={handleConsultationSaved}
                      onLabRequested={handleLabRequested}
                      onCancel={() => setSelectedAppointment(null)}
                    />
                  ) : (
                    <PatientHistory
                      patientId={selectedAppointment.patientId?._id || selectedAppointment.patientId}
                      patient={selectedAppointment.patientId}
                    />
                  )}
                </>
              ) : (
                <ConsultationPanel
                  appointment={null}
                  onConsultationSaved={handleConsultationSaved}
                  onLabRequested={handleLabRequested}
                  onCancel={() => setSelectedAppointment(null)}
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

