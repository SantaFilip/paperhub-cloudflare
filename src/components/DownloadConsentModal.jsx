import { useState } from "react";
import { Shield, X, AlertTriangle, CheckSquare, Square } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

const LICENSE_CATEGORY = (license) => {
  if (!license || license === "CC0 1.0") return "open";
  if (license === "All Rights Reserved") return "restricted";
  return "cc";
};

export default function DownloadConsentModal({ presentation, mode, onConfirm, onCancel }) {
  const { lang } = useLang();
  const [checked, setChecked] = useState(false);
  const category = LICENSE_CATEGORY(presentation?.license);

  const licenseLabel = presentation?.license || "Unknown";
  const isRestricted = category === "restricted";
  const isCC0 = category === "open";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRestricted ? "bg-red-100" : isCC0 ? "bg-green-100" : "bg-amber-100"}`}>
              {isRestricted ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <Shield className={`w-4 h-4 ${isCC0 ? "text-green-600" : "text-amber-600"}`} />
              )}
            </div>
            <h2 className="font-heading text-base font-semibold text-[#0F172A]">
              {lang === "de" ? "Vor dem Download" : "Before Downloading"}
            </h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Download info */}
        <div className="mb-4 px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
          <span className="font-medium text-slate-700">{modeLabel}</span>
          <span>·</span>
          <span className={`font-medium px-1.5 py-0.5 rounded ${isRestricted ? "bg-red-100 text-red-700" : isCC0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
            {licenseLabel}
          </span>
        </div>

        {/* License explanation */}
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          {consentText}
        </p>

        {/* Checkbox */}
        <button
          type="button"
          onClick={() => setChecked((v) => !v)}
          className="w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left mb-5 cursor-pointer select-none"
          style={{ borderColor: checked ? "#2563EB" : "#E2E8F0", background: checked ? "#EFF6FF" : "#F8FAFC" }}
        >
          {checked
            ? <CheckSquare className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
            : <Square className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />}
          <span className="text-sm text-slate-700 leading-snug">{checkboxLabel}</span>
        </button>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {lang === "de" ? "Abbrechen" : "Cancel"}
          </button>
          <button
            onClick={() => checked && onConfirm()}
            disabled={!checked}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {lang === "de" ? "Herunterladen" : "Download"}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center mt-3">
          {lang === "de"
            ? "Deine Zustimmung wird mit Zeitstempel gespeichert."
            : "Your consent is recorded with a timestamp."}
        </p>
      </div>
    </div>
  );
}