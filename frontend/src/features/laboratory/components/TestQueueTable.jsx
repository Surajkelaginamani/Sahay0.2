import React, { useState } from 'react';

const STATUS_CONFIG = {
  Ordered: {
    label: 'Ordered',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    nextStatus: 'SampleCollected',
    actionLabel: 'Collect Sample',
    actionColor: 'bg-sky-600 hover:bg-sky-700 text-white',
  },
  SampleCollected: {
    label: 'Sample Collected',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
    nextStatus: 'Processing',
    actionLabel: 'Start Processing',
    actionColor: 'bg-teal-600 hover:bg-teal-700 text-white',
  },
  Processing: {
    label: 'Processing',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    nextStatus: 'Completed',
    actionLabel: 'Submit Report',
    actionColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  },
  Completed: {
    label: 'Completed',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    nextStatus: null,
    actionLabel: null,
    actionColor: '',
  },
};

export default function TestQueueTable({
  orders = [],
  loading = false,
  activeFilter = 'ALL',
  onFilterChange,
  onStatusUpdate,
  onSubmitReport,
  onRefresh,
}) {
  // Modal state for submitting a lab report
  const [reportModal, setReportModal] = useState({
    isOpen: false,
    order: null,
    resultText: '',
    fileUrl: '',
    verificationStatus: 'Verified',
    loading: false,
    error: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'Ordered', label: 'Ordered' },
    { id: 'SampleCollected', label: 'Sample Collected' },
    { id: 'Processing', label: 'Processing' },
    { id: 'Completed', label: 'Completed' },
  ];

  // Client-side search query filtering
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const patientName = order.patientId?.name || '';
    const patientEmail = order.patientId?.email || '';
    const doctorName = order.doctorId?.name || '';
    const testName = order.testName || '';
    return (
      patientName.toLowerCase().includes(q) ||
      patientEmail.toLowerCase().includes(q) ||
      doctorName.toLowerCase().includes(q) ||
      testName.toLowerCase().includes(q)
    );
  });

  const handleOpenReportModal = (order) => {
    setReportModal({
      isOpen: true,
      order,
      resultText: '',
      fileUrl: '',
      verificationStatus: 'Verified',
      loading: false,
      error: '',
    });
  };

  const handleCloseReportModal = () => {
    setReportModal({
      isOpen: false,
      order: null,
      resultText: '',
      fileUrl: '',
      verificationStatus: 'Verified',
      loading: false,
      error: '',
    });
  };

  const handleReportFormSubmit = async (e) => {
    e.preventDefault();
    if (!reportModal.order) return;

    setReportModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await onSubmitReport({
        orderId: reportModal.order._id,
        resultText: reportModal.resultText.trim(),
        fileUrl: reportModal.fileUrl.trim(),
        verificationStatus: reportModal.verificationStatus,
      });
      handleCloseReportModal();
    } catch (err) {
      setReportModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message || 'Failed to submit report',
      }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* ── Table Top Control Bar ────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Diagnostic Test Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active patient diagnostics, specimen collection, and lab reports.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search patient, test, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 pl-9 rounded-xl border border-slate-200 text-xs w-60 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-slate-50 focus:bg-white transition-all"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Status:
        </span>
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange && onFilterChange(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Table Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <span className="inline-block w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Fetching test queue from facility database...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">No Tests Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {activeFilter !== 'ALL'
                ? `No diagnostic requests matching the '${activeFilter}' status.`
                : 'There are currently no diagnostic test orders assigned to your hospital.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Patient
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Test Name
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Prescribing Doctor
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Ordered Date
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Current Status
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.Ordered;
                const patientName = order.patientId?.name || 'Unknown Patient';
                const patientEmail = order.patientId?.email || '—';
                const doctorName = order.doctorId?.name || 'Attending Physician';
                const formattedDate = order.orderDate
                  ? new Date(order.orderDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                return (
                  <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Patient */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{patientName}</p>
                          <p className="text-xs text-slate-400">{patientEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Test Name */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 text-sm block">
                        {order.testName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {order._id.slice(-6).toUpperCase()}
                      </span>
                    </td>

                    {/* Doctor */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-700">
                      <span className="font-medium text-slate-800">{doctorName}</span>
                    </td>

                    {/* Ordered Date */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                      {formattedDate}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${config.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status !== 'Completed' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(order)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors inline-flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Upload Result</span>
                            </button>

                            {config.nextStatus && !order.isLabOrder && (
                              <button
                                type="button"
                                onClick={() => onStatusUpdate(order._id, config.nextStatus)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1 ${config.actionColor}`}
                              >
                                <span>{config.actionLabel}</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                            Completed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Table Footer ─────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> total requests
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Laboratory Diagnostic Grid
        </span>
      </div>

      {/* ── Submit Diagnostic Report Modal ───────────────────────────────── */}
      {reportModal.isOpen && reportModal.order && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Lab Head Verification
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                  Submit Diagnostic Report
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Finalize results for <strong>{reportModal.order.patientId?.name}</strong> (
                  {reportModal.order.testName})
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseReportModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {reportModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {reportModal.error}
              </div>
            )}

            <form onSubmit={handleReportFormSubmit} className="space-y-4">
              {/* Findings / Diagnostic Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diagnostic Findings &amp; Clinical Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportModal.resultText}
                  onChange={(e) =>
                    setReportModal((prev) => ({ ...prev, resultText: e.target.value, error: '' }))
                  }
                  placeholder="e.g. Hemoglobin: 14.2 g/dL (Normal). Platelet count adequate. No toxic granules observed."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                />
              </div>

              {/* File Attachment / URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Report Document / Scan Link (Optional)
                </label>
                <input
                  type="url"
                  value={reportModal.fileUrl}
                  onChange={(e) =>
                    setReportModal((prev) => ({ ...prev, fileUrl: e.target.value, error: '' }))
                  }
                  placeholder="https://storage.sahay.gov.in/reports/report-123.pdf"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approval &amp; Verification Status
                </label>
                <select
                  value={reportModal.verificationStatus}
                  onChange={(e) =>
                    setReportModal((prev) => ({
                      ...prev,
                      verificationStatus: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="Verified">Verified &amp; Released (Final)</option>
                  <option value="Pending">Pending Secondary Review</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Marking as Verified makes the diagnostic outcome instantly accessible to the patient and doctor.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportModal.loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-emerald-200"
                >
                  {reportModal.loading && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Sign &amp; Complete Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
