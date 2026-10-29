import LegalPage, { H2, P, UL } from "@/components/LegalPage";
import { clearConsent } from "@/lib/consent";
import { useLang } from "@/lib/LanguageContext";

export default function Datenschutz() {
  const { lang } = useLang();
  const de = lang === "de";
  return (
    <LegalPage title={de ? "Datenschutzerklärung" : "Privacy Policy"}>
      <H2>{de ? "Verantwortlicher" : "Controller"}</H2>
      <P>{de ? "Filip Sudermann, Hannover. Kontakt: info@filipsudermann.com" : "Filip Sudermann, Hannover. Contact: info@filipsudermann.com"}</P>

      <H2>{de ? "Erhobene Daten" : "Data we collect"}</H2>
      <UL items={de ? [
        "Account-Daten: E-Mail, Name, Universität, ORCID, Nutzername",
        "Uploads: Präsentationsdateien, Handouts, Thumbnails",
        "technisch notwendige Server-Logs (IP-Adresse gekürzt, Browsertyp, Zugriffszeit)",
        "Reichweitenmessung über Metricool — nur nach deiner ausdrücklichen Einwilligung",
        "Nutzungsdaten: Downloads, Bewertungen, Kommentare",
      ] : [
        "Account data: email, name, university, ORCID, username",
        "Uploads: presentation files, handouts, thumbnails",
        "technically necessary server logs (truncated IP address, browser type, access time)",
        "reach measurement via Metricool — only after your explicit consent",
        "Usage data: downloads, ratings, comments",
      ]} />

      <H2>{de ? "Rechtsgrundlage" : "Legal basis"}</H2>
      <P>{de ? "Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie ggf. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse). Soweit eine Einwilligung eingeholt wird, auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO." : "Processing is based on Art. 6(1)(b) GDPR (contract performance) and, where applicable, Art. 6(1)(f) GDPR (legitimate interest). Where consent is obtained, on Art. 6(1)(a) GDPR."}</P>

      <H2>{de ? "Externe Dienste / Auftragsverarbeitung" : "External services / processors"}</H2>
      <UL items={de ? [
        "Cloudflare — Hosting, Datenbank (D1), Dateispeicher (R2)",
        "Resend — Versand von Bestätigungs- und Passwort-Reset-E-Mails",
        "CrossRef, OpenAlex, Unpaywall, doi.org — Abfrage von Paper-Metadaten und Lizenzen zur Lizenzprüfung",
        "Anthropic — Lizenzrecherche und Textauswertung hochgeladener Dateien (nur wenn aktiviert)",
        "Metricool — Reichweitenmessung, lädt erst nach Einwilligung",
      ] : [
        "Cloudflare — hosting, database (D1), file storage (R2)",
        "Resend — delivery of verification and password reset emails",
        "CrossRef, OpenAlex, Unpaywall, doi.org — paper metadata and license lookups",
        "Anthropic — license research and text analysis of uploaded files (only when enabled)",
        "Metricool — reach measurement, loaded only after consent",
      ]} />
      <P>{de ? "Diese Einbindung stellt keine Weitergabe an Dritte im werblichen Sinne dar, sondern technisch notwendige Auftragsverarbeitung gemäß Art. 28 DSGVO." : "This integration does not constitute advertising-related disclosure to third parties, but technically necessary processing on our behalf under Art. 28 GDPR."}</P>

      <H2>{de ? "Serverstandort / Hosting" : "Server location / hosting"}</H2>
      <P>{de ? "Hosting über das globale Netzwerk von Cloudflare; Datenbank und Dateispeicher liegen in der von uns gewählten Region." : "Hosting runs on Cloudflare's global network; database and file storage are located in the region we selected."}</P>
      <P>{de ? "Bei Hosting außerhalb der EU erfolgt die Übermittlung auf Grundlage des EU-US Data Privacy Frameworks." : "Where hosting is outside the EU, data transfer is based on the EU-US Data Privacy Framework."}</P>

      <H2>{de ? "Speicherdauer" : "Storage period"}</H2>
      <P>{de ? "Account- und Upload-Daten werden bis zur Löschung durch den Nutzer gespeichert. Logdaten und Backups werden 30 Tage aufbewahrt." : "Account and upload data is stored until deletion by the user. Log data and backups are retained for 30 days."}</P>

      <H2>{de ? "Betroffenenrechte" : "Data subject rights"}</H2>
      <UL items={de ? [
        "Recht auf Auskunft",
        "Recht auf Berichtigung",
        "Recht auf Löschung",
        "Recht auf Einschränkung der Verarbeitung",
        "Recht auf Datenübertragbarkeit",
        "Recht auf Widerspruch",
        "Recht auf Widerruf der Einwilligung",
        "Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde",
      ] : [
        "Right of access",
        "Right to rectification",
        "Right to erasure",
        "Right to restriction of processing",
        "Right to data portability",
        "Right to object",
        "Right to withdraw consent",
        "Right to lodge a complaint with a data protection authority",
      ]} />

      <H2>{de ? "Einwilligung widerrufen" : "Withdraw consent"}</H2>
      <P>{de
        ? "Deine Entscheidung zur Reichweitenmessung kannst du jederzeit ändern. Der Widerruf wirkt für die Zukunft; die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt."
        : "You can change your decision about reach measurement at any time. Withdrawal takes effect going forward; it does not affect the lawfulness of processing carried out before."}</P>
      {/* Withdrawal has to be as easy as consenting, so it is a button here
          and not an instruction to clear browser storage by hand. */}
      <button
        type="button"
        onClick={() => { clearConsent(); window.location.reload(); }}
        className="mt-2 mb-2 inline-flex items-center min-h-[44px] px-5 py-2.5 rounded-lg border border-[#C79A52] text-[#7A5C28] text-sm font-semibold hover:bg-[#C79A52]/12 transition-colors"
      >
        {de ? "Entscheidung erneut treffen" : "Choose again"}
      </button>

      <H2>{de ? "Sicherheit" : "Security"}</H2>
      <P>{de ? "TLS-Verschlüsselung, Passwort-Hashing (bcrypt)." : "TLS encryption, password hashing (bcrypt)."}</P>

      <H2>{de ? "Kontakt" : "Contact"}</H2>
      <P>{de ? "DSGVO-Anfragen an info@filipsudermann.com, Betreff: DSGVO" : "Send GDPR requests to info@filipsudermann.com with subject: GDPR"}</P>
    </LegalPage>
  );
}