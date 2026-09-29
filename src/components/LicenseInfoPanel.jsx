import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { LICENSE_DETAILS } from "@/lib/licenseDetails";

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
  const colorBtn = isCC0 ? "text-green-700 hover:text-green-800" : isRestricted ? "text-red-700 hover:text-red-800" : "text-amber-700 hover:text-amber-800";

  return (
    <div className={`border rounded-xl overflow-hidden ${colorBg}`}>
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between px-4 py-3 ${colorBtn} transition-colors`}
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="sr-only">{lang === "de" ? "Lizenzdetails: " : "License details: "}</span>
          {license}
        </span>
        {open ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
      </button>

      {open && (
        <div className={`px-4 pb-4 text-sm ${colorText} space-y-3 border-t ${isCC0 ? "border-green-200" : isRestricted ? "border-red-200" : "border-amber-200"}`}>
          <p className="font-semibold pt-3">{d.title}</p>

          {d.allows.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                {lang === "de" ? "Erlaubt" : "Permitted"}
              </p>
              <ul className="space-y-0.5">
                {d.allows.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-green-700 font-bold" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {d.conditions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                {lang === "de" ? "Bedingungen" : "Conditions"}
              </p>
              <ul className="space-y-0.5">
                {d.conditions.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-0.5" aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attribution block — shown for all CC licenses */}
          {!isCC0 && !isRestricted && (uploaderName || uploadDate) && (
            <div className="pt-2 border-t border-current border-opacity-20">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                {lang === "de" ? "Korrekte Quellenangabe" : "How to cite"}
              </p>
              <p className="text-xs font-mono bg-white/60 rounded p-2 leading-relaxed">
                {uploaderName && <span>"{uploaderName}" </span>}
                {uploadDate && <span>({new Date(uploadDate).getFullYear()}) </span>}
                via PaperHub — {license}
              </p>
            </div>
          )}

          {d.note && <p className="text-xs italic">{d.note}</p>}

          {info.url && (
            <a
              href={info.url}
              target="_blank"
              rel="license noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline"
            >
              {lang === "de" ? "Vollständiger Lizenztext" : "Full license text"}
              <span className="sr-only">{lang === "de" ? " (öffnet in neuem Tab)" : " (opens in a new tab)"}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}