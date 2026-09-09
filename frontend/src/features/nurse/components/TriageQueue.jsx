import React, { useState, useEffect, useCallback, useMemo } from 'react';
import nurseApi from '../services/nurseApi';

// ─── Status pill ───────────────────────────────────────────────────────────────
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

export default function TriageQueue({
  selectedAppointmentId,
  onEnterVitals,
  onRequestTeleconsult,
  refreshTrigger,
  onQueueLoaded,
}) {
  const [queue, setQueue]                   = useState([]);
  const [summary, setSummary]               = useState({ total: 0, urgent: 0, routine: 0 });
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL'); // 'ALL' | 'Urgent' | 'Routine'

  // ── Fetch Triage Queue ──────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await nurseApi.getTriageQueue();
      const rawQueue = res.data?.queue || [];
      const rawSummary = res.data?.summary || {
        total: rawQueue.length,
        urgent: rawQueue.filter((a) => a.priority === 'Urgent').length,
        routine: rawQueue.filter((a) => a.priority !== 'Urgent').length,
      };

      setQueue(rawQueue);
      setSummary(rawSummary);
      onQueueLoaded?.({ queue: rawQueue, summary: rawSummary });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load triage queue.');
    } finally {
      setLoading(false);
    }
  }, [onQueueLoaded]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshTrigger]);

  // ── Filtered List ───────────────────────────────────────────────────────────
  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queue.filter((appt) => {
      if (filterPriority !== 'ALL') {
        const p = appt.priority || 'Routine';
        if (p !== filterPriority) return false;
      }
      if (q) {
        const name = (appt.patientFullName || '').toLowerCase();
        const phone = (appt.patientId?.contactPhone || '').toLowerCase();
        const complaint = (appt.chiefComplaint || '').toLowerCase();
        const token = String(appt.queueNumber || '');
        return name.includes(q) || phone.includes(q) || complaint.includes(q) || token.includes(q);
      }
      return true;
    });
  }, [queue, searchQuery, filterPriority]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      {/* ── Control Bar ───────────────────────────────────────────────────── */}
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
                <span>⚠️</span>
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
              { id: 'ALL', label: `All (${queue.length})` },
              { id: 'Urgent', label: `Urgent (${summary.urgent})` },
              { id: 'Routine', label: `Routine (${summary.routine})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterPriority(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterPriority === tab.id
                    ? tab.id === 'Urgent'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="m-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchQueue} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* ── Loading Skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div className="p-4 space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty Queue ────────────────────────────────────────────────────── */}
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

      {/* ── Filtered Empty ─────────────────────────────────────────────────── */}
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

      {/* ── Data Table ─────────────────────────────────────────────────────── */}
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
                const isSelected = selectedAppointmentId === appt._id;
                const isUrgent   = appt.priority === 'Urgent';
                const patient    = appt.patientId;

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
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-slate-900 text-xs leading-tight">
                        {appt.patientFullName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
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
                            <span className="font-semibold text-rose-600">{patient.bloodGroup}</span>
                          </>
                        )}
                        {patient?.abhaId && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-slate-400 truncate max-w-[110px]">
                              ABHA: {patient.abhaId}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Contact Phone */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                      {patient?.contactPhone || '—'}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Urgent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
                          Routine
                        </span>
                      )}
                    </td>

                    {/* Chief Complaint */}
                    <td className="py-3 px-3.5 max-w-[200px]">
                      <p className="text-xs text-slate-600 truncate" title={appt.chiefComplaint || 'No complaint notes'}>
                        {appt.chiefComplaint || <span className="text-slate-300 italic">None recorded</span>}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <StatusPill status={appt.status} />
                    </td>

                    {/* Action: Enter Vitals & Teleconsult (Prompt 16.3) */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRequestTeleconsult?.(appt)}
                          title="Request Teleconsultation with Specialist Doctor"
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            appt.status === 'Teleconsult Requested' || appt.status === 'In Teleconsult'
                              ? 'bg-purple-600 text-white border-purple-600 animate-pulse shadow-xs shadow-purple-200'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
                          }`}
                        >
                          <span>📹</span>
                          <span className="hidden sm:inline">
                            {appt.status === 'Teleconsult Requested' ? 'Requested' : appt.status === 'In Teleconsult' ? 'Live Call' : 'Teleconsult'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEnterVitals?.(appt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs shadow-teal-200 transition-colors"
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
              Prioritized by urgency & arrival
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
