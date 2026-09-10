import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';

/**
 * Shared VideoRoom Component (Prompt 16.2 & 18.2)
 *
 * Reusable WebRTC video component using Jitsi React SDK.
 * Configured with lightweight controls (hiding screen sharing, invite, etc.)
 * to operate reliably on rural bandwidth.
 *
 * Props:
 * - roomName (String): the generated teleconsultation room ID
 * - displayName (String): logged-in user name
 * - onClose (Function): callback when call ends or is dismissed
 * - waitingBanner (String): optional waiting notice e.g. "Waiting for Dr. [Name] to connect... Your connection is live."
 */
export default function VideoRoom({ roomName, displayName, onClose, waitingBanner }) {
  if (!roomName) return null;

  return (
    <div className="relative w-full h-[520px] min-h-[400px] bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 flex flex-col">
      {/* Control Header Bar */}
      <div className="bg-slate-950/90 backdrop-blur-md px-5 py-3 flex items-center justify-between border-b border-slate-800 z-10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h3 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-2">
              <span>📹 SAHAY Teleconsultation</span>
              <span className="text-[10px] font-mono font-normal text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                WebRTC
              </span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
              Room: <strong className="text-slate-200">{roomName}</strong> · As: <span className="text-sky-300">{displayName || 'Clinician'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-900/40"
        >
          <span>✕</span>
          <span>End / Close</span>
        </button>
      </div>

      {/* Waiting Room Notification Banner (Prompt 18.2) */}
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

      {/* Jitsi Meeting View */}
      <div className="flex-1 w-full h-full relative">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            // Low-bandwidth tuning for rural clinics
            resolution: 480,
            constraints: {
              video: {
                height: { ideal: 480, max: 720, min: 240 },
                width: { ideal: 640, max: 1280, min: 320 },
              },
            },
            disableInviteFunctions: true,
            doNotStoreRoom: true,
            toolbarButtons: [
              'microphone',
              'camera',
              'chat',
              'tileview',
              'settings',
              'hangup',
            ],
          }}
          interfaceConfigOverwrite={{
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'chat',
              'tileview',
              'settings',
              'hangup',
            ],
          }}
          userInfo={{
            displayName: displayName || 'Healthcare Staff',
          }}
          onReadyToClose={onClose}
          getIFrameRef={(iframeRef) => {
            if (iframeRef) {
              iframeRef.style.width = '100%';
              iframeRef.style.height = '100%';
              iframeRef.style.border = 'none';
            }
          }}
          loadingComponent={
            <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">Connecting Secure Teleconsultation Room…</p>
              <p className="text-[11px] text-slate-500 font-mono">Optimized for rural healthcare bandwidth</p>
            </div>
          }
        />
      </div>
    </div>
  );
}
