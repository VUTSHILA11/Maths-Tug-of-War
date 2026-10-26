// =============================================
// GAME SCREEN
// Runs the live team quiz, records answers, updates scores, and moves the rope.
// =============================================
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, update, get, set } from 'firebase/database';
import { rtdb, studentRtdb, IS_DEMO_MODE } from '../firebase/config';
import { useGame } from '../context/GameContext';
import { saveStudentParticipation } from '../utils/sessionHelpers';
import TugOfWarRope from '../components/TugOfWarRope';
import CountdownTimer from '../components/CountdownTimer';
import FeedbackOverlay from '../components/FeedbackOverlay';
import Leaderboard from '../components/Leaderboard';
import { saveAnswerRecord, saveIncorrectAnswer } from '../utils/mistakeHistory';
import { recordPlayerQuestionAnswer, recordQuestionOccurrence } from '../utils/questionHistory';

const POINTS_CORRECT = 10;   // points gained for correct answer
const POINTS_WRONG = 3;      // points deducted for wrong answer (minimum 0)
const ROPE_WIN_THRESHOLD = 20; // rope must reach this zone (<=20 or >=80) to trigger early win

// ─────────────────────────────────────────────
// Rope position (0–100):
//   50  = center
//   >50 = Team A winning  (knot right of center)
//   <50 = Team B winning  (knot left of center)
//
// The rope moves in FIXED SMALL STEPS so it takes many correct answers
// in a row to cross the win line — no single answer can end the game.
// ─────────────────────────────────────────────
const ROPE_STEP_CORRECT = 3; // how far the rope moves for a correct answer
const ROPE_STEP_WRONG = 1; // how far the rope moves back for a wrong answer

function calcNewRopePosition(currentRope, team, isCorrect) {
  // Team A correct → knot goes right (+), wrong → goes left (-)
  // Team B correct → knot goes left (-), wrong → goes right (+)
  const direction = team === 'A' ? 1 : -1;
  const step = isCorrect ? ROPE_STEP_CORRECT : ROPE_STEP_WRONG;
  const newPos = isCorrect
    ? currentRope + direction * step
    : currentRope - direction * step; // wrong pushes rope the other way
  return Math.round(Math.max(5, Math.min(95, newPos)));
}

function checkWinCondition(ropePosition) {
  if (ropePosition >= (100 - ROPE_WIN_THRESHOLD)) return 'A';
  if (ropePosition <= ROPE_WIN_THRESHOLD) return 'B';
  return null;
}

export default function GameScreen() {
  const { session, sessionId, player } = useGame();
  const navigate = useNavigate();

  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  const inputRef = useRef(null);
  const syncedParticipantIds = useRef(new Set());
  const isTeacher = player?.role === 'teacher';
  const sessionDatabase = isTeacher ? rtdb : studentRtdb;

  const currentIndex = session?.currentQuestionIndex ?? 0;
  const currentQuestion = session?.questions?.[currentIndex];
  const totalQuestions = session?.questions?.length ?? 15;

  const recordMistake = useCallback(async (selectedAnswer) => {
    if (!player?.playerId || !currentQuestion) return;
    try {
      await saveIncorrectAnswer(player.playerId, {
        sessionId,
        question: currentQuestion.questionText,
        playerAnswer: selectedAnswer,
        correctAnswer: currentQuestion.answer,
        difficulty: session?.difficulty,
        gradeLevel: session?.gradeLevel,
        topic: currentQuestion.topic || currentQuestion.operation,
        operation: currentQuestion.operation,
      });
    } catch (error) {
      console.error('Could not save incorrect answer:', error);
    }
  }, [currentQuestion, player?.playerId, session?.difficulty, session?.gradeLevel, sessionId]);

  // Navigate when game ends
  useEffect(() => {
    if (session?.status === 'ended') {
      navigate('/results');
    }
  }, [session?.status, navigate]);

  // Reset per-question state when question changes
  useEffect(() => {
    setHasAnswered(false);
    setAnswer('');
    setTimerKey((k) => k + 1);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentIndex]);

  useEffect(() => {
    if (!isTeacher || session?.status !== 'active' || !sessionId || !currentQuestion) return;
    recordQuestionOccurrence(sessionId, session, currentIndex, currentQuestion)
      .catch((error) => console.error('Could not record question history:', error));
  }, [
    currentIndex,
    currentQuestion,
    currentQuestion?.answer,
    currentQuestion?.operation,
    currentQuestion?.questionText,
    currentQuestion?.topic,
    isTeacher,
    session,
    sessionId,
  ]);

  useEffect(() => {
    if (!isTeacher || IS_DEMO_MODE || session?.status !== 'active' || !sessionId) return;
    const players = Object.keys(session.players || {});
    const newlyJoined = players.filter((playerId) => !syncedParticipantIds.current.has(playerId));
    newlyJoined.forEach((playerId) => syncedParticipantIds.current.add(playerId));
    Promise.all(newlyJoined.map((playerId) =>
      saveStudentParticipation(sessionId, session, playerId, 'active')
        .catch((error) => {
          syncedParticipantIds.current.delete(playerId);
          console.error('Could not record student participation:', error);
        })
    ));
  }, [isTeacher, session?.players, session?.status, sessionId, session]);

  // Auto-advance when ALL players have answered the current question (teacher only drives this)
  useEffect(() => {
    if (!isTeacher || !session || !sessionId) return;
    const players = session.players ? Object.values(session.players) : [];
    if (players.length === 0) return;

    // Count how many have answered this question index
    // We track this via answeredQuestion_N flag on each player
    const answeredCount = players.filter(
      (p) => p[`answeredQ${currentIndex}`] === true
    ).length;

    if (answeredCount >= players.length) {
      // Small delay so the last feedback animation shows before advancing
      const t = setTimeout(() => advanceQuestion(), 1500);
      return () => clearTimeout(t);
    }
  }, [session?.players, currentIndex, isTeacher, sessionId]);

  // ── Core function: update scores + rope, check win condition ──────────
  async function applyScoreUpdate(isCorrect) {
    if (!sessionId) return;

    if (IS_DEMO_MODE) {
      const s = window.__demoSessions?.[sessionId];
      if (!s) return;

      // Update player stats
      const p = s.players?.[player.playerId];
      if (p) {
        if (isCorrect) {
          p.score = (p.score || 0) + POINTS_CORRECT;
          p.correctAnswers = (p.correctAnswers || 0) + 1;
        } else {
          p.score = Math.max(0, (p.score || 0) - POINTS_WRONG);
        }
        p.totalAnswers = (p.totalAnswers || 0) + 1;
      }

      // Update team scores
      const teamKey = player.team === 'A' ? 'teamA' : 'teamB';
      if (isCorrect) {
        s.scores[teamKey] = (s.scores[teamKey] || 0) + POINTS_CORRECT;
      } else {
        s.scores[teamKey] = Math.max(0, (s.scores[teamKey] || 0) - POINTS_WRONG);
      }

      // Move rope by fixed step (not ratio)
      const newRope = calcNewRopePosition(s.ropePosition ?? 50, player.team, isCorrect);
      s.ropePosition = newRope;

      // Check early win only after rope crosses the boundary
      const winner = checkWinCondition(newRope);
      if (winner) {
        s.status = 'ended';
        s.endedAt = Date.now();
        s.earlyWinner = winner;
      }

      window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
      return;
    }

    // ── Firebase path ─────────────────────────────────────────────────
    const sessionSnap = await get(ref(sessionDatabase, `sessions/${sessionId}`));
    if (!sessionSnap.exists()) return;
    const s = sessionSnap.val();

    const teamKey = player.team === 'A' ? 'teamA' : 'teamB';
    const currentTeamScore = s.scores?.[teamKey] ?? 0;
    const newTeamScore = isCorrect
      ? currentTeamScore + POINTS_CORRECT
      : Math.max(0, currentTeamScore - POINTS_WRONG);

    // Move rope by fixed step
    const newRope = calcNewRopePosition(s.ropePosition ?? 50, player.team, isCorrect);
    const winner = checkWinCondition(newRope);

    // Update player stats
    if (player?.playerId) {
      const playerRef = ref(sessionDatabase, `sessions/${sessionId}/players/${player.playerId}`);
      const pSnap = await get(playerRef);
      if (pSnap.exists()) {
        const current = pSnap.val();
        await update(playerRef, {
          score: isCorrect
            ? (current.score || 0) + POINTS_CORRECT
            : Math.max(0, (current.score || 0) - POINTS_WRONG),
          correctAnswers: isCorrect ? (current.correctAnswers || 0) + 1 : (current.correctAnswers || 0),
          totalAnswers: (current.totalAnswers || 0) + 1,
        });
      }
    }

    await update(ref(sessionDatabase, `sessions/${sessionId}/scores`), {
      [teamKey]: newTeamScore,
    });
    await set(ref(sessionDatabase, `sessions/${sessionId}/ropePosition`), newRope);

    if (winner) {
      await Promise.all([
        set(ref(sessionDatabase, `sessions/${sessionId}/status`), 'ended'),
        set(ref(sessionDatabase, `sessions/${sessionId}/endedAt`), Date.now()),
        set(ref(sessionDatabase, `sessions/${sessionId}/earlyWinner`), winner),
      ]);
    }
  }

  const handleQuestionTimeout = useCallback(async () => {
    if (hasAnswered || !sessionId) return;
    setHasAnswered(true);
    // Students see "time's up" feedback; teacher sees nothing (they control advance)
    if (!isTeacher) {
      setFeedback('timeout');
      setShowFeedback(true);
      await recordMistake('No answer (time expired)');
      try {
        await recordPlayerQuestionAnswer({
          sessionId,
          playerId: player?.playerId,
          questionIndex: currentIndex,
          playerName: player?.name,
          team: player?.team,
          answer: '',
          isCorrect: null,
          sessionCode: session?.code,
          teacherId: session?.teacherId,
          playerNameLower: player?.name?.toLocaleLowerCase(),
          questionText: currentQuestion?.questionText,
          topic: currentQuestion?.topic || currentQuestion?.operation,
        });
      } catch (error) {
        console.error('Could not save timed-out answer history:', error);
      }
    }
    // Mark as answered (timed out) so auto-advance can still fire
    if (player?.playerId && sessionId) {
      if (IS_DEMO_MODE) {
        const s = window.__demoSessions?.[sessionId];
        if (s?.players?.[player.playerId]) {
          s.players[player.playerId][`answeredQ${currentIndex}`] = true;
          window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
        }
      } else {
        await update(
          ref(sessionDatabase, `sessions/${sessionId}/players/${player.playerId}`),
          { [`answeredQ${currentIndex}`]: true }
        );
      }
    }
  }, [hasAnswered, sessionId, isTeacher, player, currentIndex, recordMistake, session?.code, sessionDatabase]);

  async function advanceQuestion() {
    if (!sessionId) return;
    const nextIndex = currentIndex + 1;

    if (IS_DEMO_MODE) {
      const s = window.__demoSessions?.[sessionId];
      if (!s) return;
      if (nextIndex >= totalQuestions) {
        s.status = 'ended';
        s.endedAt = Date.now();
        s.questionActive = false;
      } else {
        s.currentQuestionIndex = nextIndex;
        s.questionActive = true;
        s.timeLeft = 20;
      }
      window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
      return;
    }

    if (nextIndex >= totalQuestions) {
      await update(ref(sessionDatabase, `sessions/${sessionId}`), {
        status: 'ended',
        endedAt: Date.now(),
        questionActive: false,
      });
    } else {
      await update(ref(sessionDatabase, `sessions/${sessionId}`), {
        currentQuestionIndex: nextIndex,
        questionActive: true,
        timeLeft: 20,
      });
    }
  }

  async function handleSubmitAnswer(e) {
    e.preventDefault();
    if (hasAnswered || !currentQuestion || isTeacher) return;

    const trimmed = answer.trim();
    if (!trimmed) return;

    setHasAnswered(true);
    const isCorrect = trimmed === currentQuestion.answer;

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setShowFeedback(true);

    try {
      await recordPlayerQuestionAnswer({
        sessionId,
        playerId: player?.playerId,
        questionIndex: currentIndex,
        playerName: player?.name,
        team: player?.team,
        answer: trimmed,
        isCorrect,
        sessionCode: session?.code,
        teacherId: session?.teacherId,
        playerNameLower: player?.name?.toLocaleLowerCase(),
        questionText: currentQuestion.questionText,
        topic: currentQuestion.topic || currentQuestion.operation,
      });
    } catch (error) {
      console.error('Could not save question response history:', error);
    }

    await applyScoreUpdate(isCorrect);
    try {
      await saveAnswerRecord(player?.playerId, {
        sessionId,
        question: currentQuestion.questionText,
        playerAnswer: trimmed,
        correctAnswer: currentQuestion.answer,
        difficulty: session.difficulty,
        gradeLevel: session.gradeLevel,
        topic: currentQuestion.topic || currentQuestion.operation,
        operation: currentQuestion.operation,
        isCorrect,
      });
    } catch (error) {
      console.error('Could not save answer history:', error);
    }
    if (!isCorrect) await recordMistake(trimmed);

    // Mark this player as having answered question N so teacher can auto-advance
    if (player?.playerId && sessionId) {
      if (IS_DEMO_MODE) {
        const s = window.__demoSessions?.[sessionId];
        if (s?.players?.[player.playerId]) {
          s.players[player.playerId][`answeredQ${currentIndex}`] = true;
          window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
        }
      } else {
        await update(
          ref(sessionDatabase, `sessions/${sessionId}/players/${player.playerId}`),
          { [`answeredQ${currentIndex}`]: true }
        );
      }
    }
  }

  function handleFeedbackDone() {
    setShowFeedback(false);
    setFeedback(null);
    // Teacher advances manually — do NOT auto-advance here
  }

  async function handleTeacherEndGame() {
    if (!sessionId) return;
    if (IS_DEMO_MODE) {
      const s = window.__demoSessions?.[sessionId];
      if (s) {
        s.status = 'ended';
        s.endedAt = Date.now();
        window.dispatchEvent(new CustomEvent('demo-session-update', { detail: { sessionId } }));
      }
      return;
    }
    await update(ref(sessionDatabase, `sessions/${sessionId}`), {
      status: 'ended',
      endedAt: Date.now(),
    });
  }

  if (!session || !currentQuestion) {
    return (
      <div className="loading-screen" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading game...</p>
      </div>
    );
  }

  const teamNames = session.teamNames ?? ['Team A', 'Team B'];
  const myTeamName = player?.team === 'A' ? teamNames[0] : teamNames[1];
  const ropePos = session.ropePosition ?? 50;
  const questionTime = session.questionTime ?? 20;

  return (
    <div className="game-page">
      {/* Feedback Overlay */}
      <FeedbackOverlay
        type={feedback}
        visible={showFeedback}
        onDone={handleFeedbackDone}
      />

      {/* Top Bar */}
      <header className="game-header">
        <div className="game-info">
          <span className="game-class">{session.className}</span>
          <span className="game-progress" aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}>
            Q {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        {!isTeacher && (
          <div className={`my-team-badge ${player?.team === 'A' ? 'badge-a' : 'badge-b'}`}>
            {player?.team === 'A' ? '■' : '▲'} {myTeamName}
          </div>
        )}

        {isTeacher && (
          <button className="btn-end-game" onClick={handleTeacherEndGame}>
            ⏹ End Game
          </button>
        )}
      </header>

      {/* Rope Animation */}
      <section className="game-rope-section" aria-label="Tug of war progress">
        <TugOfWarRope
          ropePosition={ropePos}
          teamNames={teamNames}
          scores={session.scores}
          winThreshold={ROPE_WIN_THRESHOLD}
        />
      </section>

      {/* Question Area */}
      <main className="game-question-area">
        <div className="question-card">
          <div className="question-header">
            <span className={`difficulty-pill diff-${session.difficulty}`}>
              {session.difficulty}
            </span>
            <CountdownTimer
              key={timerKey}
              duration={questionTime}
              onExpire={handleQuestionTimeout}
              isActive={!hasAnswered}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="question-display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <p className="question-text" aria-live="polite">
                {currentQuestion.questionText} = ?
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Answer input — students only */}
          {!isTeacher && (
            <form onSubmit={handleSubmitAnswer} className="answer-form" noValidate>
              <div className="answer-input-row">
                <input
                  ref={inputRef}
                  type="number"
                  className="answer-input"
                  placeholder="Your answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={hasAnswered}
                  aria-label="Enter your answer"
                  aria-disabled={hasAnswered}
                  inputMode="numeric"
                />
                <button
                  type="submit"
                  className="btn-submit-answer"
                  disabled={hasAnswered || !answer.trim()}
                  aria-label="Submit answer"
                >
                  ✓
                </button>
              </div>

              {hasAnswered && (
                <motion.p
                  className="answered-msg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  aria-live="polite"
                >
                  Answer submitted! Waiting for next question...
                </motion.p>
              )}
            </form>
          )}

          {/* Teacher view */}
          {isTeacher && (
            <div className="teacher-game-controls">
              <p className="correct-answer-reveal">
                ✅ Correct Answer: <strong>{currentQuestion.answer}</strong>
              </p>
              <button className="btn-next-question" onClick={advanceQuestion}>
                {currentIndex + 1 >= totalQuestions ? '🏁 End Game' : 'Next Question ▶'}
              </button>
            </div>
          )}
        </div>

        {/* Scoring legend */}
        <div className="scoring-legend">
          <span className="legend-correct">✅ Correct: +{POINTS_CORRECT} pts</span>
          <span className="legend-wrong">❌ Wrong: −{POINTS_WRONG} pts</span>
          <span className="legend-rope">🏁 Win line: {ROPE_WIN_THRESHOLD}% from edge</span>
        </div>
      </main>

      {/* Compact leaderboard sidebar */}
      <aside className="game-sidebar" aria-label="Live leaderboard">
        <Leaderboard
          players={session.players ?? {}}
          teamNames={teamNames}
          compact
        />
      </aside>
    </div>
  );
}
