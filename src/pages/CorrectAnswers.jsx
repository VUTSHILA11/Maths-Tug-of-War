import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { subscribeToCorrectAnswers } from '../utils/mistakeHistory';

function formatDate(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString() : 'Date unavailable';
}

function confirmLeave(leaveSession, navigate) {
    if (window.confirm('Are you sure you want to leave your review?')) {
        leaveSession();
        navigate('/');
    }
}

export default function CorrectAnswers() {
    const { player, leaveSession } = useGame();
    const navigate = useNavigate();
    const [answers, setAnswers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!player?.playerId) return undefined;
        return subscribeToCorrectAnswers(player.playerId, setAnswers, () => {
            setError('Your correct-answer history could not be loaded right now.');
        });
    }, [player?.playerId]);

    return (
        <div className="dashboard-page">
            <nav className="dashboard-sidebar" aria-label="Learner navigation">
                <div className="sidebar-logo"><span>🪢</span><span>Math Tug-of-War</span></div>
                <ul className="sidebar-nav">
                    <li><button className="sidebar-btn" onClick={() => navigate('/mistakes')}>📝 My Mistakes</button></li>
                    <li><button className="sidebar-btn active" onClick={() => navigate('/correct-answers')}>✅ Correct Answers</button></li>
                </ul>
                <div className="sidebar-footer">
                    <span className="sidebar-user">{player?.name || 'Learner'}</span>
                    <button className="btn-logout" onClick={() => confirmLeave(leaveSession, navigate)}>Leave</button>
                </div>
            </nav>

            <main className="dashboard-main mistakes-main" aria-label="Correct answers">
                <motion.div className="dashboard-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1>Correct Answers</h1>
                    <p className="subtitle">See the questions you solved successfully.</p>
                    <div className="review-actions">
                        <button className="btn-secondary" onClick={() => navigate('/mistakes')}>📝 My Mistakes</button>
                        <button className="btn-secondary" onClick={() => confirmLeave(leaveSession, navigate)}>Leave Review</button>
                    </div>

                    {!player?.playerId && (
                        <div className="empty-state"><h2>Join a game to view your history</h2><button className="btn-primary" onClick={() => navigate('/')}>Join a Game</button></div>
                    )}
                    {error && <p className="form-error" role="alert">{error}</p>}
                    {player?.playerId && !error && answers.length === 0 && (
                        <div className="empty-state"><span className="empty-icon" aria-hidden="true">✓</span><h2>No correct answers to show yet</h2><p>Keep playing and your successful answers will appear here.</p></div>
                    )}
                    {answers.length > 0 && (
                        <div className="mistakes-list">
                            {answers.map((answer, index) => (
                                <article className="mistake-card correct-card" key={`${answer.answeredAt}-${index}`}>
                                    <div className="mistake-card-header"><span className="status-badge status-correct">Correct</span><time>{formatDate(answer.answeredAt)}</time></div>
                                    <h2>{answer.question} = ?</h2>
                                    <div className="mistake-details">
                                        <p><span>Your answer</span><strong className="correct-answer">{answer.playerAnswer}</strong></p>
                                        <p><span>Correct answer</span><strong>{answer.correctAnswer}</strong></p>
                                        <p><span>Topic</span><strong>{answer.topic || 'Mathematics'}</strong></p>
                                        <p><span>Difficulty</span><strong>{answer.gradeLevel ? `Grade ${answer.gradeLevel}` : answer.difficulty || '—'}</strong></p>
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
