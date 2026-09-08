import React, { useState, useEffect, useCallback } from 'react';
import nurseApi from '../services/nurseApi';

export default function LabCoordination({ onActionSuccess }) {
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [pendingLabs, setPendingLabs]   = useState([]);
  const [reportsReady, setReportsReady] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [localMessage, setLocalMessage] = useState(null);

  const fetchLabQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await nurseApi.getLabQueue();
      setPendingLabs(res.data?.pendingLabs || []);
      setReportsReady(res.data?.reportsReady || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lab coordination queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabQueue();
  }, [fetchLabQueue]);

  const handleForwardToLab = async (appointmentId, patientName) => {
    setActionLoadingId(appointmentId);
    setLocalMessage(null);
    try {
      await nurseApi.forwardToLab(appointmentId);
      setLocalMessage({
        type: 'success',
        text: `Lab request for ${patientName} successfully forwarded to Laboratory Head.`,
      });
      fetchLabQueue();
      onActionSuccess?.('Lab request forwarded to laboratory.');
    } catch (err) {
      setLocalMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to forward lab request.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNotifyDoctor = async (appointmentId, patientName, doctorName) => {
    setActionLoadingId(appointmentId);
    setLocalMessage(null);
    try {
      await nurseApi.notifyDoctor(appointmentId);
      setLocalMessage({
        type: 'success',
        text: `Dr. ${doctorName || 'Doctor'} notified. ${patientName} moved to Doctor's Review Queue.`,
      });
      fetchLabQueue();
      onActionSuccess?.(`Doctor notified. Patient routed to Review Queue.`);
    } catch (err) {
      setLocalMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to notify doctor.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Feedback Banner */}
      {localMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            localMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{localMessage.text}</span>
          <button
            onClick={() => setLocalMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header bar with live counts & refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Laboratory Coordination Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage sample routing to lab diagnostics and notify doctors when test reports are ready.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLabQueue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* ── SECTION 1: Pending Lab Requests ──────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-amber-100/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-amber-100/80 bg-gradient-to-r from-amber-50/70 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-extrabold text-slate-900">
              1. Pending Lab Requests ({pendingLabs.length})
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              Awaiting Lab Processing
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Step 4.2</span>
        </div>

        {pendingLabs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No patients currently waiting for laboratory investigations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Patient Name & ABHA</th>
                  <th className="px-4 py-3">Requesting Doctor</th>
                  <th className="px-4 py-3">Order Details</th>
                  <th className="px-4 py-3">Routing Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingLabs.map((appt) => {
                  const pName = appt.patientFullName || 'Patient';
                  const docName = appt.assignedDoctorId?.name || 'Assigned Doctor';
                  const testDetails = appt.latestLabOrder?.testName ||
                    (appt.investigationAdvice?.[0]?.testName || 'Laboratory Test');

                  return (
                    <tr key={appt._id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-extrabold text-slate-900">{pName}</p>
                        <p className="text-[11px] text-slate-400">
                          {appt.patientId?.gender ? `${appt.patientId.gender} · ` : ''}
                          {appt.patientId?.contactPhone ? `📞 ${appt.patientId.contactPhone}` : ''}
                          {appt.patientId?.abhaId ? ` · ABHA: ${appt.patientId.abhaId}` : ''}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800">Dr. {docName}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                          🧪 {testDetails}
                        </span>
                        {appt.latestLabOrder?.notes && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">
                            Note: {appt.latestLabOrder.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {appt.labForwarded ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                            <span>✓</span> Forwarded to Lab
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                            ● Ready for Forwarding
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={actionLoadingId === appt._id}
                          onClick={() => handleForwardToLab(appt._id, pName)}
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                            appt.labForwarded
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                          }`}
                        >
                          {actionLoadingId === appt._id ? (
                            <span className="animate-spin">◌</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          )}
                          <span>{appt.labForwarded ? 'Re-Forward to Lab' : 'Forward to Lab'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Reports Ready ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-teal-100 bg-gradient-to-r from-teal-50/70 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
            <h3 className="text-sm font-extrabold text-slate-900">
              2. Reports Ready ({reportsReady.length})
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
              Tests Completed by Lab
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Step 4.4</span>
        </div>

        {reportsReady.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No completed lab reports waiting for doctor notification at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold">
                <tr>
                  <th className="px-6 py-3">Patient Name & ABHA</th>
                  <th className="px-4 py-3">Assigned Doctor</th>
                  <th className="px-4 py-3">Completed Diagnostic</th>
                  <th className="px-4 py-3">Review Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportsReady.map((appt) => {
                  const pName = appt.patientFullName || 'Patient';
                  const docName = appt.assignedDoctorId?.name || 'Assigned Doctor';
                  const testDetails = appt.latestLabOrder?.testName || 'Diagnostic Report';
                  const isDoctorNotified = appt.doctorQueueType === 'Review';

                  return (
                    <tr key={appt._id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-extrabold text-slate-900">{pName}</p>
                        <p className="text-[11px] text-slate-400">
                          {appt.patientId?.gender ? `${appt.patientId.gender} · ` : ''}
                          {appt.patientId?.contactPhone ? `📞 ${appt.patientId.contactPhone}` : ''}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800">Dr. {docName}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          ✓ {testDetails}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {isDoctorNotified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 font-bold">
                            <span>●</span> In Doctor Review Queue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-semibold">
                            ● Pending Notification
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={actionLoadingId === appt._id}
                          onClick={() => handleNotifyDoctor(appt._id, pName, docName)}
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                            isDoctorNotified
                              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200'
                          }`}
                        >
                          {actionLoadingId === appt._id ? (
                            <span className="animate-spin">◌</span>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          )}
                          <span>
                            {isDoctorNotified
                              ? 'Re-Notify Doctor'
                              : 'Notify Doctor (Move to Review Queue)'}
                          </span>
                        </button>
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
