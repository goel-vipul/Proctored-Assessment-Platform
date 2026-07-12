# Software Requirements Specification
## Proctored Assessment Platform with Anti-Cheat

Version 1.0

---

## 1. Project Overview

### 1.1 Purpose
A web platform for companies and colleges to conduct technical assessments (mock placements, hiring tests) with live sandboxed code execution, MCQ/subjective questions, automated plagiarism detection on code submissions, and browser-behavior proctoring (tab-switch / focus-loss tracking) with a live admin monitoring dashboard.

### 1.2 Scope
The system covers:
- Test creation and management by Admins/Recruiters
- Candidate registration/invitation and test-taking flow
- Sandboxed, multi-language code execution at scale via a job queue + worker pool
- Automated plagiarism detection across candidate code submissions
- Real-time proctoring signal capture and live admin visibility
- Automated + manual scoring and results/reporting

Out of scope (explicitly NOT built unless stated): webcam/audio proctoring, AI-based face detection, screen recording, IDE plugins, mobile apps.

### 1.3 User Roles
1. **Admin** — full system access: manages organizations, users, all tests, all reports, system configuration.
2. **Recruiter/Instructor** — creates and manages their own tests, invites candidates, views results and proctoring reports and plagiarism reports for tests they own.
3. **Candidate** — registers/accepts invite, takes assigned tests, writes/submits code, answers MCQ/subjective questions.

---

## 2. Functional Requirements

### 2.1 Authentication & User Management
- JWT-based authentication (access token + refresh token).
- Password hashing with bcrypt.
- Role-based access control (RBAC) middleware on all API routes, enforcing Admin / Recruiter / Candidate permissions.
- Recruiter/Admin can invite candidates via email (invite link with token tied to a specific test).
- Candidate signup can happen via invite link (auto-associates candidate with the test) or open self-registration if a test is public.
- Session/token expiry handling; refresh token rotation.

### 2.2 Test Creation & Management (Admin/Recruiter)
- Create a Test with: title, description, duration (minutes), start/end window, shuffle questions (bool), passing score, visibility (private/invite-only or public).
- Add Questions to a test, each of one type:
  - **Coding**: title, problem statement (markdown), input/output format, constraints, allowed languages (subset of C++/Java/Python/JavaScript), time limit (ms) and memory limit (MB) per test case, one or more test cases (input + expected output, each marked sample or hidden), scoring weight.
  - **MCQ**: question text, options (2–6), one or more correct options (single-select or multi-select flag), scoring weight, negative marking value (optional).
  - **Subjective**: question text, scoring weight, max word/char limit, requires manual grading by Recruiter/Admin post-submission.
- Reorder questions, edit/delete questions (only before a test is published/has active sessions).
- Publish/unpublish a test.
- Assign a test to a list of candidates (by email) or make it open via invite link.
- Clone an existing test.

### 2.3 Candidate Test-Taking Flow
- Candidate sees list of assigned/available tests with status (upcoming, active, completed, expired).
- On starting a test: server records `test_session` with start timestamp, computes hard end timestamp (start + duration, capped by test end window).
- Test-taking UI:
  - Coding questions rendered with Monaco Editor, language selector (restricted to question's allowed languages), "Run" (executes against sample test cases only, shows output) and "Submit" (executes against all test cases including hidden, records final submission).
  - MCQ questions rendered as selectable options, autosave on change.
  - Subjective questions rendered as a text area, autosave on change (debounced).
- Autosave of all answers periodically and on question navigation, so a refresh/disconnect does not lose progress.
- Countdown timer enforced both client-side (UI) and server-side (session hard end timestamp is authoritative — server rejects submissions after expiry).
- On timer expiry or manual "Submit Test", the session is locked (`submitted` status) and no further writes are accepted.

### 2.4 Code Execution Engine (Sandboxed, Queue-Managed)
- **Trigger**: candidate clicks "Run" (sample test cases) or "Submit" (all test cases) on a coding question.
- **Queue**: request is pushed as a job to a BullMQ queue backed by Redis. Job payload: submission id, language, source code, list of test cases (stdin + expected stdout), time limit, memory limit.
- **Worker pool**: a configurable number of Node.js worker processes consume jobs from the queue concurrently (concurrency configurable via env var, e.g. `WORKER_CONCURRENCY`).
- **Execution isolation**: each job is executed inside a fresh, ephemeral Docker container:
  - One pre-built Docker image per supported language (C++ with g++, Java with JDK, Python 3, Node.js), each image containing only the compiler/interpreter and no network tools.
  - Container is created with: `--network none` (no network access), `--memory` and `--memory-swap` set to the question's memory limit, `--cpus` limit, `--pids-limit` to prevent fork bombs, a non-root user, and a read-only root filesystem except a scratch `/tmp` work directory.
  - Source code is written to the scratch dir, compiled if needed (C++/Java), then run against each test case's stdin with a wall-clock timeout enforced both by the container run command and a Node-side `setTimeout` kill fallback.
  - Container is destroyed immediately after execution (or after timeout kill) — no reuse of containers across submissions.
- **Verdict computation per test case**: `Accepted` (stdout matches expected, whitespace-trimmed comparison), `Wrong Answer`, `Time Limit Exceeded`, `Memory Limit Exceeded`, `Runtime Error`, `Compilation Error`.
- **Result aggregation**: overall submission verdict + per-test-case breakdown + total execution time, stored in `code_executions` table, pushed back to the candidate's client via WebSocket (since execution is async and queue-based, not a blocking HTTP response).
- **Scaling**: worker pool size is horizontally scalable — multiple worker processes/containers can be started, all pulling from the same Redis-backed BullMQ queue, so throughput scales with available worker instances.
- **Queue observability**: Admin can view queue depth, active jobs, failed jobs (via BullMQ dashboard/API).

### 2.5 Plagiarism Detection (k-gram Winnowing Fingerprinting)
- Runs automatically after a test's end window closes (or manually triggered by Recruiter/Admin), comparing all final code submissions **within the same coding question** across candidates.
- **Algorithm**:
  1. Normalize source code: strip comments, strip whitespace/newlines, optionally normalize identifier names (tokenization pass) to reduce trivial evasion (renaming variables).
  2. Generate k-grams: sliding window of `k` consecutive tokens/characters (k configurable, default 25 chars) over the normalized code.
  3. Hash each k-gram (e.g. rolling hash / simple hash function) to produce a sequence of hash values.
  4. Winnowing: within each window of `w` consecutive hashes (w configurable, default 4), select the minimum hash value as a fingerprint (ties broken by rightmost occurrence). This produces a reduced fingerprint set per submission that is robust to small insertions/deletions.
  5. Compare fingerprint sets pairwise between all submissions for the same question using Jaccard similarity (intersection / union of fingerprint sets).
  6. Any pair exceeding a configurable similarity threshold (default 70%) is flagged as a potential plagiarism match.
- **Storage**: `plagiarism_reports` table stores pairwise matches (submission_a_id, submission_b_id, similarity_score, matched_fingerprint_count, generated_at).
- **Recruiter/Admin view**: a report per test/question listing flagged pairs sorted by similarity score descending, with a side-by-side code diff view.
- Plagiarism check only compares submissions to the same question (never across unrelated questions/tests).

### 2.6 Proctoring System (Real-Time, WebSocket-Based)
- **Scope of monitoring**: browser tab-switch events and window/focus-loss events only (via `document.visibilitychange` and `window.blur`/`window.focus` listeners on the candidate's client). No webcam/audio/screen capture.
- **Client behavior**: on every detected tab-switch or focus-loss event during an active test session, the candidate's client emits a WebSocket event to the server containing: session id, event type (`tab_switch` | `focus_loss` | `focus_regain`), client timestamp, and duration of the previous absence (computed on regain).
- **Server behavior**:
  - Persists every event in a `proctoring_events` table linked to the `test_session`.
  - Maintains a running per-session violation count.
  - If violation count crosses a configurable threshold (default 3), the session is auto-flagged (`flagged = true`) for Recruiter/Admin review; the candidate is NOT auto-disqualified, only flagged.
  - Broadcasts each incoming event in real time, over a separate WebSocket channel/room, to any connected Admin/Recruiter dashboard clients currently monitoring that test.
- **Live Admin Dashboard**:
  - Shows all currently active sessions for a test, with a live-updating violation counter per candidate.
  - Flagged sessions are visually distinguished (e.g., sorted to top / marked).
  - Clicking a session shows a chronological event timeline (all tab-switch/focus-loss events with timestamps and absence durations).
  - Dashboard updates push in real time via WebSocket (no polling) as new proctoring events arrive.

### 2.7 Scoring & Results
- Coding questions auto-scored: (test cases passed / total test cases) × question weight.
- MCQ questions auto-scored on submit: full weight if correct option(s) match exactly (for multi-select), 0 otherwise; negative marking subtracted if configured and answer is wrong.
- Subjective questions require manual grading: Recruiter/Admin assigns a score (0 to question weight) with optional feedback text, after the test session is submitted.
- Total score = sum of all question scores; percentage and pass/fail computed against the test's passing score.
- Candidate can view their own results and score breakdown after grading is finalized (Recruiter/Admin controlled release toggle).

### 2.8 Recruiter/Admin Dashboard
- Test list with candidate progress (not started / in progress / submitted) per test.
- Results table: score, rank, time taken, per-question breakdown, plagiarism flag indicator, proctoring flag indicator — sortable/filterable, exportable to CSV.
- Plagiarism report view (2.5).
- Live proctoring monitor view (2.6).
- Manual grading queue for subjective answers.

---

## 3. Non-Functional Requirements
- **Isolation & Security**: candidate code must never have network access or host filesystem access beyond its ephemeral scratch directory; container resource limits are mandatory on every execution.
- **Concurrency**: system must support many simultaneous test-takers; code execution is decoupled from the HTTP request/response cycle via the job queue so a burst of "Run"/"Submit" clicks does not block the API server.
- **Reliability**: if a worker crashes mid-job, BullMQ's job retry/stall-detection must requeue the job (configurable max retries) rather than losing the submission.
- **Auditability**: all submissions, code execution results, proctoring events, and plagiarism reports are immutably stored (append-only; no destructive updates to historical records).
- **Server-authoritative timing**: all test duration/expiry enforcement is done server-side; client timers are advisory only.

---

## 4. System Architecture

```
                        ┌───────────────────┐
                        │   React Frontend   │
                        │ (Monaco Editor,     │
                        │  test UI, dashboards)│
                        └─────────┬──────────┘
                       HTTP(S) │      │ WebSocket
                                │      │
                        ┌───────▼──────▼───────┐
                        │  Node/Express API      │
                        │  + WebSocket Server    │
                        │  (auth, tests, scoring,│
                        │   proctoring relay)    │
                        └───┬───────────┬───────┘
                            │           │
                 ┌──────────▼──┐   ┌────▼────────────┐
                 │ PostgreSQL   │   │ Redis (BullMQ    │
                 │ (all persist.│   │  job queue)      │
                 │  data)       │   └────┬─────────────┘
                 └──────────────┘        │
                                ┌─────────▼─────────┐
                                │  Worker Pool        │
                                │  (Node processes,   │
                                │   N instances)      │
                                └─────────┬───────────┘
                                          │ spawns
                                ┌─────────▼───────────┐
                                │ Ephemeral Docker      │
                                │ containers per job    │
                                │ (C++/Java/Py/JS images)│
                                └───────────────────────┘
```

Flow for code execution:
1. Client → API: submit code (HTTP POST).
2. API validates, writes `submission` row (status `queued`), pushes job to BullMQ.
3. API responds immediately with submission id (`202 Accepted` style).
4. Worker picks job, runs Docker container(s) per test case, computes verdicts.
5. Worker writes `code_executions` result row(s), updates submission status.
6. Worker (or API listening to job completion) pushes result to client via WebSocket.

Flow for proctoring:
1. Candidate client detects event → emits WebSocket message to server.
2. Server persists event, updates session violation count, checks flag threshold.
3. Server broadcasts event to admin dashboard room subscribed to that test/session.

---

## 5. Database Schema (PostgreSQL)

```
users
  id UUID PK
  name TEXT
  email TEXT UNIQUE
  password_hash TEXT
  role ENUM('admin','recruiter','candidate')
  created_at TIMESTAMP

tests
  id UUID PK
  owner_id UUID FK -> users.id
  title TEXT
  description TEXT
  duration_minutes INT
  start_at TIMESTAMP
  end_at TIMESTAMP
  shuffle_questions BOOLEAN
  passing_score NUMERIC
  visibility ENUM('private','public')
  status ENUM('draft','published','closed')
  created_at TIMESTAMP

questions
  id UUID PK
  test_id UUID FK -> tests.id
  type ENUM('coding','mcq','subjective')
  order_index INT
  title TEXT
  body TEXT
  weight NUMERIC
  -- coding-specific
  allowed_languages TEXT[]        -- subset of {cpp,java,python,javascript}
  time_limit_ms INT
  memory_limit_mb INT
  -- mcq-specific
  options JSONB                   -- [{id, text}]
  correct_option_ids TEXT[]
  multi_select BOOLEAN
  negative_marking NUMERIC
  -- subjective-specific
  max_length INT

test_cases
  id UUID PK
  question_id UUID FK -> questions.id
  input TEXT
  expected_output TEXT
  is_sample BOOLEAN

test_assignments
  id UUID PK
  test_id UUID FK -> tests.id
  candidate_email TEXT
  invite_token TEXT
  status ENUM('invited','registered')

test_sessions
  id UUID PK
  test_id UUID FK -> tests.id
  candidate_id UUID FK -> users.id
  started_at TIMESTAMP
  hard_end_at TIMESTAMP
  submitted_at TIMESTAMP
  status ENUM('in_progress','submitted','expired')
  flagged BOOLEAN DEFAULT false
  violation_count INT DEFAULT 0

answers
  id UUID PK
  session_id UUID FK -> test_sessions.id
  question_id UUID FK -> questions.id
  -- mcq
  selected_option_ids TEXT[]
  -- subjective
  text_answer TEXT
  manual_score NUMERIC
  graded_by UUID FK -> users.id
  graded_at TIMESTAMP
  updated_at TIMESTAMP

submissions
  id UUID PK
  session_id UUID FK -> test_sessions.id
  question_id UUID FK -> questions.id
  language TEXT
  source_code TEXT
  kind ENUM('run','submit')       -- run = sample only, submit = final/all test cases
  status ENUM('queued','running','completed','failed')
  verdict ENUM('accepted','wrong_answer','tle','mle','runtime_error','compile_error','pending')
  score NUMERIC
  created_at TIMESTAMP

code_executions
  id UUID PK
  submission_id UUID FK -> submissions.id
  test_case_id UUID FK -> test_cases.id
  verdict TEXT
  actual_output TEXT
  exec_time_ms INT
  memory_used_mb INT
  created_at TIMESTAMP

plagiarism_reports
  id UUID PK
  question_id UUID FK -> questions.id
  submission_a_id UUID FK -> submissions.id
  submission_b_id UUID FK -> submissions.id
  similarity_score NUMERIC
  matched_fingerprint_count INT
  generated_at TIMESTAMP

proctoring_events
  id UUID PK
  session_id UUID FK -> test_sessions.id
  event_type ENUM('tab_switch','focus_loss','focus_regain')
  client_timestamp TIMESTAMP
  absence_duration_ms INT
  created_at TIMESTAMP
```

---

## 6. API Endpoints (REST, JWT-protected unless noted)

```
Auth
  POST   /api/auth/register              (public / invite-token based)
  POST   /api/auth/login
  POST   /api/auth/refresh

Tests (Admin/Recruiter)
  POST   /api/tests
  GET    /api/tests
  GET    /api/tests/:id
  PATCH  /api/tests/:id
  DELETE /api/tests/:id
  POST   /api/tests/:id/publish
  POST   /api/tests/:id/assign            (body: candidate emails[])
  POST   /api/tests/:id/clone

Questions (Admin/Recruiter)
  POST   /api/tests/:testId/questions
  PATCH  /api/questions/:id
  DELETE /api/questions/:id
  POST   /api/questions/:id/test-cases
  PATCH  /api/test-cases/:id
  DELETE /api/test-cases/:id

Candidate Test-Taking
  GET    /api/candidate/tests             (assigned/available tests)
  POST   /api/candidate/tests/:testId/start   -> creates test_session
  GET    /api/candidate/sessions/:sessionId
  PUT    /api/candidate/sessions/:sessionId/answers/:questionId  (mcq/subjective autosave)
  POST   /api/candidate/sessions/:sessionId/submit               (finalize whole test)

Code Execution
  POST   /api/submissions                 (body: sessionId, questionId, language, code, kind: 'run'|'submit')
  GET    /api/submissions/:id             (poll fallback; primary channel is WebSocket)

Results & Grading
  GET    /api/tests/:id/results
  GET    /api/results/:sessionId
  PATCH  /api/answers/:id/grade           (manual grading for subjective, Recruiter/Admin)
  GET    /api/tests/:id/results/export    (CSV)

Plagiarism
  POST   /api/tests/:id/plagiarism/run    (manual trigger, Recruiter/Admin)
  GET    /api/questions/:id/plagiarism

Proctoring
  GET    /api/sessions/:id/proctoring-events
```

---

## 7. WebSocket Events

```
Client -> Server
  "join_session"           { sessionId }               candidate joins their own test-session room
  "proctor:violation"      { sessionId, eventType, clientTimestamp, absenceDurationMs }
  "admin:watch_test"       { testId }                   admin subscribes to a test's live room

Server -> Client
  "submission:result"      { submissionId, status, verdict, score, perTestCase[] }
  "proctor:event"          { sessionId, candidateId, eventType, timestamp, absenceDurationMs, violationCount }
  "proctor:flagged"        { sessionId, candidateId, violationCount }
  "session:expired"        { sessionId }                 forces client to lock/submit
```

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Monaco Editor |
| Backend API | Node.js, Express |
| Realtime | WebSockets (ws / socket.io) |
| Job Queue | BullMQ + Redis |
| Sandbox Execution | Docker (per-language images), spawned/managed by worker processes |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens), bcrypt |
| Orchestration (dev/deploy) | Docker Compose |
| Plagiarism | Custom k-gram winnowing implementation (no external service) |

---

## 9. Build Workflow (Phased Implementation Plan for AI Agent)

**Phase 1 — Foundations**
1. Scaffold monorepo: `/client` (React), `/server` (Express API), `/worker` (execution worker), `/docker` (language Dockerfiles + docker-compose.yml).
2. Set up PostgreSQL schema/migrations per Section 5.
3. Implement auth (register/login/refresh, JWT middleware, RBAC).

**Phase 2 — Test & Question Management**
4. CRUD APIs for tests, questions, test cases (Admin/Recruiter only, RBAC-enforced).
5. Admin/Recruiter frontend: test builder UI (create test, add coding/MCQ/subjective questions, add test cases).
6. Candidate assignment/invite flow.

**Phase 3 — Candidate Test-Taking**
7. Candidate frontend: test list, start-test flow, question navigation, Monaco Editor integration for coding questions, MCQ/subjective UI, autosave.
8. Server-side session timer enforcement (hard_end_at) and submit/lock logic.

**Phase 4 — Code Execution Engine**
9. Build per-language Docker images (C++, Java, Python, JavaScript) with compile/run scripts, no network, resource-limited.
10. Set up Redis + BullMQ queue; API pushes submission jobs on Run/Submit.
11. Build worker process(es): pull job, spin ephemeral container, execute against test case(s), collect verdict, write `code_executions`/`submissions`, emit WebSocket result.
12. Wire WebSocket layer for pushing async execution results to the candidate client.

**Phase 5 — Proctoring**
13. Candidate client: visibility/blur listeners emitting `proctor:violation` events over WebSocket.
14. Server: persist `proctoring_events`, maintain violation count, threshold-based auto-flag.
15. Admin dashboard: live session list + live event feed via `admin:watch_test` subscription, per-session timeline view.

**Phase 6 — Plagiarism Detection**
16. Implement k-gram winnowing module (normalize → k-gram → hash → winnow → fingerprint set).
17. Pairwise similarity computation across submissions per question; store in `plagiarism_reports`.
18. Trigger: manual endpoint + optional automatic run when a test's `end_at` passes.
19. Recruiter/Admin plagiarism report UI with diff view.

**Phase 7 — Scoring, Results, Grading**
20. Auto-scoring logic for coding (test case pass ratio × weight) and MCQ (exact match, negative marking).
21. Manual grading UI/API for subjective answers.
22. Results dashboard: score table, filters, CSV export, per-candidate breakdown, plagiarism/proctoring flag indicators.
23. Candidate results view (post-release).

**Phase 8 — Hardening**
24. Load-test the queue/worker pool under concurrent submissions; tune `WORKER_CONCURRENCY` and container resource limits.
25. Verify sandbox isolation (no network egress, filesystem containment, fork-bomb protection via `--pids-limit`).
26. Finalize Docker Compose for full local/deployment stack (client, server, worker(s), postgres, redis).

---

## 10. Suggested Folder Structure

```
/client
  /src
    /pages          (TestList, TestBuilder, TakeTest, AdminDashboard, ProctorMonitor, Results)
    /components      (MonacoEditor wrapper, QuestionRenderer, Timer, etc.)
    /hooks           (useWebSocket, useAutosave, useTestTimer)
    /api             (REST client)
/server
  /src
    /routes          (auth, tests, questions, submissions, results, proctoring, plagiarism)
    /controllers
    /models          (PostgreSQL query layer)
    /middleware       (auth, rbac)
    /websocket        (socket handlers, room management)
    /queue            (BullMQ producer)
/worker
  /src
    /executors        (per-language run/compile logic)
    /sandbox           (Docker container lifecycle management)
    /plagiarism        (k-gram winnowing implementation)
/docker
  /images
    /cpp/Dockerfile
    /java/Dockerfile
    /python/Dockerfile
    /javascript/Dockerfile
  docker-compose.yml
```

---

## 11. Security Considerations
- Docker containers run with `--network none`, non-root user, read-only root filesystem (except scratch `/tmp`), CPU/memory limits, and `--pids-limit`.
- No candidate code ever touches the host filesystem outside its own ephemeral scratch directory; container is destroyed after each execution.
- JWT secrets, DB credentials, Redis credentials via environment variables, never hardcoded.
- RBAC enforced on every route; candidates can only access their own sessions/submissions; recruiters can only access tests they own (unless Admin).
- Rate limiting on submission endpoint per candidate session to prevent queue-flooding abuse.
- All hidden test cases are never sent to the client; only sample test case results are visible on "Run".
