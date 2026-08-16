// Resolves a paper's licence from its DOI.
// Four metadata APIs race in parallel; Claude's web search is the last resort
// and is skipped entirely when ANTHROPIC_API_KEY is unset.

import { lookupLicenseWithClaude } from "../lib/llm.js";
import { badRequest, json, readJson } from "../lib/util.js";

const UA = "PaperHub/1.0 (mailto:paperhub@paperhub.io)";

function urlToLicense(url) {
  if (!url) return null;
  if (url.includes("creativecommons.org/publicdomain/zero") || url.toLowerCase().includes("cc0")) return "CC0 1.0";
  if (url.includes("creativecommons.org/licenses/by-nc-nd")) return "CC BY-NC-ND 4.0";
  if (url.includes("creativecommons.org/licenses/by-nc-sa")) return "CC BY-NC-SA 4.0";
  if (url.includes("creativecommons.org/licenses/by-nc")) return "CC BY-NC 4.0";
  if (url.includes("creativecommons.org/licenses/by-nd")) return "CC BY-ND 4.0";
  if (url.includes("creativecommons.org/licenses/by-sa")) return "CC BY-SA 4.0";
  if (url.includes("creativecommons.org/licenses/by")) return "CC BY 4.0";
  return null;
}

// OpenAlex reports licences as slugs ("cc-by-nc") rather than URLs.
function openAlexLicenseToLabel(lic) {
  if (!lic) return null;
  const map = {
    "cc0": "CC0 1.0",
    "cc-by": "CC BY 4.0",
    "cc-by-sa": "CC BY-SA 4.0",
    "cc-by-nc": "CC BY-NC 4.0",
    "cc-by-nc-sa": "CC BY-NC-SA 4.0",
    "cc-by-nd": "CC BY-ND 4.0",
    "cc-by-nc-nd": "CC BY-NC-ND 4.0",
  };
  return map[lic.toLowerCase()] || null;
}

async function tryApis(doi) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  const encoded = encodeURIComponent(doi);

  try {
    const [crossrefRes, cslRes, openalexRes, unpaywallRes] = await Promise.allSettled([
      fetch(`https://api.crossref.org/works/${encoded}`, { headers: { "User-Agent": UA }, signal: controller.signal }),
      fetch(`https://doi.org/${encoded}`, {
        headers: { Accept: "application/vnd.citationstyles.csl+json", "User-Agent": UA },
        signal: controller.signal,
        redirect: "follow",
      }),
      fetch(`https://api.openalex.org/works/doi:${encoded}`, { headers: { "User-Agent": UA }, signal: controller.signal }),
      fetch(`https://api.unpaywall.org/v2/${encoded}?email=paperhub@paperhub.io`, { signal: controller.signal }),
    ]);

    // CrossRef — authoritative licence source
    if (crossrefRes.status === "fulfilled" && crossrefRes.value.ok) {
      const data = await crossrefRes.value.json();
      for (const l of data?.message?.license || []) {
        const label = urlToLicense(l.URL);
        if (label) return { found: true, license: label, license_url: l.URL, source: "CrossRef" };
      }
    }

    // DOI content negotiation — publisher-served, often the only place with a licence URL
    if (cslRes.status === "fulfilled" && cslRes.value.ok) {
      const data = await cslRes.value.json().catch(() => null);
      const lic = data?.license || data?.["license-url"];
      if (lic) {
        const url = typeof lic === "string" ? lic : lic.URL || lic.url || "";
        const label = urlToLicense(url);
        if (label) return { found: true, license: label, license_url: url, source: "DOI CSL-JSON" };
      }
    }

    // OpenAlex — explicit licence field
    if (openalexRes.status === "fulfilled" && openalexRes.value.ok) {
      const data = await openalexRes.value.json();
      const lic = data?.license;
      if (lic && lic !== "closed" && lic !== "null") {
        const label = openAlexLicenseToLabel(lic);
        if (label) return { found: true, license: label, license_url: null, source: "OpenAlex" };
      }
    }

    // Unpaywall — open-access licence (bronze is free-to-read, not licensed, so it maps to null)
    if (unpaywallRes.status === "fulfilled" && unpaywallRes.value.ok) {
      const data = await unpaywallRes.value.json();
      const oaLicense = data?.best_oa_location?.license;
      if (oaLicense) {
        const label = urlToLicense(oaLicense);
        if (label) return { found: true, license: label, license_url: oaLicense, source: "Unpaywall" };
      }
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function lookupPaperLicense(request, env) {
  const { doi } = await readJson(request);
  if (!doi) throw badRequest("doi required");

  const [apiResult, llmResult] = await Promise.allSettled([
    tryApis(doi),
    lookupLicenseWithClaude(env, doi),
  ]);

  // Prefer the APIs — faster and more reliable than a web search.
  if (apiResult.status === "fulfilled" && apiResult.value) return json(apiResult.value);
  if (llmResult.status === "fulfilled" && llmResult.value) {
    return json({ ...llmResult.value, source: "Web search" });
  }
  return json({ found: false, license: null, license_url: null });
}
