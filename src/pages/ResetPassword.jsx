import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useLang } from "@/lib/LanguageContext";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError(lang === "de" ? "Die Passwörter stimmen nicht überein." : "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || (lang === "de" ? "Passwort konnte nicht zurückgesetzt werden." : "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title={lang === "de" ? "Ungültiger Link" : "Invalid reset link"}
        subtitle={lang === "de" ? "Dieser Link zum Zurücksetzen fehlt oder ist ungültig" : "This password reset link is missing or invalid"}
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            {lang === "de" ? "Neuen Link anfordern" : "Request a new link"}
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          {lang === "de" ? "Der verwendete Link scheint unvollständig zu sein. Bitte fordere eine neue E-Mail zum Zurücksetzen an." : "The link you used appears to be incomplete. Please request a new password reset email."}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title={lang === "de" ? "Neues Passwort" : "New password"}
      subtitle={lang === "de" ? "Gib unten dein neues Passwort ein" : "Enter your new password below"}
    >
      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{lang === "de" ? "Neues Passwort" : "New password"}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder=""
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              {lang === "de" ? "Wird zurückgesetzt…" : "Resetting…"}
            </>
          ) : (
            lang === "de" ? "Passwort zurücksetzen" : "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
