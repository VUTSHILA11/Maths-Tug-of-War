# Math Tug-of-War

Math Tug-of-War is a real-time, team-based mathematics game for South African classrooms, designed for Grades 4–9. Teachers create sessions and monitor progress while students join with a session code, compete in teams, and review their answers.

## Features

### For teachers

- Create classroom game sessions with a grade level, team names, question count, time limit, and Practice, Test, or Exam mode.
- Share a session code and monitor students as they join and play.
- Follow live team scores, question progress, and the tug-of-war rope.
- Review session analytics, participant results, scores, and answer accuracy.
- Browse persistent question and student participation history. Search and filter history, inspect session details, and open a student's question and response records.
- Download a selected student's participation, session, question, response, and performance data as a paginated PDF report.
- Open a session directly from the Recent Sessions list to view that session's question history.
- Delete a session and its saved history from Analytics. Deletion is permanent and requires confirmation.

### For students

- Join a teacher's session with a name, six-character session code, and team choice.
- Play timed mathematics rounds with live feedback and team scoring.
- View the results screen and review saved incorrect and correct answers.

## Requirements

- Node.js and npm
- A Firebase project for persistent teacher/student accounts, live sessions, and history

## Getting started

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

## Firebase configuration

The default client configuration in `src/firebase/config.js` points to the existing Firebase project `math-tug-of-war-1c242`. No environment file is required to use that configuration.

To override it locally, create a `.env.local` file in the project root with the Firebase Web App values:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Use values from the Firebase Web App configuration. These are client-side settings, not server credentials; never put Firebase service-account keys or other secrets in a `VITE_` variable. Do not point to a different Firebase project if you need the existing session and question history.

Enable the following Firebase services:

1. **Authentication:** Email/Password for teachers and Anonymous authentication for students.
2. **Cloud Firestore:** persistent session metadata, participation records, question history, and student responses.
3. **Realtime Database:** live session state and gameplay synchronization.

The checked-in Firestore rules, indexes, and Realtime Database rules are configured for the existing project. Deploy them explicitly when those files change:

```bash
npx firebase-tools deploy --only firestore:indexes,firestore:rules,database --project math-tug-of-war-1c242
```

Review the rules before deploying to another project, or to a project that contains additional Realtime Database paths. Firestore may require a composite index for a less common filter combination; follow the index link in the Firebase error and add that index to `firestore.indexes.json`.

## Application screens

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Teacher and student | Teacher login or student session join |
| `/dashboard` | Teacher | Home, session creation, live monitor, recent sessions, and question/participation history |
| `/lobby` | Session participants | Wait for the game to start and view teams |
| `/game` | Session participants | Play the live mathematics game |
| `/results` | Session participants | View final team scores and answer-review links |
| `/analytics` | Teacher | Review session and participant performance; delete a session |
| `/mistakes` | Student | Review saved incorrect answers |
| `/correct-answers` | Student | Review saved correct answers |

The teacher's Question History and Student Participation views are sections of the dashboard, not separate routes. Some data-driven screens require Firebase to be configured; demo mode stores live game data in memory and does not provide persistent history.

## Data and history

- Realtime Database synchronizes live gameplay. Firestore stores session metadata, participation records, question occurrences, and responses.
- Question occurrences are recorded as questions are presented. Responses are stored separately and associated with the student identity that submitted them.
- Participation records include the available student ID, session, team, join time, status, score, and answer totals. In this project, the student ID is an anonymous Firebase UID, not a school-issued number. It may differ if browser storage is cleared or the student changes devices.
- Historical records created before question-occurrence tracking was introduced may not contain question text or presentation timestamps. The application does not invent missing history.
- The student PDF includes available participation and session information, performance totals, and that student's recorded questions and responses. Missing or unavailable values are identified rather than fabricated.
- No database migration or reset is required for the history features. New records and fields are additive unless a teacher explicitly deletes a session.

## NPM scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production app into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and publish `dist/` to the configured GitHub Pages branch |

`npm run deploy` publishes the web app to GitHub Pages; it does not deploy Firebase rules or data. Firebase Hosting is also configured in `firebase.json` to serve `dist/` with SPA route rewrites, but deploying to Firebase Hosting is a separate operation.

## Project structure

```text
src/
├── App.jsx
├── context/
│   ├── AuthContext.jsx
│   └── GameContext.jsx
├── components/
│   ├── CountdownTimer.jsx
│   ├── FeedbackOverlay.jsx
│   ├── Leaderboard.jsx
│   ├── ParticipationHistory.jsx
│   ├── ProtectedRoute.jsx
│   ├── QuestionHistory.jsx
│   └── TugOfWarRope.jsx
├── firebase/
│   └── config.js
├── pages/
│   ├── Analytics.jsx
│   ├── CorrectAnswers.jsx
│   ├── GameScreen.jsx
│   ├── Landing.jsx
│   ├── Lobby.jsx
│   ├── Mistakes.jsx
│   ├── Results.jsx
│   └── TeacherDashboard.jsx
└── utils/
    ├── mistakeHistory.js
    ├── participationHistory.js
    ├── questionHistory.js
    ├── questions.js
    ├── sessionDeletion.js
    ├── sessionHelpers.js
    ├── studentAuth.js
    └── studentReport.js
```

## Technology

- React 19 and Vite
- React Router for client-side navigation
- Firebase Authentication, Cloud Firestore, and Realtime Database
- Framer Motion for interface animations
- Chart.js and `react-chartjs-2` for analytics
- jsPDF for student report downloads
