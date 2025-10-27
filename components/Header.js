import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const isHomePage = router.pathname === '/';

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
    <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-content">
        <div className="logo" onClick={() => router.push('/')}>
          <span className="logo-icon">🚀</span>
          <span className="logo-text">LinguaLearn</span>
        </div>

        {/* Navigation removed for clean, modern design */}

        <div className="header-right">
          {user ? (
            <div className="user-menu-container" ref={dropdownRef}>
              <button
                className="user-button"
                onClick={() => setShowMenu(!showMenu)}
                aria-expanded={showMenu}
                aria-haspopup="true"
                aria-label={`${showMenu ? 'Close' : 'Open'} user menu`}
              >
                <span className="user-avatar">👤</span>
                <span className="user-name">{user.name}</span>
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
                      <span className="dropdown-item-text">Lernen verwalten</span>
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => handleMenuItemClick(() => router.push('/dashboard?tab=vocabulary'))}
                      role="menuitem"
                    >
                      <span className="dropdown-item-icon">📚</span>
                      <span className="dropdown-item-text">Mein Wortschatz</span>
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
                      <span className="dropdown-item-text">Abmelden</span>
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
              <span className="nav-icon">🔑</span>
              <span className="user-name">Anmelden</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
