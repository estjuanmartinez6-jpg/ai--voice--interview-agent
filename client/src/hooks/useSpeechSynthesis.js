import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useSpeechSynthesis
 *
 * Wraps the Web Speech API SpeechSynthesis with:
 *  - Best English voice selection (prefers Google UK Female, then en-US/en-GB)
 *  - Sentence splitting to work around Chrome's ~15s utterance cutoff
 *  - Faster speech rate (1.1x) for punchier turn-taking
 *  - Returns a Promise that resolves when speech completes
 *  - cancel() stops playback immediately
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cancelledRef = useRef(false);
  const voiceRef     = useRef(null);

  // ── Voice selection ────────────────────────────────────────────────────
  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Priority order for a clear, natural B2-level English voice
    const preferred = [
      'Google UK English Female',
      'Google UK English Male',
      'Microsoft Zira - English (United States)',
      'Microsoft David - English (United States)',
    ];

    for (const name of preferred) {
      const v = voices.find((v) => v.name === name);
      if (v) return v;
    }

    // Fallback: first en-GB then en-US voice
    return (
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => v.lang.startsWith('en-US')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      null
    );
  }, []);

  // Voices load asynchronously in some browsers
  useEffect(() => {
    const loadVoices = () => { voiceRef.current = pickVoice(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [pickVoice]);

  // ── Split text into sentences ──────────────────────────────────────────
  // Chrome has a ~15-second cutoff per utterance. We split on sentence
  // boundaries and speak them sequentially.
  const splitSentences = (text) => {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // ── speak() ───────────────────────────────────────────────────────────
  const speak = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!text?.trim()) { resolve(); return; }

        cancelledRef.current = false;

        // Chrome bug: SpeechSynthesis can get stuck in a "paused" state.
        // Force-cancel any stale utterances before starting new ones.
        window.speechSynthesis.cancel();

        const sentences = splitSentences(text);
        let index = 0;

        const speakNext = () => {
          if (cancelledRef.current || index >= sentences.length) {
            setIsSpeaking(false);
            resolve();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(sentences[index]);
          utterance.voice  = voiceRef.current || pickVoice();
          utterance.rate   = 1.1;    // slightly faster for snappier conversation
          utterance.pitch  = 1.0;
          utterance.lang   = 'en-US';

          utterance.onend   = () => { index++; speakNext(); };
          utterance.onerror = (e) => {
            // 'interrupted' fires when cancel() is called — not a real error
            if (e.error !== 'interrupted') console.error('[TTS] error:', e.error);
            setIsSpeaking(false);
            resolve();
          };

          if (index === 0) setIsSpeaking(true);
          window.speechSynthesis.speak(utterance);
        };

        // Chrome keeps-alive timer: chrome pauses TTS after ~15s if there's no activity.
        // We ping speechSynthesis.resume() every 5s to prevent it.
        const keepAlive = setInterval(() => {
          if (cancelledRef.current) {
            clearInterval(keepAlive);
            return;
          }
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 5000);

        // Wrap resolve to also clear keepAlive
        const originalResolve = resolve;
        resolve = () => {
          clearInterval(keepAlive);
          originalResolve();
        };

        speakNext();
      }),
    [pickVoice]
  );

  // ── cancel() ──────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      window.speechSynthesis.cancel();
    };
  }, []);

  return { isSpeaking, speak, cancel };
}
