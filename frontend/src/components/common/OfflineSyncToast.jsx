import React, { useState, useEffect } from 'react';
import { CloudOff, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { syncQueue, getPendingSyncQueue } from '../../services/offlineSync';

export default function OfflineSyncToast() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [toasts, setToasts] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending queue count
  const checkPending = async () => {
    try {
      const items = await getPendingSyncQueue();
      setPendingCount(items.length);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    checkPending();

    const handleOnline = () => {
      setIsOffline(false);
      checkPending();
    };

    const handleOffline = () => {
      setIsOffline(true);
      checkPending();
    };

    const handleCustomToast = (e) => {
      const { type, message } = e.detail || {};
      const id = Date.now() + Math.random();
      const newToast = { id, type, message };

      setToasts((prev) => [...prev.slice(-3), newToast]);
      checkPending();

      // Auto-dismiss after 4.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sahay:offline-toast', handleCustomToast);
    window.addEventListener('sahay:sync-completed', checkPending);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sahay:offline-toast', handleCustomToast);
      window.removeEventListener('sahay:sync-completed', checkPending);
    };
  }, []);

  const handleManualSync = () => {
    syncQueue();
  };

  return (
    <>
      {/* ── Persistent Floating Offline Mode Status Pill ───────────────────── */}
      {isOffline && (
        <div
          id="offline-status-pill"
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-sm border border-slate-700/80 animate-fade-in select-none"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Offline Mode Active</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
              {pendingCount} queued
            </span>
          )}
        </div>
      )}

      {/* ── Floating Background Sync Toasts ─────────────────────────────────── */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-md w-full px-4">
        {toasts.map((toast) => {
          if (toast.type === 'action-queued') {
            return (
              <div
                key={toast.id}
                id="offline-action-toast"
                className="pointer-events-auto flex items-center px-4 py-3 rounded-2xl shadow-xl border bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700 text-slate-900 dark:text-slate-100 text-xs font-semibold animate-slide-down transition-all"
              >
                <CloudOff className="w-4 h-4 mr-2 text-amber-500 shrink-0" />
                <span className="text-amber-900 dark:text-amber-200 font-medium">
                  {toast.message || 'Offline: Action saved locally. Will sync automatically.'}
                </span>
              </div>
            );
          }

          if (toast.type === 'sync-success') {
            return (
              <div
                key={toast.id}
                id="offline-sync-success-toast"
                className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-700 text-slate-900 dark:text-slate-100 text-xs font-semibold animate-slide-down transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    Background Sync Complete
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {toast.message || 'All offline actions synced successfully!'}
                  </p>
                </div>
              </div>
            );
          }

          if (toast.type === 'sync-started') {
            return (
              <div
                key={toast.id}
                className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border bg-white dark:bg-slate-800 border-sky-200 dark:border-sky-700 text-slate-900 dark:text-slate-100 text-xs font-semibold animate-slide-down transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sky-900 dark:text-sky-200">
                    Syncing Data
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {toast.message || 'Processing queued offline actions...'}
                  </p>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </>
  );
}
