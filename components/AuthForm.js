import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthForm({ mode }) {
  const { login, register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    nativeLanguage: 'vi',
    level: 'beginner'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten.';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Das Passwort muss mindestens einen Großbuchstaben enthalten.';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Das Passwort muss mindestens eine Zahl enthalten.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'register') {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        setError(passwordError);
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Die Passwörter stimmen nicht überein.');
        setLoading(false);
        return;
      }
    }

    try {
      let result;
      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.name, formData.email, formData.password, formData.level);
      }

      if (!result.success) {
        setError(result.error);
      }
    } catch (error) {
       setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
       {mode === 'register' && (
         <div style={{ marginBottom: '25px' }}>
           <label style={{
             display: 'block',
             marginBottom: '8px',
             fontWeight: '600',
             color: '#333',
             fontSize: '14px'
           }}>
             👤 Name *
           </label>
           <div style={{ position: 'relative' }}>
             <input
               type="text"
               name="name"
               value={formData.name}
               onChange={handleChange}
               required
               style={{
                 width: '100%',
                 padding: '15px 15px 15px 45px',
                 border: '2px solid #e1e5e9',
                 borderRadius: '10px',
                 fontSize: '16px',
                 boxSizing: 'border-box',
                 transition: 'all 0.3s ease',
                 outline: 'none'
               }}
               placeholder="Geben Sie Ihren Namen ein"
               onFocus={(e) => e.target.style.borderColor = '#667eea'}
               onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
             />
             <span style={{
               position: 'absolute',
               left: '15px',
               top: '50%',
               transform: 'translateY(-50%)',
               fontSize: '18px',
               color: '#999'
             }}>👤</span>
           </div>
         </div>
       )}

       {mode === 'register' && (
         <div style={{ marginBottom: '25px' }}>
           <label style={{
             display: 'block',
             marginBottom: '8px',
             fontWeight: '600',
             color: '#333',
             fontSize: '14px'
           }}>
             🌍 Muttersprache *
           </label>
           <div style={{ position: 'relative' }}>
             <select
               name="nativeLanguage"
               value={formData.nativeLanguage}
               onChange={handleChange}
               required
               style={{
                 width: '100%',
                 padding: '15px 15px 15px 45px',
                 border: '2px solid #e1e5e9',
                 borderRadius: '10px',
                 fontSize: '16px',
                 boxSizing: 'border-box',
                 background: 'white',
                 transition: 'all 0.3s ease',
                 outline: 'none',
                 cursor: 'pointer'
               }}
               onFocus={(e) => e.target.style.borderColor = '#667eea'}
               onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
             >
               <option value="vi">🇻🇳 Tiếng Việt</option>
               <option value="en">🇺🇸 English</option>
               <option value="es">🇪🇸 Español</option>
               <option value="fr">🇫🇷 Français</option>
               <option value="de">🇩🇪 Deutsch</option>
               <option value="it">🇮🇹 Italiano</option>
               <option value="pt">🇵🇹 Português</option>
               <option value="ru">🇷🇺 Русский</option>
               <option value="ja">🇯🇵 日本語</option>
               <option value="ko">🇰🇷 한국어</option>
               <option value="zh">🇨🇳 中文</option>
             </select>
             <span style={{
               position: 'absolute',
               left: '15px',
               top: '50%',
               transform: 'translateY(-50%)',
               fontSize: '18px',
               color: '#999',
               pointerEvents: 'none'
             }}>🌍</span>
           </div>
         </div>
       )}

       {mode === 'register' && (
         <div style={{ marginBottom: '25px' }}>
           <label style={{
             display: 'block',
             marginBottom: '8px',
             fontWeight: '600',
             color: '#333',
             fontSize: '14px'
           }}>
             📊 Dein Deutsch-Niveau *
           </label>
           <div style={{ position: 'relative' }}>
             <select
               name="level"
               value={formData.level}
               onChange={handleChange}
               required
               style={{
                 width: '100%',
                 padding: '15px 15px 15px 45px',
                 border: '2px solid #e1e5e9',
                 borderRadius: '10px',
                 fontSize: '16px',
                 boxSizing: 'border-box',
                 background: 'white',
                 transition: 'all 0.3s ease',
                 outline: 'none',
                 cursor: 'pointer'
               }}
               onFocus={(e) => e.target.style.borderColor = '#667eea'}
               onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
             >
               <option value="beginner">🌱 Anfänger (A1-A2) - Grundlegende Lektionen</option>
               <option value="experienced">🚀 Fortgeschritten (B1+) - Komplexere Inhalte</option>
               <option value="all">🎯 Alle Niveaus - Alle Lektionen anzeigen</option>
             </select>
             <span style={{
               position: 'absolute',
               left: '15px',
               top: '50%',
               transform: 'translateY(-50%)',
               fontSize: '18px',
               color: '#999',
               pointerEvents: 'none'
             }}>📊</span>
           </div>
           <p style={{
             fontSize: '12px',
             color: '#666',
             marginTop: '8px',
             fontStyle: 'italic'
           }}>
             Die Lektionen werden automatisch nach deinem Niveau gefiltert. Du kannst dies später in den Einstellungen ändern.
           </p>
         </div>
       )}

       <div style={{ marginBottom: '25px' }}>
         <label style={{
           display: 'block',
           marginBottom: '8px',
           fontWeight: '600',
           color: '#333',
           fontSize: '14px'
         }}>
           📧 E-Mail *
         </label>
         <div style={{ position: 'relative' }}>
           <input
             type="email"
             name="email"
             value={formData.email}
             onChange={handleChange}
             required
             style={{
               width: '100%',
               padding: '15px 15px 15px 45px',
               border: '2px solid #e1e5e9',
               borderRadius: '10px',
               fontSize: '16px',
               boxSizing: 'border-box',
               transition: 'all 0.3s ease',
               outline: 'none'
             }}
             placeholder="Geben Sie Ihre E-Mail ein"
             onFocus={(e) => e.target.style.borderColor = '#667eea'}
             onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
           />
           <span style={{
             position: 'absolute',
             left: '15px',
             top: '50%',
             transform: 'translateY(-50%)',
             fontSize: '18px',
             color: '#999'
           }}>📧</span>
         </div>
       </div>

       <div style={{ marginBottom: '25px' }}>
         <label style={{
           display: 'block',
           marginBottom: '8px',
           fontWeight: '600',
           color: '#333',
           fontSize: '14px'
         }}>
           🔒 Passwort *
         </label>
         <div style={{ position: 'relative' }}>
           <input
             type="password"
             name="password"
             value={formData.password}
             onChange={handleChange}
             required
             minLength={6}
             style={{
               width: '100%',
               padding: '15px 15px 15px 45px',
               border: '2px solid #e1e5e9',
               borderRadius: '10px',
               fontSize: '16px',
               boxSizing: 'border-box',
               transition: 'all 0.3s ease',
               outline: 'none'
             }}
             placeholder="Mind. 6 Zeichen, Groß-/Kleinbuchstaben, Zahl"
             onFocus={(e) => e.target.style.borderColor = '#667eea'}
             onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
           />
           <span style={{
             position: 'absolute',
             left: '15px',
             top: '50%',
             transform: 'translateY(-50%)',
             fontSize: '18px',
             color: '#999'
           }}>🔒</span>
         </div>
       </div>

       {mode === 'register' && (
         <div style={{ marginBottom: '25px' }}>
           <label style={{
             display: 'block',
             marginBottom: '8px',
             fontWeight: '600',
             color: '#333',
             fontSize: '14px'
           }}>
             ✅ Passwort bestätigen *
           </label>
           <div style={{ position: 'relative' }}>
             <input
               type="password"
               name="confirmPassword"
               value={formData.confirmPassword}
               onChange={handleChange}
               required
               style={{
                 width: '100%',
                 padding: '15px 15px 15px 45px',
                 border: '2px solid #e1e5e9',
                 borderRadius: '10px',
                 fontSize: '16px',
                 boxSizing: 'border-box',
                 transition: 'all 0.3s ease',
                 outline: 'none'
               }}
               placeholder="Bestätigen Sie Ihr Passwort"
               onFocus={(e) => e.target.style.borderColor = '#667eea'}
               onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
             />
             <span style={{
               position: 'absolute',
               left: '15px',
               top: '50%',
               transform: 'translateY(-50%)',
               fontSize: '18px',
               color: '#999'
             }}>✅</span>
           </div>
         </div>
       )}

       {error && (
         <div style={{
           background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
           color: '#c62828',
           padding: '15px',
           borderRadius: '10px',
           marginBottom: '25px',
           fontSize: '14px',
           border: '1px solid #ef5350',
           boxShadow: '0 2px 8px rgba(239, 83, 80, 0.2)',
           display: 'flex',
           alignItems: 'center',
           gap: '10px'
         }}>
           <span style={{ fontSize: '18px' }}>⚠️</span>
           {error}
         </div>
       )}

       <button
         type="submit"
         disabled={loading}
         style={{
           width: '100%',
           padding: '18px',
           background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           color: 'white',
           border: 'none',
           borderRadius: '12px',
           fontSize: '16px',
           fontWeight: 'bold',
           cursor: loading ? 'not-allowed' : 'pointer',
           transition: 'all 0.3s ease',
           boxShadow: loading ? 'none' : '0 8px 25px rgba(102, 126, 234, 0.3)',
           transform: loading ? 'none' : 'translateY(0)',
           marginTop: '10px'
         }}
         onMouseEnter={(e) => {
           if (!loading) {
             e.target.style.transform = 'translateY(-2px)';
             e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
           }
         }}
         onMouseLeave={(e) => {
           if (!loading) {
             e.target.style.transform = 'translateY(0)';
             e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
           }
         }}
       >
         <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
           {loading ? (
             <>
               <span style={{ fontSize: '18px' }}>⏳</span>
               Wird verarbeitet...
             </>
           ) : (
             <>
               <span style={{ fontSize: '18px' }}>{mode === 'login' ? '🚀' : '🎯'}</span>
               {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
             </>
           )}
         </span>
       </button>
    </form>
  );
}