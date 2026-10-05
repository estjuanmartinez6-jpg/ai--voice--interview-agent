import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition, isSpeechRecognitionSupported } from '../hooks/useSpeechRecognition.js';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis.js';

// A bare-bones config for the voice loop test
const TEST_CONFIG = {
  jobType: 'call-center',
  difficulty: 'standard',
  sessionLength: 10,
};

/**
 * VoiceLoopTest
 *
 * Phase 0: bare-bones page to verify the full voice loop works:
 *   mic → STT → POST /api/chat → TTS → back to listening
 *
 * Tests:
 *  - Speech recognition start/stop
 *  - 2-second silence detection + "Done speaking" button
 *  - Gemini API round-trip via the server proxy
 *  - TTS playback
 *  - Mic paused during TTS (echo prevention)
 *  - Text fallback input for non-Chrome browsers
 *  - Latency measurement per turn
 */
export default function VoiceLoopTest() {
  const [log, setLog]             = useState([]);   // { role, text, ms? }
  const [status, setStatus]       = useState('idle'); // idle | listening | thinking | speaking | error
  const [textInput, setTextInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [serverOk, setServerOk]   = useState(null);  // null | true | false
  const transcriptRef             = useRef([]);       // full conversation history
  const tStart                    = useRef(null);     // latency timer

  const addLog = useCallback((role, text, ms) => {
    const entry = { role, text, ts: new Date().toLocaleTimeString(), ms };
    setLog((prev) => [...prev, entry]);
    if (role !== 'system') {
      transcriptRef.current = [...transcriptRef.current, { role: role === 'ai' ? 'ai' : 'user', text }];
    }
  }, []);

  // ── Send a user message to the server ──────────────────────────────────
  const sendToGemini = useCallback(async (userText) => {
    if (!userText.trim()) return;

    // Append user message to transcript before sending
    const nextTranscript = [
      ...transcriptRef.current,
      { role: 'user', text: userText },
    ];
    transcriptRef.current = nextTranscript;

    addLog('user', userText);
    setStatus('thinking');
    tStart.current = Date.now();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: TEST_CONFIG,
          transcript: nextTranscript,
          message: userText,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      const { text } = await res.json();
      const ms = Date.now() - tStart.current;

      transcriptRef.current = [...transcriptRef.current, { role: 'ai', text }];
      addLog('ai', text, ms);

      // Speak the response (mic is paused inside speak())
      setStatus('speaking');
      stt.pause();
      await tts.speak(text);
      stt.resume();
      setStatus('listening');
    } catch (err) {
      addLog('system', `❌ Error: ${err.message}`);
      setStatus('error');
      stt.resume();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Speech recognition ─────────────────────────────────────────────────
  const stt = useSpeechRecognition({
    onResult: sendToGemini,
    silenceMs: 2000,
  });

  // ── TTS ────────────────────────────────────────────────────────────────
  const tts = useSpeechSynthesis();

  // ── Start / Stop ───────────────────────────────────────────────────────
  const handleStart = async () => {
    // Check server health first
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setServerOk(data.keyLoaded);
      if (!data.keyLoaded) {
        addLog('system', '⚠️  Server is up but GEMINI_API_KEY is missing in server/.env');
        return;
      }
    } catch {
      setServerOk(false);
      addLog('system', '❌ Cannot reach server. Is it running on port 3001?');
      return;
    }

    transcriptRef.current = [];
    setLog([]);
    setIsRunning(true);
    addLog('system', '✅ Server connected. Starting voice loop…');

    if (isSpeechRecognitionSupported) {
      stt.start();
      setStatus('listening');
      addLog('system', '🎙️ Listening (Chrome/Edge). Speak now, or use the text box below.');
    } else {
      setStatus('idle');
      addLog('system', '⚠️ Speech recognition not supported in this browser. Use the text box below.');
    }
  };

  const handleStop = () => {
    stt.stop();
    tts.cancel();
    setIsRunning(false);
    setStatus('idle');
    addLog('system', '⏹ Session ended.');
  };

  // ── Text fallback submit ───────────────────────────────────────────────
  const handleTextSubmit = (e) => {
    e.preventDefault();
    const val = textInput.trim();
    if (!val || status === 'thinking' || status === 'speaking') return;
    setTextInput('');
    sendToGemini(val);
  };

  // ── Status label / color ───────────────────────────────────────────────
  const statusMeta = {
    idle:      { label: 'Ready',          color: 'text-slate-500',   dot: 'bg-slate-400' },
    listening: { label: 'Listening…',     color: 'text-emerald-600', dot: 'bg-emerald-500 animate-pulse' },
    thinking:  { label: 'AI thinking…',   color: 'text-blue-600',    dot: 'bg-blue-500 animate-pulse' },
    speaking:  { label: 'AI speaking…',   color: 'text-indigo-600',  dot: 'bg-indigo-500 animate-pulse' },
    paused:    { label: 'Mic paused',     color: 'text-amber-600',   dot: 'bg-amber-400' },
    error:     { label: 'Error',          color: 'text-red-600',     dot: 'bg-red-500' },
  };
  const { label: statusLabel, color: statusColor, dot: statusDot } =
    statusMeta[stt.status === 'paused' ? 'paused' : status] ?? statusMeta.idle;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          🎙️ InterviewReady — Voice Loop Test
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Phase 0 · Tests the full pipeline: mic → STT → Gemini → TTS → mic
        </p>
        <p className="text-amber-600 text-xs mt-1 font-medium">
          🎧 Headphones recommended to prevent echo.
        </p>
      </div>

      {/* Status bar */}
      <div className="w-full max-w-2xl card p-4 mb-4 flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDot}`} />
        <span className={`font-medium text-sm ${statusColor}`}>{statusLabel}</span>
        {stt.interimText && (
          <span className="text-slate-400 text-sm italic truncate">
            "{stt.interimText}"
          </span>
        )}
        {serverOk === false && (
          <span className="ml-auto text-red-500 text-xs font-medium">Server offline</span>
        )}
        {serverOk === true && (
          <span className="ml-auto text-emerald-500 text-xs font-medium">Server ✓</span>
        )}
      </div>

      {/* Conversation log */}
      <div className="w-full max-w-2xl card flex-1 p-4 mb-4 min-h-[300px] max-h-[420px] overflow-y-auto flex flex-col gap-3">
        {log.length === 0 && (
          <p className="text-slate-400 text-sm text-center mt-8">
            Press "Start" to begin the voice loop test.
          </p>
        )}
        {log.map((entry, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              entry.role === 'user'
                ? 'items-end'
                : entry.role === 'system'
                ? 'items-center'
                : 'items-start'
            }`}
          >
            {entry.role === 'system' ? (
              <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                {entry.text}
              </span>
            ) : (
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                  entry.role === 'user'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                <div className="font-medium text-xs mb-1 opacity-60">
                  {entry.role === 'user' ? 'You' : '🤖 Alex'}
                  <span className="ml-2">{entry.ts}</span>
                  {entry.ms != null && (
                    <span className="ml-2 text-emerald-600">{entry.ms}ms</span>
                  )}
                </div>
                {entry.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="w-full max-w-2xl flex flex-col gap-3">
        {/* Start / Stop */}
        <div className="flex gap-3">
          {!isRunning ? (
            <button className="btn-primary flex-1 py-3 text-base" onClick={handleStart}>
              ▶ Start Voice Loop
            </button>
          ) : (
            <>
              <button
                className="btn-secondary flex-1 py-3 text-base"
                onClick={stt.manualFlush}
                disabled={status !== 'listening' || !isSpeechRecognitionSupported}
                title="Send what you've said so far without waiting for silence"
              >
                ✅ Done Speaking
              </button>
              <button className="btn-danger py-3 px-6" onClick={handleStop}>
                ⏹ Stop
              </button>
            </>
          )}
        </div>

        {/* Text fallback — always visible when running */}
        {isRunning && (
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                isSpeechRecognitionSupported
                  ? 'Or type your message here…'
                  : '⚠️ Speech not supported — type here'
              }
              disabled={status === 'thinking' || status === 'speaking'}
              className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         disabled:opacity-50 bg-white"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || status === 'thinking' || status === 'speaking'}
              className="btn-primary px-4"
            >
              Send
            </button>
          </form>
        )}

        {/* Browser support notice */}
        {!isSpeechRecognitionSupported && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs">
            ⚠️ Your browser doesn't support the Web Speech API. Voice input is disabled.
            Please use <strong>Chrome</strong> or <strong>Edge</strong> for full voice support.
            You can still test the Gemini connection using the text box above.
          </p>
        )}
      </div>

      {/* Debug info */}
      {isRunning && (
        <div className="w-full max-w-2xl mt-4 text-xs text-slate-400 flex gap-4">
          <span>Turns: {transcriptRef.current.length}</span>
          <span>STT: {stt.status}</span>
          <span>TTS: {tts.isSpeaking ? 'speaking' : 'idle'}</span>
          <span>Browser STT: {isSpeechRecognitionSupported ? '✓' : '✗'}</span>
        </div>
      )}
    </div>
  );
}
