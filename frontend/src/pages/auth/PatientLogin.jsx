import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import { getStoredAuth } from '../../utils/auth';

export default function PatientLogin({ onSwitchToRegister }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user && auth.user.role) {
      if (auth.user.role === 'Patient') {
        navigate('/dashboard/patient', { replace: true });
      }
    }
  }, [navigate]);

  const handlePhoneChange = (e) => {
    // Keep only numbers or clean string
    const val = e.target.value.replace(/[^\d+]/g, '');
    setPhone(val);
    setError('');
  };

  const handlePinChange = (e) => {
    // Numeric only, max 4 digits
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

      // Save credentials in local storage
      const token = response.data.token;
      localStorage.setItem('token', token);
      localStorage.setItem('sahay_token', token);
      localStorage.setItem(
        'sahay_user',
        JSON.stringify({
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone,
          patientId: response.data.patientId || response.data.patientProfileId,
          role: response.data.role,
        })
      );
      if (response.data.patientId || response.data.patientProfileId) {
        localStorage.setItem('patient_id', response.data.patientId || response.data.patientProfileId);
      }

      navigate('/dashboard/patient');
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

  return (
    <div className="w-full">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
          <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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

        {/* 2. 4-Digit PIN input field right below the phone number field (Prompt 7.1) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="patient-pin" className="block text-xs font-semibold text-slate-700">
              4-Digit Security PIN <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-mint-700 bg-mint-50 border border-mint-200 px-2 py-0.5 rounded-full font-semibold">
              PIN Login
            </span>
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
              {showPin ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Enter your 4-digit static PIN configured during registration
          </p>
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
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
    </div>
  );
}
