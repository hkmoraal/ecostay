import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, uploadStayPhoto } from '../api.js';
import LeafRating from '../brand/LeafRating.jsx';

// ---- Steps: register → plan → payment → assess → result ----
const STEP_LABELS = [
  { key: 'register', label: 'Aanmelden' },
  { key: 'plan',     label: 'Abonnement' },
  { key: 'payment',  label: 'Betaling'  },
  { key: 'assess',   label: 'Zelfscan'  },
  { key: 'result',   label: 'Resultaat' },
];

// The two subscription tiers. Prices here are for display only —
// the server is the source of truth for what Mollie charges.
const TIERS = {
  self: {
    key: 'self',
    name: 'Self-assessment',
    price: '2',
    tagline: 'Digitaal keurmerk op basis van je eigen zelfscan.',
    features: [
      'Eerste maand direct betalen',
      'Daarna automatische incasso elke maand',
      'Vermelding in het openbare overzicht',
      '1, 2 of 3 blaadjes op basis van je zelfscan',
      'Op elk moment opzegbaar',
    ],
  },
  verified: {
    key: 'verified',
    name: 'Verified assessment',
    price: '8',
    tagline: 'Zelfscan plus verificatie door een onafhankelijke auditor.',
    features: [
      'Alles uit Self-assessment',
      'Verificatie ter plaatse door een auditor',
      'Geverifieerd keurmerk — extra vertrouwen voor gasten',
      'Voorrang in het openbare overzicht',
      'Op elk moment opzegbaar',
    ],
  },
};

export default function Certify() {
  const [searchParams] = useSearchParams();
  const [step, setStep]       = useState('register');
  const [stay, setStay]       = useState(null);   // { slug, name }
  const [tier, setTier]       = useState('self'); // 'self' | 'verified'
  const [criteria, setCriteria] = useState([]);
  const [met, setMet]         = useState(() => new Set());
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);

  const [form, setForm] = useState({
    name: '', type: 'B&B', city: '', country: 'Nederland',
    website: '', contact_email: '', description: '', image_url: '',
  });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Handle return from Mollie checkout
  useEffect(() => {
    const payment = searchParams.get('payment');
    const slug    = searchParams.get('slug');
    if (!payment || !slug) return;
    setStay({ slug, name: slug });
    if (payment === 'paid') {
      setStep('assess');
    } else {
      setError(
        payment === 'canceled'
          ? 'Je hebt de betaling geannuleerd. Probeer het opnieuw.'
          : 'De betaling is niet geslaagd. Probeer het opnieuw.'
      );
      setStep('plan');
    }
  }, []);

  useEffect(() => {
    if (step !== 'assess') return;
    api.getCriteria().then((d) => setCriteria(d.categories)).catch(() => setError('Criteria laden mislukt.'));
  }, [step]);

  const totalPoints = useMemo(
    () => criteria.reduce((s, cat) => s + cat.criteria.reduce((ss, c) => ss + c.points, 0), 0),
    [criteria]
  );
  const gotPoints = useMemo(() => {
    let g = 0;
    for (const cat of criteria) for (const c of cat.criteria) if (met.has(c.id)) g += c.points;
    return g;
  }, [criteria, met]);
  const livePct = totalPoints ? Math.round((100 * gotPoints) / totalPoints) : 0;

  const activeTier = TIERS[tier];

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handlePhoto(file) {
    if (!file) return;
    setPhotoError(''); setPhotoBusy(true);
    try {
      const { url } = await uploadStayPhoto(file);
      update('image_url', url);
    } catch (err) {
      setPhotoError(err.message || 'Foto uploaden mislukt.');
    } finally { setPhotoBusy(false); }
  }

  async function submitRegister(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { slug } = await api.createStay(form);
      setStay({ slug, name: form.name });
      setStep('plan');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function startPayment() {
    setError(''); setBusy(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/payments/start/${stay.slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.contact_email || 'eigenaar@ecostay.nl',
            name: form.name || stay.slug,
            tier,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Betaling starten mislukt');
      // Redirect to Mollie checkout
      window.location.href = data.checkoutUrl;
    } catch (err) { setError(err.message); setBusy(false); }
  }

  function toggle(id) {
    setMet((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function submitAssessment() {
    setError(''); setBusy(true);
    try {
      const res = await api.submitAssessment(stay.slug, [...met]);
      setResult(res); setStep('result');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="certify">
      <div className="container container--narrow">
        <Steps step={step} />

        {error && <p className="notice notice--error">{error}</p>}

        {/* ---- STAP 1: Aanmelden ---- */}
        {step === 'register' && (
          <section>
            <h1 className="page-title">Meld je verblijf aan</h1>
            <p className="muted">Vul de basisgegevens in. Daarna kies je een abonnement, betaal je de eerste maand en doorloop je de zelfscan.</p>
            <form className="form" onSubmit={submitRegister}>
              <label className="field">
                <span>Naam van het verblijf *</span>
                <input className="input" required value={form.name} onChange={(e) => update('name', e.target.value)} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Type</span>
                  <select className="input" value={form.type} onChange={(e) => update('type', e.target.value)}>
                    {['B&B', 'Hotel', 'Vakantiehuis', 'Camping', 'Hostel', 'Appartement'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Plaats *</span>
                  <input className="input" required value={form.city} onChange={(e) => update('city', e.target.value)} />
                </label>
                <label className="field">
                  <span>Land</span>
                  <input className="input" value={form.country} onChange={(e) => update('country', e.target.value)} />
                </label>
              </div>
              <div className="field-row">
                <label className="field">
                  <span>Website</span>
                  <input className="input" type="url" placeholder="https://" value={form.website} onChange={(e) => update('website', e.target.value)} />
                </label>
                <label className="field">
                  <span>E-mail *</span>
                  <input className="input" type="email" required value={form.contact_email} onChange={(e) => update('contact_email', e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Korte omschrijving</span>
                <textarea className="input" rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} />
              </label>

              <div className="field">
                <span>Foto van je verblijf</span>
                {form.image_url ? (
                  <div className="photo-upload">
                    <img className="photo-upload__preview" src={form.image_url} alt="Voorbeeld van je verblijf" />
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => update('image_url', '')}>
                      Foto verwijderen
                    </button>
                  </div>
                ) : (
                  <label className="photo-upload__drop">
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} />
                    <span>{photoBusy ? 'Uploaden…' : '📷 Kies een foto'}</span>
                    <span className="muted" style={{ fontSize: 13 }}>Wordt getoond op je verblijfspagina en in het overzicht.</span>
                  </label>
                )}
                {photoError && <span className="notice notice--error" style={{ marginTop: 8 }}>{photoError}</span>}
              </div>

              <button className="btn" disabled={busy || photoBusy}>{busy ? 'Bezig…' : 'Verder naar abonnement'}</button>
            </form>
          </section>
        )}

        {/* ---- STAP 2: Abonnement kiezen ---- */}
        {step === 'plan' && (
          <section>
            <h1 className="page-title">Kies je abonnement</h1>
            <p className="muted">Twee opties. Je kunt op elk moment opzeggen via je verblijfspagina.</p>
            <div className="plan-grid">
              {Object.values(TIERS).map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={`plan-card ${tier === t.key ? 'plan-card--active' : ''}`}
                  onClick={() => setTier(t.key)}
                >
                  <div className="plan-card__head">
                    <span className="plan-card__name">{t.name}</span>
                    {tier === t.key && <span className="plan-card__check">✓</span>}
                  </div>
                  <div className="plan-card__price">
                    <span className="plan-card__amount">€ {t.price}</span>
                    <span className="plan-card__period">per maand</span>
                  </div>
                  <p className="plan-card__tagline">{t.tagline}</p>
                  <ul className="plan-card__features">
                    {t.features.map((f) => <li key={f}>✓ {f}</li>)}
                  </ul>
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setStep('payment')} style={{ width: '100%', marginTop: '8px' }}>
              Verder met {activeTier.name} — € {activeTier.price}/maand
            </button>
          </section>
        )}

        {/* ---- STAP 3: Betaling ---- */}
        {step === 'payment' && (
          <section>
            <h1 className="page-title">Abonnement starten</h1>
            <div className="payment-card">
              <div className="payment-card__plan">{activeTier.name}</div>
              <div className="payment-card__price">
                <span className="payment-card__amount">€ {activeTier.price}</span>
                <span className="payment-card__period">per maand</span>
              </div>
              <ul className="payment-card__features">
                {activeTier.features.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
              <p className="muted" style={{ fontSize: '13px', margin: '0 0 20px' }}>
                Je betaalt via iDEAL, creditcard of andere methode. Na betaling geef je toestemming
                voor maandelijkse automatische incasso. Je kunt op elk moment opzeggen via je
                verblijfspagina.
              </p>
              <div className="btn-row" style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn--ghost" onClick={() => setStep('plan')} disabled={busy} style={{ flex: '0 0 auto' }}>
                  Terug
                </button>
                <button className="btn" onClick={startPayment} disabled={busy} style={{ flex: 1 }}>
                  {busy ? 'Doorverwijzen naar betaalomgeving…' : `Betaal eerste maand — € ${activeTier.price}`}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ---- STAP 4: Zelfscan ---- */}
        {step === 'assess' && (
          <section>
            <h1 className="page-title">Zelfscan — {stay?.name}</h1>
            <p className="muted">Vink aan waar je verblijf aan voldoet. Je score telt live mee.</p>
            <div className="assess">
              <div className="assess__list">
                {criteria.map((cat) => (
                  <fieldset className="assess__group" key={cat.id}>
                    <legend>{cat.name}{cat.intro && <span className="assess__intro"> — {cat.intro}</span>}</legend>
                    {cat.criteria.map((c) => (
                      <label className={`check-row ${met.has(c.id) ? 'check-row--on' : ''}`} key={c.id}>
                        <input type="checkbox" checked={met.has(c.id)} onChange={() => toggle(c.id)} />
                        <span className="check-row__text">
                          <strong>{c.title}</strong>
                          {c.description && <span className="check-row__desc">{c.description}</span>}
                        </span>
                        <span className="check-row__pts">{c.points} pt</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              <aside className="assess__meter">
                <div className="meter-card">
                  <span className="meter-card__pct">{livePct}%</span>
                  <span className="muted">{gotPoints} / {totalPoints} punten</span>
                  <LeafRating level={levelFromPct(livePct)} size={26} showLabel />
                  <p className="meter-card__hint">{hintFor(livePct)}</p>
                  <button className="btn" onClick={submitAssessment} disabled={busy} style={{ width: '100%' }}>
                    {busy ? 'Bezig…' : 'Beoordeling indienen'}
                  </button>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* ---- STAP 5: Resultaat ---- */}
        {step === 'result' && result && (
          <section className="result">
            <div className={`result__hero result__hero--${result.levelKey}`}>
              <LeafRating level={result.level} size={44} />
              <h1 className="result__title">
                {result.level > 0 ? `Gefeliciteerd — niveau ${result.levelLabel}!` : 'Nog net niet'}
              </h1>
              <p className="result__score">{result.score}/100 punten ({result.gotPoints} van {result.totalPoints})</p>
            </div>
            <p className="muted result__body">
              {result.level > 0
                ? `${stay.name} staat nu in het openbare overzicht met ${result.level} blaadje(s). Je ontvangt elke maand een automatische incasso.`
                : `Je hebt minimaal 40% nodig voor brons. Nog ${(40 - result.score).toFixed(1)}% te gaan.`}
            </p>
            <div className="result__actions">
              <Link to={`/verblijf/${stay.slug}`} className="btn">Bekijk je pagina</Link>
              <Link to="/" className="btn btn--ghost">Naar het overzicht</Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function levelFromPct(p) { return p >= 80 ? 3 : p >= 60 ? 2 : p >= 40 ? 1 : 0; }
function hintFor(p) {
  if (p >= 80) return 'Koploper — goud binnen bereik.';
  if (p >= 60) return 'Sterk. Nog een stap naar goud.';
  if (p >= 40) return 'Brons gehaald. Op naar zilver.';
  return 'Nog onder de bronsdrempel (40%).';
}

function Steps({ step }) {
  const idx = STEP_LABELS.findIndex((i) => i.key === step);
  return (
    <ol className="steps">
      {STEP_LABELS.map((it, i) => (
        <li key={it.key} className={`steps__item ${i <= idx ? 'steps__item--done' : ''} ${i === idx ? 'steps__item--current' : ''}`}>
          <span className="steps__dot">{i + 1}</span>{it.label}
        </li>
      ))}
    </ol>
  );
}
