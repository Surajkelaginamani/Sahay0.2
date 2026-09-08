import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { hospitalAdminAPI } from '../../services/api';

// ─── Role config ─────────────────────────────────────────────────────────────
const STAFF_ROLES = [
  { value: 'Doctor', label: 'Doctor', color: 'text-sky-700 bg-sky-100 border-sky-200' },
  { value: 'Nurse', label: 'Nurse / Triage', color: 'text-teal-700 bg-teal-100 border-teal-200' },
  { value: 'ASHA', label: 'ASHA / ANM Worker', color: 'text-mint-700 bg-mint-100 border-mint-200' },
  { value: 'LabHead', label: 'Lab Head / Diagnostics', color: 'text-purple-700 bg-purple-100 border-purple-200' },
  { value: 'Pharmacist', label: 'Pharmacist / Dispensary', color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
  { value: 'FacilityAdmin', label: 'Facility Administrator', color: 'text-amber-700 bg-amber-100 border-amber-200' },
  { value: 'Receptionist', label: 'Receptionist', color: 'text-rose-700 bg-rose-100 border-rose-200' },
];

function getRoleBadge(role) {
  const found = STAFF_ROLES.find((r) => r.value === role);
  return found
    ? found.color
    : 'text-slate-700 bg-slate-100 border-slate-200';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-medium pointer-events-auto
            ${t.type === 'success' ? 'bg-white border-mint-200 text-mint-900' : 'bg-white border-rose-200 text-rose-900'}`}
        >
          <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
            ${t.type === 'success' ? 'bg-mint-100 text-mint-600' : 'bg-rose-100 text-rose-600'}`}
          >
            {t.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm">{t.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.message}</p>
          </div>
          <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-700 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function HospitalAdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Doctor',
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Reset password modal state
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    staff: null,
    newPassword: '',
    showPassword: false,
    loading: false,
    error: '',
  });

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((type, title, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── JWT Guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('sahay_token');
    const stored = localStorage.getItem('sahay_user');

    if (!token || !stored) {
      navigate('/auth/hospital/login');
      return;
    }

    const parsed = JSON.parse(stored);
    if (parsed.role !== 'HospitalAdmin') {
      navigate('/');
      return;
    }

    setUser(parsed);
  }, [navigate]);

  // ── Fetch Staff ───────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await hospitalAdminAPI.getStaff();
      setStaff(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('sahay_token');
        localStorage.removeItem('sahay_user');
        navigate('/auth/hospital/login');
      }
    } finally {
      setLoadingStaff(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (user) fetchStaff();
  }, [user, fetchStaff]);

  // ── Create Staff ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const cleanPayload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        role: formData.role,
      };

      const res = await hospitalAdminAPI.createStaff(cleanPayload);

      // Prepend new staff member to the table
      setStaff((prev) => [res.data.staff, ...prev]);

      addToast(
        'success',
        'Staff Account Created',
        `${cleanPayload.name} (${cleanPayload.role}) has been added to your hospital staff.`
      );

      // Reset form
      setFormData({ name: '', email: '', password: '', role: 'Doctor' });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create staff account. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete Staff ──────────────────────────────────────────────────────────
  const handleDeleteStaff = async (staffMember) => {
    if (!window.confirm(`Are you sure you want to remove ${staffMember.name} (${staffMember.role}) from this hospital?`)) {
      return;
    }

    try {
      await hospitalAdminAPI.deleteStaff(staffMember._id);
      setStaff((prev) => prev.filter((s) => s._id !== staffMember._id));
      addToast('success', 'Staff Member Removed', `${staffMember.name} has been removed from hospital staff.`);
    } catch (err) {
      addToast('error', 'Removal Failed', err.response?.data?.message || 'Failed to delete staff member.');
    }
  };

  // ── Reset Password ────────────────────────────────────────────────────────
  const handleOpenResetModal = (staffMember) => {
    setResetModal({
      isOpen: true,
      staff: staffMember,
      newPassword: '',
      showPassword: false,
      loading: false,
      error: '',
    });
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const { staff: targetStaff, newPassword } = resetModal;
    if (!newPassword || newPassword.trim().length < 6) {
      setResetModal((prev) => ({ ...prev, error: 'Password must be at least 6 characters long' }));
      return;
    }

    setResetModal((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await hospitalAdminAPI.resetPassword(targetStaff._id, newPassword.trim());
      addToast('success', 'Password Updated', `Password for ${targetStaff.name} has been reset.`);
      setResetModal({ isOpen: false, staff: null, newPassword: '', showPassword: false, loading: false, error: '' });
    } catch (err) {
      setResetModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to reset password.',
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sahay_token');
    localStorage.removeItem('sahay_user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center shadow-md">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gov-900 tracking-tight">
                  {user.hospitalName || 'Hospital Administration'}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Accredited
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Administrator: <strong className="text-slate-700">{user.name}</strong> &nbsp;·&nbsp;
                {user.email}
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

        {/* ── Stats Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: loadingStaff ? '…' : staff.length, icon: '👥', color: 'bg-sky-50 text-sky-700' },
            { label: 'Doctors', value: loadingStaff ? '…' : staff.filter((s) => s.role === 'Doctor').length, icon: '🩺', color: 'bg-mint-50 text-mint-700' },
            { label: 'ASHA Workers', value: loadingStaff ? '…' : staff.filter((s) => s.role === 'ASHA').length, icon: '🌿', color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Lab & Admin', value: loadingStaff ? '…' : staff.filter((s) => ['LabHead', 'FacilityAdmin'].includes(s.role)).length, icon: '🔬', color: 'bg-purple-50 text-purple-700' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xl font-extrabold text-gov-900">{stat.value}</p>
                <p className="text-[11px] text-slate-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Content Grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Create Staff Form (2 cols) ─────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs sticky top-24 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-gov-900">Create Staff Account</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add a new staff member to your hospital. They will be able to log in with their credentials.
                </p>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateStaff} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Dr. Priya Menon"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="e.g. doctor@hospital.org"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Temporary Password *
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, password: 'Staff@' + Math.floor(1000 + Math.random() * 9000) }))}
                        className="text-[11px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                      >
                        Auto-generate
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        {showFormPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      name="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleFormChange}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label={showFormPassword ? 'Hide password' : 'Show password'}
                    >
                      {showFormPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Stored securely as a salted bcrypt hash. Share securely with the staff member.
                  </p>
                </div>

                {/* Role Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Staff Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Preview Badge */}
                {formData.role && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Will be assigned role:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-semibold border text-xs ${getRoleBadge(formData.role)}`}>
                      {formData.role}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {formLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Staff Account
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ── Staff Table (3 cols) ───────────────────────────────────────── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Table Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gov-900">Registered Staff Members</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All staff associated with your hospital facility.
                  </p>
                </div>
                <button
                  onClick={fetchStaff}
                  disabled={loadingStaff}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${loadingStaff ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>

              {/* Table Body */}
              {loadingStaff ? (
                <div className="py-16 text-center">
                  <span className="inline-block w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin mb-3"></span>
                  <p className="text-sm text-slate-500">Loading staff records...</p>
                </div>
              ) : staff.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-sky-50 text-sky-500 flex items-center justify-center">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">No Staff Members Yet</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Use the form to create your first staff account.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Name
                        </th>
                        <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Email
                        </th>
                        <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Role
                        </th>
                        <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                          Added On
                        </th>
                        <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staff.map((member) => (
                        <tr key={member._id} className="hover:bg-slate-50/60 transition-colors group">
                          {/* Name */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-gov-900 text-sm">
                                {member.name}
                              </span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-4 text-xs text-slate-600 whitespace-nowrap">
                            {member.email}
                          </td>

                          {/* Role */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${getRoleBadge(member.role)}`}>
                              {member.role === 'ASHA' ? 'ASHA / ANM' : member.role}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenResetModal(member)}
                                title="Reset Password"
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50 transition-colors text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                                <span>Reset Pass</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member)}
                                title="Remove Staff Member"
                                className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Table Footer */}
                  <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      <strong>{staff.length}</strong> staff member(s) registered
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                      Live Hospital Registry
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Reset Password Modal ────────────────────────────────────── */}
      {resetModal.isOpen && resetModal.staff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Staff Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update password for <strong className="text-slate-800">{resetModal.staff.name}</strong> ({resetModal.staff.role})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModal({ isOpen: false, staff: null, newPassword: '', showPassword: false, loading: false, error: '' })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {resetModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {resetModal.error}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetModal((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                    className="text-[11px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                  >
                    {resetModal.showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={resetModal.showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={resetModal.newPassword}
                    onChange={(e) => setResetModal((prev) => ({ ...prev, newPassword: e.target.value, error: '' }))}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setResetModal((prev) => ({ ...prev, newPassword: 'Staff@' + Math.floor(1000 + Math.random() * 9000) }))}
                    className="text-[11px] text-sky-700 hover:underline font-semibold"
                  >
                    Generate random password
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModal({ isOpen: false, staff: null, newPassword: '', showPassword: false, loading: false, error: '' })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetModal.loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {resetModal.loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
