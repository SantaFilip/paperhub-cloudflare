import LegalPage, { H2, P, UL } from "@/components/LegalPage";
import { useLang } from "@/lib/LanguageContext";

export default function Agb() {
  const { lang } = useLang();
  const de = lang === "de";
  return (
    <LegalPage title={de ? "Nutzungsbedingungen (AGB)" : "Terms of Use"}>
      <H2>{de ? "Geltungsbereich" : "Scope"}</H2>
      <P>{de ? "Diese Nutzungsbedingungen gelten für die Nutzung von PaperHub." : "These terms apply to the use of PaperHub."}</P>

      <H2>{de ? "Lizenzklausel" : "License"}</H2>
      <P>{de ? "Mit dem Hochladen räumt der Nutzer PaperHub ein einfaches, nicht-exklusives, widerrufliches Nutzungsrecht ein, die Inhalte zu hosten, anzuzeigen und für die Plattformfunktionen (z. B. Thumbnail-Erstellung) zu verarbeiten. Alle Urheberrechte bleiben beim Nutzer." : "By uploading, the user grants PaperHub a simple, non-exclusive, revocable right to host, display, and process the content for platform functions (e.g. thumbnail generation). All copyrights remain with the user."}</P>

      <H2>{de ? "Rechteinhaber-Versicherung" : "Authorship assurance"}</H2>
      <P>{de ? "Du versicherst, dass du Rechteinhaber der hochgeladenen Inhalte bist oder über die nötigen Lizenzen verfügst." : "You warrant that you own the rights to the uploaded content or hold the necessary licenses."}</P>

      <H2>{de ? "Erlaubt" : "Allowed"}</H2>
      <UL items={de ? [
        "Präsentationen hochladen, CC-Lizenzen nutzen, Daten exportieren",
      ] : [
        "Upload presentations, use CC licenses, export your data",
      ]} />

      <H2>{de ? "Nicht erlaubt" : "Not allowed"}</H2>
      <UL items={de ? [
        "Geschützte Inhalte ohne Genehmigung",
        "Bots, Spam, automatisierte Abfragen",
        "Illegale oder missbräuchliche Inhalte",
      ] : [
        "Copyrighted content without permission",
        "Bots, spam, automated queries",
        "Illegal or abusive content",
      ]} />

      <H2>{de ? "Kündigung" : "Termination"}</H2>
      <P>{de ? "Nutzer können ihren Account jederzeit per E-Mail an info@filipsudermann.com löschen lassen. Mit der Löschung werden die zugehörigen Daten gemäß Datenschutzerklärung entfernt." : "Users can request account deletion at any time via info@filipsudermann.com. Upon deletion, the associated data is removed in accordance with the privacy policy."}</P>

      <H2>{de ? "Änderungsvorbehalt" : "Right to amend"}</H2>
      <P>{de ? "PaperHub behält sich vor, diese Nutzungsbedingungen mit angemessener Ankündigungsfrist zu ändern. Die fortgesetzte Nutzung nach Inkrafttreten gilt als Zustimmung." : "PaperHub reserves the right to amend these terms with reasonable notice. Continued use after the changes take effect constitutes acceptance."}</P>

      <H2>{de ? "Mindestalter" : "Minimum age"}</H2>
      <P>{de ? "Die Nutzung von PaperHub ist ab 16 Jahren gestattet." : "Use of PaperHub is permitted from age 16."}</P>

      <H2>{de ? "Haftungsausschluss für Inhalte Dritter" : "Liability for third-party content"}</H2>
      <P>{de ? "PaperHub haftet nicht für Urheberrechtsverletzungen durch von Nutzern hochgeladene Inhalte." : "PaperHub is not liable for copyright infringements caused by user-uploaded content."}</P>

      <H2>{de ? "Haftung" : "Liability"}</H2>
      <P>{de ? "PaperHub garantiert keine 100 % Verfügbarkeit oder fehlerfreie Lizenzprüfung." : "PaperHub does not guarantee 100% uptime or error-free license checks."}</P>

      <H2>{de ? "Rechtswahl" : "Governing law"}</H2>
      <P>{de ? "Es gilt deutsches Recht." : "German law applies."}</P>
    </LegalPage>
  );
}