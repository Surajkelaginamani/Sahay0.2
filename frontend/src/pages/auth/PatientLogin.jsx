import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import { getStoredAuth } from '../../utils/auth';
import { ShieldAlert, Building2, Key, CheckCircle2, AlertTriangle, X, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PatientLogin({ onSwitchToRegister }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Modal states
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  
  // First-use change PIN form state
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [changePinLoading, setChangePinLoading] = useState(false);
  const [changePinError, setChangePinError] = useState('');
  const [changePinSuccess, setChangePinSuccess] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user && auth.user.role === 'Patient') {
      if (auth.user.isTemporaryPin) {
        setShowChangePinModal(true);
      } else {
        navigate('/dashboard/patient', { replace: true });
      }
    }
  }, [navigate]);

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^\d+]/g, '');
    setPhone(val);
    setError('');
  };

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone) {
      setError('Please enter your mobile phone number.');
      return;
    }

    if (!cleanPin || cleanPin.length !== 4) {
      setError('Please enter your 4-digit security PIN.');
      return;
    }

    setLoading(true);

    try {
      // POST /api/auth/patient/login (Prompt 7.1)
      const response = await patientAPI.login({
        phone: cleanPhone,
        pin: cleanPin,
      });

      const token = response.data.token;
      const isTempPin = Boolean(
        response.data.isTemporaryPin === true ||
        response.data.patient?.isTemporaryPin === true
      );

      const userData = {
        _id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        patientId: response.data.patientId || response.data.patientProfileId,
        role: response.data.role,
        isTemporaryPin: isTempPin,
      };

      // Save credentials in local storage
      localStorage.setItem('token', token);
      localStorage.setItem('sahay_token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('sahay_user', JSON.stringify(userData));

      if (response.data.patientId || response.data.patientProfileId) {
        localStorage.setItem('patient_id', response.data.patientId || response.data.patientProfileId);
      }

      // First-Use Block: Check if temporary PIN
      if (isTempPin) {
        setShowChangePinModal(true);
      } else {
        navigate('/dashboard/patient');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Invalid phone number or PIN. Please verify your credentials.');
      } else {
        setError(
          err.response?.data?.message || 'Authentication failed. Please check your connection and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemporaryPin = async (e) => {
    e.preventDefault();
    setChangePinError('');

    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!/^\d{4}$/.test(cleanNew)) {
      setChangePinError('New PIN must be exactly 4 numeric digits.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setChangePinError('PINs do not match. Please re-enter.');
      return;
    }

    setChangePinLoading(true);

    try {
      await patientAPI.changeTemporaryPin({ newPin: cleanNew });

      // Update user in local storage
      const auth = getStoredAuth();
      if (auth && auth.user) {
        const updatedUser = { ...auth.user, isTemporaryPin: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('sahay_user', JSON.stringify(updatedUser));
      }

      setChangePinSuccess(true);
      setTimeout(() => {
        setShowChangePinModal(false);
        navigate('/dashboard/patient');
      }, 1200);
    } catch (err) {
      setChangePinError(
        err.response?.data?.message || 'Failed to update PIN. Please try again.'
      );
    } finally {
      setChangePinLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="font-medium leading-relaxed">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Phone Number field */}
        <div>
          <label htmlFor="patient-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Registered Mobile Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <span className="text-xs font-semibold text-slate-500 mr-1">+91</span>
              <span className="h-4 w-px bg-slate-200" />
            </div>
            <input
              id="patient-phone"
              type="tel"
              name="phone"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="9876543210"
              maxLength={13}
              className="w-full pl-14 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500 bg-slate-50 focus:bg-white transition-all tracking-wider"
              autoComplete="tel"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Enter the 10-digit mobile number linked with your patient record
          </p>
        </div>

        {/* 2. 4-Digit PIN input field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="patient-pin" className="block text-xs font-semibold text-slate-700">
              4-Digit Security PIN <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForgotPinModal(true)}
                className="text-[11px] font-semibold text-slate-500 hover:text-mint-700 transition-colors cursor-pointer"
              >
                Forgot PIN?
              </button>
              <span className="text-[10px] text-mint-700 bg-mint-50 border border-mint-200 px-2 py-0.5 rounded-full font-semibold">
                PIN Login
              </span>
            </div>
          </div>
          <div className="relative">
            <input
              id="patient-pin"
              type={showPin ? 'text' : 'password'}
              name="pin"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={handlePinChange}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm font-mono tracking-[0.35em] text-center focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500 bg-slate-50 focus:bg-white transition-all text-slate-900"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              tabIndex={-1}
              title={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              <Key className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-slate-400">
              Enter your 4-digit static PIN
            </p>
            <button
              type="button"
              onClick={() => setShowForgotPinModal(true)}
              className="text-[11px] text-mint-700 hover:underline font-medium sm:hidden"
            >
              Need help with PIN?
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !phone || pin.length !== 4}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-mint-600 to-emerald-600 hover:from-mint-700 hover:to-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Sign In with PIN</span>
            </>
          )}
        </button>
      </form>

      {/* Registration switch link */}
      {onSwitchToRegister && (
        <div className="text-center pt-3 border-t border-slate-100 mt-5">
          <p className="text-xs text-slate-500">
            First time visiting the portal?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-mint-700 hover:text-mint-800 font-semibold hover:underline cursor-pointer"
            >
              Create Account &amp; Set PIN
            </button>
          </p>
        </div>
      )}

      {/* ── Modal: Forgot PIN Guidance (Prompt Requirement) ────────────────── */}
      {showForgotPinModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPinModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                In-Person PIN Recovery Required
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                For your security, PINs cannot be reset online. Please visit your nearest SAHAY clinic reception with your physical health card.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Building2 className="w-4 h-4 text-mint-600" />
                What to bring to Reception:
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                <li>Your printed SAHAY Health Card (with 6-character Recovery Code).</li>
                <li>Your registered Date of Birth / Year of Birth.</li>
                <li>Your Father or Guardian's registered name.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotPinModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: First-Use Block — Create Your New Secret PIN ──────────────── */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-mint-100 text-mint-700 flex items-center justify-center shadow-inner">
                <Key className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Create Your New Secret PIN
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                You have authenticated with a temporary PIN issued by clinic reception. You must establish a new 4-digit secret PIN before accessing your records.
              </p>
            </div>

            {changePinError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{changePinError}</span>
              </div>
            )}

            {changePinSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-emerald-900">New Secret PIN Created</p>
                <p>Unlocking your healthcare dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateTemporaryPin} className="space-y-4">
                <div>
                  <label htmlFor="new-secret-pin" className="block text-xs font-bold text-slate-700 mb-1.5">
                    New 4-Digit Secret PIN
                  </label>
                  <input
                    id="new-secret-pin"
                    type={showNewPin ? 'text' : 'password'}
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setChangePinError('');
                    }}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-center text-sm font-mono tracking-[0.4em] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-mint-500 outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-secret-pin" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm Secret PIN
                  </label>
                  <input
                    id="confirm-secret-pin"
                    type={showNewPin ? 'text' : 'password'}
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setChangePinError('');
                    }}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-center text-sm font-mono tracking-[0.4em] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-mint-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showNewPin}
                      onChange={(e) => setShowNewPin(e.target.checked)}
                      className="rounded text-mint-600 focus:ring-mint-500 border-slate-300"
                    />
                    <span>Show digits</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={changePinLoading || newPin.length !== 4 || confirmPin.length !== 4}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-mint-600 to-emerald-600 hover:from-mint-700 hover:to-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {changePinLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Secure Account &amp; Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-mint-600" />
              <span>National Health Portal Security Standard</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
