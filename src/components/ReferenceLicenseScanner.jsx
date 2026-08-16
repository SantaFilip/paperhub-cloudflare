import { useState, useEffect, useRef } from "react";
import { api } from "@/api/client";
import { Loader2, ShieldX, ShieldAlert, AlertCircle, CheckCircle, ExternalLink, Search, ChevronDown, ChevronUp } from "lucide-react";

async function fetchDOILicense(doi) {
  try {
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "PaperHub/1.0 (mailto:paperhub@example.com)" }
    });
    if (!resp.ok) return { doi, status: "not_found" };
    const data = await resp.json();
    const msg = data.message;
    const title = msg.title?.[0] || null;
    const authors = (msg.author || []).slice(0, 2).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
    const year = msg.issued?.["date-parts"]?.[0]?.[0] || null;
    const licenses = msg.license || [];
    if (licenses.length === 0) return { doi, title, authors, year, status: "unknown", license: null };
    const url = licenses[0].URL || "";
    return { doi, title, authors, year, status: classifyLicense(url), license: url };
  } catch {
    return { doi, status: "error" };
  }
}

function classifyLicense(url) {
  if (!url) return "unknown";
  if (url.includes("creativecommons.org/publicdomain") || url.includes("cc0") || url.includes("CC0")) return "open";
  if (url.includes("creativecommons.org/licenses/by/") && !url.includes("nc") && !url.includes("nd")) return "open";
  if (url.includes("creativecommons.org/licenses/by-sa") && !url.includes("nc") && !url.includes("nd")) return "open";
  if (url.includes("creativecommons.org/licenses/by-nc")) return "conditional";
  if (url.includes("creativecommons.org/licenses/by-nd") || url.includes("creativecommons.org/licenses/by-nc-nd")) return "restricted";
  if (url.includes("elsevier") || url.includes("springer") || url.includes("wiley") || url.includes("nature.com")) return "restricted";
  return "restricted";
}

function isRestrictedStatus(status) {
  return ["restricted", "unknown"].includes(status);
}

function extractDOIs(text) {
  const re = /\b(10\.\d{4,9}\/[^\s"'<>{}|\\^`\[\]]{3,})/g;
  // Join DOIs split across a line break right after the slash (e.g. "10.1038/\nrest")
  const joined = text.replace(/(10\.\d{4,9}\/)\s+/g, '$1');
  // Normalize spaces around DOI delimiters to catch DOIs broken by inline spaces
  const normalized = text.replace(/\s+([./])/g, '$1').replace(/([./])\s+/g, '$1');
  const clean = (s) => s.replace(/\\+[\(\)\[\]]/g, '').replace(/[.,;:!?)\]}>\\]+$/, '').trim().replace(/\.[A-Z][a-z]{2,}(?:[A-Z][a-z]+)*$/, '');
  return [...new Set([...text.matchAll(re), ...joined.matchAll(re), ...normalized.matchAll(re)].map(m => clean(m[1])))];
}

function getStatusLabel(status, clarity, lang) {
  if (clarity === "ambiguous") return lang === "de" ? "Lizenz nicht eindeutig" : "License Ambiguous";
  if (clarity === "unclear") return lang === "de" ? "Lizenz unbekannt" : "License Unknown";
  const labels = {
    de: { open: "Offene Lizenz", conditional: "Bedingt (CC BY-NC/ND)", restricted: "Restriktiv / Alle Rechte vorbehalten", unknown: "Lizenz unbekannt", not_found: "Nicht in CrossRef gefunden", error: "Abfrage fehlgeschlagen" },
    en: { open: "Open License", conditional: "Conditional (CC BY-NC/ND)", restricted: "Restricted / All Rights Reserved", unknown: "License Unknown", not_found: "Not Found in CrossRef", error: "Lookup Failed" }
  };
  return labels[lang]?.[status] || labels.en[status];
}

const STATUS_CONFIG = {
  open:        { icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50 border-green-200" },
  conditional: { icon: ShieldAlert, color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  restricted:  { icon: ShieldX,     color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  ambiguous:   { icon: ShieldAlert, color: "text-slate-600",  bg: "bg-slate-100 border-slate-300" },
  unclear:     { icon: ShieldAlert, color: "text-slate-500",  bg: "bg-slate-50 border-slate-200" },
  unknown:     { icon: ShieldAlert, color: "text-slate-500",  bg: "bg-slate-50 border-slate-200" },
  not_found:   { icon: AlertCircle, color: "text-slate-400",  bg: "bg-slate-50 border-slate-200" },
  error:       { icon: AlertCircle, color: "text-slate-400",  bg: "bg-slate-50 border-slate-200" },
};

function ResultRow({ item, lang }) {
  const [expanded, setExpanded] = useState(false);
  let displayStatus = item.status;
  if (item.clarity === "ambiguous") displayStatus = "ambiguous";
  else if (item.clarity === "unclear") displayStatus = "unclear";
  const cfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.unknown;
  const Icon = cfg.icon;

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.bg}`}>
      <button type="button" onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 p-3 text-left">
        <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{item.title || item.citation || item.doi}</p>
          <p className={`text-xs font-medium ${cfg.color}`}>{getStatusLabel(displayStatus, item.clarity, lang)}</p>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1 border-t border-black/5 pt-2">
          {item.authors && <p className="text-xs text-slate-600"><span className="font-medium">Autoren:</span> {item.authors}{item.year ? ` (${item.year})` : ""}</p>}
          {item.doi && (
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <span className="font-medium">DOI:</span>
              <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                {item.doi} <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
          {item.license && (
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <span className="font-medium">Lizenz:</span>
              <a href={item.license} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate inline-flex items-center gap-0.5">
                {item.license} <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </p>
          )}
          {(displayStatus === "unclear" || displayStatus === "unknown") && (
            <p className="text-xs text-slate-600 italic flex items-center gap-1 mt-2 pt-2 border-t border-slate-200">
              <AlertCircle className="w-3 h-3" />
              {lang === "de"
                ? "Lizenz konnte nicht ermittelt werden. Prüfe die Quelle manuell."
                : "License could not be determined. Check the source manually."}
            </p>
          )}
          {item.clarity === "ambiguous" && (
            <p className="text-xs text-slate-700 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {lang === "de" ? "Lizenz nicht eindeutig — Quellen zeigen unterschiedliche Ergebnisse." : "License ambiguous — sources show different results."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReferenceLicenseScanner({ file, fileUrl, lang, onScanComplete, autoStart = false }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const hasAutoStarted = useRef(false);
  const scanRef = useRef(null);

  useEffect(() => {
    if (autoStart && (file || fileUrl) && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const t = setTimeout(() => scanRef.current?.(), 100);
      return () => clearTimeout(t);
    }
  }, []);  

  const scan = async () => {
    if (!file && !fileUrl) return;
    setScanning(true);
    setResults(null);
    setExtractError(null);

    try {
      let url = fileUrl;
      if (!url && file) {
        setProgress(lang === "de" ? "Datei wird hochgeladen…" : "Uploading file…");
        const uploadRes = await api.integrations.Core.UploadFile({ file });
        url = uploadRes.file_url;
      }

      setProgress(lang === "de" ? "Text wird extrahiert & Lizenzen geprüft…" : "Extracting text & checking licenses…");
      const fileName = file?.name || url || "";
      const file_type = fileName.toLowerCase().includes('.pptx') ? 'pptx' : fileName.toLowerCase().includes('.pdf') ? 'pdf' : undefined;
      const extractRes = await api.functions.invoke("extractFileText", { file_url: url, file_type });
      const { text, references } = extractRes.data;

      if (!text || text.trim().length < 50) {
        setResults([]);
        if (onScanComplete) onScanComplete([]);
        setProgress("");
        setScanning(false);
        return;
      }

      // Find any DOIs in the text not already covered by backend references
      const coveredDOIs = new Set((references || []).map(r => r.doi).filter(Boolean));
      const missingDOIs = extractDOIs(text).filter(doi => !coveredDOIs.has(doi));

      let extraResults = [];
      if (missingDOIs.length > 0) {
        setProgress(lang === "de" ? "Direkte DOIs werden geprüft…" : "Checking direct DOIs…");
        extraResults = await Promise.all(missingDOIs.map(doi => fetchDOILicense(doi)));
      }

      // Deduplicate
      const seen = new Set();
      const allResults = [];
      for (const r of [...(references || []), ...extraResults]) {
        const key = r.doi || r.title?.toLowerCase().trim();
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        allResults.push(r);
      }

      // All restricted/unknown papers are problematic
      const problematicPapers = allResults.filter(r => isRestrictedStatus(r.status));
      if (onScanComplete) onScanComplete(problematicPapers);

      allResults.sort((a, b) => {
        const order = { restricted: 0, conditional: 1, unknown: 2, not_found: 3, error: 3, open: 4 };
        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
      });

      setResults(allResults);
      setProgress("");
    } catch (err) {
      setExtractError(err.message || "Unknown error");
      setProgress("");
      setResults([]);
      if (onScanComplete) onScanComplete([]);
    }
    setScanning(false);
  };

  scanRef.current = scan;

  if (!file && !fileUrl) return null;

  const displayResults = showAll ? results : results?.slice(0, 5);

  return (
    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[#2563EB]" />
          <span className="text-sm font-semibold text-[#0F172A]">
            {lang === "de" ? "Quellenlizenzen prüfen" : "Reference License Scanner"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
          >
            <span className="text-lg">ℹ️</span>
            <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
              {lang === "de" ? "Hinweis zu den Lizenzquellen" : "License sources info"}
            </span>
          </button>
          {!scanning && !results && (
            <button type="button" onClick={scan} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Search className="w-3.5 h-3.5" />
              {lang === "de" ? "Jetzt scannen" : "Scan now"}
            </button>
          )}
        </div>
      </div>

      {showInfo && (
        <div className="px-4 py-3 bg-blue-50 border-t border-slate-200 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-800">
            {lang === "de" ? "ℹ️ Wie funktioniert das Lizenz-Scan-System?" : "ℹ️ How does the license scan system work?"}
          </p>
          <p className="text-slate-600">
            {lang === "de"
              ? "DOIs werden aus dem Dokument extrahiert und parallel bei CrossRef, Unpaywall und Semantic Scholar abgefragt. Dies ist KEINE Rechtsberatung — die Nutzung liegt in deiner Verantwortung. PaperHub übernimmt keine Haftung."
              : "DOIs are extracted from the document and queried in parallel at CrossRef, Unpaywall, and Semantic Scholar. This is NOT legal advice — use at your own responsibility. PaperHub assumes no liability."}
          </p>
        </div>
      )}

      <div className="px-4 py-3">
        {scanning && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
            <span className="text-xs">{progress}</span>
          </div>
        )}

        {!scanning && !results && !extractError && (
          <p className="text-xs text-slate-500">
            {lang === "de"
              ? "Scannt das Quellenverzeichnis und prüft die Lizenzen aller referenzierten Papers via CrossRef."
              : "Scans the reference list and checks licenses of all cited papers via CrossRef."}
          </p>
        )}

        {extractError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">
              {lang === "de" ? `Fehler bei der Textextraktion: ${extractError}` : `Text extraction error: ${extractError}`}
            </p>
          </div>
        )}

        {results && !scanning && (
          <div className="space-y-3">
            {results.length === 0 && (
              <p className="text-xs text-slate-500 italic">
                {lang === "de" ? "Keine Quellen erkannt. Manuell prüfen falls Quellenverzeichnis vorhanden." : "No references detected. Check manually if a reference list exists."}
              </p>
            )}
            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">
                  {lang === "de" ? `${results.length} Quellen gefunden:` : `${results.length} sources found:`}
                </p>
                {displayResults.map((item, i) => (
                  <ResultRow key={i} item={item} lang={lang} />
                ))}
                {results.length > 5 && (
                  <button type="button" onClick={() => setShowAll(v => !v)} className="text-xs text-[#2563EB] hover:underline">
                    {showAll
                      ? (lang === "de" ? "Weniger anzeigen" : "Show less")
                      : (lang === "de" ? `Alle ${results.length} anzeigen` : `Show all ${results.length}`)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}