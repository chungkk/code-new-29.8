import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const AdminDashboardLayout = ({ children }) => {
  const router = useRouter();

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/admin/dashboard/files', label: 'Files', icon: '📁' },
  ];

  const isActive = (path) => {
    if (path === '/admin/dashboard') {
      return router.pathname === '/admin/dashboard' || router.pathname === '/admin/dashboard/index';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 64px)',
      maxWidth: '1600px',
      margin: '0 auto',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: 'var(--spacing-lg)',
      }}>
        <div style={{
          marginBottom: 'var(--spacing-lg)',
          padding: 'var(--spacing-md)',
          background: 'var(--accent-gradient)',
          borderRadius: 'var(--border-radius-small)',
          color: 'white',
          fontWeight: '600',
          textAlign: 'center',
        }}>
          Admin Panel
        </div>

        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
        }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: '12px 16px',
                borderRadius: 'var(--border-radius-small)',
                textDecoration: 'none',
                color: isActive(item.href) ? 'var(--accent-blue)' : 'var(--text-primary)',
                background: isActive(item.href) ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                fontWeight: isActive(item.href) ? '600' : '500',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        padding: 'var(--spacing-xl) var(--spacing-lg)',
        overflowY: 'auto',
      }}>
        {children}
      </main>
    </div>
  );
};

export default AdminDashboardLayout;
