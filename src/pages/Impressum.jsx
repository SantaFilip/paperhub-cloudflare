import LegalPage, { H2, P } from "@/components/LegalPage";
import { useLang } from "@/lib/LanguageContext";

export default function Impressum() {
  const { lang } = useLang();
  const de = lang === "de";
  return (
    <LegalPage title={de ? "Impressum" : "Legal Notice"}>
      <P><strong>{de ? "Angaben gemäß § 5 TMG" : "Information according to § 5 TMG"}</strong></P>
      <P><strong>{de ? "Verantwortlich:" : "Responsible:"}</strong> Filip Sudermann</P>
      <P><strong>{de ? "Postanschrift:" : "Postal address:"}</strong> Platz an der Basilika 4, 30169 Hannover</P>
      <P><strong>E-Mail:</strong> info@filipsudermann.com</P>
      <P><strong>{de ? "Telefon:" : "Phone:"}</strong> +49 176 75084228</P>
      <P><strong>{de ? "Standort:" : "Location:"}</strong> Hannover, Niedersachsen, Deutschland</P>
      <P><strong>Status:</strong> {de ? "Start-up Initiative" : "Start-up Initiative"}</P>

      <H2>{de ? "Haftung für Inhalte" : "Liability for content"}</H2>
      <P>{de ? "Als Diensteanbieter bin ich für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich." : "As a service provider, I am responsible for my own content under the general laws."}</P>

      <H2>{de ? "Haftung für Links" : "Liability for links"}</H2>
      <P>{de ? "Für Inhalte externer verlinkter Seiten übernehme ich keine Verantwortung." : "I am not responsible for the content of external linked pages."}</P>

      <H2>{de ? "Urheberrecht" : "Copyright"}</H2>
      <P>{de ? "Beschwerden zu Urheberrechtsverletzungen richten Sie bitte an info@filipsudermann.com." : "Please send copyright complaints to info@filipsudermann.com."}</P>
    </LegalPage>
  );
}