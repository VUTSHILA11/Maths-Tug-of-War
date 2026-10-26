// =============================================
// SESSION DATA DELETION
// Removes a teacher-owned session and its associated database history.
// =============================================
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { get, ref, remove } from 'firebase/database';
import { db, rtdb } from '../firebase/config';

async function deleteDocuments(references) {
  for (let index = 0; index < references.length; index += 500) {
    const batch = writeBatch(db);
    references.slice(index, index + 500).forEach((documentRef) => batch.delete(documentRef));
    await batch.commit();
  }
}

export async function deleteSessionData(sessionId, teacherId) {
  if (!sessionId || !teacherId) {
    throw new Error('A session and authenticated teacher are required.');
  }

  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnapshot = await getDoc(sessionRef);
  if (!sessionSnapshot.exists() || sessionSnapshot.data().teacherId !== teacherId) {
    throw new Error('This session does not exist or does not belong to your account.');
  }

  const liveSessionRef = ref(rtdb, `sessions/${sessionId}`);
  const liveSessionSnapshot = await get(liveSessionRef);
  if (liveSessionSnapshot.exists() && liveSessionSnapshot.val().teacherId !== teacherId) {
    throw new Error('The live session does not belong to your account.');
  }

  const [participantSnapshot, questionSnapshot] = await Promise.all([
    getDocs(collection(db, 'sessions', sessionId, 'participants')),
    getDocs(query(
      collection(db, 'questionHistory'),
      where('teacherId', '==', teacherId),
      where('sessionId', '==', sessionId)
    )),
  ]);

  const responseSnapshots = await Promise.all(questionSnapshot.docs.map((questionDocument) =>
    getDocs(query(
      collection(db, 'questionHistory', questionDocument.id, 'responses'),
      where('teacherId', '==', teacherId)
    ))
  ));

  if (liveSessionSnapshot.exists()) {
    await remove(liveSessionRef);
  }

  const responseReferences = responseSnapshots.flatMap((snapshot) =>
    snapshot.docs.map((responseDocument) => responseDocument.ref)
  );
  await deleteDocuments(responseReferences);
  await deleteDocuments(questionSnapshot.docs.map((questionDocument) => questionDocument.ref));
  await deleteDocuments(participantSnapshot.docs.map((participantDocument) => participantDocument.ref));
  await deleteDoc(sessionRef);
}
