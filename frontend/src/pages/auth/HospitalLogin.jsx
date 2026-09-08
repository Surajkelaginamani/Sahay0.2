import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { staffAuthAPI } from '../../services/api';
import { getStoredAuth } from '../../utils/auth';

// Role → route map
const ROLE_ROUTES = {
  HospitalAdmin: '/dashboard/admin',
  Doctor: '/dashboard/doctor',
  LabHead: '/dashboard/lab',
  ASHA: '/dashboard/asha',
  FacilityAdmin: '/dashboard/admin', // Facility admins share the admin dashboard for now
  Receptionist: '/dashboard/receptionist',
};

// Subtle role badge displayed after failed login with role info
const ROLE_LABELS = {
  HospitalAdmin: 'Hospital Administrator',
  Doctor: 'Doctor',
  LabHead: 'Lab Head / Diagnostics',
  ASHA: 'ASHA / ANM Worker',
  FacilityAdmin: 'Facility Administrator',
  Receptionist: 'Receptionist',
};

export default function HospitalLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'pending' | 'rejected' | 'generic'
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user && auth.user.role) {
      const user = auth.user;
      switch (user.role) {
        case 'Doctor':
          navigate('/dashboard/doctor', { replace: true });
          break;
        case 'HospitalAdmin':
        case 'FacilityAdmin':
          navigate('/dashboard/admin', { replace: true });
          break;
        case 'Receptionist':
          navigate('/dashboard/receptionist', { replace: true });
          break;
        case 'Nurse':
          navigate('/dashboard/nurse', { replace: true });
          break;
        case 'LabHead':
          navigate('/dashboard/lab', { replace: true });
          break;
        case 'Pharmacist':
          navigate('/dashboard/pharmacy', { replace: true });
          break;
        case 'Patient':
          navigate('/dashboard/patient', { replace: true });
          break;
        case 'Govt':
        case 'GovernmentOfficial':
          navigate('/dashboard/govt', { replace: true });
          break;
        case 'ASHA':
          navigate('/dashboard/asha', { replace: true });
          break;
        default:
          break;
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setErrorType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrorType('');

    try {
      const response = await staffAuthAPI.login({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      const { token, role, user } = response.data;

      // ── Save token & user to localStorage ──────────────────────────────────
      localStorage.setItem('token', token);
      localStorage.setItem('sahay_token', token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hospitalId: user.hospitalId,
          hospitalName: user.hospitalName,
        })
      );
      localStorage.setItem('sahay_user', localStorage.getItem('user'));

      // ── Role-based navigation ───────────────────────────────────────────────
      switch (role) {
        case 'HospitalAdmin':
          navigate('/dashboard/admin');
          break;
        case 'Doctor':
          navigate('/dashboard/doctor');
          break;
        case 'LabHead':
          navigate('/dashboard/lab');
          break;
        case 'ASHA':
          navigate('/dashboard/asha');
          break;
        case 'FacilityAdmin':
          navigate('/dashboard/admin');
          break;
        case 'Receptionist':
          navigate('/dashboard/receptionist');
          break;
        case 'Nurse':
          navigate('/dashboard/nurse');
          break;
        case 'Pharmacist':
          navigate('/dashboard/pharmacy');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      const status = err.response?.status;
      const message =
        err.response?.data?.message ||
        'Login failed. Please check your credentials.';
      const vStatus = err.response?.data?.verificationStatus;

      if (status === 403 && vStatus === 'pending') {
        setErrorType('pending');
      } else if (status === 403 && vStatus === 'rejected') {
        setErrorType('rejected');
      } else {
        setErrorType('generic');
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-sky-50 to-slate-50">
      <div className="max-w-md w-full space-y-6">

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-sky-100/40 p-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-3">
            {/* Portal icon */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-md shadow-sky-200">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Healthcare Staff &amp; Admin Portal
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Secure access for Doctors, ASHA Workers, Lab Heads, and Hospital Administrators
              </p>
            </div>

            {/* Role chips — visual hint */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {['Hospital Admin', 'Doctor', 'ASHA / ANM', 'Lab Head', 'Receptionist'].map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-medium">
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* ── Status Banners ─────────────────────────────────────── */}
          {errorType === 'pending' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 font-semibold text-xs text-amber-900">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Hospital Approval Pending
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">{error}</p>
              <p className="text-[11px] text-amber-700">
                Your hospital is under government review. Access will be granted once approved by a designated Health Authority.
              </p>
            </div>
          )}

          {errorType === 'rejected' && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-xs text-rose-900">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Registration Rejected
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">{error}</p>
              <p className="text-[11px] text-rose-700">
                Please contact the government health authority or support team for further assistance.
              </p>
            </div>
          )}

          {errorType === 'generic' && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── Login Form ─────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="staff-email" className="block text-xs font-medium text-slate-700 mb-1">
                Staff Email Address
              </label>
              <input
                id="staff-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="staff@hospital.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="staff-password" className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-medium text-sky-600 hover:text-sky-800 transition-colors"
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
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
            </div>

            <button
              id="staff-login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-semibold text-sm shadow-sm shadow-sky-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In to Staff Portal
                </>
              )}
            </button>
          </form>

          {/* ── Footer Links ───────────────────────────────────────── */}
          <div className="pt-1 text-center space-y-2 text-xs border-t border-slate-100">
            <div className="pt-2">
              <span className="text-slate-500">Registering a new hospital? </span>
              <Link to="/auth/hospital/register" className="text-sky-700 hover:underline font-semibold">
                Register Facility
              </Link>
            </div>
            <div>
              <Link to="/" className="text-slate-400 hover:text-slate-700 transition-colors">
                ← Back to National Portals Overview
              </Link>
            </div>
          </div>
        </div>

        {/* Trust badge */}
        <p className="text-center text-[11px] text-slate-400">
          🔒 Secured by SAHAY — Smart Access to Healthcare, Government of India
        </p>
      </div>
    </div>
  );
}
