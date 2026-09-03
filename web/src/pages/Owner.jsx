import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ownerToken, uploadStayPhoto } from '../api.js';

// ---- Inlogpagina: e-mail invullen -> magic link aanvragen ----
export function OwnerLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.ownerRequestLink(email.trim());
      setSent(true);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="container container--narrow pad">
      <h1 className="page-title">Inloggen op je verblijf</h1>
      {sent ? (
        <div className="notice" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            Als er een verblijf bij <strong>{email}</strong> hoort, is er een inloglink verstuurd.
            Check je mailbox — de link is 30 minuten geldig.
          </p>
        </div>
      ) : (
        <>
          <p className="muted">
            Vul het e-mailadres in waarmee je je verblijf hebt aangemeld. Je krijgt een
            inloglink toegestuurd — geen wachtwoord nodig.
          </p>
          {error && <p className="notice notice--error">{error}</p>}
          <form className="form" onSubmit={submit} style={{ maxWidth: 420 }}>
            <label className="field">
              <span>E-mailadres</span>
              <input className="input" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="jij@voorbeeld.nl" />
            </label>
            <button className="btn" disabled={busy}>{busy ? 'Versturen…' : 'Stuur inloglink'}</button>
          </form>
        </>
      )}
    </div>
  );
}

// ---- Verificatie-landing: token uit de URL inwisselen voor een sessie ----
export function OwnerVerify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('bezig'); // bezig | fout
  const [error, setError]   = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('fout'); setError('Geen token in de link.'); return; }
    api.ownerVerify(token)
      .then((d) => { ownerToken.set(d.token); navigate('/mijn-verblijf', { replace: true }); })
      .catch((e) => { setStatus('fout'); setError(e.message); });
  }, []);

  return (
    <div className="container container--narrow pad">
      {status === 'bezig' ? (
        <p className="muted">Bezig met inloggen…</p>
      ) : (
        <>
          <h1 className="page-title">Inloggen mislukt</h1>
          <p className="notice notice--error">{error}</p>
          <a className="btn" href="/inloggen">Nieuwe inloglink aanvragen</a>
        </>
      )}
    </div>
  );
}

// ---- Dashboard: "Mijn verblijf" ----
export function OwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState('laden');
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!ownerToken.get()) { navigate('/inloggen', { replace: true }); return; }
    api.ownerMe()
      .then((d) => { setData(d); setStatus('klaar'); })
      .catch((e) => {
        if (/verlopen|ingelogd|ongeldig/i.test(e.message)) { ownerToken.clear(); navigate('/inloggen', { replace: true }); return; }
        setError(e.message); setStatus('fout');
      });
  }, []);

  async function logout() {
    try { await api.ownerLogout(); } catch { /* ignore */ }
    ownerToken.clear();
    navigate('/inloggen', { replace: true });
  }

  if (status === 'laden') return <div className="container pad"><p className="muted">Laden…</p></div>;
  if (status === 'fout')  return <div className="container pad"><p className="notice notice--error">{error}</p></div>;

  return (
    <div className="container pad">
      <div className="admin-head">
        <h1 className="page-title" style={{ margin: 0 }}>Mijn verblijf</h1>
        <button className="btn btn--ghost btn--small" onClick={logout}>Uitloggen</button>
      </div>
      <p className="muted">Ingelogd als {data.email}</p>

      {data.stays.length === 0 && (
        <div className="notice" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            Er hoort nog geen verblijf bij dit e-mailadres. Heb je je al aangemeld?
            Ga anders naar <a className="link" href="/certificering">aanmelden</a>.
          </p>
        </div>
      )}

      {data.stays.map((stay) => <StayEditor key={stay.slug} stay={stay} />)}
    </div>
  );
}

function StayEditor({ stay }) {
  const [form, setForm]   = useState({
    name: stay.name, type: stay.type, city: stay.city, country: stay.country,
    website: stay.website || '', description: stay.description || '', image_url: stay.image_url || '',
  });
  const [busy, setBusy]     = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sub, setSub]       = useState(undefined); // undefined = nog niet geladen

  useEffect(() => {
    api.ownerSubscription(stay.slug).then((d) => setSub(d.subscription)).catch(() => setSub(null));
  }, [stay.slug]);

  function upd(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false); }

  async function save() {
    setBusy(true); setError(''); setSaved(false);
    try { await api.ownerEditStay(stay.slug, form); setSaved(true); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function handlePhoto(file) {
    if (!file) return;
    setPhotoBusy(true); setError('');
    try { const { url } = await uploadStayPhoto(file); upd('image_url', url); }
    catch (e) { setError(e.message); }
    finally { setPhotoBusy(false); }
  }

  async function cancelSub() {
    if (!confirm('Weet je zeker dat je je abonnement wilt opzeggen? Je certificaat vervalt en de incasso stopt.')) return;
    setBusy(true); setError('');
    try { await api.ownerCancelSubscription(stay.slug); const d = await api.ownerSubscription(stay.slug); setSub(d.subscription); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function changeTier(tier) {
    const msg = tier === 'verified'
      ? 'Upgraden naar Verified (€ 8/maand)? Een auditor komt je verblijf ter plaatse verifiëren. Het nieuwe bedrag geldt vanaf de eerstvolgende incasso.'
      : 'Teruggaan naar Self-assessment (€ 2/maand)? Je verliest de auditor-verificatie. Het nieuwe bedrag geldt vanaf de eerstvolgende incasso.';
    if (!confirm(msg)) return;
    setBusy(true); setError('');
    try { await api.ownerChangeTier(stay.slug, tier); const d = await api.ownerSubscription(stay.slug); setSub(d.subscription); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const levelLabel = { 0: 'Nog niet gecertificeerd', 1: 'Brons', 2: 'Zilver', 3: 'Goud' }[stay.level] || '';

  return (
    <div className="owner-stay">
      <div className="owner-stay__status">
        <div>
          <span className="eyebrow">Status</span>
          <div className="owner-stay__statusline">
            <span className={`admin-badge admin-badge--${stay.status}`}>{statusLabel(stay.status)}</span>
            <span className="muted">{stay.score}/100 · {levelLabel}</span>
            {stay.audit_status === 'verified' && <span className="verified-pill">✓ geverifieerd</span>}
          </div>
        </div>
        <a className="btn btn--ghost btn--small" href={`/verblijf/${stay.slug}`} target="_blank" rel="noreferrer">Bekijk pagina</a>
      </div>

      {error && <p className="notice notice--error">{error}</p>}

      <h2 className="section-title" style={{ marginTop: 20 }}>Gegevens</h2>
      <div className="field-row">
        <label className="field"><span>Naam</span>
          <input className="input" value={form.name} onChange={(e) => upd('name', e.target.value)} /></label>
        <label className="field"><span>Type</span>
          <select className="input" value={form.type} onChange={(e) => upd('type', e.target.value)}>
            {['B&B', 'Hotel', 'Vakantiehuis', 'Camping', 'Hostel', 'Appartement'].map((t) => <option key={t}>{t}</option>)}
          </select></label>
      </div>
      <div className="field-row">
        <label className="field"><span>Plaats</span>
          <input className="input" value={form.city} onChange={(e) => upd('city', e.target.value)} /></label>
        <label className="field"><span>Land</span>
          <input className="input" value={form.country} onChange={(e) => upd('country', e.target.value)} /></label>
      </div>
      <label className="field"><span>Website</span>
        <input className="input" value={form.website} onChange={(e) => upd('website', e.target.value)} placeholder="https://" /></label>
      <label className="field"><span>Korte omschrijving</span>
        <textarea className="input" rows="3" value={form.description} onChange={(e) => upd('description', e.target.value)} /></label>

      <div className="field">
        <span>Foto van je verblijf</span>
        {form.image_url ? (
          <div className="photo-upload">
            <img className="photo-upload__preview" src={form.image_url} alt="Voorbeeld" />
            <button type="button" className="btn btn--ghost btn--small" onClick={() => upd('image_url', '')}>Foto verwijderen</button>
          </div>
        ) : (
          <label className="photo-upload__drop">
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} />
            <span>{photoBusy ? 'Uploaden…' : '📷 Kies een foto'}</span>
          </label>
        )}
      </div>

      <div className="btn-row" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
        <button className="btn" onClick={save} disabled={busy || photoBusy}>{busy ? 'Opslaan…' : 'Wijzigingen opslaan'}</button>
        {saved && <span className="muted" style={{ color: 'var(--forest)' }}>✓ Opgeslagen</span>}
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Abonnement</h2>
      {sub === undefined && <p className="muted">Laden…</p>}
      {sub === null && (
        <div className="owner-sub">
          <p className="muted" style={{ margin: 0 }}>Geen actief abonnement gevonden.</p>
          <a className="btn btn--small" href="/certificering">Certificering starten</a>
        </div>
      )}
      {sub && (
        <div className="owner-sub">
          <div>
            <div className="owner-sub__amount">€ {sub.amount.toFixed(2)} <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>/ maand</span></div>
            <div className="muted">
              {sub.tier === 'verified' ? 'Verified assessment' : 'Self-assessment'} ·
              status: {subStatusLabel(sub.status)}
              {sub.next_payment_date && sub.status === 'active' && <> · volgende incasso {new Date(sub.next_payment_date).toLocaleDateString('nl-NL')}</>}
            </div>
          </div>
          {sub.status === 'active' && (
            <div className="owner-sub__actions">
              {sub.tier === 'self' ? (
                <button className="btn btn--small" onClick={() => changeTier('verified')} disabled={busy}>
                  Upgrade naar Verified (€ 8)
                </button>
              ) : (
                <button className="btn btn--ghost btn--small" onClick={() => changeTier('self')} disabled={busy}>
                  Terug naar Self (€ 2)
                </button>
              )}
              <button className="btn btn--ghost btn--small" onClick={cancelSub} disabled={busy}
                style={{ color: '#c0392b', borderColor: '#c0392b' }}>Opzeggen</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusLabel(s) {
  return { invited: 'Uitgenodigd', draft: 'Concept', certified: 'Gecertificeerd', canceled: 'Opgezegd' }[s] || s;
}
function subStatusLabel(s) {
  return { active: 'actief', canceled: 'opgezegd', pending: 'in behandeling' }[s] || s;
}
