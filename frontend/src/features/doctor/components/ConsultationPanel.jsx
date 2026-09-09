import React, { useState, useEffect } from 'react';
import doctorApi from '../services/doctorApi';
import VideoRoom from '../../../components/common/VideoRoom';

// Common standard lab tests for quick addition
const COMMON_LAB_PRESETS = [
  'CBC',
  'Blood Glucose (Fasting / PP)',
  'HbA1c',
  'Lipid Profile',
  'LFT',
  'KFT',
  'Serum Electrolytes',
  'Urine Routine & Microscopic',
  'Chest X-Ray PA View',
  'ECG 12-Lead',
  'Ultrasound Abdomen & Pelvis',
  'Widal / Typhoid Test',
  'Malaria Antigen / Dengue NS1',
  'Sputum for AFB',
];

export default function ConsultationPanel({
  appointment,
  onConsultationSaved,
  onLabRequested,
  onCancel,
}) {
  // ── Form State ─────────────────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis]           = useState('');
  const [notes, setNotes]                   = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  // ── Action 1: Lab Request State (Prompt 11.2) ──────────────────────────────
  const [labTests, setLabTests]         = useState([]);
  const [labTestInput, setLabTestInput] = useState('');
  const [labNotes, setLabNotes]         = useState('');
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [labSuccess, setLabSuccess]     = useState('');
  const [labError, setLabError]         = useState('');

  // ── Action 2: Prescriptions State ──────────────────────────────────────────
  const [medications, setMedications] = useState([
    { medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
  ]);
  const [instructions, setInstructions]       = useState('');
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultError, setConsultError]       = useState('');

  const [copyFeedback, setCopyFeedback]       = useState('');

  // ── Teleconsultation Video Call State (Prompt 16.3) ─────────────────────────
  const [inVideoCall, setInVideoCall]   = useState(false);
  const [joiningCall, setJoiningCall]   = useState(false);

  useEffect(() => {
    if (appointment?.status === 'In Teleconsult') {
      setInVideoCall(true);
    } else {
      setInVideoCall(false);
    }
  }, [appointment]);

  const handleJoinVideoCall = async () => {
    setJoiningCall(true);
    try {
      await doctorApi.joinTeleconsult(appointment._id);
      setInVideoCall(true);
    } catch (err) {
      console.error('Error joining teleconsult:', err);
      // Fallback: if room ID exists, still launch video room
      if (appointment?.teleconsultRoomId) {
        setInVideoCall(true);
      }
    } finally {
      setJoiningCall(false);
    }
  };

  // ── Sync with selected appointment ─────────────────────────────────────────
  useEffect(() => {
    if (appointment) {
      setChiefComplaint(appointment.chiefComplaint || '');
      setDiagnosis('');
      setNotes('');
      setMedicalHistory('');
      setLabTests([]);
      setLabTestInput('');
      setLabNotes('');
      setLabSuccess('');
      setLabError('');
      setConsultError('');
      setInstructions('');
      setCopyFeedback('');
      setMedications([
        { medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
      ]);
    }
  }, [appointment]);

  if (!appointment) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-extrabold text-slate-800">Select a Patient to Begin Consultation</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Choose a waiting or triaged patient from the queue on the left to review nurse vitals, order investigations, or prescribe medicines.
        </p>
      </div>
    );
  }

  const patient = appointment.patientId || {};
  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`
    : patient.name || 'Patient';
  const vitals = appointment.vitals || {};

  // Prompt 8.4: Compute completed lab orders for prominent review display
  const completedOrders = (appointment.labOrders || []).filter(
    (o) => o.status === 'Completed' || o.result
  );
  const displayOrders = completedOrders.length > 0
    ? completedOrders
    : appointment.completedLabOrder
    ? [appointment.completedLabOrder]
    : [];
  const isReportsReady = appointment.status === 'Reports Ready' || displayOrders.length > 0;

  const copyResultToNotes = (order) => {
    const textToAppend = `\n[Lab Findings - ${order.testName || 'Diagnostic Investigation'}]:\nResult: ${order.result || 'Completed'}\n${order.notes ? `Remarks: ${order.notes}\n` : ''}`;
    setNotes((prev) => (prev ? `${prev}\n${textToAppend}` : textToAppend.trim()));
    setCopyFeedback(order._id || 'copied');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  // ── Medication Handlers ────────────────────────────────────────────────────
  const handleMedChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const addMedicationRow = () => {
    setMedications([
      ...medications,
      { medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
    ]);
  };

  const removeMedicationRow = (index) => {
    if (medications.length <= 1) {
      setMedications([{ medicineName: '', dosage: '', frequency: '', duration: '' }]);
      return;
    }
    setMedications(medications.filter((_, i) => i !== index));
  };

  // ── Action 1: Lab Test Handlers (Prompt 11.2) ──────────────────────────────
  const handleAddLabTest = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = labTestInput.trim();
    if (!trimmed) return;
    if (labTests.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setLabError(`"${trimmed}" is already in the list.`);
      return;
    }
    setLabTests((prev) => [...prev, trimmed]);
    setLabTestInput('');
    setLabError('');
  };

  const handleRemoveLabTest = (indexToRemove) => {
    setLabTests((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ── Action 1: Handle Send to Lab (Prompt 11.2) ─────────────────────────────
  const handleSendToLab = async (e) => {
    e.preventDefault();
    setLabError('');
    setLabSuccess('');

    // If doctor typed a test name and forgot to click "Add", include it
    let testsToSubmit = [...labTests];
    const pendingInput = labTestInput.trim();
    if (pendingInput && !testsToSubmit.some((t) => t.toLowerCase() === pendingInput.toLowerCase())) {
      testsToSubmit.push(pendingInput);
    }

    if (testsToSubmit.length === 0) {
      setLabError('Please add at least one laboratory test before sending.');
      return;
    }

    setLabSubmitting(true);
    try {
      const response = await doctorApi.requestLabTest({
        appointmentId: appointment._id,
        patientId: patient._id || appointment.patientId,
        testNames: testsToSubmit,
        notes: labNotes.trim(),
      });

      // Clear input fields (Prompt 11.2)
      setLabTests([]);
      setLabTestInput('');
      setLabNotes('');
      setLabSuccess(`Requested ${testsToSubmit.length} test(s) successfully.`);

      // Remove the patient from the screen (Prompt 11.2)
      if (onLabRequested) {
        onLabRequested(response.data);
      } else if (onCancel) {
        onCancel();
      }
    } catch (err) {
      setLabError(err.response?.data?.message || 'Failed to request lab tests.');
    } finally {
      setLabSubmitting(false);
    }
  };

  // ── Action 2: Handle Complete Consultation ────────────────────────────────
  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    setConsultError('');

    if (!diagnosis.trim()) {
      setConsultError('Clinical Diagnosis is required before completing the consultation.');
      return;
    }

    setConsultSubmitting(true);
    try {
      const validMeds = medications.filter((m) => m.medicineName?.trim());

      const payload = {
        appointmentId: appointment._id,
        patientId: patient._id || appointment.patientId,
        chiefComplaint: chiefComplaint.trim(),
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
        clinicalNotes: notes.trim(),
        medicalHistory: medicalHistory.trim(),
        vitals,
        medications: validMeds,
        instructions: instructions.trim(),
      };

      const response = await doctorApi.closeConsultation(payload);

      if (onConsultationSaved) {
        onConsultationSaved(response.data);
      }
    } catch (err) {
      setConsultError(err.response?.data?.message || 'Failed to complete consultation.');
    } finally {
      setConsultSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Patient Snapshot Header ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
            {patient.firstName?.[0] || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">{patientName}</h2>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                appointment.priority === 'Urgent'
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {appointment.priority || 'Routine'} Priority
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-100">
                Queue #{appointment.queueNumber || '1'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {patient.gender && <span className="capitalize">{patient.gender}</span>}
              {patient.dob && ` · ${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs`}
              {patient.contactPhone && ` · 📞 ${patient.contactPhone}`}
              {patient.bloodGroup && ` · Blood: ${patient.bloodGroup}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          Cancel / Close
        </button>
      </div>

      {/* ── Teleconsultation Banner (Prompt 16.3) ─────────────────────────── */}
      {(appointment.status === 'Teleconsult Requested' || appointment.status === 'In Teleconsult' || appointment.teleconsultRoomId) && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 rounded-3xl p-5 text-white shadow-xl border border-purple-500/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
              📹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">Live Teleconsultation Call</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-400 text-purple-950 uppercase tracking-wider animate-pulse">
                  {inVideoCall || appointment.status === 'In Teleconsult' ? 'Live Call Active' : 'Request Pending'}
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Nurse at rural triage station requested live specialist video consultation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!inVideoCall ? (
              <button
                type="button"
                id="join-video-call-btn"
                onClick={handleJoinVideoCall}
                disabled={joiningCall}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/40 hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>📹</span>
                <span>{joiningCall ? 'Joining Call…' : 'Join Video Call'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setInVideoCall(false)}
                className="px-4 py-2 rounded-2xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-xs font-bold transition-all border border-purple-700"
              >
                Hide / Minimize Video
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Side-by-Side Video Window (Prompt 16.3) ───────────────────────── */}
      {inVideoCall && appointment.teleconsultRoomId && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Patient Video Call — Review Vitals & Prescribe Below</span>
            </span>
            <button
              type="button"
              onClick={() => setInVideoCall(false)}
              className="text-xs text-purple-700 hover:text-purple-900 font-bold"
            >
              Minimize Video
            </button>
          </div>
          <VideoRoom
            roomName={appointment.teleconsultRoomId}
            displayName="Dr. Specialist"
            onClose={() => setInVideoCall(false)}
          />
        </div>
      )}

      {/* ── Diagnostic Lab Results Banner (Prompt 8.4: Secondary Queue Review) ── */}
      {isReportsReady && (
        <div className="bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60 rounded-3xl border-2 border-teal-400 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-200 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-teal-950">
                    Diagnostic Lab Investigation Results
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-extrabold border border-teal-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                    Reports Ready
                  </span>
                </div>
                <p className="text-xs text-teal-700 mt-0.5">
                  The laboratory department has processed and submitted findings. Review below before finalizing medication.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-3 py-1 rounded-xl">
              Secondary Review Queue
            </span>
          </div>

          {/* Render individual completed lab orders */}
          {displayOrders.length > 0 ? (
            <div className="space-y-3">
              {displayOrders.map((order, idx) => (
                <div key={order._id || idx} className="bg-white rounded-2xl border border-teal-200/90 p-4 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-black">
                        #{idx + 1}
                      </span>
                      <h4 className="text-xs font-extrabold text-slate-900">
                        {order.testName || 'Laboratory Test'}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {order.status || 'Completed'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {order.updatedAt && (
                        <span>Reported: {new Date(order.updatedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Findings Result Box */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Findings & Diagnostic Interpretation:
                    </p>
                    <p className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                      {order.result || 'No written findings text provided.'}
                    </p>
                  </div>

                  {/* Remarks & URL Link if present */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-xs text-slate-500">
                      {order.notes && (
                        <p><span className="font-semibold text-slate-700">Tech Remarks:</span> {order.notes}</p>
                      )}
                      {order.resultURL && (
                        <a
                          href={order.resultURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold underline mt-1 text-xs"
                        >
                          <span>📄 View Attached Document / PDF</span>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => copyResultToNotes(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-all border border-teal-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      <span>{copyFeedback === (order._id || 'copied') ? '✓ Appended to Notes' : 'Append to Clinical Notes'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-teal-100 text-xs text-teal-800">
              <p className="font-bold">Reports Ready Notification</p>
              <p className="text-[11px] text-teal-600 mt-0.5">
                The laboratory test has completed. You may now evaluate the patient and proceed to final prescription and checkout.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Triage Vitals Banner (Captured by Nurse) ──────────────────────── */}
      <div className="bg-gradient-to-br from-white to-sky-50/50 rounded-3xl border border-sky-100 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
              Triage Vitals Captured by Nurse
            </h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">Recorded on Arrival</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
            <p className="text-[10px] text-slate-400 font-semibold">Blood Pressure</p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {vitals.bloodPressure || vitals.bp || '120/80'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
            <p className="text-[10px] text-slate-400 font-semibold">Blood Sugar</p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {vitals.bloodSugar || 'Normal'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
            <p className="text-[10px] text-slate-400 font-semibold">Pulse Rate</p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {vitals.pulse ? `${vitals.pulse} bpm` : '74 bpm'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
            <p className="text-[10px] text-slate-400 font-semibold">Temperature</p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {vitals.temperature || vitals.temp || '98.4 °F'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
            <p className="text-[10px] text-slate-400 font-semibold">SpO2 Oxygen</p>
            <p className="text-sm font-extrabold text-emerald-700 mt-0.5">
              {vitals.spO2 ? `${vitals.spO2} %` : '98 %'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs">
            <p className="text-[10px] text-slate-400 font-semibold">Height / Weight</p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {vitals.weight ? `${vitals.weight} kg` : '65 kg'}
              {vitals.height && <span className="text-slate-400 font-normal"> · {vitals.height}cm</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Clinical Evaluation: Diagnosis & Notes ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Clinical Evaluation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chief Complaints
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Acute chest pain radiating to left arm, shortness of breath"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Final Diagnosis <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Bronchitis / Essential Hypertension"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Clinical Notes & Observations
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detailed clinical findings, auscultation, systemic examination remarks..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* ── ACTION 1: Request Lab Test ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-amber-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Action 1: Order Lab Investigation</h3>
              <p className="text-[11px] text-slate-500">
                Routes patient back to Nurse/Lab with status <strong>"Lab Pending"</strong>
              </p>
            </div>
          </div>
        </div>

        {labSuccess && (
          <div className="mb-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <span>✓</span> {labSuccess}
          </div>
        )}
        {labError && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {labError}
          </div>
        )}

        <form onSubmit={handleSendToLab} className="space-y-4">
          {/* Flex row containing text input field and "Add" button (Prompt 11.2) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Add Diagnostic Lab Tests
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={labTestInput}
                onChange={(e) => setLabTestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabTest();
                  }
                }}
                placeholder="Enter custom lab test name (e.g., CBC, MRI Brain)"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-xs"
              />
              <button
                type="button"
                onClick={handleAddLabTest}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shadow-amber-200 transition-all shrink-0 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Quick presets for common tests */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Add:</span>
              {COMMON_LAB_PRESETS.slice(0, 8).map((preset) => {
                const isAdded = labTests.some((t) => t.toLowerCase() === preset.toLowerCase());
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={isAdded}
                    onClick={() => {
                      if (!isAdded) {
                        setLabTests((prev) => [...prev, preset]);
                        setLabError('');
                      }
                    }}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-all ${
                      isAdded
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 cursor-pointer'
                    }`}
                  >
                    + {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Display: map through labTests array and render small pill/badges with "X" icon (Prompt 11.2) */}
          {labTests.length > 0 ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  Tests to be Ordered ({labTests.length})
                </span>
                <button
                  type="button"
                  onClick={() => setLabTests([])}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {labTests.map((test, index) => (
                  <span
                    key={`${test}-${index}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-amber-300 text-amber-900 text-xs font-bold shadow-xs transition-all"
                  >
                    <span>{test}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLabTest(index)}
                      title={`Remove ${test}`}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-amber-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
              No lab tests added yet. Type a test name above and click "Add".
            </div>
          )}

          {/* Clinical Instructions / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lab Instructions / Clinical Notes (Optional)
            </label>
            <input
              type="text"
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              placeholder="e.g. STAT urgent sample, fasting mandatory, report to ICU"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={labSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm shadow-amber-200 transition-all disabled:opacity-50 cursor-pointer"
            >
              {labSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Routing to Lab...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span>Send to Lab & Update Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── ACTION 2: Prescribe & Complete Consultation ──────────────────── */}
      <div className="bg-white rounded-3xl border border-emerald-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Action 2: Prescribe Medications & Close</h3>
              <p className="text-[11px] text-slate-500">
                Saves consultation, creates digital prescription record, and marks appointment <strong>"Completed"</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addMedicationRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
          >
            <span>+ Add Medicine</span>
          </button>
        </div>

        {consultError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {consultError}
          </div>
        )}

        <form onSubmit={handleCompleteConsultation} className="space-y-4">
          {/* Dynamic Medication Table */}
          <div className="space-y-2.5">
            {medications.map((med, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={med.medicineName}
                    onChange={(e) => handleMedChange(index, 'medicineName', e.target.value)}
                    placeholder="Medicine Name (e.g. Paracetamol)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                    placeholder="Dosage (500mg)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                    placeholder="Frequency (1-0-1 after food)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => handleMedChange(index, 'duration', e.target.value)}
                    placeholder="Duration (5 days)"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeMedicationRow(index)}
                    className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors text-sm mx-auto"
                    title="Remove medicine"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              General Patient Instructions
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Avoid cold food, stay hydrated, review in OPD after 5 days if symptoms persist."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              * Completing consultation releases patient and closes today's queue item.
            </span>

            <button
              type="submit"
              disabled={consultSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {consultSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Finalizing Consultation...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete Consultation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
