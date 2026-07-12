import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const inviteToken = searchParams.get('invite');

  // If registering via an invite token, default/lock role to candidate
  useEffect(() => {
    if (inviteToken) {
      setRole('candidate');
    }
  }, [inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register(name, email, password, role, inviteToken);
      if (user.role === 'candidate') {
        navigate('/candidate/tests');
      } else {
        navigate('/admin/tests');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Registration failed. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Get Started</h1>
        <p className="auth-subtitle">Create your new platform profile</p>

        {inviteToken && (
          <div className="alert alert-info">
            Registering via invitation link. You will be auto-registered for the assigned test.
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength="6"
            />
          </div>

          {!inviteToken && (
            <div className="form-group">
              <label className="form-label">Profile Role</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="candidate">Candidate (Test Taker)</option>
                <option value="recruiter">Recruiter (Test Creator)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-md)' }} disabled={loading}>
            {loading ? <span className="loading-spinner"></span> : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
