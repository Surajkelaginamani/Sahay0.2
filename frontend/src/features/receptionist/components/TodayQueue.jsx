import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle2, RotateCw, Key } from 'lucide-react';
import receptionistApi from '../services/receptionistApi';
import PatientProfileDrawer from './PatientProfileDrawer';

// ─── Status pill ───────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  Waiting:   'bg-amber-100 text-amber-700 border-amber-200',
  Scheduled: 'bg-sky-100 text-sky-700 border-sky-200',
  CheckedIn: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Completed: 'bg-slate-100 text-slate-500 border-slate-200',
  Cancelled: 'bg-rose-100 text-rose-600 border-rose-200',
};

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

// ─── TodayQueue ───────────────────────────────────────────────────────────────
export default function TodayQueue({ refreshTrigger, onCheckInSuccess }) {
  const [appointments, setAppointments]     = useState([]);
  const [doctors, setDoctors]               = useState([]);
  const [doctorsMap, setDoctorsMap]         = useState({}); // { [doctorId]: doctorName }
  const [filterDoctorId, setFilterDoctorId] = useState('ALL');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [checkingIn, setCheckingIn]         = useState({}); // { [apptId]: true }
  const [selectedProfilePatient, setSelectedProfilePatient] = useState(null);

  // ── Fetch facility doctors ────────────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await receptionistApi.getFacilityDoctors();
      const docs = res.data.doctors || [];
      setDoctors(docs);
      const map = {};
      docs.forEach((d) => {
        map[d._id] = d.name;
      });
      setDoctorsMap(map);
    } catch {
      // Non-critical, fallback to populated names
    }
  }, []);

  // ── Fetch today's queue via getFacilityPatients?today=true ─────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await receptionistApi.getFacilityPatients(true); // today=true
      setAppointments(res.data.appointments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load today\'s queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch queue and doctors on mount and whenever refreshTrigger changes
  useEffect(() => {
    fetchDoctors();
    fetchQueue();
  }, [fetchDoctors, fetchQueue, refreshTrigger]);

  // ── Check-in handler ───────────────────────────────────────────────────────
  const handleCheckIn = useCallback(async (appt) => {
    setCheckingIn((s) => ({ ...s, [appt._id]: true }));
    try {
      const res = await receptionistApi.checkIn(appt._id);
      const qNum = res.data.appointment?.queueNumber;
      const name = appt.patientFullName || 'Patient';
      onCheckInSuccess?.({ patientName: name, queueNumber: qNum });
      // Refresh list
      await fetchQueue();
    } catch (err) {
      // Show inline error for 3s
      setError(err.response?.data?.message || 'Check-in failed.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setCheckingIn((s) => ({ ...s, [appt._id]: false }));
    }
  }, [fetchQueue, onCheckInSuccess]);

  // ── Helper to resolve doctor name ──────────────────────────────────────────
  const getDoctorName = (appt) => {
    if (appt.doctorName) return appt.doctorName;
    if (appt.assignedDoctorId && typeof appt.assignedDoctorId === 'object' && appt.assignedDoctorId.name) {
      return appt.assignedDoctorId.name;
    }
    const docId = typeof appt.assignedDoctorId === 'object' ? appt.assignedDoctorId?._id : appt.assignedDoctorId;
    if (docId && doctorsMap[docId]) {
      return doctorsMap[docId];
    }
    return null;
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // ── Filtered list by doctor ────────────────────────────────────────────────
  const displayedAppointments = appointments.filter((appt) => {
    if (filterDoctorId === 'ALL') return true;
    const docId = typeof appt.assignedDoctorId === 'object' ? appt.assignedDoctorId?._id : appt.assignedDoctorId;
    return docId === filterDoctorId;
  });

  return (
    <div className="space-y-4">

      {/* ── Summary badges & Controls ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total',      val: appointments.length, color: 'bg-slate-100 text-slate-700' },
            { label: 'Emergency',  val: appointments.filter((a) => a.urgency === 'Emergency').length, color: 'bg-red-600 text-white' },
            { label: 'Urgent',     val: appointments.filter((a) => a.urgency === 'Urgent' || (a.priority === 'Urgent' && a.urgency !== 'Emergency')).length, color: 'bg-amber-100 text-amber-900 border border-amber-300' },
            { label: 'Waiting',    val: counts.Waiting   || 0, color: 'bg-amber-50 text-amber-800' },
            { label: 'Checked In', val: counts.CheckedIn || 0, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Completed',  val: counts.Completed || 0, color: 'bg-violet-100 text-violet-700' },
          ].map(({ label, val, color }) => (
            <div key={label} className={`${color} px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5`}>
              <span className="text-base leading-none">{val}</span>
              <span className="opacity-70">{label}</span>
            </div>
          ))}
        </div>

        {/* Doctor filter & Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          {doctors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-doctor-select" className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Doctor:
              </label>
              <select
                id="filter-doctor-select"
                value={filterDoctorId}
                onChange={(e) => setFilterDoctorId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700
                  focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
              >
                <option value="ALL">All Doctors ({appointments.length})</option>
                {doctors.map((doc) => {
                  const docCount = appointments.filter((a) => {
                    const id = typeof a.assignedDoctorId === 'object' ? a.assignedDoctorId?._id : a.assignedDoctorId;
                    return id === doc._id;
                  }).length;
                  return (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} ({docCount})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <button
            id="refresh-queue-btn"
            onClick={fetchQueue}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold
              text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50
              flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && appointments.length === 0 && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && displayedAppointments.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-14 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
          <svg className="w-12 h-12 mb-3 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-semibold">
            {filterDoctorId !== 'ALL' ? 'No patients in queue for this doctor' : 'No patients in queue today'}
          </p>
          <p className="text-xs mt-0.5 text-slate-300">
            {filterDoctorId !== 'ALL' ? 'Try selecting "All Doctors"' : 'Register or search patients to assign them'}
          </p>
        </div>
      )}

      {/* ── Queue table ──────────────────────────────────────────────────── */}
      {displayedAppointments.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left">
                {['#', 'Patient', 'Phone', 'Priority / Urgency', 'Assigned Doctor', 'Status', 'Time', 'Action'].map((h) => (
                  <th key={h} className="pb-2.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedAppointments.map((appt) => {
                const isCheckinable = ['Waiting', 'Scheduled'].includes(appt.status);
                const isLoading     = checkingIn[appt._id];
                const docName       = getDoctorName(appt);
                const isEmergency   = appt.urgency === 'Emergency';
                const isUrgent      = !isEmergency && (appt.urgency === 'Urgent' || appt.priority === 'Urgent');

                return (
                  <tr
                    key={appt._id}
                    className={`transition-colors group
                      ${isEmergency
                        ? 'bg-red-50/80 hover:bg-red-100/70 border-l-4 border-red-600 ring-1 ring-red-200'
                        : isUrgent
                        ? 'bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-amber-400'
                        : 'hover:bg-slate-50/60'}`}
                  >
                    {/* Queue number */}
                    <td className="py-3 px-2">
                      {appt.queueNumber ? (
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm ${
                            isEmergency
                              ? 'bg-red-600 text-white shadow-xs animate-pulse'
                              : isUrgent
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {appt.queueNumber}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                          {isEmergency ? <AlertTriangle className="w-4 h-4 text-red-600" /> : '—'}
                        </div>
                      )}
                    </td>

                    {/* Patient name */}
                    <td className="py-3 px-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProfilePatient(
                            appt.patientId
                              ? { ...appt.patientId, fullName: appt.patientFullName }
                              : { fullName: appt.patientFullName }
                          )
                        }
                        className="font-semibold text-slate-800 hover:text-amber-700 text-sm leading-tight text-left hover:underline flex items-center gap-1.5 cursor-pointer"
                        title="Click to view profile & reset PIN"
                      >
                        <span>{appt.patientFullName}</span>
                        <Key className="w-3 h-3 text-slate-300 group-hover:text-amber-500" />
                      </button>
                      {/* UHID (Prompt 1.2) */}
                      {appt.patientId?.uhid && (
                        <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-[9px] font-bold text-violet-700 font-mono tracking-wide">
                          ID: {appt.patientId.uhid}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span>{appt.patientId?.gender || ''}</span>
                        {appt.patientId?.dob && (
                          <>
                            <span>·</span>
                            <span>{new Date(appt.patientId.dob).toLocaleDateString('en-IN')}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap">
                      {appt.patientId?.contactPhone || '—'}
                    </td>

                    {/* Priority / Urgency Badge (Prompt 4.3) */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      {appt.urgency === 'Emergency' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-white" />
                          Emergency
                        </span>
                      ) : appt.urgency === 'Urgent' || appt.priority === 'Urgent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Urgent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                          Routine
                        </span>
                      )}
                    </td>

                    {/* Assigned Doctor (Prompt 4.9 Requirement) */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      {docName ? (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-violet-50 border border-violet-100">
                          <div className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                            Dr
                          </div>
                          <div>
                            <p className="font-bold text-violet-950 text-xs leading-none">
                              {docName.startsWith('Dr.') ? docName : `Dr. ${docName}`}
                            </p>
                            <p className="text-[10px] text-violet-500 leading-tight mt-0.5 font-medium">
                              Consulting Room
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-400 bg-slate-100">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      <StatusPill status={appt.status} />
                    </td>

                    {/* Appointment time */}
                    <td className="py-3 px-2 text-[11px] text-slate-400 whitespace-nowrap">
                      {appt.appointmentDate
                        ? new Date(appt.appointmentDate).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit', hour12: true,
                          })
                        : '—'}
                    </td>

                    {/* Check-in action */}
                    <td className="py-3 px-2 whitespace-nowrap">
                      {isCheckinable ? (
                        <button
                          id={`checkin-${appt._id}`}
                          type="button"
                          onClick={() => handleCheckIn(appt)}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600
                            text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors
                            disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isLoading ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {isLoading ? 'Checking in…' : 'Check In'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {appt.status === 'Completed' ? 'Done' : appt.status === 'Cancelled' ? 'Cancelled' : 'Checked In'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Patient Profile Drawer & PIN Reset Modal ────────────────────── */}
      {selectedProfilePatient && (
        <PatientProfileDrawer
          patient={selectedProfilePatient}
          isOpen={Boolean(selectedProfilePatient)}
          onClose={() => setSelectedProfilePatient(null)}
          onPatientUpdated={() => fetchQueue()}
        />
      )}
    </div>
  );
}
