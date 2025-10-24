import React from 'react';
import { useRouter } from 'next/router';

const Header = () => {
  const router = useRouter();
  const isHomePage = router.pathname === '/';

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo" onClick={() => router.push('/')}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">Deutsch Shadowing</span>
          </div>
        </div>
        
        <nav className="header-nav">
          <button 
            className={`nav-link ${isHomePage ? 'active' : ''}`}
            onClick={() => router.push('/')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Startseite</span>
          </button>
          
          <button className="nav-link">
            <span className="nav-icon">📖</span>
            <span className="nav-text">Lektionen</span>
          </button>
          
          <button className="nav-link">
            <span className="nav-icon">📊</span>
            <span className="nav-text">Fortschritt</span>
          </button>
          
          <button className="nav-link">
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Einstellungen</span>
          </button>
        </nav>

        <div className="header-right">
          <button className="user-button">
            <span className="user-avatar">👤</span>
            <span className="user-name">Lernender</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
