import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredAuth } from "../utils/auth";

const landingStyles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px 4px rgba(6,182,212,0.18), 0 0 60px 10px rgba(6,182,212,0.07); }
    50%       { box-shadow: 0 0 32px 8px rgba(6,182,212,0.32), 0 0 90px 20px rgba(6,182,212,0.12); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes scanLine {
    0%   { top: 0%; opacity: 0.5; }
    100% { top: 100%; opacity: 0; }
  }

  .hero-bg {
    background-image: url("/hero.png");
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
  }
  .hero-overlay {
    background: linear-gradient(
      160deg,
      rgba(255,255,255,0.28) 0%,
      rgba(230,254,255,0.15) 30%,
      rgba(186,246,255,0.08) 60%,
      rgba(255,255,255,0.22) 100%
    );
  }

  .glass-card {
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(18px) saturate(160%);
    -webkit-backdrop-filter: blur(18px) saturate(160%);
    border: 1px solid rgba(6,182,212,0.18);
    box-shadow: 0 4px 32px 0 rgba(6,182,212,0.08), 0 1.5px 6px 0 rgba(0,0,0,0.04);
    transition: all 0.32s cubic-bezier(0.4,0,0.2,1);
  }
  .glass-card:hover {
    background: rgba(255,255,255,0.88);
    border-color: rgba(6,182,212,0.42);
    box-shadow: 0 8px 48px 0 rgba(6,182,212,0.18), 0 2px 10px 0 rgba(0,0,0,0.06);
    transform: translateY(-4px) scale(1.01);
  }

  .glow-badge { animation: glowPulse 3.2s ease-in-out infinite; }

  .shimmer-text {
    background: linear-gradient(90deg, #0369a1 0%, #0891b2 25%, #0284c7 50%, #0891b2 75%, #0369a1 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite;
    text-shadow: none !important;
    display: inline-block;
  }

  .hero-sahay {
    display: inline-block;
    position: relative;
    background: linear-gradient(120deg, #0369a1 0%, #0891b2 22%, #0284c7 48%, #1d4ed8 74%, #0369a1 100%);
    background-size: 250% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 4s linear infinite;
    text-shadow: none !important;
    filter: drop-shadow(0 2px 10px rgba(6, 182, 212, 0.42));
    font-weight: 900;
    transition: filter 0.3s ease;
  }
  .hero-sahay:hover {
    filter: drop-shadow(0 4px 18px rgba(6, 182, 212, 0.65));
  }

  .fade-up-1 { animation: fadeInUp 0.7s ease both 0.1s; }
  .hero-heading { text-shadow: 0 2px 24px rgba(255,255,255,0.85), 0 1px 4px rgba(255,255,255,0.6); }
  .hero-sub { text-shadow: 0 1px 12px rgba(255,255,255,0.9); }
  .fade-up-2 { animation: fadeInUp 0.7s ease both 0.25s; }
  .fade-up-3 { animation: fadeInUp 0.7s ease both 0.40s; }
  .fade-up-4 { animation: fadeInUp 0.7s ease both 0.55s; }
  .fade-up-5 { animation: fadeInUp 0.7s ease both 0.70s; }

  .card-scan::before {
    content: "";
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(6,182,212,0.55), transparent);
    animation: scanLine 3.2s linear infinite;
    pointer-events: none;
    border-radius: 999px;
  }

  .stat-chip {
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(6,182,212,0.28);
    box-shadow: 0 2px 16px rgba(6,182,212,0.14), 0 0 0 0.5px rgba(255,255,255,0.6);
    transition: all 0.22s ease;
  }
  .stat-chip:hover {
    border-color: rgba(6,182,212,0.55);
    box-shadow: 0 4px 28px rgba(6,182,212,0.22);
    transform: translateY(-2px);
  }

  .portal-btn-teal {
    background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
    box-shadow: 0 4px 18px rgba(6,182,212,0.35);
    transition: all 0.22s ease;
  }
  .portal-btn-teal:hover {
    background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%);
    box-shadow: 0 6px 28px rgba(6,182,212,0.50);
    transform: translateY(-2px);
  }
  .portal-btn-sky {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    box-shadow: 0 4px 18px rgba(2,132,199,0.32);
    transition: all 0.22s ease;
  }
  .portal-btn-sky:hover {
    background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
    box-shadow: 0 6px 28px rgba(2,132,199,0.45);
    transform: translateY(-2px);
  }
  .portal-btn-dark {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    box-shadow: 0 4px 18px rgba(15,23,42,0.28);
    transition: all 0.22s ease;
  }
  .portal-btn-dark:hover {
    background: linear-gradient(135deg, #1e293b 0%, #1e40af 100%);
    box-shadow: 0 6px 28px rgba(30,58,138,0.40);
    transform: translateY(-2px);
  }

  .pillar-box {
    background: rgba(255,255,255,0.78);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(6,182,212,0.14);
    transition: all 0.25s ease;
  }
  .pillar-box:hover {
    border-color: rgba(6,182,212,0.38);
    box-shadow: 0 6px 32px rgba(6,182,212,0.12);
    transform: translateY(-3px);
  }
  .arch-section-bg {
    background: linear-gradient(135deg, rgba(236,253,255,0.90) 0%, rgba(207,250,254,0.70) 50%, rgba(240,249,255,0.85) 100%);
    border: 1px solid rgba(6,182,212,0.14);
  }
  .number-badge {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth && auth.user && auth.user.role) {
      const user = auth.user;
      switch (user.role) {
        case "Doctor":
          navigate("/dashboard/doctor", { replace: true });
          break;
        case "HospitalAdmin":
        case "FacilityAdmin":
          navigate("/dashboard/admin", { replace: true });
          break;
        case "Receptionist":
          navigate("/dashboard/receptionist", { replace: true });
          break;
        case "Nurse":
          navigate("/dashboard/nurse", { replace: true });
          break;
        case "LabHead":
          navigate("/dashboard/lab", { replace: true });
          break;
        case "Pharmacist":
          navigate("/dashboard/pharmacy", { replace: true });
          break;
        case "Patient":
          navigate("/dashboard/patient", { replace: true });
          break;
        case "Govt":
        case "GovernmentOfficial":
          navigate("/dashboard/govt", { replace: true });
          break;
        case "ASHA":
          navigate("/dashboard/asha", { replace: true });
          break;
        default:
          break;
      }
    }
  }, [navigate]);

  return (
    <>
      <style>{landingStyles}</style>
      <div>

        {/* -- Hero Section ------------------------------------------- */}
        <section className="relative overflow-hidden hero-bg min-h-[88vh] flex items-center">
          <div className="absolute inset-0 hero-overlay" />

          {/* Map-glow: enhances the Maharashtra map visibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 55% 70% at 72% 45%, rgba(6,182,212,0.18) 0%, rgba(34,211,238,0.10) 40%, transparent 70%)" }}
          />
          {/* Left subtle white softener for text area */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(255,255,255,0.22) 0%, transparent 100%)" }}
          />

          <div className="relative z-10 w-full px-4 sm:px-8 py-24"><div className="max-w-2xl space-y-7">

            {/* Live badge */}
            <div className="fade-up-1 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-semibold stat-chip text-slate-700" style={{background:"rgba(255,255,255,0.88)"}}>
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{ boxShadow: "0 0 8px 2px rgba(6,182,212,0.6)" }} />
              <span>National Digital Health Platform — Republic of India</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] font-bold tracking-wide">LIVE</span>
            </div>

            {/* Headline */}
            <h1 className="fade-up-2 hero-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-800">
              Smart Access to Healthcare{" "}
              <span className="hero-sahay">(SAHAY)</span>
            </h1>

            {/* Subtitle */}
            <p className="fade-up-3 hero-sub text-lg sm:text-xl text-slate-700 max-w-xl leading-relaxed">
              A unified, secure, and interoperable government healthcare portal connecting{" "}
              <span className="text-cyan-700 font-semibold">citizens</span>,{" "}
              <span className="text-sky-700 font-semibold">accredited medical institutions</span>, and{" "}
              <span className="text-blue-800 font-semibold">health ministry officials</span>{" "}
              across the nation.
            </p>

            {/* Stat chips */}
            <div className="fade-up-4 pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
              {[
                { icon: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", color: "text-cyan-600", label: "ABDM & DISHA Compliant", fill: true },
                { icon: "M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", color: "text-sky-600", label: "Government Verified Hospitals", fill: true },
                { icon: "M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z", color: "text-blue-800", label: "ASHA & Rural Grid Support", fill: true },
                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "text-cyan-700", label: "End-to-End Encrypted", fill: false },
              ].map(({ icon, color, label, fill }) => (
                <div key={label} className="flex items-center gap-2 stat-chip px-3.5 py-2 rounded-xl">
                  <svg className={`w-4 h-4 ${color}`} fill={fill ? "currentColor" : "none"} viewBox={fill ? "0 0 20 20" : "0 0 24 24"} stroke={fill ? undefined : "currentColor"}>
                    <path
                      fillRule={fill ? "evenodd" : undefined}
                      clipRule={fill ? "evenodd" : undefined}
                      strokeLinecap={fill ? undefined : "round"}
                      strokeLinejoin={fill ? undefined : "round"}
                      strokeWidth={fill ? undefined : "2"}
                      d={icon}
                    />
                  </svg>
                  {label}
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="fade-up-5 pt-4 flex flex-wrap gap-4">
              <Link to="/auth/patient" id="hero-patient-cta" className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-white font-bold text-sm portal-btn-teal">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Access as Citizen
              </Link>
              <Link to="/auth/hospital/login" id="hero-hospital-cta" className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-white font-bold text-sm portal-btn-sky">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Hospital Portal
              </Link>
              <Link to="/auth/govt" id="hero-govt-cta" className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-white font-bold text-sm portal-btn-dark">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Govt Officer Login
              </Link>
            </div>
          </div>

          </div>{/* Bottom fade to white */}
          <div
            className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(248,250,252,0.97))" }}
          />
        </section>

        {/* -- Portal Cards -------------------------------------------- */}
        <section className="relative bg-slate-50 py-20 px-4 sm:px-8">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)" }}
          />
          <div className="relative max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-cyan-600 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
                Dedicated Portals
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800">
                Select Your <span className="shimmer-text">Access Portal</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto">
                SAHAY provides role-tailored authentication for patients, accredited hospitals, and regulatory officers.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

              {/* Patient Card */}
              <div className="relative flex flex-col glass-card rounded-3xl p-8 card-scan overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none"
                  style={{ background: "radial-gradient(circle at top right, rgba(6,182,212,0.12), transparent 70%)" }} />
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform glow-badge"
                  style={{ background: "linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)", border: "1.5px solid rgba(6,182,212,0.30)" }}>
                  <svg className="w-7 h-7 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Patient Portal</h3>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">Citizens</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Register or log in to view your complete electronic health record, consult doctors, and track health history seamlessly.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-2 pt-2">
                    {["Integrated Digital Health Locker", "Direct Doctor & ASHA Worker Linkage", "Secure Password-Protected Access"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-100 border border-cyan-300 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-8 mt-6 border-t border-cyan-100">
                  <Link to="/auth/patient" id="card-patient-login"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm portal-btn-teal">
                    Enter Patient Portal
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Hospital Card */}
              <div className="relative flex flex-col glass-card rounded-3xl p-8 card-scan overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none"
                  style={{ background: "radial-gradient(circle at top right, rgba(2,132,199,0.10), transparent 70%)" }} />
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", border: "1.5px solid rgba(2,132,199,0.28)", boxShadow: "0 0 16px 2px rgba(2,132,199,0.10)" }}>
                  <svg className="w-7 h-7 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Hospital Portal</h3>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">Accredited Clinics</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Hospital administrators can manage beds, doctors, and patient admissions. New facilities must undergo government verification.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-2 pt-2">
                    {["Official Registration & Accreditation", "Departmental Staff Management", "Strict Regulatory Status Verification"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-8 mt-6 border-t border-sky-100 space-y-2.5">
                  <Link to="/auth/hospital/login" id="card-hospital-login"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm portal-btn-sky">
                    Hospital Admin Login
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                  <Link to="/auth/hospital/register" id="card-hospital-register"
                    className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-slate-700 font-semibold text-xs border border-sky-200 hover:border-sky-400 hover:bg-white transition-all"
                    style={{ background: "rgba(255,255,255,0.70)" }}>
                    Register New Healthcare Facility
                  </Link>
                </div>
              </div>

              {/* Government Card */}
              <div className="relative flex flex-col glass-card rounded-3xl p-8 card-scan overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full pointer-events-none"
                  style={{ background: "radial-gradient(circle at top right, rgba(30,58,138,0.08), transparent 70%)" }} />
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", border: "1.5px solid rgba(30,58,138,0.22)", boxShadow: "0 0 14px 2px rgba(30,58,138,0.08)" }}>
                  <svg className="w-7 h-7 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Government Portal</h3>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-blue-900 border border-slate-300">Regulatory Officers</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Authorized officers review pending hospital registrations, grant or reject credentials, and monitor healthcare compliance metrics.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-2 pt-2">
                    {["Verification of Pending Facilities", "Fraud & Impersonation Prevention", "National Healthcare Governance"].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-8 mt-6 border-t border-slate-200">
                  <Link to="/auth/govt" id="card-govt-login"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm portal-btn-dark">
                    Government Officer Login
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* -- Architecture Pillars ------------------------------------ */}
        <section className="py-20 px-4 sm:px-8" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ecfeff 50%, #f0f9ff 100%)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="arch-section-bg rounded-3xl p-8 sm:p-14">
              <div className="max-w-3xl mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
                  Core Architecture
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-800 mt-4">
                  Built for National Trust,{" "}
                  <span className="shimmer-text">Security & Compliance</span>
                </h2>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  SAHAY bridges the digital gap between urban tertiary care and rural health outposts with strict multi-role governance and end-to-end encryption.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { num: "01", title: "Mandatory Verification", desc: "Hospitals cannot access patient data or issue prescriptions until an authorized government officer certifies their registration." },
                  { num: "02", title: "Role-Based Access", desc: "Distinct security perimeters ensure patients, doctors, hospital admins, and government officials only access authorized views." },
                  { num: "03", title: "Encrypted Passwords & JWT", desc: "Bcrypt 10-round salted password protection and JSON Web Tokens ensure high cryptographic privacy." },
                  { num: "04", title: "National Scalability", desc: "Decoupled frontend and Express REST architecture primed for integration with central health registries." },
                ].map(({ num, title, desc }) => (
                  <div key={num} className="pillar-box rounded-2xl p-6 space-y-3">
                    <div className="text-2xl font-black number-badge">{num}</div>
                    <h4 className="font-bold text-slate-800 text-base">{title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
