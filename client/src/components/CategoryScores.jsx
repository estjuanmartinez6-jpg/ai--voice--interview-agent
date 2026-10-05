export default function CategoryScores({ scores = {}, feedback = {} }) {
  const categories = [
    {
      key: 'fluency',
      label: 'Fluency & Pacing',
      icon: '🌊',
      desc: 'Speech flow, hesitation, and natural conversational cadence',
    },
    {
      key: 'grammar',
      label: 'Grammar & Accuracy',
      icon: '📐',
      desc: 'Tenses, sentence formation, subject-verb agreement',
    },
    {
      key: 'vocabulary',
      label: 'Professional Vocabulary',
      icon: '📚',
      desc: 'Customer service terms, precision, and phrase variety',
    },
    {
      key: 'answerStructure',
      label: 'Answer Structure',
      icon: '🏗️',
      desc: 'Clarity, conciseness, and use of STAR structure',
    },
    {
      key: 'customerServiceTone',
      label: 'Customer Service Tone',
      icon: '🤝',
      desc: 'Empathy, politeness, de-escalation, and helpfulness',
    },
  ];

  const getBarColor = (score) => {
    if (score >= 8) return 'bg-emerald-500';
    if (score >= 6) return 'bg-blue-600';
    if (score >= 4) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const score = scores[cat.key] ?? 7;
        const note = feedback[cat.key] || '';
        const pct = Math.max(0, Math.min(100, (score / 10) * 100));

        return (
          <div key={cat.key} className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <span className="font-bold text-slate-800 text-sm">{cat.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-extrabold text-slate-800 text-base">{score}</span>
                <span className="text-xs text-slate-400 font-semibold">/10</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(
                  score
                )}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Explanation Note */}
            {note && <p className="text-xs text-slate-600 leading-relaxed">{note}</p>}
          </div>
        );
      })}
    </div>
  );
}
