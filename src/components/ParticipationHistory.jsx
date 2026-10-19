import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IS_DEMO_MODE } from '../firebase/config';
import {
  getParticipationPage,
  getSessionParticipantCount,
  PARTICIPATION_PAGE_SIZE,
} from '../utils/participationHistory';
import { downloadStudentReport } from '../utils/studentReport';

function dateValue(value) {
  if (value?.toDate) return value.toDate();
  if (typeof value === 'number') return new Date(value);
  return null;
}

function formatDate(value) {
  return dateValue(value)?.toLocaleString() || 'Not available';
}

export default function ParticipationHistory({
  onOpenQuestions,
  sessionOptions: teacherSessions = [],
  initialFilters = {},
}) {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState({});
  const [draft, setDraft] = useState({
    studentSearch: '',
    studentId: initialFilters.studentId || '',
    sessionId: initialFilters.sessionId || '',
    team: '',
    fromDate: '',
    toDate: '',
    status: '',
    minScore: '',
    maxScore: '',
  });
  const [filters, setFilters] = useState(initialFilters);
  const [cursorStack, setCursorStack] = useState([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(!IS_DEMO_MODE);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sessionCountResult, setSessionCountResult] = useState(null);
  const sessionCount = sessionCountResult && sessionCountResult.sessionId === filters.sessionId
    ? sessionCountResult.count
    : undefined;
  const currentCursor = cursorStack[pageIndex];

  useEffect(() => {
    if (IS_DEMO_MODE || !user?.uid) return;
    let cancelled = false;
    getParticipationPage(user.uid, filters, currentCursor)
      .then((page) => {
        if (cancelled) return;
        setRecords(page.records);
        setSessions(page.sessions);
        setNextCursor(page.lastDocument);
        setHasMore(page.hasMore);
      })
      .catch((loadError) => {
        console.error('Could not load student participation history:', loadError);
        if (!cancelled) {
          setError(loadError?.code === 'failed-precondition'
            ? 'Firestore needs the history indexes before participation records can be loaded. Deploy firestore.indexes.json and try again.'
            : 'Student participation history could not be loaded. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentCursor, filters, reloadCount, user?.uid]);

  useEffect(() => {
    if (IS_DEMO_MODE || !user?.uid || !filters.sessionId) {
      return;
    }
    let cancelled = false;
    getSessionParticipantCount(filters.sessionId)
      .then((count) => {
        if (!cancelled) setSessionCountResult({ sessionId: filters.sessionId, count });
      })
      .catch((countError) => {
        console.error('Could not load session participant count:', countError);
        if (!cancelled) setSessionCountResult({ sessionId: filters.sessionId, count: null });
      });
    return () => {
      cancelled = true;
    };
  }, [filters.sessionId, user?.uid]);

  const sessionOptions = useMemo(() => {
    const merged = new Map(teacherSessions.map((session) => [session.id, session]));
    Object.entries(sessions).forEach(([sessionId, session]) => merged.set(sessionId, {
      ...merged.get(sessionId),
      ...session,
      id: sessionId,
    }));
    records.forEach((record) => {
      if (!merged.has(record.sessionId)) {
        merged.set(record.sessionId, {
          className: record.sessionName,
          code: record.sessionCode,
        });
      }
    });
    return [...merged.entries()];
  }, [records, sessions, teacherSessions]);

  function updateDraft(key, value) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    if (draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setError('The start date must be on or before the end date.');
      return;
    }
    if (draft.minScore !== '' && draft.maxScore !== '' && Number(draft.minScore) > Number(draft.maxScore)) {
      setError('The minimum score must not exceed the maximum score.');
      return;
    }
    const nextFilters = {};
    if (draft.sessionId) nextFilters.sessionId = draft.sessionId;
    if (draft.studentId.trim()) nextFilters.studentId = draft.studentId.trim();
    if (draft.studentSearch.trim()) nextFilters.studentSearch = draft.studentSearch.trim();
    if (draft.team) nextFilters.team = draft.team;
    if (draft.status) nextFilters.status = draft.status;
    if (draft.fromDate) nextFilters.fromDate = new Date(`${draft.fromDate}T00:00:00`).getTime();
    if (draft.toDate) nextFilters.toDate = new Date(`${draft.toDate}T23:59:59.999`).getTime();
    if (draft.minScore !== '') nextFilters.minScore = draft.minScore;
    if (draft.maxScore !== '') nextFilters.maxScore = draft.maxScore;
    setFilters(nextFilters);
    setSelectedStudent(nextFilters.studentId
      ? {
        studentId: nextFilters.studentId,
        name: nextFilters.studentId === selectedStudent?.studentId
          ? selectedStudent.name
          : draft.studentSearch.trim(),
      }
      : null);
    setCursorStack([null]);
    setPageIndex(0);
    setNextCursor(null);
    setLoading(true);
    setError('');
  }

  function clearFilters() {
    setDraft({
      studentSearch: '',
      studentId: '',
      sessionId: '',
      team: '',
      fromDate: '',
      toDate: '',
      status: '',
      minScore: '',
      maxScore: '',
    });
    setFilters({});
    setSelectedStudent(null);
    setCursorStack([null]);
    setPageIndex(0);
    setNextCursor(null);
    setLoading(true);
    setError('');
  }

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
  }

  function retry() {
    setError('');
    setLoading(true);
    setReloadCount((count) => count + 1);
  }

  function openStudentHistory(record) {
    setDraft({
      studentSearch: record.name || '',
      studentId: record.studentId,
      sessionId: '',
      team: '',
      fromDate: '',
      toDate: '',
      status: '',
      minScore: '',
      maxScore: '',
    });
    setFilters({ studentId: record.studentId });
    setSelectedStudent({ studentId: record.studentId, name: record.name || '' });
    setCursorStack([null]);
    setPageIndex(0);
    setNextCursor(null);
    setLoading(true);
    setError('');
  }

  async function exportStudentReport() {
    if (!selectedStudent || !user?.uid) return;
    setExporting(true);
    setError('');
    try {
      await downloadStudentReport(user.uid, selectedStudent);
    } catch (exportError) {
      console.error('Could not download student report:', exportError);
      setError('The student report could not be downloaded. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const activeFilterCount = Object.keys(filters).length;

  if (IS_DEMO_MODE) {
    return <div className="history-empty">Student participation history is available when Firebase is configured.</div>;
  }

  return (
    <div className="participation-history">
      <div className="history-toolbar">
        <div>
          <h2>Student Participation History</h2>
          <p>Persistent participation records, scores, and session details.</p>
        </div>
        {selectedStudent && (
          <button
            className="btn-secondary"
            type="button"
            onClick={exportStudentReport}
            disabled={exporting || loading}
          >
            {exporting ? 'Preparing PDF…' : 'Download student PDF'}
          </button>
        )}
        {filters.sessionId && (
          <strong className="history-count">
            {sessionCount === undefined
              ? 'Loading participant count…'
              : sessionCount === null
                ? 'Participant count unavailable'
                : `${sessionCount} participant${sessionCount === 1 ? '' : 's'} in this session`}
          </strong>
        )}
      </div>
      {selectedStudent && (
        <p className="history-active-filters" role="status">
          Showing all sessions for <strong>{selectedStudent.name || 'this learner'}</strong> ({selectedStudent.studentId}).
        </p>
      )}

      <form className="history-filters" onSubmit={applyFilters}>
        <label>
          Student name
          <input
            type="search"
            value={draft.studentSearch}
            onChange={(event) => updateDraft('studentSearch', event.target.value)}
            placeholder="Full name"
          />
        </label>
        <label>
          Student number / ID
          <input
            type="search"
            value={draft.studentId}
            onChange={(event) => updateDraft('studentId', event.target.value)}
            placeholder="Student identifier"
          />
        </label>
        <label>
          Game session
          <select value={draft.sessionId} onChange={(event) => updateDraft('sessionId', event.target.value)}>
            <option value="">All sessions</option>
            {sessionOptions.map(([sessionId, session]) => (
              <option key={sessionId} value={sessionId}>
                {session.className || 'Class'} · {session.code || sessionId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Team
          <select value={draft.team} onChange={(event) => updateDraft('team', event.target.value)}>
            <option value="">All teams</option>
            <option value="A">Team A</option>
            <option value="B">Team B</option>
          </select>
        </label>
        <label>
          From
          <input type="date" value={draft.fromDate} onChange={(event) => updateDraft('fromDate', event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={draft.toDate} onChange={(event) => updateDraft('toDate', event.target.value)} />
        </label>
        <label>
          Status
          <select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Minimum score
          <input type="number" value={draft.minScore} onChange={(event) => updateDraft('minScore', event.target.value)} />
        </label>
        <label>
          Maximum score
          <input type="number" value={draft.maxScore} onChange={(event) => updateDraft('maxScore', event.target.value)} />
        </label>
        <div className="history-filter-actions">
          <button className="btn-primary" type="submit">Apply filters</button>
          <button className="btn-secondary" type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      </form>

      {activeFilterCount > 0 && (
        <p className="history-active-filters" aria-live="polite">
          {activeFilterCount} active server filter{activeFilterCount === 1 ? '' : 's'}
          {filters.sessionId && ` · Session ${filters.sessionId}`}
          {filters.studentSearch && ` · Name “${filters.studentSearch}”`}
          {filters.studentId && ` · ID ${filters.studentId}`}
        </p>
      )}
      {error && (
        <div className="history-error" role="alert">
          <p>{error}</p>
          <button className="btn-secondary" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {loading ? (
        <div className="history-empty" role="status">Loading participation records…</div>
      ) : !error && records.length === 0 ? (
        <div className="history-empty">
          {selectedStudent
            ? `No participation records were found for ${selectedStudent.name || 'this learner'} (${selectedStudent.studentId}) across this teacher's sessions.`
            : 'No participation records match these filters. New records are added when students join a session.'}
        </div>
      ) : !error && (
        <div className="sessions-table-wrap">
          <table className="sessions-table participation-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Session</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Score</th>
                <th>Answers</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const session = sessions[record.sessionId] || {};
                const accuracy = record.totalAnswers
                  ? Math.round((record.correctAnswers / record.totalAnswers) * 100)
                  : 0;
                return (
                  <tr key={`${record.sessionId}-${record.studentId}`}>
                    <td>
                      <button
                        type="button"
                        className="history-open-session"
                        onClick={() => openStudentHistory(record)}
                      >
                        {record.name || 'Name unavailable'} · View all sessions
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="history-open-session student-id-link"
                        onClick={() => openStudentHistory(record)}
                      >
                        <code>{record.studentId}</code>
                      </button>
                    </td>
                    <td>
                      {record.sessionName || session.className || 'Class'} · {record.sessionCode || record.sessionId}
                      <span className="participant-count-in-table">
                        {session.participantCount ?? '—'} participant{session.participantCount === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td>{formatDate(record.joinedAt)}</td>
                    <td><span className={`status-badge status-${record.status}`}>{record.status}</span></td>
                    <td>{record.score ?? 0}</td>
                    <td>{record.correctAnswers ?? 0}/{record.totalAnswers ?? 0} correct · {accuracy}%</td>
                    <td>
                      <button
                        type="button"
                        className="history-open-session"
                        onClick={() => onOpenQuestions({
                          sessionId: record.sessionId,
                          studentId: record.studentId,
                          studentName: record.name,
                        })}
                      >
                        View questions
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <nav className="history-pagination" aria-label="Participation pages">
          <button className="btn-secondary" type="button" onClick={() => changePage(-1)} disabled={pageIndex === 0}>
            Previous
          </button>
          <span>Page {pageIndex + 1} · {records.length} of up to {PARTICIPATION_PAGE_SIZE} records</span>
          <button className="btn-secondary" type="button" onClick={() => changePage(1)} disabled={!hasMore || !nextCursor}>
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
