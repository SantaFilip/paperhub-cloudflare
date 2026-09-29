import LegalPage, { H2, P, UL } from "@/components/LegalPage";
import { useLang } from "@/lib/LanguageContext";

// Accessibility statement (Erklärung zur Barrierefreiheit) as expected under
// the BFSG / European Accessibility Act, including a feedback channel.
export default function Barrierefreiheit() {
  const { lang } = useLang();
  const de = lang === "de";
  return (
    <LegalPage title={de ? "Erklärung zur Barrierefreiheit" : "Accessibility statement"} updated="29.09.2026">
      <P>
        {de
          ? "PaperHub soll für alle Menschen nutzbar sein – auch mit Screenreader, nur mit Tastatur, mit Vergrößerung oder bei eingeschränktem Farbsehen. Maßstab sind die Web Content Accessibility Guidelines (WCAG) 2.2 auf Stufe AA bzw. die harmonisierte Norm EN 301 549."
          : "PaperHub aims to be usable by everyone – including with a screen reader, keyboard only, magnification or limited colour vision. The benchmark is the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA and the harmonised standard EN 301 549."}
      </P>

      <H2>{de ? "Stand der Vereinbarkeit" : "Compliance status"}</H2>
      <P>
        {de
          ? "Diese Website ist weitgehend mit WCAG 2.2 AA vereinbar. Die unten genannten Punkte sind noch nicht vollständig barrierefrei."
          : "This website is largely compliant with WCAG 2.2 AA. The points listed below are not yet fully accessible."}
      </P>

      <H2>{de ? "Umgesetzt" : "What we do"}</H2>
      <UL
        items={
          de
            ? [
                "Vollständige Bedienbarkeit per Tastatur mit gut sichtbarem Fokus und einem Link „Zum Inhalt springen“.",
                "Beschriftete Formularfelder, verständliche Fehlermeldungen und Statusmeldungen, die Screenreader vorlesen.",
                "Ausreichende Farbkontraste; Informationen werden nicht allein über Farbe vermittelt.",
                "Eigene Seitentitel, korrekte Sprachauszeichnung (Deutsch/Englisch) und eine klare Überschriften- und Landmarkenstruktur.",
                "Reduzierte Animationen, wenn das Betriebssystem „Bewegung reduzieren“ meldet.",
                "Nutzbar bis 400 % Vergrößerung und auf kleinen Bildschirmen.",
              ]
            : [
                "Fully operable by keyboard, with a clearly visible focus and a “Skip to main content” link.",
                "Labelled form fields, clear error messages and status messages that screen readers announce.",
                "Sufficient colour contrast; information is never conveyed by colour alone.",
                "Individual page titles, correct language markup (German/English) and a clear heading and landmark structure.",
                "Reduced animation when the operating system requests reduced motion.",
                "Usable at up to 400% zoom and on small screens.",
              ]
        }
      />

      <H2>{de ? "Nicht barrierefreie Inhalte" : "Non-accessible content"}</H2>
      <UL
        items={
          de
            ? [
                "Hochgeladene Präsentationen und Handouts (PDF/PPTX) stammen von Nutzerinnen und Nutzern. Ob diese Dateien barrierefrei sind, liegt in deren Verantwortung und kann von PaperHub nicht geprüft werden.",
                "Vorschaubilder der ersten Folie haben keine ausführliche Bildbeschreibung; der Inhalt ist über Titel und Metadaten erschlossen.",
                "Einige technische Fehlermeldungen des Servers erscheinen nur auf Englisch.",
              ]
            : [
                "Uploaded presentations and handouts (PDF/PPTX) are provided by users. Their accessibility is the uploader's responsibility and cannot be checked by PaperHub.",
                "Preview images of the first slide have no detailed description; their content is conveyed by the title and metadata.",
                "Some technical server error messages appear in English only.",
              ]
        }
      />

      <H2>{de ? "Erstellung dieser Erklärung" : "Preparation of this statement"}</H2>
      <P>
        {de
          ? "Die Erklärung beruht auf einer Selbstbewertung vom 29.09.2026: automatisierte Prüfung aller Seiten mit axe-core (WCAG 2.2 A/AA) in Desktop- und Mobilansicht sowie manuelle Prüfung von Tastaturbedienung, Fokusführung und Screenreader-Ausgaben."
          : "This statement is based on a self-assessment dated 29 September 2026: automated testing of all pages with axe-core (WCAG 2.2 A/AA) in desktop and mobile views, plus manual checks of keyboard operation, focus handling and screen reader output."}
      </P>

      <H2>{de ? "Barrieren melden" : "Report a barrier"}</H2>
      <P>
        {de ? "Du bist auf eine Barriere gestoßen? Schreib an " : "Did you run into a barrier? Write to "}
        <a href="mailto:info@filipsudermann.com?subject=Barrierefreiheit" className="text-[#1D4ED8]">info@filipsudermann.com</a>
        {de
          ? " mit dem Betreff „Barrierefreiheit“. Wir antworten innerhalb von 14 Tagen und stellen dir die Inhalte bei Bedarf in einer zugänglichen Form bereit."
          : " with the subject “Accessibility”. We reply within 14 days and, if needed, provide the content in an accessible format."}
      </P>

      <H2>{de ? "Durchsetzung" : "Enforcement"}</H2>
      <P>
        {de
          ? "Bleibt deine Anfrage ohne zufriedenstellende Lösung, kannst du dich an die Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF) in Magdeburg wenden: "
          : "If your request is not resolved satisfactorily, you can contact the German market surveillance authority for the accessibility of products and services (MLBF) in Magdeburg: "}
        <a href="https://www.mlbf-barrierefrei.de/" className="text-[#1D4ED8]">www.mlbf-barrierefrei.de</a>
      </P>
    </LegalPage>
  );
}
