// =============================================
// LEARNER ANSWER HISTORY
// Saves and subscribes to students' incorrect and correct answer records.
// =============================================
import { onValue, push, ref, set } from 'firebase/database';
import { studentRtdb, IS_DEMO_MODE } from '../firebase/config';

function storageKey(playerId) {
    return `math-tug-of-war-mistakes-${playerId}`;
}

function answerKey(playerId) {
    return `math-tug-of-war-answers-${playerId}`;
}

function readDemoMistakes(playerId) {
    try {
        return JSON.parse(localStorage.getItem(storageKey(playerId)) || '[]');
    } catch {
        return [];
    }
}

export async function saveIncorrectAnswer(playerId, mistake) {
    if (!playerId) return;
    const record = { ...mistake, playerId, answeredAt: mistake.answeredAt || Date.now() };

    if (IS_DEMO_MODE) {
        localStorage.setItem(storageKey(playerId), JSON.stringify([record, ...readDemoMistakes(playerId)]));
        return;
    }

    const mistakeRef = push(ref(studentRtdb, `playerMistakes/${playerId}`));
    await set(mistakeRef, record);
}

export function subscribeToMistakes(playerId, onChange, onError) {
    if (!playerId) return () => { };
    if (IS_DEMO_MODE) {
        onChange(readDemoMistakes(playerId));
        return () => { };
    }

    return onValue(ref(studentRtdb, `playerMistakes/${playerId}`), (snapshot) => {
        const values = snapshot.val() || {};
        onChange(Object.values(values).sort((a, b) => (b.answeredAt || 0) - (a.answeredAt || 0)));
    }, onError);
}

function readDemoAnswers(playerId) {
    try {
        return JSON.parse(localStorage.getItem(answerKey(playerId)) || '[]');
    } catch {
        return [];
    }
}

export async function saveAnswerRecord(playerId, answer) {
    if (!playerId) return;
    const record = { ...answer, playerId, answeredAt: answer.answeredAt || Date.now() };

    if (IS_DEMO_MODE) {
        localStorage.setItem(answerKey(playerId), JSON.stringify([record, ...readDemoAnswers(playerId)]));
        return;
    }

    const answerRef = push(ref(studentRtdb, `playerAnswers/${playerId}`));
    await set(answerRef, record);
}

export function subscribeToCorrectAnswers(playerId, onChange, onError) {
    if (!playerId) return () => { };
    if (IS_DEMO_MODE) {
        onChange(readDemoAnswers(playerId).filter((answer) => answer.isCorrect));
        return () => { };
    }

    return onValue(ref(studentRtdb, `playerAnswers/${playerId}`), (snapshot) => {
        const values = snapshot.val() || {};
        onChange(Object.values(values)
            .filter((answer) => answer.isCorrect)
            .sort((a, b) => (b.answeredAt || 0) - (a.answeredAt || 0)));
    }, onError);
}