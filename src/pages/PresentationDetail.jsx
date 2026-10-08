import React, { useState, useEffect } from "react";
import { api, getToken } from "@/api/client";
import { Link, useNavigate } from "react-router-dom";
import StarRating from "@/components/StarRating";
import DoiLink from "@/components/DoiLink";
import { useLang, disciplineLabelDE } from "@/lib/LanguageContext";
import { ExternalLink, Play, ArrowLeft, Loader2,
  MessageSquare, User, Calendar, Tag, BookOpen, Send,
  Pencil, X, CheckCircle, Image, FileDown, Plus, Trash2, Archive, AlertCircle, Link2, Flag, Sparkles
} from "lucide-react";
import { AlexandriaBackdrop } from "@/components/AlexandriaScene";
import LicenseBadge from "@/components/LicenseBadge";
import LicenseInfoPanel from "@/components/LicenseInfoPanel";
import SidebarLicenseEditor from "@/components/SidebarLicenseEditor";
import DownloadConsentModal from "@/components/DownloadConsentModal";
import { LICENSE_VALUES, getLicenseUrl, hidesThumbnail } from "@/lib/licenseUtils";
import JsonLd from "@/components/JsonLd";
import MetaRobots from "@/components/MetaRobots";
import usePageTitle from "@/hooks/usePageTitle";

// Extracted to prevent focus loss on re-render
function ExtraPaperRow({ index, doi, title, onUpdate, onRemove }) {
  const { lang } = useLang();
  return (
    <fieldset className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
      <div className="flex items-center justify-between">
        <legend className="text-xs font-medium text-slate-700">Paper {index + 2}</legend>
        <button
          type="button"
          onClick={onRemove}
          aria-label={lang === "de" ? `Paper ${index + 2} entfernen` : `Remove paper ${index + 2}`}
          className="p-1.5 -m-1.5 text-slate-600 hover:text-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <input
        aria-label={`DOI – Paper ${index + 2}`}
        type="text"
        defaultValue={doi}
        onBlur={(e) => onUpdate("doi", e.target.value)}
        onChange={(e) => onUpdate("doi", e.target.value)}
        placeholder="DOI: 10.XXXX/…"
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white font-mono ${doi && !/^10\.\d{4,}\/.+/.test(doi) ? "border-red-300" : "border-slate-200"}`}
      />
      <input
        aria-label={`${lang === "de" ? "Titel" : "Title"} – Paper ${index + 2}`}
        type="text"
        defaultValue={title}
        onBlur={(e) => onUpdate("title", e.target.value)}
        onChange={(e) => onUpdate("title", e.target.value)}
        placeholder="Paper title…"
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
      />
    </fieldset>
  );
}

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
  { value: "CC0 1.0", desc: "No rights reserved — Anyone can use, share, or modify this, no attribution required." },
  { value: "CC BY 4.0", desc: "Free to use with attribution" },
  { value: "CC BY-SA 4.0", desc: "Attribution + share alike" },
  { value: "CC BY-NC 4.0", desc: "Non-commercial only" },
  { value: "CC BY-NC-SA 4.0", desc: "Non-commercial + share alike" },
  { value: "CC BY-ND 4.0", desc: "No derivatives allowed" },
  { value: "CC BY-NC-ND 4.0", desc: "Non-commercial, no derivatives" },
  { value: "All Rights Reserved", desc: "No reuse without permission" },
];
const LICENSES_DE = [
  { value: "CC0 1.0", desc: "Keine Rechte vorbehalten — Jeder darf diese Präsentation nutzen, teilen oder verändern, ohne Namensnennung." },
  { value: "CC BY 4.0", desc: "Freie Nutzung mit Namensnennung" },
  { value: "CC BY-SA 4.0", desc: "Namensnennung + Weitergabe unter gleichen Bedingungen" },
  { value: "CC BY-NC 4.0", desc: "Nur nicht-kommerzielle Nutzung" },
  { value: "CC BY-NC-SA 4.0", desc: "Nicht-kommerziell + Weitergabe unter gleichen Bedingungen" },
  { value: "CC BY-ND 4.0", desc: "Keine Bearbeitungen erlaubt" },
  { value: "CC BY-NC-ND 4.0", desc: "Nicht-kommerziell, keine Bearbeitungen" },
  { value: "All Rights Reserved", desc: "Keine Weiternutzung ohne Genehmigung" },
];

const DOI_REGEX = /^10\.\d{4,}\/.+/;

export default function PresentationDetail() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const id = window.location.pathname.split("/presentation/")[1];

  const [presentation, setPresentation] = useState(null);
  usePageTitle(presentation?.title);
  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [user, setUser] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [existingRating, setExistingRating] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);


  // Owner edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editDiscipline, setEditDiscipline] = useState("");
  const [editPaperType, setEditPaperType] = useState("");
  const [editExtraPapers, setEditExtraPapers] = useState([]);
  const [editLicense, setEditLicense] = useState("");
  const [editHandout, setEditHandout] = useState(null);
  const [editThumbnail, setEditThumbnail] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const addEditExtra = () => setEditExtraPapers((prev) => [...prev, { doi: "", title: "" }]);
  const removeEditExtra = (i) => setEditExtraPapers((prev) => prev.filter((_, idx) => idx !== i));
  const updateEditExtra = (i, field, val) =>
    setEditExtraPapers((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    const [pres, comms, rats, u] = await Promise.all([
      api.entities.Presentations.filter({ id }),
      api.entities.Comments.filter({ presentation_id: id }, "-created_date", 50),
      api.entities.Ratings.filter({ presentation_id: id }),
      api.auth.me().catch(() => null),
    ]);
    setPresentation(pres[0] || null);
    setComments(comms);
    setRatings(rats);
    setUser(u);

    if (u && rats.length > 0) {
      const myRating = rats.find((r) => r.user_id === u.id);
      if (myRating) {
        setExistingRating(myRating);
        setUserRating(myRating.score);
      }
    }
    setLoading(false);

    // Fetch paper authors from CrossRef
    const doi = pres[0]?.doi;
    if (doi) {
      fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const authors = data?.message?.author || [];
          if (authors.length > 0) {
            setPaperAuthors(authors.map(a => [a.given, a.family].filter(Boolean).join(" ")));
          }
        })
        .catch(() => {});
    }
  };

  const [downloading, setDownloading] = useState(null); // 'presentation' | 'handout' | 'both'
  const [consentModal, setConsentModal] = useState(null); // null | 'presentation' | 'handout' | 'both'
  const [downloadError, setDownloadError] = useState(null);
  const [paperAuthors, setPaperAuthors] = useState(null);
  const [authorsExpanded, setAuthorsExpanded] = useState(false);

  const buildLicenseFiles = (downloaderUser) => {
    const uploadYear = presentation.created_date ? new Date(presentation.created_date).getFullYear() : new Date().getFullYear();
    const uploaderStr = presentation.uploader_name || "Anonymous";
    const downloadTimestamp = new Date().toISOString();
    const licenseId = `PH-${presentation.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const licenseText = [
      `LICENSE`,
      `=======`,
      ``,
      `Title:     ${presentation.title}`,
      `Author:    ${uploaderStr}`,
      `License:   ${presentation.license || "Unknown"}`,
      `Permalink: https://doi.org/${presentation.doi}`,
      `Source:    PaperHub — https://paperhub.io`,
      `Date:      ${presentation.created_date ? new Date(presentation.created_date).toISOString().split("T")[0] : ""}`,
      ``,
      presentation.license === "CC0 1.0"
        ? `This work has been dedicated to the Public Domain. No rights reserved.`
        : presentation.license === "All Rights Reserved"
        ? `All rights reserved. No reuse without explicit written permission from the author.`
        : `This work is licensed under ${presentation.license}.`,
      ``,
      presentation.license && presentation.license !== "All Rights Reserved" && presentation.license !== "CC0 1.0"
        ? `When using this work, please credit:\n"${uploaderStr}" (${uploadYear}) via PaperHub — ${presentation.license}`
        : ``,
    ].join("\n");

    // Punkt 2: Sichtbarer Footer-Hinweis mit Lizenz-ID (rückverfolgbar)
    // Punkt 3: Personalisierter Download mit User-Daten
    const noticeText = [
      `NOTICE — Licensed via PaperHub`,
      `================================`,
      ``,
      `License-ID:    ${licenseId}`,
      `Title:         ${presentation.title}`,
      `License:       ${presentation.license || "Unknown"}`,
      presentation.license === "All Rights Reserved"
        ? `RESTRICTED USE — No redistribution without author permission.`
        : presentation.license === "CC0 1.0"
        ? `PUBLIC DOMAIN — Free to use without restriction.`
        : `Licensed under ${presentation.license}. Attribution required.`,
      ``,
      `--- Download Record ---`,
      `Downloaded by: ${downloaderUser ? (downloaderUser.full_name || downloaderUser.email || downloaderUser.id) : "Anonymous"}`,
      `User-ID:       ${downloaderUser?.id || "n/a"}`,
      `Timestamp:     ${downloadTimestamp}`,
      ``,
      `This record serves as proof of license acceptance.`,
      `Any misuse may be traced via the License-ID above.`,
      ``,
      `PaperHub — https://paperhub.io`,
    ].join("\n");

    const metadata = {
      "@context": "https://schema.org",
      "@type": "PresentationDigitalDocument",
      name: presentation.title,
      author: { "@type": "Person", name: uploaderStr },
      license: presentation.license === "CC0 1.0"
        ? "https://creativecommons.org/publicdomain/zero/1.0/"
        : presentation.license === "All Rights Reserved"
        ? "All Rights Reserved"
        : `https://creativecommons.org/licenses/${presentation.license.toLowerCase().replace("cc ", "").replace(" 4.0", "/4.0/")}`,
      about: presentation.paper_title || presentation.title,
      identifier: `https://doi.org/${presentation.doi}`,
      datePublished: presentation.created_date ? new Date(presentation.created_date).toISOString().split("T")[0] : "",
      keywords: presentation.tags || "",
      inLanguage: "en",
      publisher: { "@type": "Organization", name: "PaperHub" },
      paperhub_license_id: licenseId,
      paperhub_downloaded_by: downloaderUser?.id || "anonymous",
      paperhub_download_timestamp: downloadTimestamp,
    };
    return { licenseText, noticeText, metadata, licenseId };
  };

  // The dialog unmounts on close, so focus is handed back to the button that
  // opened it here rather than by the dialog itself (WCAG 2.4.3).
  const downloadTriggerRef = React.useRef(null);
  const closeConsentModal = () => {
    setConsentModal(null);
    setTimeout(() => downloadTriggerRef.current?.focus(), 0);
  };

  const handleDownloadRequest = (mode) => {
    downloadTriggerRef.current = document.activeElement;
    setConsentModal(mode);
  };

  const handleConsentConfirmed = async () => {
    const mode = consentModal;
    closeConsentModal();
    await handleDownload(mode);
  };

  const handleDownload = async (mode = "presentation") => {
    if (!presentation?.file_url) return;
    setDownloading(mode);
    setDownloadError(null);

    try {
      // Fetched directly rather than through the client: the response is a ZIP
      // blob, not JSON.
      const token = getToken();
      const resp = await fetch("/api/functions/downloadPresentation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ presentation_id: presentation.id, mode }),
      });

      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${presentation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update local state to reflect incremented counts
      const downloadUpdates = { downloads: (presentation.downloads || 0) + 1 };
      if (mode === "handout" || mode === "both") {
        downloadUpdates.handout_downloads = (presentation.handout_downloads || 0) + 1;
      }
      setPresentation((p) => ({ ...p, ...downloadUpdates }));
      if (mode === "handout" || mode === "both") {
        api.analytics.track({ eventName: "handout_downloaded", properties: { presentation_id: presentation.id } });
      }
    } catch {
      // No fallback to the raw file: a download must always carry its licence.
      setDownloadError(
        lang === "de"
          ? "Der Download ist fehlgeschlagen. Bitte versuche es später erneut."
          : "The download failed. Please try again later."
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleRate = async (score) => {
    if (!user) { window.location.href = "/login"; return; }
    setSubmittingRating(true);
    setUserRating(score);

    if (existingRating) {
      await api.entities.Ratings.update(existingRating.id, { score });
    } else {
      const newRating = await api.entities.Ratings.create({
        presentation_id: presentation.id,
        user_id: user.id,
        score,
      });
      setExistingRating(newRating);
    }

    // The server recalculates avg_rating when the rating is saved — only the
    // owner may write to the presentation, so the client must not try. Read the
    // fresh numbers back rather than computing a second, divergent version.
    const [updated] = await api.entities.Presentations.filter({ id: presentation.id });
    if (updated) {
      setPresentation((p) => ({
        ...p,
        avg_rating: updated.avg_rating,
        rating_count: updated.rating_count,
      }));
    }
    setRatingSuccess(true);
    setTimeout(() => setRatingSuccess(false), 2000);
    setSubmittingRating(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) { window.location.href = "/login"; return; }
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    const comment = await api.entities.Comments.create({
      presentation_id: presentation.id,
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_university: user.university || "",
      text: newComment.trim(),
    });
    setComments((c) => [comment, ...c]);
    setNewComment("");
    setSubmittingComment(false);
  };

  const isOwner = user && presentation && user.id === presentation.uploader_id;

  const handleSaveEdit = async () => {
    // Validate extra papers
    const invalidExtra = editExtraPapers.some((p) => !p.doi.trim() || !p.title.trim() || !DOI_REGEX.test(p.doi.trim()));
    if (invalidExtra) return;

    setSavingEdit(true);
    const updates = {};
    if (editDiscipline && editDiscipline !== presentation.discipline) updates.discipline = editDiscipline;
    if (editPaperType !== (presentation.paper_type || "")) updates.paper_type = editPaperType || null;
    updates.license = editLicense;
    updates.extra_papers = editExtraPapers.filter((p) => p.doi.trim() && p.title.trim());
    if (editHandout) {
      const res = await api.integrations.Core.UploadFile({ file: editHandout });
      updates.handout_url = res.file_url;
      updates.handout_status = "approved";
      updates.handout_uploaded_at = new Date().toISOString();
      updates.handout_uploaded_by = user?.id || null;
      updates.handout_downloads = 0;
    }
    if (editThumbnail && !hidesThumbnail(editLicense)) {
      const res = await api.integrations.Core.UploadFile({ file: editThumbnail });
      updates.thumbnail_url = res.file_url;
    }
    await api.entities.Presentations.update(presentation.id, updates);
    setPresentation((p) => ({ ...p, ...updates }));
    setSavingEdit(false);
    setEditOpen(false);
    setEditHandout(null);
    setEditThumbnail(null);
    setEditDiscipline("");
    setEditPaperType("");
    setEditLicense("");
    setEditExtraPapers([]);
    setEditSuccess(true);
    setTimeout(() => setEditSuccess(false), 2500);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  };



  if (loading) {
    return (
      // Same ground as the loaded page, so it does not flash white first.
      <div className="flex items-center justify-center min-h-screen ph-parchment">
        <AlexandriaBackdrop />
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" aria-hidden="true" /><span role="status" className="sr-only">{lang === "de" ? "Wird geladen…" : "Loading…"}</span>
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 ph-parchment">
        <AlexandriaBackdrop />
        <BookOpen className="w-12 h-12 text-slate-500 mb-4" />
        <h2 className="font-heading text-2xl text-[#0F172A] mb-2">{t.notFound}</h2>
        <Link to="/browse" className="text-[#2563EB] hover:underline">{t.backToBrowse}</Link>
      </div>
    );
  }

  const tags = presentation.tags
    ? presentation.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Schema.org JSON-LD — machine-readable metadata for the linked scholarly article.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    name: presentation.paper_title || presentation.title,
    author: paperAuthors?.length ? paperAuthors.join(", ") : (presentation.uploader_name || "Anonymous"),
    datePublished: presentation.created_date ? new Date(presentation.created_date).toISOString().split("T")[0] : undefined,
    url: window.location.href,
  };
  const licUrl = getLicenseUrl(presentation.license);
  if (licUrl) {
    jsonLd.license = licUrl;
  } else if (presentation.license === "All Rights Reserved") {
    jsonLd.license = "All rights reserved";
  }

  return (
    <div className="min-h-screen ph-parchment">
      <AlexandriaBackdrop />
      <JsonLd data={jsonLd} />
      <MetaRobots license={presentation.license} />
      {/* Consent Modal */}
      {consentModal && (
        <DownloadConsentModal
          presentation={presentation}
          mode={consentModal}
          onConfirm={handleConsentConfirmed}
          onCancel={closeConsentModal}
        />
      )}

      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 min-h-[24px] text-sm text-slate-600 hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t.backToBrowse}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm">
              {/* Discipline + License badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="inline-block text-xs font-medium px-3 py-1 bg-blue-50 text-[#2563EB] rounded-full">
                  {lang === "de" ? (disciplineLabelDE[presentation.discipline] || presentation.discipline) : presentation.discipline}
                </span>
                {presentation.license && <LicenseBadge license={presentation.license} asLink />}
              </div>

              <h1 className="font-heading text-2xl lg:text-3xl font-semibold text-[#0F172A] leading-snug mb-4">
                {presentation.title}
              </h1>

              {/* Uploader */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center">
                  <span className="text-white font-bold">
                    {(presentation.uploader_name || "A")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  {presentation.uploader_id ? (
                    <Link to={`/u/${presentation.uploader_id}`} className="font-medium text-[#0F172A] text-sm hover:text-[#2563EB] hover:underline inline-flex items-center gap-1">
                      {presentation.uploader_name || t.anonymous}
                      <Link2 className="w-3 h-3 text-slate-500" />
                    </Link>
                  ) : (
                    <p className="font-medium text-[#0F172A] text-sm">
                      {presentation.uploader_name || t.anonymous}
                    </p>
                  )}
                  {presentation.uploader_university && (
                    <p className="text-xs text-slate-500">{presentation.uploader_university}</p>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                  <a
                    href={`mailto:info@filipsudermann.com?subject=${encodeURIComponent((lang === "de" ? "Urheberrechts-Beschwerde: " : "Copyright complaint: ") + (presentation.title || ""))}&body=${encodeURIComponent((lang === "de" ? "Bitte beschreibe die Verletzung:\n\nPräsentation: " : "Please describe the infringement:\n\nPresentation: ") + (presentation.title || "") + "\nDOI: " + (presentation.doi || "—") + "\nURL: " + (window.location.href))}`}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700 transition-colors"
                    title={lang === "de" ? "Inhalt melden" : "Report content"}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {lang === "de" ? "Melden" : "Report"}
                  </a>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(presentation.created_date)}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-6">
                  <Tag className="w-4 h-4 text-slate-500" />
                  {tags.map((tag) => (
                    <span key={tag} className="text-xs px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Thumbnail 16:9 box */}
              <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 w-full" style={{ aspectRatio: "16/9" }}>
                {presentation.thumbnail_url && !hidesThumbnail(presentation.license) ? (
                  <img
                    src={presentation.thumbnail_url}
                    alt={lang === "de" ? `Vorschau der ersten Folie: ${presentation.title}` : `Preview of the first slide: ${presentation.title}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center px-6 text-center">
                    <p className="text-sm text-slate-600 font-medium">
                      {hidesThumbnail(presentation.license)
                        ? (lang === "de"
                            ? `Keine Vorschau – die Lizenz (${presentation.license}) erlaubt kein Vorschaubild.`
                            : `No preview – the license (${presentation.license}) does not allow a preview image.`)
                        : (lang === "de" ? "Keine Vorschau vorhanden" : "No preview available")}
                    </p>
                  </div>
                )}
              </div>

              {presentation.ai_generated_content && (
                <p className="mb-6 flex items-start gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-900">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {lang === "de"
                    ? "Hinweis: Diese Präsentation enthält laut Uploader KI-generierte Inhalte."
                    : "Notice: According to the uploader, this presentation contains AI-generated content."}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {(() => {
                  const isAuthorUpload = presentation.is_author === true;
                  const isNDBlocked = presentation.has_nd_restriction && !isAuthorUpload;
                  const isARRBlocked = presentation.license === "All Rights Reserved" && !isAuthorUpload;
                  const hasFile = !!presentation.file_url;
                  const canDownload = hasFile && !isNDBlocked && !isARRBlocked;

                  if (isNDBlocked) return (
                    <div key="nd" className="flex items-start gap-3 w-full p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800">
                          {lang === "de" ? "Nicht verfügbar — ND-Lizenz" : "Not available — ND License"}
                        </p>
                        <p className="text-xs text-red-700 mt-0.5">
                          {lang === "de"
                            ? `Das verknüpfte Paper ist unter „${presentation.paper_license || "ND"}" lizenziert. Die No-Derivatives-Klausel untersagt Bearbeitungen wie Präsentationen durch Dritte.`
                            : `The linked paper is licensed under "${presentation.paper_license || "ND"}". The No-Derivatives clause prohibits derivative works by third parties.`}
                        </p>
                        {presentation.doi && (
                          <a href={`https://doi.org/${presentation.doi}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-[#2563EB] hover:underline font-medium">
                            <ExternalLink className="w-3 h-3" />
                            {lang === "de" ? "Originalpaper ansehen" : "View original paper"}
                          </a>
                        )}
                      </div>
                    </div>
                  );

                  if (isARRBlocked || !hasFile) return (
                    <div key="arr" className="flex items-start gap-3 w-full p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800">
                          {lang === "de" ? "Nur Metadaten verfügbar" : "Metadata only"}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {lang === "de"
                           ? (isARRBlocked
                               ? "Das Paper ist urheberrechtlich geschützt (All Rights Reserved). Download nicht erlaubt."
                               : "Es wurde keine Präsentationsdatei hochgeladen.")
                           : (isARRBlocked
                               ? "The paper is All Rights Reserved. Download not permitted."
                               : "No presentation file was uploaded.")}
                        </p>
                        {presentation.doi && (
                          <a href={`https://doi.org/${presentation.doi}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-amber-800 hover:bg-amber-100 font-medium transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            {lang === "de" ? "Beim Verlag kaufen / ansehen" : "Buy / view at publisher"}
                          </a>
                        )}
                      </div>
                    </div>
                  );

                  const hasApprovedHandout = presentation.handout_url && presentation.handout_status === "approved";

                  if (canDownload) return (
                    <React.Fragment key="dl">
                      <button
                        onClick={() => handleDownloadRequest("presentation")}
                        disabled={!!downloading}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#1E293B] text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-60 transition-colors min-h-[44px]"
                      >
                        {downloading === "presentation" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                        {t.downloadPresentation || "Download Presentation"}
                        {presentation.downloads > 0 && (
                          <span className="ml-1 text-slate-500 text-xs">({presentation.downloads})</span>
                        )}
                      </button>
                      {hasApprovedHandout && (
                        <button
                          onClick={() => handleDownloadRequest("handout")}
                          disabled={!!downloading}
                          className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-[#0F172A] text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors min-h-[44px]"
                        >
                          {downloading === "handout" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-[#2563EB]" />}
                          {lang === "de" ? "Handout herunterladen" : "Download Handout"}
                          {presentation.handout_downloads > 0 && (
                            <span className="ml-1 text-slate-500 text-xs">({presentation.handout_downloads})</span>
                          )}
                        </button>
                      )}
                      {hasApprovedHandout && (
                        <button
                          onClick={() => handleDownloadRequest("both")}
                          disabled={!!downloading}
                          className="inline-flex items-center gap-2 px-5 py-3 border border-[#2563EB] text-[#2563EB] text-sm font-medium rounded-lg hover:bg-blue-50 disabled:opacity-60 transition-colors min-h-[44px]"
                        >
                          {downloading === "both" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                          {lang === "de" ? "Präsentation + Handout" : "Presentation + Handout"}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })()}

                {presentation.video_url && (
                  <a
                    href={presentation.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-[#0F172A] text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors min-h-[44px]"
                  >
                    <Play className="w-4 h-4 text-[#2563EB]" />
                    {t.watchVideo}
                  </a>
                )}

              </div>
              <div role="alert" aria-live="assertive">
                {downloadError && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    {downloadError}
                  </p>
                )}
              </div>

              {/* Owner Edit Panel trigger */}
              <div className="flex flex-wrap gap-3 mt-3">
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditOpen((v) => !v);
                      setEditDiscipline(presentation.discipline);
                      setEditPaperType(presentation.paper_type || "");
                      setEditLicense(presentation.license || "CC0 1.0");
                      setEditExtraPapers(presentation.extra_papers ? [...presentation.extra_papers] : []);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors min-h-[44px]"
                  >
                    <Pencil className="w-4 h-4" />
                    {t.editPresentation || "Edit"}
                  </button>
                )}
              </div>

              {/* Owner Edit Panel */}
              {isOwner && editOpen && (
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-heading text-base font-semibold text-[#0F172A]">
                      {t.editPresentation || "Edit Presentation"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      aria-label={lang === "de" ? "Bearbeitung schließen" : "Close editing"}
                      className="p-1.5 -m-1.5 text-slate-600 hover:text-slate-800"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Discipline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="edit-discipline" className="block text-sm font-medium text-[#0F172A]">{t.disciplineLabel}</label>
                      <select
                        id="edit-discipline"
                        value={editDiscipline}
                        onChange={(e) => setEditDiscipline(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white appearance-none"
                      >
                        {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="edit-paper-type" className="block text-sm font-medium text-[#0F172A]">{t.paperTypeLabel || "Paper Type"} <span className="text-slate-600 font-normal text-xs">(optional)</span></label>
                      <select
                        id="edit-paper-type"
                        value={editPaperType}
                        onChange={(e) => setEditPaperType(e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white appearance-none"
                      >
                        <option value="">{t.paperTypePlaceholder || "Select type…"}</option>
                        {PAPER_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* License */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-license" className="block text-sm font-medium text-[#0F172A]">{t.licenseLabel || "License"}</label>
                    <select
                      id="edit-license"
                      value={editLicense}
                      onChange={(e) => setEditLicense(e.target.value)}
                      className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white appearance-none"
                    >
                      {(() => {
                        const licenses = lang === "de" ? LICENSES_DE : LICENSES_EN;
                        // Block licenses more permissive than the current presentation license
                        const currentIdx = LICENSE_VALUES.indexOf(presentation.license);
                        return licenses.map((l) => {
                          const idx = LICENSE_VALUES.indexOf(l.value);
                          const tooPermissive = !presentation.is_author && currentIdx >= 0 && idx < currentIdx;
                          return (
                            <option key={l.value} value={l.value} disabled={tooPermissive}>
                              {tooPermissive ? "🔒 " : ""}{l.value} — {l.desc}
                            </option>
                          );
                        });
                      })()}
                    </select>
                    {!presentation.is_author && presentation.paper_license && (
                      <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {lang === "de"
                          ? `Lizenz kann nicht freizügiger sein als die Paper-Lizenz („${presentation.paper_license}").`
                          : `License cannot be more permissive than the paper license ("${presentation.paper_license}").`}
                      </p>
                    )}
                  </div>

                  {/* Extra Papers */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-[#0F172A]">{t.additionalPapers || "Additional Papers"} <span className="text-slate-500 font-normal text-xs">(optional)</span></label>
                      <button type="button" onClick={addEditExtra} className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium">
                        <Plus className="w-3.5 h-3.5" /> {t.addPaper || "Add paper"}
                      </button>
                    </div>
                    {editExtraPapers.map((ep, i) => (
                      <ExtraPaperRow
                        key={ep._id || i}
                        index={i}
                        doi={ep.doi}
                        title={ep.title}
                        onUpdate={(field, val) => updateEditExtra(i, field, val)}
                        onRemove={() => removeEditExtra(i)}
                      />
                    ))}
                  </div>

                  {/* Thumbnail — not offered for licences that forbid a preview image */}
                  {hidesThumbnail(editLicense) ? (
                  <p className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    {lang === "de"
                      ? `Unter der Lizenz ${editLicense} wird kein Vorschaubild angezeigt.`
                      : `No preview image is shown under the ${editLicense} license.`}
                  </p>
                  ) : (
                  <div className="space-y-1.5">
                    <label htmlFor="edit-thumbnail" className="block text-sm font-medium text-[#0F172A]">{t.thumbnailLabel}</label>
                    <div className={`file-dropzone relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${editThumbnail ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-[#2563EB] hover:bg-blue-50"}`}>
                      <input id="edit-thumbnail" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setEditThumbnail(e.target.files[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {editThumbnail ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-700" />
                          <span className="text-sm font-medium text-green-700">{editThumbnail.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <Image className="w-5 h-5" />
                          <span className="text-sm">{presentation.thumbnail_url ? (t.replaceThumbnail || "Replace thumbnail") : (t.thumbnailLabel)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Handout */}
                  <div className="space-y-1.5">
                    <label htmlFor="edit-handout" className="block text-sm font-medium text-[#0F172A]">{t.handoutLabel}</label>
                    <div className={`file-dropzone relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${editHandout ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-[#2563EB] hover:bg-blue-50"}`}>
                      <input id="edit-handout" type="file" accept=".pdf" onChange={(e) => setEditHandout(e.target.files[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {editHandout ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-700" />
                          <span className="text-sm font-medium text-green-700">{editHandout.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                          <FileDown className="w-5 h-5" />
                          <span className="text-sm">{presentation.handout_url ? (t.replaceHandout || "Replace handout") : (t.handoutLabel)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 min-h-[44px] text-sm text-slate-700 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {t.saveChanges || "Save changes"}
                    </button>
                  </div>
                </div>
              )}

              <div role="status">
                {editSuccess && (
                  <p className="mt-4 flex items-center gap-2 text-sm text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4" aria-hidden="true" /> {t.changesSaved || "Changes saved!"}
                  </p>
                )}
              </div>


            </div>

            {/* Rating Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm">
              <h2 className="font-heading text-xl font-semibold text-[#0F172A] mb-4">
                {t.rateThis}
              </h2>

              <div className="flex items-center gap-4 mb-4">
                <StarRating
                  value={userRating}
                  onChange={handleRate}
                  readonly={!user || submittingRating}
                  size="lg"
                />
                {submittingRating && <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" aria-hidden="true" />}
                <span role="status">
                  {ratingSuccess && (
                    <span className="text-sm text-green-700 font-medium odometer-roll">
                      {t.ratingSaved}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <StarRating value={Math.round(presentation.avg_rating || 0)} readonly size="sm" />
                  <span className="font-semibold text-[#0F172A]">
                    {presentation.avg_rating ? presentation.avg_rating.toFixed(1) : "—"}
                  </span>
                </div>
                <span className="text-slate-500 text-sm">
                  {presentation.rating_count || 0} {t.ratingsCount}
                </span>
              </div>

              {!user && (
                <p className="text-sm text-slate-500 mt-3">
                  <Link to="/login" className="text-[#2563EB] hover:underline">{t.signIn}</Link> {t.toRate}
                </p>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8 shadow-sm">
              <h2 className="font-heading text-xl font-semibold text-[#0F172A] mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
                {t.discussion} ({comments.length})
              </h2>

              {/* Comment Form */}
              {user ? (
                <form onSubmit={handleComment} className="mb-8">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0 mt-1" aria-hidden="true">
                      <span className="text-white text-sm font-bold">
                        {(user.full_name || user.email || "U")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <label htmlFor="new-comment" className="sr-only">{lang === "de" ? "Kommentar schreiben" : "Write a comment"}</label>
                      <textarea
                        id="new-comment"
                        aria-describedby="new-comment-count"
                        maxLength={1000}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
                        placeholder={t.commentPlaceholder}
                        rows={3}
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white resize-none transition-all text-[#0F172A]"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span id="new-comment-count" className="text-xs text-slate-600">{newComment.length}/1000 {lang === "de" ? "Zeichen" : "characters"}</span>
                        <button
                          type="submit"
                          disabled={!newComment.trim() || submittingComment}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                        >
                          {submittingComment ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Send className="w-4 h-4" aria-hidden="true" />
                          )}
                          {t.comment}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                  <Link to="/login" className="text-[#2563EB] hover:underline font-medium">{t.signIn}</Link> {t.toComment}
                </div>
              )}

              {/* Comment List */}
              <div className="space-y-5">
                {comments.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">
                    {t.noComments}
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-medium text-sm text-[#0F172A]">
                            {c.user_name || t.anonymous}
                          </span>
                          {c.user_university && (
                            <span className="text-xs text-slate-500">{c.user_university}</span>
                          )}
                          <span className="text-xs text-slate-500 ml-auto">
                            {formatDate(c.created_date)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Metadata Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-heading text-base font-semibold text-[#0F172A] mb-4 pb-3 border-b border-slate-100">
                  {t.sourcesAndMeta}
                </h3>

                <div className="space-y-4">
                  {/* DOI */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                      {t.doiSource}
                    </label>
                    <DoiLink doi={presentation.doi} />
                    {presentation.paper_license && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        <span className="font-medium">{lang === "de" ? "Lizenz des Fachartikels:" : "Paper License:"}</span>{" "}
                        <span className="font-semibold text-[#0F172A]">{presentation.paper_license}</span>
                      </p>
                    )}
                  </div>

                  {/* Paper Title */}
                  {presentation.paper_title && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                        {t.originalPaper}
                      </label>
                      <p className="text-sm text-[#0F172A] leading-snug font-medium">
                        {presentation.paper_title}
                      </p>
                    </div>
                  )}

                  {/* Paper Authors */}
                  {paperAuthors && paperAuthors.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                        {lang === "de" ? "Autoren des Papers" : "Paper Authors"}
                      </label>
                      <div className={`text-sm text-[#0F172A] leading-relaxed ${!authorsExpanded ? "line-clamp-1" : ""}`}>
                        {paperAuthors.join(", ")}
                      </div>
                      {paperAuthors.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setAuthorsExpanded(v => !v)}
                          className="mt-1 text-xs text-[#2563EB] hover:underline"
                        >
                          {authorsExpanded
                            ? (lang === "de" ? "Weniger anzeigen" : "Show less")
                            : (lang === "de" ? "Alle anzeigen" : "Show all")}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Discipline */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                      {t.disciplineLabel}
                    </label>
                    <span className="text-sm text-[#0F172A]">{lang === "de" ? (disciplineLabelDE[presentation.discipline] || presentation.discipline) : presentation.discipline}</span>
                  </div>

                  {/* Published */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                      {lang === "de" ? "Veröffentlicht" : "Published"}
                    </label>
                    <span className="text-sm text-[#0F172A]">{formatDate(presentation.created_date)}</span>
                  </div>

                  {/* Language (detected from title) */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                      {lang === "de" ? "Sprache" : "Language"}
                    </label>
                    <span className="text-sm text-[#0F172A]">
                      {(() => {
                        const t = presentation.title || "";
                        const dePattern = /[äöüÄÖÜß]|(\bund\b|\bder\b|\bdie\b|\bdas\b|\bvon\b|\bfür\b|\beine?\b|\bist\b|\bim\b|\bam\b|\bmit\b)/;
                        return dePattern.test(t)
                          ? (lang === "de" ? "Deutsch" : "German")
                          : (lang === "de" ? "Englisch" : "English");
                      })()}
                    </span>
                  </div>

                  {/* Uploader / Author */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                      {lang === "de" ? "Hochgeladen von" : "Uploaded by"}
                    </label>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-[#0F172A] font-medium">{presentation.uploader_name || (lang === "de" ? "Anonym" : "Anonymous")}</span>
                      {presentation.uploader_university && (
                        <span className="text-xs text-slate-500">{presentation.uploader_university}</span>
                      )}
                      {presentation.authorship_verified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium mt-0.5">
                          <CheckCircle className="w-3 h-3" />
                          {lang === "de" ? "Autor verifiziert" : "Author verified"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* License */}
                  <div id="license">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                      {lang === "de" ? "Lizenz der Präsentation" : "Presentation License"}
                    </label>
                    {isOwner ? (
                      <SidebarLicenseEditor
                        presentation={presentation}
                        lang={lang}
                        licenses={lang === "de" ? LICENSES_DE : LICENSES_EN}
                        onSaved={(newLicense) => setPresentation((p) => ({ ...p, license: newLicense }))}
                      />
                    ) : (
                      presentation.license ? (
                        <LicenseInfoPanel
                          license={presentation.license}
                          uploaderName={presentation.uploader_name}
                          uploadDate={presentation.created_date}
                        />
                      ) : (
                        <span className="text-xs text-slate-500 italic">{lang === "de" ? "Keine Lizenz angegeben" : "No license specified"}</span>
                      )
                    )}
                  </div>

                  {/* Paper Type */}
                  {presentation.paper_type && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                        {t.paperTypeLabel || "Paper Type"}
                      </label>
                      <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">{presentation.paper_type}</span>
                    </div>
                  )}

                  {/* Extra Papers */}
                  {presentation.extra_papers && presentation.extra_papers.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                        {t.additionalPapers || "Additional Papers"}
                      </label>
                      <div className="space-y-2">
                        {presentation.extra_papers.map((ep, i) => (
                          <div key={i} className="text-sm">
                            <p className="font-medium text-[#0F172A] text-xs leading-snug mb-0.5">{ep.title}</p>
                            <DoiLink doi={ep.doi} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video */}
                  {presentation.video_url && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                        {t.videoPresentation}
                      </label>
                      <a
                        href={presentation.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[#2563EB] hover:underline min-h-[44px]"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {t.openVideo}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-[#1E293B] text-white rounded-xl p-6 shadow-sm">
                <h3 className="font-heading text-base font-semibold mb-4">{t.statistics}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {presentation.downloads || 0}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">{t.downloads}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {presentation.avg_rating ? presentation.avg_rating.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">{t.avgRating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {presentation.rating_count || 0}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">{t.ratingsCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {comments.length}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">{t.commentsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}