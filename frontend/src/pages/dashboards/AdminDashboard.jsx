import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Activity, Radio, ExternalLink } from 'lucide-react';
import BroadcastHealthCampCard from '../../components/BroadcastHealthCampCard';
import EpidemicRadar from '../../components/EpidemicRadar';
import GovtDashboard from './GovtDashboard';

/**
 * State Admin Dashboard (AdminDashboard.jsx)
 * Unified command console integrating:
 * 1. Hyper-Local Community Health Camp Broadcast Center
 * 2. Geospatial Epidemic Radar & Surveillance
 * 3. State Healthcare Regulatory & Hospital Accreditation Management
 */
export default function AdminDashboard() {
  const [activeView, setActiveView] = useState('broadcast'); // 'broadcast' | 'regulatory' | 'radar'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Official Government Header Bar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    State Health Authority Command Center
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                    Official Administration
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ministry of Health & Family Welfare • National Public Health Network (PIN 413709 Zone)
                </p>
              </div>
            </div>

            {/* Quick Link to Patient Dashboard Demo */}
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard/patient"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-600 text-xs font-semibold transition border border-blue-200 dark:border-slate-600"
              >
                <span>View Patient Portal (Citizen View)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 overflow-x-auto">
            <button
              onClick={() => setActiveView('broadcast')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeView === 'broadcast'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Broadcast Community Camp</span>
            </button>
            <button
              onClick={() => setActiveView('radar')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeView === 'radar'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Geospatial Epidemic Radar</span>
            </button>
            <button
              onClick={() => setActiveView('regulatory')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeView === 'regulatory'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hospital Regulatory Registry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        {activeView === 'broadcast' && (
          <div className="space-y-6">
            <BroadcastHealthCampCard />

            {/* Context Notice */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-3">
              <div className="p-1 rounded bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                <Radio className="w-4 h-4 text-blue-700" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-blue-950">
                  Real-Time Cross-Portal Broadcast Demo
                </p>
                <p className="text-blue-800 leading-relaxed">
                  Broadcasting a health camp alert from this console instantly sends the public alert to citizens registered under PIN 413709. The banner will immediately be visible on the citizen's <Link to="/dashboard/patient" className="underline font-bold hover:text-blue-950">Patient Dashboard</Link> right above their Longitudinal Medical Timeline.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'radar' && (
          <div className="space-y-6">
            <EpidemicRadar />
          </div>
        )}

        {activeView === 'regulatory' && (
          <div>
            <GovtDashboard />
          </div>
        )}
      </div>
    </div>
  );
}
