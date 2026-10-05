export default function MicIndicator({ status, isMuted, isSpeaking }) {
  // Determine primary display mode
  let mode = 'idle';
  if (isMuted) {
    mode = 'muted';
  } else if (isSpeaking) {
    mode = 'speaking';
  } else if (status === 'thinking') {
    mode = 'thinking';
  } else if (status === 'listening') {
    mode = 'listening';
  } else if (status === 'paused') {
    mode = 'paused';
  }

  const configs = {
    listening: {
      color: 'bg-emerald-500',
      ringColor: 'bg-emerald-400',
      text: 'Listening to you…',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: '🎙️',
      pulse: true,
    },
    thinking: {
      color: 'bg-blue-500',
      ringColor: 'bg-blue-400',
      text: 'Alex is thinking…',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: '🧠',
      pulse: true,
    },
    speaking: {
      color: 'bg-indigo-600',
      ringColor: 'bg-indigo-400',
      text: 'Alex is speaking…',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: '🔊',
      pulse: true,
    },
    paused: {
      color: 'bg-amber-500',
      ringColor: 'bg-amber-300',
      text: 'Mic paused (listening for AI)',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: '⏸️',
      pulse: false,
    },
    muted: {
      color: 'bg-red-500',
      ringColor: 'bg-red-300',
      text: 'Microphone Muted',
      badge: 'bg-red-50 text-red-700 border-red-200',
      icon: '🔇',
      pulse: false,
    },
    idle: {
      color: 'bg-slate-400',
      ringColor: 'bg-slate-300',
      text: 'Ready',
      badge: 'bg-slate-50 text-slate-600 border-slate-200',
      icon: '🎙️',
      pulse: false,
    },
  };

  const current = configs[mode] || configs.idle;

  return (
    <div className="flex flex-col items-center justify-center p-3">
      {/* Animated Orb container */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Pulsing Outer Rings */}
        {current.pulse && (
          <>
            <div
              className={`absolute w-full h-full rounded-full ${current.ringColor} opacity-25 animate-ping`}
            />
            <div
              className={`absolute w-16 h-16 rounded-full ${current.ringColor} opacity-40 mic-ring`}
            />
          </>
        )}

        {/* Core circle */}
        <div
          className={`w-14 h-14 rounded-full ${current.color} text-white flex items-center justify-center text-2xl shadow-md transition-all duration-300 z-10`}
        >
          {current.icon}
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 shadow-2xs transition-colors duration-200 ${current.badge}`}
      >
        <span
          className={`w-2 h-2 rounded-full ${current.color} ${current.pulse ? 'animate-pulse' : ''}`}
        />
        <span>{current.text}</span>
      </div>
    </div>
  );
}
