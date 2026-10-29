import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLang } from "@/lib/LanguageContext";
import { readConsent, writeConsent, loadAnalytics } from "@/lib/consent";

/**
 * Asks before the reach measurement loads.
 *
 * Refusing is one click on a button of the same size and weight as accepting —
 * a banner where "no" is a faint link does not collect valid consent. It is a
 * non-modal region rather than a dialog: it does not trap focus or cover the
 * page, so someone who ignores it can still read and use the site.
 */
export default function ConsentBanner() {
  const { lang } = useLang();
  const de = lang === "de";
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const entscheidung = readConsent();
    if (entscheidung === "granted") {
      loadAnalytics();        // decided on an earlier visit
    } else if (entscheidung === null) {
      setSichtbar(true);      // nobody has been asked yet
    }
  }, []);

  if (!sichtbar) return null;

  const entscheiden = (wert) => {
    writeConsent(wert);
    if (wert === "granted") loadAnalytics();
    setSichtbar(false);
  };

  return (
    <div
      role="region"
      aria-label={de ? "Einwilligung zur Reichweitenmessung" : "Consent for reach measurement"}
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-[#C79A52]/45 bg-[#0E1621]/95 backdrop-blur-sm shadow-2xl">
        <div className="p-5 sm:p-6">
          <p className="text-[#F0DFB4] text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase mb-3">
            {de ? "Reichweitenmessung" : "Reach measurement"}
          </p>
          <p className="text-[#E2DDD0] text-sm leading-relaxed mb-5">
            {de
              ? "Wir würden gern messen, wie das Archiv genutzt wird. Dafür lädt Metricool ein Skript und speichert eine Kennung auf deinem Gerät. Ohne deine Zustimmung passiert das nicht — die Seite funktioniert vollständig auch ohne."
              : "We would like to measure how the archive is used. For that, Metricool loads a script and stores an identifier on your device. Without your consent this does not happen — the site works fully either way."}{" "}
            <Link to="/datenschutz" className="text-[#F0DFB4] underline underline-offset-2">
              {de ? "Datenschutzerklärung" : "Privacy policy"}
            </Link>
          </p>
          {/* Both buttons carry the same weight: refusing must be no harder
              than agreeing, otherwise the consent is not freely given. */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => entscheiden("granted")}
              className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#C79A52] text-[#1A1206] text-sm font-semibold hover:bg-[#D9B36C] transition-colors"
            >
              {de ? "Einverstanden" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => entscheiden("denied")}
              className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg border border-[#C79A52]/55 text-[#F0DFB4] text-sm font-semibold hover:bg-[#C79A52]/15 transition-colors"
            >
              {de ? "Ablehnen" : "Decline"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
