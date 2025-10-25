import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function AuthForm({ mode = 'login' }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message);
        }

        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        router.push('/auth/login');
      } else {
        console.log('Attempting signIn with:', formData.email);
        const result = await signIn('credentials', {
          redirect: false,
          email: formData.email,
          password: formData.password
        });

        console.log('SignIn result:', result);

        if (result?.error) {
          console.error('SignIn error:', result.error);
          throw new Error('Email hoặc mật khẩu không đúng');
        }

        if (!result?.ok) {
          throw new Error('Email hoặc mật khẩu không đúng');
        }

        console.log('SignIn successful, redirecting...');
        
        // Wait a bit for session to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '50px auto',
      padding: '30px',
      background: 'white',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        {mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
      </h2>
      
      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          background: '#fee',
          color: '#c33',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Tên
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Mật khẩu
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký')}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        {mode === 'login' ? (
          <>
            Chưa có tài khoản?{' '}
            <span 
              onClick={() => router.push('/auth/register')}
              style={{ color: '#4CAF50', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Đăng ký ngay
            </span>
          </>
        ) : (
          <>
            Đã có tài khoản?{' '}
            <span
              onClick={() => router.push('/auth/login')}
              style={{ color: '#4CAF50', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Đăng nhập
            </span>
          </>
        )}
      </p>
    </div>
  );
}
