import { useState } from "react";
import { api } from "@/api/client";
import { FileDown, CheckCircle, AlertCircle, Loader2, Upload } from "lucide-react";

export default function HandoutUploadSection({ presentation, user, lang, onUploaded }) {
  const [handoutFile, setHandoutFile] = useState(null);
  const [isDerived, setIsDerived] = useState(null); // null = not selected yet
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Consent for independent handouts
  const [sourcesConsent, setSourcesConsent] = useState(false);

  const isBlocked = presentation.license === "All Rights Reserved" || presentation.has_nd_restriction;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError(lang === "de" ? "Nur PDF-Dateien erlaubt." : "Only PDF files are allowed.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError(lang === "de" ? "Datei zu groß (max 50 MB). Bitte komprimieren." : "File is too large (max 50MB). Please compress and try again.");
      return;
    }
    setError(null);
    setHandoutFile(f);
    setSourcesConsent(false);
  };

  const handleUpload = async () => {
    if (!handoutFile || isDerived === null) return;
    if (!isDerived && !sourcesConsent) {
      setError(lang === "de" ? "Bitte bestätige zuerst die Quellenangabe." : "Please confirm the sources declaration first.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const res = await api.integrations.Core.UploadFile({ file: handoutFile });
      const handout_url = res.file_url;

      let handout_license, handout_status;
      if (isDerived) {
        handout_license = presentation.license;
        handout_status = presentation.has_nd_restriction || presentation.license === "All Rights Reserved" ? "blocked" : "approved";
      } else {
        handout_status = "approved";
        handout_license = presentation.license;
      }

      await api.entities.Presentations.update(presentation.id, {
        handout_url,
        handout_license,
        handout_status,
        handout_is_derived: isDerived,
        handout_downloads: 0,
        handout_uploaded_at: new Date().toISOString(),
        handout_uploaded_by: user?.id || null,
      });

      api.analytics.track({ eventName: "handout_uploaded", properties: { presentation_id: presentation.id, handout_is_derived: isDerived } });

      setSuccess(true);
      onUploaded({ handout_url, handout_license, handout_status, handout_is_derived: isDerived, handout_downloads: 0, handout_uploaded_at: new Date().toISOString(), handout_uploaded_by: user?.id });
    } catch {
      setError(lang === "de" ? "Upload fehlgeschlagen. Bitte erneut versuchen." : "Upload failed. Please try again.");
    }
    setUploading(false);
  };

  if (success) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">
        <CheckCircle className="w-4 h-4 text-green-700" />
        {lang === "de" ? "✅ Handout erfolgreich hochgeladen!" : "✅ Handout uploaded successfully!"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[#0F172A]">
        {lang === "de" ? "Handout hochladen" : "Upload Handout"}
      </h3>

      {/* File picker */}
      <div className={`file-dropzone relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${handoutFile ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-[#2563EB] hover:bg-blue-50"}`}>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          aria-label={lang === "de" ? "Handout-PDF auswählen (max. 50 MB)" : "Select handout PDF (max 50 MB)"}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {handoutFile ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-700" />
            <span className="text-sm font-medium text-green-700">{handoutFile.name}</span>
            <span className="text-xs text-green-700">({(handoutFile.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-slate-500">
            <FileDown className="w-5 h-5" />
            <span className="text-sm">{lang === "de" ? "Handout PDF auswählen (max 50 MB)" : "Select handout PDF (max 50MB)"}</span>
          </div>
        )}
      </div>

      {/* Derivation checkbox */}
      {handoutFile && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-slate-700">
            {lang === "de" ? "Handout-Typ:" : "Handout type:"}
          </legend>

          {/* Derived option */}
          <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isDerived === true ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"} ${isBlocked ? "opacity-50 cursor-not-allowed" : ""}`}>
            <input
              type="radio"
              name="handout_type"
              checked={isDerived === true}
              onChange={() => !isBlocked && setIsDerived(true)}
              disabled={isBlocked}
              className="mt-0.5 w-5 h-5 text-[#2563EB]"
            />
            <div>
              <span className="text-sm font-medium text-[#0F172A]">
                {lang === "de" ? "Abgeleitet von dieser Präsentation" : "Derived from this presentation"}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {lang === "de" ? "Lizenz wird automatisch übernommen." : "License is automatically inherited."}
              </p>
            </div>
          </label>

          {isBlocked && (
            <p className="text-xs text-red-700 flex items-center gap-1 ml-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {lang === "de" ? "Diese Präsentation hat eingeschränkte Lizenzen — wähle 'Unabhängig'." : "This presentation has restricted licenses. Select 'Independent' instead."}
            </p>
          )}

          {/* Independent option */}
          <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isDerived === false ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
            <input
              type="radio"
              name="handout_type"
              checked={isDerived === false}
              onChange={() => setIsDerived(false)}
              className="mt-0.5 w-5 h-5 text-[#2563EB]"
            />
            <div>
              <span className="text-sm font-medium text-[#0F172A]">
                {lang === "de" ? "Unabhängiges Handout" : "Independent handout"}
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                {lang === "de" ? "Lizenzscan wird durchgeführt." : "A separate license scan will be performed."}
              </p>
            </div>
          </label>
        </fieldset>
      )}

      {/* Consent for independent handouts */}
      {handoutFile && isDerived === false && (
        <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <input type="checkbox" checked={sourcesConsent} onChange={e => setSourcesConsent(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-slate-400 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0" />
          <span className="text-sm text-slate-700">
            {lang === "de"
              ? "Ich bestätige, dass alle im Handout verwendeten Quellen bereits im Quellenverzeichnis der Präsentation aufgeführt sind und keine neuen Quellen hinzugefügt wurden."
              : "I confirm that all sources used in this handout are already listed in the presentation's reference list and no new sources were added."}
          </span>
        </label>
      )}

      <div role="alert">
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />{error}
          </p>
        )}
      </div>

      {/* Upload button */}
      {handoutFile && isDerived !== null && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || (!isDerived && !sourcesConsent)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {lang === "de" ? "Handout hochladen" : "Upload handout"}
        </button>
      )}
    </div>
  );
}