import React, { useState, useEffect, useRef, useMemo } from 'react';
import doctorApi from '../services/doctorApi';
import VideoRoom from '../../../components/common/VideoRoom';
import AiClinicalInsightCard from './AiClinicalInsightCard';
import EndVisitModal from './EndVisitModal';

// Standard diagnostic test catalog fallback (Prompt 3.1 & 3.2)
const DEFAULT_LAB_CATALOG = [
  'Complete Blood Count (CBC)',
  'Lipid Profile',
  'ECG',
  'Serum Creatinine',
  'HbA1c',
  'Chest X-Ray',
  'Liver Function Test (LFT)',
  'Kidney Function Test (KFT)',
  'Serum Electrolytes',
  'Blood Glucose (Fasting & PP)',
  'Thyroid Profile (T3, T4, TSH)',
  'Urine Routine & Microscopic',
  'Ultrasound Abdomen & Pelvis',
  'Widal Test',
  'Malaria & Dengue Antigen',
  'C-Reactive Protein (CRP)',
  'Erythrocyte Sedimentation Rate (ESR)',
  'Blood Urea Nitrogen (BUN)',
  'Urine Culture & Sensitivity',
  'Sputum for AFB',
  'Vitamin D & B12 Panel',
  'Stool Routine & Occult Blood',
];

export default function ConsultationPanel({
  appointment,
  onConsultationSaved,
  onLabRequested,
  onCancel,
  initialTab,
}) {
  // ── Form State ─────────────────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis]           = useState('');
  const [notes, setNotes]                   = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  // ── Action 1: Lab Request State (Prompt 11.2 & Prompt 3.2) ──────────────────
  const [catalog, setCatalog]               = useState(DEFAULT_LAB_CATALOG);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [labTests, setLabTests]             = useState([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [labNotes, setLabNotes]             = useState('');
  const [labSubmitting, setLabSubmitting]   = useState(false);
  const [labSuccess, setLabSuccess]         = useState('');
  const [labError, setLabError]             = useState('');
  const dropdownRef                         = useRef(null);

  // ── Action 2: Prescriptions State ──────────────────────────────────────────
  const [medications, setMedications] = useState([
    { medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
  ]);
  const [instructions, setInstructions]       = useState('');
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultError, setConsultError]       = useState('');

  // ── Prompt 11.2: End Visit Modal state ────────────────────────────────────
  const [endVisitModalOpen, setEndVisitModalOpen] = useState(false);
  // Pending form payload collected before modal opens
  const pendingPayloadRef = useRef(null);

  const [copyFeedback, setCopyFeedback]       = useState('');

  // ── Prompt 5.3: Allergy Warning & Override State ───────────────────────────
  const [allergyOverrideAcknowledged, setAllergyOverrideAcknowledged] = useState(false);
  const [allergyOverrideReason, setAllergyOverrideReason]             = useState('');

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

  // ── Fetch Official Lab Catalog on Mount (Prompt 3.2) ────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const res = await doctorApi.getLabCatalog();
        if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
          setCatalog(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch lab catalog from API, using default catalog fallback:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };
    fetchCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Sync with selected appointment ─────────────────────────────────────────
  useEffect(() => {
    if (appointment) {
      setChiefComplaint(appointment.chiefComplaint || '');
      setDiagnosis('');
      setNotes('');
      setMedicalHistory('');
      setLabTests([]);
      setSearchQuery('');
      setIsDropdownOpen(false);
      setLabNotes('');
      setLabSuccess('');
      setLabError('');
      setConsultError('');
      setInstructions('');
      setCopyFeedback('');
      setAllergyOverrideAcknowledged(false);
      setAllergyOverrideReason('');
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

  // ── Prompt 5.3: Patient Documented Allergies ──────────────────────────────
  const patientAllergies = useMemo(() => {
    const raw = patient?.allergies || appointment?.patient?.allergies || [];
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  }, [patient, appointment]);

  // Prompt 5.3: Real-time case-insensitive check of prescribed drugs against patient allergies
  const matchedAllergyConflicts = useMemo(() => {
    if (!patientAllergies.length) return [];
    const conflicts = [];
    const seenCombos = new Set();

    medications.forEach((med) => {
      const medName = (med.medicineName || '').trim();
      if (!medName) return;
      const lowerMed = medName.toLowerCase();

      patientAllergies.forEach((allergy) => {
        const trimmedAllergy = allergy.trim();
        if (!trimmedAllergy) return;
        const lowerAllergy = trimmedAllergy.toLowerCase();

        // Check if med name contains allergy or allergy contains med name
        if (lowerMed.includes(lowerAllergy) || lowerAllergy.includes(lowerMed)) {
          const key = `${trimmedAllergy.toLowerCase()}::${lowerMed}`;
          if (!seenCombos.has(key)) {
            seenCombos.add(key);
            conflicts.push({
              allergy: trimmedAllergy,
              prescribedDrug: medName,
            });
          }
        }
      });
    });

    return conflicts;
  }, [medications, patientAllergies]);

  const hasAllergyConflict = matchedAllergyConflicts.length > 0;

  const getMedAllergyMatch = (medName) => {
    if (!medName || !patientAllergies.length) return null;
    const lower = medName.trim().toLowerCase();
    if (!lower) return null;
    return patientAllergies.find((allergy) => {
      const alLower = (allergy || '').trim().toLowerCase();
      return alLower && (lower.includes(alLower) || alLower.includes(lower));
    });
  };

  // ── Standardized Lab Catalog Helpers (Prompt 3.1 & 3.2) ───────────────────
  const getCatalogItemName = (item) => (typeof item === 'string' ? item : item?.name || '');

  const matchesCatalogQuery = (item, query) => {
    if (!query) return true;
    const q = String(query).trim().toLowerCase();
    const name = getCatalogItemName(item).toLowerCase();
    if (name.includes(q) || q.includes(name)) return true;
    if (Array.isArray(item?.aliases)) {
      return item.aliases.some((a) => String(a).toLowerCase().includes(q) || q.includes(String(a).toLowerCase()));
    }
    return false;
  };

  const matchesCatalogTest = (item, testName) => {
    if (!testName) return false;
    const tLower = String(testName).trim().toLowerCase();
    const name = getCatalogItemName(item).toLowerCase();
    if (name === tLower) return true;
    if (Array.isArray(item?.aliases)) {
      return item.aliases.some((a) => String(a).toLowerCase() === tLower);
    }
    return false;
  };

  // Prompt 6.1 & 6.2: Clinical reference ranges lookup helper
  const getTestReferenceRange = (testName, catalogList) => {
    if (!testName) return null;
    const nameClean = String(testName).trim().toLowerCase();
    const found = (catalogList || []).find((t) => {
      const name = (typeof t === 'string' ? t : t.name || '').toLowerCase();
      if (name === nameClean) return true;
      if (Array.isArray(t?.aliases)) {
        return t.aliases.some((a) => String(a).toLowerCase() === nameClean);
      }
      return false;
    });
    if (found && (found.normalRange || found.min !== undefined)) {
      return {
        min: found.normalRange?.min ?? found.min,
        max: found.normalRange?.max ?? found.max,
        unit: found.normalRange?.unit || found.unit || '',
      };
    }
    const fallbackRanges = {
      'fasting blood sugar': { min: 70, max: 100, unit: 'mg/dL' },
      'blood glucose (fasting & pp)': { min: 70, max: 140, unit: 'mg/dL' },
      'complete blood count (cbc)': { min: 4.5, max: 11.0, unit: '10^3/µL' },
      'lipid profile': { min: 100, max: 200, unit: 'mg/dL' },
      'serum creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL' },
      'hba1c': { min: 4.0, max: 5.6, unit: '%' },
      'liver function test (lft)': { min: 10, max: 40, unit: 'U/L' },
      'kidney function test (kft)': { min: 15, max: 45, unit: 'mg/dL' },
      'serum electrolytes': { min: 135, max: 145, unit: 'mEq/L' },
      'thyroid profile (t3, t4, tsh)': { min: 0.4, max: 4.0, unit: 'µIU/mL' },
      'c-reactive protein (crp)': { min: 0, max: 10, unit: 'mg/L' },
      'erythrocyte sedimentation rate (esr)': { min: 0, max: 20, unit: 'mm/hr' },
      'blood urea nitrogen (bun)': { min: 7, max: 20, unit: 'mg/dL' },
      'vitamin d & b12 panel': { min: 30, max: 100, unit: 'ng/mL' },
    };
    return fallbackRanges[nameClean] || null;
  };

  const parseResultValue = (text) => {
    if (typeof text === 'number') return text;
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/[-+]?\d*\.?\d+/);
    if (!match) return null;
    const val = parseFloat(match[0]);
    return isNaN(val) ? null : val;
  };

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

  // Prompt 6.2: Detect if any displayed lab orders contain critical out-of-range values
  const hasCriticalLabOrders = useMemo(() => {
    return displayOrders.some((order) => {
      if (order.isCritical) return true;
      const refRange = getTestReferenceRange(order.testName, catalog);
      if (!refRange) return false;
      const num = parseResultValue(order.result || order.resultURL || '');
      return num !== null && (num < refRange.min || num > refRange.max);
    });
  }, [displayOrders, catalog]);

  // Prompt 6.2: State for consultation workspace sub-tabs
  const [activeConsultTab, setActiveConsultTab] = useState(
    initialTab || (appointment?.status === 'Reports Ready' || appointment?.isCriticalLab ? 'labReports' : 'consultation')
  );

  useEffect(() => {
    if (initialTab) {
      setActiveConsultTab(initialTab);
    } else if (appointment?.status === 'Reports Ready' || appointment?.isCriticalLab) {
      setActiveConsultTab('labReports');
    }
  }, [initialTab, appointment?._id, appointment?.status, appointment?.isCriticalLab]);

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

  // ── Action 1: Lab Test Handlers (Prompt 11.2 & Prompt 3.2) ───────────────────
  const handleAddLabTest = (testCandidate) => {
    let test = '';
    if (typeof testCandidate === 'string') {
      test = testCandidate.trim();
    } else if (testCandidate && typeof testCandidate.name === 'string') {
      test = testCandidate.name.trim();
    } else {
      test = searchQuery.trim();
    }

    if (!test) {
      setLabError('Please select a test from the standardized catalog.');
      return;
    }

    // Strict catalog check (Prompt 3.2): Must match an item or alias in the official catalog
    const matched = catalog.find((c) => matchesCatalogTest(c, test));
    if (!matched) {
      setLabError(`"${test}" is not in the official catalog. Free-text test entries are rejected.`);
      return;
    }

    const matchedName = getCatalogItemName(matched);

    if (labTests.some((t) => t.toLowerCase() === matchedName.toLowerCase())) {
      setLabError(`"${matchedName}" is already added to the order.`);
      return;
    }

    setLabTests((prev) => [...prev, matchedName]);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setLabError('');
  };

  const handleRemoveLabTest = (indexToRemove) => {
    setLabTests((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // ── Action 1: Handle Send to Lab (Prompt 11.2 & Prompt 3.2) ───────────────────
  const handleSendToLab = async (e) => {
    e.preventDefault();
    setLabError('');
    setLabSuccess('');

    let testsToSubmit = [...labTests];

    // If doctor typed or highlighted a test that matches an approved catalog item and submitted
    if (searchQuery.trim()) {
      const matched = catalog.find((c) => matchesCatalogTest(c, searchQuery.trim()));
      if (matched) {
        const matchedName = getCatalogItemName(matched);
        if (!testsToSubmit.includes(matchedName)) {
          testsToSubmit.push(matchedName);
        }
      }
    }

    if (testsToSubmit.length === 0) {
      setLabError('Please select at least one standardized lab test before sending.');
      return;
    }

    // Prompt 3.2: Strictly ensure every test to submit is from the official catalog
    const invalidTests = testsToSubmit.filter((t) => !catalog.some((c) => matchesCatalogTest(c, t)));
    if (invalidTests.length > 0) {
      setLabError(`Invalid tests: ${invalidTests.join(', ')}. Only tests from the official catalog are permitted.`);
      return;
    }

    setLabSubmitting(true);
    try {
      const response = await doctorApi.requestLabTest({
        appointmentId: appointment._id,
        patientId: appointment.patientId?._id || appointment.patientId,
        testNames: testsToSubmit,
        notes: labNotes.trim(),
      });

      // Clear input fields (Prompt 11.2)
      setLabTests([]);
      setSearchQuery('');
      setIsDropdownOpen(false);
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

  // ── Action 2: Handle Complete Consultation ────────────────────────────
  // Prompt 11.2: Intercept submit → open EndVisitModal first
  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    setConsultError('');

    if (!diagnosis.trim()) {
      setConsultError('Clinical Diagnosis is required before completing the consultation.');
      return;
    }

    // Prompt 5.3: Override protocol validation
    if (hasAllergyConflict && (!allergyOverrideAcknowledged || !allergyOverrideReason.trim())) {
      setConsultError('Clinical safety lock: Patient has documented drug allergies matching your prescription. You must check the override acknowledgment and provide a reason.');
      return;
    }

    const validMeds = medications.filter((m) => m.medicineName?.trim());

    // Stash the core payload — clinicalTags & voiceNoteTranscript will be added by the modal
    pendingPayloadRef.current = {
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
      allergyOverride: hasAllergyConflict
        ? {
            acknowledged: allergyOverrideAcknowledged,
            reason: allergyOverrideReason.trim(),
            overriddenAt: new Date().toISOString(),
            matchedAllergies: matchedAllergyConflicts.map((c) => c.allergy),
          }
        : undefined,
    };

    // Open the summary modal instead of submitting directly
    setEndVisitModalOpen(true);
  };
  // ── Prompt 11.2: Called when modal "Save & End Visit" is clicked ──────────────
  const handleModalSave = async ({ clinicalTags, voiceNoteTranscript }) => {
    if (!pendingPayloadRef.current) return;
    setConsultSubmitting(true);
    setConsultError('');
    try {
      const payload = {
        ...pendingPayloadRef.current,
        clinicalTags,
        voiceNoteTranscript,
      };
      const response = await doctorApi.closeConsultationWithSummary(payload);
      setEndVisitModalOpen(false);
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
              {patient.gender && <span className="capitalize">{patient.gender}</span>}
              {patient.dob && ` · ${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs`}
              {patient.contactPhone && ` · 📞 ${patient.contactPhone}`}
              {patient.bloodGroup && ` · Blood: ${patient.bloodGroup}`}
              {patientAllergies.length > 0 ? (
                <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  <span>🚨 Allergies:</span>
                  <span>{patientAllergies.join(', ')}</span>
                </span>
              ) : (
                <span className="text-slate-400">· No documented allergies</span>
              )}
            </div>
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

      {/* ── Prompt 6.3: Gemini AI Clinical Insights Card ─────────────────────── */}
      <AiClinicalInsightCard patientId={patient?._id || patient?.id || (typeof appointment.patientId === 'string' ? appointment.patientId : appointment.patientId?._id) || ''} />

      {/* ── Consultation Workspace Sub-Tabs (Prompt 6.2) ── */}
      <div className="flex items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveConsultTab('consultation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeConsultTab === 'consultation'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>📝 Consultation & Rx</span>
          </button>

          <button
            type="button"
            id="consultation-panel-lab-tab-btn"
            onClick={() => setActiveConsultTab('labReports')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeConsultTab === 'labReports'
                ? hasCriticalLabOrders
                  ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400 animate-pulse'
                  : 'bg-teal-600 text-white shadow-xs'
                : hasCriticalLabOrders
                ? 'bg-red-50 text-red-700 border border-red-300 font-black animate-pulse'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🔬 Lab Reports ({displayOrders.length || (appointment?.labOrders?.length || 0)})</span>
            {hasCriticalLabOrders && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[9px] font-black uppercase shadow-xs">
                🚨 CRITICAL
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveConsultTab('vitals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeConsultTab === 'vitals'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🫀 Triage Vitals</span>
          </button>
        </div>

        {hasCriticalLabOrders && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-100 text-red-800 text-[11px] font-black border border-red-300 animate-pulse">
            <span>🚨 Critical lab findings detected</span>
          </div>
        )}
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

      {/* ── Diagnostic Lab Results Banner (Prompt 8.4 & Prompt 6.2: Secondary Queue Review) ── */}
      {(isReportsReady || activeConsultTab === 'labReports') && (
        <div
          className={`rounded-3xl border-2 p-5 sm:p-6 shadow-sm space-y-4 transition-all ${
            hasCriticalLabOrders
              ? 'bg-gradient-to-br from-rose-50/95 via-white to-red-50/80 border-red-500 ring-2 ring-red-400/40'
              : 'bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/60 border-teal-400'
          }`}
        >
          {/* Prompt 6.2: High-Priority Flashing Warning Banner for Critical Labs */}
          {hasCriticalLabOrders && (
            <div className="p-4 rounded-2xl bg-red-600 text-white shadow-md border-2 border-red-700 flex items-start gap-3 animate-pulse">
              <span className="text-xl shrink-0 mt-0.5">🚨</span>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  HIGH-PRIORITY WARNING: Critical Out-of-Bounds Lab Values Detected
                </h4>
                <p className="text-[11px] text-red-100 mt-0.5 leading-relaxed font-medium">
                  One or more diagnostic test results fall outside standard physiological reference limits. Please evaluate highlighted metrics below before prescribing.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0 text-white ${
                  hasCriticalLabOrders
                    ? 'bg-red-600 shadow-red-200'
                    : 'bg-teal-600 shadow-teal-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Diagnostic Lab Investigation Results
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      hasCriticalLabOrders
                        ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                        : 'bg-teal-100 text-teal-800 border-teal-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${hasCriticalLabOrders ? 'bg-red-600 animate-pulse' : 'bg-teal-600 animate-pulse'}`} />
                    Reports Ready
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  The laboratory department has processed and submitted findings. Review below before finalizing medication.
                </p>
              </div>
            </div>

            <span className={`text-[11px] font-bold px-3 py-1 rounded-xl ${
              hasCriticalLabOrders
                ? 'text-red-800 bg-red-100/90'
                : 'text-teal-800 bg-teal-100/80'
            }`}>
              Secondary Review Queue
            </span>
          </div>

          {/* Render individual completed lab orders */}
          {displayOrders.length > 0 ? (
            <div className="space-y-3">
              {displayOrders.map((order, idx) => {
                const resultText = order.result || order.resultURL || '';
                const numericVal = parseResultValue(resultText);
                const refRange = getTestReferenceRange(order.testName, catalog);
                const isOutOfRange = Boolean(
                  order.isCritical || (
                    refRange && numericVal !== null && (numericVal < refRange.min || numericVal > refRange.max)
                  )
                );

                return (
                  <div
                    key={order._id || idx}
                    className={`rounded-2xl border p-4 space-y-3 transition-all ${
                      isOutOfRange
                        ? 'bg-red-50/60 border-red-300 ring-1 ring-red-300/70 shadow-sm'
                        : 'bg-white border-teal-200/90 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                            isOutOfRange
                              ? 'bg-red-600 text-white'
                              : 'bg-teal-50 text-teal-700'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-900">
                          {order.testName || 'Laboratory Test'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isOutOfRange
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfRange ? '🚨 CRITICAL RESULT' : (order.status || 'Completed')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {order.updatedAt && (
                          <span>Reported: {new Date(order.updatedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Prompt 6.2: Out-of-bounds numeric value in red text alongside standard reference range */}
                    {refRange && numericVal !== null && (
                      <div
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${
                          isOutOfRange
                            ? 'bg-red-50/95 border-red-300 ring-1 ring-red-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Reported Value:
                          </span>
                          {isOutOfRange ? (
                            <span className="text-red-600 font-black text-sm">
                              {numericVal} {refRange.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-black text-sm">
                              {numericVal} {refRange.unit}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-600">
                            (Normal: {refRange.min} - {refRange.max} {refRange.unit})
                          </span>
                        </div>

                        {isOutOfRange && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-xs">
                            🚨 Critical Out of Range
                          </span>
                        )}
                      </div>
                    )}

                    {/* Findings Result Box */}
                    <div className={`rounded-xl p-3 border ${
                      isOutOfRange ? 'bg-white border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <p className={`text-[10px] uppercase font-bold mb-1 ${isOutOfRange ? 'text-red-700' : 'text-slate-500'}`}>
                        Findings & Diagnostic Interpretation:
                      </p>
                      <p className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${isOutOfRange ? 'text-red-950 font-bold' : 'text-slate-800 font-medium'}`}>
                        {order.result || 'No written findings text provided.'}
                      </p>
                      {order.criticalReason && (
                        <p className="text-[11px] font-bold text-red-700 mt-1.5 pt-1.5 border-t border-red-200 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Clinical Note: {order.criticalReason}</span>
                        </p>
                      )}
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isOutOfRange
                            ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
                            : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border-teal-200'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>{copyFeedback === (order._id || 'copied') ? '✓ Appended to Notes' : 'Append to Clinical Notes'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-teal-100 text-xs text-teal-800">
              <p className="font-bold">Reports Ready Notification</p>
              <p className="text-[11px] text-teal-600 mt-0.5">
                The laboratory test has completed. You may now evaluate the patient and proceed to final prescription and checkout.
              </p>
            </div>
          )}

          {activeConsultTab === 'labReports' && (
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Physician lab evaluation completed? Proceed to clinical diagnosis and prescription.
              </span>
              <button
                type="button"
                onClick={() => setActiveConsultTab('consultation')}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Proceed to Prescribe & Finalize Rx →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fallback empty state when doctor switches to lab reports tab but no completed tests exist */}
      {activeConsultTab === 'labReports' && !isReportsReady && displayOrders.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl mx-auto shadow-xs">
            🧪
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">No Completed Lab Reports Available</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Laboratory investigations ordered for this patient are currently awaiting specimen processing by the Lab Head.
          </p>
          <button
            type="button"
            onClick={() => setActiveConsultTab('consultation')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            ← Return to Consultation
          </button>
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
          {/* Searchable Dropdown List based on Official Catalog (Prompt 3.2) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Diagnostic Lab Test (Standardized Catalog)
              </label>
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {loadingCatalog ? 'Loading...' : `${catalog.length} Tests in Catalog`}
              </span>
            </div>

            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setLabError('');
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchQuery.trim()) {
                          const matched = catalog.find((c) =>
                            matchesCatalogQuery(c, searchQuery.trim())
                          );
                          if (matched) {
                            handleAddLabTest(matched);
                          } else {
                            handleAddLabTest(searchQuery.trim());
                          }
                        }
                      } else if (e.key === 'Escape') {
                        setIsDropdownOpen(false);
                      }
                    }}
                    placeholder="Search test catalog (e.g., CBC, Lipid Profile, ECG, Creatinine)..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shadow-xs placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  <span>Catalog</span>
                  <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Floating Dropdown Filtered Options */}
              {isDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl py-1 text-xs divide-y divide-slate-50">
                  <div className="px-3.5 py-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Standardized Catalog Tests</span>
                    <span>
                      {catalog.filter((t) => matchesCatalogQuery(t, searchQuery.trim())).length} found
                    </span>
                  </div>

                  {(() => {
                    const filtered = catalog.filter((t) =>
                      matchesCatalogQuery(t, searchQuery.trim())
                    );
                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-slate-400">
                          <p className="font-semibold text-slate-600">No official test matching "{searchQuery}"</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Free-text entries are not allowed. Please choose a standardized diagnostic test.
                          </p>
                        </div>
                      );
                    }
                    return filtered.map((testItem) => {
                      const testName = getCatalogItemName(testItem);
                      const isAdded = labTests.some((t) => t.toLowerCase() === testName.toLowerCase());
                      return (
                        <button
                          key={testName}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddLabTest(testItem)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                            isAdded
                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                              : 'hover:bg-amber-50 text-slate-800 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold">{testName}</span>
                            {testItem.category && (
                              <span className="ml-2 text-[10px] text-slate-400 font-normal">
                                ({testItem.category})
                              </span>
                            )}
                          </div>
                          {isAdded ? (
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                              Added ✓
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                              + Add
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Quick presets for common tests from the official catalog */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Add:</span>
              {catalog.slice(0, 8).map((preset) => {
                const presetName = getCatalogItemName(preset);
                const isAdded = labTests.some((t) => t.toLowerCase() === presetName.toLowerCase());
                return (
                  <button
                    key={presetName}
                    type="button"
                    disabled={isAdded}
                    onClick={() => {
                      if (!isAdded) {
                        handleAddLabTest(presetName);
                      }
                    }}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-all ${
                      isAdded
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 cursor-pointer'
                    }`}
                  >
                    + {presetName}
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

        {/* ── Prompt 5.3: Real-Time Allergy Warning Banner & Override Protocol ── */}
        {hasAllergyConflict && (
          <div
            id="allergy-warning-banner"
            className="mb-5 p-4 sm:p-5 rounded-2xl bg-rose-600 text-white shadow-xl border-2 border-rose-700 space-y-3.5 animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center text-xl shrink-0 shadow-inner">
                🚨
              </div>
              <div className="min-w-0 flex-1">
                {matchedAllergyConflicts.map((conflict, idx) => (
                  <h4
                    key={idx}
                    className="text-sm sm:text-base font-black tracking-wide text-white uppercase"
                  >
                    WARNING: Patient has a documented allergy to {conflict.allergy}.
                  </h4>
                ))}
                <p className="text-xs text-rose-100 mt-1 font-medium leading-relaxed">
                  Prescribing <span className="underline font-bold text-white">{matchedAllergyConflicts.map((c) => c.prescribedDrug).join(', ')}</span> conflicts with the patient's medical record. High risk of anaphylaxis or adverse drug reaction.
                </p>
              </div>
            </div>

            {/* Prompt 5.3: The Override Protocol */}
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-400/60 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="allergy-override-checkbox"
                  checked={allergyOverrideAcknowledged}
                  onChange={(e) => setAllergyOverrideAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 bg-white border-rose-300 focus:ring-rose-500 cursor-pointer"
                />
                <label
                  htmlFor="allergy-override-checkbox"
                  className="text-xs font-bold text-white cursor-pointer select-none"
                >
                  I acknowledge this allergy warning and authorize this prescription.
                </label>
              </div>

              <div className="space-y-1">
                <label htmlFor="allergy-override-reason" className="block text-[11px] font-bold text-rose-200">
                  Override Reason <span className="text-rose-300">* (Required)</span>
                </label>
                <input
                  type="text"
                  id="allergy-override-reason"
                  value={allergyOverrideReason}
                  onChange={(e) => setAllergyOverrideReason(e.target.value)}
                  placeholder="Enter clinical justification for overriding allergy warning..."
                  className="w-full px-3 py-2 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleCompleteConsultation} className="space-y-4">
          {/* Dynamic Medication Table */}
          <div className="space-y-2.5">
            {medications.map((med, index) => {
              const matchedAllergy = getMedAllergyMatch(med.medicineName);
              return (
                <div
                  key={index}
                  className={`p-3 rounded-2xl border transition-all ${
                    matchedAllergy
                      ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-300'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={med.medicineName}
                        onChange={(e) => handleMedChange(index, 'medicineName', e.target.value)}
                        placeholder="Medicine Name (e.g. Paracetamol)"
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs placeholder-slate-400 focus:outline-none focus:ring-2 font-semibold ${
                          matchedAllergy
                            ? 'border-rose-400 bg-white text-rose-900 focus:ring-rose-500'
                            : 'border-slate-200 text-slate-800 focus:ring-emerald-500 bg-white'
                        }`}
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

                  {matchedAllergy && (
                    <div className="mt-2 pt-2 border-t border-rose-200/60 flex items-center gap-1.5 text-[11px] font-bold text-rose-700">
                      <span>⚠️ Documented Allergy:</span>
                      <span className="underline">Patient is allergic to "{matchedAllergy}"</span>
                    </div>
                  )}
                </div>
              );
            })}
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
              {hasAllergyConflict && (!allergyOverrideAcknowledged || !allergyOverrideReason.trim()) ? (
                <span className="text-rose-600 font-bold">
                  ⚠️ Complete override protocol above to enable prescription submission.
                </span>
              ) : (
                '* Completing consultation releases patient and closes today\'s queue item.'
              )}
            </span>

            <button
              type="submit"
              id="submit-prescription-btn"
              disabled={
                consultSubmitting ||
                (hasAllergyConflict && (!allergyOverrideAcknowledged || !allergyOverrideReason.trim()))
              }
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                hasAllergyConflict
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
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
                  <span>
                    {hasAllergyConflict ? 'Authorized Clinical Override & Complete' : 'Complete Consultation'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Prompt 11.2: End Visit Modal ─────────────────────────────────── */}
      <EndVisitModal
        open={endVisitModalOpen}
        onClose={() => setEndVisitModalOpen(false)}
        onSave={handleModalSave}
        submitting={consultSubmitting}
        error={consultError}
      />
    </div>
  );
}
