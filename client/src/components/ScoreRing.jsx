export default function ScoreRing({ score = 0, size = 140, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const validScore = Math.max(0, Math.min(100, Math.round(score)));
  const offset = circumference - (validScore / 100) * circumference;

  let color = '#2563eb'; // blue
  let textColor = 'text-blue-600';
  let badgeText = 'Proficient';
  let badgeBg = 'bg-blue-100 text-blue-800';

  if (validScore >= 80) {
    color = '#059669'; // emerald
    textColor = 'text-emerald-600';
    badgeText = 'Excellent B2';
    badgeBg = 'bg-emerald-100 text-emerald-800';
  } else if (validScore >= 65) {
    color = '#2563eb'; // blue
    textColor = 'text-blue-600';
    badgeText = 'Solid B2';
    badgeBg = 'bg-blue-100 text-blue-800';
  } else if (validScore >= 50) {
    color = '#d97706'; // amber
    textColor = 'text-amber-600';
    badgeText = 'Developing';
    badgeBg = 'bg-amber-100 text-amber-800';
  } else {
    color = '#dc2626'; // red
    textColor = 'text-red-600';
    badgeText = 'Needs Practice';
    badgeBg = 'bg-red-100 text-red-800';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`text-3xl sm:text-4xl font-black tracking-tight ${textColor}`}>
            {validScore}
          </span>
          <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            / 100
          </span>
        </div>
      </div>

      <div className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeBg}`}>
        {badgeText}
      </div>
    </div>
  );
}
