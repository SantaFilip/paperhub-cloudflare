import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useLang } from "@/lib/LanguageContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title={lang === "de" ? "Passwort zurücksetzen" : "Reset password"}
      subtitle={lang === "de" ? "Wir senden dir einen Link zum Zurücksetzen" : "We'll send you a link to reset it"}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" aria-hidden="true" />{lang === "de" ? "Zurück zur Anmeldung" : "Back to log in"}
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="text-sm text-foreground text-center">
          {lang === "de"
            ? "Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze einen Link zum Zurücksetzen."
            : "If an account exists with that email, you'll receive a password reset link shortly."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{lang === "de" ? "E-Mail-Adresse" : "Email address"}</Label>
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
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                {lang === "de" ? "Wird gesendet…" : "Sending…"}
              </>
            ) : (
              lang === "de" ? "Link senden" : "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
