import { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import InterviewScreen from './components/InterviewScreen.jsx';
import FeedbackScreen from './components/FeedbackScreen.jsx';
import PastSessions from './components/PastSessions.jsx';
import VoiceLoopTest from './components/VoiceLoopTest.jsx';
import { getSavedSessions } from './lib/storage.js';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('setup'); // setup | interview | feedback | history | test
  const [activeConfig, setActiveConfig] = useState({
    jobType: 'call-center',
    difficulty: 'standard',
    sessionLength: 10,
  });
  const [activeSession, setActiveSession] = useState(null);
  const [savedCount, setSavedCount] = useState(0);

  // Sync saved sessions count
  const refreshSavedCount = () => {
    const list = getSavedSessions();
    setSavedCount(list.length);
  };

  useEffect(() => {
    refreshSavedCount();
  }, [currentScreen]);

  // ── Navigation Handlers ────────────────────────────────────────────────
  const handleStartInterview = (config) => {
    setActiveConfig(config);
    setCurrentScreen('interview');
  };

  const handleFinishInterview = ({ config, transcript, endedAt }) => {
    const sessionData = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      config,
      transcript,
      endedAt,
      feedback: null, // FeedbackScreen will fetch & auto-save this
    };
    setActiveSession(sessionData);
    setCurrentScreen('feedback');
  };

  const handleSelectPastSession = (session) => {
    setActiveSession(session);
    setCurrentScreen('feedback');
  };

  const handleNewInterview = () => {
    setActiveSession(null);
    setCurrentScreen('setup');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Universal App Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        sessionCount={savedCount}
      />

      {/* Screen Router */}
      <main className="flex-1">
        {currentScreen === 'setup' && (
          <SetupScreen
            onStartInterview={handleStartInterview}
            onViewHistory={() => setCurrentScreen('history')}
            savedCount={savedCount}
          />
        )}

        {currentScreen === 'interview' && (
          <InterviewScreen
            config={activeConfig}
            onFinishInterview={handleFinishInterview}
          />
        )}

        {currentScreen === 'feedback' && activeSession && (
          <FeedbackScreen
            sessionData={activeSession}
            onNewInterview={handleNewInterview}
            onViewHistory={() => setCurrentScreen('history')}
          />
        )}

        {currentScreen === 'history' && (
          <PastSessions
            onSelectSession={handleSelectPastSession}
            onNewInterview={handleNewInterview}
          />
        )}

        {currentScreen === 'test' && (
          <div className="p-4">
            <button
              onClick={() => setCurrentScreen('setup')}
              className="btn btn-secondary text-xs mb-4"
            >
              ← Back to App
            </button>
            <VoiceLoopTest />
          </div>
        )}
      </main>

      {/* Footer */}
      {currentScreen !== 'interview' && (
        <footer className="w-full border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>InterviewReady · CEFR B2 Spoken English for Customer Service</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentScreen('test')}
                className="hover:text-blue-600 underline font-medium"
              >
                Diagnostic Voice Loop Test 🛠️
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setCurrentScreen('history')}
                className="hover:text-blue-600 underline font-medium"
              >
                Saved History ({savedCount})
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
