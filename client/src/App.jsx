import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Admin/Recruiter Pages
import TestListAdmin from './pages/admin/TestList';
import TestBuilder from './pages/admin/TestBuilder';
import QuestionEditor from './pages/admin/QuestionEditor';
import TestCaseEditor from './pages/admin/TestCaseEditor';
import AssignCandidates from './pages/admin/AssignCandidates';
import ProctorMonitor from './pages/admin/ProctorMonitor';
import PlagiarismReport from './pages/admin/PlagiarismReport';
import ResultsAdmin from './pages/admin/Results';
import GradingQueue from './pages/admin/GradingQueue';

// Candidate Pages
import TestListCandidate from './pages/candidate/TestList';
import TakeTest from './pages/candidate/TakeTest';
import ResultsCandidate from './pages/candidate/Results';

export const App = () => {
  return (
    <Routes>
      {/* Public/Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin/Recruiter Routes */}
      <Route
        path="/admin/tests"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <TestListAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/new"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <TestBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <TestBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:testId/questions/new"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <QuestionEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:testId/questions/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <QuestionEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/questions/:questionId/test-cases"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <TestCaseEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:id/assign"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <AssignCandidates />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:id/monitor"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <ProctorMonitor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:testId/plagiarism"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <PlagiarismReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:testId/results"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <ResultsAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tests/:testId/grading-queue"
        element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
            <GradingQueue />
          </ProtectedRoute>
        }
      />

      {/* Candidate Routes */}
      <Route
        path="/candidate/tests"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <TestListCandidate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/tests/:testId/take"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <TakeTest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/results/:sessionId"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <ResultsCandidate />
          </ProtectedRoute>
        }
      />

      {/* Root Redirection */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
export default App;
