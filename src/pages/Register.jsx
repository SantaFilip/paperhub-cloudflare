import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import { useLang } from "@/lib/LanguageContext";
import { toast } from "@/components/ui/use-toast";

const slugify = (s) => (s || "").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 30);

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const { lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(lang === "de" ? "Die Passwörter stimmen nicht überein." : "Passwords do not match");
      return;
    }
    if (!consentPrivacy || !consentTerms) {
      setError(lang === "de" ? "Bitte Datenschutz und AGB akzeptieren." : "Please accept the Privacy Policy and Terms.");
      return;
    }
    setLoading(true);
    try {
      await api.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || (lang === "de" ? "Registrierung fehlgeschlagen." : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await api.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        api.auth.setToken(result.access_token);
        if (fullName.trim()) {
          try { await api.auth.updateMe({ username: slugify(fullName) }); } catch {}
        }
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message || (lang === "de" ? "Ungültiger Bestätigungscode." : "Invalid verification code"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await api.auth.resendOtp(email);
      toast({
        title: lang === "de" ? "Code gesendet" : "Code sent",
        description: lang === "de" ? "Sieh in deinem Postfach nach dem neuen Code." : "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || (lang === "de" ? "Code konnte nicht erneut gesendet werden." : "Failed to resend code"));
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title={lang === "de" ? "E-Mail bestätigen" : "Verify your email"}
        subtitle={lang === "de" ? `Wir haben einen Code an ${email} gesendet` : `We sent a code to ${email}`}
      >
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
            aria-label={lang === "de" ? "6-stelliger Bestätigungscode" : "6-digit verification code"}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              {lang === "de" ? "Wird geprüft…" : "Verifying…"}
            </>
          ) : (
            lang === "de" ? "Bestätigen" : "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {lang === "de" ? "Keinen Code erhalten?" : "Didn't receive the code?"}{" "}
          <button type="button" onClick={handleResend} className="text-primary font-medium hover:underline">
            {lang === "de" ? "Erneut senden" : "Resend"}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title={lang === "de" ? "Konto erstellen" : "Create your account"}
      subtitle={lang === "de" ? "Registriere dich, um loszulegen" : "Sign up to get started"}
      footer={
        <Link to="/login" className="block w-full bg-[#1E293B] text-white text-center font-medium py-3 rounded-lg hover:bg-slate-700 transition-colors">
          {lang === "de" ? "Schon ein Konto? Anmelden" : "Already have an account? Log in"}
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
          <Label htmlFor="fullname">{lang === "de" ? "Vollständiger Name" : "Full name"}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="fullname"
              aria-describedby="fullname-hint"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Filip Sudermann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
          <p id="fullname-hint" className="text-xs text-muted-foreground">
            {lang === "de"
              ? "Dein echter Name wird als öffentlicher Nutzername (Anmeldename) verwendet, z.B. /u/Filip_Sudermann."
              : "Your real name is used as your public username, e.g. /u/Filip_Sudermann."}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{lang === "de" ? "E-Mail" : "Email"}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={lang === "de" ? "du@beispiel.de" : "you@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{lang === "de" ? "Passwort" : "Password"}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{lang === "de" ? "Passwort wiederholen" : "Confirm password"}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder=""
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} className="mt-0.5 w-5 h-5 rounded border-slate-400 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0" />
            <span className="text-xs text-slate-700">
              {lang === "de" ? "Ich habe die " : "I have read the "}
              <Link to="/datenschutz" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-medium">{lang === "de" ? "Datenschutzerklärung" : "Privacy Policy"}<span className="sr-only">{lang === "de" ? " (öffnet in neuem Tab)" : " (opens in a new tab)"}</span></Link>
              {lang === "de" ? " gelesen und akzeptiert. *" : " and accept it. *"}
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consentTerms} onChange={(e) => setConsentTerms(e.target.checked)} className="mt-0.5 w-5 h-5 rounded border-slate-400 text-[#2563EB] focus:ring-[#2563EB] flex-shrink-0" />
            <span className="text-xs text-slate-700">
              {lang === "de" ? "Ich stimme den " : "I agree to the "}
              <Link to="/agb" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline font-medium">{lang === "de" ? "Nutzungsbedingungen (AGB)" : "Terms of Use"}<span className="sr-only">{lang === "de" ? " (öffnet in neuem Tab)" : " (opens in a new tab)"}</span></Link>
              {lang === "de" ? " zu. *" : ". *"}
            </span>
          </label>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !consentPrivacy || !consentTerms}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              {lang === "de" ? "Konto wird erstellt…" : "Creating account…"}
            </>
          ) : (
            lang === "de" ? "Konto erstellen" : "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}