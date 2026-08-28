import { ref, set, get, update } from 'firebase/database';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { rtdb, db, IS_DEMO_MODE } from '../firebase/config';
import { generateQuestionSet, difficultyFromGrade } from './questions';

// In-memory session store (shared with GameContext via window)
if (!window.__demoSessions) window.__demoSessions = {};

// Generate a readable 6-char session code
export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Create a new game session (called by teacher)
export async function createSession({ teacherId, className, gradeLevel, teamNames = ['Team A', 'Team B'], questionTime = 20, questionCount = 15, questionMode = 'practice' }) {
  const code = generateSessionCode();
  const difficulty = difficultyFromGrade(gradeLevel);
  const questions = generateQuestionSet(difficulty, Number(questionCount), questionMode);

  const sessionData = {
    code,
    teacherId,
    className,
    gradeLevel,
    difficulty,
    questionCount: Number(questionCount),
    questionMode,
    teamNames,
    questionTime: Number(questionTime),
    status: 'lobby',
    createdAt: Date.now(),
    currentQuestionIndex: 0,
    questions,
    scores: { teamA: 0, teamB: 0 },
    ropePosition: 50,
    players: {},
    teamACount: 0,
    teamBCount: 0,
    timeLeft: 20,
    questionActive: false,
  };

  if (IS_DEMO_MODE) {
    window.__demoSessions[code] = sessionData;
    return code;
  }

  // Live Firebase path
  await set(ref(rtdb, `sessions/${code}`), sessionData);

  await setDoc(doc(db, 'sessions', code), {
    code,
    teacherId,
    className,
    gradeLevel,
    difficulty,
    questionCount: Number(questionCount),
    questionMode,
    teamNames,
    createdAt: serverTimestamp(),
    status: 'lobby',
  });

  return code;
}

// Join a session as a student
export async function joinSession({ sessionCode, studentName, team }) {
  if (IS_DEMO_MODE) {
    const session = window.__demoSessions[sessionCode];
    if (!session) throw new Error('Session not found. Check your code.');
    if (session.status === 'ended') throw new Error('This session has already ended.');

    const playerId = `${studentName.replace(/\s/g, '_')}_${Date.now()}`;
    session.players = session.players || {};
    session.players[playerId] = {
      name: studentName,
      team,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      joinedAt: Date.now(),
      isActive: true,
    };
    const countKey = team === 'A' ? 'teamACount' : 'teamBCount';
    session[countKey] = (session[countKey] || 0) + 1;
    return { playerId, session };
  }

  const sessionRef = ref(rtdb, `sessions/${sessionCode}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) throw new Error('Session not found. Check your code.');

  const session = snap.val();
  if (session.status === 'ended') throw new Error('This session has already ended.');

  const playerId = `${studentName.replace(/\s/g, '_')}_${Date.now()}`;

  await update(ref(rtdb, `sessions/${sessionCode}/players/${playerId}`), {
    name: studentName,
    team,
    score: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    joinedAt: Date.now(),
    isActive: true,
  });

  const countKey = team === 'A' ? 'teamACount' : 'teamBCount';
  await update(ref(rtdb, `sessions/${sessionCode}`), {
    [countKey]: (session[countKey] || 0) + 1,
  });

  return { playerId, session };
}

// Save session results to Firestore after game ends
export async function saveSessionResults(sessionCode, sessionData) {
  if (IS_DEMO_MODE) return; // nothing to persist in demo
  try {
    await setDoc(doc(db, 'sessions', sessionCode), {
      ...sessionData,
      status: 'ended',
      endedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save session results:', err);
  }
}
