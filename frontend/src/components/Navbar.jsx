import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getStoredAuth } from '../utils/auth';

// Staff roles that have their own dashboard workspace — public nav is hidden for these
const STAFF_ROLES = ['Doctor', 'LabHead', 'ASHA', 'HospitalAdmin', 'FacilityAdmin', 'Receptionist', 'Nurse'];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getStoredAuth();
  const user = auth?.user || null;

  // Hide public navigation when a staff member is inside their dashboard
  const isStaffDashboard =
    user &&
    STAFF_ROLES.includes(user.role) &&
    (location.pathname.startsWith('/doctor') ||
      location.pathname.startsWith('/dashboard/'));

  const handleGoToDashboard = () => {
    if (!user || !user.role) {
      navigate('/');
      return;
    }
    switch (user.role) {
      case 'Doctor':
        navigate('/dashboard/doctor');
        break;
      case 'HospitalAdmin':
      case 'FacilityAdmin':
        navigate('/dashboard/admin');
        break;
      case 'Receptionist':
        navigate('/dashboard/receptionist');
        break;
      case 'Nurse':
        navigate('/dashboard/nurse');
        break;
      case 'LabHead':
        navigate('/dashboard/lab');
        break;
      case 'Patient':
        navigate('/dashboard/patient');
        break;
      case 'Govt':
      case 'GovernmentOfficial':
        navigate('/dashboard/govt');
        break;
      case 'ASHA':
        navigate('/dashboard/asha');
        break;
      default:
        navigate('/');
        break;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sahay_token');
    localStorage.removeItem('user');
    localStorage.removeItem('sahay_user');
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top National Announcement Bar */}
      <div className="bg-gov-900 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-mint-400 animate-pulse"></span>
          <span>Official Digital Healthcare Platform • Ministry of Health &amp; Family Welfare</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-slate-400">
          <span>National Health Helpline: <strong>1075</strong></span>
          <span>Emergency: <strong>112</strong></span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand — non-clickable when inside a staff dashboard */}
        {isStaffDashboard ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mint-600 via-mint-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-mint-500/20">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-gov-900">SAHAY</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Phase 1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Smart Access to Healthcare</p>
            </div>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mint-600 via-mint-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-mint-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-gov-900">SAHAY</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Phase 1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Smart Access to Healthcare</p>
            </div>
          </Link>
        )}

        {/* Navigation Links — hidden for staff on their dashboard */}
        {!isStaffDashboard && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-gov-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Overview
            </Link>
            {user ? (
              <button
                id="navbar-go-to-dashboard-btn"
                onClick={handleGoToDashboard}
                className="px-3.5 py-2 text-sm font-semibold text-mint-700 hover:text-mint-800 hover:bg-mint-50 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-mint-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <>
                <Link
                  to="/auth/patient"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-mint-700 hover:bg-mint-50 rounded-lg transition-colors"
                >
                  Patient Portal
                </Link>
                <Link
                  to="/auth/hospital/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                >
                  Hospital Portal
                </Link>
                <Link
                  to="/auth/govt"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-gov-navy hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Government Portal
                </Link>
              </>
            )}
          </nav>
        )}

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                Signed in as <strong className="text-slate-900">{user.name}</strong> ({user.role})
              </span>
              <button
                onClick={handleGoToDashboard}
                className="md:hidden px-3 py-1.5 text-xs font-semibold text-mint-700 bg-mint-50 hover:bg-mint-100 rounded-lg border border-mint-200 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/hospital/register"
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-gov-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Register Hospital
              </Link>
              <Link
                to="/auth/patient"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-mint-600 hover:bg-mint-700 rounded-lg shadow-sm transition-colors"
              >
                <span>Access Portal</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

