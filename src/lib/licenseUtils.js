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
 * Licences under which no preview image (thumbnail) may be shown. The first
 * slide is a reproduction of the work, so it is withheld for these — also for
 * uploads made before this rule existed, because the worker strips the
 * thumbnail when the record is read, not when it is written.
 */
export const THUMBNAIL_HIDDEN_LICENSES = ["All Rights Reserved", "CC BY-NC-ND 4.0", "CC BY-NC 4.0"];

export function hidesThumbnail(license) {
  return THUMBNAIL_HIDDEN_LICENSES.includes(license);
}
