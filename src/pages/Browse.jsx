import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import PresentationCard from "@/components/PresentationCard";
import { useLang, disciplineLabelDE, paperTypeLabelDE } from "@/lib/LanguageContext";
import { Search, ChevronDown, Loader2, BookOpen } from "lucide-react";

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

export default function Browse() {
  const { t, lang } = useLang();
  const [selectedDiscipline, setSelectedDiscipline] = useState("all");
  const [selectedPaperType, setSelectedPaperType] = useState("all");
  const [sortBy, setSortBy] = useState("created_date_desc");
  const [searchQuery, setSearchQuery] = useState("");

  const SORT_OPTIONS = [
    { value: "created_date_desc", label: t.newest },
    { value: "avg_rating_desc", label: t.topRated },
    { value: "downloads_desc", label: t.mostDownloaded },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearchQuery(q);
  }, []);

  const { data: presentations = [], isLoading: loading } = useQuery({
    queryKey: ["presentations", "browse"],
    queryFn: () => api.entities.Presentations.list("-created_date", 100),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = presentations
    .filter((p) => {
      if (selectedDiscipline !== "all" && p.discipline !== selectedDiscipline) return false;
      if (selectedPaperType !== "all" && p.paper_type !== selectedPaperType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title?.toLowerCase().includes(q) ||
          p.doi?.toLowerCase().includes(q) ||
          p.discipline?.toLowerCase().includes(q) ||
          p.tags?.toLowerCase().includes(q) ||
          p.paper_title?.toLowerCase().includes(q) ||
          p.uploader_name?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "avg_rating_desc") return (b.avg_rating || 0) - (a.avg_rating || 0);
      if (sortBy === "downloads_desc") return (b.downloads || 0) - (a.downloads || 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      {/* Hero Banner */}
      <div className="bg-[#1E293B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-blue-400 text-sm font-medium tracking-widest uppercase mb-3">
              {t.browseSubtitle}
            </p>
            <h1 className="font-heading text-3xl lg:text-4xl font-semibold leading-tight mb-4">
              {t.browseHeading}
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              {t.browseDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: search bar on top row */}
          <div className="relative py-2 sm:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white transition-all"
            />
          </div>

          {/* Filters row */}
          <div className="flex items-end gap-2 py-2">
            {/* Search — desktop only */}
            <div className="relative flex-[2] hidden sm:block">
              <label className="block text-xs font-medium text-slate-400 mb-1">{lang === "de" ? "Suche" : "Search"}</label>
              <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white transition-all"
              />
            </div>

            {/* Discipline Filter */}
            <div className="relative flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-400 mb-1 truncate">{lang === "de" ? "Fachgebiet" : "Discipline"}</label>
              <select
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="w-full appearance-none pl-2 pr-6 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] cursor-pointer truncate"
              >
                <option value="all">{lang === "de" ? "Alle" : "All"}</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>{lang === "de" ? disciplineLabelDE[d] : d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 bottom-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Paper Type Filter */}
            <div className="relative flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-400 mb-1 truncate">{lang === "de" ? "Papertyp" : "Type"}</label>
              <select
                value={selectedPaperType}
                onChange={(e) => setSelectedPaperType(e.target.value)}
                className="w-full appearance-none pl-2 pr-6 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] cursor-pointer"
              >
                <option value="all">{lang === "de" ? "Alle" : "All"}</option>
                {PAPER_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{lang === "de" ? paperTypeLabelDE[pt] : pt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 bottom-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-400 mb-1 truncate">{lang === "de" ? "Sortierung" : "Sort"}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none pl-2 pr-6 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A] cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 bottom-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Count — slide icon + number */}
            <div className="flex flex-col items-center justify-end pb-1 flex-shrink-0 gap-1">
              <svg width="30" height="24" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden sm:block">
                <rect x="0.5" y="0.5" width="19" height="13" rx="1.5" stroke="#64748b" strokeWidth="1" fill="white"/>
                <rect x="3" y="3" width="8" height="1.5" rx="0.75" fill="#64748b"/>
                <rect x="3" y="6" width="12" height="1.5" rx="0.75" fill="#64748b"/>
                <rect x="3" y="9" width="6" height="1.5" rx="0.75" fill="#64748b"/>
                <line x1="10" y1="14" x2="10" y2="16" stroke="#64748b" strokeWidth="1"/>
                <line x1="7" y1="15.5" x2="13" y2="15.5" stroke="#64748b" strokeWidth="1"/>
              </svg>
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:hidden">
                <rect x="0.5" y="0.5" width="19" height="13" rx="1.5" stroke="#64748b" strokeWidth="1" fill="white"/>
                <rect x="3" y="3" width="8" height="1.5" rx="0.75" fill="#64748b"/>
                <rect x="3" y="6" width="12" height="1.5" rx="0.75" fill="#64748b"/>
                <rect x="3" y="9" width="6" height="1.5" rx="0.75" fill="#64748b"/>
                <line x1="10" y1="14" x2="10" y2="16" stroke="#64748b" strokeWidth="1"/>
                <line x1="7" y1="15.5" x2="13" y2="15.5" stroke="#64748b" strokeWidth="1"/>
              </svg>
              <span className="text-base font-bold text-slate-700 tabular-nums">{filtered.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-heading text-xl text-[#0F172A] mb-2">{t.noneFound}</h3>
            <p className="text-slate-500 max-w-sm">
              {presentations.length === 0 ? t.noneYet : t.noResults}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p, i) => (
              <PresentationCard key={p.id} presentation={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}