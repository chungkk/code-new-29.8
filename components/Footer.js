import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">Papageil</h3>
          <p className="footer-description">
            Effektiv Deutsch lernen mit Shadowing- und Diktatmethoden
          </p>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Kontakt</h4>
          <ul className="footer-contact">
            <li>
              <span className="contact-icon">Email:</span>
              <span>contact@papageil.net</span>
            </li>
            <li>
              <span className="contact-icon">Website:</span>
              <span>www.papageil.net</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p className="copyright">
            © {currentYear} Papageil. Alle Rechte vorbehalten.
          </p>
          <div className="footer-bottom-links">
            <a href="#">Datenschutz</a>
            <span className="separator">•</span>
            <a href="#">Impressum</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
