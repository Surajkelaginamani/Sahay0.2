import React, { useState, useEffect, useCallback, useMemo } from 'react';
import doctorApi from '../services/doctorApi';

// ─── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  if (status === 'Patient Waiting in Room') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs animate-pulse">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
        Patient Waiting in Call
      </span>
    );
  }
  if (status === 'Teleconsult Confirmed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-teal-50 text-teal-800 border-teal-300">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
        Confirmed
      </span>
    );
  }
  if (status === 'Teleconsult Requested') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-purple-100 text-purple-900 border-purple-300 shadow-xs animate-pulse">
        <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
        📹 Teleconsult Req.
      </span>
    );
  }
  if (status === 'Teleconsult Scheduled') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-violet-100 text-violet-900 border-violet-300">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
        📹 Scheduled
      </span>
    );
  }
  if (status === 'In Teleconsult') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-indigo-100 text-indigo-900 border-indigo-300">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        📹 Live Call
      </span>
    );
  }
  if (status === 'Reports Ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-teal-100 text-teal-800 border-teal-200">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        Reports Ready
      </span>
    );
  }
  const isCheckedIn = status === 'CheckedIn' || status === 'Waiting for Doctor';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        isCheckedIn
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-amber-100 text-amber-700 border-amber-200'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {isCheckedIn ? 'Ready' : 'Waiting'}
    </span>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ appt, isSelected, onSelect }) {
  const isEmergency              = appt.urgency === 'Emergency';
  const isUrgent                 = !isEmergency && (appt.urgency === 'Urgent' || appt.priority === 'Urgent');
  const isReportsReady           = appt.status === 'Reports Ready';
  // Prompt 6.2: Critical lab detection
  const isCriticalLab            = Boolean(appt.isCriticalLab || appt.labOrders?.some((o) => o.isCritical) || appt.completedLabOrder?.isCritical);
  const isPatientWaiting         = appt.status === 'Patient Waiting in Room';
  const isTeleconsultRequested   = appt.status === 'Teleconsult Requested';
  const isInTeleconsult          = appt.status === 'In Teleconsult';
  const patient                  = appt.patientId;

  // Age calculation
  const age = patient?.dob
    ? Math.floor((new Date() - new Date(patient.dob)) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const criticalOrder = appt.labOrders?.find((o) => o.isCritical) || (appt.completedLabOrder?.isCritical ? appt.completedLabOrder : null);
  const criticalReason = criticalOrder?.criticalReason;
  const completedTest = criticalOrder?.testName || appt.completedLabOrder?.testName || appt.labOrders?.[0]?.testName;

  return (
    <div
      onClick={() => onSelect?.(appt)}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
        isCriticalLab
          ? isSelected
            ? 'border-red-700 border-2 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white shadow-2xl ring-4 ring-red-300 animate-pulse'
            : 'border-red-600 border-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl ring-2 ring-red-400 animate-pulse'
          : isSelected
          ? 'border-sky-500 bg-sky-50/80 shadow-sm ring-2 ring-sky-400/40'
          : isPatientWaiting
          ? 'border-emerald-500 border-l-4 border-l-emerald-600 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 ring-2 ring-emerald-400 shadow-md animate-pulse'
          : isTeleconsultRequested
          ? 'border-purple-400 border-l-4 border-l-purple-600 bg-gradient-to-r from-purple-50/90 to-fuchsia-50/60 ring-2 ring-purple-400/40 shadow-md animate-pulse'
          : isInTeleconsult
          ? 'border-indigo-300 border-l-4 border-l-indigo-600 bg-indigo-50/70 shadow-sm'
          : isReportsReady
          ? 'border-teal-200 border-l-4 border-l-teal-500 bg-teal-50/40 hover:bg-teal-50/80 shadow-xs'
          : isEmergency
          ? 'border-red-500 border-l-4 border-l-red-600 bg-red-50/80 hover:bg-red-100/70 shadow-sm ring-1 ring-red-300'
          : isUrgent
          ? 'border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/60 shadow-xs'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Queue number badge */}
          {appt.queueNumber ? (
            <span
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                isReportsReady && isCriticalLab
                  ? 'bg-white text-red-700 shadow-xs'
                  : isPatientWaiting
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isTeleconsultRequested
                  ? 'bg-purple-600 text-white shadow-xs'
                  : isReportsReady
                  ? 'bg-teal-200 text-teal-900'
                  : isEmergency
                  ? 'bg-red-600 text-white shadow-xs animate-pulse'
                  : isUrgent
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              #{appt.queueNumber}
            </span>
          ) : (
            <span className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
              {isReportsReady && isCriticalLab ? '🚨' : isPatientWaiting ? '📹' : isEmergency ? '🚨' : '—'}
            </span>
          )}

          {/* Patient Name */}
          <div className="min-w-0">
            <p className={`text-xs font-bold truncate leading-tight ${isReportsReady && isCriticalLab ? 'text-white font-extrabold' : 'text-slate-900'}`}>
              {appt.patientFullName}
            </p>
            {/* UHID (Prompt 1.2) */}
            {patient?.uhid && (
              <span className={`inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide ${
                isReportsReady && isCriticalLab
                  ? 'bg-red-900/60 border border-red-400/50 text-white'
                  : 'bg-violet-50 border border-violet-200 text-violet-700'
              }`}>
                🪪 {patient.uhid}
              </span>
            )}
            <div className={`flex items-center gap-1.5 text-[10px] mt-0.5 ${isReportsReady && isCriticalLab ? 'text-red-100' : 'text-slate-400'}`}>
              {patient?.gender && <span>{patient.gender}</span>}
              {age !== null && (
                <>
                  <span>·</span>
                  <span>{age} yrs</span>
                </>
              )}
              {patient?.bloodGroup && (
                <>
                  <span>·</span>
                  <span className={`font-semibold ${isReportsReady && isCriticalLab ? 'text-white underline' : 'text-rose-600'}`}>{patient.bloodGroup}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Priority & Urgency Badge (Prompt 4.3) & Status */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isReportsReady && isCriticalLab ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-red-700 text-[9px] font-black uppercase tracking-wider shadow-xs animate-pulse">
              🚨 CRITICAL LAB
            </span>
          ) : appt.urgency === 'Emergency' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs animate-pulse">
              🚨 Emergency
            </span>
          ) : appt.urgency === 'Urgent' || appt.priority === 'Urgent' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
              ⚠️ Urgent
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-medium">
              Routine
            </span>
          )}
          <StatusPill status={appt.status} />
        </div>
      </div>

      {/* Patient Waiting in Call Live Banner (Prompt 18.3) */}
      {isPatientWaiting && (
        <div className="mt-2 text-[11px] text-emerald-950 bg-emerald-100/90 px-2.5 py-1.5 rounded-xl border border-emerald-300 flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-1.5 font-extrabold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <span>Patient Waiting in Call</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
            Connect
          </span>
        </div>
      )}

      {/* Teleconsult Requested Flashing Notice */}
      {!isPatientWaiting && isTeleconsultRequested && (
        <div className="mt-2 text-[11px] text-purple-900 bg-purple-100/90 px-2.5 py-1.5 rounded-xl border border-purple-300 flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-1.5 font-extrabold">
            <span className="text-xs animate-bounce">📹</span>
            <span>Live Video Teleconsultation</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-md animate-pulse">
            Connect
          </span>
        </div>
      )}

      {isInTeleconsult && (
        <div className="mt-2 text-[11px] text-indigo-900 bg-indigo-100/80 px-2.5 py-1.5 rounded-xl border border-indigo-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            <span>Video Call In Progress</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-md">
            Live
          </span>
        </div>
      )}

      {/* Scheduled Teleconsult Date & Time Badges (Prompt 17.4) */}
      {(appt.type === 'Teleconsultation' || appt.status === 'Teleconsult Scheduled') && !isInTeleconsult && !isTeleconsultRequested && (
        <div className="mt-2 text-[11px] text-violet-900 bg-violet-50/90 px-2.5 py-1.5 rounded-xl border border-violet-200 flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-1.5 font-bold">
            <span>📅</span>
            <span>
              {appt.scheduledDate
                ? new Date(appt.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                : 'Today'}
            </span>
            <span className="text-violet-300">·</span>
            <span>⏰</span>
            <span className="text-violet-700">{appt.timeSlot || 'Scheduled Slot'}</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-violet-600 text-white px-2 py-0.5 rounded-md">
            Virtual OPD
          </span>
        </div>
      )}

      {/* Reports Ready Badge / Test Notice */}
      {isReportsReady && (
        <div className={`mt-2 text-[11px] px-2.5 py-1.5 rounded-xl border flex items-center justify-between ${
          isCriticalLab
            ? 'bg-red-950/85 text-white border-red-400/60 shadow-sm'
            : 'text-teal-800 bg-teal-100/70 border-teal-200'
        }`}>
          <span className="flex items-center gap-1 font-bold">
            <span>{isCriticalLab ? '🚨' : '🔬'}</span>
            <span className="truncate">{completedTest || 'Lab Report Completed'}</span>
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md ${
            isCriticalLab
              ? 'bg-white text-red-700 shadow-xs'
              : 'bg-teal-600 text-white'
          }`}>
            {isCriticalLab ? 'CRITICAL REVIEW' : 'Review Ready'}
          </span>
        </div>
      )}

      {/* Prompt 6.2: Critical Lab Alert Strip */}
      {isCriticalLab && (
        <div className="mt-2 text-[10px] font-bold bg-red-950/80 border border-red-300/40 text-red-100 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-1 shadow-xs">
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-xs shrink-0 animate-bounce">⚠️</span>
            <span className="truncate">{criticalReason || 'Out of normal reference range'}</span>
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-white text-red-700 px-1.5 py-0.5 rounded shadow-xs shrink-0">
            URGENT
          </span>
        </div>
      )}

      {/* Chief Complaint / Notes snippet */}
      {appt.chiefComplaint && (
        <div className="mt-2 text-[11px] text-slate-600 bg-white/70 px-2.5 py-1 rounded-xl border border-slate-100 line-clamp-1">
          <span className="font-semibold text-slate-400 text-[10px] uppercase mr-1">Complaint:</span>
          {appt.chiefComplaint}
        </div>
      )}

      {/* Footer strip: phone & time */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/70">
        <span className="font-mono">{patient?.contactPhone || 'No phone'}</span>
        <span>{appt.timeSlot || 'Walk-in'}</span>
      </div>
    </div>
  );
}

// ─── DoctorQueue Component (Prompt 8.4) ────────────────────────────────────────
export default function DoctorQueue({
  selectedAppointmentId,
  onSelectPatient,
  refreshTrigger,
  onQueueLoaded,
}) {
  const [queue, setQueue]                   = useState([]);
  const [activeQueue, setActiveQueue]       = useState([]);
  const [reviewQueue, setReviewQueue]       = useState([]);
  const [teleconsultQueue, setTeleconsultQueue] = useState([]);
  const [summary, setSummary]               = useState({ total: 0, emergency: 0, urgent: 0, waiting: 0, checkedIn: 0, active: 0, reportsReady: 0, teleconsults: 0 });
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL'); // 'ALL' | 'Emergency' | 'Urgent' | 'Routine'
  const [queueTab, setQueueTab]             = useState('ALL'); // 'ALL' | 'ONGOING' | 'REPORTS_READY' | 'TELECONSULT'
  
  // Accordion toggle states
  const [showReportsReady, setShowReportsReady] = useState(true);
  const [showOngoing, setShowOngoing]           = useState(true);

  // ── Fetch Queue ─────────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await doctorApi.getQueue();
      const rawActive = res.data?.activeQueue || (res.data?.queue || []).filter((a) => a.status !== 'Reports Ready' && a.type !== 'Teleconsultation');
      const rawReview = res.data?.reviewQueue || (res.data?.queue || []).filter((a) => a.status === 'Reports Ready');

      // Prompt 6.2: Sort critical lab patients to top of review queue
      rawReview.sort((a, b) => {
        const aCrit = a.isCriticalLab || a.labOrders?.some((o) => o.isCritical) || a.completedLabOrder?.isCritical ? 1 : 0;
        const bCrit = b.isCriticalLab || b.labOrders?.some((o) => o.isCritical) || b.completedLabOrder?.isCritical ? 1 : 0;
        return bCrit - aCrit;
      });
      const rawTeleconsult = res.data?.teleconsultQueue || (res.data?.queue || []).filter((a) =>
        a.type === 'Teleconsultation' &&
        [
          'Teleconsult Confirmed',
          'Patient Waiting in Room',
          'In Teleconsult',
          'Teleconsult Scheduled',
          'Teleconsult Requested',
        ].includes(a.status)
      );

      // Prompt 18.1: Sort Patient Waiting in Room to top
      rawTeleconsult.sort((a, b) => {
        const aWaiting = a.status === 'Patient Waiting in Room';
        const bWaiting = b.status === 'Patient Waiting in Room';
        if (aWaiting && !bWaiting) return -1;
        if (!aWaiting && bWaiting) return 1;
        return new Date(a.scheduledDate || a.createdAt) - new Date(b.scheduledDate || b.createdAt);
      });

      const rawQueue  = res.data?.queue || [...rawActive, ...rawReview, ...rawTeleconsult];
      const rawSummary = res.data?.summary || {
        total: rawQueue.length,
        active: rawActive.length,
        reportsReady: rawReview.length,
        teleconsults: rawTeleconsult.length,
        emergency: rawQueue.filter((a) => a.urgency === 'Emergency').length,
        urgent: rawQueue.filter((a) => a.urgency === 'Urgent' || (a.priority === 'Urgent' && a.urgency !== 'Emergency')).length,
        routine: rawQueue.filter((a) => a.urgency === 'Routine' || (!a.urgency && a.priority !== 'Urgent')).length,
        checkedIn: rawQueue.filter((a) => a.status === 'CheckedIn').length,
        waiting: rawQueue.filter((a) => a.status === 'Waiting').length,
      };

      setQueue(rawQueue);
      setActiveQueue(rawActive);
      setReviewQueue(rawReview);
      setTeleconsultQueue(rawTeleconsult);
      setSummary(rawSummary);
      onQueueLoaded?.({ queue: rawQueue, activeQueue: rawActive, reviewQueue: rawReview, teleconsultQueue: rawTeleconsult, summary: rawSummary });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient queue.');
    } finally {
      setLoading(false);
    }
  }, [onQueueLoaded]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshTrigger]);

  // ── Helper filter ───────────────────────────────────────────────────────────
  const filterList = useCallback(
    (list) => {
      const q = searchQuery.trim().toLowerCase();
      return list.filter((appt) => {
        if (filterPriority === 'Emergency') {
          if (appt.urgency !== 'Emergency') return false;
        } else if (filterPriority === 'Urgent') {
          if (appt.urgency !== 'Urgent' && (appt.priority !== 'Urgent' || appt.urgency === 'Emergency')) return false;
        } else if (filterPriority === 'Routine') {
          if (appt.urgency === 'Emergency' || appt.urgency === 'Urgent' || appt.priority === 'Urgent') return false;
        }
        if (q) {
          const name = (appt.patientFullName || '').toLowerCase();
          const phone = (appt.patientId?.contactPhone || '').toLowerCase();
          const complaint = (appt.chiefComplaint || '').toLowerCase();
          const visitType = (appt.visitType || '').toLowerCase();
          return name.includes(q) || phone.includes(q) || complaint.includes(q) || visitType.includes(q);
        }
        return true;
      });
    },
    [searchQuery, filterPriority]
  );

  const filteredActiveQueue      = useMemo(() => filterList(activeQueue), [filterList, activeQueue]);
  const filteredReviewQueue      = useMemo(() => filterList(reviewQueue), [filterList, reviewQueue]);
  const filteredTeleconsultQueue = useMemo(() => filterList(teleconsultQueue), [filterList, teleconsultQueue]);
  const totalFilteredCount       = filteredActiveQueue.length + filteredReviewQueue.length + filteredTeleconsultQueue.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
              {queue.length}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Doctor Patient Queue</h2>
              <p className="text-[11px] text-slate-400">OPD Queue & Lab Review</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {summary.emergency > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse shadow-xs">
                <span>🚨</span>
                <span>{summary.emergency} Emergency</span>
              </span>
            )}
            {teleconsultQueue.some((a) => a.status === 'Patient Waiting in Room') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 animate-pulse shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                <span>Patient Waiting in Call</span>
              </span>
            )}
            {summary.reportsReady > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold border border-teal-200 animate-pulse">
                <span>🔬</span>
                <span>{summary.reportsReady} Ready</span>
              </span>
            )}
            {summary.urgent > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                <span>⚠️</span>
                <span>{summary.urgent}</span>
              </span>
            )}
            <button
              id="refresh-doctor-queue-btn"
              onClick={fetchQueue}
              disabled={loading}
              title="Refresh queue"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Queue Section Switcher (Prompt 8.4) ─────────────────────────── */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setQueueTab('ALL')}
            className={`flex-1 py-1 rounded-lg transition-all text-center ${
              queueTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({queue.length})
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('ONGOING')}
            className={`flex-1 py-1 rounded-lg transition-all text-center ${
              queueTab === 'ONGOING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ongoing ({activeQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('REPORTS_READY')}
            className={`flex-1 py-1 rounded-lg transition-all text-center relative ${
              queueTab === 'REPORTS_READY'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-teal-700 hover:text-teal-900'
            }`}
          >
            Reports Ready ({reviewQueue.length})
            {reviewQueue.length > 0 && queueTab !== 'REPORTS_READY' && (
              <span className="w-2 h-2 rounded-full bg-teal-500 absolute top-1 right-1 animate-ping" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setQueueTab('TELECONSULT')}
            className={`flex-1 py-1 rounded-lg transition-all text-center relative ${
              queueTab === 'TELECONSULT'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-violet-700 hover:text-violet-900'
            }`}
          >
            📹 Virtual ({teleconsultQueue.length})
            {teleconsultQueue.some((a) => a.status === 'Patient Waiting in Room') ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute top-1 right-1 animate-ping" />
            ) : teleconsultQueue.length > 0 && queueTab !== 'TELECONSULT' ? (
              <span className="w-2 h-2 rounded-full bg-violet-500 absolute top-1 right-1 animate-ping" />
            ) : null}
          </button>
        </div>

        {/* ── Search & Filter bar ─────────────────────────────────────────── */}
        <div className="space-y-2">
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
              placeholder="Search queue by name, phone..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
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

          {/* Quick Priority Toggle Pills */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold flex-wrap">
            {[
              { id: 'ALL', label: `All Priorities` },
              { id: 'Emergency', label: `Emergency (${summary.emergency || 0})`, alert: (summary.emergency || 0) > 0 },
              { id: 'Urgent', label: `Urgent (${summary.urgent || 0})`, alert: (summary.urgent || 0) > 0 },
              { id: 'Routine', label: `Routine (${summary.routine || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterPriority(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterPriority === tab.id
                    ? tab.id === 'Emergency'
                      ? 'bg-red-600 text-white shadow-xs font-black'
                      : tab.id === 'Urgent'
                      ? 'bg-amber-400 text-amber-950 shadow-xs font-bold'
                      : 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 mx-4 my-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchQueue} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* ── Queue List Body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-[300px] max-h-[620px]">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state: No patients at all */}
        {!loading && queue.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-400 flex items-center justify-center mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-700">Queue is Clear</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No waiting patients assigned right now.</p>
          </div>
        )}

        {/* Filtered empty state */}
        {!loading && queue.length > 0 && totalFilteredCount === 0 && (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-semibold">No matching patients in this view</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterPriority('ALL'); setQueueTab('ALL'); }}
              className="text-[11px] text-sky-600 font-bold mt-1 underline"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ── SECTION 1: Reports Ready (Secondary Review Queue - Prompt 8.4) ─── */}
        {!loading && (queueTab === 'ALL' || queueTab === 'REPORTS_READY') && filteredReviewQueue.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShowReportsReady(!showReportsReady)}
                className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800 hover:text-teal-900 transition-colors"
              >
                <span>🔬 Reports Ready</span>
                <span className="px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px]">
                  {filteredReviewQueue.length}
                </span>
                <svg
                  className={`w-3.5 h-3.5 transform transition-transform ${showReportsReady ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="text-[10px] text-teal-600 font-semibold">Lab test completed</span>
            </div>

            {showReportsReady && (
              <div className="space-y-2 pl-0.5">
                {filteredReviewQueue.map((appt) => (
                  <PatientCard
                    key={appt._id}
                    appt={appt}
                    isSelected={selectedAppointmentId === appt._id}
                    onSelect={onSelectPatient}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* If user explicitly selected REPORTS_READY tab but there are none */}
        {!loading && queueTab === 'REPORTS_READY' && filteredReviewQueue.length === 0 && (
          <div className="p-8 text-center text-slate-400 border border-dashed border-teal-200 rounded-2xl bg-teal-50/30">
            <span className="text-xl">🧪</span>
            <p className="text-xs font-bold text-teal-900 mt-2">No Reports Ready for Review</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              Patients will appear here automatically when the Lab Head uploads test results.
            </p>
          </div>
        )}

        {/* ── SECTION 2: Ongoing Queue (Primary Queue - Prompt 8.4) ──────────── */}
        {!loading && (queueTab === 'ALL' || queueTab === 'ONGOING') && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setShowOngoing(!showOngoing)}
                className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 hover:text-slate-900 transition-colors"
              >
                <span>⏳ Ongoing Queue</span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px]">
                  {filteredActiveQueue.length}
                </span>
                <svg
                  className={`w-3.5 h-3.5 transform transition-transform ${showOngoing ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="text-[10px] text-slate-400 font-semibold">Waiting & Checked-In</span>
            </div>

            {showOngoing && (
              <div className="space-y-2 pl-0.5">
                {filteredActiveQueue.map((appt) => (
                  <PatientCard
                    key={appt._id}
                    appt={appt}
                    isSelected={selectedAppointmentId === appt._id}
                    onSelect={onSelectPatient}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* If user explicitly selected ONGOING tab but there are none */}
        {!loading && queueTab === 'ONGOING' && filteredActiveQueue.length === 0 && (
          <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <span className="text-xl">☕</span>
            <p className="text-xs font-bold text-slate-700 mt-2">No Patients in Ongoing Queue</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All waiting consultation appointments have been seen.
            </p>
          </div>
        )}

        {/* ── SECTION 3: Teleconsultations (Virtual OPD) (Prompt 17.4 & 18.3) ───────── */}
        {!loading && (queueTab === 'ALL' || queueTab === 'TELECONSULT') && teleconsultQueue.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-violet-900">
                <span>📹 Teleconsultations (Virtual OPD)</span>
                <span className="px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px]">{teleconsultQueue.length}</span>
              </div>
              {teleconsultQueue.some((a) => a.status === 'Patient Waiting in Room') ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Patient Waiting in Call
                </span>
              ) : (
                <span className="text-[10px] text-violet-500 font-semibold">Virtual Queue</span>
              )}
            </div>
            <div className="space-y-2 pl-0.5">
              {filteredTeleconsultQueue.map((appt) => (
                <PatientCard
                  key={appt._id}
                  appt={appt}
                  isSelected={selectedAppointmentId === appt._id}
                  onSelect={onSelectPatient}
                />
              ))}
            </div>
          </div>
        )}

        {/* If user selected TELECONSULT tab but there are none */}
        {!loading && queueTab === 'TELECONSULT' && teleconsultQueue.length === 0 && (
          <div className="p-8 text-center text-slate-400 border border-dashed border-violet-200 rounded-2xl bg-violet-50/30">
            <span className="text-2xl">📹</span>
            <p className="text-xs font-bold text-violet-900 mt-2">No Scheduled Teleconsults</p>
            <p className="text-[11px] text-violet-600 mt-0.5">
              Teleconsultation requests from ASHA workers and nurses will appear here once confirmed by the receptionist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
