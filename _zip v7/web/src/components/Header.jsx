import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Logo from '../brand/Logo.jsx';
import { useT, LANGUAGES } from '../i18n.jsx';

export default function Header() {
  const { t, lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="Ecostay home">
          <Logo size={30} />
        </Link>
        <nav className="site-nav" aria-label="Hoofdmenu">
          <NavLink to="/" end className="site-nav__link">{t('nav_discover')}</NavLink>
          <NavLink to="/certificering" className="site-nav__link">{t('nav_certify')}</NavLink>
          <NavLink to="/inloggen" className="site-nav__link">{t('nav_login')}</NavLink>

          <div className="lang">
            <button className="lang__btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
              <span aria-hidden="true">{current.flag}</span>
              <span>{current.code.toUpperCase()}</span>
              <span className="lang__caret" aria-hidden="true">▾</span>
            </button>
            {open && (
              <ul className="lang__menu" role="listbox" onMouseLeave={() => setOpen(false)}>
                {LANGUAGES.map((l) => (
                  <li key={l.code}>
                    <button
                      className={`lang__item ${l.code === lang ? 'lang__item--active' : ''}`}
                      onClick={() => { setLang(l.code); setOpen(false); }}
                      role="option" aria-selected={l.code === lang}
                    >
                      <span aria-hidden="true">{l.flag}</span> {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link to="/certificering" className="btn btn--small">{t('nav_register')}</Link>
        </nav>
      </div>
    </header>
  );
}
