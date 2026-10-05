import { useEffect, useRef, useCallback, useState } from 'react';

// Detects browser support once at module level
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export const isSpeechRecognitionSupported = !!SpeechRecognition;

/**
 * useSpeechRecognition
 *
 * Robust Web Speech API wrapper designed for real conversational interviews:
 *  - Accumulates speech across multiple Chrome utterance restarts without cutting the user off.
 *  - Generous silence detection (default 2000ms) so natural speaking pauses don't cut off speech.
 *  - Shows live accumulated text in real-time so the user sees their full response.
 *  - Instant turn commit via "Done Speaking" button or after silence timeout.
 *  - Echo blanking to avoid recording speaker audio right after TTS ends.
 *
 * @param {object}   options
 * @param {function} options.onResult   - called with the final combined text after silence
 * @param {number}   options.silenceMs  - ms of silence before flushing (default 2000)
 */
export function useSpeechRecognition({ onResult, silenceMs = 2000 } = {}) {
  const [status, setStatus]           = useState('idle'); // idle | listening | paused | error
  const [interimText, setInterimText] = useState('');     // live transcript shown to user
  const [error, setError]             = useState(null);

  const recognitionRef          = useRef(null);
  const activeRef               = useRef(false);  // should we be running?
  const pausedRef               = useRef(false);  // paused for TTS / thinking?
  const committedTextRef        = useRef('');     // speech text preserved across session restarts
  const sessionFinalTextRef     = useRef('');     // finalized speech in active session
  const sessionInterimTextRef   = useRef('');     // interim speech in active session
  const silenceTimerRef         = useRef(null);
  const onResultRef             = useRef(onResult);

  // Echo-blanking refs
  const echoBlankedUntilRef = useRef(0);
  const audioContextRef     = useRef(null);
  const analyserRef         = useRef(null);
  const micStreamRef        = useRef(null);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // ── Helper to assemble the complete spoken response so far ──────────────
  const getFullTranscript = useCallback(() => {
    return [
      committedTextRef.current,
      sessionFinalTextRef.current,
      sessionInterimTextRef.current,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // ── Flush: commits all accumulated speech and sends to AI ───────────────
  const flush = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const fullText = getFullTranscript();

    // Clear all accumulated text
    committedTextRef.current = '';
    sessionFinalTextRef.current = '';
    sessionInterimTextRef.current = '';
    setInterimText('');

    if (fullText && onResultRef.current) {
      // Abort recognition immediately so the mic cleanly stops hearing
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      onResultRef.current(fullText);
    }
  }, [getFullTranscript]);

  // ── Reset silence countdown timer ──────────────────────────────────────
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      flush();
    }, silenceMs);
  }, [flush, silenceMs]);

  // ── Energy check: returns true if audio energy is above background noise ──
  const isMicLoud = useCallback(() => {
    if (!analyserRef.current) return true;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    return rms > 0.04;
  }, []);

  // ── Setup AudioContext for echo gate (once) ─────────────────────────────
  const ensureAudioContext = useCallback(async () => {
    if (audioContextRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      micStreamRef.current = stream;
    } catch (err) {
      console.warn('[STT] Could not create AudioContext for echo gate:', err);
    }
  }, []);

  // ── Create and configure SpeechRecognition instance ─────────────────────
  const initRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang            = 'en-US';
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      // Echo blanking: ignore low-energy speaker echo right after TTS ends
      const now = Date.now();
      if (now < echoBlankedUntilRef.current) {
        if (!isMicLoud()) {
          return;
        }
        echoBlankedUntilRef.current = 0;
      }

      let finalStr = '';
      let interimStr = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalStr += (finalStr ? ' ' : '') + result[0].transcript;
        } else {
          interimStr += (interimStr ? ' ' : '') + result[0].transcript;
        }
      }

      sessionFinalTextRef.current = finalStr;
      sessionInterimTextRef.current = interimStr;

      const currentTotal = getFullTranscript();
      setInterimText(currentTotal);

      if (currentTotal) {
        // Any incoming speech resets the silence countdown
        resetSilenceTimer();
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.error('[STT] error:', event.error);
      setError(event.error);
      setStatus('error');
    };

    // Chrome fires onend when an utterance slice finishes or silence threshold is reached
    rec.onend = () => {
      // Roll current session's final text into committedTextRef so it is preserved
      if (sessionFinalTextRef.current) {
        committedTextRef.current = [
          committedTextRef.current,
          sessionFinalTextRef.current,
        ]
          .filter(Boolean)
          .join(' ');
        sessionFinalTextRef.current = '';
        sessionInterimTextRef.current = '';
      }

      // DO NOT flush here! Allow the candidate to continue speaking or silence timer to finish.
      // Restart recognition if we are still active and not paused for AI thinking/speaking.
      if (activeRef.current && !pausedRef.current) {
        try {
          rec.start();
        } catch (_) {
          /* ignore if already starting */
        }
      }
    };

    return rec;
  }, [resetSilenceTimer, isMicLoud, getFullTranscript]);

  // ── start() ───────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!SpeechRecognition) {
      setError('not-supported');
      return;
    }
    if (activeRef.current) return;

    activeRef.current = true;
    pausedRef.current = false;
    committedTextRef.current = '';
    sessionFinalTextRef.current = '';
    sessionInterimTextRef.current = '';
    setInterimText('');

    await ensureAudioContext();

    const rec = initRecognition();
    recognitionRef.current = rec;

    try {
      rec.start();
      setStatus('listening');
      setError(null);
    } catch (err) {
      console.error('[STT] start failed:', err);
      setError('start-failed');
      setStatus('error');
    }
  }, [initRecognition, ensureAudioContext]);

  // ── stop() ────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    activeRef.current = false;
    pausedRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    committedTextRef.current = '';
    sessionFinalTextRef.current = '';
    sessionInterimTextRef.current = '';
    setInterimText('');
    try {
      recognitionRef.current?.abort();
    } catch (_) {}
    recognitionRef.current = null;
    setStatus('idle');
  }, []);

  // ── pause() — call before AI thinking / TTS begins ─────────────────────
  const pause = useCallback(() => {
    if (!activeRef.current) return;
    pausedRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    committedTextRef.current = '';
    sessionFinalTextRef.current = '';
    sessionInterimTextRef.current = '';
    setInterimText('');
    try {
      recognitionRef.current?.abort();
    } catch (_) {}
    setStatus('paused');
  }, []);

  // ── resume() — call after TTS ends ────────────────────────────────────
  const resume = useCallback(() => {
    if (!activeRef.current || !pausedRef.current) return;
    pausedRef.current = false;

    committedTextRef.current = '';
    sessionFinalTextRef.current = '';
    sessionInterimTextRef.current = '';
    setInterimText('');

    const ECHO_BLANKING_MS = 600;
    const RESUME_DELAY_MS = 300;

    setTimeout(() => {
      if (!pausedRef.current && activeRef.current) {
        echoBlankedUntilRef.current = Date.now() + ECHO_BLANKING_MS;

        const rec = initRecognition();
        recognitionRef.current = rec;
        try {
          rec.start();
          setStatus('listening');
        } catch (err) {
          console.error('[STT] resume failed:', err);
        }
      }
    }, RESUME_DELAY_MS);
  }, [initRecognition]);

  // ── Manual flush (Done Speaking button) ────────────────────────────────
  const manualFlush = useCallback(() => {
    flush();
  }, [flush]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
      try {
        audioContextRef.current?.close();
      } catch (_) {}
      try {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch (_) {}
    };
  }, []);

  return {
    status,         // 'idle' | 'listening' | 'paused' | 'error'
    interimText,    // live full accumulated text being spoken
    error,
    isSupported: isSpeechRecognitionSupported,
    start,
    stop,
    pause,
    resume,
    manualFlush,
  };
}
