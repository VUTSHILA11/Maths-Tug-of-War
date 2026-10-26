// =============================================
// STUDENT REPORT EXPORT
// Builds and downloads a student's participation and question-history report.
// =============================================
import { getParticipationPage } from './participationHistory';
import { getQuestionHistoryPage } from './questionHistory';

const PAGE_MARGIN = 16;
const FOOTER_MARGIN = 14;
const LINE_HEIGHT = 4.8;

function toDate(value) {
  if (value?.toDate) return value.toDate();
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  return null;
}

function formatDate(value) {
  const date = toDate(value);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not available';
}

function pdfText(value) {
  return String(value ?? 'Not available')
    .replace(/[×]/g, 'x')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[≠]/g, '!=')
    .replace(/[≈]/g, '~=')
    .replace(/[√]/g, 'sqrt ')
    .replace(/[π]/g, 'pi')
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
    .replace(/[½]/g, '1/2')
    .replace(/[¼]/g, '1/4')
    .replace(/[¾]/g, '3/4')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

function accuracy(correct, total) {
  return total ? `${Math.round((correct / total) * 100)}%` : 'Not available';
}

function safeFilename(name, studentId) {
  const base = pdfText(name === 'Student' ? studentId : name)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `student-report-${base || 'student'}.pdf`;
}

async function createReportDocument(student, participation, sessions, questions) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  function newPage() {
    pdf.addPage();
    y = PAGE_MARGIN;
  }

  function ensureSpace(height = LINE_HEIGHT) {
    if (y + height > pageHeight - FOOTER_MARGIN) newPage();
  }

  function addParagraph(value, { bold = false, size = 10, gap = 1.5 } = {}) {
    const text = pdfText(value);
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      pdf.text(line, PAGE_MARGIN, y);
      y += LINE_HEIGHT;
    }
    y += gap;
  }

  function addSection(title) {
    y += 2;
    ensureSpace(LINE_HEIGHT * 2);
    pdf.setDrawColor(215, 223, 232);
    pdf.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 6;
    addParagraph(title, { bold: true, size: 13, gap: 2 });
  }

  pdf.setProperties({
    title: `Student report - ${student.name || student.studentId}`,
    subject: 'Student participation and session history',
    creator: 'Math Tug-of-War',
  });
  addParagraph('Student Participation Report', { bold: true, size: 20, gap: 2 });
  addParagraph(`Generated: ${formatDate(Date.now())}`, { size: 9, gap: 5 });

  addSection('Student Information');
  addParagraph(`Name: ${student.name || 'Not available'}`);
  addParagraph(`Student ID: ${student.studentId}`);
  addParagraph(`Participation records: ${participation.length}`);

  const correctAnswers = participation.reduce((sum, record) => sum + (Number(record.correctAnswers) || 0), 0);
  const totalAnswers = participation.reduce((sum, record) => sum + (Number(record.totalAnswers) || 0), 0);
  const totalScore = participation.reduce((sum, record) => sum + (Number(record.score) || 0), 0);
  addSection('Overall Performance');
  addParagraph(`Sessions joined: ${participation.length}`);
  addParagraph(`Combined score: ${totalScore}`);
  addParagraph(`Correct answers: ${correctAnswers} of ${totalAnswers}`);
  addParagraph(`Accuracy: ${accuracy(correctAnswers, totalAnswers)}`);

  addSection('Participation History');
  if (participation.length === 0) {
    addParagraph('No participation records are available for this student.');
  }
  participation.forEach((record, index) => {
    const session = sessions[record.sessionId] || {};
    const teamLabel = record.team
      ? session.teamNames?.[record.team === 'A' ? 0 : 1] || `Team ${record.team}`
      : 'Not available';
    addParagraph(`${index + 1}. ${record.sessionName || session.className || 'Class'} - ${record.sessionCode || record.sessionId}`, {
      bold: true,
      size: 11,
      gap: 1,
    });
    addParagraph(`Joined: ${formatDate(record.joinedAt)} | Status: ${record.status || 'Not available'} | Team: ${teamLabel}`);
    addParagraph(`Score: ${record.score ?? 0} | Answers: ${record.correctAnswers ?? 0}/${record.totalAnswers ?? 0} correct (${accuracy(Number(record.correctAnswers) || 0, Number(record.totalAnswers) || 0)})`);
    addParagraph(
      `Session: Grade ${session.gradeLevel ?? 'Not available'} | ${session.questionMode || 'Question mode not available'} | Started ${formatDate(session.startedAt)} | Ended ${formatDate(session.endedAt)}`
    );
    if (session.scores) {
      addParagraph(`Session team scores: ${session.teamNames?.[0] || 'Team A'} ${session.scores.teamA ?? 0} - ${session.teamNames?.[1] || 'Team B'} ${session.scores.teamB ?? 0}`);
    }
    y += 2;
  });

  const orderedQuestions = [...questions].sort((a, b) => {
    const dateA = toDate(a.askedAt)?.getTime() ?? a.presentedAt ?? 0;
    const dateB = toDate(b.askedAt)?.getTime() ?? b.presentedAt ?? 0;
    return dateA - dateB;
  });
  addSection('Questions and Responses');
  if (orderedQuestions.length === 0) {
    addParagraph('No question response records are available for this student.');
  }
  orderedQuestions.forEach((occurrence, index) => {
    const response = Object.values(occurrence.responses || {})[0] || {};
    const session = sessions[occurrence.sessionId] || {};
    const result = response.isCorrect === true
      ? 'Correct'
      : response.isCorrect === false
        ? 'Incorrect'
        : 'No result recorded';
    addParagraph(
      `${index + 1}. ${occurrence.topic || 'Subject not available'} - ${occurrence.sessionCode || occurrence.sessionId || 'Session not available'}, Question ${(Number(occurrence.questionIndex) || 0) + 1}`,
      { bold: true, size: 11, gap: 1 }
    );
    addParagraph(`Asked: ${formatDate(occurrence.askedAt || occurrence.presentedAt)} | Class: ${occurrence.className || session.className || 'Not available'} | Grade: ${occurrence.gradeLevel ?? session.gradeLevel ?? 'Not available'}`);
    addParagraph(`Question: ${occurrence.questionText || response.questionText || 'Question text not available'}`);
    addParagraph(`Response: ${response.answer || 'No answer recorded'} | Result: ${result} | Team: ${response.team || 'Not available'} | Answered: ${formatDate(response.answeredAt)}`);
    y += 2;
  });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text(
      `Math Tug-of-War | Student report | Page ${page} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  return pdf;
}

export async function downloadStudentReport(teacherId, student) {
  if (!teacherId || !student?.studentId) {
    throw new Error('A teacher account and student ID are required to generate this report.');
  }

  const participation = [];
  const sessions = {};
  let participationCursor = null;
  let hasMoreParticipation;
  do {
    const page = await getParticipationPage(
      teacherId,
      { studentId: student.studentId },
      participationCursor
    );
    participation.push(...page.records);
    Object.assign(sessions, page.sessions);
    participationCursor = page.lastDocument;
    hasMoreParticipation = page.hasMore;
  } while (hasMoreParticipation && participationCursor);

  const questions = [];
  let questionCursor = null;
  let hasMoreQuestions;
  do {
    const page = await getQuestionHistoryPage(
      teacherId,
      { studentId: student.studentId },
      questionCursor
    );
    questions.push(...page.occurrences);
    Object.assign(sessions, page.sessions);
    questionCursor = page.lastDocument;
    hasMoreQuestions = page.hasMore;
  } while (hasMoreQuestions && questionCursor);

  const pdf = await createReportDocument(student, participation, sessions, questions);
  pdf.save(safeFilename(student.name || 'Student', student.studentId));
}
