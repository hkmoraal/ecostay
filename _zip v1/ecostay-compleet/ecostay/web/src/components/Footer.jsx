import { Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <Logo size={26} />
        <p className="site-footer__note">
          Onafhankelijk duurzaamheidskeurmerk voor overnachtingen.
        </p>
        <p className="site-footer__fine">
          © {new Date().getFullYear()} Ecostay · <Link to="/auditor" className="site-footer__link">Auditor</Link> · <Link to="/admin" className="site-footer__link">Beheer</Link>
        </p>
      </div>
    </footer>
  );
}
