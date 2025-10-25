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
            <span className="nav-text">Trang chủ</span>
          </button>

          {user?.role === 'admin' && (
            <button
              className="nav-link"
              onClick={() => router.push('/admin/dashboard')}
            >
              <span className="nav-icon">🛠️</span>
              <span className="nav-text">Admin</span>
            </button>
          )}
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
                      <span style={{ fontWeight: '500' }}>Quản lý học tập</span>
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
                      <span style={{ fontWeight: '500' }}>Từ vựng của tôi</span>
                    </button>
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
                      <span>Đăng xuất</span>
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
              <span className="user-name">Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
