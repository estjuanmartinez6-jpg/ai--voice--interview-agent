import { useState } from 'react';

export default function StarExamples({ examples = [] }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!examples || examples.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Question tabs if multiple */}
      {examples.length > 1 && (
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {examples.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === idx
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Example #{idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Selected Example Card */}
      {examples[activeTab] && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          {/* Question */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
            <span className="text-3xs font-extrabold text-blue-800 uppercase tracking-wider block mb-1">
              Interview Question
            </span>
            <p className="font-bold text-slate-800 text-sm">
              "{examples[activeTab].question}"
            </p>
          </div>

          {/* Candidate original answer summary */}
          {examples[activeTab].candidateAnswer && (
            <div className="px-1">
              <span className="text-xs font-semibold text-slate-500">Your Answer Summary:</span>
              <p className="text-xs text-slate-700 italic mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                "{examples[activeTab].candidateAnswer}"
              </p>
            </div>
          )}

          {/* Stronger STAR breakdown */}
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <span>⭐</span>
              <span>Model STAR Response</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Situation */}
              <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-blue-500">
                <span className="text-3xs font-bold text-blue-700 uppercase tracking-wider block">
                  [S] Situation
                </span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {examples[activeTab].strongerAnswer?.situation || '—'}
                </p>
              </div>

              {/* Task */}
              <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-indigo-500">
                <span className="text-3xs font-bold text-indigo-700 uppercase tracking-wider block">
                  [T] Task
                </span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {examples[activeTab].strongerAnswer?.task || '—'}
                </p>
              </div>

              {/* Action */}
              <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-emerald-500">
                <span className="text-3xs font-bold text-emerald-700 uppercase tracking-wider block">
                  [A] Action (What you did)
                </span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {examples[activeTab].strongerAnswer?.action || '—'}
                </p>
              </div>

              {/* Result */}
              <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-amber-500">
                <span className="text-3xs font-bold text-amber-700 uppercase tracking-wider block">
                  [R] Result (Positive outcome)
                </span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {examples[activeTab].strongerAnswer?.result || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
