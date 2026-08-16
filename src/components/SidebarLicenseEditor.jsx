import { useState } from "react";
import { api } from "@/api/client";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import LicenseInfoPanel from "@/components/LicenseInfoPanel";
import { LICENSE_VALUES } from "@/lib/licenseUtils";

export default function SidebarLicenseEditor({ presentation, lang, licenses, onSaved }) {
  const [selected, setSelected] = useState(presentation.license || "CC0 1.0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanged = selected !== (presentation.license || "");

  const handleSave = async () => {
    setSaving(true);
    await api.entities.Presentations.update(presentation.id, { license: selected });
    onSaved(selected);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => { setSelected(e.target.value); setSaved(false); }}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
      >
        {licenses.map((l) => {
          const currentIdx = LICENSE_VALUES.indexOf(presentation.license);
          const idx = LICENSE_VALUES.indexOf(l.value);
          const tooPermissive = !presentation.is_author && currentIdx >= 0 && idx < currentIdx;
          return (
            <option key={l.value} value={l.value} disabled={tooPermissive}>
              {tooPermissive ? "🔒 " : ""}{l.value} — {l.desc}
            </option>
          );
        })}
      </select>
      {!presentation.is_author && presentation.paper_license && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {lang === "de"
            ? `Nicht freizügiger als Paper-Lizenz „${presentation.paper_license}"`
            : `Cannot be more permissive than paper license "${presentation.paper_license}"`}
        </p>
      )}

      {hasChanged && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {lang === "de" ? "Lizenz speichern" : "Save license"}
        </button>
      )}

      {saved && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          {lang === "de" ? "Gespeichert" : "Saved"}
        </div>
      )}

      <LicenseInfoPanel
        license={selected}
        uploaderName={presentation.uploader_name}
        uploadDate={presentation.created_date}
      />
    </div>
  );
}