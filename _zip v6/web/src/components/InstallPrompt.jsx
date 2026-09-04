import { useEffect, useState } from 'react';

// "Voeg toe aan beginscherm"-banner voor mobiel.
// Android/Chrome: echte installknop via het beforeinstallprompt-event.
// iOS/Safari: korte instructie (iOS staat programmatisch installeren niet toe).
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null); // Android install-event
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Al als app geopend? Dan niets tonen.
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return;
    // Eerder weggeklikt? Even met rust laten.
    if (localStorage.getItem('ecostay_install_dismissed')) return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIos) {
      // Safari op iOS: toon instructie.
      setIosHint(true);
      setShow(true);
      return;
    }

    // Android: wacht op het install-event van Chrome.
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem('ecostay_install_dismissed', '1');
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="install-prompt">
      <span className="install-prompt__icon">📱</span>
      <div className="install-prompt__text">
        {iosHint ? (
          <>Voeg Ecostay toe aan je beginscherm: tik op <strong>Deel</strong> en dan op <strong>Zet op beginscherm</strong>.</>
        ) : (
          <>Installeer Ecostay op je telefoon voor de beste ervaring.</>
        )}
      </div>
      {!iosHint && <button className="btn btn--small" onClick={install}>Toevoegen</button>}
      <button className="install-prompt__close" onClick={dismiss} aria-label="Sluiten">×</button>
    </div>
  );
}
