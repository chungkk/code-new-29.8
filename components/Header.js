import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const isHomePage = router.pathname === '/';

  const handleLogout = () => {
    logout();
  };

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
        </nav>

        <div className="header-right">
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="user-button"
                onClick={() => setShowMenu(!showMenu)}
              >
                <span className="user-avatar">👤</span>
                <span className="user-name">{user.name}</span>
              </button>

              {showMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '10px',
                  background: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  minWidth: '220px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      {user.email}
                    </div>
                  </div>

                   <div style={{ padding: '8px 0' }}>
                     <button
                       onClick={() => {
                         setShowMenu(false);
                         router.push('/dashboard');
                       }}
                       style={{
                         width: '100%',
                         padding: '12px 16px',
                         background: 'none',
                         border: 'none',
                         textAlign: 'left',
                         cursor: 'pointer',
                         fontSize: '14px',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '10px',
                         transition: 'background 0.2s'
                       }}
                       onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                     >
                       <span style={{ fontSize: '18px' }}>📊</span>
                        <span style={{ fontWeight: '500' }}>Lernen verwalten</span>
                     </button>

                     <button
                       onClick={() => {
                         setShowMenu(false);
                         router.push('/dashboard?tab=vocabulary');
                       }}
                       style={{
                         width: '100%',
                         padding: '12px 16px',
                         background: 'none',
                         border: 'none',
                         textAlign: 'left',
                         cursor: 'pointer',
                         fontSize: '14px',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '10px',
                         transition: 'background 0.2s'
                       }}
                       onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                     >
                       <span style={{ fontSize: '18px' }}>📚</span>
                        <span style={{ fontWeight: '500' }}>Mein Wortschatz</span>
                     </button>

                     {user.role === 'admin' && (
                       <>
                         <div style={{
                           height: '1px',
                           background: 'linear-gradient(90deg, transparent, #e0e0e0, transparent)',
                           margin: '8px 16px'
                         }} />
                         <button
                           onClick={() => {
                             setShowMenu(false);
                             router.push('/admin/dashboard');
                           }}
                           style={{
                             width: '100%',
                             padding: '12px 16px',
                             background: 'none',
                             border: 'none',
                             textAlign: 'left',
                             cursor: 'pointer',
                             fontSize: '14px',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '10px',
                             transition: 'all 0.2s',
                             color: '#ff6b35',
                             fontWeight: '600',
                             borderRadius: '6px',
                             margin: '0 4px'
                           }}
                           onMouseEnter={(e) => {
                             e.currentTarget.style.background = 'linear-gradient(135deg, #fff3e0, #ffe0b2)';
                             e.currentTarget.style.transform = 'translateX(2px)';
                           }}
                           onMouseLeave={(e) => {
                             e.currentTarget.style.background = 'none';
                             e.currentTarget.style.transform = 'translateX(0)';
                           }}
                         >
                           <span style={{ fontSize: '18px' }}>🛠️</span>
                           <span>Admin Dashboard</span>
                           <span style={{
                             marginLeft: 'auto',
                             fontSize: '10px',
                             background: '#ff6b35',
                             color: 'white',
                             padding: '2px 6px',
                             borderRadius: '10px',
                             fontWeight: 'bold'
                           }}>
                             ADMIN
                           </span>
                         </button>
                       </>
                     )}
                   </div>

                  <div style={{ borderTop: '1px solid #eee', padding: '8px 0' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#f44336',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#ffebee'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '18px' }}>🚪</span>
                       <span>Abmelden</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              className="user-button"
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
