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
          <aside className={`score-card score-card--${stay.levelKey}`}>
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
      </div>
    </article>
  );
}
