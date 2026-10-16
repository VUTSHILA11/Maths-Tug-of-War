import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const PARTICIPATION_PAGE_SIZE = 25;

export async function getSessionParticipantCount(sessionId) {
  if (!sessionId) return 0;
  const snapshot = await getCountFromServer(collection(db, 'sessions', sessionId, 'participants'));
  return snapshot.data().count;
}

export async function getParticipationPage(teacherId, filters = {}, cursor = null) {
  if (!teacherId) throw new Error('A teacher account is required to load participation history.');

  const constraints = [where('teacherId', '==', teacherId)];
  if (filters.sessionId) constraints.push(where('sessionId', '==', filters.sessionId));
  if (filters.studentId) constraints.push(where('studentId', '==', filters.studentId));
  if (filters.team) constraints.push(where('team', '==', filters.team));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.fromDate) constraints.push(where('joinedAt', '>=', filters.fromDate));
  if (filters.toDate) constraints.push(where('joinedAt', '<=', filters.toDate));
  if (filters.minScore !== '' && filters.minScore !== undefined) {
    constraints.push(where('score', '>=', Number(filters.minScore)));
  }
  if (filters.maxScore !== '' && filters.maxScore !== undefined) {
    constraints.push(where('score', '<=', Number(filters.maxScore)));
  }
  if (filters.studentSearch) {
    const search = filters.studentSearch.trim().toLocaleLowerCase();
    if (search) constraints.push(where('studentNameLower', '==', search));
  }
  constraints.push(orderBy('joinedAt', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(PARTICIPATION_PAGE_SIZE));

  const snapshot = await getDocs(query(collectionGroup(db, 'participants'), ...constraints));
  const records = snapshot.docs.map((participationDoc) => ({
    id: participationDoc.id,
    ...participationDoc.data(),
  }));
  const sessionIds = [...new Set(records.map((record) => record.sessionId).filter(Boolean))];
  const sessionSnapshots = await Promise.all(
    sessionIds.map((sessionId) => getDoc(doc(db, 'sessions', sessionId)))
  );
  const sessions = Object.fromEntries(
    sessionSnapshots
      .filter((sessionSnapshot) => sessionSnapshot.exists())
      .map((sessionSnapshot) => [sessionSnapshot.id, sessionSnapshot.data()])
  );

  return {
    records,
    sessions,
    lastDocument: snapshot.docs.at(-1) || null,
    hasMore: snapshot.size === PARTICIPATION_PAGE_SIZE,
  };
}
