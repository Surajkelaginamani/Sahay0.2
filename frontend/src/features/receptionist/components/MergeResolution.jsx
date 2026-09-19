import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Smartphone, AlertTriangle } from 'lucide-react';
import receptionistApi from '../services/receptionistApi';

// ─── Small helpers ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 break-words">{value}</span>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── ConflictCard ──────────────────────────────────────────────────────────────
function ConflictCard({ conflict, onResolved }) {
  const [resolving, setResolving] = useState(null); // 'merge' | 'create_new'
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const existing  = conflict.potentialMatchPatientId;
  const incoming  = conflict.incomingData || {};

  const handleAction = async (action) => {
    setResolving(action);
    setError('');
    setSuccess('');
    try {
      const res = await receptionistApi.resolveConflict(conflict._id, action);
      setSuccess(res.data.message || 'Resolved successfully.');
      setTimeout(() => onResolved(conflict._id), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve conflict. Please try again.');
      setResolving(null);
    }
  };

  const incomingName = `${incoming.firstName || ''} ${incoming.lastName || ''}`.trim() || 'Unknown';
  const existingName = existing
    ? `${existing.firstName || ''} ${existing.lastName || ''}`.trim()
    : 'Unknown';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ── Conflict header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border-b border-amber-200">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-amber-900">Potential Duplicate Detected</p>
          <p className="text-[11px] text-amber-700">
            Received {formatDate(conflict.createdAt)} · Conflict #{conflict._id.slice(-6).toUpperCase()}
          </p>
        </div>
      </div>

      {/* ── Side-by-side comparison ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">

        {/* Left: Existing DB record */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-black uppercase tracking-wider border border-sky-200">
              <CheckCircle2 className="w-3 h-3" /> Existing Record (DB)
            </span>
          </div>
          {existing ? (
            <div className="space-y-3">
              <InfoRow label="Full Name"   value={existingName} />
              <InfoRow label="UHID"        value={existing.uhid} />
              <InfoRow label="Phone"       value={existing.contactPhone} />
              <InfoRow label="Date of Birth" value={formatDate(existing.dob)} />
              <InfoRow label="Gender"      value={existing.gender} />
              <InfoRow label="ABHA ID"     value={existing.abhaId} />
              {existing.address && (
                <InfoRow
                  label="Address"
                  value={[existing.address.village, existing.address.district, existing.address.state].filter(Boolean).join(', ')}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Existing record details unavailable.</p>
          )}
        </div>

        {/* Right: Incoming ASHA sync data */}
        <div className="p-5 space-y-3 bg-amber-50/40">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200">
              <Smartphone className="w-3 h-3" /> Incoming ASHA Sync
            </span>
          </div>
          <div className="space-y-3">
            <InfoRow label="Full Name"   value={incomingName} />
            <InfoRow label="Phone"       value={incoming.contactPhone || incoming.phone} />
            <InfoRow label="Date of Birth" value={incoming.dob ? formatDate(incoming.dob) : '—'} />
            <InfoRow label="Gender"      value={incoming.gender} />
            <InfoRow label="ABHA ID"     value={incoming.abhaId} />
            {incoming.address && (
              <InfoRow
                label="Address"
                value={typeof incoming.address === 'object'
                  ? [incoming.address.village, incoming.address.district, incoming.address.state].filter(Boolean).join(', ')
                  : incoming.address}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-5 py-4 bg-slate-50 border-t border-slate-100">
        {/* Merge button */}
        <button
          type="button"
          onClick={() => handleAction('merge')}
          disabled={!!resolving}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-sky-200"
        >
          {resolving === 'merge' ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
          Merge (Keep Existing ID)
        </button>

        {/* Create as new button */}
        <button
          type="button"
          onClick={() => handleAction('create_new')}
          disabled={!!resolving}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
        >
          {resolving === 'create_new' ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 4v16m8-8H4" />
            </svg>
          )}
          Create as New Patient
        </button>

        {/* Dismiss info */}
        <p className="text-[10px] text-slate-400 sm:w-40 text-center sm:text-right leading-tight">
          Both actions will clear this conflict from the queue.
        </p>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold flex items-center gap-1.5">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          {success}
        </div>
      )}
    </div>
  );
}

// ─── MergeResolution (main) ────────────────────────────────────────────────────
export default function MergeResolution() {
  const [conflicts, setConflicts] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await receptionistApi.getPendingConflicts();
      setConflicts(res.data.conflicts || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conflict records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  // Remove a resolved conflict from local state
  const handleResolved = useCallback((id) => {
    setConflicts((prev) => prev.filter((c) => c._id !== id));
  }, []);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm">
              <AlertTriangle className="w-4 h-4" />
            </span>
            Data Conflict Resolution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 ml-10">
            Review flagged duplicate records from offline ASHA sync. Merge or create as new patient.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchConflicts}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200
            text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────── */}
      {loading && conflicts.length === 0 && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && conflicts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
          <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-semibold">All clear! No pending conflicts.</p>
          <p className="text-xs mt-1 text-slate-300">
            Offline ASHA syncs with no duplicates go straight into the patient database.
          </p>
        </div>
      )}

      {/* ── Conflict list ─────────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} pending review
          </p>
          {conflicts.map((c) => (
            <ConflictCard key={c._id} conflict={c} onResolved={handleResolved} />
          ))}
        </div>
      )}
    </div>
  );
}
