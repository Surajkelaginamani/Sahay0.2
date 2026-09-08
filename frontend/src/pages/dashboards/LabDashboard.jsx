import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LabMetrics from '../../features/laboratory/components/LabMetrics';
import TestQueueTable from '../../features/laboratory/components/TestQueueTable';
import labApi from '../../features/laboratory/services/labApi';

export default function LabDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Dashboard Data State
  const [metrics, setMetrics] = useState({
    Ordered: 0,
    SampleCollected: 0,
    Processing: 0,
    Completed: 0,
    total: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // JWT & Role Guard
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/hospital/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'LabHead') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  // Fetch metrics data
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await labApi.getMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch test queue
  const fetchQueue = useCallback(async (filter) => {
    setLoadingOrders(true);
    try {
      const [diagRes, pendingRes] = await Promise.allSettled([
        labApi.getQueue(filter),
        labApi.getPendingTests(),
      ]);

      const diagOrders = diagRes.status === 'fulfilled' ? (diagRes.value?.data || []) : [];
      const pendingLabOrders = pendingRes.status === 'fulfilled' ? (pendingRes.value?.data?.tests || []) : [];

      // Format LabOrders to match TestQueueTable expectations
      const formattedLabOrders = pendingLabOrders.map((lo) => ({
        _id: lo._id,
        isLabOrder: true,
        testName: lo.testName,
        status: lo.status === 'Requested' ? 'Ordered' : lo.status,
        rawStatus: lo.status,
        patientId: lo.patientId ? {
          name: lo.patientId.firstName
            ? `${lo.patientId.firstName} ${lo.patientId.lastName || ''}`.trim()
            : lo.patientId.name || 'Patient',
          email: lo.patientId.contactPhone || lo.patientId.email || '—',
          phone: lo.patientId.contactPhone,
        } : { name: 'Patient' },
        doctorId: lo.doctorId ? {
          name: lo.doctorId.name,
          email: lo.doctorId.email,
        } : { name: 'Doctor' },
        orderDate: lo.createdAt,
        createdAt: lo.createdAt,
        priority: lo.appointmentId?.priority || 'Routine',
        notes: lo.notes,
      }));

      // Combine both sources (LabOrder + DiagnosticOrder)
      const combined = [...formattedLabOrders, ...diagOrders];
      setOrders(combined);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
      showToast('error', 'Failed to load test queue. Please try again.');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchMetrics();
      fetchQueue(activeFilter);
    }
  }, [user, fetchMetrics, fetchQueue, activeFilter]);

  // Status transition handler (e.g. Ordered -> SampleCollected -> Processing)
  const handleStatusUpdate = async (orderId, nextStatus) => {
    try {
      await labApi.updateStatus(orderId, nextStatus);
      showToast('success', `Test status progressed to '${nextStatus}'.`);
      fetchMetrics();
      fetchQueue(activeFilter);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update test status.');
    }
  };

  // Submit diagnostic report handler
  const handleSubmitReport = async (payload) => {
    try {
      const matchingOrder = orders.find((o) => o._id === payload.orderId);
      if (matchingOrder?.isLabOrder) {
        await labApi.uploadReport({
          labOrderId: payload.orderId,
          resultText: payload.resultText,
          resultURL: payload.fileUrl,
          notes: payload.resultText,
        });
        showToast('success', 'Lab report uploaded and appointment status updated to Reports Ready.');
      } else {
        await labApi.submitReport(payload);
        showToast('success', 'Diagnostic report submitted and verified successfully.');
      }
      fetchMetrics();
      fetchQueue(activeFilter);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to submit lab report.');
      throw err;
    }
  };

  // Filter change handler
  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sahay_token');
    localStorage.removeItem('user');
    localStorage.removeItem('sahay_user');
    navigate('/auth/hospital/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-teal-50/25 to-sky-50/30 px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── Top Header Banner ────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 via-teal-600 to-sky-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Laboratory &amp; Diagnostics
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  National Lab Grid
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Lab Head: <strong className="text-slate-800">{user.name}</strong> &nbsp;·&nbsp;
                <span className="text-slate-600">{user.hospitalName || 'Accredited Facility'}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchMetrics();
                fetchQueue(activeFilter);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync Live Data</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── Metric Cards ────────────────────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Laboratory Workload Metrics
            </h2>
            {activeFilter !== 'ALL' && (
              <button
                onClick={() => setActiveFilter('ALL')}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Clear Card Filter ({activeFilter})
              </button>
            )}
          </div>
          <LabMetrics
            metrics={metrics}
            loading={loadingMetrics}
            activeFilter={activeFilter}
            onFilterSelect={handleFilterChange}
          />
        </section>

        {/* ── Test Queue & Report Management ──────────────────────────── */}
        <section>
          <TestQueueTable
            orders={orders}
            loading={loadingOrders}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            onStatusUpdate={handleStatusUpdate}
            onSubmitReport={handleSubmitReport}
            onRefresh={() => {
              fetchMetrics();
              fetchQueue(activeFilter);
            }}
          />
        </section>
      </div>
    </div>
  );
}
