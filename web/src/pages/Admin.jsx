import { useEffect, useState } from 'react';
import { api, adminKey, uploadStayPhoto } from '../api.js';

// ---- Admin area -----------------------------------------------------------
// Gated by the admin key (entered once, kept in localStorage).
// Tabs: Overzicht · Verblijven · Audits · Uitnodigingen.
export default function Admin() {
  const [authed, setAuthed] = useState(Boolean(adminKey.get()));
  const [tab, setTab] = useState('overview');

  if (!authed) return <KeyGate onAuthed={() => setAuthed(true)} />;

  return (
    <div className="container pad">
      <div className="admin-head">
        <h1 className="page-title" style={{ margin: 0 }}>Beheer</h1>
        <button className="btn btn--ghost btn--small" onClick={() => { adminKey.clear(); setAuthed(false); }}>
          Uitloggen
        </button>
      </div>

      <div className="audit-tabs">
        {[
          { key: 'overview',    label: 'Overzicht' },
          { key: 'stays',       label: 'Verblijven' },
          { key: 'audits',      label: 'Audits' },
          { key: 'invitations', label: 'Uitnodigingen' },
        ].map((t) => (
          <button key={t.key} className={`audit-tab ${tab === t.key ? 'audit-tab--on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'    && <Overview />}
      {tab === 'stays'       && <Stays />}
      {tab === 'audits'      && <Audits />}
      {tab === 'invitations' && <Invitations />}
    </div>
  );
}

// ---- Key gate -------------------------------------------------------------
function KeyGate({ onAuthed }) {
  const [key, setKey]   = useState('');
  const [error, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    adminKey.set(key.trim());
    try {
      await api.adminOverview();
      onAuthed();
    } catch (err) {
      adminKey.clear();
      setErr(err.message || 'Ongeldige sleutel.');
    } finally { setBusy(false); }
  }

  return (
    <div className="container container--narrow pad">
      <h1 className="page-title">Beheeromgeving</h1>
      <p className="muted">Voer de admin-sleutel in.</p>
      {error && <p className="notice notice--error">{error}</p>}
      <form className="form" onSubmit={submit} style={{ maxWidth: 420 }}>
        <label className="field">
          <span>Admin-sleutel</span>
          <input className="input" type="password" value={key} onChange={(e) => setKey(e.target.value)} required />
        </label>
        <button className="btn" disabled={busy}>{busy ? 'Controleren…' : 'Inloggen'}</button>
      </form>
    </div>
  );
}

// ---- Overview -------------------------------------------------------------
function Overview() {
  const [data, setData]   = useState(null);
  const [status, setStat] = useState('loading');
  const [error, setErr]   = useState('');

  useEffect(() => {
    api.adminOverview()
      .then((d) => { setData(d); setStat('ready'); })
      .catch((e) => { setErr(e.message); setStat('error'); });
  }, []);

  if (status === 'loading') return <p className="muted">Laden…</p>;
  if (status === 'error')   return <p className="notice notice--error">{error}</p>;

  const { stays, levels, tiers, audits, revenue } = data;

  return (
    <div>
      <div className="stat-grid">
        <Stat n={stays.total}     l="Verblijven totaal" />
        <Stat n={stays.certified} l="Gecertificeerd" accent />
        <Stat n={stays.draft}     l="Concept" />
        <Stat n={stays.invited}   l="Uitgenodigd" />
        <Stat n={stays.canceled}  l="Opgezegd" />
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Certificaten</h2>
      <div className="stat-grid">
        <Stat n={levels.brons}  l="🥉 Brons" />
        <Stat n={levels.zilver} l="🥈 Zilver" />
        <Stat n={levels.goud}   l="🥇 Goud" />
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Abonnementen</h2>
      <div className="stat-grid">
        <Stat n={tiers.self}     l="Self-assessment (€2)" />
        <Stat n={tiers.verified} l="Verified (€8)" />
        <Stat n={`€ ${revenue.monthly.toFixed(2)}`} l="Actieve MRR" accent />
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Audits</h2>
      <div className="stat-grid">
        <Stat n={audits.available} l="Beschikbaar" />
        <Stat n={audits.claimed}   l="Geclaimd" />
        <Stat n={audits.submitted} l="Ingediend" accent={audits.submitted > 0} />
        <Stat n={audits.approved}  l="Goedgekeurd" />
        <Stat n={audits.rejected}  l="Afgewezen" />
      </div>
    </div>
  );
}

function Stat({ n, l, accent }) {
  return (
    <div className={`admin-stat ${accent ? 'admin-stat--accent' : ''}`}>
      <span className="admin-stat__n">{n}</span>
      <span className="admin-stat__l">{l}</span>
    </div>
  );
}

// ---- Stays management -----------------------------------------------------
function Stays() {
  const [rows, setRows]   = useState([]);
  const [status, setStat] = useState('loading');
  const [error, setErr]   = useState('');
  const [q, setQ]         = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // slug being edited
  const [form, setForm]   = useState({});
  const [busy, setBusy]   = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  function load() {
    setStat('loading');
    api.adminStays({ ...(filter !== 'all' ? { status: filter } : {}), ...(q ? { q } : {}) })
      .then((d) => { setRows(d.stays); setStat('ready'); })
      .catch((e) => { setErr(e.message); setStat('error'); });
  }
  useEffect(() => { load(); }, [filter]);

  function startEdit(s) {
    setEditing(s.slug);
    setForm({ name: s.name, type: s.type, city: s.city, country: s.country, website: s.website || '', contact_email: s.contact_email || '', description: s.description || '', image_url: s.image_url || '' });
  }
  async function handlePhoto(file) {
    if (!file) return;
    setPhotoBusy(true); setErr('');
    try { const { url } = await uploadStayPhoto(file); setForm((f) => ({ ...f, image_url: url })); }
    catch (e) { setErr(e.message); }
    finally { setPhotoBusy(false); }
  }
  async function save(slug) {
    setBusy(true); setErr('');
    try { await api.adminEditStay(slug, form); setEditing(null); load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function setStatus(slug, newStatus) {
    if (!confirm(`Status wijzigen naar "${newStatus}"?`)) return;
    setBusy(true); setErr('');
    try { await api.adminSetStatus(slug, newStatus); load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  async function remove(s) {
    if (!confirm(`Weet je zeker dat je "${s.name}" definitief wilt verwijderen? Dit verwijdert ook de bijbehorende audits, beoordelingen en het abonnement. Dit kan niet ongedaan worden gemaakt.`)) return;
    setBusy(true); setErr('');
    try { await api.adminDeleteStay(s.slug); load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <div className="audit-tabs" style={{ margin: 0 }}>
          {['all', 'certified', 'draft', 'invited', 'canceled'].map((f) => (
            <button key={f} className={`audit-tab ${filter === f ? 'audit-tab--on' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Alle' : statusLabel(f)}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="admin-search">
          <input className="input" placeholder="Zoek op naam of plaats…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {error && <p className="notice notice--error">{error}</p>}
      {status === 'loading' && <p className="muted">Laden…</p>}
      {status === 'ready' && rows.length === 0 && <p className="muted">Geen verblijven.</p>}

      <div className="admin-list">
        {rows.map((s) => (
          <div key={s.slug} className="admin-row">
            {editing === s.slug ? (
              <div className="admin-edit">
                <div className="field-row">
                  <label className="field"><span>Naam</span>
                    <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
                  <label className="field"><span>Type</span>
                    <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                      {['B&B', 'Hotel', 'Vakantiehuis', 'Camping', 'Hostel', 'Appartement'].map((t) => <option key={t}>{t}</option>)}
                    </select></label>
                </div>
                <div className="field-row">
                  <label className="field"><span>Plaats</span>
                    <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></label>
                  <label className="field"><span>Land</span>
                    <input className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} /></label>
                </div>
                <div className="field-row">
                  <label className="field"><span>Website</span>
                    <input className="input" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></label>
                  <label className="field"><span>E-mail</span>
                    <input className="input" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} /></label>
                </div>
                <label className="field"><span>Omschrijving</span>
                  <textarea className="input" rows="2" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
                <div className="field">
                  <span>Foto</span>
                  {form.image_url ? (
                    <div className="photo-upload">
                      <img className="photo-upload__preview" src={form.image_url} alt="Voorbeeld" />
                      <button type="button" className="btn btn--ghost btn--small" onClick={() => setForm((f) => ({ ...f, image_url: '' }))}>Foto verwijderen</button>
                    </div>
                  ) : (
                    <label className="photo-upload__drop">
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ''; }} />
                      <span>{photoBusy ? 'Uploaden…' : '📷 Kies een foto'}</span>
                    </label>
                  )}
                </div>
                <div className="btn-row" style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn--ghost" onClick={() => setEditing(null)} disabled={busy}>Annuleren</button>
                  <button className="btn" onClick={() => save(s.slug)} disabled={busy || photoBusy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="admin-row__main">
                  <div>
                    <div className="admin-row__name">
                      {s.name}
                      {s.audit_status === 'verified' && <span className="verified-pill">✓ geverifieerd</span>}
                    </div>
                    <div className="muted">{s.type} · {s.city}, {s.country}</div>
                  </div>
                  <div className="admin-row__meta">
                    <span className={`admin-badge admin-badge--${s.status}`}>{statusLabel(s.status)}</span>
                    <span className="admin-tier">{s.tier === 'verified' ? '€8 verified' : '€2 self'}</span>
                    <span className="muted">{s.score}/100 · {s.levelLabel}</span>
                  </div>
                </div>
                <div className="admin-row__actions">
                  <a className="btn btn--ghost btn--small" href={`/verblijf/${s.slug}`} target="_blank" rel="noreferrer">Bekijk</a>
                  <button className="btn btn--ghost btn--small" onClick={() => startEdit(s)}>Bewerk</button>
                  <select className="input admin-status-select" value="" onChange={(e) => e.target.value && setStatus(s.slug, e.target.value)}>
                    <option value="">Status…</option>
                    {['invited', 'draft', 'certified', 'canceled'].filter((x) => x !== s.status).map((x) => (
                      <option key={x} value={x}>→ {statusLabel(x)}</option>
                    ))}
                  </select>
                  <button className="btn btn--ghost btn--small admin-delete" onClick={() => remove(s)}>Verwijder</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Audits management ----------------------------------------------------
function Audits() {
  const [rows, setRows]   = useState([]);
  const [status, setStat] = useState('loading');
  const [error, setErr]   = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen]   = useState(null); // audit id detail

  function load() {
    setStat('loading');
    api.adminAudits(filter)
      .then((d) => { setRows(d.audits); setStat('ready'); })
      .catch((e) => { setErr(e.message); setStat('error'); });
  }
  useEffect(() => { load(); }, [filter]);

  if (open) return <AuditDetail id={open} onBack={() => { setOpen(null); load(); }} />;

  return (
    <div>
      <div className="audit-tabs">
        {['all', 'submitted', 'claimed', 'available', 'approved', 'rejected'].map((f) => (
          <button key={f} className={`audit-tab ${filter === f ? 'audit-tab--on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Alle' : auditStatusLabel(f)}
          </button>
        ))}
      </div>

      {error && <p className="notice notice--error">{error}</p>}
      {status === 'loading' && <p className="muted">Laden…</p>}
      {status === 'ready' && rows.length === 0 && <p className="muted">Geen audits.</p>}

      <div className="admin-list">
        {rows.map((a) => (
          <div key={a.id} className="admin-row">
            <div className="admin-row__main">
              <div>
                <div className="admin-row__name">{a.name}</div>
                <div className="muted">{a.city}, {a.country}</div>
                {a.auditor_name && <div className="muted" style={{ fontSize: 13 }}>Auditor: {a.auditor_name} · {a.photo_count} foto's · {a.answer_count} beoordelingen</div>}
              </div>
              <div className="admin-row__meta">
                <span className={`audit-badge audit-badge--${a.status}`}>{auditStatusLabel(a.status)}</span>
              </div>
            </div>
            <div className="admin-row__actions">
              <button className="btn btn--ghost btn--small" onClick={() => setOpen(a.id)}>Bekijk & beoordeel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditDetail({ id, onBack }) {
  const [data, setData]   = useState(null);
  const [status, setStat] = useState('loading');
  const [error, setErr]   = useState('');
  const [busy, setBusy]   = useState(false);

  function load() {
    setStat('loading');
    api.adminGetAudit(id)
      .then((d) => { setData(d); setStat('ready'); })
      .catch((e) => { setErr(e.message); setStat('error'); });
  }
  useEffect(() => { load(); }, [id]);

  async function decide(decision) {
    const label = decision === 'approve' ? 'goedkeuren' : 'afwijzen';
    if (!confirm(`Weet je zeker dat je deze audit wilt ${label}?`)) return;
    setBusy(true); setErr('');
    try { await api.adminDecideAudit(id, decision); onBack(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  if (status === 'loading') return <p className="muted">Laden…</p>;
  if (status === 'error')   return <div><p className="notice notice--error">{error}</p><button className="btn btn--ghost" onClick={onBack}>← Terug</button></div>;

  const { audit, categories, answers, photos } = data;
  const ansMap = {};
  for (const a of answers) ansMap[a.criterion_id] = a;
  const picsByCrit = {};
  for (const p of photos) (picsByCrit[p.criterion_id] ||= []).push(p);

  return (
    <div>
      <button className="btn btn--ghost btn--small" onClick={onBack} style={{ marginBottom: 16 }}>← Terug naar audits</button>
      <p className="eyebrow">{audit.type} · {audit.city}, {audit.country}</p>
      <h2 className="page-title" style={{ marginTop: 4 }}>{audit.name}</h2>
      <p className="muted">
        Status: <span className={`audit-badge audit-badge--${audit.status}`}>{auditStatusLabel(audit.status)}</span>
        {audit.auditor_name && <> · Auditor: {audit.auditor_name} ({audit.auditor_email})</>}
      </p>
      {audit.notes && <p className="notice" style={{ marginTop: 12 }}>Bevindingen auditor: {audit.notes}</p>}
      {error && <p className="notice notice--error">{error}</p>}

      {categories.map((cat) => (
        <div key={cat.id} className="admin-audit-cat">
          <h3 className="criteria-group__title">{cat.name}</h3>
          {cat.criteria.map((c) => {
            const ans = ansMap[c.id];
            const pics = picsByCrit[c.id] || [];
            if (!ans && pics.length === 0) return null;
            return (
              <div key={c.id} className="admin-audit-item">
                <div className="admin-audit-item__head">
                  <strong>{c.title}</strong>
                  {ans && <span className={`verdict-pill verdict-pill--${ans.verdict}`}>{verdictLabel(ans.verdict)}</span>}
                </div>
                {ans?.note && <p className="muted" style={{ margin: '4px 0' }}>{ans.note}</p>}
                {pics.length > 0 && (
                  <div className="photos">
                    {pics.map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="photo-thumb">
                        <img src={p.url} alt="bewijs" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {audit.status === 'submitted' && (
        <div className="audit-actions">
          <button className="btn" onClick={() => decide('approve')} disabled={busy}>✓ Goedkeuren</button>
          <button className="btn btn--ghost" onClick={() => decide('reject')} disabled={busy} style={{ color: '#c0392b', borderColor: '#c0392b' }}>Afwijzen</button>
        </div>
      )}
    </div>
  );
}

// ---- Invitations ----------------------------------------------------------
function Invitations() {
  const [rows, setRows]   = useState([]);
  const [status, setStat] = useState('loading');
  const [error, setErr]   = useState('');
  const [form, setForm]   = useState({ name: '', type: 'B&B', city: '', country: 'Nederland', contact_email: '' });
  const [busy, setBusy]   = useState(false);
  const [sent, setSent]   = useState('');

  function load() {
    setStat('loading');
    api.listInvitations()
      .then((d) => { setRows(d.stays); setStat('ready'); })
      .catch((e) => { setErr(e.message); setStat('error'); });
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(''); setSent('');
    try {
      const r = await api.createInvitation(form);
      setSent(`Uitnodiging aangemaakt voor ${form.name}. Certificeringslink: ${r.certifyUrl}`);
      setForm({ name: '', type: 'B&B', city: '', country: 'Nederland', contact_email: '' });
      load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-invite-grid">
      <div>
        <h2 className="section-title" style={{ marginTop: 0 }}>Nieuwe uitnodiging</h2>
        {error && <p className="notice notice--error">{error}</p>}
        {sent && <p className="notice">{sent}</p>}
        <form className="form" onSubmit={submit}>
          <label className="field"><span>Naam *</span>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
          <div className="field-row">
            <label className="field"><span>Type</span>
              <select className="input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {['B&B', 'Hotel', 'Vakantiehuis', 'Camping', 'Hostel', 'Appartement'].map((t) => <option key={t}>{t}</option>)}
              </select></label>
            <label className="field"><span>Plaats *</span>
              <input className="input" required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></label>
          </div>
          <label className="field"><span>E-mail</span>
            <input className="input" type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} /></label>
          <button className="btn" disabled={busy}>{busy ? 'Bezig…' : 'Uitnodiging aanmaken'}</button>
        </form>
      </div>

      <div>
        <h2 className="section-title" style={{ marginTop: 0 }}>Openstaand (uitgenodigd + concept)</h2>
        {status === 'loading' && <p className="muted">Laden…</p>}
        {status === 'ready' && rows.length === 0 && <p className="muted">Niets openstaand.</p>}
        <div className="admin-list">
          {rows.map((s) => (
            <div key={s.id} className="admin-row admin-row--compact">
              <div>
                <div className="admin-row__name">{s.name}</div>
                <div className="muted">{s.city} · {s.contact_email || 'geen e-mail'}</div>
              </div>
              <span className={`admin-badge admin-badge--${s.status}`}>{statusLabel(s.status)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- labels ---------------------------------------------------------------
function statusLabel(s) {
  return { invited: 'Uitgenodigd', draft: 'Concept', certified: 'Gecertificeerd', canceled: 'Opgezegd' }[s] || s;
}
function auditStatusLabel(s) {
  return { available: 'Beschikbaar', claimed: 'Geclaimd', submitted: 'Ingediend', approved: 'Goedgekeurd', rejected: 'Afgewezen' }[s] || s;
}
function verdictLabel(v) {
  return { pass: '✓ Voldoet', fail: '✗ Voldoet niet', na: 'N.v.t.' }[v] || v;
}
