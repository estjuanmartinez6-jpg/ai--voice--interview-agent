import { useState, useEffect, useRef } from 'react';
import ScoreRing from './ScoreRing.jsx';
import CategoryScores from './CategoryScores.jsx';
import MistakesTable from './MistakesTable.jsx';
import BetterPhrases from './BetterPhrases.jsx';
import StarExamples from './StarExamples.jsx';
import NextSteps from './NextSteps.jsx';
import { saveSessionToStorage } from '../lib/storage.js';
import { JOB_TYPES, DIFFICULTIES } from '../lib/constants.js';

export default function FeedbackScreen({
  sessionData,
  onNewInterview,
  onViewHistory,
}) {
  const [feedback, setFeedback] = useState(sessionData?.feedback || null);
  const [loading, setLoading] = useState(!sessionData?.feedback);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  const fetchAttempted = useRef(false);

  const { config, transcript, id, endedAt } = sessionData;
  const jobInfo = JOB_TYPES.find((j) => j.id === config?.jobType) || JOB_TYPES[0];
  const diffInfo = DIFFICULTIES.find((d) => d.id === config?.difficulty) || DIFFICULTIES[1];

  // Request feedback from server if not already generated
  useEffect(() => {
    if (feedback || fetchAttempted.current) return;
    fetchAttempted.current = true;

    async function fetchReport() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config,
            transcript,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Report generation failed' }));
          throw new Error(err.error || res.statusText);
        }

        const data = await res.json();
        setFeedback(data);

        // Auto-save to localStorage
        const fullSession = {
          ...sessionData,
          feedback: data,
          savedAt: new Date().toISOString(),
        };
        saveSessionToStorage(fullSession);
        setSaved(true);
      } catch (err) {
        console.error('Error fetching feedback report:', err);
        setError(err.message || 'Failed to generate feedback report');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [config, feedback, sessionData, transcript]);

  const handleManualSave = () => {
    if (!feedback) return;
    const fullSession = {
      ...sessionData,
      feedback,
      savedAt: new Date().toISOString(),
    };
    saveSessionToStorage(fullSession);
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-slate-800">Generating Your Interview Report…</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          Alex is reviewing your answers, analyzing grammar and vocabulary, scoring customer service
          tone, and crafting model STAR responses.
        </p>

        <div className="mt-8 space-y-2 max-w-xs mx-auto text-left text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Evaluating B2 fluency & response pacing</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Identifying grammar and lexical improvements</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Constructing model STAR answers</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fadeIn">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto mb-4">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-slate-800">Report Generation Error</h3>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              fetchAttempted.current = false;
              setLoading(true);
              setError(null);
            }}
            className="btn btn-primary text-sm py-2 px-4"
          >
            Retry Analysis
          </button>
          <button
            type="button"
            onClick={onNewInterview}
            className="btn btn-secondary text-sm py-2 px-4"
          >
            New Practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Report Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{jobInfo.icon}</span>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {jobInfo.label} Performance Report
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Style: {diffInfo.label}
            </span>
            <span>•</span>
            <span>Target: CEFR B2 English</span>
            <span>•</span>
            <span>{new Date(endedAt || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualSave}
            disabled={saved}
            className={`btn text-xs py-2 px-3.5 border transition-all ${
              saved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{saved ? '✓ Saved' : '💾 Save Report'}</span>
          </button>

          <button
            type="button"
            onClick={onNewInterview}
            className="btn btn-primary text-xs py-2 px-4 font-semibold shadow-xs"
          >
            <span>🔄 Practice Again</span>
          </button>
        </div>
      </div>

      {/* Disclaimers & Methodology Note */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed flex items-start gap-2.5">
        <span className="text-base">ℹ️</span>
        <div>
          <span className="font-bold">Assessment Methodology Note: </span>
          Scores are estimated from your spoken transcript. Speech recognition may correct some of your
          grammar mistakes automatically and doesn't capture pauses or fillers, so fluency and grammar
          scores are approximate benchmarks to guide your practice.
        </div>
      </div>

      {/* Score Overview: Ring + Category Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {/* Overall Ring */}
        <div className="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-200">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Overall Score
          </span>
          <ScoreRing score={feedback?.overallScore ?? 75} />
          <p className="text-xs text-slate-500 text-center mt-3 max-w-[200px] leading-relaxed">
            Based on customer service empathy, structured responses, and B2 language usage.
          </p>
        </div>

        {/* Category Breakdown */}
        <div className="md:col-span-2">
          <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
            <span>📊</span>
            <span>Skill Breakdown (1 – 10)</span>
          </h3>
          <CategoryScores
            scores={feedback?.categoryScores}
            feedback={feedback?.categoryFeedback}
          />
        </div>
      </div>

      {/* Section: Top Mistakes & Corrections */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>🔍</span>
            <span>Language Accuracy & Corrections</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key grammar and vocabulary adjustments identified from your answers.
          </p>
        </div>
        <MistakesTable mistakes={feedback?.mistakes} />
      </section>

      {/* Section: Better Customer Service Expressions */}
      {feedback?.betterPhrases?.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>💬</span>
              <span>Polite & De-escalation Phrases to Use</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-impact customer service phrases that elevate empathy and professionalism.
            </p>
          </div>
          <BetterPhrases phrases={feedback?.betterPhrases} />
        </section>
      )}

      {/* Section: Model STAR Answers */}
      {feedback?.starExamples?.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>⭐</span>
              <span>STAR Method Answer Upgrades</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              How to turn your answers into structured Situation, Task, Action, Result narratives.
            </p>
          </div>
          <StarExamples examples={feedback?.starExamples} />
        </section>
      )}

      {/* Section: 3 Concrete Things to Practice Next */}
      {feedback?.practiceNext?.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🎯</span>
              <span>Next Steps for Your Practice</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Three concrete focus areas to work on before your next mock interview.
            </p>
          </div>
          <NextSteps steps={feedback?.practiceNext} />
        </section>
      )}

      {/* Collapsible Full Transcript */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <button
          type="button"
          onClick={() => setShowFullTranscript(!showFullTranscript)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span>📝</span>
            <span className="font-bold text-slate-800 text-sm">Full Session Transcript</span>
            <span className="text-xs text-slate-400 font-semibold">
              ({transcript?.length || 0} turns)
            </span>
          </div>
          <span className="text-xs text-blue-600 font-bold hover:underline">
            {showFullTranscript ? 'Hide ▲' : 'View ▼'}
          </span>
        </button>

        {showFullTranscript && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 max-h-96 overflow-y-auto pr-2">
            {transcript?.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'ai'
                    ? 'bg-slate-50 border border-slate-200 text-slate-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-900'
                }`}
              >
                <div className="font-bold mb-1 opacity-70 flex items-center justify-between">
                  <span>{msg.role === 'ai' ? '🤖 Alex' : '👤 You'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12">
        <button
          type="button"
          onClick={onViewHistory}
          className="btn btn-secondary text-sm py-3 px-6 w-full sm:w-auto font-semibold"
        >
          <span>📂</span>
          <span>View Past Practice Sessions</span>
        </button>

        <button
          type="button"
          onClick={onNewInterview}
          className="btn btn-primary text-sm py-3 px-8 w-full sm:w-auto font-bold shadow-md"
        >
          <span>🎙️</span>
          <span>Start New Interview</span>
        </button>
      </div>
    </div>
  );
}
