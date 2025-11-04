import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/AuthForm';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    paddingTop: '80px'
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '900px',
    display: 'flex',
    overflow: 'hidden',
    minHeight: '600px'
  },
  leftSide: {
    flex: 1,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: 'white',
    position: 'relative'
  },
  rightSide: {
    flex: 1,
    padding: '50px 40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  }
};

export default function Register() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div style={{ fontSize: '24px', color: '#667eea' }}>
           ⏳ Lädt...
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <>
      <SEO
        title="Registrieren - Papageil"
        description="Erstellen Sie ein kostenloses Konto und starten Sie Ihre Deutsch-Lernreise mit interaktiven Shadowing und Diktat-Übungen."
        keywords="Papageil Registrierung, Konto erstellen, Deutsch lernen kostenlos, Deutsch lernen App"
        noindex={true}
      />

       <div style={styles.container}>
         <div style={styles.card} className="card">
           {/* Left Side - Illustration */}
           <div style={styles.leftSide} className="left-side">
             <div style={{
               position: 'absolute',
               top: 0,
               left: 0,
               right: 0,
               bottom: 0,
               background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'2\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
               opacity: 0.3
             }} />
             <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
               <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎓</div>
               <h2 style={{
                 fontSize: '32px',
                 fontWeight: 'bold',
                 marginBottom: '20px',
                 textShadow: '0 2px 4px rgba(0,0,0,0.3)'
               }}>
                 🦜 Papageil
               </h2>
               <p style={{
                 fontSize: '18px',
                 lineHeight: '1.6',
                 marginBottom: '30px',
                 opacity: 0.9
               }}>
                 Lernen Sie Deutsch durch Shadowing-Methode
               </p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize: '24px' }}>🎯</span>
                   <span>Interaktive Lektionen</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize: '24px' }}>📚</span>
                   <span>Vokabel-Tracking</span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <span style={{ fontSize: '24px' }}>🎵</span>
                   <span>Audio-Unterstützung</span>
                 </div>
               </div>
             </div>
           </div>

           {/* Right Side - Form */}
           <div style={styles.rightSide} className="right-side">
             <div style={{ marginBottom: '40px' }}>
               <h1 style={{
                 fontSize: '32px',
                 fontWeight: 'bold',
                 color: '#333',
                 marginBottom: '10px',
                 textAlign: 'center'
               }}>
                 Konto erstellen
               </h1>
               <p style={{
                 color: '#666',
                 fontSize: '16px',
                 textAlign: 'center',
                 marginBottom: '30px'
               }}>
                 Beginnen Sie Ihre Deutsch-Lernreise
               </p>
             </div>

             <AuthForm mode="register" />

             <div style={{
               textAlign: 'center',
               marginTop: '30px',
               paddingTop: '20px',
               borderTop: '1px solid #eee'
             }}>
               <p style={{ color: '#666', fontSize: '14px' }}>
                 Bereits ein Konto?{' '}
                 <Link href="/auth/login" style={{
                   color: '#667eea',
                   textDecoration: 'none',
                   fontWeight: 'bold',
                   transition: 'color 0.3s ease'
                 }}>
                   Jetzt anmelden
                 </Link>
               </p>
             </div>
           </div>
         </div>
       </div>

       <style jsx>{`
         @media (max-width: 768px) {
           .card {
             flex-direction: column !important;
             max-width: 100% !important;
             border-radius: 0 !important;
             min-height: 100vh !important;
           }
           .left-side {
             display: none !important;
           }
           .right-side {
             padding: 30px 20px !important;
           }
         }
       `}</style>
     </>
   );
 }