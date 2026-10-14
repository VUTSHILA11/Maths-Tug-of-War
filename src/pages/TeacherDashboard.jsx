import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, rtdb } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { createSession } from '../utils/sessionHelpers';
import Leaderboard from '../components/Leaderboard';
import logo from '../assets/logo.png';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { joinSession: joinGameCtx, session, sessionId, registerDemoSession } = useGame();
  const navigate = useNavigate();

  const [view, setView] = useState('home'); // 'home' | 'create' | 'monitor'
  const [pastSessions, setPastSessions] = useState([]);

  // Create session form
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(4);
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [questionTime, setQuestionTime] = useState(20); // seconds per question
  const [questionCount, setQuestionCount] = useState(15);
  const [questionMode, setQuestionMode] = useState('practice');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newCode, setNewCode] = useState('');

  // Active session monitor
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = onValue(ref(rtdb, `sessions/${sessionId}`), (snap) => {
      if (snap.exists()) setActiveSession(snap.val());
    });
    return unsubscribe;
  }, [sessionId]);

  // Load past sessions from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sessions'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    getDocs(q).then((snap) => {
      setPastSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }).catch(() => { });
  }, [user]);

  async function handleCreateSession(e) {
    e.preventDefault();
    if (!className.trim()) return setCreateError('Please enter a class name.');
    setCreating(true);
    setCreateError('');
    try {
      const code = await createSession({
        teacherId: user?.uid || 'demo-teacher',
        className: className.trim(),
        gradeLevel: Number(gradeLevel),
        teamNames: [teamAName.trim() || 'Team A', teamBName.trim() || 'Team B'],
        questionTime: Number(questionTime),
        questionCount: Number(questionCount),
        questionMode,
      });
      setNewCode(code);
      // Register in GameContext demo store if needed
      if (window.__demoSessions?.[code]) {
        registerDemoSession(code, window.__demoSessions[code]);
      }
      joinGameCtx(code, { role: 'teacher', name: user?.email || 'Demo Teacher' });
    } catch (err) {
      setCreateError('Failed to create session. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function handleGoToLobby() {
    navigate('/lobby');
  }

  function handleStartGame() {
    navigate('/game');
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const playerCount = activeSession
    ? Object.keys(activeSession.players || {}).length
    : 0;

  return (
    <div className="dashboard-page">
      {/* Sidebar */}
      <nav className="dashboard-sidebar" aria-label="Teacher navigation">
        <div className="sidebar-logo">
          <img src={logo} alt="Math Tug-of-War" className="sidebar-logo-img" />
          <span>Math Tug-of-War</span>
        </div>
        <ul className="sidebar-nav">
          <li>
            <button
              className={`sidebar-btn ${view === 'home' ? 'active' : ''}`}
              onClick={() => setView('home')}
            >
              🏠 Home
            </button>
          </li>
          <li>
            <button
              className={`sidebar-btn ${view === 'create' ? 'active' : ''}`}
              onClick={() => setView('create')}
            >
              ➕ New Session
            </button>
          </li>
          {sessionId && (
            <li>
              <button
                className={`sidebar-btn ${view === 'monitor' ? 'active' : ''}`}
                onClick={() => setView('monitor')}
              >
                📊 Live Monitor
              </button>
            </li>
          )}
          <li>
            <button
              className="sidebar-btn"
              onClick={() => navigate('/analytics')}
            >
              📈 Analytics
            </button>
          </li>
        </ul>
        <div className="sidebar-footer">
          <span className="sidebar-user">{user?.email}</span>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main" aria-label="Dashboard content">
        {/* HOME */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dashboard-section"
          >
            <h1>Welcome back 👋</h1>
            <p className="subtitle">Logged in as <strong>{user?.email}</strong></p>

            <div className="dashboard-cards">
              <div className="info-card" onClick={() => setView('create')} tabIndex={0} role="button" aria-label="Create new session">
                <span className="card-icon" aria-hidden="true">🎮</span>
                <h3>Start New Session</h3>
                <p>Create a classroom game with a shareable code</p>
              </div>

              {sessionId && (
                <div className="info-card active-card" onClick={() => setView('monitor')} tabIndex={0} role="button" aria-label="View live session">
                  <span className="card-icon" aria-hidden="true">🔴</span>
                  <h3>Live Session</h3>
                  <p>Code: <strong className="session-code-badge">{sessionId}</strong></p>
                  <p>{playerCount} player{playerCount !== 1 ? 's' : ''} joined</p>
                </div>
              )}

              <div className="info-card" onClick={() => navigate('/analytics')} tabIndex={0} role="button" aria-label="View analytics">
                <span className="card-icon" aria-hidden="true">📊</span>
                <h3>View Analytics</h3>
                <p>Review past session performance data</p>
              </div>
            </div>

            {/* Past Sessions */}
            {pastSessions.length > 0 && (
              <div className="past-sessions">
                <h2>Recent Sessions</h2>
                <table className="sessions-table" aria-label="Recent sessions">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Class</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastSessions.slice(0, 10).map((s) => (
                      <tr key={s.id}>
                        <td><code>{s.code}</code></td>
                        <td>{s.className}</td>
                        <td>Grade {s.gradeLevel}</td>
                        <td>
                          <span className={`status-badge status-${s.status}`}>{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* CREATE SESSION */}
        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dashboard-section"
          >
            <h1>Create New Session</h1>

            {newCode ? (
              <div className="session-created">
                <motion.div
                  className="code-display"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring' }}
                >
                  <p>Session Created! Share this code with your class:</p>
                  <div className="big-code" aria-label={`Session code: ${newCode}`}>
                    {newCode}
                  </div>
                  <p className="code-hint">Students enter this code on the Join Game screen</p>
                </motion.div>
                <div className="session-actions">
                  <button className="btn-primary" onClick={handleGoToLobby}>
                    Go to Lobby 🏟️
                  </button>
                  <button className="btn-secondary" onClick={() => { setNewCode(''); setClassName(''); }}>
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSession} className="create-form" noValidate>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="className">Class Name</label>
                    <input
                      id="className"
                      type="text"
                      placeholder="e.g. Grade 5"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      aria-required="true"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gradeLevel">Grade Level</label>
                    <select
                      id="gradeLevel"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      aria-required="true"
                    >
                      <option value={4}>Grade 4</option>
                      <option value={5}>Grade 5</option>
                      <option value={6}>Grade 6</option>
                      <option value={7}>Grade 7</option>
                      <option value={8}>Grade 8</option>
                      <option value={9}>Grade 9</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="teamAName">Team A Name</label>
                    <input
                      id="teamAName"
                      type="text"
                      placeholder="Team A"
                      value={teamAName}
                      onChange={(e) => setTeamAName(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="teamBName">Team B Name</label>
                    <input
                      id="teamBName"
                      type="text"
                      placeholder="Team B"
                      value={teamBName}
                      onChange={(e) => setTeamBName(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="questionTime">Time Per Question</label>
                    <select
                      id="questionTime"
                      value={questionTime}
                      onChange={(e) => setQuestionTime(e.target.value)}
                    >
                      <option value={10}>10 seconds (Fast)</option>
                      <option value={15}>15 seconds</option>
                      <option value={20}>20 seconds (Default)</option>
                      <option value={30}>30 seconds</option>
                      <option value={45}>45 seconds</option>
                      <option value={60}>60 seconds (Slow)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="questionCount">Number of Questions</label>
                    <select
                      id="questionCount"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(e.target.value)}
                    >
                      <option value={5}>5 questions</option>
                      <option value={10}>10 questions</option>
                      <option value={15}>15 questions (Default)</option>
                      <option value={20}>20 questions</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="questionMode">Question Type</label>
                    <select
                      id="questionMode"
                      value={questionMode}
                      onChange={(e) => setQuestionMode(e.target.value)}
                    >
                      <option value="practice">Practice Questions</option>
                      <option value="test">Test Questions</option>
                      <option value="exam">Exam Questions</option>
                    </select>
                  </div>
                </div>

                {createError && <p className="form-error" role="alert">{createError}</p>}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                  aria-busy={creating}
                >
                  {creating ? 'Creating...' : '🚀 Create Session'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* LIVE MONITOR */}
        {view === 'monitor' && activeSession && (
          <motion.div
            key="monitor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dashboard-section"
          >
            <div className="monitor-header">
              <h1>Live Session Monitor</h1>
              <span className="live-badge" aria-label="Live session indicator">🔴 LIVE</span>
              <div className="monitor-actions">
                <button className="btn-primary" onClick={handleGoToLobby}>
                  View Lobby
                </button>
                <button className="btn-secondary" onClick={handleStartGame}>
                  ▶️ Start Game
                </button>
              </div>
            </div>

            <div className="monitor-stats">
              <div className="stat-card">
                <span className="stat-num">{playerCount}</span>
                <span className="stat-label">Players Joined</span>
              </div>
              <div className="stat-card team-a-stat">
                <span className="stat-num">{activeSession.scores?.teamA ?? 0}</span>
                <span className="stat-label">{activeSession.teamNames?.[0] ?? 'Team A'} Score</span>
              </div>
              <div className="stat-card team-b-stat">
                <span className="stat-num">{activeSession.scores?.teamB ?? 0}</span>
                <span className="stat-label">{activeSession.teamNames?.[1] ?? 'Team B'} Score</span>
              </div>
              <div className="stat-card">
                <span className="stat-num">{activeSession.currentQuestionIndex + 1} / {activeSession.questions?.length ?? 15}</span>
                <span className="stat-label">Question</span>
              </div>
            </div>

            <Leaderboard
              players={activeSession.players ?? {}}
              teamNames={activeSession.teamNames ?? ['Team A', 'Team B']}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
