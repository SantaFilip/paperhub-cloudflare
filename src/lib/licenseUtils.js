/**
 * Shared license detection logic (matches spec decision matrix)
 */

// Ordered from most permissive (0) to most restrictive (7)
export const LICENSE_VALUES = [
  "CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0",
  "CC BY-NC-SA 4.0", "CC BY-ND 4.0", "CC BY-NC-ND 4.0", "All Rights Reserved"
];

/**
 * Check if a paper license label has ND (No Derivatives) restriction
 */
export function hasNDRestriction(label) {
  if (!label) return false;
  const l = label.toLowerCase();
  return l.includes("-nd") || l.includes("no derivative") || l.includes("no-derivative");
}

/**
 * Check if a paper license label is All Rights Reserved (not freely licensed)
 */
export function isAllRightsReserved(label) {
  if (!label) return true; // default: assume restricted
  const l = label.toLowerCase();
  const freePatterns = ["cc0", "cc by", "cc-by", "public domain", "open access", "creative commons", "oai"];
  return !freePatterns.some((p) => l.includes(p));
}

/**
 * Get the minimum index in LICENSE_VALUES that an uploader (non-author) must use
 * based on the paper's license.
 * Returns -1 if no restriction.
 */
const PAPER_LICENSE_INDEX_MAP = {
  "CC0": 0,
  "CC BY-NC-ND": 6,
  "CC BY-NC-SA": 4,
  "CC BY-NC": 3,
  "CC BY-ND": 5,
  "CC BY-SA": 2,
  "CC BY": 1,
  "All Rights Reserved": 7,
  "Alle Rechte vorbehalten": 7,
};

export function getPaperLicenseMinIndex(label) {
  if (!label) return -1;
  for (const [key, idx] of Object.entries(PAPER_LICENSE_INDEX_MAP)) {
    if (label.includes(key)) return idx;
  }
  return -1;
}

/**
 * Decision matrix from spec:
 * - Free CC licenses (no ND)  → upload allowed, download allowed
 * - ND license + NOT author   → BLOCKED (cannot upload at all)
 * - All Rights Reserved + NOT author → metadata-only (no file)
 * - Any license + IS author   → fully allowed
 *
 * Returns { allowed: bool, mode: 'full'|'metadata_only'|'blocked', reason: string }
 */
export function getUploadMode(paperLicenseLabel, isAuthorVerified) {
  if (isAuthorVerified) {
    return { allowed: true, mode: "full", reason: "author_exception" };
  }

  if (!paperLicenseLabel) {
    return { allowed: false, mode: "blocked", reason: "unknown_license" };
  }

  if (hasNDRestriction(paperLicenseLabel)) {
    return { allowed: false, mode: "blocked", reason: "nd_restriction" };
  }

  if (isAllRightsReserved(paperLicenseLabel)) {
    return { allowed: true, mode: "metadata_only", reason: "all_rights_reserved" };
  }

  return { allowed: true, mode: "full", reason: "free_license" };
}

/**
 * Canonical Creative Commons license URLs.
 * Returns null for "All Rights Reserved" or unknown labels.
 */
export const LICENSE_URLS = {
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "CC BY-ND 4.0": "https://creativecommons.org/licenses/by-nd/4.0/",
  "CC BY-NC-ND 4.0": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
};

export function getLicenseUrl(license) {
  if (!license) return null;
  return LICENSE_URLS[license] || null;
}
/**
 * Licences under which no preview image (thumbnail) may be shown: the ones
 * that grant no licence at all, and the ones forbidding derivatives. The same
 * two grounds gate the download below, so a presentation that may be handed
 * out may also be previewed.
 *
 * NonCommercial is deliberately not here. NC restricts what a downstream user
 * may do with the work; it does not bar the archive the author uploaded it to
 * from showing a preview of it.
 *
 * It is applied when the record is read, not when it is written, so it also
 * covers uploads made before the rule existed.
 */
export const THUMBNAIL_HIDDEN_LICENSES = [
  "All Rights Reserved",
  "CC BY-ND 4.0",
  "CC BY-NC-ND 4.0",
];

export function hidesThumbnail(license) {
  return THUMBNAIL_HIDDEN_LICENSES.includes(license);
}

/**
 * True when nobody may be handed this presentation's files.
 *
 * The rule is the one the detail page has always shown: a third-party upload
 * is withheld when the presentation carries no licence at all, or when the
 * paper behind it forbids derivatives. An upload by the paper's own author is
 * never withheld — they are the rightsholder.
 *
 * It reads only the record, never who is asking, so the worker can apply it
 * before serving a byte and the page can apply it before offering a button.
 * Both import it from here, so the two cannot drift apart — which is what
 * happened before, when the rule lived only in the page and the files stayed
 * reachable by URL.
 *
 * D1 returns booleans as 0/1 on raw queries and as true/false through the
 * entity layer, hence the loose checks.
 */
export function blocksDownload(presentation) {
  if (!presentation) return false;
  if (presentation.is_author === true || presentation.is_author === 1) return false;
  if (presentation.license === "All Rights Reserved") return true;
  return presentation.has_nd_restriction === true || presentation.has_nd_restriction === 1;
}
