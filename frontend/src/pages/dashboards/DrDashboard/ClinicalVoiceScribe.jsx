import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Mic,
  MicOff,
  Sparkles,
  AlertOctagon,
  Activity,
  Pill,
  RotateCcw,
  Copy,
  Check,
  Volume2,
  Wand2,
  ArrowDownToLine,
  Info,
  Loader2,
  BrainCircuit,
  Stethoscope,
} from 'lucide-react';

// Pre-defined medical entity vocabularies as required by clinical scribe specification
export const MEDICAL_KEYWORDS = {
  symptoms: [
    'fever',
    'headache',
    'cough',
    'pain',
    'nausea',
    'dizziness',
    'fatigue',
  ],
  medicines: [
    'paracetamol',
    'dolo',
    'antibiotic',
    'amoxicillin',
    'cetirizine',
    'ibuprofen',
  ],
  allergies: [
    'dust',
    'pollen',
    'peanuts',
    'penicillin',
    'latex',
    'sulfa',
    'dairy',
  ],
};

/**
 * Client-Side Keyword Extraction (Immediate NLP heuristic matching)
 * @param {string} text Spoken consultation transcript
 * @returns {{ symptoms: string[], medicines: string[], allergies: string[] }}
 */
export function extractMedicalEntities(text) {
  if (!text || typeof text !== 'string') {
    return { symptoms: [], medicines: [], allergies: [] };
  }

  const normalized = text.toLowerCase();

  const symptoms = MEDICAL_KEYWORDS.symptoms.filter((item) =>
    normalized.includes(item.toLowerCase())
  );
  const medicines = MEDICAL_KEYWORDS.medicines.filter((item) =>
    normalized.includes(item.toLowerCase())
  );
  const allergies = MEDICAL_KEYWORDS.allergies.filter((item) =>
    normalized.includes(item.toLowerCase())
  );

  return { symptoms, medicines, allergies };
}

export default function ClinicalVoiceScribe({
  onAutoFill,
  onApplySymptoms,
  onApplyMedicines,
  onTranscriptChange,
  className = '',
}) {
  // 1. State Setup as per specification
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [extractedData, setExtractedData] = useState({
    symptoms: [],
    medicines: [],
    allergies: [],
  });

  // LLM Processing and Auto-Fill states
  const [isProcessingLLM, setIsProcessingLLM] = useState(false);
  const [llmResult, setLlmResult] = useState(null);
  const [autoFilledBadge, setAutoFilledBadge] = useState(false);

  const [browserSupported, setBrowserSupported] = useState(true);
  const [copied, setCopied] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const transcriptRef = useRef('');

  // Keep refs synchronized with state for event listeners
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Check browser Web Speech API availability on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
    }
  }, []);

  // Sync transcript updates externally if callback provided
  useEffect(() => {
    if (onTranscriptChange) {
      onTranscriptChange(transcript, extractedData);
    }
  }, [transcript, extractedData, onTranscriptChange]);

  // Handle local entity extraction
  const processTranscriptLocally = useCallback((text) => {
    const entities = extractMedicalEntities(text);
    setExtractedData(entities);
  }, []);

  // ── LLM Processing & Form Auto-Filling (Requirements 1, 2, 3) ──────────────
  const processWithLLM = useCallback(
    async (rawText) => {
      const textToProcess = (rawText || transcriptRef.current || '').trim();
      if (!textToProcess) return;

      setIsProcessingLLM(true);
      setErrorMessage('');

      try {
        const res = await axios.post('/api/scribe/process', {
          text: textToProcess,
        });

        const data = res.data;
        if (data) {
          setLlmResult(data);

          // Update chip tags based on structured LLM entity extraction
          setExtractedData({
            symptoms: Array.isArray(data.chief_complaints) && data.chief_complaints.length
              ? data.chief_complaints
              : extractMedicalEntities(textToProcess).symptoms,
            medicines: Array.isArray(data.medicines) && data.medicines.length
              ? data.medicines.map((m) => (typeof m === 'string' ? m : m.name || 'Medicine'))
              : extractMedicalEntities(textToProcess).medicines,
            allergies: Array.isArray(data.allergies) && data.allergies.length
              ? data.allergies
              : extractMedicalEntities(textToProcess).allergies,
          });

          // Trigger auto-fill callback for parent clinical form (Diagnosis, Notes, Rx, Complaints)
          if (onAutoFill) {
            onAutoFill(data);
          }

          setAutoFilledBadge(true);
          setTimeout(() => setAutoFilledBadge(false), 8000);
        }
      } catch (err) {
        console.error('Clinical Scribe LLM error:', err);
        setErrorMessage(
          'Notice: Could not reach LLM service. Local medical heuristics applied.'
        );
      } finally {
        setIsProcessingLLM(false);
      }
    },
    [onAutoFill]
  );

  // 2. The Web Speech API Hook implementation
  const startListening = useCallback(() => {
    setErrorMessage('');
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setBrowserSupported(false);
      setErrorMessage(
        'Web Speech API is not supported in this browser. You can still test with the Demo Simulation button below!'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup abort errors
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        setTranscript(cleaned);
        transcriptRef.current = cleaned;
        processTranscriptLocally(cleaned);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            'Microphone access was denied. Please allow microphone permissions in your browser.'
          );
          setIsListening(false);
        } else if (event.error === 'network') {
          setErrorMessage('Network error occurred with speech recognition service.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Continuous listening: if user hasn't explicitly stopped it, restart gracefully
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            // If stopped naturally, process with LLM
            if (transcriptRef.current && transcriptRef.current.trim()) {
              processWithLLM(transcriptRef.current.trim());
            }
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setErrorMessage(
        'Unable to activate speech recognition. You can use the Quick Simulation mode.'
      );
      setIsListening(false);
    }
  }, [processTranscriptLocally, processWithLLM]);

  // When speech recognition finishes (manual Stop or onend), trigger LLM extraction
  const stopListening = useCallback(() => {
    setIsListening(false);
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    }

    // Trigger LLM structured extraction on the final transcript
    const currentText = transcriptRef.current;
    if (currentText && currentText.trim()) {
      processWithLLM(currentText.trim());
    }
  }, [processWithLLM]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Clean up recognition instance on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Demo speech simulation for immediate interactive testing without requiring microphone
  const simulateClinicalSpeech = () => {
    stopListening();
    setDemoActive(true);
    const demoPhrases = [
      'Patient reports severe fever, dry cough, and persistent body pain.',
      'Mentions known allergy to penicillin and dust.',
      'Diagnosing acute bronchitis with mild wheezing.',
      'Prescribing Paracetamol 650mg twice daily and Amoxicillin 500mg twice daily for 5 days.',
    ];

    let current = '';
    let step = 0;

    const interval = setInterval(() => {
      if (step < demoPhrases.length) {
        current = current ? `${current} ${demoPhrases[step]}` : demoPhrases[step];
        setTranscript(current);
        transcriptRef.current = current;
        processTranscriptLocally(current);
        step++;
      } else {
        clearInterval(interval);
        setDemoActive(false);
        // Automatically send to LLM route upon simulation completion
        processWithLLM(current);
      }
    }, 500);
  };

  const clearScribe = () => {
    stopListening();
    setTranscript('');
    transcriptRef.current = '';
    setExtractedData({ symptoms: [], medicines: [], allergies: [] });
    setLlmResult(null);
    setErrorMessage('');
  };

  const copyTranscript = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-700/50 shadow-xl space-y-4 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <BrainCircuit className="w-5 h-5 text-cyan-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide text-white uppercase">
                Autonomous Clinical Voice Scribe
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Gemini LLM Powered
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/80">
              Web Speech API (en-IN) · Auto-extracts JSON & auto-fills Clinical Evaluation
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {transcript && (
            <>
              <button
                type="button"
                onClick={() => processWithLLM(transcript)}
                disabled={isProcessingLLM || isListening}
                title="Send current transcript to LLM for structured JSON extraction"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 hover:text-white text-xs font-bold border border-cyan-500/40 transition-all disabled:opacity-50"
              >
                {isProcessingLLM ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                )}
                <span>{isProcessingLLM ? 'Structuring…' : 'Extract with LLM'}</span>
              </button>

              <button
                type="button"
                onClick={copyTranscript}
                title="Copy Transcript"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 text-xs font-semibold border border-indigo-700/40 transition-all"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={clearScribe}
                title="Reset Scribe"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-rose-950/60 hover:border-rose-700/50 hover:text-rose-300 text-indigo-200 text-xs font-semibold border border-indigo-700/40 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={simulateClinicalSpeech}
            disabled={demoActive || isListening || isProcessingLLM}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 hover:text-white text-xs font-bold border border-violet-500/40 transition-all disabled:opacity-50 cursor-pointer"
            title="Simulate speech with sample clinical keywords and auto-fill form"
          >
            <Wand2 className="w-3.5 h-3.5 text-violet-300" />
            <span>{demoActive ? 'Dictating Demo…' : 'Quick Demo Test'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Glowing Microphone Button Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-indigo-900/50">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Glowing Microphone Button (Requirement 4) */}
          <button
            type="button"
            id="start-voice-scribe-btn"
            onClick={toggleListening}
            disabled={isProcessingLLM}
            className={`relative flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-black text-sm text-white transition-all shadow-xl cursor-pointer disabled:opacity-50 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/50 ring-4 ring-rose-500/50 animate-pulse'
                : 'bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 shadow-cyan-500/40 hover:shadow-cyan-400/60 ring-2 ring-cyan-400/30 hover:scale-[1.02]'
            }`}
          >
            {isListening ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
                <MicOff className="w-5 h-5" />
                <span>Stop Voice Scribe (Auto-Extracts)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 animate-bounce" />
                <span>Start Voice Scribe</span>
              </>
            )}
          </button>

          {/* Real-time Status Indicator */}
          <div className="min-w-0">
            {isListening ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <p className="text-xs font-extrabold text-rose-300 truncate">
                  Recording Active · Speak clinical findings in English (en-IN)…
                </p>
              </div>
            ) : isProcessingLLM ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                <p className="text-xs font-extrabold text-cyan-300 truncate">
                  LLM Medical Scribe structuring transcript & auto-filling form…
                </p>
              </div>
            ) : (
              <p className="text-xs text-indigo-300/80 font-medium">
                Tap button to dictate. When stopped, Gemini LLM automatically structures and auto-fills the evaluation form.
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Auto-fills: Final Diagnosis, Clinical Notes, Chief Complaints & Prescriptions.
            </p>
          </div>
        </div>

        {/* Mobile simulation button */}
        <button
          type="button"
          onClick={simulateClinicalSpeech}
          disabled={demoActive || isListening || isProcessingLLM}
          className="sm:hidden w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 text-xs font-bold border border-violet-500/40"
        >
          <Wand2 className="w-3.5 h-3.5 text-violet-300" />
          <span>{demoActive ? 'Dictating Demo…' : 'Simulate Sample Speech'}</span>
        </button>
      </div>

      {/* Auto-filled Success Banner */}
      {autoFilledBadge && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 text-emerald-200 text-xs shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-emerald-100">
                Clinical Evaluation Form Auto-Filled by LLM!
              </p>
              <p className="text-[11px] text-emerald-300/80">
                Final Diagnosis, Clinical Notes, Chief Complaints, and Prescriptions have been structured and populated below.
              </p>
            </div>
          </div>
          {llmResult?.final_diagnosis && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-black text-emerald-200">
              <Stethoscope className="w-3 h-3" />
              {llmResult.final_diagnosis}
            </span>
          )}
        </div>
      )}

      {/* Error / Notice Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
          <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Live Transcript Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Spoken Clinical Transcript
          </span>
          <span className="text-[10px] text-indigo-300/70 font-mono">
            {transcript
              ? `${transcript.split(/\s+/).filter(Boolean).length} words`
              : 'Ready to listen'}
          </span>
        </div>

        <div
          id="voice-scribe-live-transcript"
          className="relative min-h-[78px] max-h-36 overflow-y-auto w-full rounded-xl bg-slate-950/80 border border-indigo-900/60 p-3.5 text-xs text-indigo-50 font-normal leading-relaxed tracking-wide placeholder-slate-500 shadow-inner focus-within:ring-2 focus-within:ring-cyan-400/50 transition-all"
        >
          {transcript ? (
            <p className="whitespace-pre-wrap">{transcript}</p>
          ) : (
            <p className="text-slate-400/70 italic select-none">
              Spoken doctor-patient consultation speech will appear here in real time...
            </p>
          )}

          {isListening && (
            <span className="inline-block w-2 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
          )}
        </div>
      </div>

      {/* Three Distinct Color-Coded Chips Containers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* 🔴 Container 1: Detected Allergies (Red chips) */}
        <div className="rounded-xl bg-rose-950/40 border border-rose-800/40 p-3 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                Detected Allergies
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {extractedData.allergies.length}
              </span>
            </div>
            <p className="text-[10px] text-rose-300/70 mt-0.5">Critical contraindication flags</p>
          </div>

          <div className="min-h-[44px] flex flex-wrap items-center gap-1.5 pt-1">
            {extractedData.allergies.length > 0 ? (
              extractedData.allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-md shadow-rose-900/40 border border-rose-400/40 uppercase tracking-wider"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {allergy}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-rose-300/40 italic">
                No allergies detected in transcript
              </span>
            )}
          </div>
        </div>

        {/* 🟠 Container 2: Reported Symptoms (Orange chips) */}
        <div className="rounded-xl bg-amber-950/40 border border-amber-800/40 p-3 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500" />
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Reported Symptoms / Complaints
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {extractedData.symptoms.length}
              </span>
            </div>
            <p className="text-[10px] text-amber-300/70 mt-0.5">Chief complaints & presentation</p>
          </div>

          <div className="min-h-[44px] flex flex-wrap items-center gap-1.5 pt-1">
            {extractedData.symptoms.length > 0 ? (
              extractedData.symptoms.map((symptom) => (
                <span
                  key={symptom}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-md shadow-amber-900/40 border border-amber-300 uppercase tracking-wider"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  {symptom}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-amber-300/40 italic">
                No symptoms detected in transcript
              </span>
            )}
          </div>

          {onApplySymptoms && extractedData.symptoms.length > 0 && (
            <button
              type="button"
              onClick={() => onApplySymptoms(extractedData.symptoms.join(', '))}
              className="mt-1 flex items-center justify-center gap-1 w-full py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold border border-amber-500/30 transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-3 h-3" />
              Apply to Chief Complaints
            </button>
          )}
        </div>

        {/* 🟢 Container 3: Prescribed Medicines (Green/Blue chips) */}
        <div className="rounded-xl bg-emerald-950/40 border border-emerald-800/40 p-3 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                <Pill className="w-3.5 h-3.5 text-emerald-400" />
                Prescribed Medicines
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {extractedData.medicines.length}
              </span>
            </div>
            <p className="text-[10px] text-emerald-300/70 mt-0.5">Identified pharmacotherapy</p>
          </div>

          <div className="min-h-[44px] flex flex-wrap items-center gap-1.5 pt-1">
            {extractedData.medicines.length > 0 ? (
              extractedData.medicines.map((med) => (
                <span
                  key={med}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/40 border border-emerald-300 uppercase tracking-wider"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                  {med}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-emerald-300/40 italic">
                No medicines detected in transcript
              </span>
            )}
          </div>

          {onApplyMedicines && extractedData.medicines.length > 0 && (
            <button
              type="button"
              onClick={() => onApplyMedicines(extractedData.medicines)}
              className="mt-1 flex items-center justify-center gap-1 w-full py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-3 h-3" />
              Add to Prescription List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
