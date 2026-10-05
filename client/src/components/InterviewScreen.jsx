import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition, isSpeechRecognitionSupported } from '../hooks/useSpeechRecognition.js';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis.js';
import { useTimer } from '../hooks/useTimer.js';
import MicIndicator from './MicIndicator.jsx';
import Transcript from './Transcript.jsx';
import Timer from './Timer.jsx';
import InterviewControls from './InterviewControls.jsx';
import { JOB_TYPES, DIFFICULTIES } from '../lib/constants.js';

// ── Helper: stream SSE response and call onChunk for each text fragment ────
async function fetchStreamedChat({ config, transcript, message, onChunk, onDone, onError }) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, transcript, message }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || response.statusText);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.chunk) {
            fullText += payload.chunk;
            onChunk(payload.chunk, fullText);
          }
          if (payload.done) {
            onDone(fullText);
            return;
          }
          if (payload.error) {
            throw new Error(payload.error);
          }
        } catch (parseErr) {
          // ignore malformed SSE lines
        }
      }
    }

    // Stream ended without explicit 'done' event
    onDone(fullText);
  } catch (err) {
    onError(err);
  }
}

// ── Helper: split accumulated text into speakable sentences ────────────────
// Returns [sentencesReady, remainder]
function extractSentences(text) {
  // Match sentences that end with . ! or ? followed by space or end-of-string
  const sentenceRegex = /[^.!?]*[.!?]+(?:\s|$)/g;
  const sentences = [];
  let lastIndex = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = sentenceRegex.lastIndex;
  }

  const remainder = text.slice(lastIndex);
  return [sentences, remainder];
}

export default function InterviewScreen({ config, onFinishInterview }) {
  const [messages, setMessages] = useState([]); // [{ role: 'user'|'ai', text: string, timestamp, wordCount, durationMs }]
  const [status, setStatus] = useState('initializing'); // initializing | listening | thinking | speaking | error
  const [isMuted, setIsMuted] = useState(false);
  const [hideAiText, setHideAiText] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesRef = useRef([]);
  const answerStartTimeRef = useRef(Date.now());
  const initialGreetingSent = useRef(false);

  // Streaming TTS state
  const ttsQueueRef = useRef([]);       // sentences waiting to be spoken
  const isTTSBusyRef = useRef(false);   // is TTS currently speaking a sentence?
  const streamDoneRef = useRef(false);   // has the stream finished producing text?
  const remainderRef = useRef('');       // partial sentence not yet ready to speak

  const jobInfo = JOB_TYPES.find((j) => j.id === config.jobType) || JOB_TYPES[0];
  const diffInfo = DIFFICULTIES.find((d) => d.id === config.difficulty) || DIFFICULTIES[1];

  // Keep messagesRef updated for async closures
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── Speech Synthesis (TTS) ─────────────────────────────────────────────
  const tts = useSpeechSynthesis();

  // ── Timer Hook ─────────────────────────────────────────────────────────
  const totalSeconds = (config.sessionLength || 10) * 60;

  const handleTimeExpired = useCallback(() => {
    // Notify user time has expired and trigger ending
    setStatus('thinking');
    // Send concluding message to Gemini
    const concludePrompt = "[SYSTEM NOTICE: Time has expired. Please thank the candidate for their time, provide a warm polite closing remark, and end the interview.]";
    handleSendUserResponse(concludePrompt, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timer = useTimer(totalSeconds, handleTimeExpired);

  // ── Progressive TTS queue processor ────────────────────────────────────
  // Drains the sentence queue: speaks one sentence at a time.
  // Called whenever a new sentence is enqueued or the previous one finishes.
  const processTTSQueue = useCallback(async () => {
    if (isTTSBusyRef.current) return; // already speaking

    const next = ttsQueueRef.current.shift();
    if (!next) {
      // Queue empty
      if (streamDoneRef.current) {
        // All text received and spoken — return to listening
        setStatus((prevStatus) => {
          // Only transition if we're still in speaking mode
          if (prevStatus === 'speaking') {
            answerStartTimeRef.current = Date.now();
            if (!isMuted && isSpeechRecognitionSupported) {
              stt.resume();
              return 'listening';
            }
            return 'idle';
          }
          return prevStatus;
        });
      }
      return;
    }

    isTTSBusyRef.current = true;
    setStatus('speaking');
    stt.pause();

    await tts.speak(next);
    isTTSBusyRef.current = false;

    // Process next sentence in queue
    processTTSQueue();
  }, [tts, isMuted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Enqueue a sentence for TTS ─────────────────────────────────────────
  const enqueueSentence = useCallback((sentence) => {
    ttsQueueRef.current.push(sentence);
    processTTSQueue();
  }, [processTTSQueue]);

  // ── Core Send to Gemini Function (STREAMING) ──────────────────────────
  const handleSendUserResponse = useCallback(
    async (userText, isSystemConclude = false) => {
      if (!userText.trim()) return;

      const durationMs = Date.now() - answerStartTimeRef.current;
      const wordCount = userText.trim().split(/\s+/).filter(Boolean).length;

      // Add to messages if not a system notice
      let updatedMessages = [...messagesRef.current];
      if (!isSystemConclude) {
        const userMsg = {
          role: 'user',
          text: userText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          wordCount,
          durationMs,
        };
        updatedMessages.push(userMsg);
        setMessages(updatedMessages);
      }

      setStatus('thinking');
      stt.pause();

      // Reset streaming state
      ttsQueueRef.current = [];
      isTTSBusyRef.current = false;
      streamDoneRef.current = false;
      remainderRef.current = '';

      // Track AI message accumulation
      let fullAiText = '';
      let aiMsgAdded = false;

      await fetchStreamedChat({
        config,
        transcript: updatedMessages,
        message: userText,

        onChunk: (_chunk, accumulatedText) => {
          fullAiText = accumulatedText;

          // Update the AI message in real-time for the transcript display
          setMessages((prev) => {
            const updated = [...prev];
            if (!aiMsgAdded) {
              aiMsgAdded = true;
              updated.push({
                role: 'ai',
                text: accumulatedText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                _streaming: true,
              });
            } else {
              const last = updated[updated.length - 1];
              if (last.role === 'ai' && last._streaming) {
                updated[updated.length - 1] = { ...last, text: accumulatedText };
              }
            }
            return updated;
          });

          // Extract complete sentences and enqueue them for TTS
          const textToProcess = remainderRef.current + accumulatedText.slice(
            accumulatedText.length - _chunk.length - remainderRef.current.length >= 0
              ? accumulatedText.length - _chunk.length
              : 0
          );

          // Re-extract from full accumulated text for correctness
          const [sentences, remainder] = extractSentences(accumulatedText);
          const alreadyQueued = ttsQueueRef.current.length +
            (isTTSBusyRef.current ? 1 : 0);

          // Only enqueue NEW sentences
          for (let i = alreadyQueued; i < sentences.length; i++) {
            enqueueSentence(sentences[i]);
          }
          remainderRef.current = remainder;
        },

        onDone: (finalText) => {
          fullAiText = finalText;

          // Finalize the AI message (remove streaming flag)
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'ai' && last._streaming) {
              updated[updated.length - 1] = { ...last, text: finalText, _streaming: false };
            }
            return updated;
          });

          // Enqueue any remaining partial sentence
          if (remainderRef.current.trim()) {
            enqueueSentence(remainderRef.current.trim());
            remainderRef.current = '';
          }

          streamDoneRef.current = true;

          // If TTS queue is already empty and not busy, transition now
          if (ttsQueueRef.current.length === 0 && !isTTSBusyRef.current) {
            if (isSystemConclude) {
              onFinishInterview({
                config,
                transcript: [...messagesRef.current],
                endedAt: new Date().toISOString(),
              });
              return;
            }
            answerStartTimeRef.current = Date.now();
            if (!isMuted && isSpeechRecognitionSupported) {
              stt.resume();
              setStatus('listening');
            } else {
              setStatus('idle');
            }
          }

          // Handle system conclude after all TTS finishes
          if (isSystemConclude) {
            const waitForTTS = setInterval(() => {
              if (ttsQueueRef.current.length === 0 && !isTTSBusyRef.current) {
                clearInterval(waitForTTS);
                onFinishInterview({
                  config,
                  transcript: [...messagesRef.current],
                  endedAt: new Date().toISOString(),
                });
              }
            }, 200);
          }
        },

        onError: (err) => {
          console.error('[InterviewScreen] Stream error:', err);
          setErrorMsg(err.message || 'Failed to communicate with AI');
          setStatus('error');
          if (!isMuted && isSpeechRecognitionSupported) {
            stt.resume();
          }
        },
      });
    },
    [config, isMuted, tts, onFinishInterview, enqueueSentence] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Speech Recognition (STT) ───────────────────────────────────────────
  const stt = useSpeechRecognition({
    onResult: (finalText) => {
      if (!isMuted) {
        handleSendUserResponse(finalText);
      }
    },
    silenceMs: 2000, // 2.0s silence detection so natural pauses do not cut off answers
  });

  // ── Start Interview & Initial Greeting ─────────────────────────────────
  useEffect(() => {
    if (initialGreetingSent.current) return;
    initialGreetingSent.current = true;

    async function startSession() {
      setStatus('thinking');
      timer.start();

      try {
        // Initial handshake to get Alex's greeting
        const greetingPrompt = `[The candidate has just arrived and sat down for the interview for the ${jobInfo.label} position. Greet them warmly, introduce yourself briefly as Alex the hiring manager, and ask how they are doing today.]`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config,
            transcript: [],
            message: greetingPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error('Could not initiate interview session');
        }

        const data = await response.json();
        const aiGreeting = data.text;

        const greetingMsg = {
          role: 'ai',
          text: aiGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages([greetingMsg]);
        setStatus('speaking');

        await tts.speak(aiGreeting);

        answerStartTimeRef.current = Date.now();

        if (isSpeechRecognitionSupported && !isMuted) {
          stt.start();
          setStatus('listening');
        } else {
          setStatus('idle');
        }
      } catch (err) {
        console.error('Failed to get initial greeting:', err);
        setErrorMsg('Could not connect to interviewer. Please check your internet or API key.');
        setStatus('error');
      }
    }

    startSession();

    return () => {
      tts.cancel();
      stt.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mute Toggle ────────────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        stt.stop();
      } else {
        if (isSpeechRecognitionSupported) {
          stt.start();
          setStatus('listening');
        }
      }
      return next;
    });
  }, [stt]);

  // ── Repeat Last AI Question ───────────────────────────────────────────
  const handleRepeatLastAi = useCallback(
    async (specificText) => {
      const textToSpeak =
        typeof specificText === 'string'
          ? specificText
          : messagesRef.current.findLast((m) => m.role === 'ai')?.text;

      if (!textToSpeak) return;

      stt.pause();
      setStatus('speaking');
      await tts.speak(textToSpeak);

      if (!isMuted && isSpeechRecognitionSupported) {
        stt.resume();
        setStatus('listening');
      } else {
        setStatus('idle');
      }
    },
    [tts, stt, isMuted]
  );

  // ── End Interview Early ────────────────────────────────────────────────
  const handleEndInterview = useCallback(() => {
    timer.pause();
    stt.stop();
    tts.cancel();

    onFinishInterview({
      config,
      transcript: messagesRef.current,
      endedAt: new Date().toISOString(),
    });
  }, [config, onFinishInterview, stt, timer, tts]);

  const latestAiMessage = messages.findLast((m) => m.role === 'ai');

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex flex-col p-2 sm:p-4 animate-fadeIn">
      {/* Top Session Status Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:px-4 flex items-center justify-between shadow-2xs mb-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl p-1.5 rounded-lg bg-blue-50 border border-blue-100">
            {jobInfo.icon}
          </span>
          <div>
            <div className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <span>{jobInfo.label} Interview</span>
              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {diffInfo.label}
              </span>
            </div>
            <p className="text-3xs sm:text-xs text-slate-500 font-medium">
              Interviewer: Alex · CEFR B2 Customer Service Practice
            </p>
          </div>
        </div>

        {/* Timer */}
        <Timer
          formatted={timer.formatted}
          secondsLeft={timer.secondsLeft}
          totalSeconds={totalSeconds}
        />
      </div>

      {/* Main Conversation & Visualizer Split */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-xs">
        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg('')}
              className="text-red-900 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Live Conversation Transcript */}
        <Transcript
          messages={messages}
          interimText={stt.interimText}
          hideAiText={hideAiText}
          onRepeatMessage={handleRepeatLastAi}
          isAiSpeaking={status === 'speaking'}
        />

        {/* Center Mic Visualizer Orb */}
        <div className="border-t border-slate-100 bg-slate-50/50 py-1">
          <MicIndicator
            status={status}
            isMuted={isMuted}
            isSpeaking={status === 'speaking'}
          />
        </div>

        {/* Bottom Control Bar */}
        <InterviewControls
          isListening={status === 'listening'}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onDoneSpeaking={stt.manualFlush}
          onRepeatLastAi={() => handleRepeatLastAi(latestAiMessage?.text)}
          hasAiMessage={!!latestAiMessage}
          hideAiText={hideAiText}
          onToggleHideAiText={() => setHideAiText(!hideAiText)}
          onEndInterview={handleEndInterview}
          onSendText={handleSendUserResponse}
          isProcessing={status === 'thinking'}
          isAiSpeaking={status === 'speaking'}
          isSpeechSupported={isSpeechRecognitionSupported}
        />
      </div>
    </div>
  );
}
