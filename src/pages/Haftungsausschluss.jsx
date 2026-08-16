import LegalPage, { H2, P } from "@/components/LegalPage";
import { useLang } from "@/lib/LanguageContext";

export default function Haftungsausschluss() {
  const { lang } = useLang();
  const de = lang === "de";
  return (
    <LegalPage title={de ? "Haftungsausschluss" : "Disclaimer"}>
      <H2>{de ? "Inhalte" : "Content"}</H2>
      <P>{de ? "PaperHub garantiert keine 100 % Verfügbarkeit oder fehlerfreie Lizenzprüfung." : "PaperHub does not guarantee 100% uptime or error-free license checks."}</P>
      <P>{de ? "Du bist verantwortlich für die Rechtmäßigkeit deiner Uploads." : "You are responsible for the legality of your uploads."}</P>

      <H2>{de ? "Haftungsausschluss" : "Limitation of liability"}</H2>
      <P>{de ? "Dieser Haftungsausschluss gilt nicht für Vorsatz, grobe Fahrlässigkeit sowie Schäden aus der Verletzung von Leben, Körper oder Gesundheit." : "This disclaimer does not apply to intent, gross negligence, or damage to life, body, or health."}</P>

      <H2>{de ? "Urheberrechts-Beschwerde" : "Copyright complaint"}</H2>
      <P>{de ? "Urheberrechts-Beschwerden richten Sie bitte an info@filipsudermann.com." : "Please send copyright complaints to info@filipsudermann.com."}</P>
    </LegalPage>
  );
}