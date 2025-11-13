import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

const AuthForm = ({ mode = 'login' }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        result = await register(formData.name, formData.email, formData.password);
      }

      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-md)',
      width: '100%',
    }}>
      {!isLogin && (
        <div>
          <label style={{
            display: 'block',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: 'var(--spacing-xs)',
          }}>
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required={!isLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-small)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              outline: 'none',
            }}
          />
        </div>
      )}

      <div>
        <label style={{
          display: 'block',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: 'var(--spacing-xs)',
        }}>
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-small)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            outline: 'none',
          }}
        />
      </div>

      <div>
        <label style={{
          display: 'block',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: 'var(--spacing-xs)',
        }}>
          Password
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-small)',
            color: 'var(--text-primary)',
            fontSize: '15px',
            outline: 'none',
          }}
        />
      </div>

      {!isLogin && (
        <div>
          <label style={{
            display: 'block',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: 'var(--spacing-xs)',
          }}>
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required={!isLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-small)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              outline: 'none',
            }}
          />
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--border-radius-small)',
          color: '#ef4444',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          background: loading ? 'var(--bg-hover)' : 'var(--accent-gradient)',
          border: 'none',
          borderRadius: 'var(--border-radius-small)',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? 'Loading...' : isLogin ? 'Log In' : 'Sign Up'}
      </button>
    </form>
  );
};

export default AuthForm;
