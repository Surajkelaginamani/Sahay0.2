import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import PatientAuth from './pages/auth/PatientAuth';
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
