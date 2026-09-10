import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TriageQueue from '../../features/nurse/components/TriageQueue';
import VitalsForm from '../../features/nurse/components/VitalsForm';
import LabCoordination from '../../features/nurse/components/LabCoordination';
import CreateReferralForm from '../../components/common/CreateReferralForm';
import VideoRoom from '../../components/common/VideoRoom';
import BookTeleconsultModal from '../../components/common/BookTeleconsultModal';
import nurseApi from '../../features/nurse/services/nurseApi';

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
  const [activeTab, setActiveTab]                     = useState('triage'); // 'triage' | 'labCoordination' | 'referrals'
  const [refreshTrigger, setRefreshTrigger]           = useState(0);
  const [vitalsCapturedCount, setVitalsCapturedCount] = useState(0);
  const [queueStats, setQueueStats]                   = useState({
    total: 0,
    urgent: 0,
    routine: 0,
  });
  const [toast, setToast]                             = useState(null);
  const [currentTime, setCurrentTime]                 = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

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


      {/* ── Book Scheduled Teleconsult Modal (Prompt 17.2) ── */}
      <BookTeleconsultModal
        isOpen={showBookTeleconsultModal}
        onClose={() => setShowBookTeleconsultModal(false)}
        callerRole={user?.role}
        onSuccess={(appt) => {
          showToast('success', '📹 Teleconsult Scheduled!', 'Request submitted for hospital review. The patient will be notified once confirmed.');
          setShowBookTeleconsultModal(false);
        }}
      />

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

            {/* Schedule Teleconsult (Prompt 17.2) */}
            <button
              id="schedule-teleconsult-btn"
              onClick={() => setShowBookTeleconsultModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold shadow-sm shadow-violet-200 hover:opacity-90 transition-all"
            >
              📹 <span className="hidden sm:inline">Schedule Teleconsult</span>
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
              <span>Outbound Referrals</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'referrals' ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
              }`}>
                Transfer
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
              <span className="text-sm">📹</span>
              <span>My Teleconsults</span>
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
            Clinical Workflow Coordination
          </span>
        </div>

        {/* ── Active Live Teleconsultation Room (Prompt 16.3) ─────────────── */}
        {activeVideoRoom && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-purple-200 shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
                  📹
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
            {/* Left Column: Triage Queue Table */}
            <div className="lg:col-span-7 xl:col-span-7">
              <TriageQueue
                selectedAppointmentId={selectedAppointment?._id}
                onEnterVitals={setSelectedAppointment}
                onRequestTeleconsult={handleOpenTeleconsultModal}
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
        )}

        {activeTab === 'labCoordination' && (
          <LabCoordination
            onActionSuccess={(msg) => showToast('success', 'Lab Coordination', msg)}
          />
        )}

        {/* Tab 3: Outbound Referrals (Prompt 15.2) */}
        {activeTab === 'referrals' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-teal-200 shrink-0">
                  🚑
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
                  📹
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
                <div className="w-14 h-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-3 text-3xl">📹</div>
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

                        {['Teleconsult Confirmed', 'Patient Waiting in Room', 'Teleconsult Scheduled'].includes(tc.status) && tc.teleconsultRoomId && (
                          <button
                            id={`nurse-join-teleconsult-${tc._id}`}
                            onClick={() => handleStartCall(tc)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-xs
                              hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
                          >
                            <span>📹</span>
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
                    📹
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
                >
                  ✕
                </button>
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
                      <span>📹</span>
                      <span>Start Video Room</span>
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
