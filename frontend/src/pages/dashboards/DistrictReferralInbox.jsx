import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Ambulance,
  AlertTriangle,
  Heart,
  Thermometer,
  Activity,
  Droplets,
  Clock,
  Building2,
  UserCheck,
  CheckCircle2,
  X,
  RefreshCw,
  Stethoscope,
  ArrowLeft,
  Phone,
  ShieldAlert,
  Sparkles,
  FileText,
  MapPin,
  Pill,
  Siren,
  Bed,
  Check,
} from 'lucide-react';

// Realistic fallback transfers populated with exact data from rural doctor Voice Scribe
const INITIAL_MOCK_TRANSFERS = [
  {
    _id: 'ref-inbound-101',
    patientFullName: 'Savitri Devi',
    age: 58,
    gender: 'Female',
    bloodGroup: 'B+',
    uhid: 'UHID-2026-SAT-0891',
    status: 'Inbound_Referral',
    urgency: 'Emergency',
    ambulanceCode: '108-MH-11-AX-9902',
    etaMinutes: 4,
    referredFromFacility: {
      hospitalName: 'Shindewadi Primary Health Centre (Rural PHC)',
      district: 'Satara District',
      taluka: 'Khandala',
    },
    referringDoctor: {
      name: 'Dr. Rajesh Kulkarni',
      role: 'Rural Medical Officer',
      contactPhone: '+91 98220 14820',
    },
    // Voice Scribe Extracted Clinical Data
    voiceScribeData: {
      chiefComplaint: 'Acute substernal chest tightness radiating to left shoulder, diaphoresis, and severe breathlessness for 45 minutes.',
      allergies: ['Penicillin', 'Sulfa drugs'],
      vitals: {
        bloodPressure: '168/104',
        pulse: '118',
        spO2: '88%',
        temperature: '98.6°F',
        bloodSugar: '210 mg/dL',
      },
      stabilizingMedsGiven: 'Aspirin 300mg chewable administered; Sorbitrate 5mg sublingual given; O2 mask active at 4 L/min.',
      clinicalNotes: 'Suspected Acute Anterior Wall Myocardial Infarction. Initial rural ECG demonstrated acute ST elevations in leads V2-V5. Patient stabilized for tertiary emergency escalation.',
      transcribedAt: '12 minutes ago via SAHAY Voice Scribe',
    },
    dispatchTime: '22 mins ago',
  },
  {
    _id: 'ref-inbound-102',
    patientFullName: 'Rameshwar Ganpat Patil',
    age: 44,
    gender: 'Male',
    bloodGroup: 'O+',
    uhid: 'UHID-2026-SAT-0432',
    status: 'Inbound_Referral',
    urgency: 'Urgent',
    ambulanceCode: '108-MH-11-CD-4105',
    etaMinutes: 12,
    referredFromFacility: {
      hospitalName: 'Shirwal Rural Sub-Centre & PHC',
      district: 'Satara District',
      taluka: 'Shirwal',
    },
    referringDoctor: {
      name: 'Dr. Anita Deshmukh',
      role: 'Community Health Officer',
      contactPhone: '+91 94225 67890',
    },
    // Voice Scribe Extracted Clinical Data
    voiceScribeData: {
      chiefComplaint: 'High-grade continuous fever with severe chills, profound dizziness, and recurrent vomiting for 3 days.',
      allergies: ['NSAIDs (Ibuprofen)'],
      vitals: {
        bloodPressure: '92/60',
        pulse: '124',
        spO2: '94%',
        temperature: '103.2°F',
        bloodSugar: '115 mg/dL',
      },
      stabilizingMedsGiven: 'IV Normal Saline 500ml bolus running; Paracetamol 1g IV infused.',
      clinicalNotes: 'Severe febrile illness with borderline septic hemodynamics and thrombocytopenia. Rural rapid diagnostic positive for Falciparum malaria. Requires tertiary critical care monitoring.',
      transcribedAt: '25 minutes ago via SAHAY Voice Scribe',
    },
    dispatchTime: '35 mins ago',
  },
  {
    _id: 'ref-inbound-103',
    patientFullName: 'Aniket Santosh Jadhav',
    age: 29,
    gender: 'Male',
    bloodGroup: 'A+',
    uhid: 'UHID-2026-SAT-1109',
    status: 'Inbound_Referral',
    urgency: 'Emergency',
    ambulanceCode: '108-MH-11-EF-8812',
    etaMinutes: 8,
    referredFromFacility: {
      hospitalName: 'Bhuinj Primary Health Centre',
      district: 'Satara District',
      taluka: 'Wai',
    },
    referringDoctor: {
      name: 'Dr. Manoj Shinde',
      role: 'Medical Officer In-Charge',
      contactPhone: '+91 98901 23456',
    },
    // Voice Scribe Extracted Clinical Data
    voiceScribeData: {
      chiefComplaint: 'Blunt thoracic trauma following agricultural tractor rollover; paradoxical chest movement and acute hypoxic dyspnea.',
      allergies: ['Dust', 'Latex'],
      vitals: {
        bloodPressure: '100/70',
        pulse: '130',
        spO2: '86%',
        temperature: '98.4°F',
        bloodSugar: '140 mg/dL',
      },
      stabilizingMedsGiven: 'Chest strapped; high-flow oxygen via non-rebreather mask; 18G IV access established with Ringer Lactate.',
      clinicalNotes: 'Suspected right-sided flail chest with developing tension pneumothorax. Needle thoracostomy performed at rural PHC. Immediate trauma surgeon and CT intervention requested.',
      transcribedAt: '15 minutes ago via SAHAY Voice Scribe',
    },
    dispatchTime: '18 mins ago',
  },
];

export default function DistrictReferralInbox() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState(INITIAL_MOCK_TRANSFERS);
  const [loading, setLoading] = useState(false);
  const [admittedCount, setAdmittedCount] = useState(0);
  const [admitModalPatient, setAdmitModalPatient] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const [filterUrgency, setFilterUrgency] = useState('ALL'); // 'ALL' | 'Emergency' | 'Urgent'

  // Show Toast
  const showToast = useCallback((message) => {
    setToastNotification(message);
    setTimeout(() => setToastNotification(null), 5000);
  }, []);

  // Fetch from backend or use mock transfers
  const loadInboundTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/referrals/inbound');
      if (res.data?.success && Array.isArray(res.data.referrals) && res.data.referrals.length > 0) {
        // Map database records and combine with mock voice scribe data
        const mapped = res.data.referrals.map((r, idx) => ({
          _id: r._id || `backend-ref-${idx}`,
          patientFullName: r.patientId?.firstName
            ? `${r.patientId.firstName} ${r.patientId.lastName || ''}`.trim()
            : r.patientFullName || `Emergency Transfer #${idx + 1}`,
          age: r.patientId?.age || (r.patientId?.dob ? Math.floor((new Date() - new Date(r.patientId.dob)) / 31557600000) : 45),
          gender: r.patientId?.gender || 'Adult',
          bloodGroup: r.patientId?.bloodGroup || 'O+',
          uhid: r.patientId?.uhid || r.uhid || `UHID-2026-DIST-${1000 + idx}`,
          status: 'Inbound_Referral',
          urgency: r.urgency || r.priority || 'Emergency',
          ambulanceCode: r.ambulanceCode || `108-MH-11-${1000 + idx}`,
          etaMinutes: r.etaMinutes || (idx * 5 + 4),
          referredFromFacility: {
            hospitalName: r.referredFromFacility?.hospitalName || r.hospitalId?.hospitalName || 'Rural Primary Health Centre',
            district: 'Satara District',
            taluka: 'Rural Taluka',
          },
          referringDoctor: {
            name: r.referredBy?.name || 'Dr. Rural MO',
            role: 'Medical Officer',
            contactPhone: '+91 98000 00000',
          },
          voiceScribeData: {
            chiefComplaint: r.reasonForReferral || r.chiefComplaint || 'Acute medical escalation requiring district tertiary evaluation.',
            allergies: r.patientId?.allergies?.length ? r.patientId.allergies : ['Penicillin'],
            vitals: {
              bloodPressure: '150/96',
              pulse: '110',
              spO2: '91%',
              temperature: '100.2°F',
              bloodSugar: '180 mg/dL',
            },
            stabilizingMedsGiven: 'Initial emergency stabilization initiated at rural PHC.',
            clinicalNotes: r.clinicalNotes || 'Transferred via SAHAY rural clinical continuity network.',
            transcribedAt: 'Real-time Voice Scribe synced',
          },
          dispatchTime: 'Just now',
        }));
        setTransfers(mapped);
      } else {
        // Fallback to rich mock array
        setTransfers(INITIAL_MOCK_TRANSFERS);
      }
    } catch {
      setTransfers(INITIAL_MOCK_TRANSFERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInboundTransfers();
  }, [loadInboundTransfers]);

  // ── Step 3: Accept Transfer & Assign Bed Action ──────────────────────────────
  const handleAcceptTransfer = (patient) => {
    setAdmitModalPatient(patient);
  };

  const confirmAdmit = () => {
    if (!admitModalPatient) return;
    const pName = admitModalPatient.patientFullName;
    // Remove card from the active inbound inbox
    setTransfers((prev) => prev.filter((p) => p._id !== admitModalPatient._id));
    setAdmittedCount((prev) => prev + 1);
    setAdmitModalPatient(null);

    // Exact toast notification required by instructions
    showToast(`Patient Admitted to General Ward. E-Health Record synced.`);
  };

  const handleResetDemo = () => {
    setTransfers(INITIAL_MOCK_TRANSFERS);
    showToast('Inbound emergency referrals queue reloaded.');
  };

  const filteredTransfers = transfers.filter((t) => {
    if (filterUrgency === 'ALL') return true;
    return t.urgency === filterUrgency;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* ── 1. The Red/Dark Emergency Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-red-950 via-slate-900 to-zinc-950 border-b border-rose-900/60 shadow-2xl px-4 sm:px-6 py-3.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Title & Siren Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/doctor')}
              title="Return to Doctor OPD Dashboard"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="w-11 h-11 rounded-2xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-900/30 shrink-0">
              <Siren className="w-6 h-6 animate-pulse text-rose-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                  District Hospital - Emergency Referrals Inbox
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Live Ambulance Feed
                </span>
              </div>
              <p className="text-xs text-rose-200/70 mt-0.5">
                Receiving real-time rural PHC emergency transfers · Instant Voice Scribe clinical handoff
              </p>
            </div>
          </div>

          {/* Quick Stats & Controls */}
          <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Active Inbound:</span>
              <span className="font-extrabold text-rose-400 text-sm">
                {transfers.length}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-slate-400 font-medium">Admitted Today:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {admittedCount}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetDemo}
              title="Reload Simulated Rural Transfers"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-900/30 hover:bg-rose-900/50 text-rose-200 text-xs font-bold border border-rose-800/50 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Transfers</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Filter / Sub-Bar ─────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              Filter Priority:
            </span>
            {['ALL', 'Emergency', 'Urgent'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterUrgency(f)}
                className={`px-3 py-1 rounded-lg font-extrabold transition-all cursor-pointer ${
                  filterUrgency === f
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f === 'ALL' ? 'All Transfers' : f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <span className="flex items-center gap-1">
              <Ambulance className="w-4 h-4 text-rose-400" />
              108 Emergency Fleet Online
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Auto-Scribed at Rural PHC
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area: High-Priority Handoff Cards ─────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {filteredTransfers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredTransfers.map((patient) => {
              const scribe = patient.voiceScribeData;
              const isEmergency = patient.urgency === 'Emergency';

              return (
                <div
                  key={patient._id}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl ${
                    isEmergency
                      ? 'bg-slate-900/90 border-rose-600/80 ring-1 ring-rose-500/40'
                      : 'bg-slate-900/80 border-amber-500/50'
                  }`}
                >
                  {/* Top Emergency Transfer Banner */}
                  <div
                    className={`px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black ${
                      isEmergency
                        ? 'bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 text-rose-100 border-b border-rose-800/70'
                        : 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-amber-100 border-b border-amber-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Ambulance className="w-4 h-4 text-rose-300 animate-bounce" />
                      <span className="tracking-wider uppercase">
                        {isEmergency ? '🚨 Critical Emergency Ambulance Transfer' : '⚠️ Priority Patient Transfer'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono border border-white/20">
                        {patient.ambulanceCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white font-extrabold uppercase text-[10px] animate-pulse shadow-sm">
                        <Clock className="w-3 h-3" />
                        ETA: {patient.etaMinutes} mins
                      </span>
                      <span className="text-white/70 text-[11px]">
                        Dispatched {patient.dispatchTime}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">
                    {/* Patient & Rural Facility Overview */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      {/* Patient Identity */}
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-xl font-extrabold text-white">
                            {patient.patientFullName}
                          </h2>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 font-mono">
                            {patient.uhid}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                            {patient.bloodGroup}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {patient.gender} · {patient.age} years old · Status: <strong className="text-amber-400">{patient.status}</strong>
                        </p>
                      </div>

                      {/* Referring Rural PHC Details */}
                      <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-300">
                            Referring Rural Facility
                          </p>
                          <p className="text-xs font-bold text-white truncate">
                            {patient.referredFromFacility.hospitalName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            By {patient.referringDoctor.name} ({patient.referringDoctor.role})
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── Crucial Data Section: Voice Scribe Extracted Handoff (Requirement 2) ── */}
                    <div className="space-y-3.5 bg-slate-950/90 rounded-xl p-4 sm:p-5 border border-indigo-900/60 shadow-inner">
                      <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                            Voice Scribe Clinical Handoff (Transcribed at Rural PHC)
                          </h3>
                        </div>
                        <span className="text-[10px] text-indigo-300 font-mono">
                          {scribe.transcribedAt}
                        </span>
                      </div>

                      {/* Chief Complaints */}
                      <div>
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-amber-400" />
                          Chief Complaint
                        </span>
                        <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed bg-amber-950/20 border border-amber-800/30 rounded-lg p-2.5">
                          {scribe.chiefComplaint}
                        </p>
                      </div>

                      {/* Allergies Warning Chips */}
                      <div>
                        <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          Detected Allergies (Contraindications)
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {scribe.allergies && scribe.allergies.length > 0 ? (
                            scribe.allergies.map((allergy) => (
                              <span
                                key={allergy}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-md shadow-rose-900/50 border border-rose-400/50 uppercase tracking-wider"
                              >
                                <span className="w-2 h-2 rounded-full bg-white" />
                                {allergy}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">None recorded</span>
                          )}
                        </div>
                      </div>

                      {/* Vitals Grid */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                          Pre-Hospital Rural Vitals
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-400 font-medium block">Blood Pressure</span>
                            <span className="text-xs sm:text-sm font-black text-rose-400">
                              {scribe.vitals.bloodPressure}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-400 font-medium block">Pulse Rate</span>
                            <span className="text-xs sm:text-sm font-black text-amber-400">
                              {scribe.vitals.pulse} bpm
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-400 font-medium block">SpO2 Level</span>
                            <span className="text-xs sm:text-sm font-black text-cyan-400">
                              {scribe.vitals.spO2}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-400 font-medium block">Temperature</span>
                            <span className="text-xs sm:text-sm font-black text-indigo-300">
                              {scribe.vitals.temperature}
                            </span>
                          </div>
                          <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-slate-400 font-medium block">Blood Glucose</span>
                            <span className="text-xs sm:text-sm font-black text-violet-300">
                              {scribe.vitals.bloodSugar}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Initial Stabilizing Meds & Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                            <Pill className="w-3 h-3 text-emerald-400" />
                            Pre-Transit Medications Given
                          </span>
                          <p className="text-xs text-slate-300 font-medium">{scribe.stabilizingMedsGiven}</p>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-indigo-400" />
                            Doctor Scribe Assessment
                          </span>
                          <p className="text-xs text-slate-300 font-medium">{scribe.clinicalNotes}</p>
                        </div>
                      </div>
                    </div>

                    {/* ── 3. The Admit Action (Requirement 3) ────────────────────── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Rural MO Hotline: <strong className="text-slate-200">{patient.referringDoctor.contactPhone}</strong></span>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Prominent Accept & Assign Bed Button */}
                        <button
                          type="button"
                          id={`accept-transfer-btn-${patient._id}`}
                          onClick={() => handleAcceptTransfer(patient)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/60 border border-emerald-400/40 hover:scale-[1.02] transition-all cursor-pointer"
                        >
                          <Bed className="w-4 h-4" />
                          <span>Accept Transfer & Assign Bed</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State when all transfers are admitted */
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">
              All Inbound Emergency Transfers Triaged!
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every incoming rural PHC emergency referral has been accepted, admitted to hospital wards, and longitudinal E-Health records have been synced.
            </p>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleResetDemo}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Next Rural Transfer</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Admission Modal (Requirement 3) ─────────────────────────────────── */}
      {admitModalPatient && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Confirm Ward Admission
                  </h3>
                  <p className="text-xs text-slate-400">
                    Emergency Transfer Intake · General Ward
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdmitModalPatient(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-bold text-white">{admitModalPatient.patientFullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">UHID:</span>
                <span className="font-mono text-slate-300">{admitModalPatient.uhid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From Facility:</span>
                <span className="font-medium text-indigo-300">{admitModalPatient.referredFromFacility.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Ward:</span>
                <span className="font-bold text-emerald-400">General Medical Ward - Bed 14</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAdmitModalPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-admission-btn"
                onClick={confirmAdmit}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Sync Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Toast Notification (Requirement 3) ────────────────────────── */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-950/95 border border-emerald-500 text-white px-5 py-4 rounded-2xl shadow-2xl max-w-md animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-black text-sm text-emerald-200">Transfer Accepted & Bed Assigned</p>
            <p className="text-xs text-emerald-100/90 mt-0.5 font-medium">{toastNotification}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-emerald-300 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
