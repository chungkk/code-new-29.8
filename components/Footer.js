import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import styles from '../styles/Footer.module.css';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = useState({
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    tiktokUrl: '',
    linkedinUrl: '',
    githubUrl: ''
  });

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    try {
      const res = await fetch('/api/settings/public');
      if (res.ok) {
        const data = await res.json();
        setSocialLinks({
          facebookUrl: data.facebookUrl || '',
          twitterUrl: data.twitterUrl || '',
          instagramUrl: data.instagramUrl || '',
          youtubeUrl: data.youtubeUrl || '',
          tiktokUrl: data.tiktokUrl || '',
          linkedinUrl: data.linkedinUrl || '',
          githubUrl: data.githubUrl || ''
        });
      }
    } catch (error) {
      console.error('Error fetching social links:', error);
    }
  };

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
            <Link href="/profile/vocabulary" className={styles.footerLink}>
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
          {socialLinks.facebookUrl && (
            <a 
              href={socialLinks.facebookUrl} 
              className={styles.socialLink} 
              aria-label="Facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>📘</span>
            </a>
          )}
          {socialLinks.twitterUrl && (
            <a 
              href={socialLinks.twitterUrl} 
              className={styles.socialLink} 
              aria-label="Twitter/X"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>🐦</span>
            </a>
          )}
          {socialLinks.instagramUrl && (
            <a 
              href={socialLinks.instagramUrl} 
              className={styles.socialLink} 
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>📷</span>
            </a>
          )}
          {socialLinks.youtubeUrl && (
            <a 
              href={socialLinks.youtubeUrl} 
              className={styles.socialLink} 
              aria-label="YouTube"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>▶️</span>
            </a>
          )}
          {socialLinks.tiktokUrl && (
            <a 
              href={socialLinks.tiktokUrl} 
              className={styles.socialLink} 
              aria-label="TikTok"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>🎵</span>
            </a>
          )}
          {socialLinks.linkedinUrl && (
            <a 
              href={socialLinks.linkedinUrl} 
              className={styles.socialLink} 
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>💼</span>
            </a>
          )}
          {socialLinks.githubUrl && (
            <a 
              href={socialLinks.githubUrl} 
              className={styles.socialLink} 
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>💻</span>
            </a>
          )}
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
