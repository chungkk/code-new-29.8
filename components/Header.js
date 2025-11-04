import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
    <path d="M10.2 10.3l6.6-2.8-2.8 6.6-6.6 2.8z" fill="currentColor" opacity="0.85" />
  </svg>
);

const PulseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M3 13h3.6l2.1-4.5 3.8 7.6 2.6-5.2 1.7 2.1H21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M5 16.5a2.5 2.5 0 012.5-2.5v4a2.5 2.5 0 01-2.5-2.5v-3A7 7 0 0119 12v3a2.5 2.5 0 01-2.5 2.5v-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 5a7 7 0 00-7 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

const NotebookIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5" y="4" width="14" height="16" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 4v16" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
  </svg>
);

const WaveIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4 15c1.2-1.5 2.7-1.5 3.9 0 1.2 1.5 2.7 1.5 3.9 0 1.2-1.5 2.7-1.5 3.9 0 1.2 1.5 2.7 1.5 3.9 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M4 9c1.2-1.5 2.7-1.5 3.9 0 1.2 1.5 2.7 1.5 3.9 0 1.2-1.5 2.7-1.5 3.9 0 1.2 1.5 2.7 1.5 3.9 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);

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

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M18 16v-4a6 6 0 10-12 0v4l-1.5 1.5h15z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M14 19a2 2 0 01-4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DropIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 5s-4 4.5-4 7.5a4 4 0 108 0C16 9.5 12 5 12 5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HamburgerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M3 12h18M3 6h18M3 18h18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NAV_ITEMS = [
  {
    label: 'Overview',
    description: 'Daily insights',
    href: '/',
    Icon: CompassIcon,
  },
  {
    label: 'Dashboard',
    description: 'Progress & stats',
    href: '/dashboard',
    Icon: PulseIcon,
  },
  {
    label: 'Shadowing Lab',
    description: 'Pronunciation flow',
    href: '/shadowing',
    Icon: HeadphonesIcon,
  },
  {
    label: 'Dictation Studio',
    description: 'Listening drills',
    href: '/dictation',
    Icon: WaveIcon,
  },
  {
    label: 'Notebook',
    description: 'Personal notes',
    href: '/self-lesson',
    Icon: NotebookIcon,
  },
];

const Header = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHydrationReminder, setShowHydrationReminder] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);
  const hydrationRef = useRef(null);
  const mobileNavRef = useRef(null);

  const activeRoute = useMemo(() => router.pathname, [router.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (hydrationRef.current && !hydrationRef.current.contains(event.target)) {
        setShowHydrationReminder(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target)) {
        setShowMobileNav(false);
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

  const handleLanguageToggle = () => {
    setLanguage(language === 'EN' ? 'DE' : 'EN');
    // TODO: Implement actual language switching logic
  };

  const handleNotificationsToggle = () => {
    setShowNotifications(!showNotifications);
    setShowHydrationReminder(false);
  };

  const handleHydrationToggle = () => {
    setShowHydrationReminder(!showHydrationReminder);
    setShowNotifications(false);
    setShowMobileNav(false);
  };

  const handleMobileNavToggle = () => {
    setShowMobileNav(!showMobileNav);
    setShowNotifications(false);
    setShowHydrationReminder(false);
    setShowMenu(false);
  };

  const isNavItemActive = (href) => {
    if (href === '/') {
      return activeRoute === '/';
    }
    return activeRoute.startsWith(href);
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

        {/* Mobile Navigation Toggle */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={handleMobileNavToggle}
          aria-expanded={showMobileNav}
          aria-label="Toggle navigation menu"
        >
          <HamburgerIcon />
        </button>

        {/* Desktop Navigation */}
        <nav className="primary-nav desktop-nav" aria-label="Main navigation">
           {NAV_ITEMS.slice(0, 3).map(({ label, description, href, Icon }) => {
             const active = isNavItemActive(href);
             return (
               <button
                 key={label}
                 type="button"
                 className={`nav-item ${active ? 'active' : ''}`}
                 onClick={() => router.push(href)}
                 aria-current={active ? 'page' : undefined}
               >
                 <span className="nav-icon-wrapper" aria-hidden="true">
                   <Icon />
                 </span>
                 <span className="nav-copy">
                   <span className="nav-label">{label}</span>
                   <span className="nav-description">{description}</span>
                 </span>
               </button>
             );
           })}
         </nav>

        <div className="header-right">
        <div className="header-actions" aria-label="Quick actions" role="group">
            {/* Theme toggle - always visible */}
            <button type="button" className="action-chip action-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              <MoonIcon />
            </button>

            {/* Language selector - hidden on mobile */}
            <button type="button" className="action-chip action-language desktop-only" onClick={handleLanguageToggle} aria-label="Change language">
              <span className="action-flag" aria-hidden="true">
                {language}
              </span>
              <span className="action-label">{language === 'EN' ? 'English' : 'Deutsch'}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="action-caret">
                <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>

            {/* Notifications - hidden on mobile */}
            <div className="action-dropdown-container desktop-only" ref={notificationsRef}>
              <button type="button" className="action-chip" onClick={handleNotificationsToggle} aria-expanded={showNotifications} aria-haspopup="true" aria-label="Notifications">
                <BellIcon />
              </button>
              {showNotifications && (
                <div className="action-dropdown notifications-dropdown" role="menu">
                  <div className="dropdown-header">Notifications</div>
                  <div className="dropdown-content">
                    <div className="notification-item">
                      <span className="notification-icon">🎯</span>
                      <span className="notification-text">New lesson available!</span>
                    </div>
                    <div className="notification-item">
                      <span className="notification-icon">📊</span>
                      <span className="notification-text">Weekly progress report</span>
                    </div>
                    <div className="notification-item">
                      <span className="notification-icon">🏆</span>
                      <span className="notification-text">Achievement unlocked!</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hydration - hidden on mobile */}
            <div className="action-dropdown-container desktop-only" ref={hydrationRef}>
              <button type="button" className="action-chip" onClick={handleHydrationToggle} aria-expanded={showHydrationReminder} aria-haspopup="true" aria-label="Hydration reminder">
                <DropIcon />
              </button>
              {showHydrationReminder && (
                <div className="action-dropdown hydration-dropdown" role="dialog" aria-labelledby="hydration-title">
                  <div className="dropdown-header" id="hydration-title">💧 Stay Hydrated!</div>
                  <div className="dropdown-content">
                    <p>Remember to drink water regularly for better learning performance.</p>
                    <div className="hydration-stats">
                      <div className="stat">Today&apos;s intake: 1.2L</div>
                      <div className="stat">Goal: 2.0L</div>
                    </div>
                    <button className="hydration-button">Log Water Intake</button>
                  </div>
                </div>
              )}
            </div>
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

        {/* Mobile Navigation Dropdown */}
        {showMobileNav && (
          <div className="mobile-nav-dropdown" ref={mobileNavRef}>
            <nav className="mobile-nav" aria-label="Mobile navigation">
              {NAV_ITEMS.map(({ label, description, href, Icon }) => {
                const active = isNavItemActive(href);
                return (
                  <button
                    key={label}
                    type="button"
                    className={`mobile-nav-item ${active ? 'active' : ''}`}
                    onClick={() => {
                      router.push(href);
                      setShowMobileNav(false);
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="nav-icon-wrapper" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="nav-copy">
                      <span className="nav-label">{label}</span>
                      <span className="nav-description">{description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
