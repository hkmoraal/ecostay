import { createContext, useContext, useEffect, useState } from 'react';

// Lichtgewicht meertaligheid (NL/EN/DE) via een React-context.
// Taalkeuze wordt onthouden in localStorage. Uitbreiden = sleutels toevoegen.

export const LANGUAGES = [
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
];

const T = {
  nl: {
    // Header
    nav_discover: 'Ontdek',
    nav_certify: 'Word gecertificeerd',
    nav_login: 'Inloggen',
    nav_register: 'Aanmelden',
    // Hero
    hero_pill: 'Voor kleine hotels & B&B\u2019s',
    hero_title_1: 'Groen slapen,',
    hero_title_2: 'puur genieten.',
    hero_lead: 'Elk verblijf hieronder doorliep dezelfde onafhankelijke toets. Eén tot drie blaadjes vertellen je in één oogopslag hoe ver ze gaan.',
    legend_bronze: 'Brons', legend_bronze_d: 'Solide basis',
    legend_silver: 'Zilver', legend_silver_d: 'Ruim boven de norm',
    legend_gold: 'Goud', legend_gold_d: 'Koploper',
    register_stay: 'Meld aan als verblijf',
    register_auditor: 'Meld aan als auditor',
    // Stats
    stat_stays: 'verblijven',
    stat_countries: 'landen',
    stat_levels: 'niveaus',
    // Wat doet Ecostay
    about_title: 'Wat doet Ecostay?',
    about_body: 'Ecostay is een onafhankelijk duurzaamheidskeurmerk voor kleine hotels, B&B\u2019s en campings. We toetsen de duurzaamheid van een verblijf met een heldere vragenlijst en — bij een geverifieerd certificaat — een audit ter plaatse. Elk gecertificeerd verblijf krijgt één tot drie blaadjes, zodat gasten in één oogopslag zien hoe groen het is.',
    // Voordelen verblijf
    benefits_stay_title: 'Voordelen voor een verblijf',
    bs_1: 'Betaalbaar certificaat met maandelijkse betaling',
    bs_2: 'Digitale of geverifieerde audit — jij kiest',
    bs_3: 'Zichtbaar in de openbare zoekgids',
    bs_4: 'Concrete tips om te verduurzamen',
    // Voordelen auditor
    benefits_auditor_title: 'Voordelen voor een auditor',
    ba_1: 'Kies zelf audits bij jou in de buurt',
    ba_2: 'Duidelijke vergoeding per audit',
    ba_3: 'Alles digitaal: vragenlijst, foto\u2019s, uitbetaling',
    ba_4: 'Draag bij aan verduurzaming van de sector',
    // Directory
    directory_title: 'Gecertificeerde verblijven',
    search_placeholder: 'Zoek op naam of plaats',
    filter_all: 'Alles', filter_gold: 'Goud', filter_silver: 'Zilver', filter_bronze: 'Brons',
    loading_stays: 'Verblijven laden…',
    error_stays: 'De verblijven konden niet geladen worden. Probeer het straks opnieuw.',
    empty_stays: 'Geen verblijven gevonden met deze filters.',
    // Footer
    footer_tagline: 'Onafhankelijk duurzaamheidskeurmerk voor overnachtingen.',
    footer_privacy: 'Privacy', footer_terms: 'Voorwaarden', footer_cookies: 'Cookies',
    footer_auditor: 'Auditor', footer_admin: 'Beheer',
  },
  en: {
    nav_discover: 'Discover',
    nav_certify: 'Get certified',
    nav_login: 'Log in',
    nav_register: 'Sign up',
    hero_pill: 'For small hotels & B&Bs',
    hero_title_1: 'Sleep green,',
    hero_title_2: 'simply enjoy.',
    hero_lead: 'Every stay below passed the same independent assessment. One to three leaves show you at a glance how far they go.',
    legend_bronze: 'Bronze', legend_bronze_d: 'Solid foundation',
    legend_silver: 'Silver', legend_silver_d: 'Well above standard',
    legend_gold: 'Gold', legend_gold_d: 'Front-runner',
    register_stay: 'Register as a stay',
    register_auditor: 'Register as an auditor',
    stat_stays: 'stays',
    stat_countries: 'countries',
    stat_levels: 'levels',
    about_title: 'What does Ecostay do?',
    about_body: 'Ecostay is an independent sustainability label for small hotels, B&Bs and campsites. We assess a stay\u2019s sustainability with a clear questionnaire and — for a verified certificate — an on-site audit. Every certified stay earns one to three leaves, so guests can see at a glance how green it is.',
    benefits_stay_title: 'Benefits for a stay',
    bs_1: 'Affordable certificate with monthly payment',
    bs_2: 'Digital or verified audit — you choose',
    bs_3: 'Visible in the public directory',
    bs_4: 'Concrete tips to become greener',
    benefits_auditor_title: 'Benefits for an auditor',
    ba_1: 'Pick audits near you',
    ba_2: 'Clear fee per audit',
    ba_3: 'All digital: questionnaire, photos, payout',
    ba_4: 'Help make the sector more sustainable',
    directory_title: 'Certified stays',
    search_placeholder: 'Search by name or place',
    filter_all: 'All', filter_gold: 'Gold', filter_silver: 'Silver', filter_bronze: 'Bronze',
    loading_stays: 'Loading stays…',
    error_stays: 'Could not load the stays. Please try again later.',
    empty_stays: 'No stays found with these filters.',
    footer_tagline: 'Independent sustainability label for stays.',
    footer_privacy: 'Privacy', footer_terms: 'Terms', footer_cookies: 'Cookies',
    footer_auditor: 'Auditor', footer_admin: 'Admin',
  },
  de: {
    nav_discover: 'Entdecken',
    nav_certify: 'Zertifiziert werden',
    nav_login: 'Anmelden',
    nav_register: 'Registrieren',
    hero_pill: 'Für kleine Hotels & B&Bs',
    hero_title_1: 'Grün schlafen,',
    hero_title_2: 'einfach genießen.',
    hero_lead: 'Jede Unterkunft unten hat dieselbe unabhängige Prüfung durchlaufen. Ein bis drei Blätter zeigen auf einen Blick, wie weit sie gehen.',
    legend_bronze: 'Bronze', legend_bronze_d: 'Solide Basis',
    legend_silver: 'Silber', legend_silver_d: 'Deutlich über dem Standard',
    legend_gold: 'Gold', legend_gold_d: 'Vorreiter',
    register_stay: 'Als Unterkunft anmelden',
    register_auditor: 'Als Auditor anmelden',
    stat_stays: 'Unterkünfte',
    stat_countries: 'Länder',
    stat_levels: 'Stufen',
    about_title: 'Was macht Ecostay?',
    about_body: 'Ecostay ist ein unabhängiges Nachhaltigkeitssiegel für kleine Hotels, B&Bs und Campingplätze. Wir prüfen die Nachhaltigkeit einer Unterkunft mit einem klaren Fragebogen und – bei einem verifizierten Zertifikat – einer Vor-Ort-Prüfung. Jede zertifizierte Unterkunft erhält ein bis drei Blätter, damit Gäste auf einen Blick sehen, wie grün sie ist.',
    benefits_stay_title: 'Vorteile für eine Unterkunft',
    bs_1: 'Erschwingliches Zertifikat mit monatlicher Zahlung',
    bs_2: 'Digitale oder verifizierte Prüfung — Sie wählen',
    bs_3: 'Sichtbar im öffentlichen Verzeichnis',
    bs_4: 'Konkrete Tipps für mehr Nachhaltigkeit',
    benefits_auditor_title: 'Vorteile für einen Auditor',
    ba_1: 'Wähle Prüfungen in deiner Nähe',
    ba_2: 'Klare Vergütung pro Prüfung',
    ba_3: 'Alles digital: Fragebogen, Fotos, Auszahlung',
    ba_4: 'Trage zur Nachhaltigkeit der Branche bei',
    directory_title: 'Zertifizierte Unterkünfte',
    search_placeholder: 'Nach Name oder Ort suchen',
    filter_all: 'Alle', filter_gold: 'Gold', filter_silver: 'Silber', filter_bronze: 'Bronze',
    loading_stays: 'Unterkünfte werden geladen…',
    error_stays: 'Die Unterkünfte konnten nicht geladen werden. Bitte später erneut versuchen.',
    empty_stays: 'Keine Unterkünfte mit diesen Filtern gefunden.',
    footer_tagline: 'Unabhängiges Nachhaltigkeitssiegel für Unterkünfte.',
    footer_privacy: 'Datenschutz', footer_terms: 'AGB', footer_cookies: 'Cookies',
    footer_auditor: 'Auditor', footer_admin: 'Verwaltung',
  },
};

const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ecostay_lang') || 'nl');
  useEffect(() => {
    localStorage.setItem('ecostay_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (code) => setLangState(code);
  const t = (key) => (T[lang]?.[key] ?? T.nl[key] ?? key);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang: 'nl', setLang: () => {}, t: (k) => (T.nl[k] ?? k) };
  return ctx;
}
