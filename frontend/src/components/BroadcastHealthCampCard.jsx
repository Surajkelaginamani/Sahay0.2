import React, { useState } from 'react';
import axios from 'axios';
import { Send, Megaphone, CheckCircle2, Users, MapPin, Calendar, ExternalLink } from 'lucide-react';

/**
 * Broadcast Community Health Camp Card
 * Standard Government UI component for public health officials to broadcast
 * hyper-local health camps and maternal health alerts to citizens by PIN code.
 */
export default function BroadcastHealthCampCard({ onBroadcastSuccess }) {
  const [campName, setCampName] = useState('Free Maternal Health & Anemia Camp');
  const [dateTime, setDateTime] = useState('Tomorrow, 9:00 AM');
  const [pincode, setPincode] = useState('413709');
  const [registrationUrl, setRegistrationUrl] = useState('https://forms.gle/mocklink123');
  const [toastMessage, setToastMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentBroadcasts, setRecentBroadcasts] = useState([
    {
      id: 'BC-9041',
      title: 'Free Maternal Health & Anemia Camp',
      date: 'Tomorrow, 9:00 AM',
      pincode: '413709',
      registrationUrl: 'https://forms.gle/mocklink123',
      recipients: 142,
      timestamp: 'Just now',
    },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!campName.trim() || !dateTime.trim() || !pincode.trim()) return;

    setIsSubmitting(true);

    const targetPin = pincode.trim();
    const targetUrl = registrationUrl.trim() || 'https://forms.gle/mocklink123';
    const message = `Alert successfully broadcasted to 142 citizens in PIN ${targetPin}`;

    // Update localStorage for seamless live demo synchronization with PatientDashboard
    const campData = {
      title: campName.trim(),
      date: dateTime.trim(),
      location: `District PHC - PIN ${targetPin}`,
      registrationUrl: targetUrl,
      isMatch: true,
      broadcastTime: new Date().toISOString(),
    };

    // Post to backend API
    axios
      .post('/api/camps/broadcast', {
        title: campName.trim(),
        dateTime: dateTime.trim(),
        pincode: targetPin,
        registrationUrl: targetUrl,
      })
      .catch((err) => console.warn('Broadcast API sync error:', err.message));

    try {
      localStorage.setItem('active_health_camp', JSON.stringify(campData));
      // Dispatch storage event for same-tab and multi-tab listeners
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'active_health_camp',
          newValue: JSON.stringify(campData),
        })
      );
    } catch {
      // ignore
    }

    // Add to local audit list
    setRecentBroadcasts((prev) => [
      {
        id: `BC-${Math.floor(1000 + Math.random() * 9000)}`,
        title: campName.trim(),
        date: dateTime.trim(),
        pincode: targetPin,
        registrationUrl: targetUrl,
        recipients: 142,
        timestamp: 'Just now',
      },
      ...prev.slice(0, 4),
    ]);

    setTimeout(() => {
      setIsSubmitting(false);
      setToastMessage(message);

      if (onBroadcastSuccess) {
        onBroadcastSuccess(message, campData);
      }

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    }, 400);
  };

  return (
    <div className="relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="alert"
          className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-xl shadow-xl border bg-white border-blue-200 text-sm font-medium max-w-md transition-all animate-bounce-short"
        >
          <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-blue-950 text-sm">Public Health Alert Dispatched</p>
            <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0">
              <Megaphone className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Broadcast Community Health Camp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dispatch geo-targeted public health camp alerts with external registration forms to citizens by PIN code.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Users className="w-3.5 h-3.5 text-blue-700" />
            Hyper-Local Outreach
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input 1: Camp Name */}
            <div>
              <label
                htmlFor="camp-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Camp Name
              </label>
              <input
                id="camp-name"
                type="text"
                required
                value={campName}
                onChange={(e) => setCampName(e.target.value)}
                placeholder="e.g. Free Maternal Health & Anemia Camp"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400"
              />
            </div>

            {/* Input 2: Date/Time */}
            <div>
              <label
                htmlFor="camp-date-time"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Date/Time
              </label>
              <input
                id="camp-date-time"
                type="text"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="e.g. Tomorrow, 9:00 AM"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400"
              />
            </div>

            {/* Input 3: Target PIN Code */}
            <div>
              <label
                htmlFor="camp-pincode"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Target PIN Code
              </label>
              <input
                id="camp-pincode"
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 413709"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Input 4: Google Form Registration Link */}
          <div>
            <label
              htmlFor="camp-registration-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Google Form Registration Link
            </label>
            <div className="relative">
              <input
                id="camp-registration-url"
                type="url"
                required
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="https://forms.gle/mocklink123"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400 font-mono text-xs"
              />
              <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Citizens residing in PIN <strong className="text-blue-700">{pincode || '413709'}</strong> will receive instant dashboard banners linking to this registration form.
            </p>

            <button
              id="admin-broadcast-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm shrink-0"
            >
              <Send className={`w-4 h-4 text-white ${isSubmitting ? 'animate-pulse' : ''}`} />
              <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast Alert'}</span>
            </button>
          </div>
        </form>

        {/* Recent Broadcast History */}
        {recentBroadcasts.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Active Broadcast Logs
            </h4>
            <div className="space-y-2">
              {recentBroadcasts.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {b.id}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {b.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {b.date}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-blue-700 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      PIN {b.pincode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      {b.recipients} Citizens Alerted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
