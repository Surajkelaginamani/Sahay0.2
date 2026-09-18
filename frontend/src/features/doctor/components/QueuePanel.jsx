import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Stethoscope,
  RefreshCw,
  Search,
  AlertTriangle,
  Flame,
  Filter,
  Video,
  FlaskConical,
  Users,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import doctorApi from '../services/doctorApi';
import PatientQueueCard from './PatientQueueCard';

// ─── Metric strip item ────────────────────────────────────────────────────────
function MetricChip({ label, value, color = 'slate' }) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-700',
    red:   'bg-red-100 text-red-700',
    green: 'bg-emerald-100 text-emerald-700',
    teal:  'bg-teal-100 text-teal-700',
    violet:'bg-violet-100 text-violet-700',
  };
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${colorMap[color]}`}>
      <span className="text-base font-black leading-tight">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}

// ─── Priority filter pill ─────────────────────────────────────────────────────
const PRIORITY_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'Emergency', label: 'Emergency' },
  { id: 'Urgent', label: 'Urgent' },
  { id: 'Routine', label: 'Routine' },
];

export default function QueuePanel({
  selectedAppointmentId,
  onSelectPatient,
  refreshTrigger,
  onQueueLoaded,
  completedCount = 0,
}) {
  const [queue, setQueue]                   = useState([]);
  const [activeQueue, setActiveQueue]       = useState([]);
  const [reviewQueue, setReviewQueue]       = useState([]);
  const [teleconsultQueue, setTeleconsultQueue] = useState([]);
  const [summary, setSummary]               = useState({ total: 0, emergency: 0, urgent: 0, waiting: 0, checkedIn: 0, active: 0, reportsReady: 0, teleconsults: 0, criticalLabs: 0 });
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [queueTab, setQueueTab]             = useState('ALL');

  // Accordion toggles
  const [showReportsReady, setShowReportsReady] = useState(true);
  const [showOngoing, setShowOngoing]           = useState(true);
  const [showTeleconsult, setShowTeleconsult]   = useState(true);

  // ── Fetch Queue ─────────────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await doctorApi.getQueue();
      const rawActive = res.data?.activeQueue || (res.data?.queue || []).filter(
        (a) => a.status !== 'Reports Ready' && a.type !== 'Teleconsultation'
      );
      const rawReview = res.data?.reviewQueue || (res.data?.queue || []).filter(
        (a) => a.status === 'Reports Ready'
      );

      // Sort critical labs to top
      rawReview.sort((a, b) => {
        const aCrit = a.isCriticalLab || a.labOrders?.some((o) => o.isCritical) ? 1 : 0;
        const bCrit = b.isCriticalLab || b.labOrders?.some((o) => o.isCritical) ? 1 : 0;
        return bCrit - aCrit;
      });

      const rawTeleconsult = res.data?.teleconsultQueue || (res.data?.queue || []).filter((a) =>
        a.type === 'Teleconsultation' &&
        ['Teleconsult Confirmed', 'Patient Waiting in Room', 'In Teleconsult', 'Teleconsult Scheduled', 'Teleconsult Requested'].includes(a.status)
      );

      rawTeleconsult.sort((a, b) => {
        const aW = a.status === 'Patient Waiting in Room';
        const bW = b.status === 'Patient Waiting in Room';
        if (aW && !bW) return -1;
        if (!aW && bW) return 1;
        return new Date(a.scheduledDate || a.createdAt) - new Date(b.scheduledDate || b.createdAt);
      });

      const rawQueue   = res.data?.queue || [...rawActive, ...rawReview, ...rawTeleconsult];
      const criticalLabCount = rawQueue.filter(
        (a) => a.isCriticalLab || a.labOrders?.some((o) => o.isCritical)
      ).length;

      const rawSummary = res.data?.summary || {
        total: rawQueue.length,
        active: rawActive.length,
        reportsReady: rawReview.length,
        teleconsults: rawTeleconsult.length,
        emergency: rawQueue.filter((a) => a.urgency === 'Emergency').length,
        urgent: rawQueue.filter((a) => a.urgency === 'Urgent' || (a.priority === 'Urgent' && a.urgency !== 'Emergency')).length,
        routine: rawQueue.filter((a) => !a.urgency || a.urgency === 'Routine').length,
        checkedIn: rawQueue.filter((a) => a.status === 'CheckedIn').length,
        waiting: rawQueue.filter((a) => a.status === 'Waiting').length,
        criticalLabs: criticalLabCount,
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

  useEffect(() => { fetchQueue(); }, [fetchQueue, refreshTrigger]);

  // ── Filter helper ────────────────────────────────────────────────────────────
  const filterList = useCallback((list) => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((appt) => {
      if (filterPriority === 'Emergency' && appt.urgency !== 'Emergency') return false;
      if (filterPriority === 'Urgent' && appt.urgency !== 'Urgent' && (appt.priority !== 'Urgent' || appt.urgency === 'Emergency')) return false;
      if (filterPriority === 'Routine' && (appt.urgency === 'Emergency' || appt.urgency === 'Urgent' || appt.priority === 'Urgent')) return false;
      if (q) {
        const name = (appt.patientFullName || '').toLowerCase();
        const uhid = (appt.patientId?.uhid || '').toLowerCase();
        const complaint = (appt.chiefComplaint || '').toLowerCase();
        return name.includes(q) || uhid.includes(q) || complaint.includes(q);
      }
      return true;
    });
  }, [searchQuery, filterPriority]);

  const filteredActive      = useMemo(() => filterList(activeQueue), [filterList, activeQueue]);
  const filteredReview      = useMemo(() => filterList(reviewQueue), [filterList, reviewQueue]);
  const filteredTeleconsult = useMemo(() => filterList(teleconsultQueue), [filterList, teleconsultQueue]);
  const totalFiltered       = filteredActive.length + filteredReview.length + filteredTeleconsult.length;

  const visibleActive      = (queueTab === 'ALL' || queueTab === 'ONGOING') ? filteredActive : [];
  const visibleReview      = (queueTab === 'ALL' || queueTab === 'REPORTS') ? filteredReview : [];
  const visibleTeleconsult = (queueTab === 'ALL' || queueTab === 'TELECONSULT') ? filteredTeleconsult : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Patient Queue</h2>
              <p className="text-[10px] text-slate-400">OPD Triage · Today</p>
            </div>
          </div>

          <button
            id="refresh-doctor-queue-btn"
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            title="Refresh queue"
            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* Metric strip */}
        <div className="flex items-center gap-2">
          <MetricChip label="Waiting" value={summary.total || 0} color="slate" />
          <MetricChip
            label="Critical"
            value={summary.criticalLabs || summary.emergency || 0}
            color={(summary.criticalLabs || summary.emergency) > 0 ? 'red' : 'slate'}
          />
          <MetricChip label="Done Today" value={completedCount} color="green" />
          {summary.reportsReady > 0 && (
            <MetricChip label="Reports" value={summary.reportsReady} color="teal" />
          )}
        </div>

        {/* Queue section tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5 text-[10px] font-bold">
          {[
            { id: 'ALL', label: `All (${queue.length})` },
            { id: 'ONGOING', label: `Queue (${activeQueue.length})` },
            { id: 'REPORTS', label: `Reports (${reviewQueue.length})`, accent: reviewQueue.length > 0 ? 'teal' : null },
            { id: 'TELECONSULT', label: `Virtual (${teleconsultQueue.length})`, accent: teleconsultQueue.length > 0 ? 'violet' : null },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQueueTab(tab.id)}
              className={`relative flex-1 py-1.5 rounded-lg transition-all text-center ${
                queueTab === tab.id
                  ? tab.accent === 'teal'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : tab.accent === 'violet'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white text-slate-900 shadow-sm'
                  : tab.accent === 'teal'
                  ? 'text-teal-700 hover:text-teal-900'
                  : tab.accent === 'violet'
                  ? 'text-violet-700 hover:text-violet-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              {/* Ping dot for unread */}
              {tab.id === 'REPORTS' && reviewQueue.length > 0 && queueTab !== 'REPORTS' && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
              )}
              {tab.id === 'TELECONSULT' && teleconsultQueue.some((a) => a.status === 'Patient Waiting in Room') && queueTab !== 'TELECONSULT' && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          ))}
        </div>

        {/* Search + Priority filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, UHID, complaint..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Priority pill filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterPriority(f.id)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                  filterPriority === f.id
                    ? f.id === 'Emergency'
                      ? 'bg-red-600 text-white'
                      : f.id === 'Urgent'
                      ? 'bg-amber-400 text-amber-950'
                      : f.id === 'Routine'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.id === 'Emergency' && <Flame className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
                {f.label}
                {f.id !== 'ALL' && summary[f.id.toLowerCase()] > 0 && (
                  <span className="ml-1 opacity-70">({summary[f.id.toLowerCase()] || 0})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchQueue} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* ── Queue Body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty: no patients */}
        {!loading && queue.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-teal-400" />
            </div>
            <p className="text-xs font-bold text-slate-700">Queue is Clear</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No waiting patients right now.</p>
          </div>
        )}

        {/* Filtered empty */}
        {!loading && queue.length > 0 && totalFiltered === 0 && (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-semibold">No matching patients</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterPriority('ALL'); setQueueTab('ALL'); }}
              className="text-[11px] text-teal-600 font-bold mt-1 underline"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ── SECTION: Reports Ready ─────────────────────────────────────── */}
        {!loading && visibleReview.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowReportsReady((v) => !v)}
              className="flex items-center justify-between w-full px-1 group"
            >
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-teal-800">
                <FlaskConical className="w-3.5 h-3.5" />
                Reports Ready
                <span className="px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[10px]">{visibleReview.length}</span>
              </span>
              {showReportsReady
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {showReportsReady && (
              <div className="space-y-2">
                {visibleReview.map((appt) => (
                  <PatientQueueCard
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

        {/* Empty: Reports tab selected but none */}
        {!loading && queueTab === 'REPORTS' && filteredReview.length === 0 && (
          <div className="p-8 text-center border border-dashed border-teal-200 rounded-2xl bg-teal-50/30">
            <FlaskConical className="w-8 h-8 text-teal-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-teal-900">No Reports Ready</p>
            <p className="text-[11px] text-teal-600 mt-0.5">Lab reports appear here once uploaded by Lab Head.</p>
          </div>
        )}

        {/* ── SECTION: Ongoing Queue ────────────────────────────────────── */}
        {!loading && (queueTab === 'ALL' || queueTab === 'ONGOING') && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowOngoing((v) => !v)}
              className="flex items-center justify-between w-full px-1 group"
            >
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
                <Users className="w-3.5 h-3.5" />
                Ongoing Queue
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px]">{filteredActive.length}</span>
              </span>
              {showOngoing
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {showOngoing && (
              <div className="space-y-2">
                {filteredActive.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-600">No active patients</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">All consultations complete.</p>
                  </div>
                ) : (
                  filteredActive.map((appt) => (
                    <PatientQueueCard
                      key={appt._id}
                      appt={appt}
                      isSelected={selectedAppointmentId === appt._id}
                      onSelect={onSelectPatient}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION: Teleconsultations ────────────────────────────────── */}
        {!loading && visibleTeleconsult.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowTeleconsult((v) => !v)}
              className="flex items-center justify-between w-full px-1 group"
            >
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-violet-800">
                <Video className="w-3.5 h-3.5" />
                Virtual OPD
                <span className="px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px]">{visibleTeleconsult.length}</span>
              </span>
              {showTeleconsult
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {showTeleconsult && (
              <div className="space-y-2">
                {filteredTeleconsult.map((appt) => (
                  <PatientQueueCard
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

        {/* Empty: Teleconsult tab selected but none */}
        {!loading && queueTab === 'TELECONSULT' && filteredTeleconsult.length === 0 && (
          <div className="p-8 text-center border border-dashed border-violet-200 rounded-2xl bg-violet-50/30">
            <Video className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-violet-900">No Teleconsults</p>
            <p className="text-[11px] text-violet-600 mt-0.5">Virtual OPD sessions appear once confirmed by receptionist.</p>
          </div>
        )}
      </div>
    </div>
  );
}
