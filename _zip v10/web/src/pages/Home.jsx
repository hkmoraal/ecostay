import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StayCard from '../components/StayCard.jsx';
import LeafRating from '../brand/LeafRating.jsx';
import { useT } from '../i18n.jsx';

export default function Home() {
  const { t } = useT();
  const [stays, setStays] = useState([]);
  const [allStays, setAllStays] = useState([]); // voor de statistiek
  const [status, setStatus] = useState('loading');
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');

  const FILTERS = [
    { value: '', label: t('filter_all') },
    { value: '3', label: t('filter_gold') },
    { value: '2', label: t('filter_silver') },
    { value: '1', label: t('filter_bronze') },
  ];

  // Eenmalig: alles laden voor de tellingen bovenaan.
  useEffect(() => {
    api.listStays({}).then((d) => setAllStays(d.stays)).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const params = {};
    if (level) params.level = level;
    if (q) params.q = q;
    api.listStays(params)
      .then((data) => { if (active) { setStays(data.stays); setStatus('ready'); } })
      .catch(() => active && setStatus('error'));
    return () => { active = false; };
  }, [level, q]);

  const stats = useMemo(() => {
    const certified = allStays.filter((s) => s.level >= 1);
    const countries = new Set(certified.map((s) => s.country).filter(Boolean));
    return { stays: certified.length, countries: countries.size };
  }, [allStays]);

  const legend = [
    { lvl: 1, name: t('legend_bronze'), desc: t('legend_bronze_d') },
    { lvl: 2, name: t('legend_silver'), desc: t('legend_silver_d') },
    { lvl: 3, name: t('legend_gold'), desc: t('legend_gold_d') },
  ];
  const stayBenefits = [t('bs_1'), t('bs_2'), t('bs_3'), t('bs_4')];
  const auditorBenefits = [t('ba_1'), t('ba_2'), t('ba_3'), t('ba_4')];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow">🌿 {t('hero_pill')}</p>
          <h1 className="hero__title">
            {t('hero_title_1')}<br />
            {t('hero_title_2')}
          </h1>
          <p className="hero__lead">{t('hero_lead')}</p>
          <div className="hero__legend" role="list">
            {legend.map((l) => (
              <div className="legend-item" role="listitem" key={l.lvl}>
                <LeafRating level={l.lvl} size={22} />
                <div><strong>{l.name}</strong><span>{l.desc}</span></div>
              </div>
            ))}
          </div>
          <div className="hero__cta">
            <Link to="/certificering" className="btn">🏠 {t('register_stay')}</Link>
            <Link to="/auditor" className="btn btn--ghost">🛡 {t('register_auditor')}</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      {stats.stays > 0 && (
        <section className="container home-stats">
          <div className="home-stat"><span className="home-stat__n">{stats.stays}</span><span className="home-stat__l">{t('stat_stays')}</span></div>
          <div className="home-stat"><span className="home-stat__n">{stats.countries}</span><span className="home-stat__l">{t('stat_countries')}</span></div>
          <div className="home-stat"><span className="home-stat__n">3</span><span className="home-stat__l">{t('stat_levels')}</span></div>
        </section>
      )}

      {/* WAT DOET ECOSTAY */}
      <section className="container home-block">
        <p className="eyebrow">Ecostay</p>
        <h2 className="section-title">{t('about_title')}</h2>
        <p className="home-block__body">{t('about_body')}</p>
      </section>

      {/* VOORDELEN */}
      <section className="container home-benefits">
        <div className="benefit-card">
          <h3 className="benefit-card__title">{t('benefits_stay_title')}</h3>
          <ul className="benefit-list">
            {stayBenefits.map((b, i) => <li key={i}><span className="benefit-check">✓</span>{b}</li>)}
          </ul>
          <Link to="/certificering" className="btn btn--small">{t('register_stay')}</Link>
        </div>
        <div className="benefit-card benefit-card--auditor">
          <h3 className="benefit-card__title">{t('benefits_auditor_title')}</h3>
          <ul className="benefit-list">
            {auditorBenefits.map((b, i) => <li key={i}><span className="benefit-check benefit-check--honey">€</span>{b}</li>)}
          </ul>
          <Link to="/auditor" className="btn btn--small btn--ghost">{t('register_auditor')}</Link>
        </div>
      </section>

      {/* VERBLIJVEN UIT RENDER */}
      <section id="directory" className="directory">
        <div className="container">
          <div className="directory__head">
            <h2 className="section-title">{t('directory_title')}</h2>
            <div className="directory__controls">
              <input
                type="search" className="input" placeholder={t('search_placeholder')}
                value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('search_placeholder')}
              />
              <div className="chips" role="group">
                {FILTERS.map((f) => (
                  <button key={f.value} className={`chip ${level === f.value ? 'chip--active' : ''}`}
                    onClick={() => setLevel(f.value)} aria-pressed={level === f.value}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {status === 'loading' && <p className="muted">{t('loading_stays')}</p>}
          {status === 'error' && <p className="notice notice--error">{t('error_stays')}</p>}
          {status === 'ready' && stays.length === 0 && <p className="muted">{t('empty_stays')}</p>}
          {status === 'ready' && stays.length > 0 && (
            <div className="grid">
              {stays.map((s) => <StayCard key={s.id} stay={s} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
