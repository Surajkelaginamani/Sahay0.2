import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  UserPlus,
  ListOrdered,
  Calendar,
  Inbox,
  AlertCircle,
  Video,
  Search,
  LogOut,
  CheckCircle2,
  Clock,
  ShieldCheck,
  X,
  Plus,
  RotateCw,
  User,
  Users,
  AlertTriangle,
  ChevronRight,
  Key,
  CreditCard,
  Printer,
  Hash,
  Activity,
} from 'lucide-react';
import PatientRegistrationForm from '../../features/receptionist/components/PatientRegistrationForm';
import PatientSearch           from '../../features/receptionist/components/PatientSearch';
import TodayQueue              from '../../features/receptionist/components/TodayQueue';
import DoctorsDutyCard         from '../../features/receptionist/components/DoctorsDutyCard';
import AppointmentScheduler    from '../../features/receptionist/components/AppointmentScheduler';
import UpcomingAppointments    from '../../features/receptionist/components/UpcomingAppointments';
import MergeResolution         from '../../features/receptionist/components/MergeResolution';
import receptionistApi         from '../../features/receptionist/services/receptionistApi';
import axios                   from 'axios';

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border
      text-sm font-medium max-w-sm
      ${ok ? 'bg-white border-emerald-200' : 'bg-white border-rose-200'}`}
    >
      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
        ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
      >
        {ok ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-slate-900 text-sm">{toast.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
    </div>
  );
}

// ─── Tab definitions (Consolidated 4-tab model) ─────────────────────────────────
const TABS = [
  {
    id: 'queue',
    label: 'Live Queue',
    shortLabel: 'Live Queue',
    color: 'amber',
    icon: ListOrdered,
  },
  {
    id: 'appointments',
    label: 'Appointments',
    shortLabel: 'Appointments',
    color: 'sky',
    icon: Calendar,
  },
  {
    id: 'inbound',
    label: 'Inbound & Teleconsult',
    shortLabel: 'Inbound',
    color: 'emerald',
    icon: Inbox,
  },
  {
    id: 'conflicts',
    label: 'Sync Conflicts',
    shortLabel: 'Conflicts',
    color: 'orange',
    icon: AlertCircle,
  },
];

const TAB_ACTIVE_CLASSES = {
  amber:   'bg-amber-500 text-white shadow-sm shadow-amber-200',
  sky:     'bg-sky-600   text-white shadow-sm shadow-sky-200',
  emerald: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200',
  orange:  'bg-orange-500 text-white shadow-sm shadow-orange-200',
};
const TAB_INACTIVE_CLASSES = 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700';

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [user, setUser]                       = useState(null);
  const [activeTab, setActiveTab]             = useState('queue');
  const [apptSubTab, setApptSubTab]           = useState('upcoming'); // 'upcoming' | 'book'
  const [inboundSubTab, setInboundSubTab]     = useState('referrals'); // 'referrals' | 'teleconsults'
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInMode, setWalkInMode]           = useState('new'); // 'new' | 'search'
  const [toast, setToast]                     = useState(null);
  const [currentTime, setCurrentTime]         = useState(new Date());

  // Increment to trigger TodayQueue re-fetch
  const [queueRefresh, setQueueRefresh]       = useState(0);

  // Incoming ASHA referrals
  const [incomingReferrals, setIncomingReferrals] = useState([]);
  const [loadingReferrals, setLoadingReferrals]   = useState(false);

  // Data conflicts count
  const [conflictsCount, setConflictsCount]       = useState(0);

  // Teleconsult requests
  const [pendingTeleconsults, setPendingTeleconsults] = useState([]);
  const [loadingTeleconsults, setLoadingTeleconsults] = useState(false);
  const [facilityDoctors, setFacilityDoctors]         = useState([]);
  const [confirming, setConfirming]                   = useState(null);
  const [confirmDoctorId, setConfirmDoctorId]         = useState({});
  const [confirmTimeSlot, setConfirmTimeSlot]         = useState({});
  const [printedCardPatient, setPrintedCardPatient]   = useState(null);

  // ── Toast helper ────────────────────────────────────────────────────────
  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Live clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Session & Auth Error Handler ─────────────────────────────────────────
  const handleAuthError = useCallback((err) => {
    if (err?.response?.status === 401) {
      showToast('error', 'Session Expired', 'Your session has expired. Redirecting to login...');
      setTimeout(() => {
        ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
        navigate('/auth/hospital/login');
      }, 2500);
    }
  }, [showToast, navigate]);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored || !token) {
      navigate('/auth/hospital/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'Receptionist' && parsed.role !== 'HospitalAdmin') {
        navigate('/');
        return;
      }
      setUser(parsed);
    } catch {
      navigate('/auth/hospital/login');
    }
  }, [navigate]);

  // ── Load facility doctors ───────────────────────────────────────────────
  const loadFacilityDoctors = useCallback(async () => {
    try {
      const res = await receptionistApi.getFacilityDoctors();
      setFacilityDoctors(res.data.doctors || []);
    } catch (err) {
      if (err.response?.status === 401) handleAuthError(err);
    }
  }, [handleAuthError]);

  // ── Load incoming referrals ──────────────────────────────────────────────
  const loadIncomingReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const res = await receptionistApi.getIncomingReferrals();
      const list = res.data?.referrals || res.data?.inbound || [];
      setIncomingReferrals(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthError(err);
      }
    } finally {
      setLoadingReferrals(false);
    }
  }, [handleAuthError]);

  // ── Load pending teleconsults ───────────────────────────────────────────
  const loadPendingTeleconsults = useCallback(async () => {
    setLoadingTeleconsults(true);
    try {
      const res = await receptionistApi.getPendingTeleconsults();
      const list = res.data?.teleconsults || res.data?.appointments || [];
      setPendingTeleconsults(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthError(err);
      }
    } finally {
      setLoadingTeleconsults(false);
    }
  }, [handleAuthError]);

  const handleConfirmTeleconsult = useCallback(async (appointmentId) => {
    const doctorId = confirmDoctorId[appointmentId];
    if (!doctorId) return;
    setConfirming(appointmentId);
    try {
      const res = await receptionistApi.confirmTeleconsult({
        appointmentId,
        assignedDoctorId: doctorId,
        timeSlot: confirmTimeSlot[appointmentId] || '',
      });
      showToast('success', 'Teleconsult Confirmed',
        res.data?.message || 'Doctor assigned and room ID generated.');
      loadPendingTeleconsults();
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthError(err);
      } else {
        showToast('error', 'Confirm Failed', err.response?.data?.message || 'Could not confirm teleconsult.');
      }
    } finally {
      setConfirming(null);
    }
  }, [confirmDoctorId, confirmTimeSlot, showToast, loadPendingTeleconsults, handleAuthError]);

  useEffect(() => {
    if (user) {
      loadIncomingReferrals();
      loadPendingTeleconsults();
      loadFacilityDoctors();
    }
  }, [user, loadIncomingReferrals, loadPendingTeleconsults, loadFacilityDoctors]);

  useEffect(() => {
    if (user && activeTab === 'inbound' && inboundSubTab === 'teleconsults') {
      loadPendingTeleconsults();
      loadFacilityDoctors();
    }
  }, [user, activeTab, inboundSubTab, loadPendingTeleconsults, loadFacilityDoctors]);

  // ── Load conflicts count ────────────────────────────────────────────────
  const loadConflictsCount = useCallback(async () => {
    try {
      const res = await receptionistApi.getPendingConflicts();
      setConflictsCount((res.data.conflicts || []).length);
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    if (user) loadConflictsCount();
  }, [user, loadConflictsCount]);

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/hospital/login');
  };

  // ── Registration / Queue callbacks ────────────────────────────────     
  const handlePatientRegistered = useCallback(({ type, patient, queueInfo, recoveryCode, message }) => {
    if (type === 'registered') {
      const code = recoveryCode || patient?.recoveryCode;
      if (code) {
        setPrintedCardPatient({
          ...patient,
          recoveryCode: code,
        });
      }
      const alertMsg = message || 'Patient registered. They can log in using their phone number and default password: Sahay@123';
      if (queueInfo) {
        const docText = queueInfo.doctorName ? ` for Dr. ${queueInfo.doctorName}` : '';
        showToast('success', 'Patient Registered & Queued',
          `${patient.fullName} queued as #${queueInfo.queueNumber}${docText}. Login: ${patient.contactPhone || 'Phone'} / Sahay@123`);
      } else {
        showToast('success', 'Patient Registered', alertMsg);
      }
      setWalkInModalOpen(false);
      setActiveTab('queue');
      setQueueRefresh((n) => n + 1);
    } else if (type === 'found') {
      showToast('success', 'Patient Found', `Using existing record for ${patient.fullName}.`);
      setWalkInMode('search');
    }
  }, [showToast]);

  const handleQueueSuccess = useCallback(({ patient, doctorName, queueNumber, priority }) => {
    const docText      = doctorName ? ` for Dr. ${doctorName}` : '';
    const urgentPrefix = priority === 'Urgent' ? 'Urgent — ' : '';
    showToast('success', `${urgentPrefix}Added to Queue`,
      `${patient.fullName} is now Queue #${queueNumber}${docText}.`);
    setWalkInModalOpen(false);
    setActiveTab('queue');
    setQueueRefresh((n) => n + 1);
  }, [showToast]);

  const handleCheckInSuccess = useCallback(({ patientName, queueNumber }) => {
    showToast('success', 'Patient Checked In',
      `${patientName} is now Queue #${queueNumber}.`);
  }, [showToast]);

  const handleAppointmentBooked = useCallback(({ appointment, patient }) => {
    const docName = appointment?.assignedDoctorId?.name
      || appointment?.doctorName
      || '';
    const dateStr = appointment?.appointmentDate
      ? new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    showToast('success', 'Appointment Booked',
      `${patient?.fullName || 'Patient'} scheduled${docName ? ` with Dr. ${docName}` : ''}${dateStr ? ` on ${dateStr}` : ''}.`);
    setApptSubTab('upcoming');
  }, [showToast]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-rose-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 px-4 sm:px-8 py-8">
      <Toast toast={toast} />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm px-6 sm:px-8 py-6
          flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600
              flex items-center justify-center text-white shadow-lg shadow-rose-200/50 shrink-0"
            >
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {t('reception.title')}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1
                  rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {t('reception.live')}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-700">{user.name}</span>
                <span className="text-slate-300">·</span>
                <span>{user.hospitalName || 'Healthcare Facility'}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-600 text-xs">
                  {currentTime.toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Primary Action Button (Unified Walk-in) + Sign Out */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="header-register-btn"
              onClick={() => {
                setWalkInMode('new');
                setWalkInModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-200
                hover:from-rose-600 hover:to-pink-700 active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              <span>{t('reception.newWalkIn')}</span>
            </button>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200
                text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200
                hover:text-rose-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.signOut')}</span>
            </button>
          </div>
        </div>

        {/* ── Responsive Tab Strip (Single horizontal scrolling row) ──────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-1.5 overflow-x-auto scrollbar-none py-1 flex whitespace-nowrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === 'inbound'
              ? (incomingReferrals.length + pendingTeleconsults.length > 0 ? incomingReferrals.length + pendingTeleconsults.length : null)
              : tab.id === 'conflicts' && conflictsCount > 0
              ? conflictsCount
              : null;
            const tabLabel = tab.id === 'queue'
              ? t('reception.tabs.queue')
              : tab.id === 'appointments'
              ? t('reception.tabs.appointments')
              : tab.id === 'inbound'
              ? t('reception.tabs.inbound')
              : tab.id === 'conflicts'
              ? t('reception.tabs.conflicts')
              : tab.label;

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[135px] md:min-w-0 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                  text-sm font-semibold transition-all relative shrink-0
                  ${isActive
                    ? TAB_ACTIVE_CLASSES[tab.color]
                    : TAB_INACTIVE_CLASSES
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tabLabel}</span>
                <span className="sm:hidden">{tabLabel}</span>
                {badge ? (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                    isActive ? 'bg-white text-slate-900' : 'bg-rose-500 text-white'
                  }`}>
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* ── Tab panels ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">

          {/* Panel header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
            {(() => {
              const tab = TABS.find((t) => t.id === activeTab);
              const Icon = tab?.icon || ListOrdered;
              const colorMap = {
                amber:   'bg-amber-100 text-amber-700',
                sky:     'bg-sky-100 text-sky-700',
                emerald: 'bg-emerald-100 text-emerald-700',
                orange:  'bg-orange-100 text-orange-700',
              };
              const currentTabLabel = tab?.id === 'queue'
                ? t('reception.tabs.queue')
                : tab?.id === 'appointments'
                ? t('reception.tabs.appointments')
                : tab?.id === 'inbound'
                ? t('reception.tabs.inbound')
                : tab?.id === 'conflicts'
                ? t('reception.tabs.conflicts')
                : tab?.label;
              return (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[tab?.color || 'amber']}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentTabLabel}</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeTab === 'queue'        && t('reception.panelDesc.queue')}
                      {activeTab === 'appointments' && t('reception.panelDesc.appointments')}
                      {activeTab === 'inbound'      && t('reception.panelDesc.inbound')}
                      {activeTab === 'conflicts'    && t('reception.panelDesc.conflicts')}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Panel body */}
          <div className="p-6">

            {/* Tab 1: Live OPD Queue — two-column layout with DoctorsDutyCard sidebar */}
            {activeTab === 'queue' && (
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Main queue panel */}
                <div className="flex-1 min-w-0">
                  <TodayQueue
                    refreshTrigger={queueRefresh}
                    onCheckInSuccess={handleCheckInSuccess}
                  />
                </div>

                {/* Real-time Doctors on Duty Widget */}
                <div className="xl:w-80 shrink-0">
                  <DoctorsDutyCard className="sticky top-6" />
                </div>
              </div>
            )}

            {/* Tab 2: Appointments & Bookings */}
            {activeTab === 'appointments' && (
              <div>
                {/* Sub-tabs header */}
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                  <button
                    onClick={() => setApptSubTab('upcoming')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      apptSubTab === 'upcoming'
                        ? 'bg-sky-100 text-sky-800 shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {t('reception.upcomingAppointments')}
                  </button>
                  <button
                    onClick={() => setApptSubTab('book')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      apptSubTab === 'book'
                        ? 'bg-sky-100 text-sky-800 shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('reception.scheduleAppointment')}
                  </button>
                </div>

                {apptSubTab === 'book' ? (
                  <AppointmentScheduler onSuccess={handleAppointmentBooked} />
                ) : (
                  <UpcomingAppointments onBookNew={() => setApptSubTab('book')} />
                )}
              </div>
            )}

            {/* Tab 3: Referrals & Inbound */}
            {activeTab === 'inbound' && (
              <div>
                {/* Sub-tabs header */}
                <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                  <button
                    onClick={() => setInboundSubTab('referrals')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      inboundSubTab === 'referrals'
                        ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    {t('reception.inboundReferrals')}
                    {incomingReferrals.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                        {incomingReferrals.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setInboundSubTab('teleconsults')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      inboundSubTab === 'teleconsults'
                        ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {t('reception.teleconsultRequests')}
                    {pendingTeleconsults.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                        {pendingTeleconsults.length}
                      </span>
                    )}
                  </button>
                </div>

                {inboundSubTab === 'referrals' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-medium">
                        {loadingReferrals ? t('common.loading') : `${incomingReferrals.length} pending incoming referral(s)`}
                      </p>
                      <button
                        id="refresh-referrals-btn"
                        onClick={loadIncomingReferrals}
                        disabled={loadingReferrals}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${loadingReferrals ? 'animate-spin' : ''}`} />
                        {t('common.refresh')}
                      </button>
                    </div>

                    {incomingReferrals.length === 0 && !loadingReferrals ? (
                      <div className="text-center py-10">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 mx-auto flex items-center justify-center mb-3">
                          <Inbox className="w-7 h-7 text-emerald-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{t('reception.noPendingReferrals')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t('reception.noPendingReferralsDesc')}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {incomingReferrals.map((ref) => (
                          <div key={ref._id} className="border border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50/30">
                            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                            <div className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                                    {ref.patientId?.firstName?.[0]}{ref.patientId?.lastName?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{ref.patientFullName}</p>
                                    <p className="text-xs text-slate-500">{ref.patientId?.gender} · {ref.patientId?.contactPhone || '—'}</p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  {t('common.pending')}
                                </span>
                              </div>

                              <div className="bg-white rounded-xl px-3 py-2 border border-emerald-100">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{t('reception.reasonForReferral')}</p>
                                <p className="text-sm text-slate-800 font-medium">{ref.reasonForReferral}</p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-white/70 px-3 py-2 rounded-xl border border-emerald-100">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                  Origin: <strong className="text-slate-800">{ref.referredFromFacility?.hospitalName || ref.referredFromFacility?.name || 'Independent Field Worker'}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-slate-500" />
                                  By: <strong className="text-slate-800">{ref.ashaWorkerName}</strong> {ref.referredBy?.role && <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded">({ref.referredBy.role})</span>}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                              </div>

                              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start gap-2.5">
                                <Search className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-sky-800 flex-1">
                                  <span>Search <strong>{ref.patientFullName}</strong> in <strong>Register Walk-in &gt; Search Existing</strong> to confirm arrival and assign to live OPD queue.</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setWalkInMode('search');
                                    setWalkInModalOpen(true);
                                  }}
                                  className="text-xs font-bold text-sky-700 underline hover:text-sky-900 shrink-0"
                                >
                                  {t('reception.openSearch')}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Teleconsult Requests */}
                {inboundSubTab === 'teleconsults' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-medium">
                        {loadingTeleconsults ? t('common.loading') : `${pendingTeleconsults.length} pending request(s)`}
                      </p>
                      <button
                        id="refresh-teleconsults-btn"
                        onClick={loadPendingTeleconsults}
                        disabled={loadingTeleconsults}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${loadingTeleconsults ? 'animate-spin' : ''}`} />
                        {t('common.refresh')}
                      </button>
                    </div>

                    {pendingTeleconsults.length === 0 && !loadingTeleconsults ? (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-3">
                          <Video className="w-7 h-7 text-violet-500" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">{t('reception.noPendingTeleconsults')}</p>
                        <p className="text-xs text-slate-400 mt-1">{t('reception.noPendingTeleconsultsDesc')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingTeleconsults.map((tc) => (
                          <div key={tc._id} className="border border-violet-200 rounded-2xl overflow-hidden bg-violet-50/30">
                            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                            <div className="p-4 space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shrink-0">
                                    {tc.patientId?.firstName?.[0]}{tc.patientId?.lastName?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-sm">{tc.patientFullName}</p>
                                    <p className="text-xs text-slate-500">{tc.patientId?.gender} · {tc.patientId?.contactPhone || '—'}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {t('reception.awaitingReview')}
                                  </span>
                                  <span className="text-[10px] text-violet-700 font-bold bg-violet-100 px-2 py-0.5 rounded-full">
                                    {tc.teleconsultSource || 'External'} Request
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-white rounded-xl px-3 py-2 border border-violet-100">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{t('reception.requestedDate')}</p>
                                  <p className="font-bold text-slate-800">
                                    {tc.scheduledDate ? new Date(tc.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                  </p>
                                </div>
                                <div className="bg-white rounded-xl px-3 py-2 border border-violet-100">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{t('reception.timePreference')}</p>
                                  <p className="font-bold text-slate-800">{tc.timeSlot || '—'}</p>
                                </div>
                              </div>

                              {tc.chiefComplaint && (
                                <div className="bg-white rounded-xl px-3 py-2 border border-violet-100">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{t('reception.chiefComplaint')}</p>
                                  <p className="text-sm text-slate-800 font-medium">{tc.chiefComplaint}</p>
                                </div>
                              )}

                              {/* Captured Vitals if provided by ASHA / Field Worker */}
                              {tc.vitals && Object.values(tc.vitals).some((v) => v !== null && v !== undefined && String(v).trim().length > 0) && (
                                <div className="bg-white rounded-xl p-3 border border-violet-100 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
                                      <Activity className="w-3 h-3 text-violet-500" />
                                      Patient Vitals (Captured by {tc.teleconsultSource || 'Worker'})
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 text-xs">
                                    {tc.vitals.bloodPressure && (
                                      <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg border border-rose-100 font-medium">
                                        BP: {tc.vitals.bloodPressure}
                                      </span>
                                    )}
                                    {tc.vitals.pulse && (
                                      <span className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded-lg border border-sky-100 font-medium">
                                        Pulse: {tc.vitals.pulse} bpm
                                      </span>
                                    )}
                                    {tc.vitals.spO2 && (
                                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100 font-medium">
                                        SpO2: {tc.vitals.spO2}%
                                      </span>
                                    )}
                                    {tc.vitals.temperature && (
                                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100 font-medium">
                                        Temp: {tc.vitals.temperature}°F
                                      </span>
                                    )}
                                    {tc.vitals.bloodSugar && (
                                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-100 font-medium">
                                        Sugar: {tc.vitals.bloodSugar} mg/dL
                                      </span>
                                    )}
                                    {tc.vitals.weight && (
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100 font-medium">
                                        Wt: {tc.vitals.weight} kg
                                      </span>
                                    )}
                                    {tc.vitals.height && (
                                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 font-medium">
                                        Ht: {tc.vitals.height} cm
                                      </span>
                                    )}
                                  </div>
                                  {tc.vitals.notes && (
                                    <p className="text-[11px] text-slate-600 italic bg-violet-50/50 p-1.5 rounded-lg border border-violet-100/60">
                                      <span className="font-semibold not-italic text-violet-700">Notes:</span> {tc.vitals.notes}
                                    </p>
                                  )}
                                </div>
                              )}

                              <p className="text-xs text-slate-600 bg-white/70 px-3 py-2 rounded-xl border border-violet-100 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                Booked by: <strong className="text-slate-800">{tc.bookedByName}</strong>
                              </p>

                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-700">
                                  {t('reception.assignDoctor')} <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={confirmDoctorId[tc._id] || ''}
                                  onChange={(e) => setConfirmDoctorId((prev) => ({ ...prev, [tc._id]: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                >
                                  <option value="">{t('reception.selectDoctor')}</option>
                                  {facilityDoctors.map((doc) => (
                                    <option key={doc._id} value={doc._id}>
                                      Dr. {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder={t('reception.confirmTimeSlotPlaceholder')}
                                  value={confirmTimeSlot[tc._id] || ''}
                                  onChange={(e) => setConfirmTimeSlot((prev) => ({ ...prev, [tc._id]: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                              </div>

                              <button
                                id={`confirm-teleconsult-${tc._id}`}
                                onClick={() => handleConfirmTeleconsult(tc._id)}
                                disabled={!confirmDoctorId[tc._id] || confirming === tc._id}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm
                                  hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200/50"
                              >
                                {confirming === tc._id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {t('common.confirming')}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    {t('reception.confirmAndGenerateRoom')}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Data Sync Conflicts */}
            {activeTab === 'conflicts' && (
              <MergeResolution />
            )}

          </div>
        </div>

        {/* ── Footer info strip ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Calendar className="w-4 h-4 text-sky-600" />,
              bg: 'bg-sky-100',
              label: 'Today',
              value: currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            },
            {
              icon: <Clock className="w-4 h-4 text-emerald-600" />,
              bg: 'bg-emerald-100',
              label: 'OPD Hours',
              value: '8:00 AM – 6:00 PM',
              sub: '● Open',
              subColor: 'text-emerald-600',
            },
            {
              icon: <ShieldCheck className="w-4 h-4 text-slate-500" />,
              bg: 'bg-slate-100',
              label: 'Security',
              value: 'JWT Protected',
              sub: 'Role: Receptionist',
              subColor: 'text-slate-400',
            },
          ].map(({ icon, bg, label, value, sub, subColor }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-semibold text-slate-700">{value}</p>
                {sub && <p className={`text-[10px] font-semibold ${subColor}`}>{sub}</p>}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Unified Walk-in Registration Modal / Drawer ───────────────────── */}
      {walkInModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden transition-all my-8">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Register Walk-in Patient</h3>
                  <p className="text-xs text-slate-500">Add a new patient or check in an existing record to today's queue</p>
                </div>
              </div>
              <button
                onClick={() => setWalkInModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setWalkInMode('new')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    walkInMode === 'new'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New Patient Registration
                </button>
                <button
                  type="button"
                  onClick={() => setWalkInMode('search')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    walkInMode === 'search'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Search Existing Patient
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              {walkInMode === 'new' ? (
                <PatientRegistrationForm onSuccess={handlePatientRegistered} />
              ) : (
                <PatientSearch onQueueSuccess={handleQueueSuccess} />
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Physical Printed SAHAY Health Card Modal ──────────────────────── */}
      {printedCardPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Physical SAHAY Health Card</h3>
                  <p className="text-xs text-slate-500">Provide this physical credential card to the citizen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintedCardPatient(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Card Design */}
            <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-sky-500/20 space-y-4 print:shadow-none print:border-slate-800">
              <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-sky-300">National Health Network</p>
                  <p className="text-sm font-extrabold text-white">SAHAY Citizen Health Card</p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono font-bold text-sky-200 border border-white/15">
                  ABDM Verified
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">Patient Name</p>
                <p className="text-lg font-black tracking-tight text-white">
                  {printedCardPatient.fullName || `${printedCardPatient.firstName || ''} ${printedCardPatient.lastName || ''}`.trim()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Unique Health ID (UHID)</p>
                  <p className="font-mono text-sm font-black text-violet-300 tracking-wider mt-0.5">
                    {printedCardPatient.uhid || '—'}
                  </p>
                </div>
                <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-400/30">
                  <p className="text-[9px] uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-300" />
                    Recovery Code (Card Key)
                  </p>
                  <p className="font-mono text-sm font-black text-amber-200 tracking-widest mt-0.5">
                    {printedCardPatient.recoveryCode || '—'}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-white/10 pt-2">
                Notice: Keep this card safe. The 6-character Recovery Code is required to reset forgotten PINs at any SAHAY clinic reception.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Physical Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintedCardPatient(null)}
                className="py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
