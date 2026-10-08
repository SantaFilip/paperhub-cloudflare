import { useLang } from "@/lib/LanguageContext";

// First focusable element on every page: lets keyboard and screen-reader users
// jump past the navigation straight to the page content (WCAG 2.4.1).
export default function SkipLink({ target = "main-content" }) {
  const { lang } = useLang();
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 focus:bg-[#1E293B] focus:text-white focus:text-sm focus:font-medium focus:rounded-lg focus:shadow-lg"
    >
      {lang === "de" ? "Zum Inhalt springen" : "Skip to main content"}
    </a>
  );
}
