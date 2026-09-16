import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import { getStoredAuth } from '../../utils/auth';
import SharedPatientForm from '../../components/common/SharedPatientForm';
import PatientLogin from './PatientLogin';

export default function PatientAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
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
        case 'LabHead':
          navigate('/dashboard/lab', { replace: true });
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

  // ── Self-registration handler (SharedPatientForm) ─────────────────────────
  const handleSelfRegister = async (payload, resetForm) => {
    setRegLoading(true);
    setRegError('');
    setRegSuccess('');

    try {
      const response = await patientAPI.register(payload);
      if (response.data?.requiresConfirmation) {
        return response.data;
      }

      // Save credentials in local storage
      localStorage.setItem('sahay_token', response.data.token);
      localStorage.setItem(
        'sahay_user',
        JSON.stringify({
          _id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone,
          patientId: response.data.patientId,
          role: response.data.role,
        })
      );
      if (response.data.patientId) {
        localStorage.setItem('patient_id', response.data.patientId);
      }

      setRegSuccess('Account created successfully! Redirecting to your dashboard…');
      resetForm?.();

      // Redirect after a brief delay so the user sees the success message
      setTimeout(() => {
        navigate('/dashboard/patient');
      }, 1500);
    } catch (err) {
      setRegError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className={`w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6 ${isLogin ? 'max-w-md' : 'max-w-lg'}`}>
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center font-bold text-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gov-900">
            {isLogin ? 'Patient Login' : 'Create Patient Account'}
          </h2>
          <p className="text-xs text-slate-500">
            Official Citizen Healthcare Portal • National Health Network
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
              setRegError('');
              setRegSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isLogin
                ? 'bg-white text-gov-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setRegError('');
              setRegSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isLogin
                ? 'bg-white text-gov-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Registration
          </button>
        </div>

        {/* ── Login Tab (Prompt 7.1 PatientLogin with 4-Digit PIN) ─────────── */}
        {isLogin ? (
          <PatientLogin onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          /* ── Registration Tab (SharedPatientForm) ──────────────────── */
          <SharedPatientForm
            isSelfRegister={true}
            onSubmit={handleSelfRegister}
            onUseExisting={(match) => {
              setIsLogin(true);
              if (match?.contactPhone) {
                setFormData((prev) => ({ ...prev, email: match.contactPhone }));
              }
            }}
            loading={regLoading}
            apiError={regError}
            successAlert={regSuccess}
          />
        )}

        <div className="text-center pt-2">
          <Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
            ← Back to National Portals Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
