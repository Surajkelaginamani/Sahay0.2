import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gov-900 dark:bg-slate-950 text-slate-300 mt-auto border-t border-slate-800 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: About */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <img
                src="/logo_1.png"
                alt="SAHAY Logo"
                className="w-8 h-8 object-contain drop-shadow-sm shrink-0"
              />
              <span className="text-xl font-bold text-white tracking-tight">SAHAY</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Smart Access to Healthcare and Assistance for You (SAHAY) is a unified digital health infrastructure designed to streamline citizen healthcare access, hospital facility management, and government regulatory oversight.
            </p>
            <p className="text-xs text-slate-500">
              National Health Portal Integration • Government of India Compliance
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase">Portals</h4>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>
                <Link to="/auth/patient" className="hover:text-mint-400 transition-colors">
                  Patient Health Records
                </Link>
              </li>
              <li>
                <Link to="/auth/hospital/login" className="hover:text-sky-400 transition-colors">
                  Hospital Administration
                </Link>
              </li>
              <li>
                <Link to="/auth/hospital/register" className="hover:text-sky-400 transition-colors">
                  Register New Hospital
                </Link>
              </li>
              <li>
                <Link to="/auth/govt" className="hover:text-white transition-colors">
                  Government Health Authorities
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase">Emergency &amp; Help</h4>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li>National Toll-Free: <strong>1075</strong></li>
              <li>Emergency Medical: <strong>108 / 112</strong></li>
              <li>Ambulance Dispatch: <strong>102</strong></li>
              <li>Technical Support: support@sahay.gov.in</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 SAHAY - National Digital Health Initiative. All Rights Reserved.</p>
          <div className="flex gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
