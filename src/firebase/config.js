// =============================================
// FIREBASE CONFIG
// Paste your values from:
// Firebase Console → Project Settings → General → Your apps
// =============================================
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCybKxRrv2-izwUIFwIRN0UmgOORThqyP8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "math-tug-of-war-1c242.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://math-tug-of-war-1c242-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "math-tug-of-war-1c242",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "math-tug-of-war-1c242.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123079106190",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123079106190:web:0ea2af6e70e5715def33df"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Demo mode is active only when no real values have been pasted in yet
export const IS_DEMO_MODE = firebaseConfig.apiKey.startsWith('PASTE_');

export default app;


