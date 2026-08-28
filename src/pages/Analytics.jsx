import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { db, IS_DEMO_MODE } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const { user } = useAuth();
  const { session: liveSession, sessionId } = useGame();
  const navigate = useNavigate();

  const [firestoreSessions, setFirestoreSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    if (IS_DEMO_MODE) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'sessions'),
      where('teacherId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    getDocs(q)
      .then((snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFirestoreSessions(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((err) => {
        console.warn('Firestore query failed, falling back to live session:', err);
        // Firestore failed (index missing, rules, etc.) — live session will be used as fallback
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  // Determine which session data to show.
  // Priority: Firestore selection → live session from context → nothing
  const allSessions = firestoreSessions.length > 0
    ? firestoreSessions
    : liveSession ? [{ id: sessionId, ...liveSession }] : [];

  const s = firestoreSessions.length > 0
    ? (firestoreSessions.find((x) => x.id === selectedId) ?? firestoreSessions[0])
    : liveSession
    ? { id: sessionId, ...liveSession }
    : null;

  if (loading) {
    return (
      <div className="loading-screen" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="analytics-page">
        <header className="analytics-header">
          <button className="btn-back" onClick={() => navigate('/dashboard')} aria-label="Back">← Back</button>
          <h1>📊 Session Analytics</h1>
        </header>
        <div className="analytics-empty">
          <span aria-hidden="true">📊</span>
          <h2>No session data yet</h2>
          <p>Play a game session first, then come back here to see analytics.</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const players = s?.players ? Object.values(s.players) : [];
  const teamNames = s?.teamNames ?? ['Team A', 'Team B'];

  // Chart data
  const teamScoreData = {
    labels: teamNames,
    datasets: [{
      label: 'Team Score',
      data: [s?.scores?.teamA ?? 0, s?.scores?.teamB ?? 0],
      backgroundColor: ['rgba(59,130,246,0.75)', 'rgba(239,68,68,0.75)'],
      borderColor: ['#3b82f6', '#ef4444'],
      borderWidth: 2,
      borderRadius: 8,
    }],
  };

  const playerAccuracyData = {
    labels: players.map((p) => p.name),
    datasets: [{
      label: 'Accuracy %',
      data: players.map((p) =>
        p.totalAnswers > 0 ? Math.round((p.correctAnswers / p.totalAnswers) * 100) : 0
      ),
      backgroundColor: players.map((p) =>
        p.team === 'A' ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.7)'
      ),
      borderRadius: 6,
    }],
  };

  const teamACount = players.filter((p) => p.team === 'A').length;
  const teamBCount = players.filter((p) => p.team === 'B').length;
  const participationData = {
    labels: teamNames,
    datasets: [{
      data: [teamACount, teamBCount],
      backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(239,68,68,0.8)'],
      borderColor: ['#3b82f6', '#ef4444'],
      borderWidth: 2,
    }],
  };

  const playerScoreData = {
    labels: players.map((p) => p.name),
    datasets: [{
      label: 'Score (pts)',
      data: players.map((p) => p.score || 0),
      backgroundColor: players.map((p) =>
        p.team === 'A' ? 'rgba(59,130,246,0.6)' : 'rgba(239,68,68,0.6)'
      ),
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
  };

  const struggling = players.filter(
    (p) => p.totalAnswers > 0 && (p.correctAnswers / p.totalAnswers) < 0.4
  );

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
          ← Back
        </button>
        <h1>📊 Session Analytics</h1>
      </header>

      {/* Session selector — only shown when multiple Firestore sessions exist */}
      {!IS_DEMO_MODE && allSessions.length > 1 && (
        <div className="session-selector">
          <label htmlFor="sessionSelect">Session:</label>
          <select
            id="sessionSelect"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Select session"
          >
            {allSessions.map((x) => (
              <option key={x.id} value={x.id}>
                {x.className} · Grade {x.gradeLevel} · {x.id}
              </option>
            ))}
          </select>
        </div>
      )}

      <motion.div
        className="analytics-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={s.id}
      >
        {/* Summary stats */}
        <div className="analytics-stats">
          <div className="analytics-stat">
            <span>{players.length}</span>
            <label>Players</label>
          </div>
          <div className="analytics-stat team-a-stat">
            <span>{s.scores?.teamA ?? 0}</span>
            <label>{teamNames[0]}</label>
          </div>
          <div className="analytics-stat team-b-stat">
            <span>{s.scores?.teamB ?? 0}</span>
            <label>{teamNames[1]}</label>
          </div>
          <div className="analytics-stat">
            <span style={{ textTransform: 'capitalize' }}>{s.difficulty ?? '—'}</span>
            <label>Difficulty</label>
          </div>
        </div>

        {/* No players yet */}
        {players.length === 0 && (
          <div className="analytics-no-players">
            <p>No player data yet. Analytics will populate once learners answer questions.</p>
          </div>
        )}

        {players.length > 0 && (
          <>
            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3>Team Score Comparison</h3>
                <Bar data={teamScoreData} options={chartOptions} aria-label="Team scores bar chart" />
              </div>

              <div className="chart-card">
                <h3>Team Participation</h3>
                <Pie data={participationData} options={pieOptions} aria-label="Team participation pie chart" />
              </div>

              <div className="chart-card chart-wide">
                <h3>Player Accuracy (%)</h3>
                <Bar data={playerAccuracyData} options={chartOptions} aria-label="Player accuracy bar chart" />
              </div>

              <div className="chart-card chart-wide">
                <h3>Player Scores</h3>
                <Bar data={playerScoreData} options={chartOptions} aria-label="Player scores bar chart" />
              </div>
            </div>

            {/* Struggling learners */}
            {struggling.length > 0 && (
              <div className="struggling-learners">
                <h3>⚠️ Learners Needing Support</h3>
                <p>These learners had below 40% accuracy — consider targeted intervention:</p>
                <ul>
                  {struggling.map((p, i) => (
                    <li key={i}>
                      <strong>{p.name}</strong> ({p.team === 'A' ? teamNames[0] : teamNames[1]}) —{' '}
                      {Math.round((p.correctAnswers / p.totalAnswers) * 100)}% accuracy
                      ({p.correctAnswers}/{p.totalAnswers} correct)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Full player table */}
            <div className="player-table-section">
              <h3>Full Player Report</h3>
              <div className="table-wrapper" role="region" aria-label="Player performance table" tabIndex={0}>
                <table className="player-table">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Team</th>
                      <th scope="col">Score</th>
                      <th scope="col">Correct</th>
                      <th scope="col">Attempts</th>
                      <th scope="col">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...players]
                      .sort((a, b) => b.score - a.score)
                      .map((p, i) => (
                        <tr key={i}>
                          <td>{p.name}</td>
                          <td>
                            <span className={`team-pill ${p.team === 'A' ? 'team-a-pill' : 'team-b-pill'}`}>
                              {p.team === 'A' ? teamNames[0] : teamNames[1]}
                            </span>
                          </td>
                          <td><strong>{p.score || 0}</strong></td>
                          <td>{p.correctAnswers || 0}</td>
                          <td>{p.totalAnswers || 0}</td>
                          <td>
                            <span className={`accuracy-badge ${
                              p.totalAnswers > 0 && (p.correctAnswers / p.totalAnswers) >= 0.7
                                ? 'accuracy-good'
                                : p.totalAnswers > 0 && (p.correctAnswers / p.totalAnswers) >= 0.4
                                ? 'accuracy-mid'
                                : 'accuracy-low'
                            }`}>
                              {p.totalAnswers > 0
                                ? `${Math.round((p.correctAnswers / p.totalAnswers) * 100)}%`
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
