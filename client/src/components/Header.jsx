export default function Header({ currentScreen, onNavigate, sessionCount = 0 }) {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and App Title */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onNavigate('setup')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-lg leading-tight tracking-tight">
                InterviewReady
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                CEFR B2
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal">Customer Service Voice Practice</p>
          </div>
        </div>

        {/* Right side navigation actions */}
        <div className="flex items-center gap-2">
          {currentScreen !== 'setup' && currentScreen !== 'interview' && (
            <button
              onClick={() => onNavigate('setup')}
              className="btn btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>➕</span>
              <span>New Practice</span>
            </button>
          )}

          {currentScreen !== 'history' && (
            <button
              onClick={() => onNavigate('history')}
              className="btn btn-secondary text-sm py-1.5 px-3.5 flex items-center gap-1.5 text-slate-700"
            >
              <span>📂</span>
              <span>Past Sessions</span>
              {sessionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-700 font-semibold rounded-full text-xs">
                  {sessionCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
