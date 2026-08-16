import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, ChevronRight, Tag } from "lucide-react";
import StarRating from "./StarRating";
import LicenseBadge from "./LicenseBadge";
import { useLang, disciplineLabelDE } from "@/lib/LanguageContext";

function PaperTitle({ title, expanded, onExpand }) {
  const clipRef = useRef(null);
  const [displayText, setDisplayText] = useState(title);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    if (expanded) {
      setDisplayText(title);
      setIsClamped(false);
      return;
    }

    const el = clipRef.current;
    if (!el) return;

    // Render full text with -webkit-line-clamp: 2
    el.textContent = title;
    
    // Check if text overflows 2 lines
    const fullHeight = el.scrollHeight;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * 1.95;

    if (fullHeight <= maxHeight) {
      // Text fits in 2 lines, no clamping needed
      setDisplayText(title);
      setIsClamped(false);
      return;
    }

    // Text overflows, binary search to find cutoff (including space for •••)
    setIsClamped(true);
    let lo = 0, hi = title.length;
    
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      el.textContent = title.slice(0, mid) + '•••';
      if (el.scrollHeight <= maxHeight) lo = mid;
      else hi = mid;
    }
    
    setDisplayText(title.slice(0, lo).trimEnd());
  }, [title, expanded]);

  if (expanded) {
    return (
      <div className="text-sm text-slate-500 mb-2">
        <span className="text-slate-400">Paper: </span>
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-slate-500 mb-2">
      <span className="text-slate-400">Paper: </span>
      <span style={{ display: "inline" }}>{displayText}</span>
      {isClamped && (
        <button
          className="inline text-[#2563EB] hover:text-blue-700 font-semibold text-xs ml-0.5"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExpand(); }}
          title="Expand"
        >
          •••
        </button>
      )}
      <span ref={clipRef} style={{ display: "none", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} />
    </div>
  );
}

export default function PresentationCard({ presentation, index = 0 }) {
  const { lang } = useLang();
  const [hovered, setHovered] = useState(false);
  const [paperTitleExpanded, setPaperTitleExpanded] = useState(false);

  const disciplines = {
    "Machine Learning": "bg-violet-100 text-violet-800",
    "Computer Science": "bg-cyan-100 text-cyan-800",
    "Physics": "bg-blue-100 text-blue-800",
    "Chemistry": "bg-amber-100 text-amber-800",
    "Biology": "bg-green-100 text-green-800",
    "Mathematics": "bg-indigo-100 text-indigo-800",
    "Medicine": "bg-red-100 text-red-800",
    "Engineering": "bg-orange-100 text-orange-800",
    "Social Sciences": "bg-pink-100 text-pink-800",
    "Economics": "bg-lime-100 text-lime-800",
    "Psychology": "bg-fuchsia-100 text-fuchsia-800",
    "Neuroscience": "bg-purple-100 text-purple-800",
    "Environmental Sciences": "bg-teal-100 text-teal-800",
    "Earth Sciences": "bg-emerald-100 text-emerald-800",
    "Materials Science": "bg-yellow-100 text-yellow-800",
    "Astronomy & Astrophysics": "bg-sky-100 text-sky-800",
    "Philosophy": "bg-stone-100 text-stone-700",
    "History & Humanities": "bg-rose-100 text-rose-800",
    "Law": "bg-slate-200 text-slate-800",
    "Public Health": "bg-cyan-50 text-cyan-700",
    "Linguistics": "bg-violet-50 text-violet-700",
    "Other": "bg-gray-100 text-gray-700",
  };

  const disciplineClass = disciplines[presentation.discipline] || "bg-slate-100 text-slate-700";
  const tags = presentation.tags
    ? presentation.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <Link
      to={`/presentation/${presentation.id}`}
      className="block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className={`card-enter relative flex bg-white border rounded-xl overflow-hidden transition-all duration-300 ${
          hovered
            ? "shadow-xl border-slate-300 -translate-y-0.5"
            : "shadow-sm border-slate-200"
        }`}
      >
        {/* Left accent bar */}
        <div
          className={`w-1.5 flex-shrink-0 transition-all duration-300 ${
            hovered ? "bg-[#2563EB]" : "bg-slate-200"
          }`}
        />

        {/* Main content */}
        <div className="flex-1 p-5 lg:p-6 min-w-0 flex flex-col">
          {/* Discipline badge + License badge */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${disciplineClass}`}>
              {lang === "de" ? (disciplineLabelDE[presentation.discipline] || presentation.discipline) : presentation.discipline}
            </span>
            {presentation.license && <LicenseBadge license={presentation.license} />}
          </div>

          {/* Title — full width above thumbnail on mobile */}
          <h2 className="font-heading text-lg lg:text-xl font-semibold text-[#0F172A] leading-snug mb-3">
            {presentation.title}
          </h2>

          {/* Thumbnail (mobile only, full width between title and paper title) */}
          {presentation.thumbnail_url ? (
            <div className="sm:hidden rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-3 w-full" style={{ aspectRatio: "16/9", maxHeight: "140px" }}>
              <img src={presentation.thumbnail_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="sm:hidden rounded-lg bg-slate-100 border border-slate-200 mb-3 w-full flex items-center justify-center" style={{ aspectRatio: "16/9", maxHeight: "140px" }}>
              <span className="text-xs text-slate-400 font-medium">No thumbnail</span>
            </div>
          )}

          {/* Paper title — full width below thumbnail on mobile */}
          {presentation.paper_title && (
            <PaperTitle title={presentation.paper_title} expanded={paperTitleExpanded} onExpand={() => setPaperTitleExpanded(true)} />
          )}

          {/* DOI */}
          {presentation.doi && (
            <p className="text-xs text-slate-400 font-mono mb-3 truncate">
              DOI: {presentation.doi}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <Tag className="w-3 h-3 text-slate-400" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-auto flex-wrap">
            <StarRating value={Math.round(presentation.avg_rating || 0)} readonly size="sm" />
            <span className="text-xs text-slate-500">
              {presentation.avg_rating ? presentation.avg_rating.toFixed(1) : ""}
              {presentation.rating_count ? ` (${presentation.rating_count})` : ""}
            </span>
            {presentation.has_nd_restriction && !presentation.is_author ? (
              <span className="ml-2 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                🚫 ND
              </span>
            ) : !presentation.file_url ? (
              <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                {lang === "de" ? "⚠ Nur Metadaten" : "⚠ Metadata only"}
              </span>
            ) : (
              <div className="flex items-center gap-1 text-slate-500 ml-2">
                <Download className="w-3.5 h-3.5" />
                <span className={`text-sm tabular-nums transition-all duration-300 ${hovered ? "text-[#2563EB] font-medium" : ""}`}>
                  {hovered ? (presentation.downloads || 0) + 1 : (presentation.downloads || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail — desktop only, right side, 16:9 with padding */}
        <div className="hidden sm:flex flex-shrink-0 items-center pr-4 py-4">
          <div className="rounded-lg overflow-hidden bg-slate-100 border border-slate-200" style={{ width: "340px", aspectRatio: "16/9" }}>
            {presentation.thumbnail_url ? (
              <img src={presentation.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs text-slate-400 font-medium text-center px-2">No thumbnail</span>
              </div>
            )}
          </div>
        </div>

        {/* Right arrow overlay on thumbnail */}
        <div className={`hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 items-center justify-center w-7 h-7 rounded-full bg-white/80 transition-all duration-300 ${hovered ? "opacity-100" : "opacity-0"}`}>
          <ChevronRight className="w-4 h-4 text-[#2563EB]" />
        </div>
      </article>
    </Link>
  );
}