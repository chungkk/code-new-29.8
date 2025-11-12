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
            <span className={styles.footerBrandText}>Papageil</span>
          </div>
          <p className={styles.footerDescription}>
            Improve your German pronunciation and speaking skills with modern shadowing
            and dictation methods.
          </p>
          <a href="#" className={styles.appStoreBtn}>
            <span style={{ fontSize: '24px' }}>🍎</span>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>Download on the</div>
              <div style={{ fontWeight: 600 }}>App Store</div>
            </div>
          </a>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>Information</h4>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              Privacy Policy
            </Link>
            <Link href="/about" className={styles.footerLink}>
              About Us
            </Link>
            <Link href="/terms" className={styles.footerLink}>
              Terms of Service
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              Contact Us
            </Link>
            <Link href="/feedback" className={styles.footerLink}>
              Feedbacks
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
              Dictation
            </Link>
            <Link href="/dashboard/vocabulary" className={styles.footerLink}>
              Vocabulary
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.copyright}>
          © {currentYear} PAPAGEIL CO., LTD. All rights reserved.
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
          <span>Made with</span>
          <span className={styles.heart}>❤</span>
          <span>by Papageil</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
