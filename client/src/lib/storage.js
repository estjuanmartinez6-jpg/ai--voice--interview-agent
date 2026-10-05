const STORAGE_KEY = 'interview_ready_sessions_v1';

/**
 * Get all saved sessions sorted newest first
 */
export function getSavedSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw);
    return Array.isArray(sessions) ? sessions : [];
  } catch (err) {
    console.error('Failed to load saved sessions from localStorage:', err);
    return [];
  }
}

/**
 * Save a session to localStorage
 */
export function saveSessionToStorage(session) {
  try {
    const sessions = getSavedSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...sessions];
      updated[existingIndex] = session;
    } else {
      updated = [session, ...sessions];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
    return false;
  }
}

/**
 * Get a single session by ID
 */
export function getSavedSessionById(id) {
  const sessions = getSavedSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Delete a session by ID
 */
export function deleteSavedSession(id) {
  try {
    const sessions = getSavedSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch (err) {
    console.error('Failed to delete session:', err);
    return false;
  }
}
