import React from 'react';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  Flame,
  Video,
  FlaskConical,
} from 'lucide-react';

// ── Helper: compute elapsed time string ────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000); // minutes
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  return `${h}h ${diff % 60}m ago`;
}

// ── Triage Pill Badge ─────────────────────────────────────────────────────────
function TriagePill({ urgency }) {
  if (urgency === 'Emergency') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider">
        <Flame className="w-2.5 h-2.5" />
        Emergency
      </span>
    );
  }
  if (urgency === 'Urgent') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
        <AlertTriangle className="w-2.5 h-2.5" />
        Urgent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-medium">
      Routine
    </span>
  );
}

// ── Status Dot Pill ───────────────────────────────────────────────────────────
function StatusPill({ status }) {
  if (status === 'Patient Waiting in Room') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
        In Call
      </span>
    );
  }
  if (status === 'Teleconsult Confirmed' || status === 'Teleconsult Scheduled') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
        <Video className="w-2.5 h-2.5" />
        Virtual
      </span>
    );
  }
  if (status === 'Teleconsult Requested') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-300 animate-pulse">
        <Video className="w-2.5 h-2.5" />
        Requested
      </span>
    );
  }
  if (status === 'In Teleconsult') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        Live Call
      </span>
    );
  }
  if (status === 'Reports Ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
        <FlaskConical className="w-2.5 h-2.5" />
        Reports Ready
      </span>
    );
  }
  const isCheckedIn = status === 'CheckedIn' || status === 'Waiting for Doctor';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
      isCheckedIn
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-amber-100 text-amber-700 border-amber-200'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {isCheckedIn ? 'Ready' : 'Waiting'}
    </span>
  );
}

// ── Main PatientQueueCard Component ───────────────────────────────────────────
export default function PatientQueueCard({ appt, isSelected, onSelect }) {
  const isEmergency    = appt.urgency === 'Emergency';
  const isUrgent       = !isEmergency && (appt.urgency === 'Urgent' || appt.priority === 'Urgent');
  const isReportsReady = appt.status === 'Reports Ready';
  const isCriticalLab  = Boolean(
    appt.isCriticalLab ||
    appt.labOrders?.some((o) => o.isCritical) ||
    appt.completedLabOrder?.isCritical
  );
  const isPatientWaiting       = appt.status === 'Patient Waiting in Room';
  const isTeleconsultRequested = appt.status === 'Teleconsult Requested';
  const patient = appt.patientId || {};

  // Age
  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob)) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // Wait time from check-in or created
  const waitTime = timeAgo(appt.checkedInAt || appt.createdAt);

  // Card border style
  const cardStyle = isCriticalLab
    ? isSelected
      ? 'border-red-700 border-2 bg-gradient-to-r from-red-700 to-red-800 text-white shadow-2xl ring-4 ring-red-300'
      : 'border-red-500 border-2 bg-gradient-to-r from-red-50 to-rose-50 shadow-md ring-2 ring-red-300'
    : isSelected
    ? 'border-sky-500 bg-sky-50 shadow-sm ring-2 ring-sky-400/40'
    : isPatientWaiting
    ? 'border-emerald-500 border-l-4 bg-emerald-50/80 ring-1 ring-emerald-400 shadow-sm animate-pulse'
    : isTeleconsultRequested
    ? 'border-purple-400 border-l-4 bg-purple-50/70 ring-1 ring-purple-400/40 shadow-sm'
    : isReportsReady
    ? 'border-teal-300 border-l-4 bg-teal-50/40 hover:bg-teal-50/80'
    : isEmergency
    ? 'border-red-400 border-l-4 bg-red-50/70 hover:bg-red-50 shadow-sm'
    : isUrgent
    ? 'border-amber-300 border-l-4 bg-amber-50/60 hover:bg-amber-50'
    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70';

  const textColor = isCriticalLab && !isSelected ? 'text-slate-900' : isCriticalLab && isSelected ? 'text-white' : 'text-slate-900';

  return (
    <div
      id={`patient-queue-card-${appt._id}`}
      onClick={() => onSelect?.(appt)}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${cardStyle}`}
    >
      {/* ── Top Row: Name + Age/Gender + Triage Pill ─────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Queue number */}
          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
            isCriticalLab && isSelected ? 'bg-white/20 text-white' :
            isCriticalLab ? 'bg-red-600 text-white' :
            isPatientWaiting ? 'bg-emerald-600 text-white' :
            isEmergency ? 'bg-red-500 text-white animate-pulse' :
            isUrgent ? 'bg-amber-200 text-amber-900' :
            'bg-slate-100 text-slate-600'
          }`}>
            {appt.queueNumber ? `#${appt.queueNumber}` : '—'}
          </span>

          {/* Patient details */}
          <div className="min-w-0">
            <p className={`text-xs font-bold truncate leading-tight ${isCriticalLab && isSelected ? 'text-white' : 'text-slate-900'}`}>
              {appt.patientFullName || 'Unknown Patient'}
            </p>
            <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${isCriticalLab && isSelected ? 'text-red-100' : 'text-slate-400'}`}>
              {patient?.gender && <span className="capitalize">{patient.gender}</span>}
              {age !== null && <><span>·</span><span>{age}y</span></>}
              {patient?.uhid && (
                <span className={`font-mono px-1 rounded text-[9px] ${
                  isCriticalLab && isSelected ? 'text-red-100' : 'text-violet-600 bg-violet-50'
                }`}>
                  {patient.uhid}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Triage pill */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <TriagePill urgency={appt.urgency || appt.priority} />
          <StatusPill status={appt.status} />
        </div>
      </div>

      {/* ── Middle Row: Chief Complaint ────────────────────────────────────── */}
      {appt.chiefComplaint && (
        <p className={`text-[11px] line-clamp-1 mb-1.5 ${isCriticalLab && isSelected ? 'text-red-100' : 'text-slate-500'}`}>
          {appt.chiefComplaint}
        </p>
      )}

      {/* ── Critical Lab Badge ────────────────────────────────────────────── */}
      {isCriticalLab && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg mb-1.5 text-[10px] font-bold ${
          isSelected ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Critical Lab — Immediate Review</span>
        </div>
      )}

      {/* ── Reports Ready notice ──────────────────────────────────────────── */}
      {isReportsReady && !isCriticalLab && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg mb-1.5 text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
          <FlaskConical className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{appt.labOrders?.[0]?.testName || 'Lab Report Ready'}</span>
        </div>
      )}

      {/* ── Patient Waiting in Call notice ───────────────────────────────── */}
      {isPatientWaiting && (
        <div className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg mb-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
            Patient Waiting in Call
          </span>
          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black">LIVE</span>
        </div>
      )}

      {/* ── Teleconsult scheduled date ────────────────────────────────────── */}
      {(appt.type === 'Teleconsultation' || appt.status === 'Teleconsult Scheduled') &&
        !isPatientWaiting && !isTeleconsultRequested && appt.timeSlot && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg mb-1.5 text-[10px] text-violet-800 bg-violet-50 border border-violet-200">
          <Video className="w-3 h-3" />
          <span>{appt.timeSlot}</span>
        </div>
      )}

      {/* ── Bottom Row: Wait time + Attend button ─────────────────────────── */}
      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100/60">
        <span className={`flex items-center gap-1 text-[10px] ${isCriticalLab && isSelected ? 'text-red-100' : 'text-slate-400'}`}>
          <Clock className="w-3 h-3" />
          {waitTime || appt.timeSlot || 'Walk-in'}
        </span>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect?.(appt); }}
          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${
            isCriticalLab
              ? isSelected
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
              : isSelected
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-700 group-hover:bg-sky-100 group-hover:text-sky-700'
          }`}
        >
          Attend
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
