import { Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';
import { useT } from '../i18n.jsx';

export default function Footer() {
  const { t } = useT();
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Logo size={26} />
        <p className="site-footer__note">{t('footer_tagline')}</p>
        <p className="site-footer__fine">
          © {new Date().getFullYear()} Ecostay ·{' '}
          <Link to="/privacy" className="site-footer__link">{t('footer_privacy')}</Link> ·{' '}
          <Link to="/voorwaarden" className="site-footer__link">{t('footer_terms')}</Link> ·{' '}
          <Link to="/cookies" className="site-footer__link">{t('footer_cookies')}</Link> ·{' '}
          <Link to="/auditor" className="site-footer__link">{t('footer_auditor')}</Link> ·{' '}
          <Link to="/admin" className="site-footer__link">{t('footer_admin')}</Link>
        </p>
      </div>
    </footer>
  );
}
