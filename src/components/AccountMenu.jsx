import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, FileText, Mail, HelpCircle, ChevronDown, Shield, Scale, LogOut } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/api/client";

const FAQ_DE = [
  { q: "Kostet PaperHub etwas?", a: "Nein, PaperHub ist völlig kostenlos." },
  { q: "Wer entwickelt PaperHub?", a: "Filip entwickelt PaperHub als Einzelperson — als Start-up Initiative." },
  { q: "Kann ich meine Präsentation löschen?", a: "Ja. Gehe zu deinem Dashboard und wähle Löschen. Nach 30 Tagen wird sie endgültig entfernt." },
  { q: "Wie funktioniert die Lizenzprüfung?", a: "PaperHub extrahiert Zitate aus deinen Präsentationen und prüft die Lizenzen der zugehörigen Artikel über eine öffentliche Datenbank." },
  { q: "Ist mein Passwort sicher?", a: "Ja, es wird mit bcrypt-Hashing verschlüsselt." },
  { q: "Werden meine Daten an Dritte weitergegeben?", a: "Nein. Kein Tracking, keine Weitergabe an Dritte. DSGVO-konform." },
  { q: "Wie melde ich einen Fehler?", a: "Sende eine E-Mail an info@filipsudermann.com mit einer Fehlerbeschreibung." },
];

const FAQ_EN = [
  { q: "Does PaperHub cost anything?", a: "No, PaperHub is completely free." },
  { q: "Who develops PaperHub?", a: "Filip develops PaperHub as a solo developer — as a start-up initiative." },
  { q: "Can I delete my presentation?", a: "Yes. Go to your dashboard and select Delete. After 30 days it is permanently removed." },
  { q: "How does the license check work?", a: "PaperHub extracts citations from your presentations and checks the licenses of those papers via a public database." },
  { q: "Is my password secure?", a: "Yes, it is encrypted using bcrypt hashing." },
  { q: "Is my data shared with third parties?", a: "No. No tracking, no third-party sharing. GDPR-compliant." },
  { q: "How do I report a bug?", a: "Send an email to info@filipsudermann.com describing the issue." },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-2 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-slate-700">{q}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="text-xs text-slate-500 pb-3 pr-4">{a}</p>}
    </div>
  );
}

function LegalAccordion({ title, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <span className="text-slate-400">{icon}</span>{title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-3 pr-2 text-xs text-slate-600">{children}</div>}
    </div>
  );
}

export default function AccountMenu({ user }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("profile");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const faq = lang === "de" ? FAQ_DE : FAQ_EN;

  const tabs = [
    { id: "profile", icon: <User className="w-4 h-4" />, label: lang === "de" ? "Profil" : "Profile" },
    { id: "legal", icon: <Scale className="w-4 h-4" />, label: lang === "de" ? "Rechtliches" : "Legal" },
    { id: "contact", icon: <Mail className="w-4 h-4" />, label: lang === "de" ? "Kontakt" : "Contact" },
    { id: "faq", icon: <HelpCircle className="w-4 h-4" />, label: "FAQ" },
  ];

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0F172A] bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
      >
        {user ? (
          <>
            <div className="w-6 h-6 rounded-full bg-[#1E293B] flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {(user.full_name || user.email || "U")[0].toUpperCase()}
              </span>
            </div>
            <span className="hidden lg:block truncate max-w-[100px]">
              {user.full_name || t.profile}
            </span>
          </>
        ) : (
          <span>{lang === "de" ? "Übersicht" : "Menu"}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  tab === tb.id
                    ? "text-[#2563EB] border-b-2 border-[#2563EB] bg-blue-50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tb.icon}
                <span className="text-[10px] font-medium">{tb.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">

            {/* Profile tab */}
            {tab === "profile" && (
              <div className="space-y-1">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {(user.full_name || user.email || "U")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{user.full_name || "—"}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      {lang === "de" ? "Mein Profil" : "My Profile"}
                    </Link>
                    <Link
                      to="/upload"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      {lang === "de" ? "Präsentation hochladen" : "Upload Presentation"}
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        api.auth.logout("/landing");
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      {lang === "de" ? "Abmelden" : "Sign Out"}
                    </button>
                    </>
                    ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500 mb-3">
                      {lang === "de"
                        ? "Melde dich an, um Präsentationen hochzuladen und dein Profil zu verwalten."
                        : "Sign in to upload presentations and manage your profile."}
                    </p>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="block w-full px-4 py-2.5 text-center text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {lang === "de" ? "Anmelden" : "Sign In"}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setOpen(false)}
                      className="block w-full px-4 py-2.5 text-center text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {lang === "de" ? "Registrieren" : "Register"}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Legal tab */}
            {tab === "legal" && (
              <div>
                <LegalAccordion title={lang === "de" ? "Impressum" : "Legal Notice"} icon={<Scale className="w-4 h-4" />}>
                  <div className="space-y-1">
                    <p><strong>{lang === "de" ? "Verantwortlich:" : "Responsible:"}</strong> Filip Sudermann</p>
                    <p><strong>E-Mail:</strong> info@filipsudermann.com</p>
                    <p><strong>{lang === "de" ? "Postanschrift:" : "Postal address:"}</strong> Platz an der Basilika 4, 30169 Hannover</p>
                    <p><strong>{lang === "de" ? "Telefon:" : "Phone:"}</strong> +49 176 75084228</p>
                    <p><strong>{lang === "de" ? "Standort:" : "Location:"}</strong> Hannover, Niedersachsen, Deutschland</p>
                    <p><strong>Status:</strong> {lang === "de" ? "Start-up Initiative" : "Start-up Initiative"}</p>
                  </div>
                </LegalAccordion>
                <LegalAccordion title={lang === "de" ? "Datenschutz (DSGVO)" : "Privacy (GDPR)"} icon={<Shield className="w-4 h-4" />}>
                  <div className="space-y-1.5">
                    <p>{lang === "de" ? "Erfasste Daten: E-Mail, Präsentationen, gekürzte IP, Browser-Infos." : "Collected data: email, presentations, truncated IP, browser info."}</p>
                    <p><strong>{lang === "de" ? "Keine" : "No"}</strong> {lang === "de" ? "Weitergabe an Dritte, kein Tracking." : "third-party sharing, no tracking."}</p>
                    <p>{lang === "de" ? "DSGVO-Anfragen: E-Mail mit Betreff DSGVO: [Anfrage], Antwort: 30 Tage." : "GDPR requests: email with subject GDPR: [request], response: 30 days."}</p>
                    <p>{lang === "de" ? "Sicherheit: TLS + AES-256 + bcrypt. Backups täglich, 30 Tage." : "Security: TLS + AES-256 + bcrypt. Daily backups, 30-day retention."}</p>
                  </div>
                </LegalAccordion>
                <LegalAccordion title={lang === "de" ? "Nutzungsbedingungen" : "Terms of Use"} icon={<FileText className="w-4 h-4" />}>
                  <div className="space-y-1.5">
                    <p><strong>{lang === "de" ? "Erlaubt:" : "Allowed:"}</strong> {lang === "de" ? "Präsentationen hochladen, CC-Lizenzen nutzen, Daten exportieren." : "Upload presentations, use CC licenses, export data."}</p>
                    <p><strong>{lang === "de" ? "Nicht erlaubt:" : "Not allowed:"}</strong> {lang === "de" ? "Geschützte Inhalte ohne Genehmigung, Bots/Spam, illegale Inhalte." : "Copyrighted content without permission, bots/spam, illegal content."}</p>
                    <p>{lang === "de" ? "Du behältst alle Urheberrechte. PaperHub haftet nicht für Datenverlust oder Urheberrechtsverletzungen durch Nutzer." : "You retain all copyrights. PaperHub is not liable for data loss or copyright infringement by users."}</p>
                  </div>
                </LegalAccordion>
                <LegalAccordion title={lang === "de" ? "Haftungsausschluss" : "Disclaimer"} icon={<HelpCircle className="w-4 h-4" />}>
                  <div className="space-y-1.5">
                    <p>{lang === "de" ? "PaperHub garantiert keine 100% Verfügbarkeit oder fehlerfreie Lizenzprüfung." : "PaperHub does not guarantee 100% uptime or error-free license checks."}</p>
                    <p>{lang === "de" ? "Du bist verantwortlich für die Rechtmäßigkeit deiner Uploads." : "You are responsible for the legality of your uploads."}</p>
                    <p>{lang === "de" ? "Urheberrechts-Beschwerde: E-Mail an info@filipsudermann.com" : "Copyright complaint: email info@filipsudermann.com"}</p>
                  </div>
                </LegalAccordion>
                <p className="text-[10px] text-slate-400 mt-3">Stand: 27.06.2026</p>
              </div>
            )}

            {/* Contact tab */}
            {tab === "contact" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  {lang === "de"
                    ? "Ich bin Filip, Einzelentwickler von PaperHub. Ich antworte zuverlässig innerhalb von 24-48 Stunden."
                    : "I'm Filip, solo developer of PaperHub. I respond reliably within 24-48 hours."}
                </p>
                <a
                  href="mailto:info@filipsudermann.com"
                  className="flex items-center gap-2 w-full px-4 py-3 bg-[#1E293B] text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  info@filipsudermann.com
                </a>
                <div className="text-xs text-slate-500 space-y-1 pt-1">
                  <p className="font-medium text-slate-600">{lang === "de" ? "Themen:" : "Topics:"}</p>
                  {(lang === "de"
                    ? ["Fehler und technische Probleme", "Feature-Anfragen", "DSGVO-Anfragen", "Urheberrechts-Beschwerden"]
                    : ["Bugs & technical issues", "Feature requests", "GDPR requests", "Copyright complaints"]
                  ).map((item, i) => (
                    <p key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-300 inline-block flex-shrink-0" />
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ tab */}
            {tab === "faq" && (
              <div>
                {faq.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}