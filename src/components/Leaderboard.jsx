// =============================================
// GAME LEADERBOARD
// Renders player rankings, team groupings, scores, and accuracy.
// =============================================
import { motion } from 'framer-motion';

export default function Leaderboard({ players = {}, teamNames = ['Team A', 'Team B'], compact = false }) {
  const playerList = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => b.score - a.score);

  const teamAPlayers = playerList.filter((p) => p.team === 'A');
  const teamBPlayers = playerList.filter((p) => p.team === 'B');

  if (compact) {
    return (
      <div className="leaderboard-compact">
        <h3 className="leaderboard-title">🏆 Top Players</h3>
        <ol className="leaderboard-list">
          {playerList.slice(0, 5).map((p, i) => (
            <motion.li
              key={p.id}
              className="leaderboard-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span className="player-name">{p.name}</span>
              <span className={`player-team-badge ${p.team === 'A' ? 'badge-a' : 'badge-b'}`}>
                {p.team === 'A' ? teamNames[0] : teamNames[1]}
              </span>
              <span className="player-score">{p.score} pts</span>
            </motion.li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="leaderboard-full">
      <div className="leaderboard-team-col">
        <h3 className="team-header team-a-header">🔵 {teamNames[0]}</h3>
        <ol className="leaderboard-list">
          {teamAPlayers.map((p, i) => (
            <motion.li
              key={p.id}
              className="leaderboard-item"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="rank">#{i + 1}</span>
              <span className="player-name">{p.name}</span>
              <span className="player-score">{p.score} pts</span>
              <span className="player-accuracy">
                {p.totalAnswers > 0 ? Math.round((p.correctAnswers / p.totalAnswers) * 100) : 0}%
              </span>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="leaderboard-team-col">
        <h3 className="team-header team-b-header">🔴 {teamNames[1]}</h3>
        <ol className="leaderboard-list">
          {teamBPlayers.map((p, i) => (
            <motion.li
              key={p.id}
              className="leaderboard-item"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="rank">#{i + 1}</span>
              <span className="player-name">{p.name}</span>
              <span className="player-score">{p.score} pts</span>
              <span className="player-accuracy">
                {p.totalAnswers > 0 ? Math.round((p.correctAnswers / p.totalAnswers) * 100) : 0}%
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  );
}
