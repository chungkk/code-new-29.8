import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../styles/authForm.module.css';

const AuthForm = ({ mode = 'login' }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    <form onSubmit={handleSubmit} className={styles.authForm}>
      {!isLogin && (
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder="Geben Sie Ihren Namen ein"
            value={formData.name}
            onChange={handleChange}
            required={!isLogin}
            className={styles.formInput}
            disabled={loading}
          />
        </div>
      )}

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="email">
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="ihre.email@beispiel.de"
          value={formData.email}
          onChange={handleChange}
          required
          className={styles.formInput}
          disabled={loading}
          autoComplete="email"
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="password">
          Passwort
        </label>
        <div className={styles.passwordContainer}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Geben Sie Ihr Passwort ein"
            value={formData.password}
            onChange={handleChange}
            required
            className={styles.formInput}
            disabled={loading}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label="Toggle password visibility"
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {isLogin && (
          <div className={styles.forgotPassword}>
            <a href="#" className={styles.forgotPasswordLink} onClick={(e) => e.preventDefault()}>
              Passwort vergessen?
            </a>
          </div>
        )}
      </div>

      {!isLogin && (
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="confirmPassword">
            Passwort bestätigen
          </label>
          <div className={styles.passwordContainer}>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Passwort erneut eingeben"
              value={formData.confirmPassword}
              onChange={handleChange}
              required={!isLogin}
              className={styles.formInput}
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={styles.submitButton}
      >
        {loading && <span className={styles.loadingSpinner} />}
        {loading ? 'Lädt...' : isLogin ? 'Anmelden' : 'Registrieren'}
      </button>
    </form>
  );
};

export default AuthForm;
