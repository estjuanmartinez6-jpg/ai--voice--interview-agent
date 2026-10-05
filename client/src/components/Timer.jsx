export default function Timer({ formatted, secondsLeft, totalSeconds }) {
  // Alert styles when time is getting low
  let colorStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  if (secondsLeft <= 60) {
    colorStyle = 'bg-red-50 text-red-700 border-red-200 animate-pulse';
  } else if (secondsLeft <= 180) {
    colorStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  // Progress fraction
  const pct = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return (
    <div className="flex items-center gap-2">
      <div
        className={`px-3 py-1.5 rounded-lg border font-mono font-bold text-sm flex items-center gap-1.5 ${colorStyle}`}
      >
        <span>⏱️</span>
        <span>{formatted}</span>
      </div>
    </div>
  );
}
