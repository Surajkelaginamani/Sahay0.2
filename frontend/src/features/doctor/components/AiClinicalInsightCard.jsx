import React, { useState, useEffect, useCallback } from 'react';
import doctorApi from '../services/doctorApi';

export default function AiClinicalInsightCard({ patientId, className = '' }) {
  const [insight, setInsight] = useState('');
  const [source, setSource] = useState('gemini-1.5-flash');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordsAnalyzed, setRecordsAnalyzed] = useState(null);

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

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  if (!patientId) return null;

  return (
    <div
      id="ai-clinical-insight-card"
      className={`relative overflow-hidden rounded-3xl border border-violet-200/90 bg-gradient-to-br from-violet-50/95 via-indigo-50/50 to-sky-50/70 p-5 sm:p-6 shadow-sm transition-all ${className}`}
    >
      {/* Decorative subtle ambient glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-200/40 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-sky-200/30 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-3.5 pb-3 border-b border-violet-200/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center text-lg shadow-md shadow-violet-200 shrink-0">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                AI Clinical Insight
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                {source === 'gemini-1.5-flash' ? 'Gemini 1.5 Flash' : 'Clinical AI Synthesis'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              12-Month longitudinal trend synthesis & risk spotting for rapid doctor review
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {recordsAnalyzed && (
            <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
              {recordsAnalyzed.vitalsCount || 0} vitals · {recordsAnalyzed.consultationsCount || 0} visits · {recordsAnalyzed.labOrdersCount || 0} labs
            </span>
          )}
          <button
            type="button"
            onClick={fetchInsight}
            disabled={loading}
            title="Re-analyze clinical records"
            className="p-1.5 rounded-xl border border-violet-200 bg-white/80 hover:bg-white text-violet-700 hover:text-violet-900 transition-colors shadow-xs disabled:opacity-50 text-xs font-bold flex items-center gap-1"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-[11px] hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Body: Shimmer Loading Skeleton vs Loaded State */}
      <div className="relative">
        {loading ? (
          <div className="space-y-2.5 py-1">
            <div className="h-3.5 bg-gradient-to-r from-violet-200/90 via-indigo-100 to-violet-200/90 rounded-lg animate-pulse w-full" />
            <div className="h-3.5 bg-gradient-to-r from-violet-200/90 via-indigo-100 to-violet-200/90 rounded-lg animate-pulse w-11/12" />
            <div className="h-3.5 bg-gradient-to-r from-violet-200/90 via-indigo-100 to-violet-200/90 rounded-lg animate-pulse w-4/5" />
            <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-violet-600 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
              <span>Analyzing longitudinal patient history with Gemini AI…</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-3 rounded-2xl bg-white/70 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchInsight}
              className="text-xs font-bold text-violet-700 underline hover:text-violet-900"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed tracking-wide">
              {insight}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1">
              <span>Automated clinical briefing for doctor evaluation · Non-diagnostic synthesis</span>
              <span className="text-violet-600 font-bold">Fast-Read Format</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
