import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRedundancyCheck } from '../../../utils/useRedundancyCheck';
import ClinicalVoiceScribe from './ClinicalVoiceScribe';

// Helper to read the auth token from localStorage
const getToken = () =>
  localStorage.getItem('token') || localStorage.getItem('sahay_token') || '';

// --------------------------------
// Sub-component: a single prescription row
// --------------------------------
function PrescriptionRow({ item, index, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
      <input
        className="col-span-4 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white dark:bg-slate-900 dark:text-slate-100"
        placeholder="Medicine name"
        value={item.medicineName}
        onChange={(e) => onChange(index, 'medicineName', e.target.value)}
      />
      <input
        className="col-span-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white dark:bg-slate-900 dark:text-slate-100"
        placeholder="Dosage"
        value={item.dosage}
        onChange={(e) => onChange(index, 'dosage', e.target.value)}
      />
      <input
        className="col-span-3 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white dark:bg-slate-900 dark:text-slate-100"
        placeholder="Frequency"
        value={item.frequency}
        onChange={(e) => onChange(index, 'frequency', e.target.value)}
      />
      <input
        type="number"
        min="1"
        className="col-span-2 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
        placeholder="Days"
        value={item.durationDays}
        onChange={(e) => onChange(index, 'durationDays', e.target.value)}
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="col-span-1 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// --------------------------------
// Sub-component: Redundancy Warning Banner
// --------------------------------
function RedundancyAlert({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">Redundant Investigation Alert</p>
            <p className="text-xs text-amber-700">
              The following test{alerts.length > 1 ? 's were' : ' was'} already ordered and processed within the last 30 days:
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-500 hover:text-amber-700 shrink-0 mt-0.5"
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Alert rows */}
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white border border-amber-200">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900">{alert.testName}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Last performed{' '}
                <span className="font-semibold">{alert.daysAgo} day{alert.daysAgo !== 1 ? 's' : ''} ago</span>
                {' '}at {alert.facility}
                {' '}({alert.matchedOn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-amber-700 font-medium">
        You may still proceed — use clinical judgement to decide if re-ordering is warranted.
      </p>
    </div>
  );
}

// --------------------------------
// Main ConsultationView component
// --------------------------------
export default function ConsultationView({ patient, appointment, onCompleted }) {
  const [form, setForm] = useState({
    chiefComplaints: '',
    clinicalObservations: '',
    diagnosis: '',
    prescription: [],
    investigationInput: '', // current text in the investigation input field
    investigationOrders: [], // confirmed list of { testName, routedTo }
    followUpDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- Timeline data for redundancy checking ---
  const [timelineConsultations, setTimelineConsultations] = useState([]);
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  // Fetch timeline whenever the patient changes (to seed the redundancy hook)
  const fetchTimeline = useCallback(async () => {
    if (!patient?._id) return;
    try {
      const res = await fetch(`/api/doctor/patient/${patient._id}/timeline`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTimelineConsultations(data.consultations || []);
    } catch {
      // silently ignore — redundancy check just won't fire
    }
  }, [patient]);

  useEffect(() => {
    setAlertsDismissed(false); // reset dismissal whenever patient changes
    fetchTimeline();
  }, [fetchTimeline]);

  // --- Redundancy check hook ---
  const redundancyAlerts = useRedundancyCheck(
    timelineConsultations,
    form.investigationOrders
  );

  // Reset form when patient changes
  useEffect(() => {
    setForm({
      chiefComplaints: '',
      clinicalObservations: '',
      diagnosis: '',
      prescription: [],
      investigationInput: '',
      investigationOrders: [],
      followUpDate: '',
    });
    setSubmitError(null);
    setSubmitSuccess(false);
    setAlertsDismissed(false);
  }, [patient?._id]);

  // ----- Prescription helpers -----
  const addPrescriptionRow = () => {
    setForm((f) => ({
      ...f,
      prescription: [
        ...f.prescription,
        { medicineName: '', dosage: '', frequency: '', durationDays: '' },
      ],
    }));
  };

  const updatePrescriptionRow = (index, field, value) => {
    setForm((f) => {
      const updated = [...f.prescription];
      updated[index] = { ...updated[index], [field]: value };
      return { ...f, prescription: updated };
    });
  };

  const removePrescriptionRow = (index) => {
    setForm((f) => ({
      ...f,
      prescription: f.prescription.filter((_, i) => i !== index),
    }));
  };

  // ----- Investigation order helpers -----
  const addInvestigation = () => {
    const name = form.investigationInput.trim();
    if (!name) return;
    // Prevent exact duplicates (case-insensitive) within the current order list
    const already = form.investigationOrders.some(
      (o) => o.testName.toLowerCase() === name.toLowerCase()
    );
    if (already) {
      setForm((f) => ({ ...f, investigationInput: '' }));
      return;
    }
    setForm((f) => ({
      ...f,
      investigationInput: '',
      investigationOrders: [
        ...f.investigationOrders,
        { testName: name, routedTo: 'LabHead' },
      ],
    }));
    setAlertsDismissed(false); // re-show banner if a new test is added
  };

  const removeInvestigation = (index) => {
    setForm((f) => ({
      ...f,
      investigationOrders: f.investigationOrders.filter((_, i) => i !== index),
    }));
  };

  const handleInvestigationKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInvestigation();
    }
  };

  // ----- Submit -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointment?._id) {
      setSubmitError('No appointment selected. Please select a patient from the queue first.');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      const payload = {
        appointmentId: appointment._id,
        chiefComplaints: form.chiefComplaints,
        clinicalObservations: form.clinicalObservations,
        diagnosis: form.diagnosis,
        prescription: form.prescription.filter((p) => p.medicineName.trim() !== ''),
        investigationOrders: form.investigationOrders,
        followUpDate: form.followUpDate || undefined,
      };
      const res = await fetch('/api/doctor/consultation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Server error: ${res.status}`);
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onCompleted?.();
      }, 1800);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Empty state when no patient selected -----
  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">No patient selected</p>
          <p className="text-xs text-slate-400">Click "Consult" on a patient in the queue to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Patient header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
          {patient.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'P'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">{patient.name}</p>
          <p className="text-xs text-slate-400">
            {patient.gender}
            {patient.dateOfBirth &&
              ` · DOB: ${new Date(patient.dateOfBirth).toLocaleDateString('en-IN')}`}
            {patient.abhaId && ` · ABHA: ${patient.abhaId}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400">Token</p>
          <p className="text-lg font-bold text-sky-700">#{appointment?.tokenNumber ?? '—'}</p>
        </div>
      </div>

      {/* ---- Redundancy Warning Banner ---- */}
      {!alertsDismissed && (
        <RedundancyAlert
          alerts={redundancyAlerts}
          onDismiss={() => setAlertsDismissed(true)}
        />
      )}

      {/* Success banner */}
      {submitSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Consultation saved successfully! Returning to queue…
        </div>
      )}

      {/* Error banner */}
      {submitError && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {submitError}
        </div>
      )}

      {/* Autonomous Clinical Voice Scribe (Native Web Speech API + Gemini LLM Auto-Fill) */}
      <ClinicalVoiceScribe
        onAutoFill={(responseData) => {
          if (!responseData) return;
          setForm((f) => ({
            ...f,
            diagnosis: responseData.final_diagnosis || f.diagnosis,
            clinicalObservations: responseData.clinical_notes || f.clinicalObservations,
            chiefComplaints:
              Array.isArray(responseData.chief_complaints) && responseData.chief_complaints.length
                ? responseData.chief_complaints.join(', ')
                : f.chiefComplaints,
            prescription:
              Array.isArray(responseData.medicines) && responseData.medicines.length
                ? responseData.medicines.map((m) => ({
                    medicineName: m.name || m.medicineName || 'Medication',
                    dosage: m.dosage || '1 tab',
                    frequency: m.frequency || '1-0-1',
                    durationDays: parseInt(m.duration) || 3,
                  }))
                : f.prescription,
          }));
        }}
        onApplySymptoms={(symptomsText) => {
          setForm((f) => ({
            ...f,
            chiefComplaints: f.chiefComplaints
              ? `${f.chiefComplaints}, ${symptomsText}`
              : symptomsText,
          }));
        }}
        onApplyMedicines={(meds) => {
          setForm((f) => {
            const existingNames = new Set(
              f.prescription.map((p) => p.medicineName?.toLowerCase())
            );
            const newRows = meds
              .filter((m) => !existingNames.has(m.toLowerCase()))
              .map((m) => ({
                medicineName: m.charAt(0).toUpperCase() + m.slice(1),
                dosage: '1 tab',
                frequency: '1-0-1',
                durationDays: 3,
              }));
            return {
              ...f,
              prescription: [...f.prescription, ...newRows],
            };
          });
        }}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chief Complaints */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chief Complaints</h3>
          <textarea
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            placeholder="Describe the patient's chief complaints…"
            value={form.chiefComplaints}
            onChange={(e) => setForm((f) => ({ ...f, chiefComplaints: e.target.value }))}
          />
        </div>

        {/* Clinical Observations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Clinical Observations</h3>
          <textarea
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            placeholder="Vitals, physical exam findings…"
            value={form.clinicalObservations}
            onChange={(e) => setForm((f) => ({ ...f, clinicalObservations: e.target.value }))}
          />
        </div>

        {/* Diagnosis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnosis</h3>
          <input
            type="text"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300"
            placeholder="Final diagnosis…"
            value={form.diagnosis}
            onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
          />
        </div>

        {/* Prescription */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prescription</h3>
            <button
              type="button"
              onClick={addPrescriptionRow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Medicine
            </button>
          </div>

          {form.prescription.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No medicines added yet.</p>
          ) : (
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-1">
                {['Medicine', 'Dosage', 'Frequency', 'Days', ''].map((h, i) => (
                  <p key={i} className={`text-[10px] font-semibold text-slate-400 uppercase ${
                    i === 0 ? 'col-span-4' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-3' : i === 3 ? 'col-span-2' : 'col-span-1'
                  }`}>{h}</p>
                ))}
              </div>
              {form.prescription.map((item, idx) => (
                <PrescriptionRow
                  key={idx}
                  item={item}
                  index={idx}
                  onChange={updatePrescriptionRow}
                  onRemove={removePrescriptionRow}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---- Order Investigations ---- */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Order Investigations
            </h3>
            {form.investigationOrders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                {form.investigationOrders.length} ordered
              </span>
            )}
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="e.g. CBC, Chest X-Ray, LFT…"
              value={form.investigationInput}
              onChange={(e) => setForm((f) => ({ ...f, investigationInput: e.target.value }))}
              onKeyDown={handleInvestigationKeyDown}
            />
            <button
              type="button"
              onClick={addInvestigation}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          <p className="text-[10px] text-slate-400">
            Press Enter or click Add. Each test is routed to the Lab Head's queue automatically.
          </p>

          {/* Ordered tests chips */}
          {form.investigationOrders.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {form.investigationOrders.map((order, idx) => {
                // Check if this specific test triggered a redundancy alert
                const isRedundant = redundancyAlerts.some(
                  (a) => a.testName.toLowerCase() === order.testName.toLowerCase()
                );
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      isRedundant
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-violet-50 border-violet-200 text-violet-800'
                    }`}
                  >
                    {isRedundant && (
                      <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    {order.testName}
                    <button
                      type="button"
                      onClick={() => removeInvestigation(idx)}
                      className="hover:text-rose-600 transition-colors ml-0.5"
                      aria-label={`Remove ${order.testName}`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Follow-up */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Follow-up Date (optional)</h3>
          <input
            type="date"
            className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300"
            value={form.followUpDate}
            onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || submitSuccess}
          className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-sm"
        >
          {submitting ? 'Saving…' : `Save Consultation & Complete${form.investigationOrders.length ? ` (${form.investigationOrders.length} investigation${form.investigationOrders.length > 1 ? 's' : ''} routed to Lab)` : ''}`}
        </button>
      </form>
    </div>
  );
}
