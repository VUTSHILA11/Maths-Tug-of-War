import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { joinSession } from '../utils/sessionHelpers';
import { IS_DEMO_MODE } from '../firebase/config';
import logo from '../assets/logo.png';

export default function Landing() {
  const { login } = useAuth();
  const { joinSession: joinGameContext } = useGame();
  const navigate = useNavigate();

  // Teacher login state
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);

  // Student join state
  const [studentName, setStudentName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [studentError, setStudentError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'teacher'

  async function handleTeacherLogin(e) {
    e.preventDefault();
    setTeacherError('');
    setTeacherLoading(true);
    try {
      await login(teacherEmail, teacherPassword);
      navigate('/dashboard');
    } catch (err) {
      setTeacherError('Invalid email or password. Please try again.');
    } finally {
      setTeacherLoading(false);
    }
  }

  async function handleStudentJoin(e) {
    e.preventDefault();
    setStudentError('');
    if (!studentName.trim()) return setStudentError('Please enter your name.');
    if (!sessionCode.trim()) return setStudentError('Please enter a session code.');
    setStudentLoading(true);
    try {
      const code = sessionCode.toUpperCase().trim();
      const { playerId, session } = await joinSession({
        sessionCode: code,
        studentName: studentName.trim(),
        team: selectedTeam,
      });
      joinGameContext(code, {
        name: studentName.trim(),
        team: selectedTeam,
        role: 'student',
        playerId,
      });
      navigate('/lobby');
    } catch (err) {
      setStudentError(err.message || 'Could not join session. Check your code.');
    } finally {
      setStudentLoading(false);
    }
  }

  return (
    <div className="landing-page">
      {/* Demo mode banner */}
      {IS_DEMO_MODE && (
        <motion.div
          className="demo-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🧪 <strong>Demo Mode</strong> — Firebase not connected. All game data is stored in memory.
          Teacher login accepts any credentials.
        </motion.div>
      )}

      {/* Header */}
      <motion.header
        className="landing-header"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="landing-logo">
          <img src={logo} alt="Math Tug-of-War logo" className="logo-img" />
          <h1 className="logo-title">Math Tug-of-War</h1>
          <p className="logo-subtitle">Immersive Collaborative Mathematics Learning</p>
        </div>
      </motion.header>

      {/* Main card */}
      <motion.main
        className="landing-card"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        aria-label="Join or login"
      >
        {/* Tabs */}
        <div className="tab-bar" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'student'}
            className={`tab-btn ${activeTab === 'student' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            🎮 Join Game
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'teacher'}
            className={`tab-btn ${activeTab === 'teacher' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            👩‍🏫 Teacher Login
          </button>
        </div>

        {/* Student Join */}
        {activeTab === 'student' && (
          <motion.div
            key="student"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
          >
            <h2 className="form-title">Join a Session</h2>
            <form onSubmit={handleStudentJoin} noValidate>
              <div className="form-group">
                <label htmlFor="studentName">Your Name</label>
                <input
                  id="studentName"
                  type="text"
                  placeholder="e.g. Sipho"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  maxLength={30}
                  autoComplete="off"
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label htmlFor="sessionCode">Session Code</label>
                <input
                  id="sessionCode"
                  type="text"
                  placeholder="e.g. AB3K7X"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoComplete="off"
                  className="session-code-input"
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label>Choose Your Team</label>
                <div className="team-select" role="radiogroup" aria-label="Team selection">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedTeam === 'A'}
                    className={`team-option team-a-option ${selectedTeam === 'A' ? 'selected' : ''}`}
                    onClick={() => setSelectedTeam('A')}
                  >
                    🔵 Team A
                    <span className="team-shape">■</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedTeam === 'B'}
                    className={`team-option team-b-option ${selectedTeam === 'B' ? 'selected' : ''}`}
                    onClick={() => setSelectedTeam('B')}
                  >
                    🔴 Team B
                    <span className="team-shape">▲</span>
                  </button>
                </div>
              </div>

              {studentError && (
                <p className="form-error" role="alert">{studentError}</p>
              )}

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={studentLoading}
                aria-busy={studentLoading}
              >
                {studentLoading ? 'Joining...' : 'Join Game 🚀'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Teacher Login */}
        {activeTab === 'teacher' && (
          <motion.div
            key="teacher"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
          >
            <h2 className="form-title">Teacher Login</h2>
            <form onSubmit={handleTeacherLogin} noValidate>
              <div className="form-group">
                <label htmlFor="teacherEmail">Email Address</label>
                <input
                  id="teacherEmail"
                  type="email"
                  placeholder="teacher@school.co.za"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              <div className="form-group">
                <label htmlFor="teacherPassword">Password</label>
                <input
                  id="teacherPassword"
                  type="password"
                  placeholder="••••••••"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-required="true"
                />
              </div>

              {teacherError && (
                <p className="form-error" role="alert">{teacherError}</p>
              )}

              <button
                type="submit"
                className="btn-primary btn-full"
                disabled={teacherLoading}
                aria-busy={teacherLoading}
              >
                {teacherLoading ? 'Logging in...' : 'Login as Teacher 👩‍🏫'}
              </button>
            </form>
          </motion.div>
        )}
      </motion.main>

      <footer className="landing-footer" aria-label="Site info">
        <p>Math Tug-of-War · Grades 4–9 · Built with ❤️ for South African classrooms</p>
      </footer>
    </div>
  );
}
