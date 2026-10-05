import { useState } from 'react';
import { getSavedSessions, deleteSavedSession } from '../lib/storage.js';
import { JOB_TYPES, DIFFICULTIES } from '../lib/constants.js';

export default function PastSessions({ onSelectSession, onNewInterview }) {
  const [sessions, setSessions] = useState(() => getSavedSessions());
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteSavedSession(id);
    setSessions(getSavedSessions());
    setDeleteConfirmId(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📂</span>
            <span>Past Interview Sessions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review past transcripts, overall scores, and practice feedback reports stored in your browser.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewInterview}
          className="btn btn-primary text-sm py-2 px-4 shrink-0 font-semibold shadow-xs"
        >
          <span>🎙️ New Interview</span>
        </button>
      </div>

      {/* Empty State */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-3">
            📁
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Practice Sessions Saved Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            Complete your first mock interview with Alex. Once you finish, your detailed feedback
            reports and transcripts will appear here.
          </p>
          <button
            type="button"
            onClick={onNewInterview}
            className="btn btn-primary text-sm py-2.5 px-6 mt-6 font-bold shadow-xs"
          >
            Start Your First Practice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {sessions.map((session) => {
            const job = JOB_TYPES.find((j) => j.id === session.config?.jobType) || JOB_TYPES[0];
            const diff =
              DIFFICULTIES.find((d) => d.id === session.config?.difficulty) || DIFFICULTIES[1];
            const score = session.feedback?.overallScore;
            const turns = session.transcript?.length || 0;
            const dateStr = session.endedAt
              ? new Date(session.endedAt).toLocaleDateString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent Session';

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left side: Job details */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                    {job.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
                        {job.label} Practice
                      </h3>
                      <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {diff.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{turns} conversation turns</span>
                      <span>•</span>
                      <span>{session.config?.sessionLength || 10} min</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Score badge & actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  {score != null && (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                          Score
                        </div>
                        <div
                          className={`font-black text-xl leading-none ${
                            score >= 80
                              ? 'text-emerald-600'
                              : score >= 65
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {score}
                          <span className="text-xs text-slate-400 font-normal">/100</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session);
                      }}
                      className="btn btn-secondary text-xs py-1.5 px-3 font-semibold"
                    >
                      View Report →
                    </button>

                    {deleteConfirmId === session.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(session.id, e)}
                          className="btn btn-danger text-xs py-1.5 px-2 font-bold"
                          title="Confirm delete"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="btn btn-ghost text-xs py-1.5 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(session.id);
                        }}
                        className="btn btn-ghost text-slate-400 hover:text-red-600 text-xs py-1.5 px-2"
                        title="Delete session"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
