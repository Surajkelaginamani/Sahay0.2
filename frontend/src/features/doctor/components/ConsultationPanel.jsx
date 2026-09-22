import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Video,
  VideoOff,
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileText,
  Sparkles,
  FlaskConical,
  Pill,
  Mic,
  MicOff,
  Tag,
  ChevronRight,
  Heart,
  Thermometer,
  Droplets,
  Scale,
  ArrowRight,
  Plus,
  Trash2,
  Stethoscope,
  User,
  ClipboardList,
  RefreshCw,
  ExternalLink,
  Copy,
  TrendingUp,
  TrendingDown,
  Calendar,
  Syringe,
  Hospital,
  MessageSquare,
  ShieldCheck,
  Ambulance,
  Loader2,
  Info,
} from 'lucide-react';
import doctorApi from '../services/doctorApi';
import VideoRoom from '../../../components/common/VideoRoom';
import AiClinicalInsightCard from './AiClinicalInsightCard';
import EndVisitModal from './EndVisitModal';
import ClinicalVoiceScribe from '../../../pages/dashboards/DrDashboard/ClinicalVoiceScribe';

// ── Standard lab catalog fallback ────────────────────────────────────────────
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

// ── Small Vital Card ──────────────────────────────────────────────────────────
function VitalCard({ label, value, unit, Icon, color = 'sky' }) {
  const colorMap = {
    sky:     { bg: 'bg-sky-50',     text: 'text-sky-700',     icon: 'text-sky-500' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    icon: 'text-rose-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-500' },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  icon: 'text-violet-500' },
  };
  const c = colorMap[color] || colorMap.sky;
  return (
    <div className={`${c.bg} p-3 rounded-xl border border-white`}>
      <div className={`flex items-center gap-1 mb-1 ${c.icon}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-semibold text-slate-500">{label}</span>
      </div>
      <p className={`text-sm font-extrabold ${c.text}`}>
        {value || '—'} {unit && <span className="text-[10px] font-normal text-slate-400">{unit}</span>}
      </p>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-400 flex items-center justify-center mx-auto mb-4">
        <Stethoscope className="w-8 h-8" />
      </div>
      <h3 className="text-base font-extrabold text-slate-800">{t('doctor.emptyState.title')}</h3>
      <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
        {t('doctor.emptyState.subtitle')}
      </p>
    </div>
  );
}

// ── Main ConsultationPanel ────────────────────────────────────────────────────
export default function ConsultationPanel({
  appointment,
  onConsultationSaved,
  onLabRequested,
  onCancel,
  initialTab,
}) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [chiefComplaint, setChiefComplaint]   = useState('');
  const [diagnosis, setDiagnosis]             = useState('');
  const [notes, setNotes]                     = useState('');
  const [medicalHistory, setMedicalHistory]   = useState('');

  // ── Lab state ───────────────────────────────────────────────────────────────
  const [catalog, setCatalog]             = useState(DEFAULT_LAB_CATALOG);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [labTests, setLabTests]           = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [labNotes, setLabNotes]           = useState('');
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [labSuccess, setLabSuccess]       = useState('');
  const [labError, setLabError]           = useState('');
  const dropdownRef                       = useRef(null);

  // ── Rx state ────────────────────────────────────────────────────────────────
  const [medications, setMedications] = useState([
    { medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
  ]);
  const [instructions, setInstructions]       = useState('');
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultError, setConsultError]       = useState('');

  // ── End visit modal ─────────────────────────────────────────────────────────
  const [endVisitModalOpen, setEndVisitModalOpen] = useState(false);
  const pendingPayloadRef = useRef(null);

  const [copyFeedback, setCopyFeedback] = useState('');

  // ── Allergy override ────────────────────────────────────────────────────────
  const [allergyOverrideAcknowledged, setAllergyOverrideAcknowledged] = useState(false);
  const [allergyOverrideReason, setAllergyOverrideReason]             = useState('');

  // ── Teleconsult video ───────────────────────────────────────────────────────
  const [inVideoCall, setInVideoCall] = useState(false);
  const [joiningCall, setJoiningCall] = useState(false);

  // ── Active clinical tab ──────────────────────────────────────────────────────
  const [activeConsultTab, setActiveConsultTab] = useState('vitals');

  useEffect(() => {
    if (appointment?.status === 'In Teleconsult') {
      setInVideoCall(true);
    } else {
      setInVideoCall(false);
    }
  }, [appointment]);

  useEffect(() => {
    if (initialTab) {
      setActiveConsultTab(initialTab);
    } else if (appointment?.status === 'Reports Ready' || appointment?.isCriticalLab) {
      setActiveConsultTab('labReports');
    } else {
      setActiveConsultTab('vitals');
    }
  }, [initialTab, appointment?._id, appointment?.status, appointment?.isCriticalLab]);

  // ── Fetch lab catalog ────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const res = await doctorApi.getLabCatalog();
        if (isMounted && Array.isArray(res.data) && res.data.length > 0) setCatalog(res.data);
      } catch (err) {
        console.warn('Could not fetch lab catalog:', err);
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };
    fetchCatalog();
    return () => { isMounted = false; };
  }, []);

  // ── Close dropdown outside click ────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Reset on appointment change ──────────────────────────────────────────────
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
      setMedications([{ medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' }]);
    }
  }, [appointment]);

  if (!appointment) return <EmptyState />;

  const patient     = appointment.patientId || {};
  const patientName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`
    : patient.name || 'Patient';
  const vitals = appointment.vitals || {};
  const isAshaWorkerSource = appointment.teleconsultSource === 'ASHA' ||
    (typeof appointment.sourceLabel === 'string' && appointment.sourceLabel.includes('ASHA'));
  const hasCapturedVitals = Boolean(
    vitals && (
      (vitals.bloodPressure && String(vitals.bloodPressure).trim()) ||
      (vitals.bp && String(vitals.bp).trim()) ||
      vitals.pulse ||
      vitals.spO2 ||
      vitals.temperature ||
      vitals.temp ||
      vitals.bloodSugar ||
      vitals.weight ||
      vitals.height
    )
  );

  // ── Allergies ────────────────────────────────────────────────────────────────
  const patientAllergies = useMemo(() => {
    const raw = patient?.allergies || appointment?.patient?.allergies || [];
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  }, [patient, appointment]);

  // ── Allergy conflict detection ───────────────────────────────────────────────
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
        if (lowerMed.includes(lowerAllergy) || lowerAllergy.includes(lowerMed)) {
          const key = `${lowerAllergy}::${lowerMed}`;
          if (!seenCombos.has(key)) {
            seenCombos.add(key);
            conflicts.push({ allergy: trimmedAllergy, prescribedDrug: medName });
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
    return patientAllergies.find((allergy) => {
      const alLower = (allergy || '').trim().toLowerCase();
      return alLower && (lower.includes(alLower) || alLower.includes(lower));
    });
  };

  // ── Catalog helpers ──────────────────────────────────────────────────────────
  const getCatalogItemName = (item) => (typeof item === 'string' ? item : item?.name || '');
  const matchesCatalogQuery = (item, query) => {
    if (!query) return true;
    const q = String(query).trim().toLowerCase();
    const name = getCatalogItemName(item).toLowerCase();
    if (name.includes(q) || q.includes(name)) return true;
    if (Array.isArray(item?.aliases)) {
      return item.aliases.some((a) => String(a).toLowerCase().includes(q));
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

  const getTestReferenceRange = (testName, catalogList) => {
    if (!testName) return null;
    const nameClean = String(testName).trim().toLowerCase();
    const found = (catalogList || []).find((t) => {
      const name = (typeof t === 'string' ? t : t.name || '').toLowerCase();
      if (name === nameClean) return true;
      if (Array.isArray(t?.aliases)) return t.aliases.some((a) => String(a).toLowerCase() === nameClean);
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
      'complete blood count (cbc)': { min: 4.5, max: 11.0, unit: '10³/µL' },
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

  // ── Completed lab orders ─────────────────────────────────────────────────────
  const completedOrders = (appointment.labOrders || []).filter((o) => o.status === 'Completed' || o.result);
  const displayOrders   = completedOrders.length > 0
    ? completedOrders
    : appointment.completedLabOrder ? [appointment.completedLabOrder] : [];
  const isReportsReady  = appointment.status === 'Reports Ready' || displayOrders.length > 0;

  const hasCriticalLabOrders = useMemo(() => {
    return displayOrders.some((order) => {
      if (order.isCritical) return true;
      const refRange = getTestReferenceRange(order.testName, catalog);
      if (!refRange) return false;
      const num = parseResultValue(order.result || order.resultURL || '');
      return num !== null && (num < refRange.min || num > refRange.max);
    });
  }, [displayOrders, catalog]);

  const copyResultToNotes = (order) => {
    const textToAppend = `\n[Lab Findings - ${order.testName || 'Test'}]:\nResult: ${order.result || 'Completed'}\n${order.notes ? `Remarks: ${order.notes}\n` : ''}`;
    setNotes((prev) => (prev ? `${prev}\n${textToAppend}` : textToAppend.trim()));
    setCopyFeedback(order._id || 'copied');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  // ── Medication handlers ──────────────────────────────────────────────────────
  const handleMedChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };
  const addMedicationRow = () => setMedications([
    ...medications,
    { medicineName: '', dosage: '500mg', frequency: 'Twice daily after meals', duration: '5 days' },
  ]);
  const removeMedicationRow = (index) => {
    if (medications.length <= 1) {
      setMedications([{ medicineName: '', dosage: '', frequency: '', duration: '' }]);
      return;
    }
    setMedications(medications.filter((_, i) => i !== index));
  };

  // ── Lab test handlers ────────────────────────────────────────────────────────
  const handleAddLabTest = (testCandidate) => {
    let test = '';
    if (typeof testCandidate === 'string') test = testCandidate.trim();
    else if (testCandidate?.name) test = testCandidate.name.trim();
    else test = searchQuery.trim();

    if (!test) { setLabError('Please select a test from the catalog.'); return; }
    const matched = catalog.find((c) => matchesCatalogTest(c, test));
    if (!matched) { setLabError(`"${test}" is not in the official catalog.`); return; }
    const matchedName = getCatalogItemName(matched);
    if (labTests.some((t) => t.toLowerCase() === matchedName.toLowerCase())) {
      setLabError(`"${matchedName}" is already added.`); return;
    }
    setLabTests((prev) => [...prev, matchedName]);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setLabError('');
  };

  const handleRemoveLabTest = (index) => setLabTests((prev) => prev.filter((_, i) => i !== index));

  const handleSendToLab = async (e) => {
    e.preventDefault();
    setLabError('');
    setLabSuccess('');
    let testsToSubmit = [...labTests];
    if (searchQuery.trim()) {
      const matched = catalog.find((c) => matchesCatalogTest(c, searchQuery.trim()));
      if (matched) {
        const mn = getCatalogItemName(matched);
        if (!testsToSubmit.includes(mn)) testsToSubmit.push(mn);
      }
    }
    if (testsToSubmit.length === 0) { setLabError('Please select at least one lab test.'); return; }
    const invalidTests = testsToSubmit.filter((t) => !catalog.some((c) => matchesCatalogTest(c, t)));
    if (invalidTests.length > 0) { setLabError(`Invalid tests: ${invalidTests.join(', ')}`); return; }

    setLabSubmitting(true);
    try {
      const response = await doctorApi.requestLabTest({
        appointmentId: appointment._id,
        patientId: appointment.patientId?._id || appointment.patientId,
        testNames: testsToSubmit,
        notes: labNotes.trim(),
      });
      setLabTests([]);
      setSearchQuery('');
      setIsDropdownOpen(false);
      setLabNotes('');
      setLabSuccess(`Requested ${testsToSubmit.length} test(s) successfully.`);
      if (onLabRequested) onLabRequested(response.data);
      else if (onCancel) onCancel();
    } catch (err) {
      setLabError(err.response?.data?.message || 'Failed to request lab tests.');
    } finally {
      setLabSubmitting(false);
    }
  };

  // ── Complete consultation ────────────────────────────────────────────────────
  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    setConsultError('');
    if (!diagnosis.trim()) { setConsultError('Clinical Diagnosis is required.'); return; }
    if (hasAllergyConflict && (!allergyOverrideAcknowledged || !allergyOverrideReason.trim())) {
      setConsultError('Complete the allergy override protocol before submitting.'); return;
    }
    const validMeds = medications.filter((m) => m.medicineName?.trim());
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
        ? { acknowledged: allergyOverrideAcknowledged, reason: allergyOverrideReason.trim(), overriddenAt: new Date().toISOString(), matchedAllergies: matchedAllergyConflicts.map((c) => c.allergy) }
        : undefined,
    };
    setEndVisitModalOpen(true);
  };

  const handleModalSave = async ({ clinicalTags, voiceNoteTranscript, followUpDate, followUpInstructions }) => {
    if (!pendingPayloadRef.current) return;
    setConsultSubmitting(true);
    setConsultError('');
    try {
      const payload = {
        ...pendingPayloadRef.current,
        clinicalTags,
        voiceNoteTranscript,
        followUpDate,
        followUpInstructions,
      };
      const response = await doctorApi.closeConsultationWithSummary(payload);
      setEndVisitModalOpen(false);
      if (onConsultationSaved) onConsultationSaved(response.data);
    } catch (err) {
      setConsultError(err.response?.data?.message || 'Failed to complete consultation.');
    } finally {
      setConsultSubmitting(false);
    }
  };

  const handleJoinVideoCall = async () => {
    setJoiningCall(true);
    try {
      await doctorApi.joinTeleconsult(appointment._id);
      setInVideoCall(true);
    } catch (err) {
      if (appointment?.teleconsultRoomId) setInVideoCall(true);
    } finally {
      setJoiningCall(false);
    }
  };

  const age = patient?.dob
    ? Math.floor((Date.now() - new Date(patient.dob)) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const isTeleconsult = appointment.status === 'Teleconsult Requested' || appointment.status === 'In Teleconsult' || appointment.teleconsultRoomId;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 1: Patient Header Strip
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Patient identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0">
              {patient.firstName?.[0] || 'P'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">{patientName}</h2>
                {appointment.urgency === 'Emergency' && (
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase">Emergency</span>
                )}
                {appointment.urgency === 'Urgent' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">Urgent</span>
                )}
                {appointment.queueNumber && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[9px] font-bold border border-sky-100">
                    #{appointment.queueNumber}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                {patient.gender && <span className="capitalize">{patient.gender}</span>}
                {age !== null && <><span>·</span><span>{age} yrs</span></>}
                {patient.uhid && (
                  <span className="font-mono text-violet-700 bg-violet-50 px-1.5 rounded text-[10px]">{patient.uhid}</span>
                )}
                {patient.bloodGroup && (
                  <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 rounded text-[10px]">{patient.bloodGroup}</span>
                )}
                {patientAllergies.length > 0 ? (
                  <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    Allergies: {patientAllergies.join(', ')}
                  </span>
                ) : (
                  <span className="text-slate-300">· No allergies</span>
                )}
                {hasCapturedVitals && (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                    <Activity className="w-3 h-3 text-emerald-500" />
                    {isAshaWorkerSource ? 'ASHA Vitals' : 'Vitals Recorded'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            {isTeleconsult && !inVideoCall && (
              <button
                type="button"
                id="join-video-call-btn"
                onClick={handleJoinVideoCall}
                disabled={joiningCall}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm shadow-violet-200 transition-all disabled:opacity-60"
              >
                {joiningCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {joiningCall ? 'Joining…' : 'Start Teleconsult'}
              </button>
            )}

            {inVideoCall && (
              <button
                type="button"
                onClick={() => setInVideoCall(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <VideoOff className="w-4 h-4" />
                Hide Video
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (!diagnosis.trim()) { setConsultError('Clinical Diagnosis is required.'); setActiveConsultTab('rx'); return; }
                handleCompleteConsultation(new Event('submit'));
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Completed
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          Live Teleconsult Video (inline when active)
      ═══════════════════════════════════════════════════════════════════════ */}
      {inVideoCall && (
        <div className="bg-slate-950 rounded-2xl p-3 border border-slate-700 shadow-xl overflow-hidden">
          <VideoRoom
            roomName={appointment.teleconsultRoomId || `sahay-room-${appointment._id}`}
            displayName={`Dr. ${patient.firstName || 'Doctor'}`}
            onClose={() => setInVideoCall(false)}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 2: AI Clinical Intelligence Card
      ═══════════════════════════════════════════════════════════════════════ */}
      <AiClinicalInsightCard
        patientId={patient?._id || patient?.id || (typeof appointment.patientId === 'string' ? appointment.patientId : appointment.patientId?._id) || ''}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 3: Clinical Tabs — Vitals & History | Lab Reports | Rx & Orders
      ═══════════════════════════════════════════════════════════════════════ */}
      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-slate-100 px-1 pt-1">
          {[
            {
              id: 'vitals',
              label: hasCapturedVitals ? (isAshaWorkerSource ? 'ASHA Vitals & History' : 'Triage Vitals & History') : 'Vitals & History',
              Icon: Activity,
              recorded: hasCapturedVitals,
            },
            {
              id: 'labReports',
              label: `Lab Reports (${displayOrders.length || appointment?.labOrders?.length || 0})`,
              Icon: FlaskConical,
              critical: hasCriticalLabOrders,
            },
            { id: 'rx',        label: 'Rx & Orders',     Icon: Pill },
          ].map(({ id, label, Icon, critical, recorded }) => (
            <button
              key={id}
              type="button"
              id={`consultation-tab-${id}`}
              onClick={() => setActiveConsultTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all -mb-px rounded-t-lg mr-1 ${
                activeConsultTab === id
                  ? critical
                    ? 'border-red-500 text-red-700 bg-red-50'
                    : 'border-sky-500 text-sky-700 bg-sky-50/50'
                  : critical
                  ? 'border-transparent text-red-600 bg-red-50/50 hover:bg-red-50 animate-pulse'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {recorded && activeConsultTab !== id && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
              {critical && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-black uppercase">Critical</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: Vitals & History ──────────────────────────────────────── */}
        {activeConsultTab === 'vitals' && (
          <div className="p-4 space-y-4">
            {/* Vitals grid */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${hasCapturedVitals ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {isAshaWorkerSource
                    ? 'Patient Vitals — Captured by ASHA Worker (Field Triage)'
                    : 'Triage Vitals — Captured by Clinical Staff'}
                </h4>
                {isAshaWorkerSource && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                    ASHA Teleconsult Input
                  </span>
                )}
              </div>

              {!hasCapturedVitals && (
                <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>No field vitals were recorded for this patient request (vitals entry is optional).</span>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <VitalCard
                  label="Blood Pressure"
                  value={vitals.bloodPressure || vitals.bp}
                  unit="mmHg"
                  Icon={Heart}
                  color="rose"
                />
                <VitalCard
                  label="Pulse"
                  value={vitals.pulse}
                  unit="bpm"
                  Icon={Activity}
                  color="sky"
                />
                <VitalCard
                  label="SpO2"
                  value={vitals.spO2}
                  unit="%"
                  Icon={Droplets}
                  color="emerald"
                />
                <VitalCard
                  label="Temperature"
                  value={vitals.temperature || vitals.temp}
                  unit="°F"
                  Icon={Thermometer}
                  color="amber"
                />
              </div>
              {/* Secondary vitals */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                <VitalCard label="Blood Sugar" value={vitals.bloodSugar} unit="mg/dL" Icon={Droplets} color="violet" />
                <VitalCard label="Weight" value={vitals.weight} unit="kg" Icon={Scale} color="sky" />
                {vitals.height && <VitalCard label="Height" value={vitals.height} unit="cm" Icon={User} color="sky" />}
              </div>

              {/* Vitals Notes / ASHA Field Observations */}
              {vitals.notes && (
                <div className="mt-3 p-3 rounded-xl bg-violet-50/70 border border-violet-200/80 text-xs text-violet-900">
                  <span className="font-bold text-[10px] uppercase tracking-wide text-violet-700 block mb-0.5">
                    Field Notes / Observations (ASHA Worker):
                  </span>
                  <p className="italic text-slate-700">{vitals.notes}</p>
                </div>
              )}
            </div>

            {/* Autonomous Clinical Voice Scribe (Native Web Speech API + Gemini LLM Auto-Fill) */}
            <ClinicalVoiceScribe
              onAutoFill={(responseData) => {
                if (!responseData) return;
                // Auto-fill React state variables that control form inputs (Requirement 3)
                if (responseData.final_diagnosis) {
                  setDiagnosis(responseData.final_diagnosis);
                }
                if (responseData.clinical_notes) {
                  setNotes(responseData.clinical_notes);
                }
                if (Array.isArray(responseData.chief_complaints) && responseData.chief_complaints.length) {
                  setChiefComplaint(responseData.chief_complaints.join(', '));
                }
                if (Array.isArray(responseData.medicines) && responseData.medicines.length) {
                  setMedications(
                    responseData.medicines.map((m) => ({
                      medicineName: m.name || m.medicineName || '',
                      dosage: m.dosage || '500mg',
                      frequency: m.frequency || 'Twice daily after meals',
                      duration: m.duration || '5 days',
                    }))
                  );
                }
              }}
              onApplySymptoms={(symptomsText) => {
                setChiefComplaint((prev) =>
                  prev ? `${prev}, ${symptomsText}` : symptomsText
                );
              }}
              onApplyMedicines={(meds) => {
                setMedications((prev) => {
                  const filteredExisting = prev.filter((p) => p.medicineName?.trim());
                  const existingNames = new Set(
                    filteredExisting.map((p) => p.medicineName.toLowerCase())
                  );
                  const newMeds = meds
                    .filter((m) => !existingNames.has(m.toLowerCase()))
                    .map((m) => ({
                      medicineName: m.charAt(0).toUpperCase() + m.slice(1),
                      dosage: '500mg',
                      frequency: 'Twice daily after meals',
                      duration: '5 days',
                    }));
                  return [...filteredExisting, ...newMeds];
                });
              }}
            />

            {/* Clinical evaluation form */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-sky-500" />
                Clinical Evaluation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Chief Complaints</label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Acute chest pain, shortness of breath"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Final Diagnosis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Bronchitis / Hypertension Stage II"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Clinical Notes & Observations</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detailed findings, auscultation, systemic examination remarks..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Lab Reports ──────────────────────────────────────────── */}
        {activeConsultTab === 'labReports' && (
          <div className="p-4 space-y-4">
            {/* Critical warning banner */}
            {hasCriticalLabOrders && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-600 text-white animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">Critical Out-of-Range Values Detected</p>
                  <p className="text-[11px] text-red-100 mt-0.5">One or more results fall outside reference limits. Evaluate highlighted metrics before prescribing.</p>
                </div>
              </div>
            )}

            {displayOrders.length > 0 ? (
              <div className="space-y-3">
                {displayOrders.map((order, idx) => {
                  const resultText  = order.result || order.resultURL || '';
                  const numericVal  = parseResultValue(resultText);
                  const refRange    = getTestReferenceRange(order.testName, catalog);
                  const isOutOfRange = Boolean(
                    order.isCritical || (refRange && numericVal !== null && (numericVal < refRange.min || numericVal > refRange.max))
                  );

                  return (
                    <div
                      key={order._id || idx}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isOutOfRange ? 'bg-red-50 border-red-300 ring-1 ring-red-300/70' : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Test name row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                            isOutOfRange ? 'bg-red-600 text-white' : 'bg-teal-100 text-teal-700'
                          }`}>{idx + 1}</span>
                          <h4 className="text-xs font-extrabold text-slate-900">{order.testName || 'Lab Test'}</h4>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            isOutOfRange ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isOutOfRange ? 'CRITICAL RESULT' : (order.status || 'Completed')}
                          </span>
                        </div>
                        {order.updatedAt && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(order.updatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>

                      {/* Numeric value row */}
                      {refRange && numericVal !== null && (
                        <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border ${
                          isOutOfRange ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Reported:</span>
                            <span className={`font-black text-sm ${isOutOfRange ? 'text-red-600' : 'text-emerald-700'}`}>
                              {numericVal} {refRange.unit}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              (Normal: {refRange.min}–{refRange.max} {refRange.unit})
                            </span>
                          </div>
                          {isOutOfRange && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black">
                              <AlertTriangle className="w-2.5 h-2.5" /> Out of Range
                            </span>
                          )}
                        </div>
                      )}

                      {/* Findings */}
                      <div className={`p-3 rounded-lg border ${isOutOfRange ? 'bg-white border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                        <p className={`text-[10px] uppercase font-bold mb-1 ${isOutOfRange ? 'text-red-700' : 'text-slate-400'}`}>
                          Findings & Interpretation
                        </p>
                        <p className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${isOutOfRange ? 'text-red-950 font-bold' : 'text-slate-700'}`}>
                          {order.result || 'No findings text provided.'}
                        </p>
                        {order.criticalReason && (
                          <p className="text-[11px] font-bold text-red-700 mt-1.5 pt-1.5 border-t border-red-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {order.criticalReason}
                          </p>
                        )}
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500">
                          {order.notes && <p><span className="font-semibold text-slate-700">Tech Remarks:</span> {order.notes}</p>}
                          {order.resultURL && (
                            <a
                              href={order.resultURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-bold underline text-xs mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Attached Document
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyResultToNotes(order)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            isOutOfRange
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200'
                              : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border-teal-200'
                          }`}
                        >
                          <Copy className="w-3 h-3" />
                          {copyFeedback === (order._id || 'copied') ? 'Appended!' : 'Copy to Notes'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Proceed button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveConsultTab('rx')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Proceed to Rx & Orders
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No Completed Lab Reports</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Reports appear here once uploaded by the Lab Head.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveConsultTab('rx')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                >
                  Go to Rx & Orders
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Rx & Orders ──────────────────────────────────────────── */}
        {activeConsultTab === 'rx' && (
          <div className="p-4 space-y-5">
            {/* ── Lab Investigation Order ──────────────────────────────── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <FlaskConical className="w-3.5 h-3.5" />
                </div>
                Order Lab Investigation
                <span className="text-[10px] font-normal text-slate-400 ml-1">→ Routes patient to Lab Pending</span>
              </h4>

              {labSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />{labSuccess}
                </div>
              )}
              {labError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {labError}
                </div>
              )}

              <form onSubmit={handleSendToLab} className="space-y-3">
                {/* Search dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); setLabError(''); }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (searchQuery.trim()) {
                              const matched = catalog.find((c) => matchesCatalogQuery(c, searchQuery.trim()));
                              if (matched) handleAddLabTest(matched); else handleAddLabTest(searchQuery.trim());
                            }
                          } else if (e.key === 'Escape') setIsDropdownOpen(false);
                        }}
                        placeholder="Search test catalog (CBC, ECG, Lipid Profile...)"
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen((v) => !v)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all"
                    >
                      Catalog
                    </button>
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-xs">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between border-b border-slate-100">
                        <span>Official Catalog</span>
                        <span>{catalog.filter((t) => matchesCatalogQuery(t, searchQuery.trim())).length} found</span>
                      </div>
                      {(() => {
                        const filtered = catalog.filter((t) => matchesCatalogQuery(t, searchQuery.trim()));
                        if (filtered.length === 0) return (
                          <div className="p-4 text-center text-slate-400">
                            <p className="font-semibold">No match for "{searchQuery}"</p>
                            <p className="text-[10px] mt-1">Free-text entries are not allowed.</p>
                          </div>
                        );
                        return filtered.map((testItem) => {
                          const testName = getCatalogItemName(testItem);
                          const isAdded  = labTests.some((t) => t.toLowerCase() === testName.toLowerCase());
                          return (
                            <button
                              key={testName}
                              type="button"
                              disabled={isAdded}
                              onClick={() => handleAddLabTest(testItem)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                                isAdded ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'hover:bg-amber-50 text-slate-800 cursor-pointer'
                              }`}
                            >
                              <span className="font-semibold">{testName}</span>
                              {isAdded
                                ? <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Added</span>
                                : <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">+ Add</span>
                              }
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Quick add pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Add:</span>
                  {catalog.slice(0, 8).map((preset) => {
                    const pName  = getCatalogItemName(preset);
                    const isAdded = labTests.some((t) => t.toLowerCase() === pName.toLowerCase());
                    return (
                      <button
                        key={pName}
                        type="button"
                        disabled={isAdded}
                        onClick={() => { if (!isAdded) handleAddLabTest(pName); }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-all ${
                          isAdded
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 cursor-pointer'
                        }`}
                      >
                        + {pName}
                      </button>
                    );
                  })}
                </div>

                {/* Added tests */}
                {labTests.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                        Tests to Order ({labTests.length})
                      </span>
                      <button type="button" onClick={() => setLabTests([])}
                        className="text-[10px] text-amber-700 font-semibold underline">
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {labTests.map((test, index) => (
                        <span
                          key={`${test}-${index}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-900 text-xs font-bold"
                        >
                          {test}
                          <button
                            type="button"
                            onClick={() => handleRemoveLabTest(index)}
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-amber-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={labNotes}
                    onChange={(e) => setLabNotes(e.target.value)}
                    placeholder="Lab instructions (e.g. STAT urgent, fasting required)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={labSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-60"
                  >
                    {labSubmitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Routing to Lab...</>
                    ) : (
                      <><ArrowRight className="w-3.5 h-3.5" /> Send to Lab & Update Status</>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* ── Prescription Section ─────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Pill className="w-3.5 h-3.5" />
                  </div>
                  Prescribe Medications
                  <span className="text-[10px] font-normal text-slate-400 ml-1">→ Marks appointment Completed</span>
                </h4>
                <button
                  type="button"
                  onClick={addMedicationRow}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 border border-emerald-100 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Medicine
                </button>
              </div>

              {consultError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{consultError}
                </div>
              )}

              {/* Allergy warning */}
              {hasAllergyConflict && (
                <div className="p-4 rounded-xl bg-rose-600 text-white space-y-3 border-2 border-rose-700">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      {matchedAllergyConflicts.map((conflict, idx) => (
                        <p key={idx} className="text-xs font-black uppercase tracking-wide">
                          WARNING: Patient allergic to {conflict.allergy} — prescribed: {conflict.prescribedDrug}
                        </p>
                      ))}
                      <p className="text-[11px] text-rose-100 mt-0.5">High risk of adverse drug reaction.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-400/50 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="allergy-override-checkbox"
                        checked={allergyOverrideAcknowledged}
                        onChange={(e) => setAllergyOverrideAcknowledged(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-rose-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white">I acknowledge this allergy warning and authorize this prescription.</span>
                    </label>
                    <input
                      type="text"
                      id="allergy-override-reason"
                      value={allergyOverrideReason}
                      onChange={(e) => setAllergyOverrideReason(e.target.value)}
                      placeholder="Clinical justification for override (required)..."
                      className="w-full px-3 py-2 rounded-lg bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleCompleteConsultation} className="space-y-3">
                {/* Medication rows */}
                <div className="space-y-2">
                  {medications.map((med, index) => {
                    const matchedAllergy = getMedAllergyMatch(med.medicineName);
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl border transition-all ${
                          matchedAllergy ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-4">
                            <input
                              type="text"
                              value={med.medicineName}
                              onChange={(e) => handleMedChange(index, 'medicineName', e.target.value)}
                              placeholder="Medicine Name"
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs placeholder-slate-400 focus:outline-none focus:ring-2 font-semibold ${
                                matchedAllergy ? 'border-rose-400 bg-white text-rose-900 focus:ring-rose-400' : 'border-slate-200 bg-white text-slate-800 focus:ring-emerald-400'
                              }`}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input type="text" value={med.dosage} onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                              placeholder="Dosage" className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                          <div className="sm:col-span-3">
                            <input type="text" value={med.frequency} onChange={(e) => handleMedChange(index, 'frequency', e.target.value)}
                              placeholder="Frequency" className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                          <div className="sm:col-span-2">
                            <input type="text" value={med.duration} onChange={(e) => handleMedChange(index, 'duration', e.target.value)}
                              placeholder="Duration" className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                          <div className="sm:col-span-1 flex justify-end">
                            <button type="button" onClick={() => removeMedicationRow(index)}
                              className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {matchedAllergy && (
                          <p className="mt-1.5 pt-1.5 border-t border-rose-200 text-[11px] font-bold text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Patient is allergic to "{matchedAllergy}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Patient Instructions</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Avoid cold food, stay hydrated, follow-up in 5 days"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  {hasAllergyConflict && (!allergyOverrideAcknowledged || !allergyOverrideReason.trim()) ? (
                    <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Complete override protocol above to enable submission.
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Completing consultation closes this queue item.</span>
                  )}

                  <button
                    type="submit"
                    id="submit-prescription-btn"
                    disabled={consultSubmitting || (hasAllergyConflict && (!allergyOverrideAcknowledged || !allergyOverrideReason.trim()))}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      hasAllergyConflict ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    }`}
                  >
                    {consultSubmitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalizing...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" />
                        {hasAllergyConflict ? 'Override & Complete' : 'Complete Consultation'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 4: Post-Consultation Action Bar
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          Quick Clinical Tags
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Dosage Adjusted', Icon: Tag },
            { label: 'Condition Improving', Icon: TrendingUp },
            { label: 'Routine Follow-up', Icon: Calendar },
            { label: 'Referred to Lab', Icon: FlaskConical },
          ].map(({ label, Icon }) => (
            <button
              key={label}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── End Visit Modal ───────────────────────────────────────────────── */}
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
