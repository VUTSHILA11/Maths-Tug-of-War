// =============================================
// GAME LOBBY PAGE
// Shows teams before play and lets the teacher start the session countdown.
// =============================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, update } from 'firebase/database';
import { rtdb, IS_DEMO_MODE } from '../firebase/config';
import { useGame } from '../context/GameContext';
import { markSessionStarted } from '../utils/sessionHelpers';
import logo from '../assets/logo.png';

export default function Lobby() {
  const { session, sessionId, player } = useGame();
  const navigate = useNavigate();
  const [localCountdown, setLocalCountdown] = useState(null);
  const [startError, setStartError] = useState('');

  const isTeacher = player?.role === 'teacher';

  // Read countdown from session so ALL clients see it
  const sessionCountdown = session?.countdown ?? null;

  // Navigate when status flips to active
  useEffect(() => {
    if (session?.status === 'active') {
      navigate('/game');
    }
  }, [session?.status, navigate]);

  const players = session?.players ? Object.entries(session.players) : [];
  const teamAPlayers = players.filter(([, p]) => p.team === 'A');
  const teamBPlayers = players.filter(([, p]) => p.team === 'B');
  const teamNames = session?.teamNames ?? ['Team A', 'Team B'];

  async function handleStartGame() {
    if (!sessionId) return;
    setStartError('');

    // Write countdown into the session so every connected client sees it
    const writeCountdown = async (val) => {
      if (IS_DEMO_MODE) {
        const s = window.__demoSessions?.[sessionId];
        if (s) {
          s.countdown = val;
          window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
        }
      } else {
        await update(ref(rtdb, `sessions/${sessionId}`), { countdown: val });
      }
    };

    await writeCountdown(3);

    let count = 2;
    const interval = setInterval(async () => {
      if (count <= 0) {
        clearInterval(interval);
        // Clear countdown and start game
        if (IS_DEMO_MODE) {
          const s = window.__demoSessions?.[sessionId];
          if (s) {
            s.countdown = null;
            s.status = 'active';
            s.startedAt = Date.now();
            s.currentQuestionIndex = 0;
            s.questionActive = true;
            s.timeLeft = s.questionTime ?? 20;
            window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
          }
        } else {
          const startedAt = Date.now();
          try {
            await markSessionStarted(sessionId, startedAt);
          } catch (error) {
            console.error('Could not persist participation before starting the session:', error);
            await writeCountdown(null);
            setStartError('Could not save participation records. Please try starting the session again.');
            return;
          }
          await update(ref(rtdb, `sessions/${sessionId}`), {
            countdown: null,
            status: 'active',
            startedAt,
            currentQuestionIndex: 0,
            questionActive: true,
          });
        }
      } else {
        await writeCountdown(count);
        count--;
      }
    }, 1000);
  }

  if (!session) {
    return (
      <div className="loading-screen" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Connecting to session...</p>
      </div>
    );
  }

  // Show the countdown from session state (visible to all clients)
  const showCountdown = sessionCountdown !== null && sessionCountdown !== undefined;

  return (
    <div className="lobby-page">
      {/* Header */}
      <motion.header
        className="lobby-header"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="lobby-header-left">
          <img src={logo} alt="Math Tug-of-War" className="lobby-logo-img" />
          <div>
            <h1 className="lobby-title">Game Lobby</h1>
            <p className="lobby-class">{session.className} · Grade {session.gradeLevel}</p>
          </div>
        </div>
        <div className="lobby-code-display">
          <span className="code-label">Session Code</span>
          <span className="code-value" aria-label={`Session code: ${sessionId}`}>{sessionId}</span>
        </div>
      </motion.header>

      {/* Countdown overlay — shown to ALL clients from session state */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alert"
            aria-live="assertive"
          >
            <motion.span
              key={sessionCountdown}
              className="countdown-number"
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {sessionCountdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="lobby-main">
        {/* Difficulty badge */}
        <div className="difficulty-banner">
          <span>Difficulty:</span>
          <span className={`difficulty-badge diff-${session.difficulty}`}>
            {session.gradeLevel ? `Grade ${session.gradeLevel}` : session.difficulty?.charAt(0).toUpperCase() + session.difficulty?.slice(1)}
          </span>
          {session.questionMode && <span>· {session.questionMode.charAt(0).toUpperCase() + session.questionMode.slice(1)} Questions</span>}
          <span>· {session.questions?.length ?? 15} Questions</span>
          <span>· {session.questionTime ?? 20}s per question</span>
        </div>

        {/* Team boards */}
        <div className="team-boards">
          {/* Team A */}
          <motion.div
            className="team-board team-board-a"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="team-board-header">
              <span className="team-color-indicator color-a" aria-hidden="true">■</span>
              <h2>{teamNames[0]}</h2>
              <span className="player-count" aria-label={`${teamAPlayers.length} players`}>
                {teamAPlayers.length} player{teamAPlayers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ul className="player-list" aria-label={`${teamNames[0]} players`}>
              <AnimatePresence>
                {teamAPlayers.map(([id, p]) => (
                  <motion.li
                    key={id}
                    className="player-chip team-a-chip"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <span aria-hidden="true">🟦</span> {p.name}
                  </motion.li>
                ))}
              </AnimatePresence>
              {teamAPlayers.length === 0 && (
                <li className="player-empty">Waiting for players...</li>
              )}
            </ul>
          </motion.div>

          {/* VS */}
          <div className="lobby-vs" aria-hidden="true">VS</div>

          {/* Team B */}
          <motion.div
            className="team-board team-board-b"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="team-board-header">
              <span className="team-color-indicator color-b" aria-hidden="true">▲</span>
              <h2>{teamNames[1]}</h2>
              <span className="player-count" aria-label={`${teamBPlayers.length} players`}>
                {teamBPlayers.length} player{teamBPlayers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ul className="player-list" aria-label={`${teamNames[1]} players`}>
              <AnimatePresence>
                {teamBPlayers.map(([id, p]) => (
                  <motion.li
                    key={id}
                    className="player-chip team-b-chip"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <span aria-hidden="true">🔺</span> {p.name}
                  </motion.li>
                ))}
              </AnimatePresence>
              {teamBPlayers.length === 0 && (
                <li className="player-empty">Waiting for players...</li>
              )}
            </ul>
          </motion.div>
        </div>

        {/* Teacher controls */}
        {isTeacher ? (
          <motion.div
            className="lobby-teacher-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="waiting-text">
              {players.length} player{players.length !== 1 ? 's' : ''} connected.
              {players.length < 2 ? ' Waiting for at least 2 players...' : ' Ready to start!'}
            </p>
            {startError && <p className="form-error" role="alert">{startError}</p>}
            <button
              className="btn-start-game"
              onClick={handleStartGame}
              disabled={players.length < 1 || showCountdown}
              aria-busy={showCountdown}
            >
              {showCountdown ? `Starting in ${sessionCountdown}...` : '▶️ Start Game'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="lobby-waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            aria-live="polite"
          >
            <div className="pulse-dot" aria-hidden="true" />
            <p>{showCountdown ? `Game starting in ${sessionCountdown}...` : 'Waiting for teacher to start the game...'}</p>
            <p className="your-team">
              You are on{' '}
              <span className={`team-highlight ${player?.team === 'A' ? 'team-a-text' : 'team-b-text'}`}>
                {player?.team === 'A' ? teamNames[0] : teamNames[1]}
              </span>
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
