// Plain-language summaries of every presentation licence, in both site
// languages. Shared by the detail page, the download dialog and the worker
// that writes LICENSE.txt into download ZIPs, so all three say the same thing.

export const LICENSE_DETAILS = {
  "CC0 1.0": {
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    en: {
      title: "No Rights Reserved (Public Domain)",
      allows: ["Use for any purpose", "Modify and adapt freely", "Share and redistribute", "Commercial use", "No attribution required"],
      conditions: [],
      note: "The author has waived all copyright and related rights worldwide.",
    },
    de: {
      title: "Keine Rechte vorbehalten (Gemeinfrei)",
      allows: ["Jede Nutzung erlaubt", "Freie Bearbeitung", "Weiterverbreitung", "Kommerzielle Nutzung", "Keine Namensnennung erforderlich"],
      conditions: [],
      note: "Der Urheber hat weltweit auf alle Urheber- und verwandten Rechte verzichtet.",
    },
  },
  "CC BY 4.0": {
    url: "https://creativecommons.org/licenses/by/4.0/",
    en: {
      title: "Attribution 4.0 International",
      allows: ["Share and redistribute", "Modify and adapt", "Commercial use"],
      conditions: ["Credit the original author (name, source, license, changes)"],
      note: null,
    },
    de: {
      title: "Namensnennung 4.0 International",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung", "Kommerzielle Nutzung"],
      conditions: ["Urheber nennen (Name, Quelle, Lizenz, Änderungen)"],
      note: null,
    },
  },
  "CC BY-SA 4.0": {
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    en: {
      title: "Attribution-ShareAlike 4.0",
      allows: ["Share and redistribute", "Modify and adapt", "Commercial use"],
      conditions: ["Credit the original author", "Distribute derivatives under the same license"],
      note: null,
    },
    de: {
      title: "Namensnennung-Weitergabe unter gleichen Bedingungen 4.0",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung", "Kommerzielle Nutzung"],
      conditions: ["Urheber nennen", "Abgeleitete Werke unter gleicher Lizenz veröffentlichen"],
      note: null,
    },
  },
  "CC BY-NC 4.0": {
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
    en: {
      title: "Attribution-NonCommercial 4.0",
      allows: ["Share and redistribute", "Modify and adapt"],
      conditions: ["Credit the original author", "Non-commercial use only"],
      note: null,
    },
    de: {
      title: "Namensnennung-Nicht kommerziell 4.0",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung"],
      conditions: ["Urheber nennen", "Nur nicht-kommerzielle Nutzung"],
      note: null,
    },
  },
  "CC BY-NC-SA 4.0": {
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    en: {
      title: "Attribution-NonCommercial-ShareAlike 4.0",
      allows: ["Share and redistribute", "Modify and adapt"],
      conditions: ["Credit the original author", "Non-commercial use only", "Same license for derivatives"],
      note: null,
    },
    de: {
      title: "Namensnennung-Nicht kommerziell-Weitergabe unter gleichen Bedingungen 4.0",
      allows: ["Teilen und weiterverbreiten", "Bearbeitung und Anpassung"],
      conditions: ["Urheber nennen", "Nur nicht-kommerzielle Nutzung", "Abgeleitete Werke unter gleicher Lizenz"],
      note: null,
    },
  },
  "CC BY-ND 4.0": {
    url: "https://creativecommons.org/licenses/by-nd/4.0/",
    en: {
      title: "Attribution-NoDerivatives 4.0",
      allows: ["Share and redistribute", "Commercial use"],
      conditions: ["Credit the original author", "No modifications allowed", "Distribute as-is only"],
      note: null,
    },
    de: {
      title: "Namensnennung-Keine Bearbeitungen 4.0",
      allows: ["Teilen und weiterverbreiten", "Kommerzielle Nutzung"],
      conditions: ["Urheber nennen", "Keine Bearbeitungen erlaubt", "Nur unveränderte Weitergabe"],
      note: null,
    },
  },
  "CC BY-NC-ND 4.0": {
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    en: {
      title: "Attribution-NonCommercial-NoDerivatives 4.0",
      allows: ["Share and redistribute"],
      conditions: ["Credit the original author", "Non-commercial use only", "No modifications allowed"],
      note: null,
    },
    de: {
      title: "Namensnennung-Nicht kommerziell-Keine Bearbeitungen 4.0",
      allows: ["Teilen und weiterverbreiten"],
      conditions: ["Urheber nennen", "Nur nicht-kommerzielle Nutzung", "Keine Bearbeitungen erlaubt"],
      note: null,
    },
  },
  "All Rights Reserved": {
    url: null,
    en: {
      title: "All Rights Reserved",
      allows: [],
      conditions: ["No reuse without explicit written permission from the author"],
      note: "Contact the uploader for any reuse inquiry.",
    },
    de: {
      title: "Alle Rechte vorbehalten",
      allows: [],
      conditions: ["Keine Weiternutzung ohne ausdrückliche schriftliche Genehmigung"],
      note: "Für jede Weiternutzung den Uploader kontaktieren.",
    },
  },
};

/** Details for a licence label in the given language, or null if unknown. */
export function getLicenseDetails(license, lang = "en") {
  const info = LICENSE_DETAILS[license];
  if (!info) return null;
  return { url: info.url, ...(info[lang] || info.en) };
}
