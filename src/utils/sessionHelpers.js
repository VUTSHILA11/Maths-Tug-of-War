// =============================================
// SESSION HELPERS
// Creates and joins games, and persists session, participation, and result data.
// =============================================
import { ref, set, get, update, runTransaction as runRtdbTransaction } from 'firebase/database';
import {
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  rtdb,
  db,
  studentRtdb,
  IS_DEMO_MODE,
} from '../firebase/config';
import { generateQuestionSet, difficultyFromGrade } from './questions';
import { ensureStudentAuthentication } from './studentAuth';

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
    questions: questions.map((question) => ({
      questionText: question.questionText,
      topic: question.topic || question.operation || '',
    })),
    participantCount: 0,
  });

  return code;
}

// Join a session as a student
export async function joinSession({ sessionCode, studentName, team }) {
  const normalizedName = studentName?.trim();
  if (!normalizedName || normalizedName.length > 60 || !['A', 'B'].includes(team)) {
    throw new Error('Enter a name of 1-60 characters and select a valid team.');
  }

  if (IS_DEMO_MODE) {
    const session = window.__demoSessions[sessionCode];
    if (!session) throw new Error('Session not found. Check your code.');
    if (session.status === 'ended') throw new Error('This session has already ended.');

    const playerId = `${studentName.replace(/\s/g, '_')}_${Date.now()}`;
    session.players = session.players || {};
    session.players[playerId] = {
      name: normalizedName,
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

  const studentUser = await ensureStudentAuthentication();
  const playerId = studentUser.uid;
  const sessionRef = ref(studentRtdb, `sessions/${sessionCode}`);
  const snap = await get(sessionRef);
  if (!snap.exists()) throw new Error('Session not found. Check your code.');

  const session = snap.val();
  if (session.status === 'ended') throw new Error('This session has already ended.');

  const previousPlayer = session.players?.[playerId];
  const joinedAt = previousPlayer?.joinedAt || Date.now();
  await update(ref(studentRtdb, `sessions/${sessionCode}/players/${playerId}`), previousPlayer
    ? { name: normalizedName, team, isActive: true }
    : {
      name: normalizedName,
      team,
      score: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      joinedAt,
      isActive: true,
    });

  if (!previousPlayer || previousPlayer.team !== team) {
    if (previousPlayer?.team === 'A' || previousPlayer?.team === 'B') {
      const previousCountKey = previousPlayer.team === 'A' ? 'teamACount' : 'teamBCount';
      await runRtdbTransaction(
        ref(studentRtdb, `sessions/${sessionCode}/${previousCountKey}`),
        (count) => Math.max(0, (count || 0) - 1)
      );
    }
    const countKey = team === 'A' ? 'teamACount' : 'teamBCount';
    await runRtdbTransaction(
      ref(studentRtdb, `sessions/${sessionCode}/${countKey}`),
      (count) => (count || 0) + 1
    );
  }

  return { playerId, session };
}

export async function markSessionStarted(sessionCode, startedAt) {
  if (IS_DEMO_MODE) return;
  await updateDoc(doc(db, 'sessions', sessionCode), {
    status: 'active',
    startedAt,
  });
  const snapshot = await get(ref(rtdb, `sessions/${sessionCode}`));
  if (snapshot.exists()) {
    await syncSessionParticipants(
      sessionCode,
      { ...snapshot.val(), startedAt },
      'active'
    );
  }
}

async function syncSessionParticipants(sessionCode, sessionData, status, endedAt = null) {
  const players = Object.entries(sessionData.players || {});
  await Promise.all(players.map(([studentId]) =>
    saveStudentParticipation(sessionCode, sessionData, studentId, status, endedAt)
  ));
}

export async function saveStudentParticipation(sessionCode, sessionData, studentId, status = 'active', endedAt = null) {
  const teacherId = sessionData.teacherId;
  if (!teacherId || !studentId) throw new Error('Session owner and student are required to save participation history.');
  const player = sessionData.players?.[studentId];
  if (!player) return;
  const studentName = player.name || 'Student';
  const joinedAt = player.joinedAt || sessionData.startedAt || sessionData.createdAt || Date.now();
  const sessionRef = doc(db, 'sessions', sessionCode);
  const participantRef = doc(db, 'sessions', sessionCode, 'participants', studentId);
  const participantData = {
    teacherId,
    sessionId: sessionCode,
    sessionCode,
    sessionName: sessionData.className || '',
    studentId,
    name: studentName,
    studentNameLower: studentName.toLocaleLowerCase(),
    team: player.team || '',
    joinedAt,
    sessionStartedAt: sessionData.startedAt || null,
    status,
    score: player.score || 0,
    correctAnswers: player.correctAnswers || 0,
    totalAnswers: player.totalAnswers || 0,
    ...(endedAt ? { endedAt } : {}),
  };

  await runTransaction(db, async (transaction) => {
    const participantSnapshot = await transaction.get(participantRef);
    const sessionSnapshot = await transaction.get(sessionRef);
    transaction.set(participantRef, participantData, { merge: true });
    if (!participantSnapshot.exists()) {
      transaction.update(sessionRef, {
        participantCount: (sessionSnapshot.data()?.participantCount || 0) + 1,
      });
    }
  });
}

// Save session results to Firestore after game ends
export async function saveSessionResults(sessionCode, sessionData) {
  if (IS_DEMO_MODE) return; // nothing to persist in demo
  const endedAt = Date.now();
  await setDoc(doc(db, 'sessions', sessionCode), {
    ...sessionData,
    status: 'ended',
    endedAt: serverTimestamp(),
  }, { merge: true });

  await syncSessionParticipants(sessionCode, sessionData, 'completed', endedAt);
  await updateDoc(doc(db, 'sessions', sessionCode), {
    participantCount: Object.keys(sessionData.players || {}).length,
    endedAt: serverTimestamp(),
  });
}
