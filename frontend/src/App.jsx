import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import PatientAuth from './pages/auth/PatientAuth';
import PatientLogin from './pages/auth/PatientLogin';
import HospitalRegister from './pages/auth/HospitalRegister';
import HospitalLogin from './pages/auth/HospitalLogin';
import GovtLogin from './pages/auth/GovtLogin';
import PatientDashboard from './pages/dashboards/PatientDashboard';
import HospitalAdminDashboard from './pages/dashboards/HospitalAdminDashboard';
import GovtDashboard from './pages/dashboards/GovtDashboard';
import DoctorDashboard from './pages/dashboards/DoctorDashboard';
import DrDashboardLayout from './pages/dashboards/DrDashboard/DrDashboardLayout';
import LabDashboard from './pages/dashboards/LabDashboard';
import AshaDashboard from './pages/dashboards/AshaDashboard';
import ReceptionistDashboard from './pages/dashboards/ReceptionistDashboard';
import NurseDashboard from './pages/dashboards/NurseDashboard';
import PharmacyDashboard from './pages/dashboards/PharmacyDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 selection:bg-mint-100 selection:text-mint-900">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Landing */}
            <Route path="/" element={<Landing />} />

            {/* Authentication Routes */}
            <Route path="/auth/patient" element={<PatientAuth />} />
            <Route path="/auth/patient/login" element={<div className="min-h-[80vh] flex items-center justify-center px-4 py-12"><div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6"><div className="text-center space-y-2"><div className="w-12 h-12 mx-auto rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center font-bold text-xl"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div><h2 className="text-2xl font-bold text-gov-900">Patient Login</h2><p className="text-xs text-slate-500">Official Citizen Healthcare Portal • National Health Network</p></div><PatientLogin /><div className="text-center pt-2"><Link to="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">← Back to National Portals Overview</Link></div></div></div>} />
            <Route path="/auth/hospital/register" element={<HospitalRegister />} />
            <Route path="/auth/hospital/login" element={<HospitalLogin />} />
            <Route path="/auth/govt" element={<GovtLogin />} />

            {/* Dashboards */}
            <Route path="/dashboard/patient" element={<PatientDashboard />} />
            <Route path="/dashboard/govt" element={<GovtDashboard />} />

            {/* Hospital Admin */}
            <Route path="/dashboard/admin" element={<HospitalAdminDashboard />} />
            <Route path="/dashboard/hospital" element={<HospitalAdminDashboard />} />

            {/* Clinical & Staff Dashboards */}
            <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
            {/* Full clinical workspace — protected, role-guarded inside the layout */}
            <Route path="/doctor" element={<DrDashboardLayout />} />
            <Route path="/dashboard/nurse" element={<NurseDashboard />} />
            <Route path="/dashboard/lab" element={<LabDashboard />} />
            <Route path="/dashboard/lab-pharmacy" element={<LabDashboard />} />
            <Route path="/dashboard/pharmacy" element={<PharmacyDashboard />} />

            {/* ASHA / Frontline Community Health Worker */}
            <Route path="/dashboard/asha" element={<AshaDashboard />} />
            <Route path="/dashboard/ashaworker" element={<AshaDashboard />} />
            <Route path="/dashboards/ashaworker" element={<AshaDashboard />} />
            <Route path="/dashboard/receptionist" element={<ReceptionistDashboard />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
