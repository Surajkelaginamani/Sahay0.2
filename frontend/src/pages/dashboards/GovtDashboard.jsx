import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { govtAPI } from '../../services/api';
import { AlertTriangle, Hospital } from 'lucide-react';
import EpidemicRadar from '../../components/EpidemicRadar';

// ─── Toast Notification Component ───────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-medium pointer-events-auto transition-all duration-300
            ${
              toast.type === 'success'
                ? 'bg-white border-mint-200 text-mint-900'
                : 'bg-white border-rose-200 text-rose-900'
            }`}
        >
          <div
            className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
              toast.type === 'success'
                ? 'bg-mint-100 text-mint-600'
                : 'bg-rose-100 text-rose-600'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{toast.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-700 ml-1 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, subtitle, iconBg, iconColor, badge, loading }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4 shadow-xs hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-extrabold text-gov-900 tabular-nums">
            {loading ? <span className="inline-block w-12 h-6 bg-slate-100 rounded animate-pulse" /> : value}
          </p>
          {badge && !loading && value > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
              Attention
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-700 mt-0.5">{label}</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Audit Log Row (mock for Tab 3) ──────────────────────────────────────────
const MOCK_AUDIT_EVENTS = [
  { id: 1, time: '09:42 AM', actor: 'Dr. Priya Sharma', role: 'Doctor', facility: 'AIIMS Delhi', action: 'Viewed patient record', resource: 'Patient #UHD-00123', severity: 'info' },
  { id: 2, time: '09:38 AM', actor: 'Govt. Officer Ravi', role: 'GovtEmployee', facility: 'NHM HQ', action: 'Approved hospital registration', resource: 'City Hospital, Lucknow', severity: 'success' },
  { id: 3, time: '09:21 AM', actor: 'Nurse Anita', role: 'Nurse', facility: 'AIIMS Delhi', action: 'Updated vitals record', resource: 'Patient #UHD-00456', severity: 'info' },
  { id: 4, time: '08:55 AM', actor: 'Admin Suresh', role: 'HospitalAdmin', facility: 'Apollo Hospitals', action: 'Created staff account', resource: 'Dr. Meena (Doctor)', severity: 'info' },
  { id: 5, time: '08:47 AM', actor: 'Unknown IP', role: '—', facility: '—', action: 'Failed login attempt', resource: '/api/govt/login', severity: 'warning' },
  { id: 6, time: '08:30 AM', actor: 'Pharmacist Ram', role: 'Pharmacist', facility: 'Apollo Hospitals', action: 'Dispensed prescription', resource: 'Rx #RX-7734', severity: 'info' },
  { id: 7, time: '08:15 AM', actor: 'Receptionist Kavya', role: 'Receptionist', facility: 'City Hospital', action: 'Registered new patient', resource: 'Patient #UHD-00789', severity: 'success' },
  { id: 8, time: '07:58 AM', actor: 'Govt. Officer Ravi', role: 'GovtEmployee', facility: 'NHM HQ', action: 'Rejected hospital registration', resource: 'Sunrise Clinic, Kanpur', severity: 'error' },
];

const SEVERITY_STYLES = {
  info:    'bg-sky-50 text-sky-700 border-sky-200',
  success: 'bg-mint-50 text-mint-700 border-mint-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error:   'bg-rose-50 text-rose-700 border-rose-200',
};
const SEVERITY_DOT = {
  info:    'bg-sky-500',
  success: 'bg-mint-500',
  warning: 'bg-amber-500',
  error:   'bg-rose-500',
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function GovtDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);

  // ── Active Tab ──
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'directory' | 'audit'

  // ── Metrics ──
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // ── Pending hospitals ──
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [fetchError, setFetchError] = useState('');

  // ── Accredited facilities ──
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitySearch, setFacilitySearch] = useState('');
  const [facilitiesLoaded, setFacilitiesLoaded] = useState(false);

  // ── Toasts ──
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── JWT Guard ──
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');

    if (!token || !stored) { navigate('/auth/govt'); return; }

    if (!localStorage.getItem('token')) localStorage.setItem('token', token);
    if (!localStorage.getItem('sahay_token')) localStorage.setItem('sahay_token', token);

    try {
      const parsed = JSON.parse(stored);
      if (parsed.role !== 'GovtEmployee') { navigate('/'); return; }
      setUser(parsed);
    } catch (e) {
      navigate('/auth/govt');
    }
  }, [navigate]);

  // ── Fetch Metrics ──
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await govtAPI.getDashboardMetrics();
      setMetrics(res.data.metrics);
    } catch (err) {
      console.error('Metrics fetch failed:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // ── Fetch Pending Hospitals ──
  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    setFetchError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
      if (token && !localStorage.getItem('token')) localStorage.setItem('token', token);

      const res = await axios.get('http://localhost:5000/api/govt/pending-hospitals', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const hospitals = Array.isArray(res.data)
        ? res.data
        : (res.data?.hospitals || res.data?.pendingHospitals || []);
      setPendingHospitals(hospitals);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load pending hospitals';
      setFetchError(msg);
      if (err.response?.status === 401) {
        ['token','sahay_token','user','sahay_user'].forEach((k) => localStorage.removeItem(k));
        navigate('/auth/govt');
      }
    } finally {
      setPendingLoading(false);
    }
  }, [navigate]);

  // ── Fetch Accredited Facilities ──
  const fetchFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    try {
      const res = await govtAPI.getFacilities('APPROVED');
      setFacilities(res.data.facilities || []);
      setFacilitiesLoaded(true);
    } catch (err) {
      console.error('Facilities fetch failed:', err);
      addToast('error', 'Load Failed', 'Could not fetch accredited hospitals directory.');
    } finally {
      setFacilitiesLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      fetchPending();
    }
  }, [user, fetchMetrics, fetchPending]);

  // Load facilities when tab is first switched to
  useEffect(() => {
    if (activeTab === 'directory' && user && !facilitiesLoaded) {
      fetchFacilities();
    }
  }, [activeTab, user, facilitiesLoaded, fetchFacilities]);

  // ── Approve / Reject ──
  const handleVerify = async (hospital, status) => {
    setActionLoading(hospital._id);
    try {
      await govtAPI.verifyHospital(hospital._id, status);
      setPendingHospitals((prev) => prev.filter((h) => h._id !== hospital._id));
      // Invalidate metrics & facilities cache
      fetchMetrics();
      setFacilitiesLoaded(false);

      if (status === 'approved') {
        addToast('success', 'Facility Approved', `"${hospital.hospitalName}" has been accredited and granted system access.`);
      } else {
        addToast('error', 'Registration Rejected', `"${hospital.hospitalName}" (Reg: ${hospital.registrationNumber}) registration has been rejected.`);
      }
    } catch (err) {
      addToast('error', 'Action Failed', err.response?.data?.message || 'Verification update failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    ['token','sahay_token','user','sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/');
  };

  // ── Filtered facilities ──
  const filteredFacilities = facilities.filter((f) => {
    const q = facilitySearch.toLowerCase();
    return (
      !q ||
      f.facilityName?.toLowerCase().includes(q) ||
      f.district?.toLowerCase().includes(q) ||
      f.state?.toLowerCase().includes(q) ||
      f.facilityId?.toLowerCase().includes(q)
    );
  });

  if (!user) return null;

  // ── Tab definitions ──
  const TABS = [
    {
      id: 'pending',
      label: 'Pending Approvals',
      badge: pendingHospitals.length > 0 ? pendingHospitals.length : null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'directory',
      label: 'Accredited Hospitals',
      badge: null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'audit',
      label: 'Security & Audit Trail',
      badge: null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gov-800 to-gov-900 text-white flex items-center justify-center shadow-md">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gov-900 tracking-tight">
                  State Health Regulatory Dashboard
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gov-900 text-white">
                  Govt. Officer
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Signed in as <strong className="text-slate-700">{user.name}</strong> &nbsp;·&nbsp;
                {user.email} &nbsp;·&nbsp; Role:{' '}
                <span className="text-gov-navy font-semibold">{user.role}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* ── High-Priority Geospatial Epidemic Radar ───────────────────────── */}
        <EpidemicRadar className="mb-6" />

        {/* ── Metric Stat Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            loading={metricsLoading}
            value={metrics?.approvedHospitals ?? 0}
            label="Approved Facilities"
            subtitle="Licensed & Active"
            iconBg="bg-mint-100"
            iconColor="text-mint-600"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            loading={metricsLoading}
            value={metrics?.totalPatients ?? 0}
            label="Registered Citizens"
            subtitle="Total UHIDs Generated"
            iconBg="bg-sky-100"
            iconColor="text-sky-600"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            loading={metricsLoading}
            value={metrics?.totalConsultations ?? 0}
            label="Consultations Completed"
            subtitle="Teleconsult & OPD Visits"
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
          <StatCard
            loading={metricsLoading}
            value={metrics?.pendingHospitals ?? 0}
            label="Pending Accreditations"
            subtitle="Awaiting Review"
            badge
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center gap-0 border-b border-slate-200 px-2 pt-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-gov-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-gov-900 hover:bg-slate-50'
                  }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge != null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab 1: Pending Approvals Queue ──────────────────────────────── */}
          {activeTab === 'pending' && (
            <div>
              <div className="px-6 sm:px-8 py-5 flex items-center justify-between flex-wrap gap-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-gov-900">Pending Hospital Accreditation Queue</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Review and grant or revoke operating authorization for healthcare facilities.</p>
                </div>
                <button
                  onClick={fetchPending}
                  disabled={pendingLoading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${pendingLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Queue
                </button>
              </div>

              {pendingLoading ? (
                <div className="px-8 py-16 text-center">
                  <span className="inline-block w-8 h-8 border-2 border-slate-300 border-t-gov-900 rounded-full animate-spin mb-3" />
                  <p className="text-sm text-slate-500">Fetching applications from registry...</p>
                </div>
              ) : fetchError ? (
                <div className="px-8 py-16 text-center space-y-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                  <p className="text-sm font-semibold text-slate-800">Failed to Load</p>
                  <p className="text-xs text-slate-500">{fetchError}</p>
                  <button onClick={fetchPending} className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-gov-900 rounded-xl hover:bg-black transition-colors">Retry</button>
                </div>
              ) : pendingHospitals.length === 0 ? (
                <div className="px-8 py-16 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-mint-50 border-2 border-mint-200 text-mint-600 flex items-center justify-center">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">All Applications Reviewed</h4>
                    <p className="text-xs text-slate-500 mt-1">No hospitals are currently awaiting accreditation.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        {['Hospital Name','Reg. Number','Contact Phone','Address','Admin Email','Status','Actions'].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingHospitals.map((hospital) => {
                        const isProcessing = actionLoading === hospital._id;
                        return (
                          <tr key={hospital._id} className={`group transition-colors ${isProcessing ? 'bg-amber-50/60 opacity-60' : 'hover:bg-slate-50/70'}`}>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {hospital.hospitalName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gov-900 text-sm">{hospital.hospitalName}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">ID: {hospital._id.slice(-6).toUpperCase()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{hospital.registrationNumber}</span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">{hospital.contactPhone}</td>
                            <td className="px-4 py-4 text-xs text-slate-600 max-w-[200px]"><span className="line-clamp-2">{hospital.address}</span></td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600">{hospital.adminEmail}</td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Pending
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              {isProcessing ? (
                                <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                                  <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                                  Processing...
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleVerify(hospital, 'approved')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-mint-600 hover:bg-mint-700 rounded-xl shadow-xs transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    Approve
                                  </button>
                                  <button onClick={() => handleVerify(hospital, 'rejected')} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {pendingHospitals.length > 0 && (
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                      <span>Showing <strong>{pendingHospitals.length}</strong> pending application(s)</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />
                        Live Registry Feed
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 2: Accredited Hospitals Directory ───────────────────────── */}
          {activeTab === 'directory' && (
            <div>
              <div className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-gov-900">Accredited Hospitals Directory</h2>
                  <p className="text-xs text-slate-500 mt-0.5">All licensed and government-approved healthcare facilities.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 sm:flex-none">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      id="facility-search"
                      type="text"
                      placeholder="Search by name or district…"
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                      className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-gov-900/20 focus:border-gov-900 w-full sm:w-64 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => { setFacilitiesLoaded(false); fetchFacilities(); }}
                    disabled={facilitiesLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  >
                    <svg className={`w-3.5 h-3.5 ${facilitiesLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {facilitiesLoading ? (
                <div className="px-8 py-16 text-center">
                  <span className="inline-block w-8 h-8 border-2 border-slate-300 border-t-gov-900 rounded-full animate-spin mb-3" />
                  <p className="text-sm text-slate-500">Loading accredited facilities...</p>
                </div>
              ) : filteredFacilities.length === 0 ? (
                <div className="px-8 py-16 text-center space-y-2">
                  <div><Hospital className="w-8 h-8 text-slate-600" /></div>
                  <p className="text-sm font-semibold text-slate-700">
                    {facilitySearch ? 'No matching facilities found' : 'No accredited hospitals yet'}
                  </p>
                  <p className="text-xs text-slate-400">{facilitySearch ? 'Try a different search term.' : 'Approved hospitals will appear here.'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        {['Facility Name','Facility Code','District / State','Contact Email','Accredited On','Status','Action'].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFacilities.map((f) => (
                        <tr key={f._id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-mint-100 text-mint-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {(f.facilityName || 'H').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gov-900 text-sm">{f.facilityName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{f.facilityId}</span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600">
                            <p className="font-medium text-slate-700">{f.district}</p>
                            <p className="text-slate-400">{f.state}</p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-600">{f.contactEmail}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                            {f.accreditationDate
                              ? new Date(f.accreditationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 border border-mint-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gov-900 border border-gov-900/20 hover:bg-gov-900 hover:text-white rounded-lg transition-all">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Inspect / Audit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing <strong>{filteredFacilities.length}</strong> of <strong>{facilities.length}</strong> accredited facilit{facilities.length !== 1 ? 'ies' : 'y'}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-mint-500" />
                      Accredited & Licensed
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 3: System Security & Audit Trail ────────────────────────── */}
          {activeTab === 'audit' && (
            <div>
              <div className="px-6 sm:px-8 py-5 flex items-center justify-between flex-wrap gap-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-gov-900">System Security & Audit Trail</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Administrative and clinical access events across all registered facilities.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 border border-mint-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-pulse" />
                    Live Feed
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-slate-50/40">
                {[['info','Informational'],['success','Approved Action'],['warning','Security Warning'],['error','Critical / Rejection']].map(([s, l]) => (
                  <div key={s} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[s]}`} />
                    {l}
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-100">
                {MOCK_AUDIT_EVENTS.map((evt) => (
                  <div key={evt.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                    {/* Dot */}
                    <div className="mt-1 shrink-0">
                      <span className={`block w-2.5 h-2.5 rounded-full ${SEVERITY_DOT[evt.severity]}`} />
                    </div>

                    {/* Time */}
                    <div className="w-20 shrink-0 text-[11px] font-mono text-slate-400 pt-0.5">{evt.time}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{evt.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Resource: <span className="font-mono text-slate-700">{evt.resource}</span>
                      </p>
                    </div>

                    {/* Actor */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-xs font-semibold text-slate-700">{evt.actor}</p>
                      <p className="text-[11px] text-slate-400">{evt.role} · {evt.facility}</p>
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${SEVERITY_STYLES[evt.severity]}`}>
                        {evt.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                <span>Showing <strong>{MOCK_AUDIT_EVENTS.length}</strong> recent events</span>
                <span>Events are retained for 90 days per NHM policy</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
