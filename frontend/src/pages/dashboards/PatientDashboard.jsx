import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import patientApi from '../../services/patientApi';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`bg-white rounded-2xl border ${color.border} p-4 flex items-center gap-3.5 shadow-sm`}>
      <div className={`w-11 h-11 rounded-xl ${color.icon} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className={`text-xl font-extrabold ${color.text} leading-tight`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'prescriptions' | 'labs' | 'hospitals'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/patient');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Patient') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/patient');
  };

  // ── Fetch Longitudinal Medical Records (Prompt 9.3) ─────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await patientApi.getMyMedicalRecords();
      const data = res.data;
      setPatientData(data.patient || {});
      setHospitals(data.hospitalsVisited || []);
      setTimeline(data.timeline || []);
      setConsultations(data.consultations || []);
      setPrescriptions(data.prescriptions || []);
      setLabOrders(data.labOrders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load medical history records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user, fetchRecords]);

  if (!user) return null;

  // Display computations
  const fullName = patientData?.firstName
    ? `${patientData.firstName} ${patientData.lastName || ''}`.trim()
    : user.name || 'Citizen';

  const abhaId = patientData?.abhaId || (user._id ? `SAHAY-${user._id.slice(-8).toUpperCase()}` : '—');
  const bloodGroup = patientData?.bloodGroup || 'O+';
  const age = patientData?.dob
    ? Math.floor((new Date() - new Date(patientData.dob)) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // ── Prompt 14.2: Group records by Hospital → Doctor ─────────────────────────
  // Returns: { "Hospital Name": { "Dr. Firstname Lastname": [ record1, record2 ] } }
  const groupByHospitalAndDoctor = (records) => {
    return records.reduce((acc, record) => {
      // Resolve hospital name with fallback
      const facility = record.facilityId || record.hospital;
      let hospitalName = 'Unknown Hospital';
      if (facility) {
        if (typeof facility === 'string') {
          hospitalName = facility;
        } else {
          hospitalName = facility.hospitalName || facility.name || 'Unknown Hospital';
        }
      }

      // Resolve doctor name with fallback
      const doc = record.doctorId || record.doctor;
      let doctorName = 'General Consulting';
      if (doc) {
        if (typeof doc === 'string') {
          doctorName = doc.startsWith('Dr.') ? doc : `Dr. ${doc}`;
        } else if (doc.firstName || doc.lastName) {
          doctorName = `Dr. ${(doc.firstName || '')} ${(doc.lastName || '')}`.trim();
        } else if (doc.name) {
          doctorName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
        }
      }

      if (!acc[hospitalName]) {
        acc[hospitalName] = {};
      }
      if (!acc[hospitalName][doctorName]) {
        acc[hospitalName][doctorName] = [];
      }
      acc[hospitalName][doctorName].push(record);
      return acc;
    }, {});
  };

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50 px-4 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Citizen ABHA Health ID Card Banner (Step 5) ─────────────────── */}
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle watermarks */}
          <div className="absolute -right-8 -bottom-8 w-56 h-56 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
          <div className="absolute right-12 top-4 opacity-10 text-8xl font-black select-none pointer-events-none">
            ABDM
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shrink-0">
                {fullName?.[0] || 'P'}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                    {fullName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                    ✓ Verified Citizen
                  </span>
                </div>

                <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                  {patientData?.gender && <span className="capitalize">{patientData.gender}</span>}
                  {age !== null && <span>· {age} years</span>}
                  {bloodGroup && (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      Blood: {bloodGroup}
                    </span>
                  )}
                  {patientData?.contactPhone && <span>· 📞 {patientData.contactPhone}</span>}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 backdrop-blur-sm">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-sky-200">
                      Ayushman Bharat Health Account (ABHA)
                    </p>
                    <p className="text-sm font-mono font-black text-white tracking-widest mt-0.5">
                      {abhaId}
                    </p>
                  </div>

                  {patientData?.address && (
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      📍 {[patientData.address.village, patientData.address.district, patientData.address.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
              <button
                onClick={fetchRecords}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 backdrop-blur-sm disabled:opacity-50"
              >
                Sync Records
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/40"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* ── Longitudinal Summary Stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            label="Hospitals Visited"
            value={hospitals.length}
            sub="Registered facilities"
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-700', text: 'text-sky-800' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            label="OPD Consultations"
            value={consultations.length}
            sub="Doctor sessions"
            color={{ border: 'border-indigo-100', icon: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-800' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            label="Digital Prescriptions"
            value={prescriptions.length}
            sub="Medication orders"
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-800' }}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
            label="Diagnostic Reports"
            value={labOrders.length}
            sub="Laboratory tests"
            color={{ border: 'border-purple-100', icon: 'bg-purple-100 text-purple-700', text: 'text-purple-800' }}
          />
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchRecords} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* ── Tabbed Records Navigation (Prompt 9.3) ───────────────────────── */}
        <div className="flex flex-wrap items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm gap-2">
          {[
            { id: 'timeline', label: 'Medical History Timeline', count: timeline.length, icon: '📅' },
            { id: 'prescriptions', label: 'Digital Prescriptions', count: prescriptions.length, icon: '💊' },
            { id: 'labs', label: 'Diagnostic Lab Reports', count: labOrders.length, icon: '🔬' },
            { id: 'hospitals', label: 'Hospitals Visited', count: hospitals.length, icon: '🏥' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tab Content Views ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* TAB 1: Unified Chronological Medical Timeline */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Longitudinal Medical Timeline
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chronological healthcare history across all visited medical centers
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-xl border border-sky-100">
                  ABDM Longitudinal View
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <span className="text-3xl">📋</span>
                  <p className="text-xs font-bold text-slate-700 mt-2">No Past Medical Records Found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your check-up visits, prescriptions, and lab tests will populate automatically here.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-0.5 before:bg-slate-200">
                  {timeline.map((event, idx) => {
                    const isConsult = event.type === 'CONSULTATION';
                    const isRx = event.type === 'PRESCRIPTION';
                    const isLab = event.type === 'LAB_REPORT';

                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline Node Dot */}
                        <div
                          className={`absolute -left-[29px] top-3 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[8px] ${
                            isConsult
                              ? 'bg-indigo-600 text-white'
                              : isRx
                              ? 'bg-emerald-600 text-white'
                              : 'bg-purple-600 text-white'
                          }`}
                        />

                        {/* Event Card */}
                        <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                                  isConsult
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : isRx
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {isConsult ? 'Doctor OPD Visit' : isRx ? 'Prescription' : 'Lab Test'}
                              </span>
                              <h4 className="text-xs font-extrabold text-slate-900">{event.title}</h4>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(event.date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Hospital & Doctor Tag */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2">
                            {event.facility?.hospitalName && (
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <span>🏥</span>
                                <span>{event.facility.hospitalName}</span>
                              </span>
                            )}
                            {event.doctor?.name && (
                              <span className="flex items-center gap-1">
                                <span>👨‍⚕️</span>
                                <span>Dr. {event.doctor.name}</span>
                              </span>
                            )}
                          </div>

                          {/* Specific Content Details */}
                          {isConsult && (
                            <div className="mt-2 text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                              {event.chiefComplaint && (
                                <p>
                                  <strong className="text-slate-500 text-[10px] uppercase">Complaint:</strong>{' '}
                                  {event.chiefComplaint}
                                </p>
                              )}
                              {event.notes && (
                                <p>
                                  <strong className="text-slate-500 text-[10px] uppercase">Clinical Notes:</strong>{' '}
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          )}

                          {isLab && (
                            <div className="mt-2 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                              <p className="font-mono text-[11px] whitespace-pre-wrap">
                                <strong className="text-purple-700">Findings:</strong> {event.result || 'Processing'}
                              </p>
                              {event.notes && <p className="text-[10px] text-slate-500 italic">{event.notes}</p>}
                            </div>
                          )}

                          {isRx && event.medications?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {event.medications.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold"
                                >
                                  💊 {m.medicineName || m.drugName} ({m.dosage || 'Std'})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Digital Prescriptions (Prompt 14.2 — grouped by Hospital → Doctor) */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              {prescriptions.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                  <span className="text-3xl">💊</span>
                  <p className="text-xs font-bold text-slate-700 mt-2">No Digital Prescriptions on File</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Prescribed medicines from consultations will be organized here.
                  </p>
                </div>
              ) : (
                (() => {
                  const grouped = groupByHospitalAndDoctor(prescriptions);
                  return Object.keys(grouped).map((hospitalName) => (
                    <div key={hospitalName} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Hospital Header */}
                      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border-b border-sky-100 px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-lg shrink-0">
                          🏥
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">{hospitalName}</h3>
                          <p className="text-[11px] text-slate-500">
                            {Object.values(grouped[hospitalName]).flat().length} prescription(s) from this facility
                          </p>
                        </div>
                      </div>

                      {/* Doctor Sub-groups */}
                      <div className="divide-y divide-slate-100">
                        {Object.keys(grouped[hospitalName]).map((doctorName) => (
                          <div key={doctorName} className="px-6 py-4">
                            {/* Doctor Sub-header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">👨‍⚕️</span>
                              <span className="text-xs font-bold text-indigo-900">{doctorName}</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                                {grouped[hospitalName][doctorName].length} Rx
                              </span>
                            </div>

                            {/* Prescriptions under this doctor */}
                            <div className="space-y-4 ml-9">
                              {grouped[hospitalName][doctorName].map((rx) => (
                                <div key={rx._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-extrabold text-slate-900">
                                        Prescription #{rx._id.slice(-6).toUpperCase()}
                                      </h4>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          rx.status === 'Dispensed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {rx.status === 'Dispensed' ? '✓ Dispensed' : '● Pending'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      {new Date(rx.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>

                                  {/* Medications Table */}
                                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="bg-slate-100/60 px-4 py-2 grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                      <div className="col-span-5">Medicine</div>
                                      <div className="col-span-2">Dosage</div>
                                      <div className="col-span-3">Frequency</div>
                                      <div className="col-span-2">Duration</div>
                                    </div>
                                    {(rx.medications || []).map((med, idx) => (
                                      <div key={idx} className="px-4 py-2.5 grid grid-cols-12 text-xs items-center">
                                        <div className="col-span-5 font-bold text-slate-900">
                                          {med.medicineName || med.drugName || 'Medicine'}
                                          {med.instructions && (
                                            <p className="text-[10px] font-normal text-slate-500 italic mt-0.5">
                                              {med.instructions}
                                            </p>
                                          )}
                                        </div>
                                        <div className="col-span-2 font-mono text-slate-600">{med.dosage || '—'}</div>
                                        <div className="col-span-3 text-slate-600">
                                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                            {med.frequency || 'As advised'}
                                          </span>
                                        </div>
                                        <div className="col-span-2 font-semibold text-slate-700">{med.duration || 'Standard'}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {rx.instructions && (
                                    <div className="bg-white p-3 rounded-xl text-xs text-slate-600 border border-slate-100">
                                      <span className="font-bold text-slate-500 text-[10px] uppercase mr-1">Instructions:</span>
                                      {rx.instructions}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          )}

          {/* TAB 3: Diagnostic Lab Reports (Prompt 14.2 — grouped by Hospital → Doctor) */}
          {activeTab === 'labs' && (
            <div className="space-y-4">
              {labOrders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400">
                  <span className="text-3xl">🔬</span>
                  <p className="text-xs font-bold text-slate-700 mt-2">No Diagnostic Reports on File</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Laboratory tests and investigation reports will appear here when completed.
                  </p>
                </div>
              ) : (
                (() => {
                  const grouped = groupByHospitalAndDoctor(labOrders);
                  return Object.keys(grouped).map((hospitalName) => (
                    <div key={hospitalName} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Hospital Header */}
                      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border-b border-purple-100 px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0">
                          🏥
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">{hospitalName}</h3>
                          <p className="text-[11px] text-slate-500">
                            {Object.values(grouped[hospitalName]).flat().length} lab report(s) from this facility
                          </p>
                        </div>
                      </div>

                      {/* Doctor Sub-groups */}
                      <div className="divide-y divide-slate-100">
                        {Object.keys(grouped[hospitalName]).map((doctorName) => (
                          <div key={doctorName} className="px-6 py-4">
                            {/* Doctor Sub-header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs">👨‍⚕️</span>
                              <span className="text-xs font-bold text-purple-900">{doctorName}</span>
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold border border-purple-100">
                                {grouped[hospitalName][doctorName].length} test(s)
                              </span>
                            </div>

                            {/* Lab orders under this doctor */}
                            <div className="space-y-3 ml-9">
                              {grouped[hospitalName][doctorName].map((lab) => (
                                <div key={lab._id} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-extrabold text-slate-900">{lab.testName}</h4>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          lab.status === 'Completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}
                                      >
                                        {lab.status || 'Completed'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {new Date(lab.updatedAt || lab.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                      </span>
                                      {lab.resultURL && (
                                        <a
                                          href={lab.resultURL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[10px] font-bold transition-all border border-sky-200"
                                        >
                                          📄 View PDF
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Result Findings */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                                      Diagnostic Findings & Test Observations:
                                    </p>
                                    <p className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                                      {lab.result || 'No formal narrative text uploaded for this test.'}
                                    </p>
                                  </div>

                                  {lab.notes && (
                                    <p className="text-xs text-slate-500 italic">
                                      <span className="font-semibold text-slate-700">Technician Remarks:</span> {lab.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          )}

          {/* TAB 4: Hospitals Visited (Prompt 9.3) */}
          {activeTab === 'hospitals' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">
                  Registered Healthcare Facilities Visited ({hospitals.length})
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Unique clinics and hospitals associated with your Ayushman Bharat Health Account
                </p>

                {hospitals.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <span className="text-3xl">🏥</span>
                    <p className="text-xs font-bold text-slate-700 mt-2">No Hospital History Yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Facilities you check into will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hospitals.map((fac) => (
                      <div
                        key={fac._id}
                        className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-lg shrink-0">
                            🏥
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {fac.hospitalName}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {typeof fac.address === 'object'
                                ? [fac.address.village, fac.address.district, fac.address.state].filter(Boolean).join(', ')
                                : fac.address || 'Address recorded'}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Visits recorded: <strong className="text-slate-700">{fac.visitCount || 1}</strong></span>
                          {fac.lastVisit && (
                            <span>Last visit: {new Date(fac.lastVisit).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
