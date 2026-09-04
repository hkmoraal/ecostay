// E-mail versturen via de Resend REST API (geen extra npm-package nodig).
//
// Env vars:
//   RESEND_API_KEY   – API-sleutel van resend.com
//   FROM_EMAIL       – afzender, bv. "Ecostay <info@ecostay-label.nl>"
//                      (het domein ecostay-label.nl moet in Resend geverifieerd zijn)

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL     = process.env.FROM_EMAIL || 'Ecostay <info@ecostay-label.nl>';

export function emailConfigured() {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html, text }) {
  if (!emailConfigured()) {
    throw new Error('E-mail is nog niet geconfigureerd (RESEND_API_KEY ontbreekt).');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Resend-fout (${res.status})`);
  }
  return res.json();
}

// Nette HTML voor de magic-link mail.
export function magicLinkEmail(loginUrl) {
  const text = `Klik op de link om in te loggen bij Ecostay:\n\n${loginUrl}\n\nDeze link is 30 minuten geldig en kan één keer gebruikt worden. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.`;
  const html = `
  <div style="font-family:'Instrument Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#16231D">
    <div style="font-family:Georgia,serif;font-weight:600;font-size:22px;color:#16362B;margin-bottom:16px">
      eco<span style="color:#4E8062">stay</span>
    </div>
    <h1 style="font-family:Georgia,serif;font-weight:600;font-size:20px;margin:0 0 12px">Inloggen bij je verblijf</h1>
    <p style="font-size:15px;line-height:1.5;color:#5C6D63;margin:0 0 20px">
      Klik op de knop hieronder om in te loggen. De link is 30 minuten geldig en werkt één keer.
    </p>
    <a href="${loginUrl}" style="display:inline-block;background:#16362B;color:#EAF3E9;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">
      Inloggen bij Ecostay
    </a>
    <p style="font-size:13px;line-height:1.5;color:#8A9890;margin:24px 0 0">
      Heb je dit niet aangevraagd? Dan kun je deze mail veilig negeren.
    </p>
  </div>`;
  return { subject: 'Je inloglink voor Ecostay', html, text };
}

// Uitnodigingsmail voor een verblijf dat door de admin is uitgenodigd.
export function invitationEmail(stayName, certifyUrl) {
  const text = `Hallo,\n\nJe bent uitgenodigd om ${stayName} te certificeren met het Ecostay-duurzaamheidskeurmerk.\n\nStart hier: ${certifyUrl}\n\nMet vriendelijke groet,\nEcostay`;
  const html = `
  <div style="font-family:'Instrument Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#16231D">
    <div style="font-family:Georgia,serif;font-weight:600;font-size:22px;color:#16362B;margin-bottom:16px">
      eco<span style="color:#4E8062">stay</span>
    </div>
    <h1 style="font-family:Georgia,serif;font-weight:600;font-size:20px;margin:0 0 12px">Je bent uitgenodigd</h1>
    <p style="font-size:15px;line-height:1.5;color:#5C6D63;margin:0 0 20px">
      Je kunt <strong>${stayName}</strong> nu aanmelden voor het Ecostay-duurzaamheidskeurmerk —
      een betaalbaar, onafhankelijk keurmerk voor kleine hotels en B&B's.
    </p>
    <a href="${certifyUrl}" style="display:inline-block;background:#16362B;color:#EAF3E9;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">
      Start je certificering
    </a>
    <p style="font-size:13px;line-height:1.5;color:#8A9890;margin:24px 0 0">
      Vragen? Beantwoord gerust deze mail.
    </p>
  </div>`;
  return { subject: `Uitnodiging: certificeer ${stayName} met Ecostay`, html, text };
}

// Gedeelde HTML-wrapper voor transactionele mails.
function wrap(title, bodyHtml, ctaLabel, ctaUrl) {
  const cta = ctaUrl ? `
    <a href="${ctaUrl}" style="display:inline-block;background:#16362B;color:#EAF3E9;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px;margin-top:4px">
      ${ctaLabel}
    </a>` : '';
  return `
  <div style="font-family:'Instrument Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#16231D">
    <div style="font-family:Georgia,serif;font-weight:600;font-size:22px;color:#16362B;margin-bottom:16px">
      eco<span style="color:#4E8062">stay</span>
    </div>
    <h1 style="font-family:Georgia,serif;font-weight:600;font-size:20px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    ${cta}
  </div>`;
}

// Betaling gelukt / abonnement gestart.
export function paymentConfirmedEmail(stayName, tierLabel, dashboardUrl) {
  const body = `<p style="font-size:15px;line-height:1.5;color:#5C6D63;margin:0 0 20px">
    Je betaling voor <strong>${stayName}</strong> is gelukt en je ${tierLabel}-abonnement is gestart.
    Je kunt nu je zelfscan afronden en je gegevens beheren in je dashboard.</p>`;
  return { subject: `Betaling gelukt — ${stayName}`, html: wrap('Betaling gelukt', body, 'Naar mijn verblijf', dashboardUrl),
    text: `Je betaling voor ${stayName} is gelukt en je ${tierLabel}-abonnement is gestart.\n\nBeheer je verblijf: ${dashboardUrl}` };
}

// Certificaat behaald.
export function certifiedEmail(stayName, levelLabel, publicUrl) {
  const body = `<p style="font-size:15px;line-height:1.5;color:#5C6D63;margin:0 0 20px">
    Gefeliciteerd! <strong>${stayName}</strong> heeft het Ecostay-keurmerk behaald op niveau
    <strong>${levelLabel}</strong> en staat nu in het openbare overzicht.</p>`;
  return { subject: `Gecertificeerd: ${stayName} (${levelLabel})`, html: wrap('Je bent gecertificeerd 🌿', body, 'Bekijk je pagina', publicUrl),
    text: `Gefeliciteerd! ${stayName} heeft het Ecostay-keurmerk behaald op niveau ${levelLabel}.\n\nBekijk je pagina: ${publicUrl}` };
}

// Audit-uitslag (verified of afgewezen).
export function auditResultEmail(stayName, approved, publicUrl) {
  const title = approved ? 'Auditor-verificatie geslaagd ✓' : 'Auditor-verificatie: actie nodig';
  const body = approved
    ? `<p style="font-size:15px;line-height:1.5;color:#5C6D63;margin:0 0 20px">
        De auditor heeft <strong>${stayName}</strong> ter plaatse geverifieerd. Je verblijf toont nu
        het geverifieerde keurmerk.</p>`
    : `<p style="font-size:15px;line-height:1.5;color:#5C6D63;margin:0 0 20px">
        De auditor kon <strong>${stayName}</strong> nog niet verifiëren. Log in voor de details en de
        vervolgstappen.</p>`;
  return { subject: approved ? `Geverifieerd: ${stayName}` : `Verificatie: actie nodig — ${stayName}`,
    html: wrap(title, body, 'Bekijk details', publicUrl),
    text: approved
      ? `De auditor heeft ${stayName} geverifieerd.\n\n${publicUrl}`
      : `De auditor kon ${stayName} nog niet verifiëren. Log in voor details: ${publicUrl}` };
}
