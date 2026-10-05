import { useState } from 'react';
import { JOB_TYPES, DIFFICULTIES, SESSION_LENGTHS } from '../lib/constants.js';
import { isSpeechRecognitionSupported } from '../hooks/useSpeechRecognition.js';

export default function SetupScreen({ onStartInterview, onViewHistory, savedCount = 0 }) {
  const [jobType, setJobType] = useState('call-center');
  const [difficulty, setDifficulty] = useState('standard');
  const [sessionLength, setSessionLength] = useState(10);
  const [micState, setMicState] = useState('untested'); // untested | checking | granted | denied
  const [micErrorMsg, setMicErrorMsg] = useState('');

  const handleStart = async () => {
    // If browser doesn't support Web Speech API, proceed directly (will use text fallback)
    if (!isSpeechRecognitionSupported) {
      onStartInterview({ jobType, difficulty, sessionLength });
      return;
    }

    setMicState('checking');
    setMicErrorMsg('');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the tracks immediately after verification
        stream.getTracks().forEach((track) => track.stop());
        setMicState('granted');
        onStartInterview({ jobType, difficulty, sessionLength });
      } else {
        // Fallback for environments without mediaDevices
        onStartInterview({ jobType, difficulty, sessionLength });
      }
    } catch (err) {
      console.warn('Microphone permission check failed:', err);
      setMicState('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicErrorMsg(
          'Microphone access was denied. Please allow microphone permissions in your browser address bar to use voice practice, or continue using text mode.'
        );
      } else {
        setMicErrorMsg('Could not detect or access a microphone. You can still practice using text mode.');
      }
    }
  };

  const selectedJob = JOB_TYPES.find((j) => j.id === jobType);
  const selectedDiff = DIFFICULTIES.find((d) => d.id === difficulty);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Intro Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-3">
          <span>🎧 Headphones recommended for the best voice experience</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
          Job Interview Practice for Customer Service
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl mx-auto text-base sm:text-lg">
          Practice live spoken English at <span className="font-semibold text-slate-700">CEFR B2 level</span> with
          Alex, an AI hiring manager. Master natural fluency, de-escalation, and STAR responses.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Job Role Selection */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                Target Role
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Alex will tailor interview questions and role-play scenarios specifically to this job.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hidden sm:inline-block">
              {selectedJob?.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {JOB_TYPES.map((job) => {
              const isSelected = job.id === jobType;
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setJobType(job.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-lg bg-white shadow-xs border border-slate-100">
                      {job.icon}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        {job.label}
                        {isSelected && <span className="text-blue-600 text-xs">✓</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Difficulty Selection */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                Interviewer Style & Difficulty
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Controls Alex's temperament, pacing, and whether they challenge your answers.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hidden sm:inline-block">
              {selectedDiff?.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DIFFICULTIES.map((diff) => {
              const isSelected = diff.id === difficulty;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setDifficulty(diff.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{diff.icon}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        diff.id === 'friendly'
                          ? 'bg-emerald-100 text-emerald-800'
                          : diff.id === 'standard'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {diff.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">{diff.label}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{diff.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 3: Session Duration Selection */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                Session Length
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                The interview ends smoothly with closing remarks when the timer finishes.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg hidden sm:inline-block">
              {sessionLength} minutes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SESSION_LENGTHS.map((len) => {
              const isSelected = len.value === sessionLength;
              return (
                <button
                  key={len.value}
                  type="button"
                  onClick={() => setSessionLength(len.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="text-xl font-extrabold text-slate-800">{len.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{len.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Browser warning if Web Speech is not supported */}
        {!isSpeechRecognitionSupported && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Speech Recognition Not Supported In This Browser</p>
              <p className="text-xs text-amber-700 mt-0.5">
                For live voice input, open this page in <strong>Google Chrome</strong> or{' '}
                <strong>Microsoft Edge</strong>. You can still practice by typing answers below.
              </p>
            </div>
          </div>
        )}

        {/* Mic Permission Denied Banner */}
        {micState === 'denied' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3">
            <span className="text-xl">🎙️❌</span>
            <div>
              <p className="font-semibold">Microphone Access Needed</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{micErrorMsg}</p>
              <button
                type="button"
                onClick={() => onStartInterview({ jobType, difficulty, sessionLength })}
                className="mt-2 text-xs font-semibold text-red-800 underline hover:text-red-900"
              >
                Continue anyway with text mode →
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={micState === 'checking'}
            className="w-full sm:flex-1 py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {micState === 'checking' ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking microphone…</span>
              </>
            ) : (
              <>
                <span>🎙️</span>
                <span>Start Interview</span>
              </>
            )}
          </button>

          {savedCount > 0 && (
            <button
              type="button"
              onClick={onViewHistory}
              className="w-full sm:w-auto py-4 px-6 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>📂</span>
              <span>Past Sessions ({savedCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
