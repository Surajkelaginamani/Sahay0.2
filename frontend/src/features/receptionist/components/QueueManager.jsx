import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import receptionistApi from '../services/receptionistApi';

// ─── Status badge config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Scheduled:  { label: 'Scheduled',   dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-700 border-sky-200' },
  CheckedIn:  { label: 'Checked In',  dot: 'bg-amber-500 animate-pulse', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  Completed:  { label: 'Completed',   dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled:  { label: 'Cancelled',   dot: 'bg-slate-400',   pill: 'bg-slate-50  text-slate-500  border-slate-200' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function QueueBadge({ number }) {
  if (!number) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100 text-amber-800 text-sm font-extrabold border-2 border-amber-300 shadow-sm">
      {number}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 bg-slate-100 rounded-xl" />
      ))}
    </div>
  );
}

// ─── QueueManager ──────────────────────────────────────────────────────────────
export default function QueueManager({ onCheckInSuccess, refreshTrigger }) {
  const [queue, setQueue]           = useState([]);
  const [summary, setSummary]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [checkingIn, setCheckingIn] = useState(null); // appointmentId being processed
  const [filterStatus, setFilter]   = useState('ALL');
  const [error, setError]           = useState('');

  // ── Fetch today's queue ──────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const statusParam = filterStatus !== 'ALL' ? filterStatus : undefined;
      const res = await receptionistApi.getTodayQueue(statusParam);
      setQueue(res.data.queue || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load today\'s queue.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchQueue(); }, [fetchQueue, refreshTrigger]);

  // ── Check-in handler ─────────────────────────────────────────────────────
  const handleCheckIn = async (appointmentId, patientName) => {
    setCheckingIn(appointmentId);
    try {
      const res = await receptionistApi.checkIn(appointmentId);
      const updated = res.data.appointment;
      // Optimistically update the row in state
      setQueue((prev) =>
        prev.map((appt) =>
          appt._id === appointmentId
            ? { ...appt, status: 'CheckedIn', queueNumber: updated.queueNumber }
            : appt
        )
      );
      setSummary((prev) => ({
        ...prev,
        scheduled: Math.max(0, (prev.scheduled || 1) - 1),
        checkedIn: (prev.checkedIn || 0) + 1,
      }));
      onCheckInSuccess?.({
        patientName,
        queueNumber: updated.queueNumber,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed. Please try again.');
    } finally {
      setCheckingIn(null);
    }
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const FILTERS = [
    { key: 'ALL',       label: 'All',        count: summary.total     },
    { key: 'Scheduled', label: 'Scheduled',  count: summary.scheduled },
    { key: 'CheckedIn', label: 'Checked In', count: summary.checkedIn },
    { key: 'Completed', label: 'Completed',  count: summary.completed },
    { key: 'Cancelled', label: 'Cancelled',  count: summary.cancelled },
  ];

  return (
    <div className="space-y-4">

      {/* ── Summary strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: summary.total,     color: 'text-slate-800', bg: 'bg-slate-50',    border: 'border-slate-200' },
          { label: 'Urgent',    value: queue.filter((a) => a.priority === 'Urgent').length, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
          { label: 'Checked In',value: summary.checkedIn, color: 'text-amber-700', bg: 'bg-amber-50',    border: 'border-amber-200' },
          { label: 'Completed', value: summary.completed, color: 'text-emerald-700',bg:'bg-emerald-50', border: 'border-emerald-200' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-extrabold ${color}`}>{value ?? '—'}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter pills + refresh ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all
                ${filterStatus === key
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {label}
              {count !== undefined && (
                <span className="ml-1 opacity-70">({count ?? 0})</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
        {loading ? (
          <Skeleton />
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <svg className="w-12 h-12 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-semibold text-slate-500">No appointments for today</p>
            <p className="text-xs text-slate-400">
              {filterStatus !== 'ALL' ? `No "${filterStatus}" appointments found.` : 'Use the form to schedule an appointment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-14">Q#</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Visit</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Doctor</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {queue.map((appt, idx) => {
                  const patient    = appt.patientId;
                  const fullName   = appt.patientFullName || (patient ? `${patient.firstName} ${patient.lastName}` : '—');
                  const phone      = patient?.contactPhone || '—';
                  const gender     = patient?.gender       || '';
                  const doctor     = appt.assignedDoctorId?.name || '—';
                  const isChecking = checkingIn === appt._id;

                  return (
                    <tr
                      key={appt._id}
                      className={`transition-colors
                        ${appt.priority === 'Urgent'
                          ? 'bg-rose-50/80 hover:bg-rose-100/60 border-l-4 border-rose-400'
                          : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/30 hover:bg-slate-100/50'}`}
                    >
                      {/* Queue number */}
                      <td className="px-4 py-3.5">
                        <QueueBadge number={appt.queueNumber} />
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                            ${gender === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'}`}>
                            {fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800 truncate">{fullName}</p>
                              {appt.priority === 'Urgent' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold border border-rose-200">
                                  <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Visit */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-xs font-medium text-slate-700">{appt.visitType || '—'}</p>
                        {appt.chiefComplaint && (
                          <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{appt.chiefComplaint}</p>
                        )}
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-slate-600">{doctor}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={appt.status} />
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right">
                        {appt.status === 'Scheduled' && (
                          <button
                            onClick={() => handleCheckIn(appt._id, fullName)}
                            disabled={isChecking}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-bold
                              hover:bg-amber-600 transition-colors shadow-sm shadow-amber-200 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isChecking ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            Check In
                          </button>
                        )}
                        {appt.status === 'CheckedIn' && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                            In Queue #{appt.queueNumber}
                          </span>
                        )}
                        {appt.status === 'Completed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <Check className="w-3 h-3" /> Done
                          </span>
                        )}
                        {appt.status === 'Cancelled' && (
                          <span className="text-[11px] text-slate-400">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
