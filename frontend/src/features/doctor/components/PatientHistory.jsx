import React, { useState, useEffect } from 'react';
import doctorApi from '../services/doctorApi';

export default function PatientHistory({ patientId, patient: initialPatient }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [data, setData]       = useState({
    patient: null,
    consultations: [],
    prescriptions: [],
    labOrders: [],
    vitals: [],
  });
  const [filter, setFilter]   = useState('all'); // 'all' | 'consultations' | 'prescriptions' | 'labs' | 'vitals'

  useEffect(() => {
    if (!patientId) {
      setData({ patient: null, consultations: [], prescriptions: [], labOrders: [], vitals: [] });
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await doctorApi.getPatientHistory(patientId);
        if (isMounted) {
          setData(response.data || {});
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load patient medical history.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHistory();
    return () => { isMounted = false; };
  }, [patientId]);

  const activePatient = data.patient || initialPatient;

  // Build unified chronological timeline
  const timelineEvents = [];

  (data.consultations || []).forEach((item) => {
    timelineEvents.push({
      id: item._id,
      type: 'consultation',
      date: new Date(item.createdAt || item.date),
      title: item.diagnosis ? `Diagnosis: ${item.diagnosis}` : 'OPD Consultation',
      facility: item.facilityId?.hospitalName || item.hospital?.hospitalName || 'Hospital Clinic',
      provider: item.doctorId?.name || item.doctor?.name || 'Treating Doctor',
      raw: item,
    });
  });

  (data.prescriptions || []).forEach((item) => {
    // Only add if not already redundant with a consultation
    timelineEvents.push({
      id: item._id,
      type: 'prescription',
      date: new Date(item.createdAt),
      title: `Prescription (${item.medications?.length || 0} Medications)`,
      provider: item.doctorId?.name || 'Doctor',
      raw: item,
    });
  });

  (data.labOrders || []).forEach((item) => {
    timelineEvents.push({
      id: item._id,
      type: 'lab',
      date: new Date(item.createdAt),
      title: `Lab Test: ${item.testName}`,
      facility: item.facilityId?.hospitalName || 'Clinical Laboratory',
      provider: item.doctorId?.name || 'Doctor',
      raw: item,
    });
  });

  (data.vitals || []).forEach((item) => {
    timelineEvents.push({
      id: item._id,
      type: 'vitals',
      date: new Date(item.createdAt),
      title: 'Triage Vitals Check',
      facility: item.facilityId?.hospitalName || 'Triage Desk',
      provider: item.nurseId?.name ? `Nurse ${item.nurseId.name}` : 'Staff Nurse',
      raw: item,
    });
  });

  // Sort descending (newest first)
  timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Filter events
  const filteredEvents = timelineEvents.filter((ev) => {
    if (filter === 'all') return true;
    if (filter === 'consultations') return ev.type === 'consultation';
    if (filter === 'prescriptions') return ev.type === 'prescription';
    if (filter === 'labs') return ev.type === 'lab';
    if (filter === 'vitals') return ev.type === 'vitals';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center">
        <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-800">Retrieving Patient History</h3>
        <p className="text-xs text-slate-500 mt-1">Aggregating longitudinal records across all network facilities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-rose-100 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900">Unable to Load Medical History</h3>
        <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Patient Demographics Banner ─────────────────────────────────── */}
      {activePatient && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center text-xl font-black shadow-md shadow-sky-100">
                {activePatient.firstName?.[0] || activePatient.name?.[0] || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {activePatient.firstName
                      ? `${activePatient.firstName} ${activePatient.lastName || ''}`
                      : activePatient.name || 'Patient'}
                  </h2>
                  {activePatient.gender && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase">
                      {activePatient.gender}
                    </span>
                  )}
                  {activePatient.bloodGroup && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
                      {activePatient.bloodGroup}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  {activePatient.dob && (
                    <span>DOB: {new Date(activePatient.dob).toLocaleDateString()}</span>
                  )}
                  {activePatient.contactPhone && (
                    <span>Phone: {activePatient.contactPhone}</span>
                  )}
                  {activePatient.abhaId && (
                    <span className="font-mono text-sky-700 font-semibold">
                      ABHA: {activePatient.abhaId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold border border-sky-100">
                {timelineEvents.length} Recorded Encounters
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Filter Pills ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: `All Events (${timelineEvents.length})` },
            { key: 'consultations', label: `Consultations (${data.consultations?.length || 0})` },
            { key: 'prescriptions', label: `Prescriptions (${data.prescriptions?.length || 0})` },
            { key: 'labs', label: `Lab Orders (${data.labOrders?.length || 0})` },
            { key: 'vitals', label: `Vitals (${data.vitals?.length || 0})` },
          ].map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === pill.key
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline Display ────────────────────────────────────────────── */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">No Past Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filter === 'all'
              ? "This patient has no recorded prior clinical history across the network. This is their initial consultation."
              : `No past ${filter} records found for this patient.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div
              key={`${event.type}-${event.id}`}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-sky-200 transition-all"
            >
              {/* Event Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      event.type === 'consultation'
                        ? 'bg-sky-100 text-sky-700'
                        : event.type === 'prescription'
                        ? 'bg-emerald-100 text-emerald-700'
                        : event.type === 'lab'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {event.type}
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900">{event.title}</h4>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-500">
                    {event.date.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {event.date.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Event Provider / Facility meta */}
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                <span>By: <strong className="text-slate-700">{event.provider}</strong></span>
                {event.facility && (
                  <span>Facility: <strong className="text-slate-700">{event.facility}</strong></span>
                )}
              </div>

              {/* Event-specific Body Content */}
              {event.type === 'consultation' && (
                <div className="space-y-2 text-xs">
                  {event.raw.chiefComplaint || event.raw.chiefComplaints ? (
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Chief Complaint:</strong>{' '}
                      {typeof event.raw.chiefComplaint === 'string'
                        ? event.raw.chiefComplaint
                        : JSON.stringify(event.raw.chiefComplaints)}
                    </p>
                  ) : null}

                  {event.raw.notes || event.raw.clinicalNotes ? (
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Clinical Notes:</strong>{' '}
                      {event.raw.notes || event.raw.clinicalNotes}
                    </p>
                  ) : null}

                  {event.raw.vitals && Object.keys(event.raw.vitals).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {event.raw.vitals.bp && (
                        <span className="px-2 py-0.5 rounded bg-slate-50 border text-[11px] font-medium text-slate-600">
                          BP: {event.raw.vitals.bp}
                        </span>
                      )}
                      {event.raw.vitals.pulse && (
                        <span className="px-2 py-0.5 rounded bg-slate-50 border text-[11px] font-medium text-slate-600">
                          Pulse: {event.raw.vitals.pulse}
                        </span>
                      )}
                      {event.raw.vitals.temp && (
                        <span className="px-2 py-0.5 rounded bg-slate-50 border text-[11px] font-medium text-slate-600">
                          Temp: {event.raw.vitals.temp}
                        </span>
                      )}
                      {event.raw.vitals.spO2 && (
                        <span className="px-2 py-0.5 rounded bg-slate-50 border text-[11px] font-medium text-slate-600">
                          SpO2: {event.raw.vitals.spO2}
                        </span>
                      )}
                    </div>
                  )}

                  {event.raw.medications?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="font-bold text-slate-700 mb-1">Prescribed Medicines:</p>
                      <div className="flex flex-wrap gap-2">
                        {event.raw.medications.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-medium"
                          >
                            {m.medicineName || m.drugName} ({m.dosage || 'Std'} · {m.frequency || 'Daily'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {event.type === 'prescription' && (
                <div className="text-xs">
                  {event.raw.medications?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b text-slate-400 font-semibold">
                            <th className="py-1">Medicine</th>
                            <th className="py-1">Dosage</th>
                            <th className="py-1">Frequency</th>
                            <th className="py-1">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {event.raw.medications.map((med, i) => (
                            <tr key={i}>
                              <td className="py-1.5 font-bold text-slate-800">
                                {med.medicineName || med.drugName}
                              </td>
                              <td className="py-1.5 text-slate-600">{med.dosage || '—'}</td>
                              <td className="py-1.5 text-slate-600">{med.frequency || '—'}</td>
                              <td className="py-1.5 text-slate-600">{med.duration || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No specific medications recorded.</p>
                  )}
                  {event.raw.instructions && (
                    <p className="mt-2 text-slate-600">
                      <strong>Instructions:</strong> {event.raw.instructions}
                    </p>
                  )}
                </div>
              )}

              {event.type === 'lab' && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        event.raw.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : event.raw.status === 'Sample Collected'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      ● Status: {event.raw.status}
                    </span>
                    {event.raw.notes && (
                      <p className="text-slate-500 mt-1">Notes: {event.raw.notes}</p>
                    )}
                  </div>
                  {event.raw.resultURL && (
                    <a
                      href={event.raw.resultURL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 transition-colors"
                    >
                      View Report →
                    </a>
                  )}
                </div>
              )}

              {event.type === 'vitals' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">Blood Pressure</span>
                    <strong className="text-slate-800 font-bold text-sm">
                      {event.raw.bloodPressure || '—'}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">Blood Sugar</span>
                    <strong className="text-slate-800 font-bold text-sm">
                      {event.raw.bloodSugar || '—'}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">Pulse</span>
                    <strong className="text-slate-800 font-bold text-sm">
                      {event.raw.pulse || '—'}
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium block">Temp / SpO2</span>
                    <strong className="text-slate-800 font-bold text-sm">
                      {event.raw.temperature || '—'} · {event.raw.spO2 || '—'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
