export default function MistakesTable({ mistakes = [] }) {
  if (!mistakes || mistakes.length === 0) {
    return (
      <div className="p-6 text-center bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
        <span className="text-2xl">🎉</span>
        <h4 className="font-bold text-sm mt-1">Excellent Language Accuracy!</h4>
        <p className="text-xs text-emerald-700 mt-0.5">
          No significant grammatical or lexical errors were detected in your spoken responses.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">What You Said</th>
              <th className="py-3 px-4">Corrected Version</th>
              <th className="py-3 px-4">Explanation & Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {mistakes.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                {/* Original Quote */}
                <td className="py-3.5 px-4 align-top">
                  <div className="text-red-700 font-medium text-xs sm:text-sm bg-red-50 p-2 rounded-lg border border-red-100">
                    "{item.original}"
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-3xs font-bold rounded-full ${
                      item.type === 'vocabulary'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {item.type || 'Grammar'}
                  </span>
                </td>

                {/* Corrected version */}
                <td className="py-3.5 px-4 align-top">
                  <div className="text-emerald-800 font-semibold text-xs sm:text-sm bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    "{item.corrected}"
                  </div>
                </td>

                {/* Explanation */}
                <td className="py-3.5 px-4 align-top text-xs text-slate-600 leading-relaxed">
                  {item.explanation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
