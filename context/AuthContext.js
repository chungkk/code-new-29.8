import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const checkAuth = async () => {
      // Nếu NextAuth đang loading, đợi nó load xong
      if (status === 'loading') {
        return; // Chỉ cần đợi, không làm gì cả
      }

      if (session) {
        // Nếu có session từ NextAuth (Google login)
        setUser({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role
        });
        // Lưu custom token để tương thích với hệ thống JWT hiện tại
        if (session.customToken && typeof window !== 'undefined') {
          localStorage.setItem('token', session.customToken);
        }
        setLoading(false);
      } else {
        // Kiểm tra JWT token truyền thống
        await checkUser();
      }
    };

    checkAuth();
  }, [session, status]);

  const checkUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Chỉ xóa token khi chắc chắn token không hợp lệ (401, 403)
        // KHÔNG xóa khi lỗi server (500) hoặc lỗi khác
        if (res.status === 401 || res.status === 403) {
          console.log('⚠️ Token không hợp lệ, đăng xuất...');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          setUser(null);
        } else {
          // Lỗi server hoặc lỗi khác - GIỮ token và thử decode token
          console.warn(`⚠️ Lỗi khi check user (${res.status}), sử dụng token cache`);
          tryDecodeToken(token);
        }
      }
    } catch (error) {
      // Network error hoặc lỗi khác - GIỮ token và thử decode token
      console.error('❌ Check user error (network/server):', error.message);
      tryDecodeToken(token);
    } finally {
      setLoading(false);
    }
  };

  // Helper function để decode JWT token và lấy thông tin user cơ bản
  const tryDecodeToken = (token) => {
    try {
      // Decode JWT token (phần payload là phần giữa của token)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const decoded = JSON.parse(jsonPayload);

      // Kiểm tra token có hết hạn chưa
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log('⚠️ Token đã hết hạn');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        setUser(null);
        return;
      }

      // Set user từ token decode (fallback khi API lỗi)
      if (decoded.userId) {
        setUser({
          id: decoded.userId,
          // Các thông tin khác sẽ được cập nhật khi API hoạt động trở lại
        });
        console.log('✅ Sử dụng thông tin từ token cache');
      }
    } catch (error) {
      console.error('❌ Không thể decode token:', error);
      // Nếu không decode được, xóa token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setUser(null);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }
      setUser(data.user);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password, level = 'beginner') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, level })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }
      setUser(data.user);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const refreshToken = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        throw new Error('No token found');
      }

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Refresh failed');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }
      setUser(data.user);

      return { success: true };
    } catch (error) {
      console.error('Refresh token error:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      setUser(null);
      router.push('/auth/login');
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async () => {
    try {
      await nextAuthSignIn('google', { callbackUrl: '/dashboard' });
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Google login failed' };
    }
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    setUser(null);
    // Nếu đang dùng NextAuth session, đăng xuất NextAuth
    if (session) {
      await nextAuthSignOut({ redirect: false });
    }
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}