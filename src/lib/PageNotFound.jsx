import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

export default function PageNotFound() {
  const location = useLocation();
  const { lang } = useLang();
  const pageName = location.pathname.substring(1);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen flex items-center justify-center p-6 bg-slate-50 focus:outline-none"
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-7xl font-light text-slate-500" aria-hidden="true">404</p>
          <div className="h-0.5 w-16 bg-slate-300 mx-auto" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-medium text-slate-800">
            {lang === "de" ? "Seite nicht gefunden (Fehler 404)" : "Page not found (error 404)"}
          </h1>
          <p className="text-slate-700 leading-relaxed">
            {lang === "de" ? "Die Seite " : "The page "}
            <span className="font-medium">„{pageName}“</span>
            {lang === "de" ? " existiert nicht." : " does not exist."}
          </p>
        </div>
        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 min-h-[44px] text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" aria-hidden="true" />
            {lang === "de" ? "Zur Startseite" : "Go to home page"}
          </Link>
        </div>
      </div>
    </main>
  );
}
