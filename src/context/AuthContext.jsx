// =============================================
// AUTHENTICATION CONTEXT
// Shares teacher sign-in state and login/logout actions across the app.
// =============================================
import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, IS_DEMO_MODE } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO_MODE) {
      // In demo mode, skip Firebase auth listener
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    if (IS_DEMO_MODE) {
      // Demo mode: accept any credentials
      setUser({ email, uid: 'demo-teacher-uid' });
      return;
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (IS_DEMO_MODE) {
      setUser(null);
      return;
    }
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
