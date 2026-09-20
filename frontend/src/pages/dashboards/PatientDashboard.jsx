import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import patientApi from '../../services/patientApi';
import VideoRoom from '../../components/common/VideoRoom';
import BookTeleconsultModal from '../../components/common/BookTeleconsultModal';
import LiveQueueTracker from '../../features/patient/LiveQueueTracker';
import {
  Bell,
  Calendar,
  FileText,
  Video,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  User,
  ShieldCheck,
  RotateCw,
  Activity,
  History,
  Plus,
} from 'lucide-react';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${color.border} dark:border-slate-700 p-4 flex items-center gap-3.5 shadow-sm`}>
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

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [patientData, setPatientData] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'prescriptions' | 'labs' | 'hospitals' | 'teleconsults'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Teleconsultation state (Prompt 17.2 & 17.4) ──────────────────────────────
  const [showBookTeleconsultModal, setShowBookTeleconsultModal] = useState(false);
  const [myTeleconsults, setMyTeleconsults]                     = useState([]);
  const [loadingTeleconsults, setLoadingTeleconsults]           = useState(false);
  const [activeVideoRoom, setActiveVideoRoom]                   = useState(null);
  const [toast, setToast]                                       = useState(null);
  // AI Queue Prediction: today's active OPD appointment
  const [activeAppointment, setActiveAppointment]               = useState(null);
  // Prompt: Closed-Loop Follow-up: upcoming scheduled follow-up
  const [upcomingFollowUp, setUpcomingFollowUp]                 = useState(null);

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/patient');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Patient') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/patient');
  };

  // ── Fetch Longitudinal Medical Records (Prompt 9.3) ─────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await patientApi.getMyMedicalRecords();
      const data = res.data;
      setPatientData(data.patient || {});
      setHospitals(data.hospitalsVisited || []);
      setTimeline(data.timeline || []);
      setConsultations(data.consultations || []);
      setPrescriptions(data.prescriptions || []);
      setLabOrders(data.labOrders || []);
      // AI Queue Prediction: store today's active appointment if present
      if (data.activeAppointment) {
        setActiveAppointment(data.activeAppointment);
      }
      // Closed-Loop Follow-up: store upcoming follow-up if present
      if (data.upcomingFollowUp) {
        setUpcomingFollowUp(data.upcomingFollowUp);
      } else if (Array.isArray(data.scheduledFollowUps) && data.scheduledFollowUps.length > 0) {
        setUpcomingFollowUp(data.scheduledFollowUps[0]);
      } else {
        // Fallback dedicated fetch
        patientApi.getMyFollowUps().then((fRes) => {
          if (fRes.data?.upcomingFollowUp) {
            setUpcomingFollowUp(fRes.data.upcomingFollowUp);
          } else if (Array.isArray(fRes.data?.followUps) && fRes.data.followUps.length > 0) {
            setUpcomingFollowUp(fRes.data.followUps[0]);
          }
        }).catch(() => null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical history records.');
    } finally {
      setLoading(false);
    }
  }, []);

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Fetch Teleconsultations (Prompt 17.4) ───────────────────────────────────
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

  // Display computations
  const fullName = patientData?.firstName
    ? `${patientData.firstName} ${patientData.lastName || ''}`.trim()
    : user?.name || 'Citizen';

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
      roomId: tc.teleconsultRoomId || `sahay-room-${tc._id}`,
      patientName: fullName,
      doctorName: tc.doctorName || 'Doctor',
      appointmentId: tc._id,
    });
    loadMyTeleconsults();
  };

  // ── Prompt: Live Queue Tracker - Fetch Active Today Appointment ─────────────
  const consultationsRef = useRef(consultations);
  const timelineRef = useRef(timeline);

  useEffect(() => {
    consultationsRef.current = consultations;
    timelineRef.current = timeline;
  }, [consultations, timeline]);

  const loadActiveTodayAppointment = useCallback(async () => {
    try {
      const res = await patientApi.getActiveTodayAppointment();
      if (res.data?.success && res.data?.activeAppointment) {
        setActiveAppointment(res.data.activeAppointment);
      } else {
        // Fallback check against today's appointments list
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const allAppts   = (consultationsRef.current || []).concat(timelineRef.current || []);
        const found = allAppts.find((c) => {
          const d = new Date(c.date || c.appointmentDate || c.createdAt);
          const isToday = d >= todayStart && d <= todayEnd;
          const status = (c.status || '').toUpperCase().replace(/\s+/g, '_');
          return isToday && (status === 'WAITING' || status === 'IN_CONSULTATION' || status === 'WAITING_FOR_DOCTOR' || status === 'CHECKEDIN');
        });
        if (found) {
          setActiveAppointment(found);
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }, []);

  // ── Fetch Longitudinal Medical Timeline & Video Consults on Mount ───────────
  useEffect(() => {
    fetchRecords();
    loadMyTeleconsults();
    loadActiveTodayAppointment();
    // Set up a 20-second interval to refresh queue status per plans.md
    const qInterval = setInterval(loadActiveTodayAppointment, 20000);
    return () => clearInterval(qInterval);
  }, []); // Run exactly once on mount with empty dependency array [] to prevent infinite loop

  // ── Refresh Video Consults when switching to 'teleconsults' tab ──────────────
  useEffect(() => {
    if (activeTab === 'teleconsults') {
      loadMyTeleconsults();
    }
  }, [activeTab]);

  if (!user) return null;

  const abhaId = patientData?.abhaId || (user._id ? `SAHAY-${user._id.slice(-8).toUpperCase()}` : '—');
  const bloodGroup = patientData?.bloodGroup || 'O+';
  const age = patientData?.dob
    ? Math.floor((new Date() - new Date(patientData.dob)) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // ── Prompt 14.2: Group records by Hospital → Doctor ─────────────────────────
  // Returns: { "Hospital Name": { "Dr. Firstname Lastname": [ record1, record2 ] } }
  const groupByHospitalAndDoctor = (records) => {
    return records.reduce((acc, record) => {
      // Resolve hospital name with fallback
      const facility = record.facilityId || record.hospital;
      let hospitalName = 'Unknown Hospital';
      if (facility) {
        if (typeof facility === 'string') {
          hospitalName = facility;
        } else {
          hospitalName = facility.hospitalName || facility.name || 'Unknown Hospital';
        }
      }

      // Resolve doctor name with fallback
      const doc = record.doctorId || record.doctor;
      let doctorName = 'General Consulting';
      if (doc) {
        if (typeof doc === 'string') {
          doctorName = doc.startsWith('Dr.') ? doc : `Dr. ${doc}`;
        } else if (doc.firstName || doc.lastName) {
          doctorName = `Dr. ${(doc.firstName || '')} ${(doc.lastName || '')}`.trim();
        } else if (doc.name) {
          doctorName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
        }
      }

      if (!acc[hospitalName]) {
        acc[hospitalName] = {};
      }
      if (!acc[hospitalName][doctorName]) {
        acc[hospitalName][doctorName] = [];
      }
      acc[hospitalName][doctorName].push(record);
      return acc;
    }, {});
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white border-violet-200 text-sm font-medium max-w-sm transition-all animate-bounce-short">
          <div className="shrink-0 w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
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
        callerRole="Patient"
        patientUser={{
          patientProfileId: patientData?._id || user?.patientProfileId || user?._id,
          name: fullName,
        }}
        onSuccess={(appt) => {
          showToast('success', 'Teleconsult Requested!', 'Your request has been submitted to the hospital for review. You can track status under "My Video Consults".');
          setShowBookTeleconsultModal(false);
          loadMyTeleconsults();
          setActiveTab('teleconsults');
        }}
      />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Citizen ABHA Health ID Card Banner (Step 5) ─────────────────── */}
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle watermarks */}
          <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
          <div className="absolute right-12 top-4 opacity-10 text-8xl font-black select-none pointer-events-none">
            ABDM
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shrink-0">
                {fullName?.[0] || 'P'}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                    {fullName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {t('patient.header.verifiedCitizen')}
                  </span>
                </div>

                <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                  {patientData?.gender && <span className="capitalize">{patientData.gender}</span>}
                  {age !== null && <span>· {t('patient.header.years', { count: age })}</span>}
                  {bloodGroup && (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      {t('patient.header.blood', { group: bloodGroup })}
                    </span>
                  )}
                  {patientData?.contactPhone && (
                    <span className="inline-flex items-center gap-1">
                      · <Phone className="w-3 h-3 text-slate-400" /> {patientData.contactPhone}
                    </span>
                  )}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-sm">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-sky-200">
                      {t('patient.header.abha')}
                    </p>
                    <p className="text-sm font-mono font-black text-white tracking-widest mt-0.5">
                      {abhaId}
                    </p>
                  </div>

                  {/* ── UHID Display (Prompt 1.2) ── */}
                  {patientData?.uhid && (
                    <div className="bg-violet-500/20 px-3 py-1.5 rounded-xl border border-violet-400/30 backdrop-blur-sm">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-violet-300">
                        {t('patient.header.uhid')}
                      </p>
                      <p className="text-sm font-mono font-black text-white tracking-widest mt-0.5">
                        {patientData.uhid}
                      </p>
                    </div>
                  )}

                  {patientData?.address && (
                    <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {[patientData.address.village, patientData.address.district, patientData.address.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
              <button
                onClick={fetchRecords}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 backdrop-blur-sm disabled:opacity-50"
              >
                {t('patient.header.syncRecords')}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/40"
              >
                {t('common.signOut')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Follow-up Notification Card (Prompt: Closed-Loop Follow-up) ── */}
        {upcomingFollowUp && (
          <div
            id="patient-followup-notification"
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-black text-blue-950">
                      Upcoming Follow-up Appointment
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-200/80 text-blue-800 border border-blue-300">
                      {upcomingFollowUp.status === 'ASHA_REMINDED' ? 'ASHA Verified' : 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Dr. {upcomingFollowUp.doctorId?.name || 'Assigned Specialist'}
                    {upcomingFollowUp.facilityId?.hospitalName ? ` · ${upcomingFollowUp.facilityId.hospitalName}` : ''}
                  </p>
                </div>
              </div>

              {/* Date badge */}
              <div className="bg-white px-3 py-1.5 rounded-xl border border-blue-200 text-right shrink-0 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">Date</span>
                <span className="text-xs font-black text-blue-900">
                  {upcomingFollowUp.followUpDate
                    ? new Date(upcomingFollowUp.followUpDate).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Scheduled'}
                </span>
              </div>
            </div>

            {upcomingFollowUp.instructions && (
              <div className="bg-white/80 rounded-xl p-3 border border-blue-100 flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold text-blue-950">Clinical Instructions: </span>
                  {upcomingFollowUp.instructions}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Longitudinal Summary Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatCard
            icon={<Building2 className="w-5 h-5 text-sky-700" />}
            label="Hospitals Visited"
            value={hospitals.length}
            sub="Registered facilities"
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-700', text: 'text-sky-800' }}
          />
          <StatCard
            icon={<Stethoscope className="w-5 h-5 text-indigo-700" />}
            label="OPD Consultations"
            value={consultations.length}
            sub="Doctor sessions"
            color={{ border: 'border-indigo-100', icon: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-800' }}
          />
          <StatCard
            icon={<Pill className="w-5 h-5 text-emerald-700" />}
            label="Digital Prescriptions"
            value={prescriptions.length}
            sub="Medication orders"
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-800' }}
          />
          <StatCard
            icon={<FlaskConical className="w-5 h-5 text-purple-700" />}
            label="Diagnostic Reports"
            value={labOrders.length}
            sub="Laboratory tests"
            color={{ border: 'border-purple-100', icon: 'bg-purple-100 text-purple-700', text: 'text-purple-800' }}
          />
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchRecords} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* ── Live OPD Queue Tracker (Prompt: Mount Live Queue Tracker in Patient Dashboard) ── */}
        {activeAppointment && (
          <LiveQueueTracker appointment={activeAppointment} />
        )}

        {/* ── Prominent Card: Schedule Doctor Video Call (Prompt 17.2) ── */}
        <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 rounded-3xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-violet-500/40">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">Schedule Doctor Video Call</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase tracking-wider">
                  Virtual OPD
                </span>
              </div>
              <p className="text-xs text-violet-200 mt-1 max-w-xl">
                Connect directly with specialist hospital doctors from your home. Request an appointment and receive confirmed consultation links.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="patient-schedule-video-call-btn"
              onClick={() => setShowBookTeleconsultModal(true)}
              className="px-5 py-3 rounded-2xl bg-white text-violet-900 font-extrabold text-xs hover:bg-violet-50 transition-all shadow-lg shadow-violet-950/30 flex items-center gap-2"
            >
              <Video className="w-4 h-4 mr-1 text-violet-900" />
              <span>{t('patient.bookTeleconsult')}</span>
            </button>
          </div>
        </div>

        {/* ── Tabbed Records Navigation (Prompt 9.3 & 17.4) ─────────────────── */}
        <div className="flex flex-wrap items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm gap-2">
          {[
            { id: 'timeline', label: t('patient.tabs.timeline'), count: timeline.length, icon: History },
            { id: 'prescriptions', label: t('patient.tabs.prescriptions'), count: prescriptions.length, icon: Pill },
            { id: 'labs', label: t('patient.tabs.labs'), count: labOrders.length, icon: FlaskConical },
            { id: 'hospitals', label: t('patient.tabs.hospitals'), count: hospitals.length, icon: Building2 },
            { id: 'teleconsults', label: t('patient.tabs.teleconsults'), count: myTeleconsults.length, icon: Video },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Views ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* TAB 1: Unified Chronological Medical Timeline */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Longitudinal Medical Timeline
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chronological healthcare history across all visited medical centers
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-xl border border-sky-100">
                  ABDM Longitudinal View
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 mt-2">{t('patient.emptyRecords')}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('patient.emptyRecordsDesc')}
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-0.5 before:bg-slate-200">
                  {timeline.map((event, idx) => {
                    const isConsult = event.type === 'CONSULTATION';
                    const isRx = event.type === 'PRESCRIPTION';
                    const isLab = event.type === 'LAB_REPORT';

                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline Node Dot */}
                        <div
                          className={`absolute -left-[29px] top-3 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] ${
                            isConsult
                              ? 'bg-indigo-600 text-white'
                              : isRx
                              ? 'bg-emerald-600 text-white'
                              : 'bg-purple-600 text-white'
                          }`}
                        />

                        {/* Event Card */}
                        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                                  isConsult
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : isRx
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {isConsult ? 'Doctor OPD Visit' : isRx ? 'Prescription' : 'Lab Test'}
                              </span>
                              <h4 className="text-xs font-extrabold text-slate-900">{event.title}</h4>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(event.date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Hospital & Doctor Tag */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2">
                            {event.facility?.hospitalName && (
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>{event.facility.hospitalName}</span>
                              </span>
                            )}
                            {event.doctor?.name && (
                              <span className="flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                                <span>Dr. {event.doctor.name}</span>
                              </span>
                            )}
                          </div>

                          {/* Specific Content Details */}
                          {isConsult && (
                            <div className="mt-2 text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                              {event.chiefComplaint && (
                                <p>
                                  <strong className="text-slate-500 text-[10px] uppercase">Complaint:</strong>{' '}
                                  {event.chiefComplaint}
                                </p>
                              )}
                              {event.notes && (
                                <p>
                                  <strong className="text-slate-500 text-[10px] uppercase">Clinical Notes:</strong>{' '}
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          )}

                          {isLab && (
                            <div className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                              <p className="font-mono text-[11px] whitespace-pre-wrap">
                                <strong className="text-purple-700">Findings:</strong> {event.result || 'Processing'}
                              </p>
                              {event.notes && <p className="text-[10px] text-slate-500 italic">{event.notes}</p>}
                            </div>
                          )}

                          {isRx && event.medications?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {event.medications.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1"
                                >
                                  <Pill className="w-3 h-3 text-emerald-600" /> {m.medicineName || m.drugName} ({m.dosage || 'Std'})
                                </span>
                              ))}
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

          {/* TAB 2: Digital Prescriptions (Prompt 14.2 — grouped by Hospital → Doctor) */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              {prescriptions.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                  <Pill className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 mt-2">{t('patient.emptyPrescriptions')}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('patient.emptyPrescriptionsDesc')}
                  </p>
                </div>
              ) : (
                (() => {
                  const grouped = groupByHospitalAndDoctor(prescriptions);
                  return Object.keys(grouped).map((hospitalName) => (
                    <div key={hospitalName} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Hospital Header */}
                      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border-b border-sky-100 px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-sky-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">{hospitalName}</h3>
                          <p className="text-[11px] text-slate-500">
                            {t('patient.prescriptionsFromFacility', { count: Object.values(grouped[hospitalName]).flat().length })}
                          </p>
                        </div>
                      </div>

                      {/* Doctor Sub-groups */}
                      <div className="divide-y divide-slate-100">
                        {Object.keys(grouped[hospitalName]).map((doctorName) => (
                          <div key={doctorName} className="px-6 py-4">
                            {/* Doctor Sub-header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                <Stethoscope className="w-4 h-4 text-indigo-700" />
                              </span>
                              <span className="text-xs font-bold text-indigo-900">{doctorName}</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                                {grouped[hospitalName][doctorName].length} Rx
                              </span>
                            </div>

                            {/* Prescriptions under this doctor */}
                            <div className="space-y-4 ml-9">
                              {grouped[hospitalName][doctorName].map((rx) => (
                                <div key={rx._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-extrabold text-slate-900">
                                        Prescription #{rx._id.slice(-6).toUpperCase()}
                                      </h4>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          rx.status === 'Dispensed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {rx.status === 'Dispensed' ? 'Dispensed' : 'Pending'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {new Date(rx.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>

                                  {/* Medications Table */}
                                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="bg-slate-100/60 px-4 py-2 grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                      <div className="col-span-5">{t('common.medicine')}</div>
                                      <div className="col-span-2">{t('common.dosage')}</div>
                                      <div className="col-span-3">{t('common.frequency')}</div>
                                      <div className="col-span-2">{t('common.duration')}</div>
                                    </div>
                                    {(rx.medications || []).map((med, idx) => (
                                      <div key={idx} className="px-4 py-2.5 grid grid-cols-12 text-xs items-center">
                                        <div className="col-span-5 font-bold text-slate-900">
                                          {med.medicineName || med.drugName || 'Medicine'}
                                          {med.instructions && (
                                            <p className="text-[10px] font-normal text-slate-500 italic mt-0.5">
                                              {med.instructions}
                                            </p>
                                          )}
                                        </div>
                                        <div className="col-span-2 font-mono text-slate-600">{med.dosage || '—'}</div>
                                        <div className="col-span-3 text-slate-600">
                                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                            {med.frequency || 'As advised'}
                                          </span>
                                        </div>
                                        <div className="col-span-2 font-semibold text-slate-700">{med.duration || 'Standard'}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {rx.instructions && (
                                    <div className="bg-white p-3 rounded-xl text-xs text-slate-600 border border-slate-100">
                                      <span className="font-bold text-slate-500 text-[10px] uppercase mr-1">{t('common.instructions')}:</span>
                                      {rx.instructions}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          )}

          {/* TAB 3: Diagnostic Lab Reports (Prompt 14.2 — grouped by Hospital → Doctor) */}
          {activeTab === 'labs' && (
            <div className="space-y-4">
              {labOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                  <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 mt-2">{t('patient.emptyLabs')}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('patient.emptyLabsDesc')}
                  </p>
                </div>
              ) : (
                (() => {
                  const grouped = groupByHospitalAndDoctor(labOrders);
                  return Object.keys(grouped).map((hospitalName) => (
                    <div key={hospitalName} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Hospital Header */}
                      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-100 px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-purple-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">{hospitalName}</h3>
                          <p className="text-[11px] text-slate-500">
                            {t('patient.labsFromFacility', { count: Object.values(grouped[hospitalName]).flat().length })}
                          </p>
                        </div>
                      </div>

                      {/* Doctor Sub-groups */}
                      <div className="divide-y divide-slate-100">
                        {Object.keys(grouped[hospitalName]).map((doctorName) => (
                          <div key={doctorName} className="px-6 py-4">
                            {/* Doctor Sub-header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                                <Stethoscope className="w-4 h-4 text-purple-700" />
                              </span>
                              <span className="text-xs font-bold text-purple-900">{doctorName}</span>
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-100">
                                {grouped[hospitalName][doctorName].length} test(s)
                              </span>
                            </div>

                            {/* Lab orders under this doctor */}
                            <div className="space-y-3 ml-9">
                              {grouped[hospitalName][doctorName].map((lab) => (
                                <div key={lab._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-extrabold text-slate-900">{lab.testName}</h4>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          lab.status === 'Completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}
                                      >
                                        {lab.status || 'Completed'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {new Date(lab.updatedAt || lab.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                      </span>
                                      {lab.resultURL && (
                                        <a
                                          href={lab.resultURL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-bold transition-all border border-sky-200"
                                        >
                                          <FileText className="w-3 h-3" />
                                          <span>{t('common.viewPdf')}</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Result Findings */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                      Diagnostic Findings & Test Observations:
                                    </p>
                                    <p className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                                      {lab.result || 'No formal narrative text uploaded for this test.'}
                                    </p>
                                  </div>

                                  {lab.notes && (
                                    <p className="text-xs text-slate-500 italic">
                                      <span className="font-semibold text-slate-700">Technician Remarks:</span> {lab.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          )}

          {/* TAB 4: Hospitals Visited (Prompt 9.3) */}
          {activeTab === 'hospitals' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                  Registered Healthcare Facilities Visited ({hospitals.length})
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Unique clinics and hospitals associated with your Ayushman Bharat Health Account
                </p>

                {hospitals.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 mt-2">{t('patient.emptyHospitals')}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t('patient.emptyHospitalsDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hospitals.map((fac) => (
                      <div
                        key={fac._id}
                        className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-sky-700" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {fac.hospitalName}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {typeof fac.address === 'object'
                                ? [fac.address.village, fac.address.district, fac.address.state].filter(Boolean).join(', ')
                                : fac.address || 'Address recorded'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Visits recorded: <strong className="text-slate-700">{fac.visitCount || 1}</strong></span>
                          {fac.lastVisit && (
                            <span>Last visit: {new Date(fac.lastVisit).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: My Video Consults (Prompt 17.4) */}
          {activeTab === 'teleconsults' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-md shadow-violet-200 shrink-0">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      My Scheduled Video Consultations ({myTeleconsults.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Live doctor consultations booked for your health profile
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="patient-refresh-teleconsults-btn"
                    onClick={loadMyTeleconsults}
                    disabled={loadingTeleconsults}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                  >
                    <svg className={`w-3.5 h-3.5 ${loadingTeleconsults ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    <span>{t('common.refresh')}</span>
                  </button>
                  <button
                    id="patient-new-video-call-btn"
                    onClick={() => setShowBookTeleconsultModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-extrabold shadow-sm shadow-violet-200 hover:opacity-90 transition-all flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span>{t('patient.scheduleVideoCall')}</span>
                  </button>
                </div>
              </div>

              {loadingTeleconsults && (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100">
                  <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-semibold">{t('common.loading')}</p>
                </div>
              )}

              {!loadingTeleconsults && myTeleconsults.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 mx-auto flex items-center justify-center mb-3">
                    <Video className="w-7 h-7 text-violet-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{t('patient.emptyTeleconsults')}</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {t('patient.emptyTeleconsultsDesc')}
                  </p>
                  <button
                    onClick={() => setShowBookTeleconsultModal(true)}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition-colors shadow-md shadow-violet-200"
                  >
                    {t('patient.scheduleVideoCallNow')}
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
                          ${tc.status === 'Teleconsult Confirmed' || tc.status === 'Patient Waiting in Room' ? 'border-emerald-300 ring-1 ring-emerald-200' : isScheduled ? 'border-violet-300 ring-1 ring-violet-200' : 'border-slate-200'}`}
                      >
                        <div className={`h-1.5 w-full ${tc.status === 'Teleconsult Confirmed' || tc.status === 'Patient Waiting in Room' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : isScheduled ? 'bg-gradient-to-r from-violet-500 to-purple-600' : isRequested ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                        <div className="p-5 space-y-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">
                                {tc.facilityName}
                              </h4>
                              <p className="text-xs text-slate-500">
                                Doctor: <strong className="text-slate-800">{tc.doctorName}</strong>
                              </p>
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

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Scheduled Date</p>
                              <p className="font-bold text-slate-800">
                                {tc.scheduledDate ? new Date(tc.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                              </p>
                            </div>
                            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Time Slot</p>
                              <p className="font-bold text-slate-800 truncate">{tc.timeSlot || 'Confirmed slot'}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Type</p>
                              <p className="font-bold text-slate-800">Video Consultation</p>
                            </div>
                          </div>

                          {tc.chiefComplaint && (
                            <div className="bg-violet-50/50 rounded-xl px-3.5 py-2 border border-violet-100 text-xs">
                              <span className="font-bold text-violet-900 uppercase text-[10px] mr-1">Complaint:</span>
                              <span className="text-slate-700">{tc.chiefComplaint}</span>
                            </div>
                          )}

                          {['Teleconsult Confirmed', 'Patient Waiting in Room', 'Teleconsult Scheduled', 'In Teleconsult'].includes(tc.status) && (
                            <button
                              id={`patient-join-call-${tc._id}`}
                              onClick={() => handleStartCall(tc)}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-extrabold text-xs
                                hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200"
                            >
                              <Video className="w-4 h-4 mr-1 text-white" />
                              <span>{t('patient.startCall')}</span>
                            </button>
                          )}

                          {isRequested && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                              {t('patient.awaitingReview')}
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
        </div>

      </div>

      {/* ── Jitsi Video Room Modal (Prompt 18.2) ────────────────────────── */}
      {activeVideoRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-800">
            <VideoRoom
              roomName={activeVideoRoom.roomId}
              displayName={activeVideoRoom.patientName}
              waitingBanner={`Waiting for ${activeVideoRoom.doctorName} to connect... Your connection is live.`}
              onClose={() => {
                setActiveVideoRoom(null);
                loadMyTeleconsults();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
