import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Footer.module.css';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerSection}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>🦜</div>
            <span className={styles.footerBrandText}>{t('header.logo')}</span>
          </div>
           <p className={styles.footerDescription}>
             {t('footer.description')}
           </p>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>{t('footer.sections.information')}</h4>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>
              {t('footer.links.privacy')}
            </Link>
            <Link href="/about" className={styles.footerLink}>
              {t('footer.links.about')}
            </Link>
            <Link href="/terms" className={styles.footerLink}>
              {t('footer.links.terms')}
            </Link>
            <Link href="/contact" className={styles.footerLink}>
              {t('footer.links.contact')}
            </Link>
            <Link href="/feedback" className={styles.footerLink}>
              {t('footer.links.feedback')}
            </Link>
          </div>
        </div>

        <div className={styles.footerSection}>
          <h4 className={styles.footerSectionTitle}>{t('footer.sections.features')}</h4>
          <div className={styles.footerLinks}>
            <Link href="/" className={styles.footerLink}>
              {t('footer.links.shadowing')}
            </Link>
            <Link href="/" className={styles.footerLink}>
              {t('footer.links.dictation')}
            </Link>
            <Link href="/dashboard/vocabulary" className={styles.footerLink}>
              {t('footer.links.vocabulary')}
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div className={styles.copyright}>
          © {currentYear} PAPAGEIL CO., LTD. {t('footer.copyright')}
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
          <span>{t('footer.madeWith')}</span>
          <span className={styles.heart}>❤</span>
          <span>{t('footer.by')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
