import React, { useEffect, useRef, useState, useCallback } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";

/**
 * Shared VideoRoom Component (Prompt 16.2, 18.2, 10.1, 10.2)
 *
 * Prompt 10.1 - Connection Quality Indicator:
 *   - Listens to connectionQualityChanged Jitsi event
 *   - Maps quality score (0-100) to Green / Yellow / Red states
 *   - Shows a signal-bar overlay on the video frame
 *
 * Prompt 10.2 - Low-Bandwidth Audio Fallback:
 *   - Automatically disables video when quality < 30% for > 5 seconds
 *   - Exposes a manual "Switch to Audio Only" button
 *   - Shows a toast notification when fallback triggers
 */

// ─── Quality Helpers ─────────────────────────────────────────────────────────

function getQualityState(score) {
  if (score === null || score === undefined) return "unknown";
  if (score >= 60) return "good";
  if (score >= 30) return "fair";
  return "poor";
}

const QUALITY_META = {
  good:    { label: "Good",        color: "#10b981", bgColor: "rgba(16,185,129,0.15)",  bars: 3 },
  fair:    { label: "Fair",        color: "#f59e0b", bgColor: "rgba(245,158,11,0.15)",  bars: 2 },
  poor:    { label: "Weak Signal", color: "#ef4444", bgColor: "rgba(239,68,68,0.15)",   bars: 1 },
  unknown: { label: "Connecting",  color: "#94a3b8", bgColor: "rgba(148,163,184,0.12)", bars: 0 },
};

// ─── Signal Bar Icon ──────────────────────────────────────────────────────────

function SignalBars({ bars, color }) {
  const barHeights = ["25%", "45%", "65%", "85%"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 16, width: 24 }}>
      {barHeights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: h,
            borderRadius: 1,
            backgroundColor: i < bars ? color : "rgba(255,255,255,0.18)",
            transition: "background-color 0.4s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Quality Badge Overlay ────────────────────────────────────────────────────

function QualityBadge({ score, state }) {
  const meta = QUALITY_META[state];
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 8px",
        borderRadius: 20,
        background: "rgba(15,23,42,0.78)",
        border: "1px solid " + meta.color + "44",
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 12px " + meta.color + "22",
        transition: "all 0.4s ease",
      }}
    >
      <SignalBars bars={meta.bars} color={meta.color} />
      <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, letterSpacing: 0.3 }}>
        {meta.label}
      </span>
      {score !== null && (
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>
          {Math.round(score)}%
        </span>
      )}
    </div>
  );
}

// ─── Toast Notification ───────────────────────────────────────────────────────

function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 72,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        padding: "10px 20px",
        borderRadius: 12,
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(239,68,68,0.4)",
        color: "#fca5a5",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.2,
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(239,68,68,0.25)",
        whiteSpace: "nowrap",
        animation: "toastIn 0.3s ease",
      }}
    >
      {"\uD83D\uDCF5"} {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoRoom({ roomName, displayName, onClose, waitingBanner }) {
  const apiRef = useRef(null);
  const poorTimerRef = useRef(null);

  const [qualityScore, setQualityScore] = useState(null);
  const [qualityState, setQualityState] = useState("unknown");
  const [audioOnly, setAudioOnly] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  }, []);

  const disableVideo = useCallback(
    (reason) => {
      if (audioOnly) return;
      if (apiRef.current) {
        try {
          apiRef.current.executeCommand("toggleVideo");
        } catch (_) {}
      }
      setAudioOnly(true);
      showToast("Video disabled to preserve call connection.");
    },
    [audioOnly, showToast]
  );

  const handleApiReady = useCallback(
    (externalApi) => {
      apiRef.current = externalApi;

      externalApi.addListener("connectionQualityChanged", (data) => {
        const raw =
          data && data.connectionQuality !== undefined
            ? data.connectionQuality
            : data && data.quality !== undefined
            ? data.quality
            : null;
        const score = raw !== null ? Math.min(100, Math.max(0, raw)) : null;
        const state = getQualityState(score);

        setQualityScore(score);
        setQualityState(state);

        if (state === "poor") {
          if (!poorTimerRef.current) {
            poorTimerRef.current = setTimeout(() => {
              disableVideo("auto");
            }, 5000);
          }
        } else {
          if (poorTimerRef.current) {
            clearTimeout(poorTimerRef.current);
            poorTimerRef.current = null;
          }
        }
      });
    },
    [disableVideo]
  );

  useEffect(() => {
    return () => {
      if (poorTimerRef.current) clearTimeout(poorTimerRef.current);
    };
  }, []);

  if (!roomName) return null;

  const qualityMeta = QUALITY_META[qualityState];

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div className="w-full flex flex-col gap-3">
        <div
          className="relative w-full bg-slate-900 rounded-3xl overflow-hidden shadow-xl border flex flex-col"
          style={{
            minHeight: 400,
            height: 520,
            borderColor: audioOnly ? "rgba(239,68,68,0.35)" : "rgba(30,41,59,0.8)",
            transition: "border-color 0.4s ease",
          }}
        >
          {/* Header Bar */}
          <div className="bg-slate-950/90 backdrop-blur-md px-5 py-3 flex items-center justify-between border-b border-slate-800 z-10">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-2">
                  <span>{"\uD83D\uDCF9"} SAHAY Teleconsultation</span>
                  <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                    WebRTC
                  </span>
                  {audioOnly && (
                    <span className="text-[10px] font-mono font-normal text-orange-300 bg-orange-950/80 px-2 py-0.5 rounded-full border border-orange-800/60 animate-pulse">
                      {"\uD83D\uDD07"} Audio Only
                    </span>
                  )}
                </h3>
                <p className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
                  Room: <strong className="text-slate-200">{roomName}</strong> &middot; As:{" "}
                  <span className="text-sky-300">{displayName || "Dr. Sufi Shaikh"}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/40"
            >
              <span>&times;</span>
              <span>End / Close</span>
            </button>
          </div>

          {/* Waiting Banner */}
          {waitingBanner && (
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between shadow-sm z-10 border-b border-emerald-500/40">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
                <span className="font-semibold">{waitingBanner}</span>
              </div>
              <span className="hidden sm:inline-block text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Waiting Room Active
              </span>
            </div>
          )}

          {/* Prompt 10.1 - Quality Badge */}
          <QualityBadge score={qualityScore} state={qualityState} />

          {/* Fair network warning strip */}
          {qualityState === "fair" && (
            <div
              style={{
                position: "absolute",
                top: 46,
                left: 0,
                right: 0,
                zIndex: 25,
                background: "linear-gradient(90deg, rgba(245,158,11,0.85), rgba(234,88,12,0.80))",
                padding: "5px 14px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
                backdropFilter: "blur(4px)",
              }}
            >
              <span>{"\u26A0\uFE0F"}</span>
              <span>Poor Network — call quality may be affected</span>
            </div>
          )}

          {/* Poor network pulsing red border */}
          {qualityState === "poor" && !audioOnly && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                borderRadius: 24,
                border: "2px solid rgba(239,68,68,0.6)",
                animation: "pulse 1s cubic-bezier(0.4,0,0.6,1) infinite",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Jitsi Meeting */}
          <div className="flex-1 w-full h-full relative">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              configOverwrite={{
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                resolution: 480,
                constraints: {
                  video: {
                    height: { ideal: 480, max: 720, min: 240 },
                    width: { ideal: 640, max: 1280, min: 320 },
                  },
                },
                disableInviteFunctions: true,
                doNotStoreRoom: true,
                toolbarButtons: ["microphone", "camera", "chat", "tileview", "settings", "hangup"],
              }}
              interfaceConfigOverwrite={{
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                SHOW_BRAND_WATERMARK: false,
                TOOLBAR_BUTTONS: ["microphone", "camera", "chat", "tileview", "settings", "hangup"],
              }}
              userInfo={{ displayName: displayName || "Dr. Sufi Shaikh" }}
              onApiReady={handleApiReady}
              onReadyToClose={onClose}
              getIFrameRef={(iframeRef) => {
                if (iframeRef) {
                  iframeRef.style.width = "100%";
                  iframeRef.style.height = "100%";
                  iframeRef.style.border = "none";
                }
              }}
              loadingComponent={
                <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-300">Connecting Secure Teleconsultation Room</p>
                  <p className="text-[11px] text-slate-500 font-mono">Optimized for rural healthcare bandwidth</p>
                </div>
              }
            />
          </div>

          {/* Toast Notification (Prompt 10.2) */}
          <Toast message={toastMsg} visible={toastVisible} />
        </div>

        {/* Prompt 10.2 - Manual Audio-Only Button */}
        {!audioOnly ? (
          <button
            type="button"
            onClick={() => disableVideo("manual")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "11px 20px",
              borderRadius: 14,
              border: "1.5px solid rgba(245,158,11,0.45)",
              background: "linear-gradient(135deg, rgba(120,53,15,0.55) 0%, rgba(180,83,9,0.45) 100%)",
              color: "#fcd34d",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              boxShadow: "0 2px 16px rgba(245,158,11,0.15)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(146,64,14,0.75) 0%, rgba(217,119,6,0.65) 100%)";
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(245,158,11,0.30)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgba(120,53,15,0.55) 0%, rgba(180,83,9,0.45) 100%)";
              e.currentTarget.style.boxShadow = "0 2px 16px rgba(245,158,11,0.15)";
            }}
          >
            <span style={{ fontSize: 16 }}>{"\uD83D\uDCF5"}</span>
            <span>Switch to Audio Only (Low Network)</span>
            {qualityState !== "unknown" && (
              <span
                style={{
                  marginLeft: 4,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: qualityMeta.bgColor,
                  border: "1px solid " + qualityMeta.color + "55",
                  color: qualityMeta.color,
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
              >
                {qualityMeta.label}
              </span>
            )}
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "11px 20px",
              borderRadius: 14,
              border: "1.5px solid rgba(239,68,68,0.35)",
              background: "rgba(127,29,29,0.30)",
              color: "#fca5a5",
              fontSize: 13,
              fontWeight: 700,
              backdropFilter: "blur(10px)",
            }}
          >
            <span>{"\uD83D\uDD07"}</span>
            <span>Audio-Only Mode Active &mdash; Video is off to preserve connection</span>
          </div>
        )}
      </div>
    </>
  );
}