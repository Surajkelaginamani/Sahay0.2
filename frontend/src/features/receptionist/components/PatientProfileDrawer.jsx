import React, { useState } from 'react';
import {
  X,
  Key,
  User,
  Phone,
  Calendar,
  CreditCard,
  Shield,
  Building2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import ResetPinModal from './ResetPinModal';

export default function PatientProfileDrawer({ patient, isOpen, onClose, onPatientUpdated }) {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(patient);

  // Sync prop changes
  React.useEffect(() => {
    setCurrentPatient(patient);
  }, [patient]);

  if (!isOpen || !currentPatient) return null;

  const fullName =
    currentPatient.fullName ||
    `${currentPatient.firstName || ''} ${currentPatient.lastName || ''}`.trim() ||
    'Patient Profile';

  const age = currentPatient.dob
    ? new Date().getFullYear() - new Date(currentPatient.dob).getFullYear()
    : null;

  const handleResetSuccess = (updated) => {
    setCurrentPatient((prev) => ({
      ...prev,
      ...updated,
      isTemporaryPin: true,
    }));
    onPatientUpdated?.(updated);
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in">
        <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-black text-lg">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">
                  {fullName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {currentPatient.uhid && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                      ID: {currentPatient.uhid}
                    </span>
                  )}
                  {currentPatient.isTemporaryPin && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                      Temporary PIN Active
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
            
            {/* Primary Action Button: Reset PIN (Prompt Requirement) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between gap-3 shadow-xs">
              <div>
                <p className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  Authentication Security
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Zero-cost in-person recovery using printed card key.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Reset PIN</span>
              </button>
            </div>

            {/* Demographics Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Patient Demographics
              </h4>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Date of Birth
                  </span>
                  <span className="font-semibold text-slate-800">
                    {currentPatient.dob
                      ? new Date(currentPatient.dob).toLocaleDateString('en-IN')
                      : '—'}
                    {age !== null && <span className="text-slate-400 ml-1">({age} yrs)</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Gender
                  </span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {currentPatient.gender || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Contact Phone
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {currentPatient.contactPhone || currentPatient.phone || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Father / Guardian
                  </span>
                  <span className="font-semibold text-slate-800">
                    {currentPatient.fatherOrGuardianName ||
                      currentPatient.emergencyContact?.name ||
                      '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    ABHA ID
                  </span>
                  <span className="font-semibold text-sky-700 font-mono text-xs">
                    {currentPatient.abhaId || 'Not linked'}
                  </span>
                </div>
              </div>
            </div>

            {/* Address & Facility Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Facility &amp; Location
              </h4>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
                {currentPatient.address && (
                  <div>
                    <p className="text-slate-500 font-medium">Registered Address:</p>
                    <p className="text-slate-800 font-semibold mt-0.5">
                      {[
                        currentPatient.address.village,
                        currentPatient.address.district,
                        currentPatient.address.state,
                        currentPatient.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'No address provided'}
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-500">Registered On:</span>
                  <span className="font-semibold text-slate-800">
                    {currentPatient.createdAt
                      ? new Date(currentPatient.createdAt).toLocaleDateString('en-IN')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Physical Card Notice */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  Physical Health Card
                </div>
                <button
                  type="button"
                  onClick={handlePrintCard}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px] hover:bg-sky-700 transition-colors"
                >
                  <Printer className="w-3 h-3" />
                  Print Card
                </button>
              </div>
              <p className="text-[11px] text-sky-700 leading-relaxed">
                The citizen should keep their physical health card for clinic visits. The 6-character recovery code printed on it is required to verify PIN resets.
              </p>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* 3-Step Security Gate Modal */}
      {resetModalOpen && (
        <ResetPinModal
          patient={currentPatient}
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          onSuccess={handleResetSuccess}
        />
      )}
    </>
  );
}
