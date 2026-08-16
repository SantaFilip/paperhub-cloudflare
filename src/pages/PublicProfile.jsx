import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useLang, disciplineLabelDE } from "@/lib/LanguageContext";
import { BookOpen, Download, ArrowLeft, GraduationCap, CheckCircle, FileDown, EyeOff, Star } from "lucide-react";

export default function PublicProfile() {
  const { lang } = useLang();
  const { identifier } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicProfile", identifier],
    queryFn: async () => {
      const res = await api.functions.invoke("getPublicProfile", { identifier });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!identifier,
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="bg-[#1E293B] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex items-start gap-5 animate-pulse">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-7 w-56 bg-white/10 rounded" />
              <div className="h-4 w-40 bg-white/10 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="h-12 bg-white/5 rounded" />
            <div className="h-12 bg-white/5 rounded" />
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-3">
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
      <h2 className="font-heading text-2xl text-[#0F172A] mb-2">{lang === "de" ? "Profil konnte nicht geladen werden" : "Profile could not be loaded"}</h2>
      <Link to="/browse" className="text-[#2563EB] hover:underline">{lang === "de" ? "Zurück zur Übersicht" : "Back to browse"}</Link>
    </div>
  );

  if (!data?.found) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
      <h2 className="font-heading text-2xl text-[#0F172A] mb-2">{lang === "de" ? "Profil nicht gefunden" : "Profile not found"}</h2>
      <Link to="/browse" className="text-[#2563EB] hover:underline">{lang === "de" ? "Zurück zur Übersicht" : "Back to browse"}</Link>
    </div>
  );

  if (data.private) return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="bg-[#1E293B] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#2563EB] flex items-center justify-center text-2xl font-bold font-heading">
              {(data.name || "U")[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-semibold">{data.name}</h1>
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
                <EyeOff className="w-4 h-4" />
                {lang === "de" ? "Dieses Profil ist privat." : "This profile is private."}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          {lang === "de" ? "Zurück zur Übersicht" : "Back to browse"}
        </Link>
      </div>
    </div>
  );

  const initial = (data.name || "U")[0].toUpperCase();
  const roleLabel = data.role === "researcher"
    ? (lang === "de" ? "Forschende:r" : "Researcher")
    : data.role === "lecturer"
    ? (lang === "de" ? "Dozierende:r" : "Lecturer")
    : (lang === "de" ? "Studierende:r" : "Student");

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="bg-[#1E293B] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 text-2xl lg:text-3xl font-bold font-heading">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-heading text-2xl lg:text-3xl font-semibold mb-1 break-words">{data.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {data.university && (
                  <span className="text-slate-400 text-sm flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> {data.university}
                  </span>
                )}
                {data.role && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-600/30 text-blue-300 font-medium">
                    {roleLabel}
                  </span>
                )}
                {data.orcid_id && (
                  <a href={`https://orcid.org/${data.orcid_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-mono">
                    <CheckCircle className="w-3 h-3" /> ORCID: {data.orcid_id}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="text-center">
              <p className="font-heading text-2xl lg:text-3xl font-bold text-white tabular-nums">{data.stats.count}</p>
              <p className="text-xs text-slate-400 mt-0.5">{lang === "de" ? "Veröffentlichungen" : "Publications"}</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-2xl lg:text-3xl font-bold text-white tabular-nums">{data.stats.totalDownloads}</p>
              <p className="text-xs text-slate-400 mt-0.5">{lang === "de" ? "Downloads" : "Downloads"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-[#0F172A] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#2563EB]" />
            {lang === "de" ? "Veröffentlichte Präsentationen" : "Published presentations"}
          </h2>
          <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0F172A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {lang === "de" ? "Zurück" : "Back"}
          </Link>
        </div>

        {data.presentations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{lang === "de" ? "Noch keine Veröffentlichungen." : "No publications yet."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.presentations.map((p) => (
              <Link key={p.id} to={`/presentation/${p.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex">
                <div className="hidden sm:flex flex-shrink-0 items-center p-3">
                  <div className="rounded-lg overflow-hidden bg-slate-100 border border-slate-200" style={{ width: "160px", aspectRatio: "16/9" }}>
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-4 min-w-0">
                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {lang === "de" ? (disciplineLabelDE[p.discipline] || p.discipline) : p.discipline}
                  </span>
                  <h3 className="font-heading font-semibold text-[#0F172A] mt-2 mb-1 line-clamp-1">{p.title}</h3>
                  {p.paper_title && (
                    <p className="text-xs text-slate-500 line-clamp-1">{lang === "de" ? "Paper:" : "Paper:"} {p.paper_title}</p>
                  )}
                  {p.doi && (
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">DOI: {p.doi}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {p.downloads}</span>
                    {p.has_handout && (
                      <span className="flex items-center gap-1 text-[#2563EB]"><FileDown className="w-3 h-3" /> {lang === "de" ? "Handout" : "Handout"}</span>
                    )}
                    {p.rating_count > 0 && (
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> {p.avg_rating.toFixed(1)} ({p.rating_count})</span>
                    )}
                    <span className="ml-auto">{formatDate(p.created_date)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}