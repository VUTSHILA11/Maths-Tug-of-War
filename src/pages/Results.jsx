import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import Leaderboard from '../components/Leaderboard';
import { saveSessionResults } from '../utils/sessionHelpers';

export default function Results() {
  const { session, sessionId, player, leaveSession } = useGame();
  const navigate = useNavigate();

  const isTeacher = player?.role === 'teacher';
  const teamNames = session?.teamNames ?? ['Team A', 'Team B'];
  const scores = session?.scores ?? { teamA: 0, teamB: 0 };

  const teamAScore = scores.teamA;
  const teamBScore = scores.teamB;
  const isTie = teamAScore === teamBScore;
  const winnerTeam = isTie ? null : teamAScore > teamBScore ? 'A' : 'B';
  const winnerName = winnerTeam === 'A' ? teamNames[0] : winnerTeam === 'B' ? teamNames[1] : null;

  // Save results to Firestore once
  useEffect(() => {
    if (sessionId && session && isTeacher) {
      saveSessionResults(sessionId, session);
    }
  }, []);

  function handlePlayAgain() {
    leaveSession();
    navigate('/dashboard');
  }

  function handleViewAnalytics() {
    navigate('/analytics');
  }

  function handleGoHome() {
    if (window.confirm('Are you sure you want to leave the game and return home?')) {
      leaveSession();
      navigate('/');
    }
  }

  const players = session?.players ? Object.entries(session.players) : [];
  const totalQuestions = session?.questions?.length ?? 15;

  // Stats
  const totalCorrect = players.reduce((sum, [, p]) => sum + (p.correctAnswers || 0), 0);
  const teamAPlayers = players.filter(([, p]) => p.team === 'A');
  const teamBPlayers = players.filter(([, p]) => p.team === 'B');

  return (
    <div className="results-page">
      {/* Confetti effect (CSS only) */}
      {!isTie && (
        <div className="confetti-container" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={`confetti-piece piece-${i % 5}`} />
          ))}
        </div>
      )}

      <motion.main
        className="results-main"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Winner Banner */}
        <motion.div
          className={`winner-banner ${isTie ? 'tie-banner' : ''}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          {isTie ? (
            <>
              <span className="winner-emoji" aria-hidden="true">🤝</span>
              <h1 className="winner-title">It's a Tie!</h1>
              <p className="winner-sub">Both teams played brilliantly!</p>
            </>
          ) : (
            <>
              <span className="winner-emoji" aria-hidden="true">🏆</span>
              <h1 className="winner-title">{winnerName} Wins!</h1>
              <p className="winner-sub">Congratulations to all players!</p>
            </>
          )}
        </motion.div>

        {/* Score Summary */}
        <div className="results-scores">
          <div className={`result-score-card ${winnerTeam === 'A' ? 'winner-card' : ''}`}>
            <span className="result-team-icon" aria-hidden="true">■</span>
            <h2>{teamNames[0]}</h2>
            <span className="result-score-num" aria-label={`${teamAScore} points`}>{teamAScore}</span>
            <span className="result-score-label">points</span>
            <span className="result-player-count">{teamAPlayers.length} players</span>
          </div>

          <div className="result-vs" aria-hidden="true">VS</div>

          <div className={`result-score-card ${winnerTeam === 'B' ? 'winner-card' : ''}`}>
            <span className="result-team-icon" aria-hidden="true">▲</span>
            <h2>{teamNames[1]}</h2>
            <span className="result-score-num" aria-label={`${teamBScore} points`}>{teamBScore}</span>
            <span className="result-score-label">points</span>
            <span className="result-player-count">{teamBPlayers.length} players</span>
          </div>
        </div>

        {/* Session Stats */}
        <div className="results-stats">
          <div className="result-stat">
            <span className="stat-num">{players.length}</span>
            <span className="stat-label">Total Players</span>
          </div>
          <div className="result-stat">
            <span className="stat-num">{totalQuestions}</span>
            <span className="stat-label">Questions</span>
          </div>
          <div className="result-stat">
            <span className="stat-num">{totalCorrect}</span>
            <span className="stat-label">Correct Answers</span>
          </div>
          <div className="result-stat">
            <span className="stat-num">
              {players.length > 0 ? Math.round((totalCorrect / (players.length * totalQuestions)) * 100) : 0}%
            </span>
            <span className="stat-label">Avg Accuracy</span>
          </div>
        </div>

        {/* Individual Player Results */}
        <div className="results-leaderboard">
          <Leaderboard
            players={session?.players ?? {}}
            teamNames={teamNames}
          />
        </div>

        {/* Actions */}
        <div className="results-actions">
          {isTeacher ? (
            <>
              <button className="btn-primary" onClick={handleViewAnalytics}>
                📊 View Analytics
              </button>
              <button className="btn-secondary" onClick={handlePlayAgain}>
                🎮 New Session
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={() => navigate('/mistakes')}>
                📝 My Mistakes
              </button>
              <button className="btn-secondary" onClick={() => navigate('/correct-answers')}>
                ✅ Correct Answers
              </button>
              <button className="btn-secondary" onClick={handleGoHome}>
                🏠 Back to Home
              </button>
            </>
          )}
        </div>
      </motion.main>
    </div>
  );
}
