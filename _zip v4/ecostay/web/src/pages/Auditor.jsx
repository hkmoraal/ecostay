import { useEffect, useState } from 'react';
import { api, auditorKey, uploadPhoto } from '../api.js';

// ---- Auditor area ----------------------------------------------------------
// Gated by a shared auditor key (entered once, kept in localStorage).
// Flow: list available audits → claim → fill in verdicts + photo evidence
// per criterion → submit. A 'verified' outcome marks the stay verified.
export default function Auditor() {
  const [authed, setAuthed] = useState(Boolean(auditorKey.get()));
  const [openAudit, setOpenAudit] = useState(null); // audit id being worked on

  if (!authed) return <KeyGate onAuthed={() => setAuthed(true)} />;
  if (openAudit) return <AuditForm id={openAudit} onBack={() => setOpenAudit(null)} />;
  return <AuditList onOpen={setOpenAudit} onSignOut={() => { auditorKey.clear(); setAuthed(false); }} />;
}

// ---- Key gate --------------------------------------------------------------
function KeyGate({ onAuthed }) {
  const [key, setKey]   = useState('');
  const [error, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    auditorKey.set(key.trim());
    try {
      // A cheap authenticated call to verify the key.
      await api.listAudits('available');
      onAuthed();
    } catch (err) {
      auditorKey.clear();
      setErr(err.message || 'Ongeldige sleutel.');
    } finally { setBusy(false); }
  }

  return (
    <div className="container container--narrow pad">
      <h1 className="page-title">Auditor-omgeving</h1>
      <p className="muted">Voer je auditor-sleutel in om beschikbare audits te bekijken.</p>
      {error && <p className="notice notice--error">{error}</p>}
      <form className="form" onSubmit={submit} style={{ maxWidth: 420 }}>
        <label className="field">
          <span>Auditor-sleutel</span>
          <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} required />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Controleren…' : 'Inloggen'}</button>
      </form>
    </div>
  );
}

// ---- Audit list ------------------------------------------------------------
function AuditList({ onOpen, onSignOut }) {
  const [tab, setTab]     = useState('available'); // available | claimed | submitted
  const [audits, setAud]  = useState([]);
  const [status, setStat] = useState('loading');
  const [error, setErr]   = useState('');

  useEffect(() => {
    setStat('loading'); setErr('');
    api.listAudits(tab)
      .then((d) => { setAud(d.audits); setStat('ready'); })
      .catch((e) => { setErr(e.message); setStat('error'); });
  }, [tab]);

  return (
    <div className="container pad">
      <div className="between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Audits</h1>
        <button className="btn btn--ghost btn--small" onClick={onSignOut}>Uitloggen</button>
      </div>

      <div className="audit-tabs">
        {[
          { key: 'available', label: 'Beschikbaar' },
          { key: 'claimed',   label: 'Geclaimd' },
          { key: 'submitted', label: 'Ingediend' },
        ].map((t) => (
          <button key={t.key} className={`audit-tab ${tab === t.key ? 'audit-tab--on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className="muted">Laden…</p>}
      {status === 'error'   && <p className="notice notice--error">{error}</p>}
      {status === 'ready' && audits.length === 0 && (
        <p className="muted">Geen audits in deze categorie.</p>
      )}

      <div className="audit-grid">
        {audits.map((a) => (
          <button key={a.id} className="audit-card" onClick={() => onOpen(a.id)}>
            <div className="audit-card__head">
              <span className="audit-card__name">{a.name}</span>
              <span className={`audit-badge audit-badge--${a.status}`}>{statusLabel(a.status)}</span>
            </div>
            <span className="muted">{a.type} · {a.city}, {a.country}</span>
            {a.auditor_name && <span className="muted" style={{ fontSize: 13 }}>Auditor: {a.auditor_name}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Audit form ------------------------------------------------------------
function AuditForm({ id, onBack }) {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState(false);

  const [claim, setClaim]   = useState({ auditor_name: '', auditor_email: '' });
  const [answers, setAnswers] = useState({}); // { criterionId: { verdict, note } }
  const [photos, setPhotos]   = useState({}); // { criterionId: [{ url, public_id, uploading? }] }
  const [notes, setNotes]     = useState('');

  useEffect(() => { load(); }, [id]);

  async function load() {
    setStatus('loading'); setError('');
    try {
      const d = await api.getAudit(id);
      setData(d);
      const a = {};
      for (const ans of d.answers || []) a[ans.criterion_id] = { verdict: ans.verdict, note: ans.note || '' };
      setAnswers(a);
      const p = {};
      for (const ph of d.photos || []) (p[ph.criterion_id] ||= []).push({ url: ph.url, public_id: ph.public_id });
      setPhotos(p);
      setNotes(d.audit.notes || '');
      setStatus('ready');
    } catch (e) { setError(e.message); setStatus('error'); }
  }

  async function doClaim() {
    setError(''); setBusy(true);
    try {
      await api.claimAudit(id, claim);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function setVerdict(cid, verdict) {
    setAnswers((prev) => ({ ...prev, [cid]: { ...prev[cid], verdict } }));
  }
  function setNote(cid, note) {
    setAnswers((prev) => ({ ...prev, [cid]: { ...prev[cid], note } }));
  }

  async function addPhoto(cid, file) {
    if (!file) return;
    const tempId = Math.random().toString(36).slice(2);
    setPhotos((prev) => ({ ...prev, [cid]: [...(prev[cid] || []), { tempId, uploading: true }] }));
    try {
      const { url, public_id } = await uploadPhoto(file, `audit-${id}/criterion-${cid}`);
      setPhotos((prev) => ({
        ...prev,
        [cid]: (prev[cid] || []).map((p) => (p.tempId === tempId ? { url, public_id } : p)),
      }));
    } catch (e) {
      setError(`Foto uploaden mislukt: ${e.message}`);
      setPhotos((prev) => ({ ...prev, [cid]: (prev[cid] || []).filter((p) => p.tempId !== tempId) }));
    }
  }

  function removePhoto(cid, idx) {
    setPhotos((prev) => ({ ...prev, [cid]: (prev[cid] || []).filter((_, i) => i !== idx) }));
  }

  async function submit(outcome) {
    setError(''); setBusy(true);
    try {
      const answerList = Object.entries(answers)
        .filter(([, v]) => v && v.verdict)
        .map(([cid, v]) => ({ criterion_id: Number(cid), verdict: v.verdict, note: v.note || null }));
      const photoList = Object.entries(photos).flatMap(([cid, arr]) =>
        (arr || []).filter((p) => p.url).map((p) => ({ criterion_id: Number(cid), url: p.url, public_id: p.public_id }))
      );
      await api.submitAudit(id, { outcome, notes, answers: answerList, photos: photoList });
      onBack();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (status === 'loading') return <div className="container pad"><p className="muted">Laden…</p></div>;
  if (status === 'error')   return <div className="container pad"><p className="notice notice--error">{error}</p><button className="btn btn--ghost" onClick={onBack}>← Terug</button></div>;

  const audit = data.audit;
  const uploading = Object.values(photos).some((arr) => (arr || []).some((p) => p.uploading));

  return (
    <div className="container pad">
      <button className="btn btn--ghost btn--small" onClick={onBack} style={{ marginBottom: 16 }}>← Terug naar audits</button>
      <p className="eyebrow">{audit.type} · {audit.city}, {audit.country}</p>
      <h1 className="page-title" style={{ marginTop: 4 }}>{audit.name}</h1>
      {error && <p className="notice notice--error">{error}</p>}

      {/* ---- Not claimed yet: show claim form ---- */}
      {audit.status === 'available' && (
        <div className="payment-card" style={{ maxWidth: 460 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Audit claimen</h2>
          <label className="field"><span>Je naam</span>
            <input className="input" value={claim.auditor_name} onChange={(e) => setClaim((c) => ({ ...c, auditor_name: e.target.value }))} />
          </label>
          <label className="field"><span>Je e-mailadres</span>
            <input className="input" type="email" value={claim.auditor_email} onChange={(e) => setClaim((c) => ({ ...c, auditor_email: e.target.value }))} />
          </label>
          <button className="btn" onClick={doClaim} disabled={busy || !claim.auditor_name || !claim.auditor_email}>
            {busy ? 'Bezig…' : 'Claim deze audit'}
          </button>
        </div>
      )}

      {/* ---- Claimed / submitted: show the form ---- */}
      {audit.status !== 'available' && (
        <>
          {audit.status === 'submitted' && (
            <p className="notice">Deze audit is al ingediend. Je kunt de gegevens nog aanpassen en opnieuw indienen.</p>
          )}
          <p className="muted">Beoordeel elk criterium en voeg bewijsfoto's toe waar relevant.</p>

          {data.categories.map((cat) => (
            <fieldset className="audit-group" key={cat.id}>
              <legend>{cat.name}</legend>
              {cat.criteria.map((c) => {
                const ans = answers[c.id] || {};
                const pics = photos[c.id] || [];
                return (
                  <div className="audit-item" key={c.id}>
                    <div className="audit-item__head">
                      <div>
                        <strong>{c.title}</strong>
                        {c.description && <span className="audit-item__desc">{c.description}</span>}
                      </div>
                      <span className="audit-item__code">{c.code} · {c.points} pt</span>
                    </div>

                    <div className="verdicts">
                      {[
                        { v: 'pass', label: 'Voldoet' },
                        { v: 'fail', label: 'Voldoet niet' },
                        { v: 'na',   label: 'N.v.t.' },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          className={`verdict verdict--${o.v} ${ans.verdict === o.v ? 'verdict--on' : ''}`}
                          onClick={() => setVerdict(c.id, o.v)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>

                    <div className="photos">
                      {pics.map((p, i) => (
                        <div className="photo-thumb" key={p.public_id || p.tempId || i}>
                          {p.uploading
                            ? <div className="photo-thumb__loading">Uploaden…</div>
                            : <>
                                <img src={p.url} alt="bewijs" />
                                <button type="button" className="photo-thumb__x" onClick={() => removePhoto(c.id, i)} aria-label="Verwijder foto">×</button>
                              </>}
                        </div>
                      ))}
                      <label className="photo-add">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          onChange={(e) => { addPhoto(c.id, e.target.files?.[0]); e.target.value = ''; }}
                        />
                        <span>+ Foto</span>
                      </label>
                    </div>

                    <input
                      className="input audit-item__note"
                      placeholder="Notitie (optioneel)"
                      value={ans.note || ''}
                      onChange={(e) => setNote(c.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </fieldset>
          ))}

          <label className="field" style={{ marginTop: 20 }}>
            <span>Algemene bevindingen (optioneel)</span>
            <textarea className="input" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="audit-actions">
            <button className="btn" onClick={() => submit('verified')} disabled={busy || uploading}>
              {busy ? 'Bezig…' : '✓ Verifiëren & indienen'}
            </button>
            <button className="btn btn--ghost" onClick={() => submit('rejected')} disabled={busy || uploading} style={{ color: '#c0392b', borderColor: '#c0392b' }}>
              Afwijzen
            </button>
          </div>
          {uploading && <p className="muted" style={{ marginTop: 8 }}>Wacht tot alle foto's geüpload zijn…</p>}
        </>
      )}
    </div>
  );
}

function statusLabel(s) {
  return { available: 'Beschikbaar', claimed: 'Geclaimd', submitted: 'Ingediend', approved: 'Goedgekeurd', rejected: 'Afgewezen' }[s] || s;
}
