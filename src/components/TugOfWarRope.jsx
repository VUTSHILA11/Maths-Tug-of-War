// =============================================
// TUG-OF-WAR ROPE
// Visualizes team scores, rope position, and the match win zones.
// =============================================
import { motion } from 'framer-motion';

/**
 * ropePosition: 0–100
 *   50  = center
 *   >50 = Team A winning (knot right of center)
 *   <50 = Team B winning (knot left of center)
 *
 * winThreshold: if rope goes above (100 - winThreshold) or below winThreshold, that team wins
 */
export default function TugOfWarRope({
  ropePosition = 50,
  teamNames = ['Team A', 'Team B'],
  scores,
  winThreshold = 20,
}) {
  const clampedPos = Math.max(5, Math.min(95, ropePosition));
  const knotLeft = `${clampedPos}%`;

  const teamAWinning = ropePosition > 55;
  const teamBWinning = ropePosition < 45;

  // Win zone boundaries as percentages
  const teamBWinLine = winThreshold;        // left side — Team B wins if knot goes here
  const teamAWinLine = 100 - winThreshold;  // right side — Team A wins if knot goes here

  return (
    <div
      className="rope-container"
      role="img"
      aria-label={`Tug of war rope. ${teamNames[0]}: ${scores?.teamA ?? 0} points. ${teamNames[1]}: ${scores?.teamB ?? 0} points.`}
    >
      {/* Team Labels & Scores */}
      <div className="rope-teams">
        <div className={`rope-team team-a-label ${teamAWinning ? 'winning' : ''}`}>
          <span className="team-icon" aria-hidden="true">🔵</span>
          <span className="team-name">{teamNames[0]}</span>
          <span className="team-score">{scores?.teamA ?? 0}</span>
        </div>
        <div className={`rope-team team-b-label ${teamBWinning ? 'winning' : ''}`}>
          <span className="team-score">{scores?.teamB ?? 0}</span>
          <span className="team-name">{teamNames[1]}</span>
          <span className="team-icon" aria-hidden="true">🔴</span>
        </div>
      </div>

      {/* The Rope Track */}
      <div className="rope-track" aria-hidden="true">

        {/* Team B win zone — left edge, red shading */}
        <div
          className="rope-win-zone win-zone-b"
          style={{ width: `${teamBWinLine}%` }}
          title={`${teamNames[1]} wins if knot reaches here`}
        />

        {/* Team A win zone — right edge, blue shading */}
        <div
          className="rope-win-zone win-zone-a"
          style={{ width: `${teamBWinLine}%` }}
          title={`${teamNames[0]} wins if knot reaches here`}
        />

        {/* Rope segments — left side is Team B (red), right side is Team A (blue) 
            because Team A pulls RIGHT and Team B pulls LEFT.
            The left segment grows when Team B is winning (knot moves left).
            The right segment grows when Team A is winning (knot moves right). */}
        <div className="rope-segment rope-left" style={{ width: knotLeft }} />
        <div className="rope-segment rope-right" style={{ width: `${100 - clampedPos}%` }} />

        {/* Win line markers */}
        <div className="rope-win-line win-line-left" style={{ left: `${teamBWinLine}%` }} />
        <div className="rope-win-line win-line-right" style={{ left: `${teamAWinLine}%` }} />

        {/* Center marker */}
        <div className="rope-center-marker" />

        {/* Moving knot */}
        <motion.div
          className="rope-knot"
          animate={{ left: knotLeft }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          style={{ left: knotLeft }}
        >
          <span className="rope-flag">🏁</span>
        </motion.div>
      </div>

      {/* Direction labels */}
      <div className="rope-direction-labels" aria-hidden="true">
        <span className="rope-dir-label">← {teamNames[1]} pulls this way</span>
        <span className="rope-dir-label">{teamNames[0]} pulls this way →</span>
      </div>

      {/* Stick figures */}
      <div className="rope-pullers" aria-hidden="true">
        <div className={`puller puller-left ${teamBWinning ? 'pulling-hard' : ''}`}>
          <div className="stick-figure">🧍</div>
          <div className="stick-figure">🧍</div>
          <div className="stick-figure">🧍</div>
        </div>
        <div className={`puller puller-right ${teamAWinning ? 'pulling-hard' : ''}`}>
          <div className="stick-figure">🧍</div>
          <div className="stick-figure">🧍</div>
          <div className="stick-figure">🧍</div>
        </div>
      </div>
    </div>
  );
}
