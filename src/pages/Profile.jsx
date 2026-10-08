import { useState, useEffect, useRef } from "react";
import { api } from "@/api/client";
import { Link, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import StarRating from "@/components/StarRating";
import {
  Award, BookOpen, Download, Loader2,
  LogOut, GraduationCap, Beaker, TrendingUp, Edit3, Save, X, Link2, CheckCircle, Trash2, Shield, AlertCircle
} from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { hidesThumbnail } from "@/lib/licenseUtils";

const LICENSES = [
  "CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0",
  "CC BY-NC-SA 4.0", "CC BY-ND 4.0", "CC BY-NC-ND 4.0", "All Rights Reserved",
];

const slugify = (s) => (s || "").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);

function PresentationRowActions({ presentation, lang, onLicenseUpdated, onDeleted }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmButtonRef = useRef(null);
  // Move focus into the confirmation so keyboard users land on it.
  useEffect(() => { if (confirmDelete) confirmButtonRef.current?.focus(); }, [confirmDelete]);
  const [deleting, setDeleting] = useState(false);
  const deleteButtonRef = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = deleteButtonRef.current.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
    setConfirmDelete(true);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleting(true);
    try {
      await api.entities.Presentations.delete(presentation.id);
      onDeleted(presentation.id);
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full py-2 px-1 flex-shrink-0">
      {/* License — navigates to detail page at license section */}
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/presentation/${presentation.id}`); setTimeout(() => document.getElementById("license")?.scrollIntoView({ behavior: "smooth" }), 400); }}
        type="button"
        title={lang === "de" ? "Lizenz in Detailansicht bearbeiten" : "Edit license in detail view"}
        aria-label={lang === "de" ? `Lizenz von „${presentation.title}“ bearbeiten` : `Edit license of “${presentation.title}”`}
        className="p-1.5 rounded-md text-slate-600 hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
      >
        <Shield className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Delete */}
      <button
        ref={deleteButtonRef}
        onClick={handleDeleteClick}
        type="button"
        title={lang === "de" ? "Löschen" : "Delete"}
        aria-label={lang === "de" ? `„${presentation.title}“ löschen` : `Delete “${presentation.title}”`}
        aria-expanded={confirmDelete}
        className="p-1.5 rounded-md text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Delete confirm panel — anchored to button position */}
      {confirmDelete && (
        <div
          role="alertdialog"
          aria-labelledby={`delete-title-${presentation.id}`}
          aria-describedby={`delete-desc-${presentation.id}`}
          onKeyDown={(e) => { if (e.key === "Escape") { setConfirmDelete(false); deleteButtonRef.current?.focus(); } }}
          className="fixed z-50 w-64 bg-white border border-red-200 rounded-xl shadow-xl p-4 space-y-3"
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          <p id={`delete-title-${presentation.id}`} className="text-xs font-semibold text-red-700">{lang === "de" ? "Wirklich löschen?" : "Really delete?"}</p>
          <p id={`delete-desc-${presentation.id}`} className="text-xs text-slate-600">{lang === "de" ? "Diese Aktion kann nicht rückgängig gemacht werden." : "This action cannot be undone."}</p>
          <div className="flex gap-2">
            <button
              type="button"
              ref={confirmButtonRef}
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />}
              {lang === "de" ? "Löschen" : "Delete"}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); deleteButtonRef.current?.focus(); }}
              aria-label={lang === "de" ? "Abbrechen" : "Cancel"}
              className="px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnimatedCounter({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const startValue = useRef(0);

  useEffect(() => {
    if (value === 0) return;
    startValue.current = display;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startValue.current + (value - startValue.current) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span className="odometer-roll">{display}</span>;
}

export default function Profile() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ university: "", role: "student", orcid_id: "", username: "" });
  const [saving, setSaving] = useState(false);
  const [profileVisibleQuick, setProfileVisibleQuick] = useState(true);
  const [profileUrlCopied, setProfileUrlCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const u = await api.auth.me().catch(() => { window.location.href = "/login"; return null; });
    if (!u) return;
    setUser(u);
    setEditForm({ university: u.university || "", role: u.role || "student", orcid_id: u.orcid_id || "", username: u.username || slugify(u.full_name || "") });
    setProfileVisibleQuick(u.profile_visible !== false);
    const pres = await api.entities.Presentations.filter({ uploader_id: u.id }, "-created_date", 50);
    setPresentations(pres);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const normalized = {
      ...editForm,
      username: slugify(editForm.username),
    };
    await api.auth.updateMe(normalized);
    setUser((u) => ({ ...u, ...normalized }));
    setEditForm(normalized);
    setEditing(false);
    setSaving(false);
  };

  const handleLogout = () => api.auth.logout("/browse");

  const useRealNameAsUsername = async () => {
    const slug = slugify(user?.full_name || "");
    if (!slug) return;
    setSaving(true);
    try {
      await api.auth.updateMe({ username: slug });
      setUser((u) => ({ ...u, username: slug }));
    } catch {}
    setSaving(false);
  };

  const handleLicenseUpdated = (id, license) => {
    setPresentations((prev) => prev.map((p) => p.id === id ? { ...p, license } : p));
  };
  const handleDeleted = (id) => {
    setPresentations((prev) => prev.filter((p) => p.id !== id));
  };

  const totalDownloads = presentations.reduce((s, p) => s + (p.downloads || 0), 0);
  const avgRating =
    presentations.length > 0
      ? presentations.reduce((s, p) => s + (p.avg_rating || 0), 0) / presentations.length
      : 0;

  const publicProfileUrl = user?.username ? `https://paperhub.io/u/${user.username}` : null;

  // Chart data: top 5 by downloads
  const chartData = [...presentations]
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.title?.length > 18 ? p.title.slice(0, 18) + "…" : p.title,
      fullTitle: p.title,
      downloads: p.downloads || 0,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" aria-hidden="true" /><span role="status" className="sr-only">{lang === "de" ? "Wird geladen…" : "Loading…"}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      {/* Scholar Header */}
      <div className="bg-[#1E293B] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            {/* Avatar & Info */}
            <div className="flex items-start gap-5 flex-1">
              <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 text-2xl lg:text-3xl font-bold font-heading">
                {(user?.full_name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="font-heading text-2xl lg:text-3xl font-semibold">
                    {user?.full_name || "Scholar"}
                  </h1>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${
                    user?.role === "researcher"
                      ? "bg-[#B45309]/20 text-amber-300"
                      : user?.role === "lecturer"
                      ? "bg-purple-600/30 text-purple-300"
                      : "bg-blue-600/30 text-blue-300"
                  }`}>
                    {user?.role === "researcher"
                      ? <><Beaker className="w-3 h-3" /> {t.roleResearcher}</>
                      : user?.role === "lecturer"
                      ? <><BookOpen className="w-3 h-3" /> {t.roleLecturer || "Dozierender"}</>
                      : <><GraduationCap className="w-3 h-3" /> {t.roleStudent}</>
                    }
                  </span>
                </div>
                <p className="text-slate-300 text-sm mb-0.5">{user?.email}</p>
                {editing ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="text"
                      aria-label={lang === "de" ? "Universität / Institution" : "University / institution"}
                      autoComplete="organization"
                      value={editForm.university}
                      onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))}
                      placeholder={t.universityPlaceholder}
                      className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB] w-full max-w-xs"
                    />
                    <select
                      aria-label={lang === "de" ? "Rolle" : "Role"}
                      value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                      className="px-3 py-1.5 text-sm bg-white border border-white/20 rounded-lg text-slate-900 focus:outline-none w-full max-w-xs"
                    >
                      <option value="student">{t.roleStudent}</option>
                      <option value="researcher">{t.roleResearcher}</option>
                      <option value="lecturer">{t.roleLecturer || "Dozierender"}</option>
                    </select>
                    <input
                      type="text"
                      aria-label="ORCID iD"
                      value={editForm.orcid_id}
                      onChange={(e) => setEditForm((f) => ({ ...f, orcid_id: e.target.value.replace(/https?:\/\/orcid\.org\//i, "").trim() }))}
                      placeholder="ORCID: 0000-0001-2345-6789"
                      className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono w-full max-w-xs"
                    />
                    <input
                      type="text"
                      aria-label={lang === "de" ? "Öffentlicher Nutzername" : "Public username"}
                      autoComplete="username"
                      value={editForm.username}
                      onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                      placeholder={lang === "de" ? "Öffentlicher Nutzername (z.B. max-mustermann)" : "Public username (e.g. john-doe)"}
                      className="px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2563EB] w-full max-w-xs"
                    />
                    <p className="text-xs text-slate-300 max-w-xs">
                      {lang === "de"
                        ? "Verwende deinen echten Namen als öffentlichen Nutzernamen, damit Anmeldename und URL identisch sind (z.B. Filip_Sudermann)."
                        : "Use your real name as your public username so your login name and URL match (e.g. Filip_Sudermann)."}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 text-xs bg-[#2563EB] text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        {t.saveChanges}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-3 py-1.5 text-xs border border-white/20 text-white rounded-lg hover:bg-white/10 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> {t.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {user?.university && (
                      <p className="text-slate-300 text-sm">{user.university}</p>
                    )}
                    {user?.orcid_id && (
                      <a
                        href={`https://orcid.org/${user.orcid_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-mono"
                      >
                        <CheckCircle className="w-3 h-3" />
                        ORCID: {user.orcid_id}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      aria-label={lang === "de" ? "Profil bearbeiten" : "Edit profile"}
                      className="p-1.5 -m-1.5 text-slate-300 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Knowledge Points */}
            <div className="text-center lg:text-right">
              <div className="inline-flex flex-col items-center lg:items-end">
                <div className="flex items-center gap-2 mb-0.5">
                  <Award className="w-5 h-5 text-[#B45309]" />
                  <span className="text-xs text-slate-300 uppercase tracking-wider">{t.knowledgePoints}</span>
                </div>
                <p className="font-heading text-4xl lg:text-5xl font-bold text-white tabular-nums">
                  <AnimatedCounter value={user?.points || 0} />
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="text-center">
              <p className="font-heading text-2xl lg:text-3xl font-bold text-white tabular-nums">
                {presentations.length}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">{t.publications}</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-2xl lg:text-3xl font-bold text-white tabular-nums">
                {totalDownloads}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">{t.downloads}</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-2xl lg:text-3xl font-bold text-white tabular-nums">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">{t.avgRating}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Performance Chart */}
        {chartData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-[#2563EB]" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold text-[#0F172A]">
                {t.performanceOverview}
              </h2>
            </div>
            {/* The chart is visual only; the table carries the same numbers for screen readers (WCAG 1.1.1). */}
            <table className="sr-only">
              <caption>{t.performanceOverview}</caption>
              <thead><tr><th scope="col">{lang === "de" ? "Präsentation" : "Presentation"}</th><th scope="col">Downloads</th></tr></thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={i}><td>{row.fullTitle}</td><td>{row.downloads}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="h-52" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1E293B",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "rgba(37,99,235,0.07)" }}
                    formatter={(value) => [value, lang === "de" ? "Downloads" : "Downloads"]}
                  />
                  <Bar dataKey="downloads" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#2563EB" : "#93c5fd"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Presentations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2563EB]" />
              {t.myPublications}
            </h2>
            <Link
              to="/upload"
              className="text-sm text-[#2563EB] hover:underline font-medium"
            >
              {t.addNew}
            </Link>
          </div>

          {presentations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <BookOpen className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">
                {t.noPublications}
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E293B] text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
              >
                {t.uploadFirst}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {presentations.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex relative">
                  {/* Text content — clickable area */}
                  <Link to={`/presentation/${p.id}`} className="flex-1 p-4 min-w-0 block">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      {p.discipline}
                    </span>
                    <h3 className="font-heading font-semibold text-[#0F172A] mt-2 mb-1 line-clamp-1">
                      {p.title}
                    </h3>
                    {p.doi && (
                      <p className="text-xs text-slate-500 font-mono">DOI: {p.doi}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Download className="w-3.5 h-3.5" />
                        <span className="tabular-nums font-medium">{p.downloads || 0}</span>
                      </div>
                      <StarRating value={Math.round(p.avg_rating || 0)} readonly size="sm" />
                      <span className="text-xs text-slate-500">
                        {p.avg_rating ? p.avg_rating.toFixed(1) : "—"}
                        {p.rating_count ? ` (${p.rating_count})` : ""}
                      </span>
                    </div>
                  </Link>
                  {/* Actions — outside the link */}
                  <div className="flex flex-col justify-between pr-2 py-2 self-stretch">
                    <PresentationRowActions
                      presentation={p}
                      lang={lang}
                      onLicenseUpdated={handleLicenseUpdated}
                      onDeleted={handleDeleted}
                    />
                  </div>
                  {/* Thumbnail */}
                  <div className="hidden sm:flex flex-shrink-0 items-center py-3 pr-1">
                    <div className="rounded-lg overflow-hidden bg-slate-100 border border-slate-200" style={{ width: "180px", aspectRatio: "16/9" }}>
                      {p.thumbnail_url && !hidesThumbnail(p.license) ? (
                        <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-slate-500 font-medium text-center px-2">{t.noThumbnail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Profile */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-[#2563EB]" />
            <h2 className="font-heading text-lg font-semibold text-[#0F172A]">
              {lang === "de" ? "Öffentliches Profil" : "Public Profile"}
            </h2>
          </div>
          {publicProfileUrl ? (
            <>
              <p className="text-sm text-slate-500 mb-3">
                {lang === "de"
                  ? `Deine URL: ${publicProfileUrl}. Diese URL kann nicht bearbeitet werden.`
                  : `Your URL: ${publicProfileUrl}. This URL cannot be edited.`}
              </p>
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
                <span className="text-xs text-slate-500 font-mono truncate flex-1">
                  {publicProfileUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(publicProfileUrl).catch(() => {});
                    setProfileUrlCopied(true);
                    setTimeout(() => setProfileUrlCopied(false), 2000);
                  }}
                  aria-live="polite"
                  className="text-xs text-[#1D4ED8] hover:underline font-medium flex items-center gap-1 flex-shrink-0 min-h-[24px]"
                >
                  {profileUrlCopied
                    ? <><CheckCircle className="w-3 h-3" /> {lang === "de" ? "Kopiert" : "Copied"}</>
                    : <><Link2 className="w-3 h-3" /> {lang === "de" ? "Link kopieren" : "Copy link"}</>}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-amber-800">
                  {lang === "de"
                    ? `Verwende deinen echten Namen (${user?.full_name || "—"}) als öffentlichen Nutzernamen, damit Anmeldename und URL übereinstimmen.`
                    : `Use your real name (${user?.full_name || "—"}) as your public username so your login name and URL match.`}
                </p>
                {user?.full_name && (
                  <button
                    type="button"
                    onClick={useRealNameAsUsername}
                    disabled={saving}
                    className="mt-2 text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-1"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {lang === "de" ? "Echten Namen als Nutzernamen übernehmen" : "Use my real name as username"}
                  </button>
                )}
              </div>
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profileVisibleQuick}
              onChange={async (e) => {
                const val = e.target.checked;
                setProfileVisibleQuick(val);
                await api.auth.updateMe({ profile_visible: val }).catch(() => setProfileVisibleQuick(!val));
                setUser((u) => ({ ...u, profile_visible: val }));
              }}
              className="mt-0.5 w-5 h-5 rounded border-slate-400 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0"
            />
            <div>
              <span className="text-sm font-medium text-[#0F172A]">
                {lang === "de" ? "Profil öffentlich sichtbar" : "Profile publicly visible"}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                {profileVisibleQuick
                  ? (lang === "de" ? "Jeder kann dein Profil und deine Veröffentlichungen sehen." : "Anyone can view your profile and publications.")
                  : (lang === "de" ? "Dein Profil ist nur für dich sichtbar." : "Your profile is only visible to you.")}
              </p>
            </div>
          </label>
        </div>

        {/* Logout */}
        <div className="border-t border-slate-200 pt-6 flex justify-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}