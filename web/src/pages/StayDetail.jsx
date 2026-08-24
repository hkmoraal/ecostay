import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import LeafRating from '../brand/LeafRating.jsx';

export default function StayDetail() {
  const { slug } = useParams();
  const [stay, setStay] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .getStay(slug)
      .then((data) => {
        if (!active) return;
        setStay(data.stay);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [slug]);

  if (status === 'loading') return <div className="container pad"><p className="muted">Laden…</p></div>;
  if (status === 'error' || !stay)
    return (
      <div className="container pad">
        <p className="notice notice--error">Dit verblijf konden we niet vinden.</p>
        <Link to="/" className="btn btn--ghost">Terug naar overzicht</Link>
      </div>
    );

  // Group met criteria by category.
  const byCategory = {};
  for (const m of stay.met || []) {
    (byCategory[m.category] ||= []).push(m);
  }

  return (
    <article className="detail">
      <div className="container">
        <Link to="/" className="back-link">← Alle verblijven</Link>

        {['invited', 'draft', 'canceled'].includes(stay.status) && (
          <div className="neutral-banner">
            <span className="neutral-banner__icon">🍃</span>
            <div>
              {stay.status === 'invited' && (
                <span>Dit verblijf is uitgenodigd om een certificering te doen. Zodra de zelfscan is ingevuld, verschijnen hier de blaadjes.</span>
              )}
              {stay.status === 'draft' && (
                <span>Dit verblijf is aangemeld maar heeft de zelfscan nog niet afgerond. Blaadjes volgen zodra de certificering compleet is.</span>
              )}
              {stay.status === 'canceled' && (
                <span>Dit verblijf neemt momenteel geen actief certificaat af. De informatie blijft zichtbaar.</span>
              )}
            </div>
          </div>
        )}

        <header className="detail__head">
          <div>
            <p className="eyebrow">{stay.type} · {stay.city}, {stay.country}</p>
            <h1 className="detail__title">{stay.name}</h1>
            {stay.description && <p className="detail__lead">{stay.description}</p>}
            {stay.website && (
              <a className="btn btn--ghost" href={stay.website} target="_blank" rel="noreferrer">
                Bezoek website
              </a>
            )}
          </div>
          <aside className={`score-card score-card--${stay.levelKey}${["invited","draft","canceled"].includes(stay.status) ? " score-card--neutral" : ""}`}>
            <LeafRating level={stay.level} size={30} />
            <span className="score-card__level">{stay.levelLabel}</span>
            <span className="score-card__score">{stay.score}/100 punten</span>
          </aside>
        </header>

        <section className="detail__criteria">
          <h2 className="section-title">Waarop dit verblijf scoort</h2>
          {Object.keys(byCategory).length === 0 && (
            <p className="muted">Nog geen beoordeling vastgelegd.</p>
          )}
          <div className="criteria-groups">
            {Object.entries(byCategory).map(([cat, items]) => (
              <div className="criteria-group" key={cat}>
                <h3 className="criteria-group__title">{cat}</h3>
                <ul className="criteria-list">
                  {items.map((c) => (
                    <li key={c.id} className="criteria-list__item">
                      <span className="check" aria-hidden="true">✓</span>
                      <span>{c.title}</span>
                      <span className="criteria-list__code">{c.code}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <SubscriptionPanel slug={stay.slug} />
      </div>
    </article>
  );
}

// Subscription management block — shown at the bottom of the detail page.
// In a real app this would be behind authentication. For now it's accessible
// via the direct URL so the owner can manage their subscription.
export function SubscriptionPanel({ slug }) {
  const [sub, setSub]       = useState(null);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/subscriptions/${slug}`)
      .then((r) => r.json())
      .then((d) => { setSub(d.subscription); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [slug]);

  async function cancel() {
    if (!confirm('Weet je zeker dat je wilt opzeggen? Je verblijf verdwijnt uit het overzicht.')) return;
    setBusy(true);
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/subscriptions/${slug}`,
        { method: 'DELETE' }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg('Abonnement opgezegd. Je verblijf is uit het overzicht gehaald.');
      setSub((prev) => ({ ...prev, status: 'canceled' }));
    } catch (err) { setMsg('Opzeggen mislukt: ' + err.message); }
    finally { setBusy(false); }
  }

  if (status === 'loading') return null;
  if (status === 'error' || !sub) return null;

  return (
    <section className="sub-panel">
      <h2 className="section-title">Abonnement</h2>
      {msg && <p className="notice notice--error" style={{ marginTop: 12 }}>{msg}</p>}
      <div className="sub-panel__card">
        <div className="sub-panel__row">
          <span>Status</span>
          <span className={`sub-badge sub-badge--${sub.status}`}>{sub.status === 'active' ? 'Actief' : sub.status === 'canceled' ? 'Opgezegd' : sub.status}</span>
        </div>
        <div className="sub-panel__row">
          <span>Bedrag</span>
          <span>€ {Number(sub.amount).toFixed(2)} / maand</span>
        </div>
        {sub.next_payment_date && sub.status === 'active' && (
          <div className="sub-panel__row">
            <span>Volgende incasso</span>
            <span>{new Date(sub.next_payment_date).toLocaleDateString('nl-NL')}</span>
          </div>
        )}
        {sub.canceled_at && (
          <div className="sub-panel__row">
            <span>Opgezegd op</span>
            <span>{new Date(sub.canceled_at).toLocaleDateString('nl-NL')}</span>
          </div>
        )}
        {sub.status === 'active' && (
          <button className="btn btn--ghost" onClick={cancel} disabled={busy} style={{ marginTop: 16, color: '#c0392b', borderColor: '#c0392b' }}>
            {busy ? 'Bezig…' : 'Abonnement opzeggen'}
          </button>
        )}
      </div>
    </section>
  );
}
