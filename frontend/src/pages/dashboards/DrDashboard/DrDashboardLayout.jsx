import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PatientQueue from './PatientQueue';
import ConsultationView from './ConsultationView';
import PatientTimeline from './PatientTimeline';

// Sidebar nav items
const NAV_ITEMS = [
  {
    id: 'queue',
    label: "Today's Queue",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'consultation',
    label: 'Consultation',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Patient History',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function DrDashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  // Shared state: the patient currently selected for consultation / timeline
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth guard — mirrors DoctorDashboard.jsx pattern
  useEffect(() => {
    const stored = localStorage.getItem('user') || localStorage.getItem('sahay_user');
    if (!stored) {
      navigate('/auth/hospital/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'Doctor') {
      navigate('/');
      return;
    }
    setUser(parsed);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sahay_token');
    localStorage.removeItem('user');
    localStorage.removeItem('sahay_user');
    navigate('/auth/hospital/login');
  };

  // Called from PatientQueue when doctor clicks "Start Consultation"
  const handleSelectPatient = (patient, appointment) => {
    setSelectedPatient(patient);
    setSelectedAppointment(appointment);
    setActiveTab('consultation');
  };

  // Called from PatientQueue when doctor clicks "View History"
  const handleViewTimeline = (patient) => {
    setSelectedPatient(patient);
    setActiveTab('timeline');
  };

  if (!user) return null;

  const renderContent = () => {
    switch (activeTab) {
      case 'queue':
        return (
          <PatientQueue
            onStartConsultation={handleSelectPatient}
            onViewTimeline={handleViewTimeline}
          />
        );
      case 'consultation':
        return (
          <ConsultationView
            patient={selectedPatient}
            appointment={selectedAppointment}
            onCompleted={() => setActiveTab('queue')}
          />
        );
      case 'timeline':
        return (
          <PatientTimeline
            patient={selectedPatient}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* ---- Sidebar ---- */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 shrink-0`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Dr. Workspace</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d={sidebarOpen ? 'M11 19l-7-7 7-7' : 'M13 5l7 7-7 7'} />
            </svg>
          </button>
        </div>

        {/* Doctor info */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
            {user.hospitalName && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{user.hospitalName}</p>
            )}
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-semibold">
              Doctor
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <span className={isActive ? 'text-sky-600' : 'text-slate-400'}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-700 dark:hover:text-rose-400 transition-all"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ---- Main Content ---- */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Context chip — show active patient if in consultation or timeline */}
          {selectedPatient && (activeTab === 'consultation' || activeTab === 'timeline') && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-100">
              <span className="w-6 h-6 rounded-full bg-sky-200 text-sky-800 text-xs font-bold flex items-center justify-center">
                {selectedPatient.name?.[0]?.toUpperCase() || 'P'}
              </span>
              <span className="text-xs font-semibold text-sky-800">{selectedPatient.name}</span>
            </div>
          )}
        </div>

        {/* Page content */}
        <div className="p-6">{renderContent()}</div>
      </main>
    </div>
  );
}
