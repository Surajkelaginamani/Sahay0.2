import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import doctorApi from '../services/doctorApi';

export default function AiClinicalInsightCard({ patientId, className = '', collapsed = false }) {
  const [insight, setInsight]               = useState('');
  const [source, setSource]                 = useState('gemini-1.5-flash');
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [recordsAnalyzed, setRecordsAnalyzed] = useState(null);
  const [isCollapsed, setIsCollapsed]       = useState(collapsed);

  const fetchInsight = useCallback(async () => {
    const cleanId = typeof patientId === 'string'
      ? patientId.trim()
      : (patientId?._id || patientId?.id || '');

    if (!cleanId || cleanId === '[object Object]') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await doctorApi.getAiInsights(cleanId);
      if (res.data?.success) {
        setInsight(res.data.insight || 'No historical clinical trends detected.');
        setSource(res.data.source || 'gemini-1.5-flash');
        setRecordsAnalyzed(res.data.recordsAnalyzed || null);
      } else {
        setInsight(res.data?.insight || 'No clinical insights available.');
      }
    } catch (err) {
      console.warn('Could not fetch AI clinical insights:', err);
      setError(err.response?.data?.message || 'Unable to load clinical summary.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchInsight(); }, [fetchInsight]);

  if (!patientId) return null;

  return (
    <div
      id="ai-clinical-insight-card"
      className={`relative overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/50 transition-all ${className}`}
    >
      {/* Subtle ambient glows */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-purple-200/30 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-sky-200/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="relative w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 tracking-tight">Clinical Intelligence</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                <span className="w-1 h-1 rounded-full bg-violet-600 animate-pulse" />
                {source === 'gemini-1.5-flash' ? 'Gemini AI' : 'AI Synthesis'}
              </span>
            </div>
            {recordsAnalyzed && !isCollapsed && (
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {recordsAnalyzed.vitalsCount || 0} vitals · {recordsAnalyzed.consultationsCount || 0} visits · {recordsAnalyzed.labOrdersCount || 0} labs
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isCollapsed && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fetchInsight(); }}
              disabled={loading}
              title="Re-analyze clinical records"
              className="p-1 rounded-lg border border-violet-200 bg-white/70 hover:bg-white text-violet-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold hidden sm:inline">Refresh</span>
            </button>
          )}
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {!isCollapsed && (
        <div className="relative px-4 pb-4">
          {loading ? (
            <div className="space-y-2 py-1">
              <div className="h-3 bg-violet-200/80 rounded-lg animate-pulse w-full" />
              <div className="h-3 bg-violet-200/80 rounded-lg animate-pulse w-11/12" />
              <div className="h-3 bg-violet-200/80 rounded-lg animate-pulse w-4/5" />
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-violet-600 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
                <span>Analyzing longitudinal patient history…</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-3 rounded-xl bg-white/70 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchInsight}
                className="text-xs font-bold text-violet-700 underline hover:text-violet-900 shrink-0"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {insight}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>12-month longitudinal synthesis · Non-diagnostic</span>
                <span className="text-violet-600 font-bold">Fast-Read</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
