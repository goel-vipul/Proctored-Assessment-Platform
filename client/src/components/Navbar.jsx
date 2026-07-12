import React, { useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746v5.82a6.97 6.97 0 0 1-2.115 5.02L10 19.155l-5.719-3.419a6.97 6.97 0 0 1-2.115-5.02V4.9zM10 3.328L3.834 6.28v4.44a5.273 5.273 0 0 0 1.583 3.784L10 17.39l4.583-2.886A5.273 5.273 0 0 0 16.166 10.72V6.28L10 3.328z" clipRule="evenodd" />
        </svg>
        ProctorVerify
      </Link>

      <ul className="navbar-nav">
        {user ? (
          <>
            {user.role !== 'candidate' ? (
              <>
                <li>
                  <NavLink to="/admin/tests" className={({ isActive }) => isActive ? 'active' : ''}>
                    Tests
                  </NavLink>
                </li>
              </>
            ) : (
              <li>
                <NavLink to="/candidate/tests" className={({ isActive }) => isActive ? 'active' : ''}>
                  Available Tests
                </NavLink>
              </li>
            )}
            <li className="nav-user">
              <span className="nav-role-badge">{user.role}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {user.name}
              </span>
            </li>
            <li>
              <button onClick={handleLogout} className="btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>
                Login
              </Link>
            </li>
            <li>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ display: 'inline-flex' }}>
                Register
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};
export default Navbar;
