import { useState } from "react";
import { CheckCircle, Loader2, ShieldCheck, ShieldX, ExternalLink } from "lucide-react";
import { api } from "@/api/client";

// Levenshtein distance for fuzzy name matching
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a, b) {
  const normalize = (s) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(na, nb) / maxLen;
}

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

// Academic email domains get higher trust scores (0-100)
function calcEmailQualityScore(email) {
  if (!email) return 0;
  const domain = email.toLowerCase().split("@")[1] || "";
  if (!domain) return 0;
  // Highest: established academic TLDs
  if (domain.endsWith(".edu")) return 95;
  if (domain.endsWith(".ac.uk") || domain.endsWith(".ac.at") || domain.endsWith(".ac.nz")) return 95;
  // German/European universities
  if (/^uni-/.test(domain) || domain.includes(".uni-") || domain.endsWith(".uni")) return 90;
  if (domain.endsWith(".ac.de") || domain.endsWith(".hs-")) return 88;
  if (domain.endsWith(".tu-") || /^tu-/.test(domain)) return 88;
  if (domain.endsWith(".edu.au") || domain.endsWith(".edu.cn") || domain.endsWith(".edu.br")) return 85;
  // General institutional / research
  if (domain.endsWith(".org") || domain.includes("research") || domain.includes("institute")) return 60;
  // Free providers — lowest trust
  if (["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "gmx.de", "web.de", "icloud.com"].includes(domain)) return 20;
  return 40; // Unknown
}

// Normalize ORCID input to just the 16-digit ID
function normalizeOrcid(input) {
  return input.replace(/https?:\/\/orcid\.org\//i, "").trim();
}

async function logAudit({ userId, userEmail, userName, doi, method, result, matchedName, orcidId }) {
  const score = calcEmailQualityScore(userEmail);
  await api.entities.AuthorshipAuditLog.create({
    user_id: userId || null,
    user_email: userEmail || null,
    user_name: userName || null,
    doi,
    claimed_author: true,
    verification_method: method,
    verification_result: result,
    matched_author_name: matchedName || null,
    email_quality_score: score,
    orcid_id: orcidId || null,
    timestamp: new Date().toISOString(),
  }).catch(() => {}); // fire-and-forget, never block UI
}

export default function AuthorshipVerifier({ doi, userEmail, userName, userId, lang, onVerified }) {
  const [status, setStatus] = useState("idle"); // idle | loading | verified | failed | error
  const [result, setResult] = useState(null);
  const [orcidInput, setOrcidInput] = useState("");
  const [showOrcid, setShowOrcid] = useState(false);

  const verifyViaOrcid = async () => {
    const orcidId = normalizeOrcid(orcidInput);
    if (!orcidId) return;
    setStatus("loading");
    setResult(null);

    try {
      // ORCID Public API — no auth needed for public profiles
      const resp = await fetch(
        `https://pub.orcid.org/v3.0/${orcidId}/works`,
        { headers: { Accept: "application/json" } }
      );

      if (!resp.ok) {
        setStatus("error");
        setResult({ error: lang === "de" ? "ORCID-Profil nicht gefunden." : "ORCID profile not found." });
        onVerified(false);
        return;
      }

      const data = await resp.json();
      const groups = data?.group || [];

      // Collect all external IDs across works and look for DOI match
      const normalizedDoi = doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//i, "");
      let found = false;
      for (const group of groups) {
        for (const summary of group["work-summary"] || []) {
          const extIds = summary["external-ids"]?.["external-id"] || [];
          for (const extId of extIds) {
            const extDoi = (extId["external-id-value"] || "").toLowerCase().replace(/^https?:\/\/doi\.org\//i, "");
            if (extId["external-id-type"] === "doi" && extDoi === normalizedDoi) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      if (found) {
        setStatus("verified");
        setResult({ method: "orcid", confidence: 100, orcidId });
        logAudit({ userId, userEmail, userName, doi, method: "orcid", result: true, orcidId });
        onVerified(true, "orcid", userName);
      } else {
        setStatus("failed");
        setResult({
          method: "orcid_no_match",
          message: lang === "de"
            ? "Diese DOI wurde im ORCID-Profil nicht gefunden."
            : "This DOI was not found in the ORCID profile."
        });
        logAudit({ userId, userEmail, userName, doi, method: "orcid", result: false, orcidId });
        onVerified(false);
      }
    } catch {
      setStatus("error");
      setResult({ error: lang === "de" ? "Verbindungsfehler zur ORCID API." : "Connection error to ORCID API." });
      onVerified(false);
    }
  };

  const verifyCrossRef = async () => {
    if (!doi || !userEmail) return;
    setStatus("loading");
    setResult(null);

    try {
      const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi.trim())}`, {
        headers: { "User-Agent": "PaperHub/1.0 (mailto:paperhub@example.com)" }
      });

      if (!resp.ok) {
        setStatus("error");
        setResult({ error: lang === "de" ? "DOI nicht in CrossRef gefunden." : "DOI not found in CrossRef." });
        onVerified(false);
        return;
      }

      const data = await resp.json();
      const authors = data?.message?.author || [];

      if (authors.length === 0) {
        setStatus("failed");
        setResult({
          method: "no_authors",
          message: lang === "de"
            ? "CrossRef hat keine Autoren-Daten für dieses Paper."
            : "CrossRef has no author data for this paper."
        });
        onVerified(false);
        return;
      }

      // Layer 1: Exact email match
      const emailMatch = authors.find(
        (a) => a.email && normalizeEmail(a.email) === normalizeEmail(userEmail)
      );
      if (emailMatch) {
        const matchedName = [emailMatch.given, emailMatch.family].filter(Boolean).join(" ");
        setStatus("verified");
        setResult({ method: "email_exact_match", confidence: 100, matchedAuthor: matchedName });
        logAudit({ userId, userEmail, userName, doi, method: "crossref_email", result: true, matchedName });
        onVerified(true, "crossref_email", matchedName);
        return;
      }

      // Layer 2: Fuzzy name match (85%+ similarity)
      let bestMatch = null;
      let bestScore = 0;
      for (const a of authors) {
        const fullName = [a.given, a.family].filter(Boolean).join(" ");
        const score = nameSimilarity(userName || "", fullName);
        if (score > bestScore) { bestScore = score; bestMatch = { ...a, fullName }; }
      }

      if (bestScore >= 0.85) {
        setStatus("verified");
        setResult({ method: "name_fuzzy_match", confidence: Math.round(bestScore * 100), matchedAuthor: bestMatch.fullName });
        logAudit({ userId, userEmail, userName, doi, method: "crossref_name", result: true, matchedName: bestMatch.fullName });
        onVerified(true, "crossref_name", bestMatch.fullName);
        return;
      }

      // No match
      const authorList = authors.slice(0, 3).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
      setStatus("failed");
      setResult({
        method: "no_match",
        authorList,
        message: lang === "de"
          ? "Deine Email/Name stimmt nicht mit den registrierten Autoren überein."
          : "Your email/name does not match the registered authors."
      });
      logAudit({ userId, userEmail, userName, doi, method: "crossref_name", result: false });
      onVerified(false);
    } catch {
      setStatus("error");
      setResult({ error: lang === "de" ? "Verbindungsfehler zur CrossRef API." : "Connection error to CrossRef API." });
      onVerified(false);
    }
  };

  const reset = () => { setStatus("idle"); setResult(null); setShowOrcid(false); onVerified(false); };

  const methodLabel = (method) => {
    if (method === "email_exact_match") return lang === "de" ? "CrossRef E-Mail-Match" : "CrossRef Email Match";
    if (method === "name_fuzzy_match") return lang === "de" ? "CrossRef Name-Match (Fuzzy)" : "CrossRef Name Match (Fuzzy)";
    if (method === "orcid") return "ORCID";
    return method;
  };

  return (
    <div className="mt-3 space-y-3">
      {status === "idle" && (
        <div className="space-y-2">
          {/* Primary: CrossRef */}
          <button
            type="button"
            onClick={verifyCrossRef}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E293B] text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {lang === "de" ? "Authorship via CrossRef prüfen" : "Verify authorship via CrossRef"}
          </button>

          {/* Secondary: ORCID */}
          {!showOrcid ? (
            <button
              type="button"
              onClick={() => setShowOrcid(true)}
              className="block text-xs text-[#2563EB] hover:underline"
            >
              {lang === "de" ? "Oder via ORCID verifizieren →" : "Or verify via ORCID →"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={orcidInput}
                onChange={(e) => setOrcidInput(e.target.value)}
                placeholder="0000-0001-2345-6789"
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white font-mono"
              />
              <button
                type="button"
                onClick={verifyViaOrcid}
                disabled={!orcidInput.trim()}
                className="px-3 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {lang === "de" ? "Prüfen" : "Verify"}
              </button>
              <button type="button" onClick={() => setShowOrcid(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {lang === "de" ? "Wird abgefragt…" : "Verifying…"}
        </div>
      )}

      {status === "verified" && result && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                {lang === "de" ? "✓ Authorship verifiziert" : "✓ Authorship verified"}
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                {lang === "de" ? "Methode: " : "Method: "}{methodLabel(result.method)}
                {result.confidence && ` · Confidence: ${result.confidence}%`}
                {userEmail && ` · Email-Score: ${calcEmailQualityScore(userEmail)}/100`}
              </p>
              {result.matchedAuthor && (
                <p className="text-xs text-green-700">
                  {lang === "de" ? "Gematchter Autor: " : "Matched author: "}<strong>{result.matchedAuthor}</strong>
                </p>
              )}
              {result.orcidId && (
                <a
                  href={`https://orcid.org/${result.orcidId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-green-600 underline mt-0.5"
                >
                  orcid.org/{result.orcidId} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button type="button" onClick={reset} className="text-xs text-green-600 underline mt-1 block">
                {lang === "de" ? "Zurücksetzen" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(status === "failed" || status === "error") && result && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <ShieldX className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {lang === "de" ? "Verifikation fehlgeschlagen" : "Verification failed"}
              </p>
              <p className="text-xs text-red-700 mt-0.5">{result.message || result.error}</p>
              {result.authorList && (
                <p className="text-xs text-red-600 mt-1">
                  {lang === "de" ? "Registrierte Autoren: " : "Registered authors: "}{result.authorList}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={reset} className="text-xs text-red-600 underline">
                  {lang === "de" ? "Nochmal versuchen" : "Try again"}
                </button>
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {lang === "de" ? "Paper auf DOI prüfen" : "Check paper on DOI"}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}