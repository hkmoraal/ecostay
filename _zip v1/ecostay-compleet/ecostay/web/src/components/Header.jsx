import { NavLink, Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="Ecostay home">
          <Logo size={30} />
        </Link>
        <nav className="site-nav" aria-label="Hoofdmenu">
          <NavLink to="/" end className="site-nav__link">
            Ontdek
          </NavLink>
          <NavLink to="/certificering" className="site-nav__link">
            Word gecertificeerd
          </NavLink>
          <Link to="/certificering" className="btn btn--small">
            Aanmelden
          </Link>
        </nav>
      </div>
    </header>
  );
}
