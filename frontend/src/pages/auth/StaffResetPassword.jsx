import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Key, CheckCircle2, AlertTriangle, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { staffAuthAPI } from '../../services/api';

const ROLE_ROUTES = {
  HospitalAdmin: '/dashboard/admin',
  Doctor: '/dashboard/doctor',
  LabHead: '/dashboard/lab',
  ASHA: '/dashboard/asha',
  AshaWorker: '/dashboard/asha',
  FacilityAdmin: '/dashboard/admin',
  Receptionist: '/dashboard/receptionist',
  Nurse: '/dashboard/nurse',
  Pharmacist: '/dashboard/pharmacy',
};

export default function StaffResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const res = await staffAuthAPI.resetPassword(token, { password });
      const { token: jwtToken, role, user } = res.data;

      // Persist auth
      if (jwtToken) {
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('sahay_token', jwtToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('sahay_user', JSON.stringify(user));
      }

      setSuccess(true);

      // Redirect after brief delay
      setTimeout(() => {
        const dest = ROLE_ROUTES[role] || '/';
        navigate(dest, { replace: true });
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Password reset link has expired or is invalid. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-inner">
            <Key className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Set New Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Create a secure password for your SAHAY Hospital Staff account.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-200 space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
              Password Reset Successfully
            </p>
            <p className="leading-relaxed">
              Your password has been updated. Redirecting you to your clinical portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="new-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 dark:bg-slate-700/50 dark:text-white transition-all"
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirm-new-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Repeat new password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 dark:bg-slate-700/50 dark:text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Reset Password & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-700/60">
              <Link
                to="/auth/hospital/login"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Back to Staff Login
              </Link>
            </div>
          </form>
        )}

        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Encrypted SAHAY Authentication Security</span>
        </div>

      </div>
    </div>
  );
}
