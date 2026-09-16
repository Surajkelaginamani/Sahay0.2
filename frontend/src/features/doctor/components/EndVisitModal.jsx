import React, { useState, useRef, useCallback, useEffect } from "react";

/**
 * EndVisitModal (Prompt 11.2)
 *
 * Frictionless "End Visit" modal for doctors.
 * - One-click clinical outcome tags (clinicalTags[])
 * - Multilingual voice scribe via browser SpeechRecognition API (voiceNoteTranscript)
 * - Validation: at least one tag OR non-empty transcript required
 * - "Save & End Visit" submits to the closeConsultation endpoint
 *
 * Props:
 *  open          {Boolean}   - controls visibility
 *  onClose       {Function}  - called when modal is dismissed without saving
 *  onSave        {Function}  - called with { clinicalTags, voiceNoteTranscript }
 *  submitting    {Boolean}   - shows loading state on "Save" button
 *  error         {String}    - backend error to display
 */

const CLINICAL_TAGS = [
  { id: "dosage-adjusted",   label: "Dosage Adjusted",      icon: "💊" },
  { id: "improving",         label: "Condition Improving",  icon: "📈" },
  { id: "referred-labs",     label: "Referred for Labs",    icon: "🧪" },
  { id: "routine-followup",  label: "Routine Follow-up",    icon: "🗓️" },
  { id: "worsening",         label: "Condition Worsening",  icon: "📉" },
  { id: "rx-initiated",      label: "Treatment Initiated",  icon: "💉" },
  { id: "specialist-ref",    label: "Specialist Referral",  icon: "🏥" },
  { id: "counselled",        label: "Patient Counselled",   icon: "🗣️" },
  { id: "stable",            label: "Stable / No Change",   icon: "✅" },
  { id: "emergency-referred","label": "Emergency Referred", icon: "🚑" },
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
  const recognitionRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setSelectedTags([]);
      setTranscript("");
      setListening(false);
      setVoiceError("");
    }
  }, [open]);

  // Cleanup recognition on unmount
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

    recognition.onend = () => {
      setListening(false);
    };

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
    onSave({ clinicalTags: tagLabels, voiceNoteTranscript: transcript.trim() });
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2, 6, 23, 0.72)",
        backdropFilter: "blur(6px)",
        animation: "fadeInOverlay 0.2s ease",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .end-visit-modal {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,0.4);
          animation: slideUp 0.25s ease;
          border: 1px solid rgba(99,102,241,0.15);
        }
        .tag-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .tag-btn:hover {
          border-color: #6366f1;
          background: #eef2ff;
          color: #4338ca;
        }
        .tag-btn.selected {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border-color: #4338ca;
          color: #fff;
          box-shadow: 0 2px 10px rgba(99,102,241,0.35);
        }
      `}</style>

      <div className="end-visit-modal">
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
              }}>
                📋
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  Consultation Summary
                </h2>
                <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Select outcome tags or dictate a quick note to close this visit
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#f1f5f9", border: "none",
                cursor: "pointer", fontSize: 16, color: "#64748b",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Clinical Tags Section ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: "#6366f1",
                textTransform: "uppercase", letterSpacing: 0.8,
                background: "#eef2ff", padding: "3px 10px",
                borderRadius: 999, border: "1px solid #c7d2fe",
              }}>
                Step 1 — Select Outcome Tags
              </span>
              {selectedTags.length > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "#4f46e5",
                  background: "#eef2ff", borderRadius: 999, padding: "3px 8px",
                }}>
                  {selectedTags.length} selected
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CLINICAL_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={"tag-btn" + (selectedTags.includes(tag.id) ? " selected" : "")}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Voice Scribe Section ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{
                fontSize: 10, fontWeight: 800, color: "#0891b2",
                textTransform: "uppercase", letterSpacing: 0.8,
                background: "#ecfeff", padding: "3px 10px",
                borderRadius: 999, border: "1px solid #a5f3fc",
              }}>
                Step 2 — Voice Note (Optional)
              </span>
              {/* Language Selector */}
              <select
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value)}
                disabled={listening}
                style={{
                  fontSize: 11, fontWeight: 600, color: "#475569",
                  border: "1px solid #e2e8f0", borderRadius: 8,
                  background: "#f8fafc", padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
                <option value="mr-IN">Marathi</option>
              </select>
            </div>

            {/* Mic Action Bar & Read-only Transcript (Prompt 11.2) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    borderRadius: 14,
                    border: "none",
                    background: listening
                      ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                      : "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: listening
                      ? "0 0 0 4px rgba(239,68,68,0.25), 0 4px 14px rgba(239,68,68,0.35)"
                      : "0 4px 14px rgba(6,182,212,0.35)",
                    transition: "all 0.2s ease",
                  }}
                  title={listening ? "Stop recording" : "Start voice dictation"}
                >
                  <span style={{ fontSize: 16 }}>{listening ? "⏹" : "🎤"}</span>
                  <span>{listening ? "Stop Dictation" : "🎤 Tap to Speak"}</span>
                </button>

                {transcript && (
                  <button
                    type="button"
                    onClick={() => setTranscript("")}
                    disabled={listening}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      color: "#64748b",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Clear Transcript
                  </button>
                )}

                {listening && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#ef4444", fontWeight: 700 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                    Listening ({voiceLang})...
                  </span>
                )}
              </div>

              <div>
                <textarea
                  rows={3}
                  value={transcript}
                  readOnly
                  placeholder={
                    listening
                      ? "Transcribing voice dictation live... speak clearly in English, Hindi, or Marathi."
                      : 'Dictated notes will display here. Tap "🎤 Tap to Speak" above to begin dictation.'
                  }
                  style={{
                    width: "100%",
                    resize: "none",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1.5px solid " + (listening ? "rgba(6,182,212,0.6)" : "#e2e8f0"),
                    fontSize: 12,
                    color: "#1e293b",
                    background: listening ? "rgba(236,254,255,0.6)" : "#f8fafc",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                    boxSizing: "border-box",
                  }}
                />
                <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>
                  {listening
                    ? "🔴 Dictation active — your speech is converted to text automatically."
                    : transcript
                    ? "✓ Multilingual speech-to-text transcript ready for EHR record."
                    : "Read-only voice transcript linked to visit record. Uses native SpeechRecognition."}
                </p>
              </div>
            </div>

            {voiceError && (
              <div style={{
                marginTop: 8, padding: "8px 12px", borderRadius: 10,
                background: "#fef2f2", border: "1px solid #fecaca",
                color: "#dc2626", fontSize: 11, fontWeight: 600,
              }}>
                {voiceError}
              </div>
            )}
          </div>

          {/* ── Backend Error ── */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: "#fef2f2", border: "1.5px solid #fca5a5",
              color: "#dc2626", fontSize: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {/* ── Validation hint ── */}
          {!isValid && (
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: "#fffbeb", border: "1px solid #fde68a",
              color: "#92400e", fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>⚠️</span>
              <span>Select at least one outcome tag OR provide a brief voice/text note to enable submission.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px 20px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "10px 20px", borderRadius: 12,
              border: "1.5px solid #e2e8f0",
              background: "#f8fafc", color: "#475569",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || submitting}
            style={{
              padding: "10px 28px", borderRadius: 12,
              background: isValid
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "#e2e8f0",
              border: "none",
              color: isValid ? "#fff" : "#94a3b8",
              fontSize: 13, fontWeight: 800,
              cursor: isValid ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: isValid ? "0 4px 16px rgba(16,185,129,0.35)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {submitting ? (
              <>
                <div style={{
                  width: 14, height: 14,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.6s linear infinite",
                }} />
                Saving Visit...
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Save &amp; End Visit</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}