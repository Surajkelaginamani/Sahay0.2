import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Hash,
  Calendar,
  User,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import receptionistApi from '../services/receptionistApi';

export default function ResetPinModal({ patient, isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [temporaryPin, setTemporaryPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  if (!isOpen || !patient) return null;

  const handleReset = () => {
    setRecoveryCode('');
    setYearOfBirth('');
    setGuardianName('');
    setTemporaryPin('');
    setConfirmPin('');
    setError('');
    setSuccess('');
    setStep(1);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = recoveryCode.trim().toUpperCase();
    const cleanYob = yearOfBirth.trim();
    const cleanGuardian = guardianName.trim();
    const cleanPin = temporaryPin.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setError('Physical Recovery Code must be exactly 6 alphanumeric characters.');
      setStep(1);
      return;
    }

    if (!cleanYob || cleanYob.length !== 4) {
      setError('Year of Birth must be 4 digits (e.g. 1985).');
      setStep(2);
      return;
    }

    if (!cleanGuardian) {
      setError('Father or Guardian name is required.');
      setStep(2);
      return;
    }

    if (!/^\d{4}$/.test(cleanPin)) {
      setError('Temporary PIN must be exactly 4 numeric digits.');
      setStep(3);
      return;
    }

    if (cleanPin !== confirmPin.trim()) {
      setError('Temporary PIN and confirmation do not match.');
      setStep(3);
      return;
    }

    setLoading(true);

    try {
      const res = await receptionistApi.verifyAndResetPin(patient._id, {
        recoveryCode: cleanCode,
        yearOfBirth: cleanYob,
        fatherOrGuardianName: cleanGuardian,
        newTemporaryPin: cleanPin,
      });

      setSuccess(
        res.data?.message ||
          'Temporary PIN successfully assigned. The patient must change this PIN upon next login.'
      );
      onSuccess?.(res.data?.patient || patient);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.isLocked || err.response?.status === 429) {
        setIsLocked(true);
        setError(
          resp?.message ||
            'Security Lockout: Maximum PIN reset attempts (3) exceeded for this patient.'
        );
      } else {
        if (resp?.remainingAttempts !== undefined) {
          setAttemptsRemaining(resp.remainingAttempts);
        }
        setError(
          resp?.message ||
            'Security validation failed. Please check the Recovery Code and Identity Challenge data.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Security Gate: Reset Patient PIN
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{patient.fullName || `${patient.firstName} ${patient.lastName}`}</span>
                {patient.uhid && <span className="font-mono text-violet-700 ml-1">({patient.uhid})</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Progress Header */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => !loading && !success && setStep(1)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                step === 1 ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 1 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                1
              </span>
              <span>Physical Proof</span>
            </button>

            <span className="h-px w-8 bg-slate-200" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => !loading && !success && setStep(2)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                step === 2 ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                2
              </span>
              <span>Identity Challenge</span>
            </button>

            <span className="h-px w-8 bg-slate-200" />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => !loading && !success && setStep(3)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                step === 3 ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                3
              </span>
              <span>Temporary PIN</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{error}</p>
                {attemptsRemaining !== null && !isLocked && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Warning: 3 consecutive failures will lock the patient from further PIN resets.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success State */}
          {success ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-emerald-900">
                  PIN Reset Successfully Logged
                </p>
                <p className="text-xs text-emerald-700 leading-relaxed">{success}</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs font-mono font-bold text-slate-800">
                Temporary PIN Assigned: <span className="text-emerald-700 tracking-widest">{temporaryPin}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                An immutable record has been written to the SAHAY Audit Log for this receptionist action.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Step 1: Physical Proof */}
              {step === 1 && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-start gap-2.5">
                    <CreditCard className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Step 1: Physical Card Verification</p>
                      <p className="text-[11px] text-sky-700 mt-0.5">
                        Inspect the patient's physical printed SAHAY health card and enter the 6-character recovery code printed on it.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="recovery-code-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                      6-Character Recovery Code <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Hash className="w-4 h-4" />
                      </div>
                      <input
                        id="recovery-code-input"
                        type="text"
                        maxLength={6}
                        required
                        value={recoveryCode}
                        onChange={(e) => {
                          setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                          setError('');
                        }}
                        placeholder="e.g. A3F9B2"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest uppercase bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Printed on the bottom-right of citizen's physical SAHAY card
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={recoveryCode.trim().length !== 6}
                    onClick={() => setStep(2)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Proceed to Identity Challenge</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Step 2: Identity Challenge */}
              {step === 2 && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Step 2: Demographic Identity Challenge</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Verify Year of Birth and Father / Guardian name against the citizen's government ID or oral declaration.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="challenge-yob" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Year of Birth (YYYY) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <input
                          id="challenge-yob"
                          type="text"
                          maxLength={4}
                          required
                          value={yearOfBirth}
                          onChange={(e) => {
                            setYearOfBirth(e.target.value.replace(/\D/g, '').slice(0, 4));
                            setError('');
                          }}
                          placeholder="e.g. 1985"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="challenge-guardian" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Father / Guardian Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="challenge-guardian"
                          type="text"
                          required
                          value={guardianName}
                          onChange={(e) => {
                            setGuardianName(e.target.value);
                            setError('');
                          }}
                          placeholder="e.g. Suresh Kumar"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={yearOfBirth.trim().length !== 4 || !guardianName.trim()}
                      onClick={() => setStep(3)}
                      className="w-2/3 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span>Proceed to PIN Assignment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Temporary PIN Assignment */}
              {step === 3 && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Step 3: Assign Temporary PIN</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Assign a 4-digit temporary PIN. The patient will be forced to create their own secret PIN upon their next login.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="temp-pin" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Temporary PIN <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="temp-pin"
                        type="password"
                        maxLength={4}
                        required
                        value={temporaryPin}
                        onChange={(e) => {
                          setTemporaryPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                          setError('');
                        }}
                        placeholder="••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-center text-sm font-mono tracking-widest bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirm-temp-pin" className="block text-xs font-bold text-slate-700 mb-1.5">
                        Confirm PIN <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="confirm-temp-pin"
                        type="password"
                        maxLength={4}
                        required
                        value={confirmPin}
                        onChange={(e) => {
                          setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                          setError('');
                        }}
                        placeholder="••••"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-center text-sm font-mono tracking-widest bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        isLocked ||
                        temporaryPin.length !== 4 ||
                        confirmPin.length !== 4 ||
                        temporaryPin !== confirmPin
                      }
                      className="w-2/3 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying &amp; Resetting…</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-3.5 h-3.5" />
                          <span>Confirm &amp; Reset PIN</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Rate limiting notice */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>SAHAY Receptionist Audit Trail &amp; Rate Limiting Protected</span>
          </div>

        </div>
      </div>
    </div>
  );
}
