import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IS_DEMO_MODE } from '../firebase/config';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  // In demo mode, allow access if user is set (demo login sets a fake user object)
  if (!user && !IS_DEMO_MODE) return <Navigate to="/" replace />;
  if (!user) return <Navigate to="/" replace />;
  return children;
}
