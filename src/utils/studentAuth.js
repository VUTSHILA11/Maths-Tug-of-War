import { signInAnonymously } from 'firebase/auth';
import { IS_DEMO_MODE, studentAuth } from '../firebase/config';

export async function ensureStudentAuthentication() {
  if (IS_DEMO_MODE) return null;
  if (studentAuth.currentUser) return studentAuth.currentUser;
  const credential = await signInAnonymously(studentAuth);
  return credential.user;
}
