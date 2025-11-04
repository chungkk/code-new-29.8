import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer colorful-cheerful">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">🦜 Papageil</h3>
          <p className="footer-description">
            Effektiv Deutsch lernen mit Shadowing- und Diktatmethoden
          </p>
          <div className="footer-social">
            <a href="#" className="social-link" title="Facebook">
              <span>📘</span>
            </a>
            <a href="#" className="social-link" title="YouTube">
              <span>📺</span>
            </a>
            <a href="#" className="social-link" title="Instagram">
              <span>📷</span>
            </a>
            <a href="#" className="social-link" title="Twitter">
              <span>🐦</span>
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">📚 Lektionen</h4>
          <ul className="footer-links">
            <li><a href="#">Shadowing Übung</a></li>
            <li><a href="#">Diktatübung</a></li>
            <li><a href="#">Vokabeltrainer</a></li>
            <li><a href="#">Grammatik-Tipps</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">🔗 Links</h4>
          <ul className="footer-links">
            <li><a href="#">Über uns</a></li>
            <li><a href="#">Anleitung</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Kontakt</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">💌 Kontakt</h4>
          <ul className="footer-contact">
            <li>
              <span className="contact-icon">📧</span>
              <span>contact@papageil.net</span>
            </li>
            <li>
              <span className="contact-icon">🌐</span>
              <span>www.papageil.net</span>
            </li>
            <li>
              <span className="contact-icon">📍</span>
              <span>Deutschland</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="copyright">
            © {currentYear} Papageil. Gemacht mit <span className="heart">💖</span> für Sprachlerner
          </p>
          <div className="footer-bottom-links">
            <a href="#">Nutzungsbedingungen</a>
            <span className="separator">•</span>
            <a href="#">Datenschutz</a>
            <span className="separator">•</span>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
