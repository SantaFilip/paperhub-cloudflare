import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Shield, X, AlertTriangle, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { getLicenseDetails } from "@/lib/licenseDetails";

const LICENSE_CATEGORY = (license) => {
  if (!license || license === "CC0 1.0") return "open";
  if (license === "All Rights Reserved") return "restricted";
  return "cc";
};

// Radix Dialog supplies role="dialog", aria-modal, focus trapping, Escape to
// close and focus return to the download button.
export default function DownloadConsentModal({ presentation, mode, onConfirm, onCancel }) {
  const { lang } = useLang();
  const [checked, setChecked] = useState(false);
  const category = LICENSE_CATEGORY(presentation?.license);

  const licenseLabel = presentation?.license || "Unknown";
  const isRestricted = category === "restricted";
  const isCC0 = category === "open";
  const details = getLicenseDetails(presentation?.license, lang);

  const modeLabel = {
    presentation: lang === "de" ? "Präsentation" : "Presentation",
    handout: "Handout",
    both: lang === "de" ? "Präsentation + Handout" : "Presentation + Handout",
  }[mode] || mode;

  const consentText = isCC0
    ? lang === "de"
      ? `Diese Datei steht unter CC0 1.0 (gemeinfrei). Du kannst sie frei nutzen, verändern und teilen – ohne Namensnennung.`
      : `This file is under CC0 1.0 (public domain). You may use, modify, and share it freely — no attribution required.`
    : isRestricted
    ? lang === "de"
      ? `Diese Datei ist urheberrechtlich geschützt (Alle Rechte vorbehalten). Eine Nutzung, Weitergabe oder Veröffentlichung ohne ausdrückliche schriftliche Genehmigung des Urhebers ist untersagt.`
      : `This file is copyright protected (All Rights Reserved). Use, redistribution or publication without explicit written permission from the author is prohibited.`
    : lang === "de"
    ? `Diese Datei steht unter ${licenseLabel}. Bitte beachte die Lizenzbedingungen – insbesondere die Pflicht zur Namensnennung und ggf. Einschränkungen der kommerziellen Nutzung.`
    : `This file is licensed under ${licenseLabel}. Please respect the license terms — including attribution requirements and any non-commercial restrictions.`;

  const checkboxLabel = isCC0
    ? lang === "de"
      ? "Ich bestätige, dass ich die Lizenz (CC0 1.0) gelesen habe."
      : "I confirm that I have read the license (CC0 1.0)."
    : isRestricted
    ? lang === "de"
      ? "Ich bestätige, dass ich diese Datei nur mit ausdrücklicher Genehmigung des Urhebers nutzen werde."
      : "I confirm that I will only use this file with explicit permission from the author."
    : lang === "de"
    ? `Ich akzeptiere die Lizenzbedingungen (${licenseLabel}) und werde diese einhalten.`
    : `I accept the license terms (${licenseLabel}) and will comply with them.`;

  const tone = isRestricted ? "red" : isCC0 ? "green" : "amber";
  const toneClasses = {
    red: { badge: "bg-red-100 text-red-800", icon: "bg-red-100 text-red-700", box: "bg-red-50 border-red-200 text-red-900" },
    green: { badge: "bg-green-100 text-green-800", icon: "bg-green-100 text-green-700", box: "bg-green-50 border-green-200 text-green-900" },
    amber: { badge: "bg-amber-100 text-amber-900", icon: "bg-amber-100 text-amber-800", box: "bg-amber-50 border-amber-200 text-amber-950" },
  }[tone];

  const uploadYear = presentation?.created_date ? new Date(presentation.created_date).getFullYear() : null;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6 focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toneClasses.icon}`} aria-hidden="true">
                {isRestricted ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              </div>
              <DialogPrimitive.Title className="font-heading text-base font-semibold text-[#0F172A]">
                {lang === "de" ? "Lizenzvereinbarung vor dem Download" : "License agreement before downloading"}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close
              className="p-2 -m-2 rounded-md text-slate-500 hover:text-slate-800"
              aria-label={lang === "de" ? "Dialog schließen" : "Close dialog"}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Download info */}
          <p className="mb-4 px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <span className="font-medium text-slate-800">{modeLabel}</span>
            <span aria-hidden="true">·</span>
            <span className={`font-medium px-1.5 py-0.5 rounded ${toneClasses.badge}`}>
              <span className="sr-only">{lang === "de" ? "Lizenz: " : "License: "}</span>
              {licenseLabel}
            </span>
          </p>

          <DialogPrimitive.Description className="text-sm text-slate-700 leading-relaxed mb-4">
            {consentText}
          </DialogPrimitive.Description>

          {/* Full licence terms — the same summary the detail page shows */}
          {details && (
            <section
              aria-labelledby="download-license-terms"
              className={`border rounded-xl p-4 mb-5 text-sm space-y-3 ${toneClasses.box}`}
            >
              <h3 id="download-license-terms" className="font-semibold">
                {licenseLabel} — {details.title}
              </h3>
              {details.allows.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-1">
                    {lang === "de" ? "Erlaubt" : "Permitted"}
                  </h4>
                  <ul className="space-y-0.5 list-disc pl-5">
                    {details.allows.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              {details.conditions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-1">
                    {lang === "de" ? "Bedingungen" : "Conditions"}
                  </h4>
                  <ul className="space-y-0.5 list-disc pl-5">
                    {details.conditions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              {!isCC0 && !isRestricted && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide mb-1">
                    {lang === "de" ? "Korrekte Quellenangabe" : "How to cite"}
                  </h4>
                  <p className="text-xs font-mono bg-white/70 rounded p-2 leading-relaxed">
                    "{presentation?.uploader_name || "Anonymous"}"{uploadYear ? ` (${uploadYear})` : ""} via PaperHub — {licenseLabel}
                  </p>
                </div>
              )}
              {details.note && <p className="text-xs italic">{details.note}</p>}
              {details.url && (
                <a
                  href={details.url}
                  target="_blank"
                  rel="license noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium underline"
                >
                  {lang === "de" ? "Vollständiger Lizenztext" : "Full license text"}
                  <span className="sr-only">{lang === "de" ? " (öffnet in neuem Tab)" : " (opens in a new tab)"}</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
              <p className="text-xs">
                {lang === "de"
                  ? "Diese Lizenzbedingungen liegen dem Download zusätzlich als LICENSE.txt bei."
                  : "These license terms are also included in the download as LICENSE.txt."}
              </p>
            </section>
          )}

          {/* Consent checkbox */}
          <label
            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-colors mb-5 cursor-pointer ${
              checked ? "border-[#2563EB] bg-blue-50" : "border-slate-300 bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-slate-400 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
            />
            <span className="text-sm text-slate-800 leading-snug">{checkboxLabel}</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 min-h-[44px] text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {lang === "de" ? "Abbrechen" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => checked && onConfirm()}
              disabled={!checked}
              className="flex-1 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {lang === "de" ? "Herunterladen" : "Download"}
            </button>
          </div>

          <p className="text-xs text-slate-600 text-center mt-3">
            {lang === "de"
              ? "Deine Zustimmung wird mit Zeitstempel gespeichert."
              : "Your consent is recorded with a timestamp."}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
