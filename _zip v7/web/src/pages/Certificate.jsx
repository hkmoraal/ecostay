import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import LeafRating from '../brand/LeafRating.jsx';

// ---- Openbaar certificaat, geschikt om te printen / op te slaan als PDF ----
export default function Certificate() {
  const { slug } = useParams();
  const [stay, setStay]   = useState(null);
  const [status, setStatus] = useState('laden');

  useEffect(() => {
    api.getStay(slug)
      .then((d) => { setStay(d.stay); setStatus('klaar'); })
      .catch(() => setStatus('fout'));
  }, [slug]);

  if (status === 'laden') return <div className="container pad"><p className="muted">Laden…</p></div>;
  if (status === 'fout' || !stay) return <div className="container pad"><p className="notice notice--error">Certificaat niet gevonden.</p></div>;

  if (stay.status !== 'certified' || stay.level < 1) {
    return (
      <div className="container container--narrow pad">
        <p className="notice">Dit verblijf heeft (nog) geen geldig certificaat.</p>
        <Link className="btn btn--ghost btn--small" to={`/verblijf/${slug}`}>← Naar de pagina</Link>
      </div>
    );
  }

  const levelLabel = { 1: 'Brons', 2: 'Zilver', 3: 'Goud' }[stay.level] || '';
  const issued = stay.certified_at ? new Date(stay.certified_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const expires = stay.expires_at ? new Date(stay.expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const verifyUrl = `${window.location.origin}/verblijf/${stay.slug}`;

  return (
    <div className="cert-page">
      <div className="cert-toolbar">
        <Link className="btn btn--ghost btn--small" to={`/verblijf/${slug}`}>← Terug</Link>
        <button className="btn btn--small" onClick={() => window.print()}>Download als PDF</button>
      </div>

      <div className="cert">
        <div className="cert__border">
          <div className="cert__brand">eco<span>stay</span></div>
          <div className="cert__eyebrow">Duurzaamheidskeurmerk voor overnachtingen</div>

          <div className="cert__leaves"><LeafRating level={stay.level} size={40} /></div>

          <div className="cert__awarded">Dit certificaat is toegekend aan</div>
          <h1 className="cert__name">{stay.name}</h1>
          <div className="cert__place">{stay.type} · {stay.city}, {stay.country}</div>

          <div className="cert__level">Niveau <strong>{levelLabel}</strong> — {stay.score}/100 punten</div>
          {stay.audit_status === 'verified' && (
            <div className="cert__verified">✓ Ter plaatse geverifieerd door een onafhankelijke auditor</div>
          )}

          <div className="cert__meta">
            <div><span>Uitgegeven</span><strong>{issued}</strong></div>
            <div><span>Geldig tot</span><strong>{expires}</strong></div>
            <div><span>Verificatie</span><strong>{verifyUrl.replace(/^https?:\/\//, '')}</strong></div>
          </div>

          <div className="cert__foot">
            Echtheid te controleren op {verifyUrl.replace(/^https?:\/\//, '')} · Ecostay
          </div>
        </div>
      </div>
    </div>
  );
}
