import { motion, AnimatePresence } from 'framer-motion';

const messages = {
  correct: [
    '🎉 Correct! Great job!',
    '✅ Nailed it!',
    '🔥 You\'re on fire!',
    '⭐ Excellent answer!',
    '💪 Well done!',
  ],
  incorrect: [
    '❌ Not quite — try next one!',
    '💡 Good effort — keep going!',
    '🙌 Stay positive, you\'ve got this!',
    '📚 Almost there!',
  ],
  timeout: [
    '⏱️ Time\'s up! Next question!',
    '⏰ Too slow this time — keep going!',
  ],
  teamwork: [
    '🤝 Great teamwork!',
    '👥 Your team solved it together!',
    '💬 Collaboration wins!',
  ],
};

function getRandomMessage(type) {
  const list = messages[type] || messages.correct;
  return list[Math.floor(Math.random() * list.length)];
}

export default function FeedbackOverlay({ type, visible, onDone }) {
  const message = type ? getRandomMessage(type) : '';
  const bgColor = type === 'correct' ? 'rgba(34,197,94,0.92)'
    : type === 'incorrect' ? 'rgba(239,68,68,0.92)'
    : type === 'timeout' ? 'rgba(245,158,11,0.92)'
    : 'rgba(99,102,241,0.92)';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="feedback-overlay"
          style={{ background: bgColor }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.25 }}
          onAnimationComplete={() => {
            if (visible) setTimeout(onDone, 1200);
          }}
          role="alert"
          aria-live="assertive"
        >
          <p className="feedback-text">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
