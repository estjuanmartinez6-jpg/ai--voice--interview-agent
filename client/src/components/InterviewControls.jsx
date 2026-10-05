import { useState } from 'react';

export default function InterviewControls({
  isListening,
  isMuted,
  onToggleMute,
  onDoneSpeaking,
  onRepeatLastAi,
  hasAiMessage,
  hideAiText,
  onToggleHideAiText,
  onEndInterview,
  onSendText,
  isProcessing,
  isAiSpeaking,
  isSpeechSupported,
}) {
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(!isSpeechSupported);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing || isAiSpeaking) return;
    onSendText(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4 space-y-3">
      {/* Top bar controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Done Speaking manual flush */}
          <button
            type="button"
            onClick={onDoneSpeaking}
            disabled={!isListening || isMuted || isProcessing || isAiSpeaking}
            className="btn btn-primary text-xs py-2 px-3 shadow-xs font-semibold disabled:opacity-40"
            title="Send your spoken answer immediately without waiting for the 2-second silence"
          >
            <span>✅</span>
            <span>Done Speaking</span>
          </button>

          {/* Mute button */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`btn text-xs py-2 px-3 border transition-colors ${
              isMuted
                ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 font-bold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <span>{isMuted ? '🔇' : '🎙️'}</span>
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Repeat button */}
          <button
            type="button"
            onClick={onRepeatLastAi}
            disabled={!hasAiMessage || isAiSpeaking || isProcessing}
            className="btn btn-secondary text-xs py-2 px-3 disabled:opacity-40"
            title="Have Alex repeat the last question or sentence"
          >
            <span>🔁</span>
            <span>Repeat Question</span>
          </button>

          {/* Hide AI text toggle */}
          <button
            type="button"
            onClick={onToggleHideAiText}
            className={`btn text-xs py-2 px-3 border transition-colors ${
              hideAiText
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Hide the AI's transcript to practice pure listening comprehension"
          >
            <span>{hideAiText ? '👁️‍🗨️' : '👁️'}</span>
            <span className="hidden sm:inline">
              {hideAiText ? 'Show AI Text' : 'Hide AI Text'}
            </span>
          </button>
        </div>

        {/* Right actions: Text mode toggle & End Interview */}
        <div className="flex items-center gap-2">
          {isSpeechSupported && (
            <button
              type="button"
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1"
            >
              {showTextInput ? 'Hide Text Input' : 'Type Answers ⌨️'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            className="btn btn-danger text-xs py-2 px-3 font-semibold"
          >
            <span>⏹</span>
            <span>End Interview</span>
          </button>
        </div>
      </div>

      {/* Text fallback input field */}
      {showTextInput && (
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2 animate-fadeIn">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your response here and press Enter…"
            disabled={isProcessing || isAiSpeaking}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing || isAiSpeaking}
            className="btn btn-primary text-xs py-2 px-4 whitespace-nowrap font-semibold"
          >
            <span>Send</span>
          </button>
        </form>
      )}

      {/* End interview confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl mx-auto mb-3">
                ⏹
              </div>
              <h3 className="font-bold text-slate-800 text-lg">End Interview?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ending now will generate your performance report based on the answers you've given so
                far.
              </p>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="btn btn-secondary flex-1 text-xs py-2.5 font-semibold"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndInterview();
                }}
                className="btn btn-danger flex-1 text-xs py-2.5 font-semibold"
              >
                Yes, End & Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
