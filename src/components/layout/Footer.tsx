import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer
      className="savor-footer mt-auto px-6 pt-6 text-xs text-center"
      style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-bg)' }}
    >
      <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-3">
        <Link to="/about" className="savor-footer-link">{t('footer.about')}</Link>
        <Link to="/contact" className="savor-footer-link">{t('footer.contact')}</Link>
        <Link to="/privacy" className="savor-footer-link">{t('footer.privacy')}</Link>
        <Link to="/terms" className="savor-footer-link">{t('footer.terms')}</Link>
        <Link to="/cookies" className="savor-footer-link">{t('footer.cookies')}</Link>
        <Link to="/cookie-settings" className="savor-footer-link">{t('footer.cookieSettings')}</Link>
      </nav>
      <p>{t('footer.copyright', { year })}</p>
    </footer>
  );
}
