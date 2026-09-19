import React, { useState, useEffect } from 'react';
import doctorApi from '../services/doctorApi';
import { Thermometer, Stethoscope, Heart, Wind, Scale, Ruler, FlaskConical, X } from 'lucide-react';

// Default empty medicine row
const emptyMedication = () => ({
  drugName: '',
  dosage: '',
  frequency: '',
  durationDays: '',
  instructions: '',
});

// Common quick lab investigation tags for fast clinical entry
const COMMON_LAB_TESTS = [
  'Complete Blood Count (CBC)',
  'Blood Glucose (Fasting / PP)',
  'HbA1c',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Serum Electrolytes',
  'Urine Routine & Microscopic',
  'Chest X-Ray PA View',
  'ECG 12-Lead',
];

export default function ConsultationForm({
  appointment,
  onConsultationSaved,
  onCancel,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Form State ──────────────────────────────────────────────────────────────
  const [vitals, setVitals] = useState({
    temp: '',
    bp: '',
    pulse: '',
    spO2: '',
    weight: '',
    height: '',
  });

  const [chiefComplaints, setChiefComplaints]         = useState('');
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [medicalHistory, setMedicalHistory]           = useState('');
  const [diagnosis, setDiagnosis]                     = useState('');
  const [clinicalNotes, setClinicalNotes]             = useState('');

  const [medications, setMedications] = useState([
    { drugName: '', dosage: '500mg', frequency: 'Twice daily', durationDays: '5', instructions: 'After meals' },
  ]);

  const [investigations, setInvestigations] = useState([]);
  const [customTestInput, setCustomTestInput] = useState('');

  // ── Pre-fill when appointment changes ───────────────────────────────────────
  useEffect(() => {
    if (appointment) {
      setError('');
      setSuccessMsg('');
      setChiefComplaints(appointment.chiefComplaint || '');
      setClinicalObservations('');
      setDiagnosis('');
      setClinicalNotes('');
      setVitals({
        temp: '',
        bp: '',
        pulse: '',
        spO2: '',
        weight: '',
        height: '',
      });
      setMedications([
        { drugName: '', dosage: '500mg', frequency: 'Twice daily', durationDays: '5', instructions: 'After meals' },
      ]);
      setInvestigations([]);
    }
  }, [appointment]);

  // ── Medication row handlers ─────────────────────────────────────────────────
  const handleMedChange = (index, field, value) => {
    setMedications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMedicationRow = () => {
    setMedications((prev) => [...prev, emptyMedication()]);
  };

  const removeMedicationRow = (index) => {
    setMedications((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  // ── Investigation tag handlers ──────────────────────────────────────────────
  const addInvestigation = (testName) => {
    const trimmed = testName.trim();
    if (!trimmed) return;
    if (investigations.some((inv) => inv.testName.toLowerCase() === trimmed.toLowerCase())) return;
    setInvestigations((prev) => [...prev, { testName: trimmed, notes: '' }]);
    setCustomTestInput('');
  };

  const removeInvestigation = (index) => {
    setInvestigations((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit Handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e, status = 'Finalized') => {
    if (e) e.preventDefault();
    if (!appointment) return;

    // Basic validation
    if (!diagnosis.trim() && !chiefComplaints.trim()) {
      setError('Please provide at least a chief complaint or diagnosis for this consultation.');
      return;
    }

    setSubmitting(true);
    setError('');

    // Filter out blank medication rows
    const validMeds = medications.filter((m) => m.drugName.trim().length > 0);

    const payload = {
      appointmentId: appointment._id,
      patientId: appointment.patientId?._id || appointment.patientId,
      vitals,
      chiefComplaints: chiefComplaints.trim(),
      medicalHistory: medicalHistory.trim(),
      clinicalObservations: clinicalObservations.trim(),
      diagnosis: diagnosis.trim(),
      clinicalNotes: clinicalNotes.trim(),
      medications: validMeds,
      investigationAdvice: investigations,
      status,
    };

    try {
      const res = await doctorApi.submitConsultation(payload);
      setSuccessMsg('Consultation completed successfully! Queue updated.');
      setTimeout(() => {
        onConsultationSaved?.(res.data);
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit consultation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── If NO appointment selected: show friendly empty workspace ───────────────
  if (!appointment) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center h-full min-h-[500px]">
        <div className="w-16 h-16 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 shadow-sm shadow-sky-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-800">No Patient Selected</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
          Select a patient from the waiting queue on the left to start their clinical consultation, record vitals, write prescriptions, or order lab tests.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-sky-700 bg-sky-50 px-3.5 py-1.5 rounded-full border border-sky-100">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>Select patient from queue to begin</span>
        </div>
      </div>
    );
  }

  const patient = appointment.patientId;
  const isUrgent = appointment.priority === 'Urgent';
  const age = patient?.dob
    ? Math.floor((new Date() - new Date(patient.dob)) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <form onSubmit={(e) => handleSubmit(e, 'Finalized')} className="space-y-5">
      {/* ── Patient Header Card ───────────────────────────────────────────── */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isUrgent
            ? 'bg-gradient-to-r from-rose-50/90 via-white to-rose-50/40 border-rose-200 shadow-sm'
            : 'bg-gradient-to-r from-sky-50/80 via-white to-slate-50 border-sky-100 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                isUrgent ? 'bg-rose-500 text-white' : 'bg-sky-600 text-white'
              }`}
            >
              {appointment.queueNumber ? `#${appointment.queueNumber}` : 'Rx'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                  {appointment.patientFullName}
                </h2>
                {isUrgent && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                    Urgent
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  {appointment.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                {patient?.gender && <span>{patient.gender}</span>}
                {age !== null && (
                  <>
                    <span>·</span>
                    <span>{age} years old</span>
                  </>
                )}
                {patient?.bloodGroup && (
                  <>
                    <span>·</span>
                    <span className="font-bold text-rose-600">Blood: {patient.bloodGroup}</span>
                  </>
                )}
                {patient?.contactPhone && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{patient.contactPhone}</span>
                  </>
                )}
                {patient?.abhaId && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-slate-400">ABHA: {patient.abhaId}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
          >
            Switch Patient
          </button>
        </div>

        {appointment.chiefComplaint && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider shrink-0">
              Reported Complaint:
            </span>
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/60 font-medium">
              {appointment.chiefComplaint}
            </span>
          </div>
        )}
      </div>

      {/* ── Success / Error Notification ─────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Section 1: Vitals ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>Patient Vitals (ABDM OPConsultRecord)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { key: 'temp', label: 'Temperature', placeholder: '98.6 °F', icon: 'thermometer' },
            { key: 'bp', label: 'Blood Pressure', placeholder: '120/80 mmHg', icon: 'stethoscope' },
            { key: 'pulse', label: 'Pulse Rate', placeholder: '72 bpm', icon: 'heart' },
            { key: 'spO2', label: 'SpO2', placeholder: '98 %', icon: 'wind' },
            { key: 'weight', label: 'Weight', placeholder: '68 kg', icon: 'scale' },
            { key: 'height', label: 'Height', placeholder: '170 cm', icon: 'ruler' },
          ].map(({ key, label, placeholder, icon }) => (
            <div key={key} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <span>{icon}</span>
                <span>{label}</span>
              </label>
              <input
                type="text"
                value={vitals[key]}
                onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50
                  focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all font-medium"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Clinical Observations & Complaints ─────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Clinical Assessment & Findings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Chief Complaints *</label>
            <textarea
              rows={2}
              value={chiefComplaints}
              onChange={(e) => setChiefComplaints(e.target.value)}
              placeholder="e.g., Fever for 3 days, dry cough, body aches..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Diagnosis (Provisional / Final) *</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g., Acute Upper Respiratory Tract Infection (URTI)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Add primary diagnosis or clinical summary for ABDM EHR record.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Clinical Observations & Physical Exam</label>
            <textarea
              rows={2}
              value={clinicalObservations}
              onChange={(e) => setClinicalObservations(e.target.value)}
              placeholder="e.g., Throat congested, chest clear bilaterally, no pedal edema..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Medical History / Allergies</label>
            <textarea
              rows={2}
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="e.g., Known hypertensive on Amlodipine 5mg; penicillin allergy..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50
                focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Digital Prescription (Medications) ─────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>Digital Prescription (Medications)</span>
          </div>

          <button
            type="button"
            onClick={addMedicationRow}
            className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Medication</span>
          </button>
        </div>

        <div className="space-y-2">
          {medications.map((med, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 items-center"
            >
              {/* Medicine Name */}
              <div className="col-span-12 sm:col-span-4">
                <input
                  type="text"
                  value={med.drugName}
                  onChange={(e) => handleMedChange(idx, 'drugName', e.target.value)}
                  placeholder="Medicine / Drug name (e.g. Amoxicillin)"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold
                    focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Dosage */}
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="text"
                  value={med.dosage}
                  onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                  placeholder="Dosage (500mg)"
                  className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700
                    focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Frequency */}
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="text"
                  value={med.frequency}
                  onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                  placeholder="Freq (1-0-1)"
                  className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700
                    focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Duration Days */}
              <div className="col-span-4 sm:col-span-1">
                <input
                  type="number"
                  value={med.durationDays}
                  onChange={(e) => handleMedChange(idx, 'durationDays', e.target.value)}
                  placeholder="Days"
                  min="1"
                  className="w-full px-1.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 text-center
                    focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Instructions */}
              <div className="col-span-10 sm:col-span-2">
                <input
                  type="text"
                  value={med.instructions}
                  onChange={(e) => handleMedChange(idx, 'instructions', e.target.value)}
                  placeholder="Instructions (after food)"
                  className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700
                    focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Remove button */}
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeMedicationRow(idx)}
                  disabled={medications.length <= 1}
                  title="Remove row"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Investigation Advice (Lab Orders) ─────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Investigation Advice & Diagnostics</span>
        </div>

        {/* Selected investigations pills */}
        {investigations.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2.5 rounded-2xl bg-violet-50/50 border border-violet-100">
            {investigations.map((inv, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-violet-200 text-xs font-semibold text-violet-800 shadow-xs"
              >
                <span><FlaskConical className="w-3.5 h-3.5 inline mr-1 text-cyan-600" />{inv.testName}</span>
                <button
                  type="button"
                  onClick={() => removeInvestigation(i)}
                  className="text-slate-400 hover:text-rose-600"
                ><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Custom test entry input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customTestInput}
            onChange={(e) => setCustomTestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addInvestigation(customTestInput);
              }
            }}
            placeholder="Type custom test name and press Enter (e.g. Thyroid Panel)..."
            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800
              focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition-all font-medium"
          />
          <button
            type="button"
            onClick={() => addInvestigation(customTestInput)}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors"
          >
            Add Test
          </button>
        </div>

        {/* Quick select tags */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions:</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_LAB_TESTS.map((test) => {
              const alreadyAdded = investigations.some((inv) => inv.testName === test);
              return (
                <button
                  key={test}
                  type="button"
                  onClick={() => addInvestigation(test)}
                  disabled={alreadyAdded}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-all ${
                    alreadyAdded
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200'
                  }`}
                >
                  + {test}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Action Buttons Footer ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'Draft')}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white text-xs font-extrabold shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Finalize & Complete Consultation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
