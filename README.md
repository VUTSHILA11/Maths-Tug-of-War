# 🪢 Math Tug-of-War
 
Immersive Interactive Competitive Mathematics Learning Platform for South African classrooms (Grades 4–9).
 
## Getting Started
 
### 1. Firebase Setup

1. Use the existing Firebase project **`math-tug-of-war-1c242`**. Do not create or select a different project if you need its existing session and question history.
2. Enable **Authentication → Email/Password** for teachers and **Anonymous** for students.
3. Ensure **Cloud Firestore** is enabled for analytics and historical session data.
4. Ensure **Realtime Database** is enabled for live game synchronisation.
5. Register a **Web App** under Project Settings → General if this project does not already have one.

### 2. Configure Firebase

The bundled configuration in `src/firebase/config.js` points to **`math-tug-of-war-1c242`**. To use it locally, you do not need a `.env` file.

If you want to use environment variables, copy `.env.example` to `.env` and leave the values blank to keep using the bundled configuration:

```bash
cp .env.example .env
```

Only fill in the variables when overriding configuration, and use values from the Web App registered in **`math-tug-of-war-1c242`**. Pointing them at another Firebase project will show that project's data instead of the existing history.
 
### 3. Install & Run
 
```bash
npm install
npm run dev
```
 
---
 
## How It Works
 
| Role    | Screen                      | What they do                                                                                                                          |
| ------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Teacher | `/` → Login                 | Authenticate with Firebase Authentication.                                                                                            |
| Teacher | `/dashboard`                | Create a game session and receive a six-character session code.                                                                       |
| Teacher | `/lobby`                    | Wait for students to join and start the game.                                                                                         |
| Teacher | `/game`                     | Monitor gameplay, reveal answers, and advance questions.                                                                              |
| Student | `/` → Join                  | Enter their name, session code, and select a team.                                                                                    |
| Student | `/lobby`                    | Wait for the game to begin in their team lobby.                                                                                       |
| Student | `/game`                     | Answer mathematics questions and see the rope move in real time.                                                                      |
| Both    | `/results`                  | View the winner announcement and player statistics.                                                                                   |
| Teacher | `/analytics`                | Review performance charts, accuracy, and learners who may need additional support.                                                    |
| Teacher | `/dashboard` → Question History | Search and filter historical questions, session details, student responses, and student participation.                         |
| Student | `/analytics` or `/mistakes` | Review performance and identify incorrect answers and mathematics topics that need more practice, where supported by the application. |
 
---
 
## Question Modes and Learning Support
 
* **Grade Range:** Mathematics learning activities are intended for learners in Grades 4–9.
* **Question Modes:** Learners can select from Practice, Test, and Exam-style question modes, where implemented in the application.
* **Interactive Gameplay:** Teams compete by answering mathematics questions, with scores and rope movement updated in real time.
* **Mistake History:** Incorrect answers can be recorded for individual learners to support review and revision.
* **Performance Analytics:** Analytics help learners and teachers identify incorrect answers, review performance, and recognise areas where additional practice may be needed.
 
The aim is to combine competitive, team-based gameplay with meaningful feedback so that learners can improve their mathematics skills while remaining engaged.

## Persistent Session and Question History

Live sessions continue to use Firebase Realtime Database. Session metadata and final results are stored in the existing Firestore `sessions/{sessionCode}` documents. Starting a game updates its status and start time, and finishing a game adds its end time and results without replacing the existing session record.

When a teacher presents a question, the app creates a Firestore document in `questionHistory/{sessionCode}_{questionIndex}`. The deterministic document ID makes repeated processing of the same occurrence idempotent, while the stored question text and topic preserve what was presented at that time. Student answers and timeout events are written to a Firestore `responses/{studentUid}` subcollection using a separate anonymous Firebase identity, so other students cannot read them. A repeated question in another session or at another position has a separate history record.

The teacher dashboard's **Question History** section reads records from Firestore and pages through them in batches of 25. Question, session, date, subject, student, team, status, and score filters are applied in Firestore before pagination. Team and student filters return the matching answer, team, timestamp, and correctness result where recorded. Unfiltered question history loads each question's response records using a teacher-ID constraint, consistent with the Firestore rules. Teachers can open a session's details, review its participants, and move from an individual student to their question and response history across sessions.

Each participant is stored once under `sessions/{sessionCode}/participants/{studentUid}`. Participation is first synced by the teacher when a game starts, refreshed when a student joins late, and marked completed when results are saved. Session and participant records retain join/start/end times, team, status, score, and answer totals where available. The anonymous Firebase UID is the stable student identifier available in this project; it is not a school-issued student number, and it can change if the student's browser storage is cleared or the student uses another device. The project has no separate school student-number/account model. The current game does not expose a reliable leave-early event, so participation status is recorded as `active` or `completed`, not as a guessed early departure.

The Analytics session picker includes a **Delete session** action. After confirmation, it permanently removes that session's Realtime Database record and its Firestore session, participant, question-occurrence, and response documents. Deletion is restricted to the session's teacher; Firestore deletes child records before the parent session record. If a network or permission error interrupts deletion, retry the action to finish removing remaining records.

Session documents created before this feature do not have per-question presentation timestamps or occurrence records; the app does not invent those values or rewrite old question history. Existing participant documents can be enriched when the teacher next syncs that session. Student and question searches use exact full-name matches and token matching respectively; keyword matching is not full-text ranking.

No destructive migration or database reset is required. New collections and fields are additive; stored historical data is retained unless a teacher explicitly deletes a session. The configured Firestore indexes and owner-scoped Firestore rules are deployed to **`math-tug-of-war-1c242`**. To deploy future Firestore and Realtime Database rule changes, target that project explicitly with `npx firebase-tools deploy --only firestore:indexes,firestore:rules,database --project math-tug-of-war-1c242`. The indexes cover the dashboard session list and common history-filter combinations, including collection-group participation reads. Firestore may request an additional composite index for a less common combination; follow the link in the Firebase error and add the generated index before retrying. Anonymous Authentication must be enabled for student accounts and responses. Firestore rules limit session/history access to the owning teacher and response writes to the authenticated student who joined the session. Realtime Database rules require authentication, allow anonymous clients to update their own player record, and preserve live score/gameplay updates. Do not deploy Realtime Database rules to a project that relies on additional, unrepresented database paths without first merging those rules.

---
 
## Project Structure
 
```text
src/
├── firebase/
│   └── config.js           ← Firebase initialization
├── context/
│   ├── AuthContext.jsx     ← Teacher authentication
│   └── GameContext.jsx     ← Live session state (RTDB)
├── utils/
│   ├── questions.js        ← Mathematics question generation
│   │                         for Grades 4–9, subject to implementation
│   ├── mistakeHistory.js   ← Player-specific incorrect-answer history
│   ├── questionHistory.js  ← Persisted question occurrences and responses
│   └── sessionHelpers.js   ← Create/join session helpers
├── components/
│   ├── ProtectedRoute.jsx  ← Authentication guard
│   ├── QuestionHistory.jsx ← Teacher question history and filters
│   ├── TugOfWarRope.jsx    ← Animated rope component
│   ├── CountdownTimer.jsx  ← Circular SVG timer
│   ├── FeedbackOverlay.jsx ← Correct/incorrect answer animations
│   └── Leaderboard.jsx     ← Live scores, compact and full views
└── pages/
    ├── Landing.jsx         ← Student join and teacher login
    ├── TeacherDashboard.jsx
    ├── Lobby.jsx
    ├── GameScreen.jsx     ← Core game
    ├── Results.jsx        ← End screen
    ├── Analytics.jsx      ← Chart.js performance analytics
    └── Mistakes.jsx       ← Learner incorrect-question review
```
 
---
 
## Tech Stack
 
* **React (Vite)** — Frontend application and development environment.
* **Firebase Authentication** — Teacher authentication.
* **Cloud Firestore** — Analytics and session metadata.
* **Firebase Realtime Database** — Live game synchronisation.
* **Framer Motion** — Animations and interactive visual effects.
* **Chart.js / react-chartjs-2** — Analytics charts and performance visualisation.
* **React Router v6** — Application navigation.
 
---
 
## Project Goal
 
Math Tug-of-War aims to make mathematics learning more engaging through interactive, team-based competition. It combines real-time gameplay with performance feedback to help teachers monitor learner progress and help learners identify areas for improvement.
 
The platform is intended to support mathematics learning in South African classrooms across Grades 4–9 while encouraging participation, collaboration, and continuous improvement.