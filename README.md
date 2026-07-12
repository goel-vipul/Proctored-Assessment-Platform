# ProctorVerify: Proctored Technical Assessment Platform with Sandboxed Code Execution

A high-performance, self-hosted technical assessment platform built for colleges, recruiters, and companies to conduct coding and MCQ tests. The platform features asynchronous sandboxed code execution, real-time browser-behavior proctoring, and automated plagiarism detection using k-gram document winnowing.

---

## Key Features

### 🖥️ Sandboxed Code Execution
- Candidate code executes asynchronously in isolated, ephemeral Docker containers (C++, Java, Python, and JavaScript/Node.js).
- **Strict Security Boundaries**: All execution containers are created with disabled networking (`--network none`), read-only root filesystems (with an isolated `/tmp` workspace), memory limits, CPU quotas, and pid-limits to prevent resource abuse or fork bombs.
- **Asynchronous Processing**: Requests are pushed to a Redis-backed BullMQ job queue. Worker processes consume jobs, execute test cases, compile verdicts, and push execution outcomes back to candidate browsers in real time via WebSockets.

### 🛡️ Live Anti-Cheat Proctoring
- **Active Focus Loss Signal Relays**: Monitors candidate tab-switching (`visibilitychange`) and window focus transitions (`blur` / `focus` listeners).
- Focus changes are logged on the server and broadcast in real time to the monitoring dashboard.
- Sessions exceeding the focus-loss limit are automatically flagged for recruiter evaluation (without auto-disqualifying, leaving the final decision to human admins).

### 🔍 Plagiarism Winnowing Algorithm
- Built-in plagiarism detector using the **k-gram Winnowing Algorithm** (Schleimer, Wilkerson, Aiken).
- Normalizes submission code by stripping comments, parsing strings, and mapping user-defined variables/functions to sequential tokens to evade trivial renaming attempts.
- Generates rolling hashes over character sequences, selects fingerprint coordinates within window strides, and matches submissions pairwise using Jaccard Similarity.
- Admins get a side-by-side split screen showing matching code snippets flagged above a configurable similarity threshold (default 70%).

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Monaco Editor, Axios (JWT interceptors & refresh rotation) |
| **Backend API** | Node.js, Express, Socket.io (WebSocket rooms & JWT auth) |
| **Queue Layer** | BullMQ, Redis |
| **Database** | PostgreSQL (Raw SQL migration scripts) |
| **Sandbox System** | Docker Engine, Ephemeral compiler/interpreter runtimes |
| **Orchestration** | Docker Compose |

---

## Monorepo Architecture

```
├── client/                     # Vite + React Frontend SPA
│   ├── src/components/         # Monaco wrappers, builders, timelines, diffs
│   ├── src/hooks/              # useWebSocket, useProctoring, useTestTimer
│   └── src/pages/              # Auth, Candidate test workspace, Recruiter panel
├── server/                     # Express REST API & WebSockets Relay
│   ├── src/config/             # DB & Redis connection pools
│   ├── src/models/             # Database queries & CRUD operations
│   ├── src/controllers/        # Authentication, Test setup, Grading, Submissions
│   └── src/websocket/          # Socket handlers & Room namespaces
├── worker/                     # BullMQ Queue Consumers & Plagiarism Pipeline
│   ├── src/sandbox/            # Docker container lifecycle executors
│   └── src/plagiarism/         # Normalizer, k-gram, winnowing fingerprinting
├── docker/
│   └── images/                 # Dockerfiles for sandbox languages (C++, Java, Python, JS)
└── docker-compose.yml          # Local multi-container deployment configuration
```

---

## Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- [PostgreSQL](https://www.postgresql.org/) (if running services locally without Docker)
- [Redis](https://redis.io/) (if running services locally without Docker)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/proctor-verify.git
   cd proctor-verify
   ```

2. **Configure Environment Variables**
   Copy the `.env.example` template at the root directory:
   ```bash
   cp .env.example .env
   ```
   *Adjust port configurations, Postgres connection strings, Redis credentials, and security thresholds as required.*

3. **Build the Sandbox Images**
   The execution sandbox uses dedicated Docker images per language. You must build these local images first:
   ```bash
   npm run docker:build-langs
   ```

---

## Running the Platform

### Option A: Complete Docker Compose Stack
To spin up all services—including database dependencies, Redis queue handlers, the web backend, background workers, and the frontend client—simply execute:
```bash
docker-compose up --build
```
- Access Frontend Client: `http://localhost:3000`
- Access Backend API: `http://localhost:4000`

### Option B: Local Development
If you prefer running services individually on your host system:

1. **Install Dependencies**
   Run from root to install package dependencies across all workspaces:
   ```bash
   npm install
   ```

2. **Database Migration**
   Execute SQL migrations to create schema structures:
   ```bash
   npm run migrate
   ```

3. **Start Servers**
   - **Backend API**: `npm run dev:server` (Starts at port `4000`)
   - **Background Workers**: `npm run dev:worker` (Listens to Redis queues)
   - **Frontend Client**: `npm run dev:client` (Starts at port `3000`)

---

## Verifying the Proctoring & Plagiarism Workflow

### 1. Test Proctoring Alerts
Log in as a candidate and open a test session. Switch tabs or minimize your browser window. Now check the Recruiter's Live Monitor Panel for that test session. You should immediately see:
- Real-time updates of the candidate's violation counter.
- A chronological timeline log showing the exact timing of blur occurrences and duration of tab absences.
- Auto-flag warnings when candidate violations exceed the threshold.

### 2. Side-by-Side Plagiarism Analysis
To verify the plagiarism detection algorithm:
1. Log in as Candidate A and submit a python coding task solution.
2. Log in as Candidate B and submit a similar solution (even with modified variable names or reordered function comments).
3. As a Recruiter, trigger a plagiarism scan on the test.
4. Review the Plagiarism Audit Dashboard. The matches list will highlight the similarity index between the two candidates and display a side-by-side split screen showing exactly matching segments.
