import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M21 14.5A8.5 8.5 0 0110.5 4a7 7 0 1010.5 10.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Header = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
  };

  const handleMenuItemClick = (action) => {
    setShowMenu(false);
    action();
  };

  return (
    <header className={`app-header neo-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <button
          type="button"
          className="brand"
          onClick={() => router.push('/')}
          aria-label="Go to Papageil home"
        >
          <span className="brand-emblem" aria-hidden="true">
            <img
              src="/logo-simple.svg"
              alt="Papageil logo"
              width="32"
              height="32"
              className="brand-image"
            />
          </span>
          <span className="brand-label">
            <span className="brand-primary">Papageil</span>
            <span className="brand-secondary">Deutsch Lernen</span>
          </span>
        </button>

        <div className="header-right">
          <div className="header-actions" aria-label="Quick actions" role="group">
            {/* Theme toggle */}
            <button type="button" className="action-chip action-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              <MoonIcon />
            </button>
          </div>

          {user ? (
            <div className="user-menu-container" ref={dropdownRef}>
              <button
                className="user-button"
                onClick={() => setShowMenu(!showMenu)}
                aria-expanded={showMenu}
                aria-haspopup="true"
                aria-label={`${showMenu ? 'Close' : 'Open'} user menu`}
              >
                <span className="user-avatar">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
                <span className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.role === 'admin' ? 'Administrator' : 'Learner'}</span>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="action-caret">
                  <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {showMenu && (
                <div className="user-dropdown" role="menu">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{user.name}</div>
                    <div className="user-dropdown-email">{user.email}</div>
                  </div>

                  <div className="user-dropdown-menu">
                     <button
                       className="dropdown-item"
                       onClick={() => handleMenuItemClick(() => router.push('/dashboard'))}
                       role="menuitem"
                     >
                       <span className="dropdown-item-icon">📊</span>
                       <span className="dropdown-item-text">Manage Learning</span>
                     </button>

                     <button
                       className="dropdown-item"
                       onClick={() => handleMenuItemClick(() => router.push('/dashboard?tab=vocabulary'))}
                       role="menuitem"
                     >
                       <span className="dropdown-item-icon">📚</span>
                       <span className="dropdown-item-text">My Vocabulary</span>
                     </button>

                    {user.role === 'admin' && (
                      <>
                        <div className="dropdown-divider" />
                        <button
                          className="dropdown-item"
                          onClick={() => handleMenuItemClick(() => router.push('/admin/dashboard'))}
                          role="menuitem"
                        >
                          <span className="dropdown-item-icon">🛠️</span>
                          <span className="dropdown-item-text">Admin Dashboard</span>
                          <span className="dropdown-item-badge">ADMIN</span>
                        </button>
                      </>
                    )}

                    <div className="dropdown-divider" />
                     <button
                       className="dropdown-item logout"
                       onClick={handleLogout}
                       role="menuitem"
                     >
                       <span className="dropdown-item-icon">🚪</span>
                       <span className="dropdown-item-text">Logout</span>
                     </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              className="user-button login-button"
              onClick={() => router.push('/auth/login')}
            >
              <span className="user-avatar">
                🔑
              </span>
              <span className="user-name">Anmelden</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
