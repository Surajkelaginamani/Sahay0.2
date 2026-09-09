import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import { getStoredAuth } from '../../utils/auth';

export default function PatientAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (isLogin) {
        response = await patientAPI.login({
          identifier: formData.email,
          email: formData.email,
          phone: formData.email,
          password: formData.password,
        });
      } else {
        if (!formData.name.trim()) {
          setError('Please provide your full legal name');
          setLoading(false);
          return;
        }
        response = await patientAPI.register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        });
      }

      // Save credentials in local storage (Prompt 12.2)
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

      navigate('/dashboard/patient');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
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

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500 transition-all"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {isLogin ? 'Phone Number or Email Address' : 'Email Address (Optional)'}
            </label>
            <input
              type={isLogin ? 'text' : 'email'}
              name="email"
              required={isLogin}
              value={formData.email}
              onChange={handleChange}
              placeholder={isLogin ? "e.g. 9876543210 or patient@example.com" : "e.g. patient@example.com"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 6 characters with secure hashing
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isLogin ? (
              'Sign In to Health Portal'
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
            ← Back to National Portals Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
