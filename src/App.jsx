import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import TeacherDashboard from './pages/TeacherDashboard';
import Lobby from './pages/Lobby';
import GameScreen from './pages/GameScreen';
import Results from './pages/Results';
import Analytics from './pages/Analytics';
import Mistakes from './pages/Mistakes';
import CorrectAnswers from './pages/CorrectAnswers';

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/results" element={<Results />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/correct-answers" element={<CorrectAnswers />} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}
