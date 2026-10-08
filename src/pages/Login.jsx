import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useLang } from "@/lib/LanguageContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || (lang === "de" ? "E-Mail oder Passwort ist falsch." : "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title={lang === "de" ? "Willkommen zurück" : "Welcome back"}
      subtitle={lang === "de" ? "Melde dich bei deinem Konto an" : "Log in to your account"}
      footer={
        <Link to="/register" className="block w-full bg-[#1E293B] text-white text-center font-medium py-3 rounded-lg hover:bg-slate-700 transition-colors">
          {lang === "de" ? "Noch kein Konto? Jetzt registrieren" : "Don't have an account? Create one"}
        </Link>
      }
    >
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{lang === "de" ? "E-Mail" : "Email"}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder={lang === "de" ? "du@beispiel.de" : "you@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{lang === "de" ? "Passwort" : "Password"}</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              {lang === "de" ? "Passwort vergessen?" : "Forgot password?"}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              {lang === "de" ? "Anmeldung läuft…" : "Logging in…"}
            </>
          ) : (
            lang === "de" ? "Anmelden" : "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}