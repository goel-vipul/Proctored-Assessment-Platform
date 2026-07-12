-- ============================================================
-- Proctored Assessment Platform — Initial Database Schema
-- Matches SRS Section 5 exactly
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- ENUM TYPES ----

CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'candidate');
CREATE TYPE test_visibility AS ENUM ('private', 'public');
CREATE TYPE test_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE question_type AS ENUM ('coding', 'mcq', 'subjective');
CREATE TYPE assignment_status AS ENUM ('invited', 'registered');
CREATE TYPE session_status AS ENUM ('in_progress', 'submitted', 'expired');
CREATE TYPE submission_kind AS ENUM ('run', 'submit');
CREATE TYPE submission_status AS ENUM ('queued', 'running', 'completed', 'failed');
CREATE TYPE submission_verdict AS ENUM ('accepted', 'wrong_answer', 'tle', 'mle', 'runtime_error', 'compile_error', 'pending');
CREATE TYPE proctor_event_type AS ENUM ('tab_switch', 'focus_loss', 'focus_regain');

-- ---- TABLES ----

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  passing_score NUMERIC NOT NULL DEFAULT 0,
  visibility test_visibility NOT NULL DEFAULT 'private',
  status test_status NOT NULL DEFAULT 'draft',
  results_released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  type question_type NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  title TEXT,
  body TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  -- coding-specific
  allowed_languages TEXT[],
  time_limit_ms INT,
  memory_limit_mb INT,
  -- mcq-specific
  options JSONB,
  correct_option_ids TEXT[],
  multi_select BOOLEAN,
  negative_marking NUMERIC DEFAULT 0,
  -- subjective-specific
  max_length INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  is_sample BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  invite_token TEXT NOT NULL,
  status assignment_status NOT NULL DEFAULT 'invited',
  UNIQUE(test_id, candidate_email)
);

CREATE TABLE test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  hard_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status session_status NOT NULL DEFAULT 'in_progress',
  flagged BOOLEAN NOT NULL DEFAULT false,
  violation_count INT NOT NULL DEFAULT 0,
  UNIQUE(test_id, candidate_id)
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  -- mcq
  selected_option_ids TEXT[],
  -- subjective
  text_answer TEXT,
  -- manual grading
  manual_score NUMERIC,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  source_code TEXT NOT NULL,
  kind submission_kind NOT NULL,
  status submission_status NOT NULL DEFAULT 'queued',
  verdict submission_verdict NOT NULL DEFAULT 'pending',
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE code_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL,
  actual_output TEXT,
  exec_time_ms INT,
  memory_used_mb INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE plagiarism_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  submission_a_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  submission_b_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  similarity_score NUMERIC NOT NULL,
  matched_fingerprint_count INT NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  event_type proctor_event_type NOT NULL,
  client_timestamp TIMESTAMP WITH TIME ZONE,
  absence_duration_ms INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ---- INDEXES ----

CREATE INDEX idx_tests_owner ON tests(owner_id);
CREATE INDEX idx_questions_test ON questions(test_id);
CREATE INDEX idx_test_cases_question ON test_cases(question_id);
CREATE INDEX idx_assignments_test ON test_assignments(test_id);
CREATE INDEX idx_assignments_email ON test_assignments(candidate_email);
CREATE INDEX idx_sessions_test ON test_sessions(test_id);
CREATE INDEX idx_sessions_candidate ON test_sessions(candidate_id);
CREATE INDEX idx_answers_session ON answers(session_id);
CREATE INDEX idx_submissions_session ON submissions(session_id);
CREATE INDEX idx_submissions_question ON submissions(question_id);
CREATE INDEX idx_code_exec_submission ON code_executions(submission_id);
CREATE INDEX idx_plagiarism_question ON plagiarism_reports(question_id);
CREATE INDEX idx_proctoring_session ON proctoring_events(session_id);
