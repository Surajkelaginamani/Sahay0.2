import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Video,
  Users,
  AlertTriangle,
  Activity,
  ExternalLink,
  Zap,
  FileText,
  CircleDot,
  Power,
  Siren,
} from 'lucide-react';
import QueuePanel from '../../features/doctor/components/QueuePanel';
import ConsultationPanel from '../../features/doctor/components/ConsultationPanel';
import PatientHistory from '../../features/doctor/components/PatientHistory';
import VideoRoom from '../../components/common/VideoRoom';
import doctorApi from '../../features/doctor/services/doctorApi';
import { deriveQueueMetrics } from '../../features/doctor/utils/queueCalculations';

// ── Stat card (desktop header strip) ─────────────────────────────────────────
function StatCard({ Icon, label, value, sub, color }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border ${color.border} dark:border-slate-700 p-3.5 flex items-center gap-3 shadow-sm`}>
      <div className={`w-10 h-10 rounded-xl ${color.icon} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
        <p className={`text-lg font-extrabold ${color.text} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Toast notification ────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white max-w-sm ${
      isSuccess ? 'border-emerald-200' : 'border-rose-200'
    }`}>
      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
        isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
      }`}>
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-slate-900 text-sm">{toast.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser]                               = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [workspaceTab, setWorkspaceTab]               = useState('consultation');
  const [queueRefresh, setQueueRefresh]               = useState(0);
  const [appointments, setAppointments]               = useState([]);
  const [completedCount, setCompletedCount]           = useState(0);
  const [queueStats, setQueueStats]                   = useState({
    total: 0, urgent: 0, checkedIn: 0, waiting: 0, reportsReady: 0, teleconsults: 0, patientWaitingInCall: 0, criticalLabs: 0, emergency: 0,
  });

  // Strictly derived KPI metrics directly from appointments array
  const derivedMetrics = useMemo(() => deriveQueueMetrics(appointments), [appointments]);
  const [toast, setToast]     = useState(null);
  // Mobile view: 'queue' | 'consultation'
  const [viewMode, setViewMode] = useState('queue');
  // Doctor Duty Status (Prompt: Doctor Duty Synchronization)
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [togglingDuty, setTogglingDuty] = useState(false);

  // Auth guard
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) { navigate('/auth/hospital/login'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Doctor') { navigate('/'); return; }
    setUser(parsed);
    if (typeof parsed.isOnDuty === 'boolean') {
      setIsOnDuty(parsed.isOnDuty);
    }
    // Fetch latest duty status from backend
    doctorApi.getDutyStatus().then((res) => {
      if (typeof res.data?.isOnDuty === 'boolean') {
        setIsOnDuty(res.data.isOnDuty);
      }
    }).catch(() => {});
  }, [navigate]);

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/hospital/login');
  };

  const handleToggleDuty = async () => {
    setTogglingDuty(true);
    const newStatus = !isOnDuty;
    try {
      await doctorApi.updateDutyStatus(newStatus);
      setIsOnDuty(newStatus);
      if (user) {
        const updatedUser = { ...user, isOnDuty: newStatus };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      showToast(
        'success',
        newStatus ? 'You are On Duty' : 'You are Off Duty',
        newStatus
          ? 'Status live. Reception can now assign walk-ins and OPD patients to you.'
          : 'Status set to inactive. Reception is informed that you are off duty.'
      );
    } catch (err) {
      showToast('error', 'Status Update Failed', err.response?.data?.message || 'Could not update duty status.');
    } finally {
      setTogglingDuty(false);
    }
  };

  const handleQueueLoaded = useCallback((data) => {
    const list = data?.appointments || data?.queue || [];
    setAppointments(list);
    if (data?.summary) setQueueStats(data.summary);
  }, []);

  const handleSelectPatient = useCallback((appt) => {
    setSelectedAppointment(appt);
    setViewMode('consultation'); // mobile: switch to consultation view
    if (appt) {
      setWorkspaceTab('consultation');
      const rawPatientId = appt.patientId?._id || appt.patientId?.id || (typeof appt.patientId === 'string' ? appt.patientId : null);
      if (rawPatientId && rawPatientId !== '[object Object]') {
        doctorApi.getPatientHistory(rawPatientId).catch(() => {});
      }
      if (appt.type === 'Teleconsultation' || appt.teleconsultRoomId) {
        doctorApi.joinTeleconsult(appt._id).catch(() => {});
      }
    }
  }, []);

  const handleBackToQueue = useCallback(() => {
    setViewMode('queue');
    setSelectedAppointment(null);
  }, []);

  const handleConsultationSaved = useCallback((data) => {
    const patientName = data?.consultation?.patientId?.firstName
      ? `${data.consultation.patientId.firstName} ${data.consultation.patientId.lastName || ''}`
      : 'Patient';
    showToast('success', 'Consultation Saved', `Consultation finalized for ${patientName}.`);
    setSelectedAppointment(null);
    setViewMode('queue');
    setCompletedCount((c) => c + 1);
    setQueueRefresh((r) => r + 1);
  }, [showToast]);

  const handleLabRequested = useCallback((data) => {
    const testSummary = Array.isArray(data?.labOrders) && data.labOrders.length > 0
      ? data.labOrders.map((o) => o.testName).join(', ')
      : (data?.labOrder?.testName || 'Investigation');
    showToast('success', 'Lab Orders Placed', `"${testSummary}" requested. Patient updated to Lab Pending.`);
    setSelectedAppointment(null);
    setViewMode('queue');
    setQueueRefresh((r) => r + 1);
  }, [showToast]);

  if (!user) return null;

  const isTeleconsultMode = selectedAppointment &&
    (selectedAppointment.type === 'Teleconsultation' || selectedAppointment.teleconsultRoomId);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[85vh] bg-slate-50 dark:bg-slate-900">
      <Toast toast={toast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{t('doctor.title')}</h1>
                {/* ── Doctor Duty Status Toggle Button (Prompt: Doctor Duty Synchronization) ── */}
                <button
                  type="button"
                  id="doctor-duty-toggle-btn"
                  onClick={handleToggleDuty}
                  disabled={togglingDuty}
                  title="Click to toggle between On Duty and Off Duty status"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
                    isOnDuty
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isOnDuty ? (
                    <>
                      <CircleDot className="w-4 h-4 text-emerald-600 animate-pulse mr-2" />
                      <span>{t('doctor.duty.on')}</span>
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 text-slate-400 mr-2" />
                      <span>{t('doctor.duty.off')}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dr. <span className="font-semibold text-sky-700">{user.name}</span>
                {user.hospitalName && <span className="text-slate-400"> · {user.hospitalName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => navigate('/doctor')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold border border-sky-100 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('doctor.clinicalTimeline')}
            </button>
            <button
              onClick={() => navigate('/district-referrals')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 transition-all cursor-pointer shadow-xs"
              title="Open District Hospital Emergency Referrals Inbox"
            >
              <Siren className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>Emergency Referrals</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700 hover:text-rose-700 dark:hover:text-rose-400 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t('common.logout')}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            STATS STRIP (desktop) - strictly derived from appointments array
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            Icon={Users}
            label={t('doctor.metrics.waiting')}
            value={derivedMetrics.waitingCount}
            sub={t('doctor.metrics.waitingSub', { count: derivedMetrics.checkedInCount || 0 })}
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-600', text: 'text-sky-800' }}
          />
          <StatCard
            Icon={AlertTriangle}
            label={t('doctor.metrics.urgent')}
            value={derivedMetrics.urgentCount}
            sub={derivedMetrics.criticalLabsCount > 0 ? t('doctor.metrics.criticalLabSub', { count: derivedMetrics.criticalLabsCount }) : t('doctor.metrics.urgentSub')}
            color={derivedMetrics.criticalLabsCount > 0
              ? { border: 'border-red-300 ring-2 ring-red-200', icon: 'bg-red-100 text-red-600 animate-pulse', text: 'text-red-700' }
              : { border: 'border-rose-100', icon: 'bg-rose-100 text-rose-500', text: 'text-rose-700' }
            }
          />
          <StatCard
            Icon={CheckCircle2}
            label={t('doctor.metrics.completed')}
            value={derivedMetrics.completedTodayCount}
            sub={t('doctor.metrics.completedSub')}
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' }}
          />
          <StatCard
            Icon={Video}
            label={t('doctor.metrics.virtual')}
            value={derivedMetrics.virtualCount}
            sub={derivedMetrics.patientWaitingInCallCount > 0 ? t('doctor.metrics.virtualWaitingSub', { count: derivedMetrics.patientWaitingInCallCount }) : t('doctor.metrics.virtualSub')}
            color={{ border: 'border-violet-100', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-800' }}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MOBILE: Back to Queue header (when in consultation view)
        ═══════════════════════════════════════════════════════════════════ */}
        {viewMode === 'consultation' && selectedAppointment && (
          <div className="flex items-center justify-between lg:hidden bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={handleBackToQueue}
              className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-sky-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('doctor.queue.backToQueue')}
            </button>
            <span className="text-xs font-semibold text-slate-400 truncate max-w-[140px]">
              {selectedAppointment.patientFullName}
            </span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TELECONSULT MODE: full-width side-by-side layout
        ═══════════════════════════════════════════════════════════════════ */}
        {isTeleconsultMode ? (
          <div className="space-y-4">
            {/* Teleconsult banner */}
            <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-violet-700/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-400/40 flex items-center justify-center shrink-0">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-extrabold text-white">{t('doctor.teleconsult.title')}</h2>
                    {selectedAppointment.status === 'Patient Waiting in Room' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-ping" />
                        {t('doctor.teleconsult.patientWaiting')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-violet-400 text-violet-950 uppercase">
                        {t('doctor.teleconsult.active')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-violet-200 mt-0.5">
                    {t('doctor.teleconsult.patient')}: <strong className="text-white">{selectedAppointment.patientFullName}</strong>
                    {selectedAppointment.timeSlot && ` · ${t('doctor.teleconsult.slot')}: ${selectedAppointment.timeSlot}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedAppointment(null); setViewMode('queue'); }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 text-xs font-bold transition-all border border-white/10"
              >
                {t('doctor.teleconsult.exit')}
              </button>
            </div>

            {/* Side-by-side: Video | Consultation */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-6">
                <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 shadow-2xl overflow-hidden">
                  <VideoRoom
                    roomName={selectedAppointment.teleconsultRoomId || `sahay-room-${selectedAppointment._id}`}
                    displayName={`Dr. ${user.name}`}
                    onClose={() => setSelectedAppointment(null)}
                  />
                </div>
              </div>
              <div className="xl:col-span-6 space-y-4">
                {/* Tab bar for teleconsult */}
                <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1">
                  {[
                    { id: 'consultation', label: t('doctor.tabs.consultation') },
                    { id: 'labReports',   label: t('doctor.tabs.labReports'), critical: selectedAppointment?.isCriticalLab || selectedAppointment?.labOrders?.some((o) => o.isCritical) },
                    { id: 'history',      label: t('doctor.tabs.history') },
                  ].map(({ id, label, critical }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setWorkspaceTab(id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        workspaceTab === id
                          ? critical
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-sky-600 text-white shadow-sm'
                          : critical
                          ? 'text-red-600 animate-pulse'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                      {critical && workspaceTab !== id && (
                        <span className="ml-1 px-1 py-0.5 rounded-full bg-red-100 text-red-700 text-[8px] font-black">CRITICAL</span>
                      )}
                    </button>
                  ))}
                </div>

                {workspaceTab === 'history' ? (
                  <PatientHistory
                    patientId={selectedAppointment.patientId?._id || selectedAppointment.patientId}
                    patient={selectedAppointment.patientId}
                  />
                ) : (
                  <ConsultationPanel
                    appointment={selectedAppointment}
                    onConsultationSaved={handleConsultationSaved}
                    onLabRequested={handleLabRequested}
                    onCancel={() => { setSelectedAppointment(null); setViewMode('queue'); }}
                    initialTab={workspaceTab === 'labReports' ? 'labReports' : 'vitals'}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
              STANDARD OPD LAYOUT: Queue (4 cols) | Consultation (8 cols)
          ═══════════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* ── LEFT: Queue Panel ──────────────────────────────────────── */}
            <div className={`lg:col-span-4 lg:sticky lg:top-5 ${viewMode === 'consultation' ? 'hidden lg:block' : 'block'}`}>
              <QueuePanel
                selectedAppointmentId={selectedAppointment?._id}
                onSelectPatient={handleSelectPatient}
                refreshTrigger={queueRefresh}
                onQueueLoaded={handleQueueLoaded}
                completedCount={completedCount}
              />
            </div>

            {/* ── RIGHT: Consultation Workspace ──────────────────────────── */}
            <div className={`lg:col-span-8 space-y-4 ${viewMode === 'queue' && !selectedAppointment ? 'hidden lg:block' : viewMode === 'consultation' ? 'block' : 'hidden lg:block'}`}>
              {selectedAppointment ? (
                <>
                  {/* Tab bar */}
                  <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1">
                    {[
                      { id: 'consultation', label: t('doctor.tabs.consultation') },
                      {
                        id: 'labReports',
                        label: t('doctor.tabs.labReports'),
                        critical: selectedAppointment?.isCriticalLab || selectedAppointment?.labOrders?.some((o) => o.isCritical),
                        count: selectedAppointment?.labOrders?.length || 0,
                      },
                      { id: 'history', label: t('doctor.tabs.history') },
                    ].map(({ id, label, critical, count }) => (
                      <button
                        key={id}
                        type="button"
                        id={`doctor-dashboard-${id}-tab`}
                        onClick={() => setWorkspaceTab(id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                          workspaceTab === id
                            ? critical
                              ? 'bg-red-600 text-white shadow-sm animate-pulse'
                              : 'bg-sky-600 text-white shadow-sm'
                            : critical
                            ? 'text-red-600 bg-red-50 border border-red-200 animate-pulse'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {id === 'consultation' && <Activity className="w-3.5 h-3.5" />}
                        {id === 'labReports'   && <Activity className="w-3.5 h-3.5" />}
                        {id === 'history'      && <FileText className="w-3.5 h-3.5" />}
                        {label}
                        {critical && (
                          <span className="px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[8px] font-black uppercase">CRITICAL</span>
                        )}
                        {count > 0 && !critical && id === 'labReports' && (
                          <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[9px] font-bold">{count}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {workspaceTab === 'history' ? (
                    <PatientHistory
                      patientId={selectedAppointment.patientId?._id || selectedAppointment.patientId?.id || (typeof selectedAppointment.patientId === 'string' ? selectedAppointment.patientId : null)}
                      patient={selectedAppointment.patientId}
                    />
                  ) : (
                    <ConsultationPanel
                      appointment={selectedAppointment}
                      onConsultationSaved={handleConsultationSaved}
                      onLabRequested={handleLabRequested}
                      onCancel={() => { setSelectedAppointment(null); setViewMode('queue'); }}
                      initialTab={workspaceTab === 'labReports' ? 'labReports' : 'vitals'}
                    />
                  )}
                </>
              ) : (
                /* Empty state when no patient selected */
                <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-8 h-8 text-teal-400" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">{t('doctor.emptyState.title')}</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    {t('doctor.emptyState.subtitle')}
                  </p>
                  {derivedMetrics.waitingCount > 0 && (
                    <p className="text-xs text-teal-600 font-semibold mt-3">
                      {t('doctor.queue.waitingCount', { count: derivedMetrics.waitingCount })}
                      {derivedMetrics.criticalLabsCount > 0 && (
                        <span className="text-red-600 ml-1">· {t('doctor.metrics.criticalLabCount', { count: derivedMetrics.criticalLabsCount })}</span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
