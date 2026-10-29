// Consent for the reach measurement, and the loader it gates.
//
// § 25 TTDSG: reading or storing anything on the visitor's device needs prior
// consent unless it is strictly necessary for the service. Reach measurement
// is not, so the tracker must not load until someone has said yes — and it
// must stay unloaded for the rest of the visit if they said no.

const KEY = "ph_analytics_consent";
const METRICOOL_HASH = "550cd29f93212172c7fabb3cd9d9bd0e";

/** "granted" | "denied" | null when nobody has decided yet. */
export function readConsent() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    // Private window, blocked storage: treat as undecided and ask again.
    return null;
  }
}

export function writeConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Nothing to do — the decision then holds for this page view only,
    // which is the safe direction.
  }
}

/** Withdrawal has to be as easy as giving, so this is a first-class export. */
export function clearConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

let geladen = false;

/**
 * Append the Metricool tag. Call only after consent. Guarded so a second call
 * — a re-render, a route change — cannot load the script twice.
 */
export function loadAnalytics() {
  if (geladen || typeof document === "undefined") return;
  geladen = true;

  const s = document.createElement("script");
  s.src = "https://tracker.metricool.com/resources/be.js";
  s.async = true;
  s.onload = () => {
    try {
      window.beTracker?.t({ hash: METRICOOL_HASH });
    } catch {
      // The tag failing is not worth breaking a page over.
    }
  };
  document.head.appendChild(s);
}
