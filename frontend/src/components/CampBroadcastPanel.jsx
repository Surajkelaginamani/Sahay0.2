import React, { useState } from 'react';
import axios from 'axios';
import {
  Radio,
  Send,
  Calendar,
  MapPin,
  ExternalLink,
  FileText,
  CheckCircle2,
  Users,
  Megaphone,
  AlertCircle,
  Clock,
} from 'lucide-react';

/**
 * CampBroadcastPanel Component
 * "Launch Community Health Camp" admin panel for Hospital and Facility Administrators
 * to dispatch hyper-local public health camp notifications to citizens by PIN code.
 */
export default function CampBroadcastPanel({ hospitalName, onBroadcastSuccess }) {
  const [campTitle, setCampTitle] = useState('Free Eye Checkup & Cataract Screening');
  const [dateTime, setDateTime] = useState('Oct 25, 10:00 AM');
  const [pincode, setPincode] = useState('413709');
  const [registrationUrl, setRegistrationUrl] = useState('https://forms.gle/eyetest413709');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentBroadcasts, setRecentBroadcasts] = useState([
    {
      id: 'CAMP-8821',
      title: 'Free Eye Checkup & Cataract Screening',
      date: 'Oct 25, 10:00 AM',
      pincode: '413709',
      registrationUrl: 'https://forms.gle/eyetest413709',
      recipients: 142,
      timestamp: 'Recently active',
    },
  ]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanTitle = campTitle.trim();
    const cleanDateTime = dateTime.trim();
    const cleanPincode = pincode.trim();
    const cleanUrl = registrationUrl.trim() || 'https://forms.gle/eyetest413709';

    if (!cleanTitle || !cleanDateTime || !cleanPincode) {
      setErrorMessage('Please fill in Camp Title, Date & Time, and Target PIN Code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: cleanTitle,
        campTitle: cleanTitle,
        dateTime: cleanDateTime,
        date: cleanDateTime,
        pincode: cleanPincode,
        targetPincode: cleanPincode,
        registrationUrl: cleanUrl,
        hospitalName: hospitalName || 'District Hospital',
        location: `District PHC - PIN ${cleanPincode}`,
      };

      const res = await axios.post('/api/camps/broadcast', payload);
      const returnedMessage =
        res.data?.message || `Broadcast sent! 142 patients in PIN ${cleanPincode} notified.`;

      // Save to localStorage and dispatch event for live cross-tab demo synchronization
      const broadcastObject = {
        title: cleanTitle,
        date: cleanDateTime,
        dateTime: cleanDateTime,
        pincode: cleanPincode,
        location: `District PHC - PIN ${cleanPincode}`,
        registrationUrl: cleanUrl,
        isMatch: true,
        broadcastTime: new Date().toISOString(),
      };

      try {
        localStorage.setItem('active_health_camp', JSON.stringify(broadcastObject));
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'active_health_camp',
            newValue: JSON.stringify(broadcastObject),
          })
        );
      } catch {
        // Safe fallback if localStorage disabled
      }

      // Prepend to recent audit list
      setRecentBroadcasts((prev) => [
        {
          id: `CAMP-${Math.floor(1000 + Math.random() * 9000)}`,
          title: cleanTitle,
          date: cleanDateTime,
          pincode: cleanPincode,
          registrationUrl: cleanUrl,
          recipients: 142,
          timestamp: 'Just now',
        },
        ...prev.slice(0, 4),
      ]);

      // Set success notification toast
      setToastMessage(returnedMessage);

      if (onBroadcastSuccess) {
        onBroadcastSuccess(returnedMessage, broadcastObject);
      }

      // Auto-hide toast after 5.5 seconds
      setTimeout(() => {
        setToastMessage(null);
      }, 5500);
    } catch (err) {
      console.error('Broadcast request error:', err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to dispatch broadcast. Please verify inputs and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Floating Success Toast Notification */}
      {toastMessage && (
        <div
          role="alert"
          className="fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white border-blue-200 text-sm font-medium max-w-md transition-all animate-bounce-short"
        >
          <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-blue-950 text-sm">Broadcast Dispatched</p>
            <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">{toastMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold ml-1"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main UI Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-700 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900 shrink-0">
              <Megaphone className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Launch Community Health Camp
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Broadcast geo-targeted health camps and registration links to registered patients in a specific PIN code.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-center">
            <Users className="w-3.5 h-3.5 text-blue-700" />
            Community Outreach
          </span>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Broadcast Form */}
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input 1: Camp Title */}
            <div className="md:col-span-1">
              <label
                htmlFor="broadcast-camp-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Camp Title *
              </label>
              <div className="relative">
                <input
                  id="broadcast-camp-title"
                  type="text"
                  required
                  value={campTitle}
                  onChange={(e) => setCampTitle(e.target.value)}
                  placeholder="e.g., Free Eye Checkup & Cataract Screening"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Input 2: Date & Time */}
            <div>
              <label
                htmlFor="broadcast-date-time"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Date & Time *
              </label>
              <div className="relative">
                <input
                  id="broadcast-date-time"
                  type="text"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  placeholder="e.g., Oct 25, 10:00 AM"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Input 3: Target PIN Code */}
            <div>
              <label
                htmlFor="broadcast-pincode"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Target PIN Code *
              </label>
              <div className="relative">
                <input
                  id="broadcast-pincode"
                  type="text"
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g., 413709"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400 font-mono"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Input 4: Google Form Registration URL */}
          <div>
            <label
              htmlFor="broadcast-registration-url"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              Google Form Registration URL
            </label>
            <div className="relative">
              <input
                id="broadcast-registration-url"
                type="url"
                required
                value={registrationUrl}
                onChange={(e) => setRegistrationUrl(e.target.value)}
                placeholder="e.g., https://forms.gle/..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition placeholder:text-slate-400 font-mono text-xs"
              />
              <ExternalLink className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Citizens in PIN <strong className="text-blue-700 font-mono">{pincode || '413709'}</strong> will receive an interactive banner alert linking to your registration form.
            </p>

            <button
              id="admin-broadcast-to-pin-btn"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-white" />
                  <span>Broadcast to PIN Code</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Recent Broadcast History */}
        {recentBroadcasts.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Broadcast Logs
              </h4>
              <span className="text-[11px] text-slate-400">Live Outreach Logs</span>
            </div>
            <div className="space-y-2">
              {recentBroadcasts.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] shrink-0">
                      {b.id}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {b.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 shrink-0">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {b.date}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-blue-700 dark:text-blue-400 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      PIN {b.pincode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
                      {b.recipients} Citizens Notified
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
