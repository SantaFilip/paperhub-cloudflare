import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

const LICENSE_DETAILS = {
  "CC0 1.0": {
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    en: {
      title: "No Rights Reserved (Public Domain)",
      allows: ["Use for any purpose", "Modify and adapt freely", "Share and redistribute", "Commercial use", "No attribution required"],
      conditions: [],
      note: "The author has waived all copyright and related rights worldwide.",
    },
    de: {
      title: "Keine Rechte vorbehalten (Gemeinfrei)",
      allows: ["Jede Nutzung erlaubt", "Freie Bearbeitung", "Weiterverbreitung", "Kommerzielle Nutzung", "Keine Namensnennung erforderlich"],
      conditions: [],
      note: "Der Urheber hat weltweit auf alle Urheber- und verwandten Rechte verzichtet.",
    },
  },
  "CC BY 4.0": {
    url: "https://creativecommons.org/licenses/by/4.0/",
    en: {
      title: "Attribution 4.0 International",
      allows: ["Share and redistribute", "Modify and adapt", "Commercial use"],
      conditions: ["Credit the original author (name, source, license, changes)"],
      note: null,
    },
    de: {
      title: "Namensnennung 4.0 International",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung", "Kommerzielle Nutzung"],
      conditions: ["Urheber nennen (Name, Quelle, Lizenz, Änderungen)"],
      note: null,
    },
  },
  "CC BY-SA 4.0": {
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    en: {
      title: "Attribution-ShareAlike 4.0",
      allows: ["Share and redistribute", "Modify and adapt", "Commercial use"],
      conditions: ["Credit the original author", "Distribute derivatives under the same license"],
      note: null,
    },
    de: {
      title: "Namensnennung-Weitergabe unter gleichen Bedingungen 4.0",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung", "Kommerzielle Nutzung"],
      conditions: ["Urheber nennen", "Abgeleitete Werke unter gleicher Lizenz veröffentlichen"],
      note: null,
    },
  },
  "CC BY-NC 4.0": {
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
    en: {
      title: "Attribution-NonCommercial 4.0",
      allows: ["Share and redistribute", "Modify and adapt"],
      conditions: ["Credit the original author", "Non-commercial use only"],
      note: null,
    },
    de: {
      title: "Namensnennung-Nicht kommerziell 4.0",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung"],
      conditions: ["Urheber nennen", "Nur nicht-kommerzielle Nutzung"],
      note: null,
    },
  },
  "CC BY-NC-SA 4.0": {
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    en: {
      title: "Attribution-NonCommercial-ShareAlike 4.0",
      allows: ["Share and redistribute", "Modify and adapt"],
      conditions: ["Credit the original author", "Non-commercial use only", "Same license for derivatives"],
      note: null,
    },
    de: {
      title: "Namensnennung-Nicht kommerziell-Weitergabe unter gleichen Bedingungen 4.0",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung"],
      conditions: ["Urheber nennen", "Nur nicht-kommerzielle Nutzung", "Abgeleitete Werke unter gleicher Lizenz"],
      note: null,
    },
  },
  "CC BY-ND 4.0": {
    url: "https://creativecommons.org/licenses/by-nd/4.0/",
    en: {
      title: "Attribution-NoDerivatives 4.0",
      allows: ["Share and redistribute", "Commercial use"],
      conditions: ["Credit the original author", "No modifications allowed", "Distribute as-is only"],
      note: null,
    },
    de: {
      title: "Namensnennung-Keine Bearbeitungen 4.0",
      allows: ["Teilen und weiterverbreiten", "Kommerzielle Nutzung"],
      conditions: ["Urheber nennen", "Keine Bearbeitungen erlaubt", "Nur unveränderte Weitergabe"],
      note: null,
    },
  },
  "CC BY-NC-ND 4.0": {
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    en: {
      title: "Attribution-NonCommercial-NoDerivatives 4.0",
      allows: ["Share and redistribute"],
      conditions: ["Credit the original author", "Non-commercial use only", "No modifications allowed"],
      note: null,
    },
    de: {
      title: "Namensnennung-Nicht kommerziell-Keine Bearbeitungen 4.0",
      allows: ["Teilen und weiterverbreiten"],
      conditions: ["Urheber nennen", "Nur nicht-kommerzielle Nutzung", "Keine Bearbeitungen erlaubt"],
      note: null,
    },
  },
  "All Rights Reserved": {
    url: null,
    en: {
      title: "All Rights Reserved",
      allows: [],
      conditions: ["No reuse without explicit written permission from the author"],
      note: "Contact the uploader for any reuse inquiry.",
    },
    de: {
      title: "Alle Rechte vorbehalten",
      allows: [],
      conditions: ["Keine Weiternutzung ohne ausdrückliche schriftliche Genehmigung"],
      note: "Für jede Weiternutzung den Uploader kontaktieren.",
    },
  },
};

export default function LicenseInfoPanel({ license, uploaderName, uploadDate }) {
  const [open, setOpen] = useState(false);
  const { lang } = useLang();

  if (!license) return null;
  const info = LICENSE_DETAILS[license];
  if (!info) return null;
  const d = info[lang] || info["en"];

  const isCC0 = license === "CC0 1.0";
  const isRestricted = license === "All Rights Reserved";
  const colorBg = isCC0 ? "bg-green-50 border-green-200" : isRestricted ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const colorText = isCC0 ? "text-green-700" : isRestricted ? "text-red-700" : "text-amber-700";
  const colorBtn = isCC0 ? "text-green-600 hover:text-green-800" : isRestricted ? "text-red-600 hover:text-red-800" : "text-amber-600 hover:text-amber-800";

  return (
    <div className={`border rounded-xl overflow-hidden ${colorBg}`}>
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 ${colorBtn} transition-colors`}
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          <Shield className="w-4 h-4 flex-shrink-0" />
          {license}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className={`px-4 pb-4 text-sm ${colorText} space-y-3 border-t ${isCC0 ? "border-green-200" : isRestricted ? "border-red-200" : "border-amber-200"}`}>
          <p className="font-semibold pt-3">{d.title}</p>

          {d.allows.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
                {lang === "de" ? "Erlaubt" : "Permitted"}
              </p>
              <ul className="space-y-0.5">
                {d.allows.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-green-600 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {d.conditions.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
                {lang === "de" ? "Bedingungen" : "Conditions"}
              </p>
              <ul className="space-y-0.5">
                {d.conditions.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 opacity-60">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attribution block — shown for all CC licenses */}
          {!isCC0 && !isRestricted && (uploaderName || uploadDate) && (
            <div className="pt-2 border-t border-current border-opacity-20">
              <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
                {lang === "de" ? "Korrekte Quellenangabe" : "How to cite"}
              </p>
              <p className="text-xs font-mono bg-white/60 rounded p-2 leading-relaxed">
                {uploaderName && <span>"{uploaderName}" </span>}
                {uploadDate && <span>({new Date(uploadDate).getFullYear()}) </span>}
                via PaperHub — {license}
              </p>
            </div>
          )}

          {d.note && <p className="text-xs opacity-70 italic">{d.note}</p>}

          {info.url && (
            <a
              href={info.url}
              target="_blank"
              rel="license noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
            >
              {lang === "de" ? "Vollständiger Lizenztext" : "Full license text"}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}