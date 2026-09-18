import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  RefreshCw,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Power,
  Users,
} from 'lucide-react';
import receptionistApi from '../services/receptionistApi';

export default function DoctorsDutyCard({ className = '', onDoctorSelect, selectedDoctorId }) {
  const [doctors, setDoctors]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [offDutyOpen, setOffDutyOpen] = useState(false);

  const fetchDoctorStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await receptionistApi.getDoctorsDutyStatus();
      setDoctors(res.data.doctors || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch doctor duty status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctorStatus();
    // Auto-poll every 30 seconds for live updates
    const timer = setInterval(fetchDoctorStatus, 30000);
    return () => clearInterval(timer);
  }, [fetchDoctorStatus]);

  const activeDoctors  = doctors.filter((d) => d.isOnDuty);
  const offDutyDoctors = doctors.filter((d) => !d.isOnDuty);

  const getInitials = (name = '') => {
    return name
      .replace(/^Dr\.?\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DR';
  };

  const PALETTE = [
    { bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-200' },
    { bg: 'bg-sky-50',    text: 'text-sky-700',    ring: 'ring-sky-200' },
    { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
    { bg: 'bg-emerald-50',text: 'text-emerald-700',ring: 'ring-emerald-200' },
  ];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center text-xs font-black text-slate-800 tracking-tight">
          <Stethoscope className="w-4 h-4 text-teal-600 mr-2" />
          Doctors on Duty
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse mr-1.5" />
            {activeDoctors.length} Active
          </span>

          <button
            type="button"
            onClick={fetchDoctorStatus}
            disabled={loading}
            title="Refresh doctor duty status"
            className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Error notice */}
        {error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5">
            {error}
          </p>
        )}

        {/* ── Active Doctors ("Available for OPD") ─────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Available for OPD ({activeDoctors.length})
            </span>
          </div>

          {activeDoctors.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-center space-y-1">
              <Power className="w-5 h-5 text-amber-500 mx-auto opacity-70" />
              <p className="text-xs font-bold text-amber-800">No Doctors Currently On Duty</p>
              <p className="text-[10px] text-amber-600 leading-relaxed">
                Hospital doctors have not toggled "On Duty". Walk-in appointments will queue until a doctor clocks in.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeDoctors.map((doc, idx) => {
                const palette = PALETTE[idx % PALETTE.length];
                const initials = getInitials(doc.name);
                const isSelected = selectedDoctorId && String(selectedDoctorId) === String(doc._id);

                return (
                  <div
                    key={doc._id}
                    onClick={() => onDoctorSelect && onDoctorSelect(doc)}
                    className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border transition-all ${
                      onDoctorSelect ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-300 ring-1 ring-teal-200'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Avatar & info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${palette.bg} ${palette.text} ring-1 ${palette.ring}`}
                        >
                          {initials}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-300 shadow-xs" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                          {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {doc.specialty || doc.department || 'OPD Specialist'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {doc.activeQueueCount === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1 text-amber-600" />
                          {doc.activeQueueCount} in Queue
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Collapsible Off-Duty Section ─────────────────────────────────── */}
        {offDutyDoctors.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              id="toggle-off-duty-doctors-btn"
              onClick={() => setOffDutyOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Power className="w-3 h-3 text-slate-400" />
                Off Duty ({offDutyDoctors.length} Doctor{offDutyDoctors.length > 1 ? 's' : ''})
              </span>
              {offDutyOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {offDutyOpen && (
              <div className="mt-2 space-y-1 animate-in fade-in duration-150">
                {offDutyDoctors.map((doc) => (
                  <div
                    key={doc._id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-slate-400"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-200/70 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {getInitials(doc.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-600 truncate leading-tight">
                          {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {doc.specialty || doc.department || 'Inactive'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                      Off Duty
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
