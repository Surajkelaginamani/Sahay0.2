import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, ClockAlert, CreditCard, PhoneCall, RotateCcw, Siren, UserX, Video } from 'lucide-react';
import nurseApi from '../services/nurseApi';

// ── Elapsed time helper ───────────────────────────────────────────────────────
function useElapsedTime(timestamp) {
  const [elapsed, setElapsed] = React.useState('');
  React.useEffect(() => {
    if (!timestamp) return;
    const compute = () => {
      const diffMs   = Date.now() - new Date(timestamp).getTime();
      const totalSec = Math.floor(diffMs / 1000);
      const mins     = Math.floor(totalSec / 60);
      const hrs      = Math.floor(mins / 60);
      if (hrs > 0)       setElapsed(`${hrs}h ${mins % 60}m ago`);
      else if (mins > 0) setElapsed(`${mins}m ago`);
      else               setElapsed(`${totalSec}s ago`);
    };
    compute();
    const id = setInterval(compute, 15000);
    return () => clearInterval(id);
  }, [timestamp]);
  return elapsed;
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  if (status === 'Teleconsult Requested') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border bg-purple-100 text-purple-800 border-purple-300 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
        Teleconsult Req.
      </span>
    );
  }
  if (status === 'In Teleconsult') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border bg-indigo-100 text-indigo-800 border-indigo-300">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        In Teleconsult
      </span>
    );
  }
  const isTriage = status === 'At Triage';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
        isTriage
          ? 'bg-teal-100 text-teal-800 border-teal-200'
          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

// ── Skipped patient row (On-Hold panel) ───────────────────────────────────────
function SkippedRow({ appt, onRecall, onMarkNoShow }) {
  const elapsed = useElapsedTime(appt.skippedAt);
  return (
    <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
        {appt.patientId?.firstName?.[0] || 'P'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 text-xs leading-tight truncate">
          {appt.patientFullName}
          {appt.queueNumber && (
            <span className="ml-1.5 text-[10px] font-mono text-slate-500">#{appt.queueNumber}</span>
          )}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-amber-700 mt-0.5">
          <Clock className="w-3 h-3" />
          <span>Skipped {elapsed || '—'}</span>
          {appt.callAttempts > 0 && (
            <span className="ml-1 px-1.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[9px]">
              Called {appt.callAttempts}x
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          id={`nurse-recall-btn-${appt._id}`}
          onClick={() => onRecall(appt)}
          title="Recall patient to next slot"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm shadow-sky-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Recall to Next Slot</span>
        </button>
        <button
          type="button"
          id={`nurse-noshow-btn-${appt._id}`}
          onClick={() => onMarkNoShow(appt)}
          title="Mark patient as No-Show"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-all"
        >
          <UserX className="w-3.5 h-3.5 text-rose-500" />
          <span>Mark No-Show</span>
        </button>
      </div>
    </div>
  );
}

// ── Main TriageQueue Component ─────────────────────────────────────────────────
export default function TriageQueue({
  selectedAppointmentId,
  onEnterVitals,
  onForwardToDoctor,
  onRequestTeleconsult,
  onSkip,
  onRecall,
  onMarkNoShow,
  refreshTrigger,
  onQueueLoaded,
  skippedQueue = [],
}) {
  const [queue, setQueue]                     = useState([]);
  const [summary, setSummary]                 = useState({ total: 0, urgent: 0, routine: 0 });
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [searchQuery, setSearchQuery]         = useState('');
  const [filterPriority, setFilterPriority]   = useState('ALL');
  const [holdPanelOpen, setHoldPanelOpen]     = useState(true);
  const [localCallCounts, setLocalCallCounts] = useState({});

  // ── Fetch Triage Queue ──────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res        = await nurseApi.getTriageQueue();
      const rawQueue   = res.data?.queue        || [];
      const rawSkipped = res.data?.skippedQueue || [];
      const rawSummary = res.data?.summary || {
        total:   rawQueue.length,
        urgent:  rawQueue.filter((a) => a.priority === 'Urgent').length,
        routine: rawQueue.filter((a) => a.priority !== 'Urgent').length,
        skipped: rawSkipped.length,
      };

      setQueue(rawQueue);
      setSummary(rawSummary);
      onQueueLoaded?.({ queue: rawQueue, skippedQueue: rawSkipped, summary: rawSummary });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load triage queue.');
    } finally {
      setLoading(false);
    }
  }, [onQueueLoaded]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshTrigger]);

  // ── Increment local call count for immediate UI feedback ────────────────────
  const handleLocalCall = useCallback((apptId) => {
    setLocalCallCounts((prev) => ({ ...prev, [apptId]: (prev[apptId] || 0) + 1 }));
  }, []);

  // ── Filtered List ───────────────────────────────────────────────────────────
  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queue.filter((appt) => {
      if (filterPriority !== 'ALL') {
        const p = appt.priority || 'Routine';
        if (p !== filterPriority) return false;
      }
      if (q) {
        const name      = (appt.patientFullName || '').toLowerCase();
        const phone     = (appt.patientId?.contactPhone || '').toLowerCase();
        const uhid      = (appt.patientId?.uhid || '').toLowerCase();
        const complaint = (appt.chiefComplaint || '').toLowerCase();
        const token     = String(appt.queueNumber || '');
        return name.includes(q) || phone.includes(q) || uhid.includes(q) || complaint.includes(q) || token.includes(q);
      }
      return true;
    });
  }, [queue, searchQuery, filterPriority]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">

      {/* ── Control Bar ─────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm">
              {queue.length}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Triage Patient Queue</h2>
              <p className="text-[11px] text-slate-400">Patients awaiting nurse vitals capture</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summary.urgent > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black border border-rose-200 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>{summary.urgent} Urgent Cases</span>
              </span>
            )}

            <button
              id="refresh-triage-queue-btn"
              onClick={fetchQueue}
              disabled={loading}
              title="Refresh queue"
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search & Filter pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, phone, complaint, token..."
              className="w-full pl-9 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800
                placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-semibold shrink-0">
            {[
              { id: 'ALL',     label: `All (${queue.length})` },
              { id: 'Urgent',  label: `Urgent (${summary.urgent})` },
              { id: 'Routine', label: `Routine (${summary.routine})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterPriority(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterPriority === tab.id
                    ? tab.id === 'Urgent'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="m-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchQueue} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="p-4 space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty Queue ──────────────────────────────────────────────────────── */}
      {!loading && queue.length === 0 && !error && (
        <div className="py-16 px-4 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl m-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-700">Triage Queue is Clear</p>
          <p className="text-xs text-slate-400 mt-0.5">
            No incoming patients awaiting vitals capture right now.
          </p>
        </div>
      )}

      {/* ── Filtered Empty ───────────────────────────────────────────────────── */}
      {!loading && queue.length > 0 && filteredQueue.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <p className="text-xs font-semibold text-slate-600">No patients matching your filter</p>
          <button
            onClick={() => { setSearchQuery(''); setFilterPriority('ALL'); }}
            className="text-xs text-teal-700 font-bold mt-1.5 underline"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Data Table ───────────────────────────────────────────────────────── */}
      {!loading && filteredQueue.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-left border-b border-slate-100">
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Token #
                </th>
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Patient Name
                </th>
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Contact Phone
                </th>
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Priority
                </th>
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Chief Complaint
                </th>
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Status
                </th>
                <th className="py-3 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredQueue.map((appt) => {
                const isSelected  = selectedAppointmentId === appt._id;
                const isUrgent    = appt.priority === 'Urgent';
                const patient     = appt.patientId;
                const localCalls  = localCallCounts[appt._id] || 0;
                const serverCalls = appt.callAttempts || 0;
                const totalCalls  = localCalls + serverCalls;

                const age = patient?.dob
                  ? Math.floor((new Date() - new Date(patient.dob)) / (1000 * 60 * 60 * 24 * 365.25))
                  : null;

                return (
                  <tr
                    key={appt._id}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-teal-50/70 border-l-4 border-teal-500'
                        : isUrgent
                        ? 'bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-rose-500'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Token # */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {appt.queueNumber ? (
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            isUrgent ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          #{appt.queueNumber}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Patient Name & Details */}
                    <td className="py-3 px-3.5 min-w-[250px]">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">
                          {appt.patientFullName}
                        </p>
                        {patient?.uhid && (
                          <div className="w-fit whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-[10px] font-bold text-violet-700 font-mono tracking-wide whitespace-nowrap">
                              <CreditCard className="w-3 h-3 text-violet-500" />
                              {patient.uhid}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-row items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                          {patient?.gender && <span>{patient.gender}</span>}
                          {patient?.gender && age !== null && <span>•</span>}
                          {age !== null && <span>{age} yrs</span>}
                          {(patient?.gender || age !== null) && patient?.bloodGroup && <span>•</span>}
                          {patient?.bloodGroup && (
                            <span className="font-semibold text-rose-600">{patient.bloodGroup}</span>
                          )}
                          {patient?.abhaId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-xs text-gray-400 truncate max-w-[130px]" title={`ABHA: ${patient.abhaId}`}>
                                ABHA: {patient.abhaId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact Phone */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                      {patient?.contactPhone || '—'}
                    </td>

                    {/* Priority / Urgency */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {appt.urgency === 'Emergency' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                          Emergency
                        </span>
                      ) : appt.urgency === 'Urgent' || appt.priority === 'Urgent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                          Urgent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                          Routine
                        </span>
                      )}
                    </td>

                    {/* Chief Complaint */}
                    <td className="py-3 px-3.5 max-w-[200px]">
                      <p className="text-xs text-slate-600 truncate" title={appt.chiefComplaint || 'No complaint notes'}>
                        {appt.chiefComplaint || <span className="text-gray-400 italic">None recorded</span>}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <StatusPill status={appt.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">

                        {/* Call button — local counter */}
                        <button
                          type="button"
                          id={`nurse-call-btn-${appt._id}`}
                          onClick={() => handleLocalCall(appt._id)}
                          title="Mark call attempt — increments badge counter"
                          className="relative inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-100 hover:bg-sky-100 text-slate-600 hover:text-sky-700 border border-slate-200 hover:border-sky-200 font-bold text-xs transition-all"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          {totalCalls > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full bg-sky-600 text-white text-[8px] font-black leading-none min-w-[14px] text-center">
                              {totalCalls}x
                            </span>
                          )}
                        </button>

                        {/* Skip / Hold button */}
                        <button
                          type="button"
                          id={`nurse-skip-btn-${appt._id}`}
                          onClick={() => onSkip?.(appt)}
                          title="Skip patient — move to On-Hold / Absent section"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-300 font-bold text-xs transition-all"
                        >
                          <ClockAlert className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Skip</span>
                        </button>

                        {/* Forward to Doctor */}
                        <button
                          type="button"
                          onClick={() => onForwardToDoctor?.(appt)}
                          title="Forward directly to Doctor queue with Urgency"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-200 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          <span>Doctor</span>
                        </button>

                        {/* Teleconsult */}
                        <button
                          type="button"
                          onClick={() => onRequestTeleconsult?.(appt)}
                          title="Request Teleconsultation with Specialist Doctor"
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            appt.status === 'Teleconsult Requested' || appt.status === 'In Teleconsult'
                              ? 'bg-purple-600 text-white border-purple-600 animate-pulse shadow-sm shadow-purple-200'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
                          }`}
                        >
                          <Video className="w-4 h-4 text-violet-600" />
                          <span className="hidden sm:inline">
                            {appt.status === 'Teleconsult Requested' ? 'Requested' : appt.status === 'In Teleconsult' ? 'Live Call' : 'Teleconsult'}
                          </span>
                        </button>

                        {/* Vitals */}
                        <button
                          type="button"
                          onClick={() => onEnterVitals?.(appt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm shadow-teal-200 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>Vitals</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer stats */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Showing <strong className="font-semibold text-slate-700">{filteredQueue.length}</strong> of{' '}
              <strong className="font-semibold text-slate-700">{queue.length}</strong> triage patients
            </span>
            <span className="text-[10px] text-slate-400">
              Prioritized by urgency &amp; arrival
            </span>
          </div>
        </div>
      )}

      {/* ── On-Hold / Absent Patients Panel (Skip & Recall) ─────────────────── */}
      <div className="border-t border-slate-100">
        {/* Collapsible header */}
        <button
          type="button"
          id="nurse-onhold-panel-toggle"
          onClick={() => setHoldPanelOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
              skippedQueue.length > 0 ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {skippedQueue.length}
            </div>
            <span className="text-xs font-extrabold text-slate-700">
              Absent / On-Hold Patients
            </span>
            {skippedQueue.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 animate-pulse">
                Waiting for Recall
              </span>
            )}
          </div>
          {holdPanelOpen
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronRight className="w-4 h-4 text-slate-400" />
          }
        </button>

        {holdPanelOpen && (
          <div className="px-4 pb-4 space-y-2">
            {skippedQueue.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2">
                No patients currently on hold.
              </p>
            ) : (
              skippedQueue.map((appt) => (
                <SkippedRow
                  key={appt._id}
                  appt={appt}
                  onRecall={onRecall}
                  onMarkNoShow={onMarkNoShow}
                />
              ))
            )}
          </div>
        )}
      </div>

    </div>
  );
}
