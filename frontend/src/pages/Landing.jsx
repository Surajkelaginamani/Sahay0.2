import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStoredAuth } from '../utils/auth';

export default function Landing() {
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
        case 'Nurse':
          navigate('/dashboard/nurse', { replace: true });
          break;
        case 'LabHead':
          navigate('/dashboard/lab', { replace: true });
          break;
        case 'Pharmacist':
          navigate('/dashboard/pharmacy', { replace: true });
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

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-mint-50/60 via-sky-50/30 to-white pt-12 pb-16 px-4 sm:px-8 border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-mint-500"></span>
            <span>National Digital Health Platform • Republic of India</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gov-900 tracking-tight leading-tight">
            Smart Access to Healthcare{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-mint-600 via-sky-600 to-gov-navy">
              (SAHAY)
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            A unified, secure, and interoperable government healthcare portal connecting citizens, accredited medical institutions, and health ministry officials across the nation.
          </p>

          {/* Quick Stat Badges */}
          <div className="pt-4 flex flex-wrap justify-center items-center gap-3 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xs">
              <svg className="w-4 h-4 text-mint-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>ABDM & DISHA Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xs">
              <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Government Verified Hospitals</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xs">
              <svg className="w-4 h-4 text-gov-navy" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span>ASHA & Rural Grid Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Selection Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gov-900">
            Select Your Dedicated Access Portal
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
            SAHAY provides role-tailored authentication for patients, accredited hospitals, and regulatory officers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card 1: Patient Portal */}
          <div className="flex flex-col bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md hover:border-mint-300 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-mint-100 text-mint-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gov-900">Patient Portal</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-mint-50 text-mint-700 border border-mint-200">
                  Citizens
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Register or log in to view your complete electronic health record, consult doctors, and track health history seamlessly.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-mint-600 font-bold">✓</span> Integrated Digital Health Locker
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-mint-600 font-bold">✓</span> Direct Doctor & ASHA Worker Linkage
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-mint-600 font-bold">✓</span> Secure Password-Protected Access
                </li>
              </ul>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100">
              <Link
                to="/auth/patient"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-mint-600 hover:bg-mint-700 text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <span>Enter Patient Portal</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Card 2: Hospital Portal */}
          <div className="flex flex-col bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md hover:border-sky-300 transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gov-900">Hospital Portal</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Accredited Clinics
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hospital administrators can manage beds, doctors, and patient admissions. New facilities must undergo government verification.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-sky-600 font-bold">✓</span> Official Registration & Accreditation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sky-600 font-bold">✓</span> Departmental Staff Management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-sky-600 font-bold">✓</span> Strict Regulatory Status Verification
                </li>
              </ul>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100 space-y-2">
              <Link
                to="/auth/hospital/login"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <span>Hospital Admin Login</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                to="/auth/hospital/register"
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
              >
                Register New Healthcare Facility
              </Link>
            </div>
          </div>

          {/* Card 3: Government Portal */}
          <div className="flex flex-col bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md hover:border-gov-navy transition-all group">
            <div className="w-14 h-14 rounded-2xl bg-gov-100 text-gov-navy flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gov-900">Government Portal</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-gov-900 border border-slate-300">
                  Regulatory Officers
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Authorized officers review pending hospital registrations, grant or reject credentials, and monitor healthcare compliance metrics.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-gov-navy font-bold">✓</span> Verification of Pending Facilities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gov-navy font-bold">✓</span> Fraud & Impersonation Prevention
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gov-navy font-bold">✓</span> National Healthcare Governance
                </li>
              </ul>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-100">
              <Link
                to="/auth/govt"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gov-900 hover:bg-black text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <span>Government Officer Login</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Project Explanation Pillars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        <div className="bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-mint-700 bg-mint-100 px-3 py-1 rounded-md">
              Core Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gov-900 mt-3">
              Built for National Trust, Security & Compliance
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              SAHAY bridges the digital gap between urban tertiary care and rural health outposts with strict multi-role governance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="text-mint-600 font-bold text-lg">01</div>
              <h4 className="font-bold text-gov-900 text-base">Mandatory Verification</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hospitals cannot access patient data or issue prescriptions until an authorized government officer certifies their registration.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="text-sky-600 font-bold text-lg">02</div>
              <h4 className="font-bold text-gov-900 text-base">Role-Based Access</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Distinct security perimeters ensure patients, doctors, hospital admins, and government officials only access authorized views.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="text-gov-navy font-bold text-lg">03</div>
              <h4 className="font-bold text-gov-900 text-base">Encrypted Passwords & JWT</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bcrypt 10-round salted password protection and JSON Web Tokens ensure high cryptographic privacy.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
              <div className="text-mint-700 font-bold text-lg">04</div>
              <h4 className="font-bold text-gov-900 text-base">National Scalability</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Decoupled frontend and Express REST architecture primed for integration with central health registries.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
