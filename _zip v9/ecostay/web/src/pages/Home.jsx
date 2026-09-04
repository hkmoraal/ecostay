import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StayCard from '../components/StayCard.jsx';
import LeafRating from '../brand/LeafRating.jsx';

const FILTERS = [
  { value: '', label: 'Alles' },
  { value: '3', label: 'Goud' },
  { value: '2', label: 'Zilver' },
  { value: '1', label: 'Brons' },
];

export default function Home() {
  const [stays, setStays] = useState([]);
  const [status, setStatus] = useState('loading');
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const params = {};
    if (level) params.level = level;
    if (q) params.q = q;
    api
      .listStays(params)
      .then((data) => {
        if (!active) return;
        setStays(data.stays);
        setStatus('ready');
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [level, q]);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow">Duurzaamheidskeurmerk voor overnachtingen</p>
          <h1 className="hero__title">
            Groen slapen,<br />
            puur genieten.
          </h1>
          <p className="hero__lead">
            Elk verblijf hieronder doorliep dezelfde onafhankelijke toets. Eén tot drie
            blaadjes vertellen je in één oogopslag hoe ver ze gaan.
          </p>
          <div className="hero__legend" role="list">
            {[
              { lvl: 1, name: 'Brons', desc: 'Solide basis' },
              { lvl: 2, name: 'Zilver', desc: 'Ruim boven de norm' },
              { lvl: 3, name: 'Goud', desc: 'Koploper' },
            ].map((t) => (
              <div className="legend-item" role="listitem" key={t.lvl}>
                <LeafRating level={t.lvl} size={22} />
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="hero__cta">
            <a href="#directory" className="btn">Bekijk verblijven</a>
            <Link to="/certificering" className="btn btn--ghost">
              Meld jouw plek aan
            </Link>
          </div>
        </div>
      </section>

      <section id="directory" className="directory">
        <div className="container">
          <div className="directory__head">
            <h2 className="section-title">Gecertificeerde verblijven</h2>
            <div className="directory__controls">
              <input
                type="search"
                className="input"
                placeholder="Zoek op naam of plaats"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Zoek verblijven"
              />
              <div className="chips" role="group" aria-label="Filter op niveau">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`chip ${level === f.value ? 'chip--active' : ''}`}
                    onClick={() => setLevel(f.value)}
                    aria-pressed={level === f.value}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {status === 'loading' && <p className="muted">Verblijven laden…</p>}
          {status === 'error' && (
            <p className="notice notice--error">
              De API is niet bereikbaar. Draait de server op poort 4000?
            </p>
          )}
          {status === 'ready' && stays.length === 0 && (
            <p className="muted">Geen verblijven gevonden met deze filters.</p>
          )}
          {status === 'ready' && stays.length > 0 && (
            <div className="grid">
              {stays.map((s) => (
                <StayCard key={s.id} stay={s} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
