import React from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import Footer from "./Footer";
import SkipLink from "./a11y/SkipLink";
import { useLang } from "@/lib/LanguageContext";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const { lang } = useLang();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLink />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <header className="flex justify-center mb-8">
          <Link to="/landing" className="flex items-center gap-2 group" aria-label={lang === "de" ? "PaperHub – zur Startseite" : "PaperHub – home"}>
            <div className="w-8 h-8 bg-[#1E293B] rounded flex items-center justify-center" aria-hidden="true">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-semibold text-[#0F172A] text-lg tracking-tight">
              Paper<span className="text-[#2563EB]">Hub</span>
            </span>
          </Link>
        </header>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <div className="mt-6">{footer}</div>
        )}
        </main>
      </div>
      </div>
      <Footer />
    </div>
  );
}