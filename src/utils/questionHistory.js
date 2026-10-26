// =============================================
// QUESTION HISTORY DATA
// Records question activity and answers, and queries paginated teacher history.
// =============================================
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, studentAuth, studentDb, IS_DEMO_MODE } from '../firebase/config';

export const QUESTION_HISTORY_PAGE_SIZE = 25;

function queryTokens(search) {
  return [...new Set(
    (search || '')
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  )].slice(0, 30);
}

function pageResult(snapshot) {
  return {
    lastDocument: snapshot.docs.at(-1) || null,
    hasMore: snapshot.size === QUESTION_HISTORY_PAGE_SIZE,
  };
}

function historyDocumentId(sessionId, questionIndex) {
  return `${sessionId}_${questionIndex}`;
}

export async function recordQuestionOccurrence(sessionId, session, questionIndex, question) {
  if (!sessionId || !session?.teacherId || !question?.questionText) {
    throw new Error('A session, teacher, and question are required to record question history.');
  }
  if (IS_DEMO_MODE) return;
  const occurrenceRef = doc(db, 'questionHistory', historyDocumentId(sessionId, questionIndex));
  const occurrence = {
    teacherId: session.teacherId,
    sessionId,
    sessionCode: session.code || sessionId,
    className: session.className || '',
    gradeLevel: session.gradeLevel ?? null,
    questionMode: session.questionMode || '',
    teamNames: session.teamNames || ['Team A', 'Team B'],
    questionIndex,
    questionId: question.id || null,
    questionText: question.questionText,
    topic: question.topic || question.operation || '',
    searchTerms: queryTokens(`${question.questionText} ${question.topic || ''} ${session.className || ''}`),
    presentedAt: Date.now(),
  };

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(occurrenceRef);
    if (!snapshot.exists()) {
      transaction.set(occurrenceRef, {
        ...occurrence,
        askedAt: serverTimestamp(),
      });
    }
  });
}

export async function recordPlayerQuestionAnswer({
  sessionId,
  playerId,
  questionIndex,
  playerName,
  team,
  answer,
  isCorrect,
  sessionCode,
  teacherId,
  playerNameLower,
  questionText,
  topic,
}) {
  if (!sessionId || !playerId) return;
  if (IS_DEMO_MODE) return;
  if (!studentAuth.currentUser || playerId !== studentAuth.currentUser.uid) {
    throw new Error('The authenticated student is required to save a question response.');
  }

  const response = {
    playerId,
    playerName: playerName || 'Student',
    team: team || '',
    answer: answer || '',
    isCorrect: isCorrect ?? null,
    answeredAt: Date.now(),
    sessionId,
    sessionCode: sessionCode || sessionId,
    studentId: playerId,
    playerNameLower: playerNameLower || (playerName || 'Student').toLocaleLowerCase(),
    questionText: questionText || '',
    topic: topic || '',
    questionSearchTerms: queryTokens(`${questionText || ''} ${topic || ''}`),
    teacherId,
  };

  const responseRef = doc(
    studentDb,
    'questionHistory',
    historyDocumentId(sessionId, questionIndex),
    'responses',
    playerId
  );
  const retryDelays = [0, 300, 900];
  let lastError;
  for (const delay of retryDelays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await setDoc(responseRef, response);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function getQuestionHistoryPage(teacherId, filters = {}, cursor = null) {
  if (!teacherId) throw new Error('A teacher account is required to load question history.');

  if (filters.studentId || filters.studentSearch || filters.team) {
    const responseConstraints = [
      where('teacherId', '==', teacherId),
    ];
    if (filters.studentId) responseConstraints.push(where('studentId', '==', filters.studentId));
    if (filters.studentSearch) {
      const studentName = filters.studentSearch.trim().toLocaleLowerCase();
      responseConstraints.push(where('playerNameLower', '==', studentName));
    }
    if (filters.team) responseConstraints.push(where('team', '==', filters.team));
    if (filters.sessionId) responseConstraints.push(where('sessionId', '==', filters.sessionId));
    if (filters.topic) responseConstraints.push(where('topic', '==', filters.topic));
    if (filters.search && queryTokens(filters.search).length) {
      responseConstraints.push(where('questionSearchTerms', 'array-contains-any', queryTokens(filters.search)));
    }
    if (filters.search && !queryTokens(filters.search).length) {
      return { occurrences: [], sessions: {}, lastDocument: null, hasMore: false };
    }
    if (filters.fromDate !== undefined) responseConstraints.push(where('answeredAt', '>=', filters.fromDate));
    if (filters.toDate !== undefined) responseConstraints.push(where('answeredAt', '<=', filters.toDate));
    responseConstraints.push(orderBy('answeredAt', 'desc'));
    if (cursor) responseConstraints.push(startAfter(cursor));
    responseConstraints.push(limit(QUESTION_HISTORY_PAGE_SIZE));

    const responsePage = await getDocs(query(collectionGroup(db, 'responses'), ...responseConstraints));
    const occurrences = await Promise.all(responsePage.docs.map(async (responseDoc) => {
      const parent = responseDoc.ref.parent.parent;
      if (!parent) return null;
      const occurrenceSnapshot = await getDoc(parent);
      if (!occurrenceSnapshot.exists()) return null;
      return {
        id: occurrenceSnapshot.id,
        ...occurrenceSnapshot.data(),
        responses: { [responseDoc.id]: responseDoc.data() },
      };
    }));
    const validOccurrences = occurrences.filter(Boolean);
    const sessionIds = [...new Set(validOccurrences.map((occurrence) => occurrence.sessionId).filter(Boolean))];
    const sessionSnapshots = await Promise.all(
      sessionIds.map((sessionId) => getDoc(doc(db, 'sessions', sessionId)))
    );
    return {
      occurrences: validOccurrences,
      sessions: Object.fromEntries(sessionSnapshots
        .filter((sessionSnapshot) => sessionSnapshot.exists())
        .map((sessionSnapshot) => [sessionSnapshot.id, sessionSnapshot.data()])),
      ...pageResult(responsePage),
    };
  }

  const constraints = [
    where('teacherId', '==', teacherId),
    orderBy('askedAt', 'desc'),
    ...(filters.sessionId ? [where('sessionId', '==', filters.sessionId)] : []),
    ...(filters.topic ? [where('topic', '==', filters.topic)] : []),
    ...(filters.fromDate !== undefined
      ? [where('askedAt', '>=', Timestamp.fromMillis(filters.fromDate))]
      : []),
    ...(filters.toDate !== undefined
      ? [where('askedAt', '<=', Timestamp.fromMillis(filters.toDate))]
      : []),
    ...(filters.search && queryTokens(filters.search).length
      ? [where('searchTerms', 'array-contains-any', queryTokens(filters.search))]
      : []),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(QUESTION_HISTORY_PAGE_SIZE),
  ];
  if (filters.search && !queryTokens(filters.search).length) {
    return { occurrences: [], sessions: {}, lastDocument: null, hasMore: false };
  }
  const historySnapshot = await getDocs(query(collection(db, 'questionHistory'), ...constraints));
  const occurrences = await Promise.all(historySnapshot.docs.map(async (historyDoc) => {
    const responseSnapshot = await getDocs(query(
      collection(db, 'questionHistory', historyDoc.id, 'responses'),
      where('teacherId', '==', teacherId)
    ));
    return {
      id: historyDoc.id,
      ...historyDoc.data(),
      responses: Object.fromEntries(responseSnapshot.docs.map((responseDoc) => [
        responseDoc.id,
        responseDoc.data(),
      ])),
    };
  }));
  const sessionIds = [...new Set(occurrences.map((occurrence) => occurrence.sessionId).filter(Boolean))];
  const sessionSnapshots = await Promise.all(
    sessionIds.map((sessionId) => getDoc(doc(db, 'sessions', sessionId)))
  );
  const sessions = Object.fromEntries(
    sessionSnapshots
      .filter((sessionSnapshot) => sessionSnapshot.exists())
      .map((sessionSnapshot) => [sessionSnapshot.id, sessionSnapshot.data()])
  );

  return {
    occurrences,
    sessions,
    ...pageResult(historySnapshot),
  };
}
