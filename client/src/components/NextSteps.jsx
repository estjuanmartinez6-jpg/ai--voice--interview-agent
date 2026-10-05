export default function NextSteps({ steps = [] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className="flex items-start gap-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-100 rounded-xl p-3.5 shadow-2xs"
        >
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            {idx + 1}
          </div>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">{step}</p>
        </div>
      ))}
    </div>
  );
}
