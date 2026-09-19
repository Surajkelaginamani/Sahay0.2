import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Helper to read the auth token from localStorage
const getToken = () =>
  localStorage.getItem('token') || localStorage.getItem('sahay_token') || '';

// ------------------------
// Sub-component: patient card in the queue
// ------------------------
function QueueCard({ appointment, onStartConsultation, onViewTimeline }) {
  const [starting, setStarting] = useState(false);
  const patient = appointment.patient || {};
  const initials = patient.name
    ? patient.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'P';

  const statusColors = {
    Waiting: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700',
    'In Progress': 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-700',
    Completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700',
  };

  const handleConsult = async () => {
    setStarting(true);
    try {
      // PATCH the appointment to "In Progress" before opening the form
      const res = await fetch(`/api/doctor/appointment/${appointment._id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      // Use the updated appointment from the server if available
      const updated = res.ok ? await res.json() : appointment;
      onStartConsultation(updated.patient || patient, updated);
    } catch {
      // Network failure — still open the form with existing data
      onStartConsultation(patient, appointment);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Token + Avatar */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text-xs text-slate-400 font-medium">#{appointment.tokenNumber ?? '—'}</span>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          {initials}
        </div>
      </div>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 truncate">{patient.name || 'Unknown'}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColors[appointment.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {appointment.status}
          </span>
        </div>
        {patient.dateOfBirth && (
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(patient.dateOfBirth).toLocaleDateString('en-IN')} &middot; {patient.gender}
          </p>
        )}
        {appointment.chiefComplaint && (
          <p className="text-xs text-slate-500 mt-1 italic truncate">"{appointment.chiefComplaint}"</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0">
        {appointment.status !== 'Completed' && (
          <button
            onClick={handleConsult}
            disabled={starting}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
          >
            {starting ? '…' : 'Consult'}
          </button>
        )}
        <button
          onClick={() => onViewTimeline(patient)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
        >
          History
        </button>
      </div>
    </div>
  );
}

// ------------------------
// Main PatientQueue component
// ------------------------
export default function PatientQueue({ onStartConsultation, onViewTimeline }) {
  const [queue, setQueue] = useState({ waiting: [], inProgress: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/doctor/queue', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error: ${res.status}`);
      }
      const data = await res.json();
      setQueue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const totalToday = queue.waiting.length + queue.inProgress.length + queue.completed.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading today's queue…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-rose-600">Failed to load queue</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={fetchQueue}
            className="mt-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
          Total today: {totalToday}
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 text-xs font-semibold">
          Waiting: {queue.waiting.length}
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-sky-100 text-sky-700 text-xs font-semibold">
          In Progress: {queue.inProgress.length}
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-700 text-xs font-semibold">
          Completed: {queue.completed.length}
        </div>
        <button
          onClick={fetchQueue}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* In Progress */}
      {queue.inProgress.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">In Progress</h2>
          <div className="space-y-3">
            {queue.inProgress.map((appt) => (
              <QueueCard
                key={appt._id}
                appointment={appt}
                onStartConsultation={onStartConsultation}
                onViewTimeline={onViewTimeline}
              />
            ))}
          </div>
        </section>
      )}

      {/* Waiting */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Waiting</h2>
        {queue.waiting.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-400">No patients waiting right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.waiting.map((appt) => (
              <QueueCard
                key={appt._id}
                appointment={appt}
                onStartConsultation={onStartConsultation}
                onViewTimeline={onViewTimeline}
              />
            ))}
          </div>
        )}
      </section>

      {/* Completed */}
      {queue.completed.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Completed Today</h2>
          <div className="space-y-3">
            {queue.completed.map((appt) => (
              <QueueCard
                key={appt._id}
                appointment={appt}
                onStartConsultation={onStartConsultation}
                onViewTimeline={onViewTimeline}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
