import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import pharmacyApi from '../../features/pharmacy/services/pharmacyApi';

function StatCard({ icon, label, value, sub, color, onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border ${color.border} p-4 flex items-center gap-3.5 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
      } ${active ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : ''}`}
    >
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

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'inventory'
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all' | 'low' | 'out' | 'healthy'
  const [dispenseSubmitting, setDispenseSubmitting] = useState(false);
  const [dispensedCount, setDispensedCount] = useState(0);
  const [verifiedCheck, setVerifiedCheck] = useState(false);
  const [toast, setToast] = useState(null);

  // Quick Restock Modal State
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockAmount, setRestockAmount] = useState(50);
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/hospital/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Pharmacist') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const handleLogout = () => {
    ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
    navigate('/auth/hospital/login');
  };

  // ── Fetch Active Prescriptions (Prompt 9.1) ─────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await pharmacyApi.getActivePrescriptions();
      const list = res.data?.prescriptions || [];
      setPrescriptions(list);
      setSelectedRx((prev) => {
        if (!prev) return list[0] || null;
        const exists = list.find((r) => r._id === prev._id);
        return exists || list[0] || null;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load active prescription queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Inventory (Prompt 8.1 & 8.2) ───────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await pharmacyApi.getInventory();
      setInventory(res.data?.inventory || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchQueue();
      fetchInventory();
    }
  }, [user, fetchQueue, fetchInventory]);

  // Reset verification check when changing selected prescription
  useEffect(() => {
    setVerifiedCheck(false);
  }, [selectedRx?._id]);

  // ── Helper: Match medication against inventory ──────────────────────────────
  const findInventoryMatch = useCallback(
    (medItem) => {
      if (!medItem || !inventory.length) return null;
      const rawName = (medItem.medicineName || medItem.drugName || '').trim().toLowerCase();
      if (!rawName) return null;

      // 1. Exact match
      let match = inventory.find((inv) => inv.name.toLowerCase() === rawName);
      if (match) return match;

      // 2. Contains match
      match = inventory.find((inv) => {
        const invLower = inv.name.toLowerCase();
        return invLower.includes(rawName) || rawName.includes(invLower);
      });
      if (match) return match;

      // 3. First word / drug class match
      const firstWord = rawName.split(' ')[0];
      if (firstWord && firstWord.length > 3) {
        match = inventory.find((inv) => inv.name.toLowerCase().includes(firstWord));
      }
      return match || null;
    },
    [inventory]
  );

  // ── Stock analysis for selected prescription (Prompt 8.2 Safety) ───────────
  const rxStockAnalysis = useMemo(() => {
    if (!selectedRx || !Array.isArray(selectedRx.medications)) {
      return { items: [], hasStockIssue: false, outOfStockMeds: [] };
    }

    const items = selectedRx.medications.map((med) => {
      const match = findInventoryMatch(med);
      const requested = Math.max(1, Number(med.quantity) || 1);

      if (!match) {
        return {
          med,
          match: null,
          available: 0,
          unit: 'Units',
          status: 'OUT_OF_STOCK',
          isOutOfStock: true,
          isInsufficient: true,
          isLowStock: false,
          badgeText: 'Out of Stock (Not in Catalog)',
        };
      }

      const available = match.stockQuantity;
      const isOutOfStock = available === 0;
      const isInsufficient = available < requested;
      const isLowStock = available <= match.lowStockThreshold && !isInsufficient;

      let badgeText = `In Stock (${available} ${match.unit || 'units'})`;
      let status = 'IN_STOCK';

      if (isOutOfStock) {
        badgeText = 'Out of Stock (0 avail)';
        status = 'OUT_OF_STOCK';
      } else if (isInsufficient) {
        badgeText = `Insufficient: ${available} avail (needs ${requested})`;
        status = 'INSUFFICIENT';
      } else if (isLowStock) {
        badgeText = `Low Stock (${available} left)`;
        status = 'LOW_STOCK';
      }

      return {
        med,
        match,
        available,
        unit: match.unit || 'Tablets',
        threshold: match.lowStockThreshold,
        requested,
        status,
        isOutOfStock,
        isInsufficient,
        isLowStock,
        badgeText,
      };
    });

    const outOfStockMeds = items.filter((i) => i.isInsufficient || i.isOutOfStock);

    return {
      items,
      hasStockIssue: outOfStockMeds.length > 0,
      outOfStockMeds,
    };
  }, [selectedRx, findInventoryMatch]);

  // ── Search & Filter Prescriptions ───────────────────────────────────────────
  const filteredPrescriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter((rx) => {
      const name = (rx.patientFullName || '').toLowerCase();
      const phone = (rx.patientId?.contactPhone || '').toLowerCase();
      const uhid = (rx.patientId?.uhid || rx.patientUhid || '').toLowerCase();
      const abha = (rx.patientId?.abhaId || '').toLowerCase();
      const doctor = (rx.doctorId?.name || '').toLowerCase();
      const diagnosis = (rx.consultationId?.diagnosis || '').toLowerCase();
      const medicines = (rx.medications || [])
        .map((m) => (m.medicineName || m.drugName || '').toLowerCase())
        .join(' ');

      return (
        name.includes(q) ||
        phone.includes(q) ||
        uhid.includes(q) ||
        abha.includes(q) ||
        doctor.includes(q) ||
        diagnosis.includes(q) ||
        medicines.includes(q)
      );
    });
  }, [prescriptions, searchQuery]);

  // ── Search & Filter Inventory ───────────────────────────────────────────────
  const filteredInventory = useMemo(() => {
    let list = inventory;
    const q = inventorySearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.brandName && item.brandName.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      );
    }
    if (inventoryFilter === 'low') {
      list = list.filter((item) => item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0);
    } else if (inventoryFilter === 'out') {
      list = list.filter((item) => item.stockQuantity === 0);
    } else if (inventoryFilter === 'healthy') {
      list = list.filter((item) => item.stockQuantity > item.lowStockThreshold);
    }
    return list;
  }, [inventory, inventorySearch, inventoryFilter]);

  // Inventory computed counters
  const lowStockCount = useMemo(
    () => inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold && i.stockQuantity > 0).length,
    [inventory]
  );
  const outOfStockCount = useMemo(
    () => inventory.filter((i) => i.stockQuantity === 0).length,
    [inventory]
  );

  // ── Dispense Medication Action (Prompt 8.1 & 9.1) ───────────────────────────
  const handleDispense = async (e) => {
    e.preventDefault();
    if (!selectedRx) return;

    if (rxStockAnalysis.hasStockIssue) {
      showToast(
        'error',
        'Dispense Blocked',
        `Cannot dispense: ${rxStockAnalysis.outOfStockMeds
          .map((m) => m.med.medicineName || m.med.drugName)
          .join(', ')} has insufficient stock.`
      );
      return;
    }

    setDispenseSubmitting(true);
    try {
      const res = await pharmacyApi.dispenseMedication(selectedRx._id);
      showToast(
        'success',
        'Medication Dispensed',
        `Prescription for ${selectedRx.patientFullName} dispensed and stock deducted.`
      );
      setDispensedCount((c) => c + 1);

      // Refresh inventory so stock levels reflect deduction
      fetchInventory();

      // Remove from local list immediately
      setPrescriptions((prev) => prev.filter((r) => r._id !== selectedRx._id));
      setSelectedRx(null);
      setVerifiedCheck(false);
    } catch (err) {
      showToast(
        'error',
        'Dispensing Failed',
        err.response?.data?.message || 'Failed to complete dispensing.'
      );
    } finally {
      setDispenseSubmitting(false);
    }
  };

  // ── Quick Restock Action ────────────────────────────────────────────────────
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockTarget || restockAmount <= 0) return;

    setRestockSubmitting(true);
    try {
      await pharmacyApi.updateStock(restockTarget._id, { addQuantity: Number(restockAmount) });
      showToast(
        'success',
        'Inventory Restocked',
        `Added +${restockAmount} ${restockTarget.unit || 'units'} to ${restockTarget.name}.`
      );
      setRestockTarget(null);
      setRestockAmount(50);
      await fetchInventory();
    } catch (err) {
      showToast('error', 'Restock Failed', err.response?.data?.message || 'Could not update stock.');
    } finally {
      setRestockSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-[85vh] bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 px-4 sm:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border bg-white ${
            toast.type === 'error' ? 'border-rose-200' : 'border-emerald-200'
          } text-sm font-medium max-w-sm transition-all animate-bounce`}
        >
          <div
            className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
              toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            {toast.type === 'error' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm">{toast.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
                  📦
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Restock Medication</h3>
                  <p className="text-xs text-slate-400">{restockTarget.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRestockTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Current Stock:</span>
                <span className="font-bold text-slate-900">
                  {restockTarget.stockQuantity} {restockTarget.unit || 'units'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Low Stock Threshold:</span>
                <span className="font-bold text-amber-700">{restockTarget.lowStockThreshold} units</span>
              </div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Units to Add (+):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    required
                  />
                  <div className="flex gap-1">
                    {[20, 50, 100].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setRestockAmount(quick)}
                        className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-100 text-slate-700"
                      >
                        +{quick}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockTarget(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restockSubmitting}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50"
                >
                  {restockSubmitting ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-200 shrink-0">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">Hospital Pharmacy & Dispensary</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  ● Dispensary Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pharmacist: <span className="font-semibold text-emerald-700">{user.name}</span>
                {user.hospitalName && <span className="text-slate-400"> · {user.hospitalName}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Switcher Tabs */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === 'queue'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📋 Prescription Queue</span>
                {prescriptions.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                    {prescriptions.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  activeTab === 'inventory'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📦 Inventory Status</span>
                {lowStockCount + outOfStockCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full text-[10px] animate-pulse">
                    {lowStockCount + outOfStockCount}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => {
                fetchQueue();
                fetchInventory();
              }}
              disabled={loading || inventoryLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all border border-slate-200 disabled:opacity-50"
              title="Refresh Data"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading || inventoryLoading ? 'animate-spin text-emerald-600' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ── Live Stats Cards (Prompt 8.1 & 8.2) ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            }
            label="Pending Prescriptions"
            value={prescriptions.length}
            sub="Awaiting dispensing"
            color={{ border: 'border-amber-100', icon: 'bg-amber-100 text-amber-700', text: 'text-amber-800' }}
            onClick={() => setActiveTab('queue')}
            active={activeTab === 'queue'}
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Dispensed Today"
            value={dispensedCount}
            sub="Fulfilled prescriptions"
            color={{ border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' }}
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            }
            label="Inventory Items"
            value={inventory.length}
            sub="Medication catalog"
            color={{ border: 'border-sky-100', icon: 'bg-sky-100 text-sky-700', text: 'text-sky-800' }}
            onClick={() => {
              setActiveTab('inventory');
              setInventoryFilter('all');
            }}
            active={activeTab === 'inventory' && inventoryFilter === 'all'}
          />
          <StatCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            }
            label="Low Stock Alerts"
            value={lowStockCount + outOfStockCount}
            sub={`${outOfStockCount} out of stock · ${lowStockCount} low`}
            color={
              lowStockCount + outOfStockCount > 0
                ? { border: 'border-rose-200', icon: 'bg-rose-100 text-rose-700 animate-pulse', text: 'text-rose-700' }
                : { border: 'border-emerald-100', icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-700' }
            }
            onClick={() => {
              setActiveTab('inventory');
              setInventoryFilter(outOfStockCount > 0 ? 'out' : 'low');
            }}
            active={activeTab === 'inventory' && (inventoryFilter === 'low' || inventoryFilter === 'out')}
          />
        </div>

        {/* ── TAB 1: Prescription Queue View ──────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Active Prescription Queue */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>Patient Prescription Queue</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {filteredPrescriptions.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">Select to review medications & stock</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patient, UHID, ABHA, doctor, drug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Prescriptions List */}
              <div className="space-y-2.5 overflow-y-auto max-h-[580px] pr-1">
                {loading && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading active prescription queue...
                  </div>
                )}

                {!loading && filteredPrescriptions.length === 0 && (
                  <div className="py-14 text-center text-xs text-slate-400">
                    <p className="font-semibold text-slate-600">No pending prescriptions found</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-[11px] text-emerald-600 font-bold mt-1 underline"
                      >
                        Reset search
                      </button>
                    )}
                  </div>
                )}

                {!loading &&
                  filteredPrescriptions.map((rx) => {
                    const isSelected = selectedRx?._id === rx._id;
                    const patient = rx.patientId || {};
                    const doctor = rx.doctorId || {};

                    return (
                      <div
                        key={rx._id}
                        onClick={() => setSelectedRx(rx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/40'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900 truncate">
                                {rx.patientFullName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Pending
                              </span>
                            </div>
                            {(patient.uhid || rx.patientUhid) && (
                              <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-200 text-[9px] font-bold text-violet-700 font-mono tracking-wide">
                                🪪 {patient.uhid || rx.patientUhid}
                              </span>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {patient.gender && <span>{patient.gender}</span>}
                              {rx.patientAge !== null && <span> · {rx.patientAge} yrs</span>}
                              {patient.contactPhone && <span> · 📞 {patient.contactPhone}</span>}
                            </p>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                            <span>💊</span>
                            <span>{rx.medicationCount} Drugs</span>
                          </span>
                        </div>

                        {/* Doctor & Diagnosis snippet */}
                        <div className="mt-2 text-[11px] text-slate-600 bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="truncate">
                            <strong className="text-slate-400 uppercase text-[9px] mr-1">Dr:</strong>
                            {doctor.name || 'OPD Physician'}
                          </span>
                          {rx.consultationId?.diagnosis && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md truncate max-w-[140px]">
                              {rx.consultationId.diagnosis}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/70">
                          <span>Rx #{rx._id.slice(-6).toUpperCase()}</span>
                          <span>
                            {new Date(rx.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Column: Detailed Prescription View & Dispense Action (Prompt 8.1, 8.2 & 9.2) */}
            <div className="lg:col-span-7 space-y-4">
              {selectedRx ? (
                <div className="space-y-4">
                  {/* Patient Profile Card */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                        {selectedRx.patientFullName?.[0] || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-extrabold text-slate-900">
                            {selectedRx.patientFullName}
                          </h2>
                          {(selectedRx.patientId?.uhid || selectedRx.patientUhid) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-xs font-bold text-violet-700 font-mono">
                              🪪 {selectedRx.patientId?.uhid || selectedRx.patientUhid}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Digital Prescription
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedRx.patientId?.gender && (
                            <span className="capitalize">{selectedRx.patientId.gender}</span>
                          )}
                          {selectedRx.patientAge !== null && ` · ${selectedRx.patientAge} yrs`}
                          {selectedRx.patientId?.bloodGroup && ` · Blood: ${selectedRx.patientId.bloodGroup}`}
                          {selectedRx.patientId?.contactPhone && ` · 📞 ${selectedRx.patientId.contactPhone}`}
                        </p>
                        {selectedRx.patientId?.abhaId && (
                          <p className="text-[11px] font-mono text-sky-700 font-semibold mt-0.5">
                            ABHA ID: {selectedRx.patientId.abhaId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">Prescribed By</p>
                      <p className="text-xs font-extrabold text-slate-800">
                        Dr. {selectedRx.doctorId?.name || 'Physician'}
                      </p>
                      {selectedRx.doctorId?.specialization && (
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          {selectedRx.doctorId.specialization}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Consultation Remarks & Diagnosis */}
                  {selectedRx.consultationId && (
                    <div className="bg-gradient-to-r from-white to-emerald-50/30 rounded-3xl border border-emerald-100 p-4 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            Clinical Diagnosis:
                          </span>
                          <p className="font-extrabold text-slate-900 mt-0.5">
                            {selectedRx.consultationId.diagnosis || 'General OPD Consultation'}
                          </p>
                        </div>
                        {selectedRx.consultationId.chiefComplaint && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              Chief Complaint:
                            </span>
                            <p className="text-slate-700 mt-0.5 truncate">
                              {selectedRx.consultationId.chiefComplaint}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prescribed Medications Table with Real-time Stock (Prompt 8.2) */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                          💊
                        </span>
                        <span>
                          Prescribed Medication Schedule ({selectedRx.medications?.length || 0})
                        </span>
                      </h3>

                      <button
                        onClick={() => setActiveTab('inventory')}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                      >
                        📦 View Full Inventory
                      </button>
                    </div>

                    {/* Medications List */}
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-12 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        <div className="col-span-4">Medicine / Drug</div>
                        <div className="col-span-2">Dosage</div>
                        <div className="col-span-2">Frequency</div>
                        <div className="col-span-4 text-right">Inventory Stock Level</div>
                      </div>

                      {rxStockAnalysis.items.map((item, idx) => {
                        const med = item.med;
                        return (
                          <div
                            key={idx}
                            className={`px-4 py-3 grid grid-cols-12 text-xs items-center transition-colors ${
                              item.isOutOfStock || item.isInsufficient
                                ? 'bg-rose-50/50 hover:bg-rose-50'
                                : item.isLowStock
                                ? 'bg-amber-50/40 hover:bg-amber-50/60'
                                : 'hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="col-span-4 font-bold text-slate-900">
                              <span className="mr-1.5 text-emerald-600">#{idx + 1}</span>
                              {med.medicineName || med.drugName || 'Unnamed Medicine'}
                              {med.instructions && (
                                <p className="text-[10px] font-normal text-slate-500 mt-0.5 italic">
                                  Note: {med.instructions}
                                </p>
                              )}
                              <p className="text-[10px] font-medium text-slate-400">
                                Qty: {item.requested} {item.unit}
                              </p>
                            </div>

                            <div className="col-span-2 text-slate-700 font-semibold font-mono">
                              {med.dosage || '—'}
                            </div>

                            <div className="col-span-2 text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold">
                                {med.frequency || 'As directed'}
                              </span>
                            </div>

                            {/* Prompt 8.2: Live Stock Level Display */}
                            <div className="col-span-4 flex flex-col items-end gap-1">
                              {item.isOutOfStock ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                                  <span>⛔</span>
                                  <span>Out of Stock (0 {item.unit})</span>
                                </span>
                              ) : item.isInsufficient ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                                  <span>⚠️</span>
                                  <span>Stock Low: {item.available} &lt; {item.requested}</span>
                                </span>
                              ) : item.isLowStock ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                                  <span>🟠</span>
                                  <span>Low Stock ({item.available} left)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                                  <span>🟢</span>
                                  <span>In Stock ({item.available} {item.unit})</span>
                                </span>
                              )}

                              {/* Restock quick action if low or out of stock */}
                              {(item.isOutOfStock || item.isInsufficient || item.isLowStock) && item.match && (
                                <button
                                  type="button"
                                  onClick={() => setRestockTarget(item.match)}
                                  className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                                >
                                  + Restock Now
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* General Instructions */}
                    {selectedRx.instructions && (
                      <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80 text-xs">
                        <p className="font-bold text-amber-900 flex items-center gap-1.5 mb-0.5">
                          <span>⚠️</span>
                          <span>Doctor's Special Instructions for Patient:</span>
                        </p>
                        <p className="text-amber-800 leading-relaxed pl-5 font-medium">
                          {selectedRx.instructions}
                        </p>
                      </div>
                    )}

                    {/* Prompt 8.2: Out of Stock Warning Banner */}
                    {rxStockAnalysis.hasStockIssue && (
                      <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                          ⛔
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-rose-900">
                            Out of Stock Warning: Dispensing Disabled
                          </h4>
                          <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                            The following prescribed medications have insufficient stock to fulfill this prescription:
                          </p>
                          <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs text-rose-800 font-semibold">
                            {rxStockAnalysis.outOfStockMeds.map((o, idx) => (
                              <li key={idx}>
                                {o.med.medicineName || o.med.drugName} (Available: {o.available}, Needed:{' '}
                                {o.requested})
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">
                            Please restock the out-of-stock items before marking this prescription as dispensed.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pharmacist Dispense Form (Prompt 8.1 & 9.2) */}
                    <form onSubmit={handleDispense} className="pt-3 border-t border-slate-100 space-y-4">
                      <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={verifiedCheck}
                          onChange={(e) => setVerifiedCheck(e.target.checked)}
                          disabled={rxStockAnalysis.hasStockIssue}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 disabled:opacity-40"
                        />
                        <span className="text-xs text-slate-700 font-medium">
                          I confirm that the medications, dosages, and quantities have been inspected and prepared for{' '}
                          <strong className="text-slate-900">{selectedRx.patientFullName}</strong>.
                        </span>
                      </label>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {rxStockAnalysis.hasStockIssue
                            ? '* Button disabled because one or more medications are out of stock.'
                            : '* Clicking dispense deducts inventory and closes this prescription token.'}
                        </span>

                        {/* Prompt 8.2 Safety: Disable button if stock is too low */}
                        <button
                          type="submit"
                          disabled={dispenseSubmitting || !verifiedCheck || rxStockAnalysis.hasStockIssue}
                          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all ${
                            rxStockAnalysis.hasStockIssue
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {dispenseSubmitting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Dispensing & Deducting Stock...</span>
                            </>
                          ) : rxStockAnalysis.hasStockIssue ? (
                            <>
                              <span>⛔ Out of Stock — Dispense Disabled</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span>Mark as Dispensed</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Select a Prescription to Begin Dispensing
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click on any patient in the active queue on the left to inspect prescribed medications, check real-time
                    stock levels, and complete dispensing.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: Full Inventory Status Table (Prompt 8.2) ──────────────── */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Pharmacy Medication Inventory</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {inventory.length} Medications
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time stock tracking with automated low-stock warnings (Threshold: 50 units)
                </p>
              </div>

              {/* Inventory Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setInventoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    inventoryFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({inventory.length})
                </button>
                <button
                  onClick={() => setInventoryFilter('low')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    inventoryFilter === 'low'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span>⚠️ Restock Required</span>
                  <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                    {lowStockCount}
                  </span>
                </button>
                <button
                  onClick={() => setInventoryFilter('out')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    inventoryFilter === 'out'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span>⛔ Out of Stock</span>
                  <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                    {outOfStockCount}
                  </span>
                </button>
                <button
                  onClick={() => setInventoryFilter('healthy')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    inventoryFilter === 'healthy'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Healthy ({inventory.length - lowStockCount - outOfStockCount})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search medication name, brand, or category..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Inventory Table (Prompt 8.2: Highlight in orange or red with warning badge) */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Medication / Generic</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Dosage</th>
                      <th className="px-4 py-3 text-center">Stock Quantity</th>
                      <th className="px-4 py-3 text-center">Threshold</th>
                      <th className="px-4 py-3 text-center">Status / Alert</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((item) => {
                      const isOut = item.stockQuantity === 0;
                      const isLow = item.stockQuantity <= item.lowStockThreshold && !isOut;

                      // Row highlighting as required by Prompt 8.2
                      const rowStyle = isOut
                        ? 'bg-rose-50/70 hover:bg-rose-50'
                        : isLow
                        ? 'bg-amber-50/60 hover:bg-amber-50'
                        : 'hover:bg-slate-50/50';

                      return (
                        <tr key={item._id} className={`transition-colors ${rowStyle}`}>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{isOut ? '⛔' : isLow ? '⚠️' : '💊'}</span>
                              <div>
                                <p className="font-extrabold text-slate-900">{item.name}</p>
                                {item.brandName && (
                                  <p className="text-[10px] text-slate-400 font-normal">
                                    Brand: {item.brandName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-600">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium">
                              {item.category || 'General'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-700">
                            {item.dosage || 'Standard'}
                          </td>

                          {/* Stock Quantity */}
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`font-mono font-extrabold text-sm ${
                                isOut
                                  ? 'text-rose-700'
                                  : isLow
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {item.stockQuantity}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                          </td>

                          {/* Threshold */}
                          <td className="px-4 py-3.5 text-center font-mono text-slate-400">
                            {item.lowStockThreshold}
                          </td>

                          {/* Prompt 8.2: Warning badge */}
                          <td className="px-4 py-3.5 text-center">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-extrabold">
                                <span>⛔ Out of Stock</span>
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold shadow-xs">
                                <span>⚠️ Restock Required</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                <span>✓ In Stock</span>
                              </span>
                            )}
                          </td>

                          {/* Action: Quick Restock */}
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => setRestockTarget(item)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 shadow-xs transition-all"
                            >
                              + Restock
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center text-xs text-slate-400">
                          No medications found matching current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
