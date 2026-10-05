import { useEffect, useRef } from 'react';

export default function Transcript({
  messages,
  interimText,
  hideAiText,
  onRepeatMessage,
  isAiSpeaking,
}) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever messages or interim text updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[280px]">
      {messages.length === 0 && !interimText && (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-2">
            💬
          </div>
          <p className="font-semibold text-slate-600 text-sm">Waiting for the interview to begin</p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Alex will greet you in a moment. Speak into your microphone to answer.
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isAi = msg.role === 'ai';
        const isLatestAi = isAi && index === messages.findLastIndex((m) => m.role === 'ai');

        return (
          <div
            key={index}
            className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} animate-fadeIn`}
          >
            {/* Speaker Tag */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-xs text-slate-500 font-medium">
              <span>{isAi ? '🤖 Alex (Hiring Manager)' : '👤 You (Candidate)'}</span>
              {msg.timestamp && (
                <span className="text-slate-400 text-3xs">{msg.timestamp}</span>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs transition-all ${
                isAi
                  ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-tr-xs'
              }`}
            >
              {isAi && hideAiText ? (
                <div className="italic text-slate-400 flex items-center gap-2 select-none py-1">
                  <span>🔒</span>
                  <span>AI text hidden for listening practice</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}

              {/* Action buttons inside bubble for latest AI message */}
              {isAi && onRepeatMessage && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => onRepeatMessage(msg.text)}
                    disabled={isAiSpeaking}
                    className="hover:text-blue-600 font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                  >
                    <span>🔁</span>
                    <span>Replay voice</span>
                  </button>
                  {isLatestAi && isAiSpeaking && (
                    <span className="text-blue-600 font-semibold text-3xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      Speaking now…
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Live Interim Candidate Speech Bubble */}
      {interimText && (
        <div className="flex flex-col items-end animate-fadeIn">
          <div className="flex items-center gap-1.5 mb-1 px-1 text-xs text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Speaking…</span>
          </div>
          <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed bg-blue-100 border border-blue-300 text-blue-900 rounded-tr-xs italic shadow-xs">
            <p>"{interimText}"</p>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
