import { useState, useEffect } from "react";
import { api } from "@/api/client";
import { Link } from "react-router-dom";
import { useLang, disciplineLabelDE, paperTypeLabelDE } from "@/lib/LanguageContext";
import { Upload as UploadIcon, FileText, Link2, Tag, BookOpen, Video, CheckCircle, AlertCircle, Loader2, Image, FileDown, Plus, Trash2 } from "lucide-react";
import AuthorshipVerifier from "@/components/AuthorshipVerifier";
import ReferenceLicenseScanner from "@/components/ReferenceLicenseScanner";
import { getUploadMode, hasNDRestriction, getPaperLicenseMinIndex, LICENSE_VALUES } from "@/lib/licenseUtils";

const DOI_REGEX = /^10\.\d{4,}\/.+/;
const DOI_REGEX_CHECK = DOI_REGEX;

const DISCIPLINES = [
  "Machine Learning", "Computer Science", "Physics", "Chemistry",
  "Biology", "Mathematics", "Medicine", "Engineering", "Social Sciences",
  "Economics", "Psychology", "Neuroscience", "Environmental Sciences",
  "Earth Sciences", "Materials Science", "Astronomy & Astrophysics",
  "Philosophy", "History & Humanities", "Law", "Public Health", "Linguistics", "Other"
];

const PAPER_TYPES = [
  "Original Research", "Review", "Meta-Analysis", "Case Study", "Conference Paper", "Other"
];

const LICENSES_EN = [
  { value: "CC0 1.0", label: "CC0 1.0", desc: "No rights reserved — Anyone can use, share, or modify this, no attribution required." },
  { value: "CC BY 4.0", label: "CC BY 4.0", desc: "Free to use with attribution" },
  { value: "CC BY-SA 4.0", label: "CC BY-SA 4.0", desc: "Attribution + share alike" },
  { value: "CC BY-NC 4.0", label: "CC BY-NC 4.0", desc: "Non-commercial only" },
  { value: "CC BY-NC-SA 4.0", label: "CC BY-NC-SA 4.0", desc: "Non-commercial + share alike" },
  { value: "CC BY-ND 4.0", label: "CC BY-ND 4.0", desc: "No derivatives allowed" },
  { value: "CC BY-NC-ND 4.0", label: "CC BY-NC-ND 4.0", desc: "Non-commercial, no derivatives" },
  { value: "All Rights Reserved", label: "All Rights Reserved", desc: "No reuse without permission" },
];

const LICENSES_DE = [
  { value: "CC0 1.0", label: "CC0 1.0", desc: "Keine Rechte vorbehalten — Jeder darf diese Präsentation nutzen, teilen oder verändern, ohne Namensnennung." },
  { value: "CC BY 4.0", label: "CC BY 4.0", desc: "Freie Nutzung mit Namensnennung" },
  { value: "CC BY-SA 4.0", label: "CC BY-SA 4.0", desc: "Namensnennung + Weitergabe unter gleichen Bedingungen" },
  { value: "CC BY-NC 4.0", label: "CC BY-NC 4.0", desc: "Nur nicht-kommerzielle Nutzung" },
  { value: "CC BY-NC-SA 4.0", label: "CC BY-NC-SA 4.0", desc: "Nicht-kommerziell + Weitergabe unter gleichen Bedingungen" },
  { value: "CC BY-ND 4.0", label: "CC BY-ND 4.0", desc: "Keine Bearbeitungen erlaubt" },
  { value: "CC BY-NC-ND 4.0", label: "CC BY-NC-ND 4.0", desc: "Nicht-kommerziell, keine Bearbeitungen" },
  { value: "All Rights Reserved", label: "Alle Rechte vorbehalten", desc: "Keine Weiternutzung ohne Genehmigung" },
];

function Field({ label, error, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#0F172A]">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}

function FileDropZone({ file, onFile, accept, label, hint, icon: Icon, error }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#0F172A]">{label}</label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
        file ? "border-green-300 bg-green-50"
        : error ? "border-red-300 bg-red-50"
        : "border-slate-200 hover:border-[#2563EB] hover:bg-blue-50"
      }`}>
        <input
          type="file"
          accept={accept}
          onChange={(e) => onFile(e.target.files[0] || null)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {file ? (
          <div className="flex flex-col items-center gap-1.5">
            <CheckCircle className="w-7 h-7 text-green-600" />
            <p className="text-sm font-medium text-green-700">{file.name}</p>
            <p className="text-xs text-green-600">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Icon className="w-7 h-7 text-slate-400" />
            <p className="text-sm text-slate-500">{accept}</p>
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}

export default function Upload() {
  const { t, lang } = useLang();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadedId, setUploadedId] = useState(null);

  const [form, setForm] = useState({ title: "", doi: "", paper_title: "", discipline: "", paper_type: "", license: "CC0 1.0", tags: "", video_url: "", institution: "" });
  const [paperLicense, setPaperLicense] = useState(null);
  const [fetchingPaperLicense, setFetchingPaperLicense] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [authorshipVerified, setAuthorshipVerified] = useState(false);
  const [authorshipMethod, setAuthorshipMethod] = useState(null);
  const [authorshipMatchedName, setAuthorshipMatchedName] = useState(null);
  const [extraPapers, setExtraPapers] = useState([]);
  const [file, setFile] = useState(null);
  const [handout, setHandout] = useState(null);
  const [handoutIsDerived, setHandoutIsDerived] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);

  const extractPdfThumbnail = async (pdfFile) => {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      // Render at higher scale for crisp display on detail pages (~1600px width)
      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = 1600;
      const scale = Math.max(2.5, targetWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      return new Promise((resolve) => canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], "thumbnail.png", { type: "image/png" }));
        else resolve(null);
      }, "image/png"));
    } catch (err) {
      console.warn("PDF thumbnail extraction failed:", err);
      return null;
    }
  };

  const extractPptxThumbnail = async (pptxFile) => {
    try {
      setUploadStatus(lang === "de" ? "Vorschau wird extrahiert…" : "Extracting preview…");
      const uploadRes = await api.integrations.Core.UploadFile({ file: pptxFile });
      const res = await api.functions.invoke("extractPptxThumbnail", { file_url: uploadRes.file_url });
      setUploadStatus("");
      if (!res.data?.found) return null;
      const byteChars = atob(res.data.data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: res.data.mimeType });
      return new File([blob], "thumbnail.jpg", { type: res.data.mimeType });
    } catch (err) {
      console.warn("PPTX thumbnail extraction failed:", err);
      setUploadStatus("");
      return null;
    }
  };

  const handleFileChange = async (newFile) => {
    setFile(newFile);
    setUploadedFileUrl(null);
    // Always reset scan/consent states when any new file is selected
    setCitationConsent(null);
    setConsentDoi(false);
    setConsentFigures(false);
    setConfirmedRestrictedCitations(false);
    // If re-uploading (scanAttempt >= 1), mark as awaiting new file and keep scan attempt count
    if (newFile && scanAttempt >= 1) {
      setAwaitingNewFile(true);
    } else {
      // First upload: reset everything
      setScanned(null);
      setProblematicPapers([]);
      setAwaitingNewFile(false);
      setScanAttempt(0);
    }
    // Auto-extract thumbnail from PDF/PPTX (only if no manual thumbnail already set)
    if (newFile && !thumbnail) {
      const name = newFile.name.toLowerCase();
      if (name.endsWith(".pdf")) {
        const autoThumb = await extractPdfThumbnail(newFile);
        if (autoThumb) setThumbnail(autoThumb);
      } else if (name.endsWith(".pptx")) {
        const autoThumb = await extractPptxThumbnail(newFile);
        if (autoThumb) setThumbnail(autoThumb);
      }
    }
  };

  const [errors, setErrors] = useState({});
  const [doiValid, setDoiValid] = useState(null);

  // Citation consent & scanner flow
  // citationConsent: null | "yes" (set to "yes" once both checkboxes are ticked and user proceeds)
  const [citationConsent, setCitationConsent] = useState(null);
  // Two mandatory declaration checkboxes before scan
  const [consentDoi, setConsentDoi] = useState(false);
  const [consentFigures, setConsentFigures] = useState(false);
  // scanned: null = not scanned, true = scan complete
  const [scanned, setScanned] = useState(null);
  // scanAttempt: counts how many times scan has been attempted (1st, 2nd, etc.)
  const [scanAttempt, setScanAttempt] = useState(0);
  // problematicPapers: restricted papers that are inline-cited (need to be removed)
  const [problematicPapers, setProblematicPapers] = useState([]);
  // whether we're waiting for new file after problems detected
  const [awaitingNewFile, setAwaitingNewFile] = useState(false);
  // uploaded file URL (set after uploading for scanner)
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [uploadingForScan, setUploadingForScan] = useState(false);
  // User confirmed that remaining restricted citations are OK (inline only, no visuals)
  const [confirmedRestrictedCitations, setConfirmedRestrictedCitations] = useState(false);
  // After reupload: user confirms they removed restricted figures (skips second scan)
  const [confirmedFiguresRemoved, setConfirmedFiguresRemoved] = useState(false);

  // Auto-select license from paper when fetched
  useEffect(() => {
    if (!paperLicense || isAuthor) return;
    const minIdx = getPaperLicenseMinIndex(paperLicense.label);
    if (minIdx < 0) return;
    const currentIdx = LICENSE_VALUES.indexOf(form.license);
    if (currentIdx < minIdx) {
      setForm((f) => ({ ...f, license: LICENSE_VALUES[minIdx] }));
    }
  }, [paperLicense, isAuthor]);

  // Determine upload mode from spec decision matrix
  const uploadMode = getUploadMode(paperLicense?.label || null, isAuthor && authorshipVerified);
  const isMetadataOnly = uploadMode.mode === "metadata_only";
  const isNDBlocked = uploadMode.mode === "blocked" && uploadMode.reason === "nd_restriction";
  const isUnknownBlocked = uploadMode.mode === "blocked" && uploadMode.reason === "unknown_license";

  // Presentation license selection restriction
  const minLicenseIdx = isAuthor ? -1 : getPaperLicenseMinIndex(paperLicense?.label);
  // Author claim requires verification if user is logged in
  const authorClaimBlocked = isAuthor && user && !authorshipVerified;
  // Upload is blocked when ND paper and not author, or unknown license and not author
  const uploadBlocked = !isAuthor && (isNDBlocked || isUnknownBlocked);

  const addExtraPaper = () => setExtraPapers((prev) => [...prev, { doi: "", title: "" }]);
  const removeExtraPaper = (i) => setExtraPapers((prev) => prev.filter((_, idx) => idx !== i));
  const updateExtraPaper = (i, field, val) =>
    setExtraPapers((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Prevent the browser from navigating to/opening a dropped file if it lands outside a file input.
  // Capture phase ensures this runs before any other handler can stop the event from bubbling.
  useEffect(() => {
    const isFileInput = (target) => target?.tagName === "INPUT" && target?.type === "file";
    const handleDragOver = (e) => { if (!isFileInput(e.target)) e.preventDefault(); };
    const handleDrop = (e) => { if (!isFileInput(e.target)) e.preventDefault(); };
    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("drop", handleDrop, true);
    return () => {
      window.removeEventListener("dragover", handleDragOver, true);
      window.removeEventListener("drop", handleDrop, true);
    };
  }, []);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleDoiChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, doi: val }));
    if (!val) { setDoiValid(null); setPaperLicense(null); return; }
    const valid = DOI_REGEX.test(val.trim());
    setDoiValid(valid);
    if (valid) fetchPaperLicense(val.trim());
    else setPaperLicense(null);
  };

  const fetchPaperLicense = async (doi) => {
    setFetchingPaperLicense(true);
    setPaperLicense(null);
    try {
      const res = await api.functions.invoke("lookupPaperLicense", { doi });
      const data = res.data;
      if (data?.found && data?.license) {
        setPaperLicense({ label: data.license, url: data.license_url || null });
      } else {
        setPaperLicense({ label: lang === "de" ? "Keine Lizenz gefunden" : "No license found", url: null });
      }
    } catch {
      setPaperLicense({ label: lang === "de" ? "Nicht abrufbar" : "Not retrievable", url: null });
    }
    setFetchingPaperLicense(false);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t.titleRequired;
    if (!form.doi.trim()) e.doi = t.doiRequired;
    else if (!DOI_REGEX.test(form.doi.trim())) e.doi = t.doiInvalid;
    if (!form.discipline) e.discipline = t.disciplineRequired;
    if (!form.license) e.license = t.licenseRequired;
    if (!isMetadataOnly && !file) e.file = t.fileRequired;
    extraPapers.forEach((p, i) => {
      if (!p.doi.trim()) e[`extra_doi_${i}`] = t.doiRequired;
      else if (!DOI_REGEX.test(p.doi.trim())) e[`extra_doi_${i}`] = t.doiInvalid;
      if (!p.title.trim()) e[`extra_title_${i}`] = t.titleRequired;
    });
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);

    let file_url;
    if (!isMetadataOnly && file) {
      // Reuse already-uploaded URL from scanner step if available
      if (uploadedFileUrl) {
        file_url = uploadedFileUrl;
      } else {
        setUploadStatus(t.uploading);
        const res = await api.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
      }
    }

    let handout_url;
    if (!isMetadataOnly && handout) {
      setUploadStatus("Uploading handout…");
      const res = await api.integrations.Core.UploadFile({ file: handout });
      handout_url = res.file_url;
    }

    let thumbnail_url;
    if (thumbnail) {
      setUploadStatus("Uploading thumbnail…");
      const res = await api.integrations.Core.UploadFile({ file: thumbnail });
      thumbnail_url = res.file_url;
    }

    setUploadStatus(t.publishing);

    const presentation = await api.entities.Presentations.create({
      title: form.title.trim(),
      file_url,
      handout_url,
      handout_is_derived: handout ? handoutIsDerived : undefined,
      handout_status: handout ? "approved" : undefined,
      thumbnail_url,
      doi: form.doi.trim(),
      paper_title: form.paper_title.trim(),
      discipline: form.discipline,
      paper_type: form.paper_type || undefined,
      extra_papers: extraPapers.filter((p) => p.doi.trim() && p.title.trim()),
      license: form.license,
      tags: form.tags.trim(),
      video_url: form.video_url.trim() || undefined,
      uploader_id: user ? user.id : null,
      uploader_name: user ? (user.full_name || user.email) : "Anonymous",
      uploader_university: form.institution.trim() || (user ? (user.university || "") : ""),
      is_author: isAuthor && authorshipVerified,
      authorship_verified: isAuthor && authorshipVerified,
      authorship_method: authorshipMethod || "unverified",
      authorship_matched_author: authorshipMatchedName || null,
      paper_license: paperLicense?.label || null,
      has_nd_restriction: hasNDRestriction(paperLicense?.label || ""),
      avg_rating: 0,
      rating_count: 0,
      downloads: 0,
    });

    if (user) await api.auth.updateMe({ points: (user.points || 0) + 50 });

    setUploadedId(presentation.id);
    setSuccess(true);
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
    </div>
  );



  if (success) return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-semibold text-[#0F172A] mb-2">{t.published}</h2>
        <p className="text-slate-500 mb-2">{t.publishedDesc}</p>
        <p className="text-sm text-[#B45309] font-medium mb-8">{t.pointsEarned}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={`/presentation/${uploadedId}`} className="px-6 py-3 bg-[#1E293B] text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors min-h-[44px] flex items-center justify-center">
            {t.viewPresentation}
          </Link>
          <Link to="/browse" className="px-6 py-3 border border-slate-200 text-[#0F172A] text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors min-h-[44px] flex items-center justify-center">
            {t.backToBrowse}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="bg-[#1E293B] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-blue-400 text-xs font-medium tracking-widest uppercase mb-3">{t.submissionPortal}</p>
          <h1 className="font-heading text-2xl lg:text-3xl font-semibold mb-2">{t.uploadHeading}</h1>
          <p className="text-slate-400 text-sm">{t.uploadDesc}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* DOI & Paper — first */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Link2 className="w-5 h-5 text-[#2563EB]" />
              <h2 className="font-heading text-lg font-semibold text-[#0F172A]">{t.doiSection}</h2>
            </div>
            <Field label={t.doiLabel} error={errors.doi} hint={t.doiHint}>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                {doiValid === true && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />}
                {doiValid === false && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
                <input
                  type="text"
                  value={form.doi}
                  onChange={handleDoiChange}
                  placeholder="10.1073/pnas.2000922117"
                  className={`w-full pl-10 pr-10 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white font-mono ${
                    doiValid === true ? "border-green-300" : doiValid === false || errors.doi ? "border-red-300" : "border-slate-200"}`}
                />
              </div>
              {doiValid === true && form.doi && (
                <div className="mt-1.5 space-y-1.5">
                  <a href={`https://doi.org/${form.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#2563EB] hover:underline">
                    → https://doi.org/{form.doi}
                  </a>
                  {fetchingPaperLicense && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {lang === "de" ? "Paper-Lizenz wird abgerufen…" : "Fetching paper license…"}
                    </p>
                  )}
                  {paperLicense && !fetchingPaperLicense && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-xs font-medium text-slate-500">{lang === "de" ? "Lizenz des Fachartikels:" : "Paper License:"}</span>
                      {paperLicense.url ? (
                        <a href={paperLicense.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#2563EB] hover:underline">
                          {paperLicense.label}
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600">{paperLicense.label}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Field>
            <Field label={t.paperTitleLabel} hint={t.paperTitleHint}>
              <input
                type="text"
                value={form.paper_title}
                onChange={handleChange("paper_title")}
                placeholder="e.g. Late Jurassic Carbon Isotope Excursion…"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              />
            </Field>

            {/* Additional Papers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#0F172A]">{t.additionalPapers || "Additional Papers"} <span className="text-slate-400 font-normal text-xs">({t.optional || "optional"})</span></label>
                <button type="button" onClick={addExtraPaper} className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium">
                  <Plus className="w-3.5 h-3.5" /> {t.addPaper || "Add paper"}
                </button>
              </div>
              {extraPapers.map((ep, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-500">Paper {i + 2}</span>
                    <button type="button" onClick={() => removeExtraPaper(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={ep.doi}
                      onChange={(e) => updateExtraPaper(i, "doi", e.target.value)}
                      placeholder="DOI: 10.XXXX/…"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white font-mono ${errors[`extra_doi_${i}`] ? "border-red-300" : "border-slate-200"}`}
                    />
                    {errors[`extra_doi_${i}`] && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`extra_doi_${i}`]}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={ep.title}
                      onChange={(e) => updateExtraPaper(i, "title", e.target.value)}
                      placeholder={t.paperTitleLabel?.replace(" *", "") || "Paper title…"}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white ${errors[`extra_title_${i}`] ? "border-red-300" : "border-slate-200"}`}
                    />
                    {errors[`extra_title_${i}`] && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[`extra_title_${i}`]}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Presentation Info */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <BookOpen className="w-5 h-5 text-[#2563EB]" />
              <h2 className="font-heading text-lg font-semibold text-[#0F172A]">{t.presentationSection}</h2>
            </div>

            <Field label={t.titleLabel} error={errors.title}>
              <input
                type="text"
                value={form.title}
                onChange={handleChange("title")}
                placeholder="e.g. Carbon Cycle Dynamics in the Late Jurassic"
                className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white ${errors.title ? "border-red-300" : "border-slate-200"}`}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label={t.disciplineLabel} error={errors.discipline}>
                <select
                  value={form.discipline}
                  onChange={handleChange("discipline")}
                  className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white appearance-none ${errors.discipline ? "border-red-300" : "border-slate-200"}`}
                >
                  <option value="">{t.disciplinePlaceholder}</option>
                  {DISCIPLINES.map((d) => <option key={d} value={d}>{lang === "de" ? (disciplineLabelDE[d] || d) : d}</option>)}
                </select>
              </Field>

              <Field label={<>{t.paperTypeLabel || "Paper Type"} <span className="text-slate-400 font-normal text-xs">({t.paperTypeHint || "Optional"})</span></>}>
                <select
                  value={form.paper_type}
                  onChange={handleChange("paper_type")}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white appearance-none"
                >
                  <option value="">{t.paperTypePlaceholder || "Select type… (optional)"}</option>
                  {PAPER_TYPES.map((pt) => <option key={pt} value={pt}>{lang === "de" ? (paperTypeLabelDE[pt] || pt) : pt}</option>)}
                </select>
              </Field>
            </div>

            <Field label={lang === "de" ? "Lizenz der Präsentation *" : "Presentation License *"} error={errors.license} hint={t.licenseHint}>
              <select
                value={form.license}
                onChange={handleChange("license")}
                className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white appearance-none ${errors.license ? "border-red-300" : "border-slate-200"}`}
              >
                <option value="">{t.licensePlaceholder}</option>
                {(lang === "de" ? LICENSES_DE : LICENSES_EN).map((l) => {
                  const idx = LICENSE_VALUES.indexOf(l.value);
                  const tooPermissive = minLicenseIdx >= 0 && idx < minLicenseIdx;
                  return (
                    <option key={l.value} value={l.value} disabled={tooPermissive}>
                      {tooPermissive ? "🔒 " : ""}{l.label} — {l.desc}
                    </option>
                  );
                })}
              </select>
              {minLicenseIdx >= 0 && !isAuthor && (
                <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {lang === "de"
                    ? `Das Paper ist unter "${paperLicense?.label}" lizenziert — die Präsentation darf nicht freizügiger lizenziert sein.`
                    : `The paper is licensed under "${paperLicense?.label}" — the presentation license cannot be more permissive.`}
                </p>
              )}
            </Field>

            {/* Author checkbox — only for logged-in users (Layer 3) */}
            {user ? (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="mt-0.5 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isAuthor}
                      onChange={(e) => {
                        setIsAuthor(e.target.checked);
                        if (!e.target.checked) {
                          setAuthorshipVerified(false);
                          setAuthorshipMethod(null);
                          setAuthorshipMatchedName(null);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#0F172A]">
                      {lang === "de" ? "Ich bin der Autor / Co-Autor des der Präsentation zugehörigen Fachartikels" : "I am the author / co-author of the scientific paper associated with this presentation"}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === "de"
                        ? "Als Urheber gelten keine Lizenz-Beschränkungen. Authorship wird via CrossRef verifiziert."
                        : "As the original author, no license restrictions apply. Authorship will be verified via CrossRef."}
                    </p>
                  </div>
                </label>

                {/* CrossRef Verifier — shown when box is checked and DOI is valid */}
                {isAuthor && DOI_REGEX.test(form.doi.trim()) && (
                  <AuthorshipVerifier
                    doi={form.doi}
                    userEmail={user.email}
                    userName={user.full_name || user.email}
                    userId={user.id}
                    lang={lang}
                    onVerified={(verified, method, matchedName) => {
                      setAuthorshipVerified(verified);
                      setAuthorshipMethod(method || null);
                      setAuthorshipMatchedName(matchedName || null);
                    }}
                  />
                )}

                {/* Warning: DOI required for verification */}
                {isAuthor && !DOI_REGEX.test(form.doi.trim()) && (
                  <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {lang === "de"
                      ? "Bitte gib zuerst eine gültige DOI ein, um deine Authorship zu verifizieren."
                      : "Please enter a valid DOI first to verify your authorship."}
                  </p>
                )}

                {/* Blocked: author claimed but not verified */}
                {authorClaimBlocked && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      {lang === "de"
                        ? "Du musst deine Authorship via CrossRef bestätigen, bevor du als Autor hochladen kannst."
                        : "You must verify your authorship via CrossRef before uploading as an author."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">
                    {lang === "de"
                      ? "Bitte registriere dich, um Fachartikel-Autorenschaft-Ansprüche zu machen. Anonyme Uploads werden nicht als Autoren-verifiziert gespeichert."
                      : "Please register to make paper-authorship claims. Anonymous uploads cannot be author-verified."}
                  </p>
                </div>
              </div>
            )}

            {/* ND block warning */}
            {isNDBlocked && !isAuthor && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {lang === "de" ? "Upload nicht erlaubt — ND-Lizenz" : "Upload blocked — ND License"}
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {lang === "de"
                      ? `Das Paper ist unter „${paperLicense?.label}" lizenziert. Die ND-Klausel (No Derivatives) verbietet Bearbeitungen wie Präsentationen durch Dritte. Nur der Original-Autor darf hochladen.`
                      : `The paper is licensed under "${paperLicense?.label}". The ND (No Derivatives) clause prohibits derivative works like presentations by third parties. Only the original author may upload.`}
                  </p>
                </div>
              </div>
            )}

            {/* Unknown license block */}
            {isUnknownBlocked && !isAuthor && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {lang === "de" ? "Lizenz unbekannt — Upload blockiert" : "Unknown license — upload blocked"}
                  </p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {lang === "de"
                      ? "Die Lizenz des Papers konnte nicht ermittelt werden. Aus Sicherheitsgründen ist kein Upload möglich. Bitte bestätige deine Autorenschaft oder wende dich an den Verlag."
                      : "The paper's license could not be determined. Upload is blocked for safety. Please verify your authorship or contact the publisher."}
                  </p>
                </div>
              </div>
            )}

            {/* NC license info */}
            {!isAuthor && ["CC BY-NC 4.0", "CC BY-NC-SA 4.0"].includes(form.license) && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {lang === "de"
                    ? "NC-Lizenz: Diese Präsentation darf nur kostenlos angeboten werden. Kommerzielle Nutzung ist nicht erlaubt."
                    : "NC License: This presentation may only be offered for free. Commercial use is not permitted."}
                </p>
              </div>
            )}

            {/* Institution */}
            <div className="pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#0F172A]">
                  {lang === "de" ? "Institution / Organisation" : "Institution / Organisation"}
                  <span className="text-slate-400 font-normal text-xs ml-1">({lang === "de" ? "optional" : "optional"})</span>
                </label>
                <input
                  type="text"
                  value={form.institution || ""}
                  onChange={handleChange("institution")}
                  placeholder={lang === "de" ? "z.B. Universität Hamburg, Max-Planck-Institut…" : "e.g. Harvard University, CERN…"}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                />
              </div>
            </div>

            <Field label={t.tagsLabel} hint={t.tagsHint}>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.tags}
                  onChange={handleChange("tags")}
                  placeholder="Jurassic, carbon cycle, geochemistry"
                  className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                />
              </div>
            </Field>
          </section>

          {/* File Upload */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <FileText className="w-5 h-5 text-[#2563EB]" />
              <h2 className="font-heading text-lg font-semibold text-[#0F172A]">{t.fileSection}</h2>
            </div>

            {/* Metadata-only warning */}
            {isMetadataOnly && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {lang === "de" ? "Nur Metadaten-Upload möglich" : "Metadata-only upload"}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {lang === "de"
                      ? `Das verknüpfte Paper ist unter „${paperLicense?.label}" lizenziert. Da du nicht der Autor bist, darf die Präsentationsdatei nicht hochgeladen werden. Nur Metadaten (Titel, Thumbnail, DOI, Tags) werden gespeichert.`
                      : `The linked paper is licensed under "${paperLicense?.label}". Since you are not the author, the presentation file cannot be uploaded. Only metadata (title, thumbnail, DOI, tags) will be stored.`}
                  </p>
                </div>
              </div>
            )}

            {/* Upload Box — visible unless metadata-only or problematic papers detected */}
            {!isMetadataOnly && (!scanned || problematicPapers.length === 0) && (
             <FileDropZone
               file={file} onFile={(newFile) => {
                 setUploadedFileUrl(null);
                 setCitationConsent(null);
                 setConsentDoi(false);
                 setConsentFigures(false);
                 setScanned(null);
                 setProblematicPapers([]);
                 setConfirmedRestrictedCitations(false);
                 setAwaitingNewFile(false);
                 setScanAttempt(0);
                 handleFileChange(newFile);
               }}
                accept=".pdf,.pptx"
                label={t.fileLabel} error={errors.file}
                icon={UploadIcon}
              />
            )}

            {/* Step 1: Declaration checkboxes — shown after PDF/PPTX is selected, before scanner (but NOT during re-upload) */}
            {!isMetadataOnly && file && (file.name.endsWith(".pdf") || file.name.endsWith(".pptx")) && citationConsent === null && !awaitingNewFile && scanned === null && (
              <div className="mt-4 border border-blue-200 bg-blue-50 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {lang === "de" ? "Pflichtbestätigung vor dem Scan" : "Required declaration before scan"}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consentDoi}
                      onChange={(e) => setConsentDoi(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
                    />
                    <span className="text-sm text-slate-700">
                      {lang === "de"
                        ? "Alle Quellen im Literaturverzeichnis sind mit einer DOI angegeben."
                        : "All sources in the reference list are cited with a DOI."}
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consentFigures}
                      onChange={(e) => setConsentFigures(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
                    />
                    <span className="text-sm text-slate-700">
                      {lang === "de"
                        ? "Alle Abbildungen und Grafiken in der Präsentation haben einen Quellenverweis."
                        : "All figures and graphics in the presentation have a source reference."}
                    </span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={!consentDoi || !consentFigures || uploadingForScan}
                  onClick={async () => {
                    setUploadingForScan(true);
                    try {
                      const res = await api.integrations.Core.UploadFile({ file });
                      setUploadedFileUrl(res.file_url);
                      setCitationConsent("yes");
                    } catch {
                      // keep consent null so user can retry
                    }
                    setUploadingForScan(false);
                  }}
                  className="w-full py-2.5 bg-[#1E293B] text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {uploadingForScan
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{lang === "de" ? "Wird hochgeladen…" : "Uploading…"}</span>
                    : (lang === "de" ? "Bestätigen & Lizenz-Scan starten" : "Confirm & start license scan")}
                </button>
              </div>
            )}

            {/* Step 2: Scanner — shown after consent = yes, starts automatically */}
            {!isMetadataOnly && uploadedFileUrl && citationConsent === "yes" && (
              <ReferenceLicenseScanner
                fileUrl={uploadedFileUrl}
                lang={lang}
                autoStart={true}
                onScanComplete={(problematicPapers) => {
                   setScanAttempt(prev => prev + 1);
                   setScanned(true);
                   setProblematicPapers(problematicPapers);
                   // If problems found, enter reupload mode; if no problems, exit reupload mode
                   setAwaitingNewFile(problematicPapers.length > 0);
                 }}
                onReuploadRequest={() => setAwaitingNewFile(true)}
              />
            )}

            {/* Red warning box for problematic papers (shown after first scan with problems) */}
            {!isMetadataOnly && scanned && problematicPapers.length > 0 && (
              <>
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-2">
                      {lang === "de"
                        ? "Bitte prüfe deine Präsentation auf Abbildungen dieser Autoren und entferne sie vor dem erneuerten Hochladen."
                        : "Please check your presentation for figures from these authors and remove them before reuploading."}
                    </p>
                    <ul className="space-y-1.5">
                      {problematicPapers.map((paper, i) => (
                        <li key={i} className="text-xs text-red-700">
                          <span className="font-medium">• {paper.authors || paper.citation || paper.doi}</span>
                          {paper.year && <span> ({paper.year})</span>}
                          {paper.title && (
                            <>
                              <br />
                              <span className="text-red-600">{paper.title}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-red-700 mt-3 font-semibold">
                      🚫 {lang === "de" ? "Upload blockiert — bitte bearbeite die Präsentation und versuche es erneut." : "Upload blocked — please edit the presentation and try again."}
                    </p>
                  </div>
                </div>

                {/* Reupload Box — visible after first scan with problems */}
                <FileDropZone
                  file={file} onFile={async (newFile) => {
                    setFile(newFile);
                    setScanned(null);
                    setProblematicPapers([]);
                    setConfirmedRestrictedCitations(false);
                    setConfirmedFiguresRemoved(false);
                    setAwaitingNewFile(false);
                    setCitationConsent(null);
                    // Start upload immediately and show options while uploading
                    try {
                      const res = await api.integrations.Core.UploadFile({ file: newFile });
                      setUploadedFileUrl(res.file_url);
                    } catch {
                      // keep uploadedFileUrl null so user can retry
                    }
                  }}
                  accept=".pdf,.pptx"
                  label={lang === "de" ? "Bearbeitete Präsentationsdatei hochladen" : "Upload edited presentation file"}
                  hint={lang === "de" ? "Laden Sie die bearbeitete Datei erneut hoch" : "Upload the edited file again"}
                  error={errors.file}
                  icon={UploadIcon}
                />
              </>
            )}

            {/* After reupload: skip scan and confirm figures removed */}
            {!isMetadataOnly && uploadedFileUrl && citationConsent === null && scanAttempt >= 1 && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  {lang === "de" ? "Ohne Scan fortfahren:" : "Skip scan:"}
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedFiguresRemoved}
                    onChange={(e) => setConfirmedFiguresRemoved(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
                  />
                  <span className="text-xs text-slate-700">
                    {lang === "de"
                      ? "Ich bestätige, dass ich alle Abbildungen mit restriktiver Lizenz entfernt habe."
                      : "I confirm to have removed all license-restricted figures."}
                  </span>
                </label>
              </div>
            )}

            {/* Re-upload confirmation box (shown after reupload complete with no more problems) */}
            {!isMetadataOnly && !awaitingNewFile && scanned === true && scanAttempt >= 2 && problematicPapers.length === 0 && file && (
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {lang === "de" ? "Neue Datei erkannt" : "New file detected"}
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedRestrictedCitations}
                    onChange={(e) => setConfirmedRestrictedCitations(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
                  />
                  <span className="text-sm text-slate-700">
                    {lang === "de"
                      ? "Ich bestätige, dass ich alle Abbildungen mit restriktiver Lizenz entfernt habe."
                      : "I confirm to have removed all figures with a restricted license."}
                  </span>
                </label>
              </div>
            )}





            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Thumbnail with preview */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#0F172A]">{t.thumbnailLabel}</label>
                {t.thumbnailHint && <p className="text-xs text-slate-500">{t.thumbnailHint}</p>}
                <div className={`relative border-2 border-dashed rounded-xl overflow-hidden text-center transition-all ${thumbnail ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-[#2563EB] hover:bg-blue-50"}`}>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setThumbnail(e.target.files[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {thumbnail ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <img src={URL.createObjectURL(thumbnail)} alt="Thumbnail preview" className="w-full h-32 object-cover" />
                      <div className="pb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-medium text-green-700">{["thumbnail.png", "thumbnail.jpg"].includes(thumbnail.name) ? (lang === "de" ? "Auto-Vorschau (1. Folie)" : "Auto-preview (1st slide)") : thumbnail.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex flex-col items-center gap-1.5">
                      <Image className="w-7 h-7 text-slate-400" />
                      <p className="text-sm text-slate-500">.jpg, .png, .webp</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <FileDropZone
                  file={handout} onFile={setHandout}
                  accept=".pdf"
                  label={t.handoutLabel} hint={t.handoutHint}
                  icon={FileDown}
                />
                {handout && (
                  <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={handoutIsDerived}
                      onChange={(e) => setHandoutIsDerived(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
                    />
                    <span className="text-xs text-slate-600">
                      {lang === "de"
                        ? "Dieses Handout enthält keine zusätzlichen Inhalte im Vergleich zur Präsentation (abgeleitet)."
                        : "This handout contains no additional content compared to the presentation (derived)."}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <Field label={t.videoLabel} hint={t.videoHint}>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={form.video_url}
                  onChange={handleChange("video_url")}
                  placeholder="https://youtube.com/watch?v=…"
                  className="w-full pl-10 pr-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                />
              </div>
            </Field>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link to="/browse" className="text-sm text-slate-500 hover:text-[#0F172A] transition-colors">{t.cancel}</Link>
            <button type="submit" disabled={
              submitting || (
                // If user confirmed (skip-scan OR post-rescan checkbox), allow publish — only block on handout consent
                (confirmedFiguresRemoved && scanAttempt >= 1) || (confirmedRestrictedCitations && scanAttempt >= 2)
                  ? (!!handout && !handoutIsDerived)
                  : uploadBlocked || authorClaimBlocked ||
                    awaitingNewFile ||
                    (!isMetadataOnly && file && (file.name.endsWith(".pdf") || file.name.endsWith(".pptx")) && citationConsent !== "yes" && !confirmedFiguresRemoved) ||
                    (!isMetadataOnly && file && (file.name.endsWith(".pdf") || file.name.endsWith(".pptx")) && citationConsent === "yes" && scanned === null) ||
                    // Allow publish if all papers are open or ambiguous (no "restricted" or "unknown" statuses)
                    (!isMetadataOnly && scanned && problematicPapers.length > 0 && scanned && !confirmedRestrictedCitations && !problematicPapers.every(p => ["open", "ambiguous"].includes(p.status))) ||
                    (!!handout && !handoutIsDerived)
              )
            }
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2563EB] text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{uploadStatus}</>
              ) : (
                <><UploadIcon className="w-4 h-4" />{t.publish}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}