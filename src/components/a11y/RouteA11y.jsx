import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/lib/LanguageContext";

const SITE = "PaperHub";

// Page titles per route (WCAG 2.4.2). Pages with dynamic content, such as a
// presentation's detail page, refine this with usePageTitle.
const TITLES = [
  [/^\/$/, { de: "Wissenschaftliche Präsentationen teilen", en: "Share scientific presentations" }],
  [/^\/browse/, { de: "Präsentationen entdecken", en: "Discover presentations" }],
  [/^\/presentation\//, { de: "Präsentation", en: "Presentation" }],
  [/^\/upload/, { de: "Präsentation hochladen", en: "Upload presentation" }],
  [/^\/profile/, { de: "Mein Profil", en: "My profile" }],
  [/^\/u\//, { de: "Profil", en: "Profile" }],
  [/^\/login/, { de: "Anmelden", en: "Sign in" }],
  [/^\/register/, { de: "Registrieren", en: "Create account" }],
  [/^\/forgot-password/, { de: "Passwort vergessen", en: "Forgot password" }],
  [/^\/reset-password/, { de: "Passwort zurücksetzen", en: "Reset password" }],
  [/^\/impressum/, { de: "Impressum", en: "Legal notice" }],
  [/^\/datenschutz/, { de: "Datenschutz", en: "Privacy policy" }],
  [/^\/agb/, { de: "AGB", en: "Terms and conditions" }],
  [/^\/haftungsausschluss/, { de: "Haftungsausschluss", en: "Disclaimer" }],
  [/^\/barrierefreiheit/, { de: "Erklärung zur Barrierefreiheit", en: "Accessibility statement" }],
];

export function formatTitle(page) {
  return page ? `${page} – ${SITE}` : SITE;
}

/**
 * Sets the document title on every route change and, after client-side
 * navigation, moves focus to the main content so screen readers announce the
 * new page instead of staying on the link that was activated.
 */
export default function RouteA11y() {
  const { pathname } = useLocation();
  const { lang } = useLang();
  const firstRender = useRef(true);

  useEffect(() => {
    const match = TITLES.find(([re]) => re.test(pathname));
    document.title = formatTitle(match ? match[1][lang] : lang === "de" ? "Seite nicht gefunden" : "Page not found");
  }, [pathname, lang]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const main = document.getElementById("main-content");
    if (main) main.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
