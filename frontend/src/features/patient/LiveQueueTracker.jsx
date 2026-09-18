import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  Stethoscope,
  Timer,
  Clock,
  BellRing,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import patientApi from '../../services/patientApi';

// Format ISO timestamp to "hh:mm AM/PM"
function formatTime(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '--:--';
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${mins} ${ampm}`;
}

export default function LiveQueueTracker({ appointment, appointmentId }) {
  const targetId = appointment?._id || appointmentId;

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const intervalRef               = useRef(null);

  const fetchQueueStatus = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = await patientApi.getQueueStatus(targetId);
      if (res.data?.success) {
        setQueueData(res.data.queueData);
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load queue status.');
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  // Initial fetch + 20-second interval per plans.md
  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    fetchQueueStatus();
    intervalRef.current = setInterval(fetchQueueStatus, 20000); // 20-second polling
    return () => clearInterval(intervalRef.current);
  }, [targetId, fetchQueueStatus]);

  if (!targetId) return null;

  // Resolve Doctor Name and Consulting Room
  const rawDoctor = queueData?.doctorName
    || appointment?.doctorName
    || appointment?.assignedDoctorId?.name
    || 'Assigned Specialist';
  const doctorName = rawDoctor.replace(/^Dr\.?\s+/i, '');
  const roomName   = appointment?.consultingRoom || appointment?.room || 'Room 3';

  // Metrics resolution
  const tokenNumber          = queueData?.tokenNumber ?? appointment?.queueNumber ?? '--';
  const currentServingToken  = queueData?.currentServingToken ?? null;
  const patientsAhead        = queueData?.patientsAhead ?? 0;
  const estimatedWaitMinutes = queueData?.estimatedWaitMinutes ?? 0;
  const expectedTime         = formatTime(queueData?.expectedCallTime);

  // Status mapping
  const rawStatus = (queueData?.status || appointment?.status || '').toUpperCase().replace(/\s+/g, '_');
  const isInConsultation = rawStatus === 'IN_CONSULTATION' || rawStatus === 'IN_CONSULT' || (queueData?.status || appointment?.status) === 'In Consultation';

  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/70 via-white to-cyan-50/70 p-5 shadow-sm mb-6">
      
      {/* ── Header Row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left side: Pulse indicator + Title + Activity */}
        <div className="flex items-center">
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
          </span>
          <span className="font-semibold text-slate-800 text-lg">
            Live OPD Queue Tracker
          </span>
          <Activity className="w-5 h-5 text-teal-600 ml-2" />
        </div>

        {/* Right side: Assigned Doctor pill badge */}
        <div className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-600 flex items-center shrink-0 self-start sm:self-auto shadow-2xs">
          <Stethoscope className="w-3.5 h-3.5 text-teal-600 mr-1.5 shrink-0" />
          <span>Dr. {doctorName} • {roomName}</span>
        </div>
      </div>

      {/* ── 3-Column Token & Progress Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 my-4">
        {/* Box 1: Your Token */}
        <div className="bg-white/80 border border-teal-100 rounded-xl p-3.5 flex flex-col items-center justify-center text-center shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Your Token</span>
          <span className="text-3xl font-black text-teal-700 mt-1">
            {tokenNumber !== '--' ? `#${tokenNumber}` : '--'}
          </span>
        </div>

        {/* Box 2: Now Serving */}
        <div className="bg-white/80 border border-teal-100 rounded-xl p-3.5 flex flex-col items-center justify-center text-center shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Currently Serving</span>
          <span className="text-3xl font-black text-slate-800 mt-1">
            {currentServingToken != null ? `#${currentServingToken}` : '--'}
          </span>
        </div>

        {/* Box 3: Ahead of You */}
        <div className="bg-white/80 border border-teal-100 rounded-xl p-3.5 flex flex-col items-center justify-center text-center shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Patients Ahead</span>
          <span className="text-3xl font-black text-indigo-600 mt-1">
            {patientsAhead}
          </span>
        </div>
      </div>

      {/* ── Dynamic Wait-Time & Action Banner ───────────────────────────────── */}
      {isInConsultation ? (
        /* Status === 'IN_CONSULTATION' */
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mr-2 shrink-0" />
          <span className="font-semibold text-sm">
            Doctor is ready. Please enter Consultation {roomName}.
          </span>
        </div>
      ) : patientsAhead <= 1 ? (
        /* Next Up Alert: patientsAhead <= 1 */
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center text-amber-900">
          <BellRing className="w-5 h-5 text-amber-600 mr-2 animate-bounce shrink-0" />
          <span className="font-semibold text-sm">
            Please be ready near {roomName}. You are next in line.
          </span>
        </div>
      ) : (
        /* Status === 'WAITING' and patientsAhead > 1 */
        <div className="bg-white/80 border border-teal-100 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center text-teal-900 font-semibold text-sm">
            <Timer className="w-5 h-5 text-teal-600 mr-2 shrink-0" />
            <span>Estimated Wait Time: ~{estimatedWaitMinutes} mins</span>
          </div>
          <div className="flex items-center text-xs font-medium text-slate-500">
            <Clock className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
            <span>Expected Call: {expectedTime}</span>
          </div>
        </div>
      )}

      {/* Subtle update note & manual refresh */}
      <div className="mt-3 pt-2 border-t border-teal-100/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Auto-syncing every 20s with live clinic queue</span>
        <button
          onClick={fetchQueueStatus}
          disabled={loading}
          className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

    </div>
  );
}