import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import Layout from '../../components/Layout';

export const AssignCandidates = () => {
  const { id } = useParams();

  const [test, setTest] = useState(null);
  const [emailsInput, setEmailsInput] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const tRes = await client.get(`/api/tests/${id}`);
      setTest(tRes.data.test);

      const aRes = await client.get(`/api/tests/${id}/assignments`);
      setAssignments(aRes.data.assignments || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assignment records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailList = emailsInput
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (emailList.length === 0) {
      setError('Please provide at least one valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await client.post(`/api/tests/${id}/assign`, { emails: emailList });
      setSuccess(res.data.message || 'Candidates assigned.');
      setEmailsInput('');
      fetchData(); // reload
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to assign candidates.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="page-header animate-fade-in">
        <div>
          <h1>Invite Candidates</h1>
          <p>{test ? `Assign test: ${test.title}` : 'Loading...'}</p>
        </div>
        <Link to="/admin/tests" className="btn btn-secondary">
          Back
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner lg"></div>
          <p>Loading details...</p>
        </div>
      ) : (
        <div className="grid-2 animate-fade-in">
          {/* Left panel: Add candidates */}
          <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              Send Invitations
            </h3>

            <div className="form-group">
              <label className="form-label">Email Addresses (Comma Separated)</label>
              <textarea
                className="form-textarea"
                rows="6"
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="candidate1@example.com, candidate2@example.com..."
                required
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Separate multiple emails with commas. Email invitation links will be logged inside the server console.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="loading-spinner"></span> : 'Assign & Invite'}
            </button>
          </form>

          {/* Right panel: Invited list */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-xs)' }}>
              Assigned Candidates ({assignments.length})
            </h3>

            {assignments.length === 0 ? (
              <div className="empty-state">
                <p>No candidates assigned to this test yet.</p>
              </div>
            ) : (
              <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Invite Link (Mock)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const mockLink = `/register?invite=${a.invite_token}`;
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.candidate_email}</td>
                          <td>
                            <span className={`badge ${a.status === 'registered' ? 'badge-success' : 'badge-warning'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem' }}>
                            <Link to={mockLink} target="_blank" style={{ textDecoration: 'underline' }}>
                              Registration Link
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
export default AssignCandidates;
