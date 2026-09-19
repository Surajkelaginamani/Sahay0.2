import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Globe, Sun, Moon, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { getStoredAuth } from '../utils/auth';

// Staff roles that have their own dashboard workspace — public nav is hidden for these
const STAFF_ROLES = ['Doctor', 'LabHead', 'Pharmacist', 'ASHA', 'HospitalAdmin', 'FacilityAdmin', 'Receptionist', 'Nurse'];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getStoredAuth();
  const user = auth?.user || null;
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [langOpen, setLangOpen] = useState(false);

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
      case 'Pharmacist':
        navigate('/dashboard/pharmacy');
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

  const handleLangChange = (code) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-xs">
      {/* Top National Announcement Bar */}
      <div className="bg-gov-900 dark:bg-slate-950 text-slate-300 text-xs py-1.5 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-mint-400 animate-pulse"></span>
          <span>{t('navbar.announcement')}</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-slate-400">
          <span>{t('navbar.helpline')}: <strong>1075</strong></span>
          <span>{t('navbar.emergency')}: <strong>112</strong></span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand — non-clickable when inside a staff dashboard */}
        {isStaffDashboard ? (
          <div className="flex items-center gap-3">
            <img
              src="/logo_1.png"
              alt="SAHAY Logo"
              className="w-10 h-10 object-contain drop-shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-gov-900 dark:text-slate-100">SAHAY</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                  Phase 1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('navbar.subtitle', 'Smart Access to Healthcare and Assistance for You')}
              </p>
            </div>
          </div>
        ) : (
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/logo_1.png"
              alt="SAHAY Logo"
              className="w-10 h-10 object-contain drop-shadow-sm shrink-0 group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-gov-900 dark:text-slate-100">SAHAY</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                  Phase 1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('navbar.subtitle', 'Smart Access to Healthcare and Assistance for You')}
              </p>
            </div>
          </Link>
        )}

        {/* Navigation Links — hidden for staff on their dashboard */}
        {!isStaffDashboard && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-gov-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {t('navbar.overview')}
            </Link>
            {user ? (
              <button
                id="navbar-go-to-dashboard-btn"
                onClick={handleGoToDashboard}
                className="px-3.5 py-2 text-sm font-semibold text-mint-700 dark:text-mint-400 hover:text-mint-800 dark:hover:text-mint-300 hover:bg-mint-50 dark:hover:bg-mint-900/30 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-mint-600 dark:text-mint-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>{t('navbar.goToDashboard')}</span>
              </button>
            ) : (
              <>
                <Link
                  to="/auth/patient"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-mint-700 dark:hover:text-mint-400 hover:bg-mint-50 dark:hover:bg-mint-900/30 rounded-lg transition-colors"
                >
                  {t('navbar.patientPortal')}
                </Link>
                <Link
                  to="/auth/hospital/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                >
                  {t('navbar.hospitalPortal')}
                </Link>
                <Link
                  to="/auth/govt"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-gov-navy dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('navbar.governmentPortal')}
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Right side: Language + Theme + User Actions */}
        <div className="flex items-center gap-2">

          {/* ── Language Switcher ── */}
          <div className="relative">
            <button
              id="navbar-language-switcher"
              onClick={() => setLangOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              aria-label={t('navbar.language')}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentLang.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    id={`lang-option-${lang.code}`}
                    onClick={() => handleLangChange(lang.code)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors
                      ${i18n.language === lang.code
                        ? 'bg-mint-50 dark:bg-mint-900/30 text-mint-700 dark:text-mint-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Theme Toggle ── */}
          <button
            id="navbar-theme-toggle"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            aria-label={theme === 'dark' ? t('navbar.lightMode') : t('navbar.darkMode')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* ── User Actions ── */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 hidden sm:inline">
                {t('navbar.signedInAs')} <strong className="text-slate-900 dark:text-slate-100">{user.name}</strong> ({user.role})
              </span>
              <button
                onClick={handleGoToDashboard}
                className="md:hidden px-3 py-1.5 text-xs font-semibold text-mint-700 dark:text-mint-400 bg-mint-50 dark:bg-mint-900/30 hover:bg-mint-100 dark:hover:bg-mint-900/50 rounded-lg border border-mint-200 dark:border-mint-700 transition-colors"
              >
                {t('navbar.dashboard')}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg border border-rose-200 dark:border-rose-700 transition-colors"
              >
                {t('navbar.signOut')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/hospital/register"
                className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-gov-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t('navbar.registerHospital')}
              </Link>
              <Link
                to="/auth/patient"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-mint-600 hover:bg-mint-700 rounded-lg shadow-sm transition-colors"
              >
                <span>{t('navbar.accessPortal')}</span>
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
