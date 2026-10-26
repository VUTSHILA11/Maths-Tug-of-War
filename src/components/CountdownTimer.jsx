// =============================================
// COUNTDOWN TIMER
// Displays an animated countdown and calls onExpire when time runs out.
// =============================================
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function CountdownTimer({ duration = 20, onExpire, isActive = true }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!isActive) return;
    if (timeLeft <= 0) {
      onExpire?.();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isActive, onExpire]);

  const percentage = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 5;
  const isWarning = timeLeft <= 10;

  const color = isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  return (
    <div className="timer-container" role="timer" aria-live="polite" aria-label={`${timeLeft} seconds remaining`}>
      <svg className="timer-svg" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <motion.circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 34}`}
          strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
          transform="rotate(-90 40 40)"
          animate={{ stroke: color }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <motion.span
        className={`timer-text ${isUrgent ? 'timer-urgent' : ''}`}
        animate={{ scale: isUrgent ? [1, 1.2, 1] : 1 }}
        transition={{ repeat: isUrgent ? Infinity : 0, duration: 0.5 }}
        style={{ color }}
      >
        {timeLeft}
      </motion.span>
    </div>
  );
}
