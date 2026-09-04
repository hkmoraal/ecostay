import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Lichte cookiemelding. We gebruiken alleen functionele opslag, dus dit is een
// informatieve melding met één "Begrepen"-knop (geen tracking om te weigeren).
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ecostay_cookie_ack')) setShow(true);
  }, []);

  if (!show) return null;
  return (
    <div className="cookie-banner">
      <p>
        We gebruiken alleen functionele opslag om de site te laten werken (bijvoorbeeld om je
        ingelogd te houden). Geen tracking. <Link className="link" to="/cookies">Meer info</Link>.
      </p>
      <button className="btn btn--small" onClick={() => { localStorage.setItem('ecostay_cookie_ack', '1'); setShow(false); }}>
        Begrepen
      </button>
    </div>
  );
}
