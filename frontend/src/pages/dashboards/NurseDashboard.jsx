import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import TriageQueue from '../../features/nurse/components/TriageQueue';
import VitalsForm from '../../features/nurse/components/VitalsForm';
import LabCoordination from '../../features/nurse/components/LabCoordination';
import CreateReferralForm from '../../components/common/CreateReferralForm';
import VideoRoom from '../../components/common/VideoRoom';
import BookTeleconsultModal from '../../components/common/BookTeleconsultModal';
import nurseApi from '../../features/nurse/services/nurseApi';
import { Video, Siren, Ambulance, Stethoscope, X, CreditCard, Tag, AlertTriangle } from 'lucide-react';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${color.border} dark:border-slate-700 p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow`}>
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
  const { t } = useTranslation();
  const [user, setUser]                               = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab]                     = useState('triage'); // 'triage' | 'labCoordination' | 'referrals'
  const [refreshTrigger, setRefreshTrigger]           = useState(0);
  const [vitalsCapturedCount, setVitalsCapturedCount] = useState(0);
  const [skippedQueue, setSkippedQueue]               = useState([]);
  const [queueStats, setQueueStats]                   = useState({
    total: 0,
    urgent: 0,
    routine: 0,
  });
  const [toast, setToast]                             = useState(null);
  const [currentTime, setCurrentTime]                 = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // ── Prompt 4.2 & 5.2: Forward to Doctor Confirmation Modal State ────────────
  const [forwardModalAppt, setForwardModalAppt]         = useState(null);
  const [forwardUrgency, setForwardUrgency]             = useState('Routine');
  const [forwardNotes, setForwardNotes]                 = useState('');
  const [forwardSubmitting, setForwardSubmitting]       = useState(false);
  const [forwardAllergies, setForwardAllergies]         = useState([]);
  const [forwardNewAllergy, setForwardNewAllergy]       = useState('');

  // ── Teleconsultation state (Prompt 16.3) ───────────────────────────────────
  const [teleconsultAppt, setTeleconsultAppt]         = useState(null);
  const [teleconsultDoctors, setTeleconsultDoctors]   = useState([]);
  const [loadingDoctors, setLoadingDoctors]           = useState(false);
  const [selectedDoctorId, setSelectedDoctorId]       = useState('');
  const [requestingTeleconsult, setRequestingTeleconsult] = useState(false);
  const [activeVideoRoom, setActiveVideoRoom]         = useState(null);

  // ── Scheduled Teleconsult Booking modal (Prompt 17.2) ────────────────────────
  const [showBookTeleconsultModal, setShowBookTeleconsultModal] = useState(false);

  // ── My Teleconsults State & Fetcher (Prompt 17.4) ─────────────────────────────
  const [myTeleconsults, setMyTeleconsults]             = useState([]);
  const [loadingTeleconsults, setLoadingTeleconsults]   = useState(false);

  // ── Prompt 6.2: Critical Lab Alerts State ─────────────────────────────────
  const [criticalLabCount, setCriticalLabCount]         = useState(0);
  const [criticalLabPatients, setCriticalLabPatients]   = useState([]);

  const fetchLabQueueStats = useCallback(async () => {
    try {
      const res = await nurseApi.getLabQueue();
      const reportsReady = res.data?.reportsReady || [];
      const critical = reportsReady.filter(
        (a) => a.isCriticalLab || a.labOrders?.some((o) => o.isCritical) || a.latestLabOrder?.isCritical
      );
      setCriticalLabPatients(critical);
      const count = res.data?.counts?.criticalLabs ?? critical.length;
      setCriticalLabCount(count);
    } catch {
      // non-blocking
    }
  }, []);

  const loadMyTeleconsults = useCallback(async () => {
    setLoadingTeleconsults(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
      const res = await axios.get('/api/teleconsult/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTeleconsults(res.data.teleconsults || []);
    } catch {
      // non-blocking
    } finally {
      setLoadingTeleconsults(false);
    }
  }, []);

  // ── Enter Waiting Room / Start Call (Prompt 18.2) ──────────────────────────
  const handleStartCall = async (tc) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
      await axios.post(`/api/teleconsult/${tc._id}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to notify waiting room:', err);
    }
    setActiveVideoRoom({
      roomName: tc.teleconsultRoomId || `sahay-room-${tc._id}`,
      patientName: tc.patientFullName,
      doctorName: tc.doctorName || 'Doctor',
      appointmentId: tc._id,
    });
    loadMyTeleconsults();
  };

  // Live time ticker & critical lab alert interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      fetchLabQueueStats();
      const interval = setInterval(fetchLabQueueStats, 20000);
      return () => clearInterval(interval);
    }
  }, [user, fetchLabQueueStats, refreshTrigger]);

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

  const handleQueueLoaded = useCallback(({ summary, skippedQueue: sq }) => {
    if (summary) {
      setQueueStats(summary);
    }
    if (Array.isArray(sq)) {
      setSkippedQueue(sq);
    }
  }, []);

  // ── Skip & Recall Handlers ─────────────────────────────────────────────────
  const handleSkipPatient = useCallback(async (appt) => {
    try {
      await nurseApi.skipPatient(appt._id);
      const pName = appt.patientFullName || 'Patient';
      showToast('success', 'Patient On Hold', `${pName} moved to Absent / On-Hold section.`);
      setRefreshTrigger((r) => r + 1);
    } catch (err) {
      showToast('error', 'Skip Failed', err.response?.data?.message || 'Could not skip patient.');
    }
  }, [showToast]);

  const handleRecallPatient = useCallback(async (appt) => {
    try {
      await nurseApi.recallPatient(appt._id);
      const pName = appt.patientFullName || 'Patient';
      showToast('success', 'Patient Recalled', `${pName} recalled — placed next in queue.`);
      setRefreshTrigger((r) => r + 1);
    } catch (err) {
      showToast('error', 'Recall Failed', err.response?.data?.message || 'Could not recall patient.');
    }
  }, [showToast]);

  const handleMarkNoShow = useCallback(async (appt) => {
    try {
      await nurseApi.markNoShow(appt._id);
      const pName = appt.patientFullName || 'Patient';
      showToast('success', 'Marked No-Show', `${pName} marked as No-Show and removed from queue.`);
      setRefreshTrigger((r) => r + 1);
    } catch (err) {
      showToast('error', 'No-Show Failed', err.response?.data?.message || 'Could not mark patient as No-Show.');
    }
  }, [showToast]);

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

  // ── Prompt 4.2 & 5.2: Forward to Doctor Handlers ───────────────────────────
  const handleOpenForwardModal = useCallback((appt) => {
    setForwardModalAppt(appt);
    setForwardUrgency(appt.urgency || (appt.priority === 'Urgent' ? 'Urgent' : 'Routine'));
    setForwardNotes(appt.chiefComplaint || '');
    const existing = appt.patientId?.allergies || [];
    setForwardAllergies(Array.isArray(existing) ? [...existing] : []);
    setForwardNewAllergy('');
  }, []);

  const handleAddForwardAllergy = (e) => {
    if (e) e.preventDefault();
    const trimmed = forwardNewAllergy.trim();
    if (!trimmed) return;
    if (!forwardAllergies.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setForwardAllergies((prev) => [...prev, trimmed]);
    }
    setForwardNewAllergy('');
  };

  const handleRemoveForwardAllergy = (idxToRemove) => {
    setForwardAllergies((prev) => prev.filter((_, i) => i !== idxToRemove));
  };

  const handleConfirmForwardToDoctor = async () => {
    if (!forwardModalAppt) return;
    setForwardSubmitting(true);
    try {
      const patientId = forwardModalAppt.patientId?._id || forwardModalAppt.patientId;
      if (patientId) {
        try {
          await nurseApi.updatePatientAllergies(patientId, forwardAllergies);
        } catch (alErr) {
          console.warn('Could not update patient allergies via PATCH endpoint:', alErr);
        }
      }

      const res = await nurseApi.forwardToDoctor({
        appointmentId: forwardModalAppt._id,
        urgency: forwardUrgency,
        triageNotes: forwardNotes,
        allergies: forwardAllergies,
      });
      showToast(
        'success',
        'Forwarded to Doctor',
        res.data?.message || `${forwardModalAppt.patientFullName || 'Patient'} forwarded to doctor queue with "${forwardUrgency}" priority.`
      );
      setForwardModalAppt(null);
      setRefreshTrigger((r) => r + 1);
    } catch (err) {
      showToast('error', 'Forward Failed', err.response?.data?.message || 'Failed to forward patient to doctor.');
    } finally {
      setForwardSubmitting(false);
    }
  };

  // ── Teleconsultation Handlers (Prompt 16.3) ─────────────────────────────────
  const handleOpenTeleconsultModal = useCallback(async (appt) => {
    if (appt.teleconsultRoomId && (appt.status === 'Teleconsult Requested' || appt.status === 'In Teleconsult')) {
      setActiveVideoRoom({
        roomName: appt.teleconsultRoomId,
        patientName: appt.patientFullName || 'Patient',
        appointmentId: appt._id,
      });
      return;
    }

    setTeleconsultAppt(appt);
    setSelectedDoctorId(appt.assignedDoctorId?._id || appt.assignedDoctorId || '');
    setLoadingDoctors(true);
    try {
      const res = await nurseApi.getDoctors();
      setTeleconsultDoctors(res.data?.doctors || []);
    } catch {
      showToast('error', 'Doctors Unavailable', 'Could not load doctors list.');
    } finally {
      setLoadingDoctors(false);
    }
  }, [showToast]);

  const handleStartTeleconsult = async () => {
    if (!teleconsultAppt || !selectedDoctorId) {
      showToast('error', 'Specialist Required', 'Please select a doctor for teleconsultation.');
      return;
    }

    setRequestingTeleconsult(true);
    try {
      const res = await nurseApi.requestTeleconsult({
        appointmentId: teleconsultAppt._id,
        doctorId: selectedDoctorId,
      });

      const roomName = res.data?.teleconsultRoomId;
      showToast('success', 'Teleconsultation Initialized', 'Connecting video room with specialist…');

      setTeleconsultAppt(null);
      setActiveVideoRoom({
        roomName,
        patientName: teleconsultAppt.patientFullName || 'Patient',
        appointmentId: teleconsultAppt._id,
      });
      setRefreshTrigger((r) => r + 1);
    } catch (err) {
      showToast('error', 'Teleconsult Failed', err.response?.data?.message || 'Could not start teleconsultation.');
    } finally {
      setRequestingTeleconsult(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'teleconsults') {
      loadMyTeleconsults();
    }
  }, [user, activeTab, loadMyTeleconsults]);

  // Prompt 6.2: Periodically poll and refresh critical lab stats for high-priority alerts
  useEffect(() => {
    if (user) {
      fetchLabQueueStats();
      const interval = setInterval(fetchLabQueueStats, 15000);
      return () => clearInterval(interval);
    }
  }, [user, refreshTrigger, fetchLabQueueStats]);

  if (!user) return null;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 px-4 sm:px-8 py-8">
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


      {/* ── Book Scheduled Teleconsult Modal (Prompt 17.2) ── */}
      <BookTeleconsultModal
        isOpen={showBookTeleconsultModal}
        onClose={() => setShowBookTeleconsultModal(false)}
        callerRole={user?.role}
        onSuccess={(appt) => {
          showToast('success', 'Teleconsult Scheduled!', 'Request submitted for hospital review. The patient will be notified once confirmed.');
          setShowBookTeleconsultModal(false);
        }}
      />

      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
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
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t('nurse.title')}</h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('nurse.onDuty')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Staff: <span className="font-semibold text-teal-800 dark:text-teal-400">{user.name}</span>
                {user.hospitalName && <span className="text-slate-400"> · {user.hospitalName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {/* Live Time indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300">
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
              <span className="hidden sm:inline">{t('nurse.refresh')}</span>
            </button>

            {/* Schedule Teleconsult (Prompt 17.2) */}
            <button
              id="schedule-teleconsult-btn"
              onClick={() => setShowBookTeleconsultModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold shadow-sm shadow-violet-200 hover:opacity-90 transition-all"
            >
              <Video className="w-4 h-4" /><span className="hidden sm:inline">{t('nurse.scheduleTeleconsult')}</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700 hover:text-rose-700 dark:hover:text-rose-400 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{t('nurse.logout')}</span>
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
            label={t('nurse.metrics.waitingAtTriage')}
            value={queueStats.total}
            sub={t('nurse.metrics.waitingAtTriageSub', { count: queueStats.urgent })}
            color={{ border: 'border-teal-100', icon: 'bg-teal-100 text-teal-700', text: 'text-teal-800' }}
          />

          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label={t('nurse.metrics.urgentPriority')}
            value={queueStats.urgent}
            sub={t('nurse.metrics.urgentPrioritySub')}
            color={{ border: 'border-rose-100', icon: 'bg-rose-100 text-rose-600', text: 'text-rose-700' }}
          />

          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label={t('nurse.metrics.vitalsRecorded')}
            value={vitalsCapturedCount}
            sub={t('nurse.metrics.vitalsRecordedSub')}
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' }}
          />

          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            label={t('nurse.metrics.routinePatients')}
            value={queueStats.routine ?? (queueStats.total - queueStats.urgent)}
            sub={t('nurse.metrics.routinePatientsSub')}
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-700', text: 'text-sky-800' }}
          />
        </div>

        {/* ── Prompt 6.2: High-Priority Critical Lab Banner ─────────────── */}
        {criticalLabCount > 0 && (
          <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-rose-900 tracking-wide uppercase">
                    {criticalLabCount > 1 ? t('nurse.criticalLab.banner_other', { count: criticalLabCount }) : t('nurse.criticalLab.banner_one', { count: criticalLabCount })}
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase">
                    {t('nurse.criticalLab.action')}
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-0.5">
                  {t('nurse.criticalLab.desc')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('labCoordination')}
              className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all text-center"
            >
              {t('nurse.criticalLab.reviewBtn', { count: criticalLabCount })}
            </button>
          </div>
        )}

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
              <span>{t('nurse.tabs.triageVitals')}</span>
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
              <span>{t('nurse.tabs.labCoordination')}</span>
              {criticalLabCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-sm">
                  <Siren className="w-4 h-4 text-rose-600" />
                  <span>{criticalLabCount} Critical</span>
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'labCoordination' ? 'bg-teal-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  Step 4.2 / 4.4
                </span>
              )}
            </button>

            {/* Prompt 15.2: Outbound Referrals Tab */}
            <button
              type="button"
              id="tab-outbound-referrals"
              onClick={() => setActiveTab('referrals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'referrals'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span>{t('nurse.tabs.outboundReferrals')}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'referrals' ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
              }`}>
                {t('nurse.tabs.transfer')}
              </span>
            </button>

            {/* Prompt 17.4: My Teleconsults Tab */}
            <button
              type="button"
              id="tab-nurse-teleconsults"
              onClick={() => setActiveTab('teleconsults')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'teleconsults'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Video className="w-4 h-4 text-violet-600" />
              <span>{t('nurse.tabs.teleconsults')}</span>
              {myTeleconsults.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'teleconsults' ? 'bg-teal-700 text-white' : 'bg-violet-100 text-violet-800'
                }`}>
                  {myTeleconsults.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-semibold pr-3 hidden sm:inline">
            {t('nurse.workflowCoordination')}
          </span>
        </div>

        {/* ── Active Live Teleconsultation Room (Prompt 16.3) ─────────────── */}
        {activeVideoRoom && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-purple-200 shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Live Specialist Teleconsultation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <strong className="text-purple-900">{activeVideoRoom.patientName}</strong> · Room: <span className="font-mono text-slate-600">{activeVideoRoom.roomName}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveVideoRoom(null);
                  setRefreshTrigger((r) => r + 1);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Hide / Minimize Video
              </button>
            </div>

            <VideoRoom
              roomName={activeVideoRoom.roomName || activeVideoRoom.roomId}
              displayName={activeVideoRoom.displayName || `${user?.name || 'Nurse'} (Nurse / Triage)`}
              waitingBanner={activeVideoRoom.doctorName ? `Waiting for ${activeVideoRoom.doctorName} to connect... Your connection is live.` : undefined}
              onClose={() => {
                setActiveVideoRoom(null);
                setRefreshTrigger((r) => r + 1);
                loadMyTeleconsults();
              }}
            />
          </div>
        )}

        {/* ── Active Tab View ─────────────────────────────────────────────── */}
        {activeTab === 'triage' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Critical Lab Alerts & Triage Queue Table */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-4">
              {/* Prompt 6.2: Critical Lab Results Sorted to Very Top of Nurse's Queue */}
              {criticalLabPatients.length > 0 && (
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-4 sm:p-5 shadow-xl border-2 border-red-500 animate-pulse space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-white text-red-700 font-black text-sm flex items-center justify-center shadow-xs">
                      </span>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                          CRITICAL LAB RESULTS AWAITING REVIEW ({criticalLabPatients.length})
                        </h3>
                        <p className="text-[11px] text-red-100">
                          Out-of-bounds findings detected. Immediate escalation to doctor required.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('labCoordination')}
                      className="text-[11px] font-bold bg-white text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      Open Lab Desk →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {criticalLabPatients.map((appt) => {
                      const pName = appt.patientFullName || `${appt.patientId?.firstName || 'Patient'} ${appt.patientId?.lastName || ''}`;
                      const testName = appt.latestLabOrder?.testName || appt.labOrders?.find((o) => o.isCritical)?.testName || 'Diagnostic Test';
                      const reason = appt.latestLabOrder?.criticalReason || appt.labOrders?.find((o) => o.isCritical)?.criticalReason || 'Out of physiological normal range';
                      const docName = appt.assignedDoctorId?.name || 'Assigned Doctor';

                      return (
                        <div
                          key={appt._id}
                          className="bg-white text-slate-900 rounded-2xl p-3.5 border border-red-200 shadow-sm flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900">{pName}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">
                                <Siren className="w-4 h-4 inline mr-1.5 text-rose-600" />CRITICAL LAB RESULT
                              </span>
                              {appt.queueNumber && (
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  #{appt.queueNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-red-700 mt-0.5">
                              {testName}: <span className="font-medium text-slate-700">{reason}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Assigned: Dr. {docName} · Phone: {appt.patientId?.contactPhone || '—'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await nurseApi.notifyDoctor(appt._id);
                                showToast('success', 'Doctor Notified', `${pName}'s critical lab forwarded to Doctor's Review Queue.`);
                                fetchLabQueueStats();
                                setRefreshTrigger((r) => r + 1);
                              } catch (err) {
                                showToast('error', 'Notification Failed', err.response?.data?.message || 'Could not notify doctor.');
                              }
                            }}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <span className="flex items-center gap-1"><Siren className="w-3.5 h-3.5 text-rose-600" />Escalate to Dr. {docName}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <TriageQueue
                selectedAppointmentId={selectedAppointment?._id}
                onEnterVitals={setSelectedAppointment}
                onForwardToDoctor={handleOpenForwardModal}
                onRequestTeleconsult={handleOpenTeleconsultModal}
                onSkip={handleSkipPatient}
                onRecall={handleRecallPatient}
                onMarkNoShow={handleMarkNoShow}
                refreshTrigger={refreshTrigger}
                onQueueLoaded={handleQueueLoaded}
                skippedQueue={skippedQueue}
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
        )}

        {activeTab === 'labCoordination' && (
          <LabCoordination
            onActionSuccess={(msg) => {
              showToast('success', 'Lab Coordination', msg);
              fetchLabQueueStats();
            }}
          />
        )}

        {/* Tab 3: Outbound Referrals (Prompt 15.2) */}
        {activeTab === 'referrals' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-teal-200 shrink-0">
                  <Ambulance className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Initiate Outbound Clinical Referral</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escalate patient care to a higher-level facility or specialty hospital with automatic origin tracking.
                  </p>
                </div>
              </div>
            </div>

            <CreateReferralForm
              role="Nurse"
              onSuccess={(data) => {
                showToast(
                  'success',
                  'Outbound Referral Created',
                  data.message || 'Patient referral has been created and transmitted to the destination hospital.'
                );
              }}
            />
          </div>
        )}

        {/* Tab 4: My Teleconsults (Prompt 17.4) */}
        {activeTab === 'teleconsults' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center text-xl shadow-md shadow-violet-200 shrink-0">
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Virtual OPD Teleconsultations</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track and join scheduled specialist video consultations booked from this triage station.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="nurse-refresh-teleconsults-btn"
                  onClick={loadMyTeleconsults}
                  disabled={loadingTeleconsults}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  <svg className={`w-3.5 h-3.5 ${loadingTeleconsults ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  <span>Refresh</span>
                </button>
                <button
                  id="nurse-book-teleconsult-action-btn"
                  onClick={() => setShowBookTeleconsultModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-extrabold shadow-sm shadow-violet-200 hover:opacity-90 transition-all flex items-center gap-1.5"
                >
                  <span>+</span>
                  <span>Schedule Teleconsult</span>
                </button>
              </div>
            </div>

            {loadingTeleconsults && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">Loading teleconsultations…</p>
              </div>
            )}

            {!loadingTeleconsults && myTeleconsults.length === 0 && (
              <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-3"><Video className="w-7 h-7 text-violet-500" /></div>
                <p className="text-sm font-bold text-slate-700">No teleconsultations scheduled yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Use "Schedule Teleconsult" to book a specialist video consult for patients needing secondary review.
                </p>
                <button
                  onClick={() => setShowBookTeleconsultModal(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition-colors shadow-md shadow-violet-200"
                >
                  Schedule Teleconsult Now
                </button>
              </div>
            )}

            {!loadingTeleconsults && myTeleconsults.length > 0 && (
              <div className="space-y-3">
                {myTeleconsults.map((tc) => {
                  const isScheduled = tc.status === 'Teleconsult Scheduled';
                  const isRequested = tc.status === 'Teleconsult Requested';
                  return (
                    <div
                      key={tc._id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
                        ${isScheduled ? 'border-violet-300 ring-1 ring-violet-200' : 'border-slate-200'}`}
                    >
                      <div className={`h-1.5 w-full ${isScheduled ? 'bg-gradient-to-r from-violet-500 to-purple-600' : isRequested ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                      <div className="p-5 space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {tc.patientId?.firstName?.[0] || 'P'}{tc.patientId?.lastName?.[0] || ''}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{tc.patientFullName}</p>
                              <p className="text-xs text-slate-500">
                                {tc.patientId?.gender || '—'} · {tc.patientId?.contactPhone || 'No phone'}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                            ${isScheduled ? 'bg-violet-100 text-violet-800 border-violet-200' :
                              isRequested ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              'bg-emerald-100 text-emerald-800 border-emerald-200'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isScheduled ? 'bg-violet-600' : isRequested ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {tc.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Facility</p>
                            <p className="font-bold text-slate-800 truncate">{tc.facilityName}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Doctor</p>
                            <p className="font-bold text-slate-800 truncate">{tc.doctorName}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Date</p>
                            <p className="font-bold text-slate-800">
                              {tc.scheduledDate ? new Date(tc.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Time Slot</p>
                            <p className="font-bold text-slate-800 truncate">{tc.timeSlot || '—'}</p>
                          </div>
                        </div>

                        {tc.chiefComplaint && (
                          <div className="bg-violet-50/50 rounded-xl px-3.5 py-2 border border-violet-100 text-xs">
                            <span className="font-bold text-violet-900 uppercase text-[10px] mr-1">Chief Complaint:</span>
                            <span className="text-slate-700">{tc.chiefComplaint}</span>
                          </div>
                        )}

                        {['Teleconsult Confirmed', 'Patient Waiting in Room', 'Teleconsult Scheduled', 'In Teleconsult'].includes(tc.status) && (
                          <button
                            id={`nurse-join-teleconsult-${tc._id}`}
                            onClick={() => handleStartCall(tc)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-xs
                              hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
                          >
                            <Video className="w-4 h-4 text-violet-600" />
                            <span>Enter Waiting Room / Start Call</span>
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
          </div>
        )}

        {/* ── Teleconsultation Doctor Selection Modal (Prompt 16.3) ──────── */}
        {teleconsultAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Request Teleconsultation</h3>
                    <p className="text-xs text-slate-400">Escalate patient to live specialist video</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTeleconsultAppt(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
                ><X className="w-4 h-4" /></button>
              </div>

              {/* Patient Banner */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {teleconsultAppt.patientId?.firstName?.[0] || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-purple-950 truncate">
                    {teleconsultAppt.patientFullName}
                  </p>
                  <p className="text-[11px] text-purple-700 truncate">
                    {teleconsultAppt.chiefComplaint || 'Vitals checkup / Teleconsult evaluation'}
                  </p>
                </div>
              </div>

              {/* Doctor Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Specialist Doctor <span className="text-rose-500">*</span>
                </label>
                {loadingDoctors ? (
                  <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 text-slate-700"
                  >
                    <option value="">— Choose a specialist doctor —</option>
                    {teleconsultDoctors.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''} {doc.hospitalId?.hospitalName ? `· ${doc.hospitalId.hospitalName}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {teleconsultDoctors.length === 0 && !loadingDoctors && (
                  <p className="text-xs text-slate-400">No doctors currently registered in system.</p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTeleconsultAppt(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartTeleconsult}
                  disabled={requestingTeleconsult || !selectedDoctorId}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold shadow-md shadow-purple-200 hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {requestingTeleconsult ? (
                    <span>Connecting…</span>
                  ) : (
                    <>
                      <Video className="w-4 h-4 text-violet-600" />
                      <span>Start Video Room</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Prompt 4.2: Forward to Doctor Confirmation Modal ──────── */}
        {forwardModalAppt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg shrink-0">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Forward to Doctor OPD</h3>
                    <p className="text-xs text-slate-400">Confirm transition & triage urgency</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForwardModalAppt(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
                ><X className="w-4 h-4" /></button>
              </div>

              {/* Patient Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {forwardModalAppt.patientId?.firstName?.[0] || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {forwardModalAppt.patientFullName}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    {forwardModalAppt.patientId?.uhid && (
                      <span className="font-mono text-teal-800 font-semibold"><CreditCard className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{forwardModalAppt.patientId.uhid}</span>
                    )}
                    {forwardModalAppt.queueNumber && (
                      <span>Token: #{forwardModalAppt.queueNumber}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Set Urgency Dropdown (Prompt 4.2) */}
              <div className="space-y-1.5">
                <label htmlFor="forward-urgency-select" className="block text-xs font-bold text-slate-700">
                  Set Urgency Level <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="forward-urgency-select"
                    value={forwardUrgency}
                    onChange={(e) => setForwardUrgency(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 transition-all ${
                      forwardUrgency === 'Emergency'
                        ? 'bg-red-50 border-red-300 text-red-700 focus:ring-red-400'
                        : forwardUrgency === 'Urgent'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-400'
                        : 'bg-white border-slate-200 text-slate-700 focus:ring-teal-400'
                    }`}
                  >
                    <option value="Routine">Routine — Standard priority</option>
                    <option value="Urgent">Urgent — Expedited doctor review</option>
                    <option value="Emergency">Emergency — Immediate doctor attention (Top of queue)</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-400">
                  Emergency patients will be sorted to the very top of the doctor's queue.
                </p>
              </div>

              {/* Triage / Handover Notes */}
              <div className="space-y-1.5">
                <label htmlFor="forward-triage-notes" className="block text-xs font-bold text-slate-700">
                  Triage Handover Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  id="forward-triage-notes"
                  rows={2}
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                  placeholder="e.g. Severe chest pain, vitals unstable, rapid escalation required..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-700"
                />
              </div>

              {/* Prompt 5.2: Known Allergies Tag-Input Section in Forward Modal */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Known Allergies</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {forwardAllergies.length}
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">Press Enter to add</span>
                </div>

                {/* Existing Allergies Pills */}
                {forwardAllergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-rose-50/50 border border-rose-100">
                    {forwardAllergies.map((allergy, idx) => (
                      <span
                        key={`${allergy}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold shadow-xs"
                      >
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3 text-slate-400" />{allergy}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveForwardAllergy(idx)}
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-rose-600 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer text-[10px]"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No allergies recorded yet.</p>
                )}

                {/* Allergy Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={forwardNewAllergy}
                    onChange={(e) => setForwardNewAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddForwardAllergy(e);
                      }
                    }}
                    placeholder="Type allergy (e.g. Penicillin) & hit Enter..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddForwardAllergy}
                    disabled={!forwardNewAllergy.trim()}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setForwardModalAppt(null)}
                  disabled={forwardSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="confirm-forward-to-doctor-btn"
                  type="button"
                  onClick={handleConfirmForwardToDoctor}
                  disabled={forwardSubmitting}
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                    forwardUrgency === 'Emergency'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {forwardSubmitting ? (
                    <span>Forwarding…</span>
                  ) : (
                    <>
                      <span>Confirm & Forward</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
