import React from 'react';
import Link from 'next/link';
import styles from '../styles/Footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>🦜</div>
            <span className={styles.footerBrandText}>PapaGeil</span>
          </div>
           <p className={styles.footerDescription}>
             Verbessern Sie Ihre deutsche Aussprache und Sprechfähigkeiten mit modernen Shadowing- und Diktatmethoden.
           </p>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>Information</h4>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              Datenschutzrichtlinie
            </Link>
            <Link href="/about" className={styles.footerLink}>
              Über uns
            </Link>
            <Link href="/terms" className={styles.footerLink}>
              Nutzungsbedingungen
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              Kontakt
            </Link>
            <Link href="/feedback" className={styles.footerLink}>
              Feedback
            </Link>
          </div>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>Features</h4>
          <div className={styles.footerLinks}>
            <Link href="/" className={styles.footerLink}>
              Shadowing
            </Link>
            <Link href="/" className={styles.footerLink}>
              Diktat
            </Link>
            <Link href="/dashboard/vocabulary" className={styles.footerLink}>
              Vokabular
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.copyright}>
          © {currentYear} PAPAGEIL CO., LTD. Alle Rechte vorbehalten.
        </div>

        <div className={styles.socialLinks}>
          <a href="#" className={styles.socialLink} aria-label="Facebook">
            <span>f</span>
          </a>
          <a href="#" className={styles.socialLink} aria-label="TikTok">
            <span>🎵</span>
          </a>
          <a href="#" className={styles.socialLink} aria-label="LinkedIn">
            <span>in</span>
          </a>
          <a href="#" className={styles.socialLink} aria-label="GitHub">
            <span>G</span>
          </a>
          <a href="#" className={styles.socialLink} aria-label="YouTube">
            <span>▶</span>
          </a>
        </div>

        <div className={styles.madeWith}>
          <span>Erstellt mit</span>
          <span className={styles.heart}>❤</span>
          <span>von PapaGeil</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
