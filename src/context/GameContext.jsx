// =============================================
// GAME SESSION CONTEXT
// Shares the active player and session, syncing live or demo game data.
// =============================================
import { createContext, useContext, useEffect, useState } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { rtdb, studentRtdb, IS_DEMO_MODE } from '../firebase/config';
import { ensureStudentAuthentication } from '../utils/studentAuth';

const GameContext = createContext(null);

// In-memory store for demo mode (lives outside component so it persists)
const demoSessions = {};

export function GameProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('math-tug-of-war-session') || null);
  const [player, setPlayer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('math-tug-of-war-player') || 'null');
    } catch {
      return null;
    }
  }); // { name, team, role: 'teacher'|'student' }

  // Subscribe to a live session
  useEffect(() => {
    if (!sessionId) return;

    if (IS_DEMO_MODE) {
      setSession(demoSessions[sessionId] ? { ...demoSessions[sessionId] } : null);

      // Listen for demo updates triggered by game actions
      const handler = (e) => {
        if (e.detail?.sessionId === sessionId) {
          const s = window.__demoSessions?.[sessionId];
          if (s) {
            demoSessions[sessionId] = s;
            setSession({ ...s });
          }
        }
      };
      window.addEventListener('demo-session-update', handler);
      return () => window.removeEventListener('demo-session-update', handler);
    }

    let unsubscribe;
    let cancelled = false;
    async function subscribeToSession() {
      if (player?.role === 'student') await ensureStudentAuthentication();
      if (cancelled) return;
      const sessionDatabase = player?.role === 'student' ? studentRtdb : rtdb;
      const sessionRef = ref(sessionDatabase, `sessions/${sessionId}`);
      unsubscribe = onValue(sessionRef, (snap) => {
        if (snap.exists()) setSession(snap.val());
      }, (error) => {
        console.error('Could not subscribe to the live session:', error);
      });
    }
    subscribeToSession().catch((error) => {
      console.error('Could not authenticate student session:', error);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [sessionId, player?.role]);

  const joinSession = (id, playerInfo) => {
    setSessionId(id);
    setPlayer(playerInfo);
    localStorage.setItem('math-tug-of-war-session', id);
    localStorage.setItem('math-tug-of-war-player', JSON.stringify(playerInfo));
    if (IS_DEMO_MODE) {
      const s = window.__demoSessions?.[id] || demoSessions[id];
      if (s) {
        demoSessions[id] = s;
        setSession({ ...s });
      }
    }
  };

  const leaveSession = () => {
    setSessionId(null);
    setSession(null);
    setPlayer(null);
    localStorage.removeItem('math-tug-of-war-session');
    localStorage.removeItem('math-tug-of-war-player');
  };

  const updateSessionData = async (path, data) => {
    if (!sessionId) return;
    if (IS_DEMO_MODE) {
      const parts = path.split('/');
      const root = demoSessions[sessionId];
      if (!root) return;
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] || {};
        cur = cur[parts[i]];
      }
      const last = parts[parts.length - 1];
      cur[last] = typeof cur[last] === 'object' && cur[last] !== null
        ? { ...cur[last], ...data }
        : data;
      setSession({ ...demoSessions[sessionId] });
      return;
    }
    const sessionDatabase = player?.role === 'student' ? studentRtdb : rtdb;
    return update(ref(sessionDatabase, `sessions/${sessionId}/${path}`), data);
  };

  const setSessionData = async (path, data) => {
    if (!sessionId) return;
    if (IS_DEMO_MODE) {
      const parts = path.split('/');
      const root = demoSessions[sessionId];
      if (!root) return;
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] || {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = data;
      setSession({ ...demoSessions[sessionId] });
      return;
    }
    const sessionDatabase = player?.role === 'student' ? studentRtdb : rtdb;
    return set(ref(sessionDatabase, `sessions/${sessionId}/${path}`), data);
  };

  // Called during session creation in demo mode
  const registerDemoSession = (id, data) => {
    demoSessions[id] = data;
    window.__demoSessions = window.__demoSessions || {};
    window.__demoSessions[id] = data;
  };

  return (
    <GameContext.Provider
      value={{
        session,
        sessionId,
        player,
        joinSession,
        leaveSession,
        updateSessionData,
        setSessionData,
        registerDemoSession,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
