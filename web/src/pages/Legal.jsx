import { Link } from 'react-router-dom';

// Eenvoudige, aanpasbare juridische pagina's. Vervang de placeholders
// (bedrijfsnaam, KvK, adres) door je echte gegevens vóór livegang.
const COMPANY = {
  name: 'Ecostay',
  legalName: '[Bedrijfsnaam B.V.]',
  email: 'info@ecostay-label.nl',
  kvk: '[KvK-nummer]',
  address: '[Adres]',
};

function Shell({ title, children }) {
  return (
    <div className="container container--narrow pad legal">
      <Link to="/" className="back-link">← Terug</Link>
      <h1 className="page-title">{title}</h1>
      {children}
      <p className="muted" style={{ marginTop: 32, fontSize: 13 }}>
        Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}. Dit is een
        basisversie — laat 'm vóór livegang controleren door een jurist.
      </p>
    </div>
  );
}

export function Privacy() {
  return (
    <Shell title="Privacyverklaring">
      <p>{COMPANY.name} verwerkt persoonsgegevens zorgvuldig en alleen waar nodig om het
        duurzaamheidskeurmerk aan te bieden.</p>
      <h2 className="section-title">Welke gegevens</h2>
      <p>Van verblijven: naam, type, adres/plaats, website, e-mailadres, foto en de antwoorden op
        de duurzaamheidsvragenlijst. Van auditors: naam, e-mailadres en IBAN. Van bezoekers:
        alleen technische gegevens die nodig zijn om de site te tonen.</p>
      <h2 className="section-title">Waarvoor</h2>
      <p>Om je verblijf te certificeren en te tonen in het openbare overzicht, om betalingen te
        verwerken (via Mollie), om inloglinks en bevestigingen te mailen (via Resend), en om
        foto's op te slaan (via Cloudinary).</p>
      <h2 className="section-title">Bewaartermijn</h2>
      <p>We bewaren gegevens zolang je verblijf gecertificeerd is of een account actief is, en
        daarna niet langer dan wettelijk vereist.</p>
      <h2 className="section-title">Je rechten</h2>
      <p>Je hebt recht op inzage, correctie en verwijdering van je gegevens. Mail daarvoor naar{' '}
        <a className="link" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>
      <h2 className="section-title">Verwerkers</h2>
      <p>We schakelen Mollie (betalingen), Resend (e-mail), Cloudinary (foto's), Neon (database),
        Render en Vercel (hosting) in. Met elk daarvan gelden hun eigen verwerkersvoorwaarden.</p>
      <p style={{ marginTop: 16 }}>{COMPANY.legalName} · KvK {COMPANY.kvk} · {COMPANY.address}</p>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell title="Algemene voorwaarden">
      <h2 className="section-title">Dienst</h2>
      <p>{COMPANY.name} biedt een duurzaamheidskeurmerk voor overnachtingen. Verblijven melden zich
        aan, doorlopen een zelfscan en — bij het Verified-abonnement — een verificatie ter plaatse
        door een onafhankelijke auditor.</p>
      <h2 className="section-title">Abonnement en betaling</h2>
      <p>Het keurmerk werkt op basis van een maandabonnement (Self € 2 of Verified € 8 per maand),
        geïncasseerd via Mollie. Je kunt maandelijks opzeggen via je dashboard; bij opzegging
        vervalt het keurmerk.</p>
      <h2 className="section-title">Herbeoordeling</h2>
      <p>Een certificaat is 12 maanden geldig. In het laatste jaar kun je een herbeoordeling door
        een auditor aanvragen; de prijs hangt af van hoe ver je van de verloopdatum zit.</p>
      <h2 className="section-title">Aansprakelijkheid</h2>
      <p>Het keurmerk weerspiegelt de aangeleverde en (bij Verified) gecontroleerde informatie.
        {' '}{COMPANY.name} is niet aansprakelijk voor onjuiste opgave door een verblijf.</p>
      <p style={{ marginTop: 16 }}>{COMPANY.legalName} · KvK {COMPANY.kvk}</p>
    </Shell>
  );
}

export function Cookies() {
  return (
    <Shell title="Cookies">
      <p>{COMPANY.name} gebruikt alleen functionele opslag die nodig is om de site te laten werken
        — bijvoorbeeld om je ingelogd te houden (je sessietoken). We plaatsen geen tracking- of
        advertentiecookies.</p>
      <h2 className="section-title">Wat we opslaan</h2>
      <p>Een sessietoken voor ingelogde verblijven en, waar van toepassing, een sleutel voor de
        auditor- of beheeromgeving. Deze staan in de lokale opslag van je browser en worden niet
        met derden gedeeld.</p>
    </Shell>
  );
}
