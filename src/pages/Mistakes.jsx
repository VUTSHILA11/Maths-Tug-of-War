import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { subscribeToMistakes } from '../utils/mistakeHistory';

function formatDate(timestamp) {
    if (!timestamp) return 'Date unavailable';
    return new Date(timestamp).toLocaleString();
}

function confirmLeave(leaveSession, navigate) {
    if (window.confirm('Are you sure you want to leave your review?')) {
        leaveSession();
        navigate('/');
    }
}

export default function Mistakes() {
    const { player, leaveSession } = useGame();
    const navigate = useNavigate();
    const [mistakes, setMistakes] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!player?.playerId) return undefined;
        return subscribeToMistakes(player.playerId, setMistakes, () => {
            setError('Your mistake history could not be loaded right now.');
        });
    }, [player?.playerId]);

    return (
        <div className="dashboard-page">
            <nav className="dashboard-sidebar" aria-label="Learner navigation">
                <div className="sidebar-logo"><span>🪢</span><span>Math Tug-of-War</span></div>
                <ul className="sidebar-nav">
                    <li><button className="sidebar-btn active" onClick={() => navigate('/mistakes')}>&#128221; My Mistakes</button></li>
                    <li><button className="sidebar-btn" onClick={() => navigate('/correct-answers')}>✅ Correct Answers</button></li>
                </ul>
                <div className="sidebar-footer">
                    <span className="sidebar-user">{player?.name || 'Learner'}</span>
                    <button className="btn-logout" onClick={() => confirmLeave(leaveSession, navigate)}>Leave</button>
                </div>
            </nav>

            <main className="dashboard-main mistakes-main" aria-label="Incorrect questions">
                <motion.div
                    className="dashboard-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1>My Mistakes</h1>
                    <p className="subtitle">Review questions you answered incorrectly and keep practising.</p>
                    <div className="review-actions">
                        <button className="btn-secondary" onClick={() => navigate('/correct-answers')}>✅ Correct Answers</button>
                        <button className="btn-secondary" onClick={() => confirmLeave(leaveSession, navigate)}>Leave Review</button>
                    </div>

                    {!player?.playerId && (
                        <div className="empty-state">
                            <h2>Join a game to view your history</h2>
                            <p>Your incorrect answers are saved to your learner profile after you play.</p>
                            <button className="btn-primary" onClick={() => navigate('/')}>Join a Game</button>
                        </div>
                    )}

                    {error && <p className="form-error" role="alert">{error}</p>}

                    {player?.playerId && !error && mistakes.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon" aria-hidden="true">✓</span>
                            <h2>No mistakes to review yet</h2>
                            <p>You haven't answered any questions incorrectly yet. Keep practising!</p>
                        </div>
                    )}

                    {mistakes.length > 0 && (
                        <div className="mistakes-list">
                            {mistakes.map((mistake, index) => (
                                <article className="mistake-card" key={`${mistake.answeredAt}-${index}`}>
                                    <div className="mistake-card-header">
                                        <span className="status-badge status-ended">Incorrect</span>
                                        <time dateTime={mistake.answeredAt ? new Date(mistake.answeredAt).toISOString() : undefined}>
                                            {formatDate(mistake.answeredAt)}
                                        </time>
                                    </div>
                                    <h2>{mistake.question} = ?</h2>
                                    <div className="mistake-details">
                                        <p><span>Your answer</span><strong className="wrong-answer">{mistake.playerAnswer}</strong></p>
                                        <p><span>Correct answer</span><strong className="correct-answer">{mistake.correctAnswer}</strong></p>
                                        <p><span>Topic</span><strong>{mistake.topic || 'Mathematics'}</strong></p>
                                        <p><span>Difficulty</span><strong>{mistake.gradeLevel ? `Grade ${mistake.gradeLevel}` : mistake.difficulty || '—'}</strong></p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
