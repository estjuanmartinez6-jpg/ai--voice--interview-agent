export default function BetterPhrases({ phrases = [] }) {
  if (!phrases || phrases.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {phrases.map((item, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Context: {item.context || 'Customer interaction'}
            </div>

            {/* Candidate phrase */}
            {item.candidateSaid && (
              <div className="mb-2">
                <span className="text-3xs font-semibold text-slate-500">Instead of: </span>
                <span className="text-xs text-slate-600 line-through italic">
                  "{item.candidateSaid}"
                </span>
              </div>
            )}

            {/* Better Phrase */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 mb-2">
              <span className="text-3xs font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                🌟 Try saying:
              </span>
              <p className="font-bold text-emerald-900 text-sm">
                "{item.betterPhrase}"
              </p>
            </div>
          </div>

          {/* Rationale */}
          {item.why && (
            <p className="text-xs text-slate-500 italic mt-1 leading-relaxed">
              💡 {item.why}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
