import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IS_DEMO_MODE } from '../firebase/config';
import { getQuestionHistoryPage, QUESTION_HISTORY_PAGE_SIZE } from '../utils/questionHistory';
import ParticipationHistory from './ParticipationHistory';

function dateValue(timestamp, fallback) {
  if (timestamp?.toDate) return timestamp.toDate();
  if (typeof fallback === 'number' && Number.isFinite(fallback)) return new Date(fallback);
  return null;
}

function formatDate(timestamp, fallback) {
  const date = dateValue(timestamp, fallback);
  return date ? date.toLocaleString() : 'Time unavailable';
}

export default function QuestionHistory({ initialFilters = {}, sessionOptions = [] }) {
  const { user } = useAuth();
  const [historyView, setHistoryView] = useState(initialFilters.view || 'questions');
  const [draft, setDraft] = useState({
    search: '',
    studentSearch: '',
    startDate: '',
    endDate: '',
    sessionId: initialFilters.sessionId || '',
    subject: '',
    team: '',
  });
  const [occurrences, setOccurrences] = useState([]);
  const [sessions, setSessions] = useState({});
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    ...(initialFilters.sessionId ? { sessionId: initialFilters.sessionId } : {}),
    ...(initialFilters.studentId ? { studentId: initialFilters.studentId } : {}),
  });
  const [participationFilters, setParticipationFilters] = useState({});
  const [openedSessionId, setOpenedSessionId] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const currentCursor = cursorStack[pageIndex];

  useEffect(() => {
    if (IS_DEMO_MODE || !user?.uid) return;

    let cancelled = false;
    getQuestionHistoryPage(user.uid, filters, currentCursor)
      .then((page) => {
        if (cancelled) return;
        setOccurrences(page.occurrences);
        setSessions(page.sessions);
        setNextCursor(page.lastDocument);
        setHasMore(page.hasMore);
      })
      .catch((loadError) => {
        console.error('Could not load question history:', loadError);
        if (!cancelled) {
          setError(loadError?.code === 'failed-precondition'
            ? 'Firestore needs the history indexes before question history can be loaded. Deploy firestore.indexes.json and try again.'
            : 'Question history could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentCursor, filters, reloadCount, user?.uid]);

  const subjects = useMemo(() => [...new Set(
    occurrences.map((occurrence) => occurrence.topic).filter(Boolean)
  )].sort(), [occurrences]);

  const visibleOccurrences = useMemo(
    () => openedSessionId
      ? occurrences.filter((occurrence) => occurrence.sessionId === openedSessionId)
      : occurrences,
    [occurrences, openedSessionId]
  );

  function changePage(direction) {
    if (direction > 0 && nextCursor) {
      const nextIndex = pageIndex + 1;
      setCursorStack((stack) => [...stack.slice(0, nextIndex), nextCursor]);
      setPageIndex(nextIndex);
      setLoading(true);
    } else if (direction < 0 && pageIndex > 0) {
      setPageIndex(pageIndex - 1);
      setLoading(true);
    }
    setError('');
    setOpenedSessionId('');
  }

  function retryLoading() {
    setError('');
    setLoading(true);
    setReloadCount((count) => count + 1);
  }

  function applyFilters(event) {
    event.preventDefault();
    if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
      setError('The start date must be on or before the end date.');
      return;
    }
    const nextFilters = {};
    if (draft.search.trim()) nextFilters.search = draft.search.trim();
    if (draft.studentSearch.trim()) nextFilters.studentSearch = draft.studentSearch.trim();
    if (draft.sessionId) nextFilters.sessionId = draft.sessionId;
    if (draft.subject) nextFilters.topic = draft.subject;
    if (draft.team) nextFilters.team = draft.team;
    if (draft.startDate) nextFilters.fromDate = new Date(`${draft.startDate}T00:00:00`).getTime();
    if (draft.endDate) nextFilters.toDate = new Date(`${draft.endDate}T23:59:59.999`).getTime();
    setFilters(nextFilters);
    setCursorStack([null]);
    setPageIndex(0);
    setNextCursor(null);
    setLoading(true);
    setError('');
    setOpenedSessionId('');
  }

  function clearFilters() {
    setDraft({ search: '', studentSearch: '', startDate: '', endDate: '', sessionId: '', subject: '', team: '' });
    setFilters({});
    setCursorStack([null]);
    setPageIndex(0);
    setNextCursor(null);
    setLoading(true);
    setError('');
    setOpenedSessionId('');
  }

  function openParticipants(sessionId) {
    setParticipationFilters(sessionId ? { sessionId } : {});
    setHistoryView('participation');
  }

  function openAllParticipation() {
    setParticipationFilters({});
    setHistoryView('participation');
  }

  function openSessionDetails(sessionId) {
    setOpenedSessionId(sessionId);
    setDraft((previous) => ({ ...previous, sessionId }));
    setFilters((previous) => ({ ...previous, sessionId }));
    setCursorStack([null]);
    setPageIndex(0);
    setNextCursor(null);
    setLoading(true);
    setError('');
  }

  if (IS_DEMO_MODE) {
    return (
      <section className="dashboard-section question-history">
        <h1>Question History</h1>
        <p className="history-empty">Question history is stored in Firebase and is unavailable in demo mode.</p>
      </section>
    );
  }

  const openedSession = sessions[openedSessionId];

  return (
    <section className="dashboard-section question-history">
      <h1>Question History</h1>
      <p className="subtitle">Browse persisted question occurrences, student responses, and session results.</p>

      <div className="history-view-tabs" role="tablist" aria-label="Teacher history">
        <button
          type="button"
          role="tab"
          aria-selected={historyView === 'questions'}
          className={`sidebar-btn ${historyView === 'questions' ? 'active' : ''}`}
          onClick={() => setHistoryView('questions')}
        >
          Question History
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={historyView === 'participation'}
          className={`sidebar-btn ${historyView === 'participation' ? 'active' : ''}`}
          onClick={openAllParticipation}
        >
          Student Participation
        </button>
      </div>

      {historyView === 'participation' ? (
        <ParticipationHistory
          initialFilters={participationFilters}
          sessionOptions={sessionOptions}
          onOpenQuestions={({ sessionId, studentId, studentName }) => {
            setDraft((previous) => ({ ...previous, sessionId, studentSearch: studentName || '' }));
            setFilters({ sessionId, studentId });
            setCursorStack([null]);
            setPageIndex(0);
            setNextCursor(null);
            setLoading(true);
            setError('');
            setOpenedSessionId('');
            setHistoryView('questions');
          }}
        />
      ) : (
      <>
      <form className="history-filters" aria-label="Question history filters" onSubmit={applyFilters}>
        <label>
          Search questions
          <input
            type="search"
            value={draft.search}
            onChange={(event) => setDraft((previous) => ({ ...previous, search: event.target.value }))}
            placeholder="Search keywords"
          />
        </label>
        <label>
          Student name
          <input
            type="search"
            value={draft.studentSearch}
            onChange={(event) => setDraft((previous) => ({ ...previous, studentSearch: event.target.value }))}
            placeholder="Full name"
          />
        </label>
        <label>
          From
          <input type="date" value={draft.startDate} onChange={(event) => setDraft((previous) => ({ ...previous, startDate: event.target.value }))} />
        </label>
        <label>
          To
          <input type="date" value={draft.endDate} onChange={(event) => setDraft((previous) => ({ ...previous, endDate: event.target.value }))} />
        </label>
        <label>
          Session
          <select value={draft.sessionId} onChange={(event) => setDraft((previous) => ({ ...previous, sessionId: event.target.value }))}>
            <option value="">All sessions</option>
            {[...new Map([
              ...sessionOptions.map((session) => [session.id, session]),
              ...Object.entries(sessions).map(([sessionId, session]) => [sessionId, { ...session, id: sessionId }]),
            ]).values()].map((session) => (
              <option key={session.id} value={session.id}>
                {session.className || 'Class'} · {session.code || session.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subject
          <input
            type="search"
            list="question-history-subjects"
            value={draft.subject}
            onChange={(event) => setDraft((previous) => ({ ...previous, subject: event.target.value }))}
            placeholder="Exact subject"
          />
          <datalist id="question-history-subjects">
            {subjects.map((subject) => <option key={subject} value={subject} />)}
          </datalist>
        </label>
        <label>
          Team
          <select value={draft.team} onChange={(event) => setDraft((previous) => ({ ...previous, team: event.target.value }))}>
            <option value="">All teams</option>
            <option value="A">Team A</option>
            <option value="B">Team B</option>
          </select>
        </label>
        <div className="history-filter-actions">
          <button type="submit" className="btn-primary">Apply filters</button>
          <button type="button" className="btn-secondary" onClick={clearFilters}>Clear filters</button>
        </div>
      </form>
      {Object.keys(filters).length > 0 && (
        <p className="history-active-filters">
          {Object.keys(filters).length} active database filter{Object.keys(filters).length === 1 ? '' : 's'}
        </p>
      )}

      {openedSession && (
        <section className="history-session-summary" aria-label="Historical session details">
          <div>
            <h2>{openedSession.className || 'Class'} · {openedSession.code || openedSessionId}</h2>
            <p>
              Grade {openedSession.gradeLevel ?? '—'} · {openedSession.questionMode || 'Question mode unavailable'} ·{' '}
              {openedSession.status || 'Status unavailable'}
            </p>
            <p>
              Started: {formatDate(null, openedSession.startedAt)} · Ended: {formatDate(openedSession.endedAt, openedSession.endedAt)}
            </p>
          </div>
          <div className="history-session-scores">
            <span>{openedSession.teamNames?.[0] || 'Team A'}: {openedSession.scores?.teamA ?? 0}</span>
            <span>{openedSession.teamNames?.[1] || 'Team B'}: {openedSession.scores?.teamB ?? 0}</span>
            <span>Participants: {openedSession.participantCount ?? Object.keys(openedSession.players || {}).length}</span>
          </div>
          <div className="history-session-actions">
            <button type="button" className="btn-secondary" onClick={() => openParticipants(openedSessionId)}>View participants</button>
            <button type="button" className="btn-secondary" onClick={() => setOpenedSessionId('')}>Close session details</button>
          </div>
        </section>
      )}

      {error && (
        <div className="history-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={retryLoading}>Try again</button>
        </div>
      )}
      {loading ? (
        <div className="history-empty" role="status">Loading question history…</div>
      ) : !error && occurrences.length === 0 && Object.keys(filters).length > 0 ? (
        <div className="history-empty">No question records match these filters.</div>
      ) : !error && occurrences.length === 0 ? (
        <div className="history-empty">No question history is available yet. Questions are recorded as they are presented in new sessions.</div>
      ) : !error && visibleOccurrences.length === 0 ? (
        <div className="history-empty">No question records match these database filters.</div>
      ) : (
        <div className="history-list">
          {visibleOccurrences.map((occurrence) => {
            const responses = Object.values(occurrence.responses || {});
            const session = sessions[occurrence.sessionId] || {};
            return (
              <article className="history-question-card" key={occurrence.id}>
                <header className="history-question-header">
                  <div>
                    <span className="history-subject">{occurrence.topic || 'Subject unavailable'}</span>
                    <span className={`history-session-status ${session.status === 'active' ? 'is-live' : ''}`}>
                      {session.status === 'active' ? 'Live session' : 'Past session'}
                    </span>
                    <h2>{occurrence.questionText}</h2>
                  </div>
                  <time dateTime={dateValue(occurrence.askedAt, occurrence.presentedAt)?.toISOString()}>
                    {formatDate(occurrence.askedAt, occurrence.presentedAt)}
                  </time>
                </header>
                <div className="history-question-meta">
                  <span>Session: <strong>{occurrence.sessionCode || occurrence.sessionId}</strong></span>
                  <span>{occurrence.className || session.className || 'Class unavailable'}</span>
                  <span>Grade {occurrence.gradeLevel ?? session.gradeLevel ?? '—'}</span>
                  <span>Question {Number(occurrence.questionIndex) + 1}</span>
                  <button
                    type="button"
                    className="history-open-session"
                    onClick={() => openSessionDetails(occurrence.sessionId)}
                  >
                    Open session details
                  </button>
                </div>
                {responses.length > 0 ? (
                  <div className="history-responses">
                    <h3>Student responses</h3>
                    <div className="history-response-list">
                      {responses.map((response) => (
                        <div className="history-response" key={response.playerId}>
                          <strong>{response.playerName}</strong>
                          <span>
                            {response.team
                              ? occurrence.teamNames?.[response.team === 'A' ? 0 : 1] || `Team ${response.team}`
                              : 'Team unavailable'}
                          </span>
                          <span>{response.answer || 'No answer (timed out)'}</span>
                          <span className={response.isCorrect === true ? 'response-correct' : response.isCorrect === false ? 'response-incorrect' : ''}>
                            {response.isCorrect === true ? 'Correct' : response.isCorrect === false ? 'Incorrect' : 'Timed out'}
                          </span>
                          <time>{formatDate(null, response.answeredAt)}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="history-no-responses">No student responses recorded for this question.</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && (
        <nav className="history-pagination" aria-label="Question history pages">
          <button type="button" className="btn-secondary" onClick={() => changePage(-1)} disabled={pageIndex === 0}>
            Previous
          </button>
          <span>Page {pageIndex + 1} · {occurrences.length} of up to {QUESTION_HISTORY_PAGE_SIZE} records</span>
          <button type="button" className="btn-secondary" onClick={() => changePage(1)} disabled={!hasMore || !nextCursor}>
            Next
          </button>
        </nav>
      )}
      </>
      )}
    </section>
  );
}
