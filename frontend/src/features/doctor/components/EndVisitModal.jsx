import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  FileText,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  Tag,
  TrendingUp,
  TrendingDown,
  FlaskConical,
  Calendar,
  Syringe,
  Hospital,
  MessageSquare,
  ShieldCheck,
  Ambulance,
  X,
  Loader2,
} from "lucide-react";

// ── Clinical outcome tags with Lucide icons ───────────────────────────────────
const CLINICAL_TAGS = [
  { id: "dosage-adjusted",    label: "Dosage Adjusted",     Icon: Tag },
  { id: "improving",          label: "Condition Improving", Icon: TrendingUp },
  { id: "referred-labs",      label: "Referred for Labs",   Icon: FlaskConical },
  { id: "routine-followup",   label: "Routine Follow-up",   Icon: Calendar },
  { id: "worsening",          label: "Condition Worsening", Icon: TrendingDown },
  { id: "rx-initiated",       label: "Treatment Initiated", Icon: Syringe },
  { id: "specialist-ref",     label: "Specialist Referral", Icon: Hospital },
  { id: "counselled",         label: "Patient Counselled",  Icon: MessageSquare },
  { id: "stable",             label: "Stable / No Change",  Icon: ShieldCheck },
  { id: "emergency-referred", label: "Emergency Referred",  Icon: Ambulance },
];

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function EndVisitModal({ open, onClose, onSave, submitting, error }) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [transcript, setTranscript]     = useState("");
  const [listening, setListening]       = useState(false);
  const [voiceError, setVoiceError]     = useState("");
  const [voiceLang, setVoiceLang]       = useState("en-IN");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const recognitionRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedTags([]);
      setTranscript("");
      setListening(false);
      setVoiceError("");
      setFollowUpDate("");
      setFollowUpInstructions("");
    }
  }, [open]);

  // Cleanup recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  const toggleTag = useCallback((tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    setVoiceError("");
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const results = Array.from(event.results)
        .slice(event.resultIndex)
        .map((r) => r[0].transcript)
        .join(" ");
      setTranscript((prev) => (prev ? prev + " " + results : results).trim());
    };

    recognition.onerror = (e) => {
      setVoiceError("Voice recognition error: " + (e.error || "Unknown error"));
      setListening(false);
    };

    recognition.onend = () => { setListening(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [voiceLang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setListening(false);
  }, []);

  const isValid = selectedTags.length > 0 || transcript.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    const tagLabels = selectedTags.map((id) => {
      const tag = CLINICAL_TAGS.find((t) => t.id === id);
      return tag ? tag.label : id;
    });
    onSave({
      clinicalTags: tagLabels,
      voiceNoteTranscript: transcript.trim(),
      followUpDate: followUpDate || undefined,
      followUpInstructions: followUpInstructions.trim() || undefined,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(2,6,23,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-indigo-100/50 overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Consultation Summary</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Select outcome tags or dictate a quick note</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5">

          {/* Step 1: Clinical Tags */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                Step 1 — Outcome Tags
              </span>
              {selectedTags.length > 0 && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                  {selectedTags.length} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {CLINICAL_TAGS.map(({ id, label, Icon }) => {
                const isSelected = selectedTags.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleTag(id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm shadow-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Voice Scribe */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-cyan-700 uppercase tracking-wider bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
                Step 2 — Voice Note (Optional)
              </span>
              {/* Language selector */}
              <select
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value)}
                disabled={listening}
                className="text-[11px] font-semibold text-slate-600 border border-slate-200 rounded-lg bg-slate-50 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
              >
                <option value="en-IN">English</option>
                <option value="hi-IN">Hindi</option>
                <option value="mr-IN">Marathi</option>
              </select>
            </div>

            {/* Mic action bar */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white shadow-md transition-all ${
                    listening
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-200 ring-4 ring-red-300/40 animate-pulse'
                      : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200'
                  }`}
                >
                  {listening ? (
                    <><MicOff className="w-4 h-4" /> Stop Dictation</>
                  ) : (
                    <><Mic className="w-4 h-4" /> Tap to Speak</>
                  )}
                </button>

                {listening && (
                  <span className="flex items-center gap-1.5 text-[11px] text-red-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Listening in {voiceLang === 'hi-IN' ? 'Hindi' : voiceLang === 'mr-IN' ? 'Marathi' : 'English'}…
                  </span>
                )}

                {transcript && !listening && (
                  <button
                    type="button"
                    onClick={() => setTranscript("")}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-rose-600 font-semibold transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={transcript}
                readOnly
                placeholder={
                  listening
                    ? "Transcribing voice dictation live... speak clearly."
                    : 'Dictated notes appear here. Tap "Tap to Speak" above.'
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-800 bg-slate-50 resize-none focus:outline-none transition-all font-mono leading-relaxed ${
                  listening ? 'border-cyan-400 bg-cyan-50/40' : 'border-slate-200'
                }`}
              />

              <p className="text-[10px] text-slate-400">
                {listening
                  ? "Recording active — speech converts to text automatically."
                  : transcript
                  ? "Transcript ready for EHR record."
                  : "Uses native Web Speech API. Works best in Chrome / Edge."}
              </p>
            </div>

            {voiceError && (
              <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {voiceError}
              </div>
            )}
          </div>

          {/* Step 3: Schedule Follow-up (Prompt: Closed-Loop Follow-up & ASHA Routing) */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider bg-violet-50 px-2.5 py-1 rounded-full border border-violet-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-600" />
                Step 3 — Schedule Follow-up (Optional)
              </span>
              {followUpDate && (
                <span className="text-[10px] font-bold text-violet-600 bg-violet-100/70 rounded-full px-2.5 py-0.5">
                  Follow-up set
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-violet-600" />
                  Follow-up Date
                </label>
                <input
                  type="date"
                  id="doctor-follow-up-date"
                  min={new Date().toISOString().split("T")[0]}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Clinical Instructions
                </label>
                <input
                  type="text"
                  id="doctor-follow-up-instructions"
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                  placeholder="e.g., Check BP, repeat fasting sugar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              Auto-routes task to patient portal and assigned ASHA worker field-visit list.
            </p>
          </div>

          {/* Backend error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Validation hint */}
          {!isValid && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              Select at least one outcome tag OR provide a voice/text note to enable submission.
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            id="end-visit-save-btn"
            onClick={handleSave}
            disabled={!isValid || submitting}
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isValid ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-300'
            }`}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving Visit...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Save &amp; End Visit</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}