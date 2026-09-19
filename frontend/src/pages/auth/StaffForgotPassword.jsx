import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2, AlertTriangle, Building2, ArrowLeft, Shield } from 'lucide-react';
import { staffAuthAPI } from '../../services/api';

export default function StaffForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setDevResetUrl('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered staff email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await staffAuthAPI.forgotPassword({ email: cleanEmail });
      setSuccess(
        res.data?.message || 'Password reset instructions have been sent to your registered email address.'
      );
      if (res.data?.resetUrl) {
        setDevResetUrl(res.data.resetUrl);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to send password reset request. Please verify your email.'
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
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Forgot Password
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Hospital Staff Portal (Doctors, Nurses, Administrators). Enter your email to receive a secure 15-minute reset link.
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
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 dark:text-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Reset Link Sent
              </div>
              <p className="leading-relaxed">{success}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                The link is valid for 15 minutes. Check your inbox and spam folder.
              </p>
            </div>

            {/* Development Mode Quick Link */}
            {devResetUrl && (
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-xs text-sky-800 dark:text-sky-200 space-y-1.5">
                <p className="font-bold text-[11px] uppercase tracking-wider text-sky-900 dark:text-sky-300">
                  Development Mode Link
                </p>
                <a
                  href={devResetUrl}
                  className="block text-sky-600 dark:text-sky-400 font-mono text-[11px] break-all hover:underline"
                >
                  {devResetUrl}
                </a>
              </div>
            )}

            <div className="pt-2 text-center">
              <Link
                to="/auth/hospital/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Staff Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="staff-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Registered Staff Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="staff-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="doctor@hospital.org"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 dark:bg-slate-700/50 dark:text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-700/60">
              <Link
                to="/auth/hospital/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Staff Login
              </Link>
            </div>
          </form>
        )}

        {/* Security badge */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Secured SAHAY Healthcare Authentication</span>
        </div>

      </div>
    </div>
  );
}
