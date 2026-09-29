import { createContext, useContext, useEffect, useState } from "react";

const DISCIPLINES_EN = [
  "Machine Learning", "Computer Science", "Physics", "Chemistry",
  "Biology", "Mathematics", "Medicine", "Engineering", "Social Sciences",
  "Economics", "Psychology", "Neuroscience", "Environmental Sciences",
  "Earth Sciences", "Materials Science", "Astronomy & Astrophysics",
  "Philosophy", "History & Humanities", "Law", "Public Health", "Linguistics", "Other"
];

const DISCIPLINES_DE = [
  "Maschinelles Lernen", "Informatik", "Physik", "Chemie",
  "Biologie", "Mathematik", "Medizin", "Ingenieurwesen", "Sozialwissenschaften",
  "Wirtschaftswissenschaften", "Psychologie", "Neurowissenschaften", "Umweltwissenschaften",
  "Geowissenschaften", "Materialwissenschaften", "Astronomie & Astrophysik",
  "Philosophie", "Geschichte & Geisteswissenschaften", "Rechtswissenschaften", "Public Health", "Linguistik", "Sonstiges"
];

const PAPER_TYPES_EN = [
  "Original Research", "Review", "Meta-Analysis", "Case Study", "Conference Paper", "Other"
];

const PAPER_TYPES_DE = [
  "Originalforschung", "Übersichtsartikel", "Meta-Analyse", "Fallstudie", "Konferenzbeitrag", "Sonstiges"
];

// Maps from English value → German label (for display only)
export const disciplineLabelDE = Object.fromEntries(DISCIPLINES_EN.map((en, i) => [en, DISCIPLINES_DE[i]]));
export const paperTypeLabelDE = Object.fromEntries(PAPER_TYPES_EN.map((en, i) => [en, PAPER_TYPES_DE[i]]));

const translations = {
  en: {
    // Nav
    discover: "Discover",
    upload: "Upload",
    profile: "Profile",
    signIn: "Sign In",
    register: "Register",
    searchPlaceholder: "Search by title, DOI, discipline or tags…",
    // Browse
    browseSubtitle: "Global Science Presentation Archive",
    browseHeading: "Discover Scientific Presentations",
    browseDesc: "Curated research presentations from all disciplines — each linked to the original paper via DOI.",
    allDisciplines: "All Disciplines",
    allPaperTypes: "All Types",
    paperTypeLabel: "Paper Type",
    paperTypeHint: "Optional",
    paperTypePlaceholder: "Select type… (optional)",
    additionalPapers: "Additional Papers",
    addPaper: "Add scientific paper",
    optional: "optional",
    newest: "Newest first",
    topRated: "Top rated",
    mostDownloaded: "Most downloaded",
    presentations: "Presentations",
    presentation: "Presentation",
    noneFound: "No presentations found",
    noneYet: "No presentations uploaded yet. Be the first!",
    noResults: "No results for the current filters.",
    // Upload
    submissionPortal: "Submission Portal",
    uploadHeading: "Publish to the Archive",
    uploadDesc: "Share your scientific presentation with the global research community.",
    presentationSection: "Presentation",
    titleLabel: "Presentation Title *",
    titleRequired: "Title is required",
    disciplineLabel: "Discipline *",
    disciplineRequired: "Discipline is required",
    disciplinePlaceholder: "Select a discipline…",
    licenseLabel: "License *",
    licenseHint: "Defines how others may use this presentation.",
    licensePlaceholder: "Select a license…",
    licenseRequired: "Please select a license",
    tagsLabel: "Tags",
    tagsHint: "Comma-separated keywords (e.g. Jurassic, carbon cycle, isotopes)",
    fileSection: "File Upload",
    fileLabel: "Upload presentation (pptx, pdf) *",
    fileRequired: "Please upload a file (PPTX or PDF)",
    fileDropHint: "Drop file here or",
    fileSelect: "choose",
    videoLabel: "Video Link (optional)",
    videoHint: "YouTube, Vimeo or any public video link",
    handoutLabel: "Handout (optional)",
    handoutHint: "Additional PDF handout for attendees",
    thumbnailLabel: "Thumbnail (optional)",
    thumbnailHint: "Cover image for the presentation card (JPG, PNG)",
    doiSection: "DOI & Source",
    doiLabel: "DOI of original paper *",
    doiRequired: "DOI is required",
    doiInvalid: "Invalid DOI format (e.g. 10.1073/pnas.2000922117)",
    doiHint: "Format: 10.XXXX/… — The core feature of every PaperHub submission",
    paperTitleLabel: "Original Paper Title",
    paperTitleHint: "Shown next to the DOI in the detail view",
    cancel: "Cancel",
    publish: "Publish to Archive",
    uploading: "Uploading file…",
    publishing: "Publishing…",
    published: "Published to Archive",
    publishedDesc: "Your presentation has been successfully published.",
    pointsEarned: "+50 Knowledge Points for your contribution",
    viewPresentation: "View Presentation",
    backToBrowse: "Back to Browse",
    // Detail
    backToOverview: "Back to overview",
    download: "Download",
    downloadPresentation: "Download Presentation",
    watchVideo: "Watch Video",
    rateThis: "Rate this presentation",
    ratingSaved: "Rating saved ✓",
    ratings: "ratings",
    rating: "rating",
    discussion: "Discussion",
    commentPlaceholder: "Your scientific comment…",
    commentBtn: "Comment",
    noComments: "No comments yet. Start the discussion!",
    signInToRate: "Sign in to rate.",
    signInToComment: "Sign in to comment.",
    sourcesMetadata: "Sources & Metadata",
    doiSource: "DOI — Source",
    originalPaper: "Original Paper",
    discipline: "Discipline",
    videoPres: "Video Presentation",
    openVideo: "Open Video",
    stats: "Statistics",
    downloads: "Downloads",
    avgRating: "Avg. Rating",
    comments: "Comments",
    // Profile
    knowledgePoints: "Knowledge Points",
    publications: "Publications",
    performanceOverview: "Performance Overview",
    myPublications: "My Publications",
    addNew: "+ Add new",
    noPublications: "No presentations published yet.",
    uploadFirst: "Upload your first presentation",
    signOut: "Sign Out",
    // Profile
    roleStudent: "Student",
    roleResearcher: "Researcher",
    universityPlaceholder: "University",
    noThumbnail: "No thumbnail",
    // Detail edit
    editPresentation: "Edit",
    saveChanges: "Save changes",
    changesSaved: "Changes saved!",
    replaceThumbnail: "Replace thumbnail",
    replaceHandout: "Replace handout",
    downloadHandout: "Download Handout",
    comment: "Comment",
    // Keys used in PresentationDetail
    ratingsCount: "ratings",
    commentsCount: "comments",
    anonymous: "Anonymous",
    notFound: "Presentation not found",
    toRate: "to rate.",
    toComment: "to comment.",
    sourcesAndMeta: "Sources & Metadata",
    videoPresentation: "Video Presentation",
    statistics: "Statistics",
  },
  de: {
    // Nav
    discover: "Entdecken",
    upload: "Hochladen",
    profile: "Profil",
    signIn: "Anmelden",
    register: "Registrieren",
    searchPlaceholder: "Titel, DOI, Fachgebiet oder Tags suchen…",
    // Browse
    browseSubtitle: "Globales Wissenschafts-Präsentationsarchiv",
    browseHeading: "Wissenschaftliche Präsentationen entdecken",
    browseDesc: "Kuratierte Forschungspräsentationen aus allen Disziplinen — jede verknüpft mit dem Originalpaper via DOI.",
    allDisciplines: "Alle Fachgebiete",
    allPaperTypes: "Alle Typen",
    paperTypeLabel: "Papertyp",
    paperTypeHint: "Optional",
    paperTypePlaceholder: "Typ auswählen… (optional)",
    additionalPapers: "Weitere Fachartikel",
    addPaper: "Fachartikel hinzufügen",
    optional: "optional",
    newest: "Neueste zuerst",
    topRated: "Höchste Bewertung",
    mostDownloaded: "Meiste Downloads",
    presentations: "Präsentationen",
    presentation: "Präsentation",
    noneFound: "Keine Präsentationen gefunden",
    noneYet: "Noch keine Präsentationen hochgeladen. Sei der Erste!",
    noResults: "Keine Ergebnisse für die aktuellen Filter.",
    // Upload
    submissionPortal: "Einreichungsportal",
    uploadHeading: "Präsentation im Archiv veröffentlichen",
    uploadDesc: "Teilen Sie Ihre wissenschaftliche Präsentation mit der globalen Forschungsgemeinschaft.",
    presentationSection: "Präsentation",
    titleLabel: "Titel der Präsentation *",
    titleRequired: "Titel ist erforderlich",
    disciplineLabel: "Fachgebiet *",
    disciplineRequired: "Fachgebiet ist erforderlich",
    disciplinePlaceholder: "Fachgebiet auswählen…",
    licenseLabel: "Lizenz *",
    licenseHint: "Legt fest, wie andere diese Präsentation nutzen dürfen.",
    licensePlaceholder: "Lizenz wählen…",
    licenseRequired: "Bitte eine Lizenz wählen",
    tagsLabel: "Tags",
    tagsHint: "Kommagetrennte Schlagwörter (z.B. Jurassic, carbon cycle, isotopes)",
    fileSection: "Datei-Upload",
    fileLabel: "Präsentation hochladen (pptx, pdf) *",
    fileRequired: "Bitte laden Sie eine Datei hoch (PPTX oder PDF)",
    fileDropHint: "Datei hier ablegen oder",
    fileSelect: "auswählen",
    videoLabel: "Video-Link (optional)",
    videoHint: "YouTube, Vimeo oder anderer öffentlicher Video-Link",
    handoutLabel: "Handout (optional)",
    handoutHint: "Zusätzliches PDF-Handout für Teilnehmer",
    thumbnailLabel: "Thumbnail (optional)",
    thumbnailHint: "Vorschaubild für die Präsentationskarte (JPG, PNG)",
    doiSection: "DOI & Originalquelle",
    doiLabel: "DOI des Fachartikels *",
    doiRequired: "DOI ist erforderlich",
    doiInvalid: "Ungültiges DOI-Format (z.B. 10.1073/pnas.2000922117)",
    doiHint: "Format: 10.XXXX/... — Das Herzstück jeder PaperHub-Einreichung",
    paperTitleLabel: "Titel des Fachartikels",
    paperTitleHint: "Wird in der Detailansicht neben dem DOI angezeigt",
    cancel: "Abbrechen",
    publish: "Im Archiv veröffentlichen",
    uploading: "Datei wird hochgeladen…",
    publishing: "Wird veröffentlicht…",
    published: "Im Archiv veröffentlicht",
    publishedDesc: "Ihre Präsentation wurde erfolgreich publiziert.",
    pointsEarned: "+50 Knowledge Points für Ihren Beitrag",
    viewPresentation: "Präsentation ansehen",
    backToBrowse: "Zur Übersicht",
    // Detail
    backToOverview: "Zurück zur Übersicht",
    download: "Herunterladen",
    downloadPresentation: "Präsentation herunterladen",
    watchVideo: "Video ansehen",
    rateThis: "Diese Präsentation bewerten",
    ratingSaved: "Bewertung gespeichert ✓",
    ratings: "Bewertungen",
    rating: "Bewertung",
    discussion: "Diskussion",
    commentPlaceholder: "Ihr wissenschaftlicher Kommentar…",
    commentBtn: "Kommentieren",
    noComments: "Noch keine Kommentare. Starten Sie die Diskussion!",
    signInToRate: "Anmelden um zu bewerten.",
    signInToComment: "Anmelden um zu kommentieren.",
    sourcesMetadata: "Quellen & Metadaten",
    doiSource: "DOI des Fachartikels",
    originalPaper: "Originalpaper (Fachartikel)",
    discipline: "Fachgebiet",
    videoPres: "Video-Präsentation",
    openVideo: "Video öffnen",
    stats: "Statistiken",
    downloads: "Downloads",
    avgRating: "Ø Bewertung",
    comments: "Kommentare",
    // Profile
    knowledgePoints: "Wissenspunkte",
    publications: "Veröffentlichungen",
    performanceOverview: "Performance-Übersicht",
    myPublications: "Meine Veröffentlichungen",
    addNew: "+ Neue hinzufügen",
    noPublications: "Noch keine Präsentationen veröffentlicht.",
    uploadFirst: "Erste Präsentation hochladen",
    signOut: "Abmelden",
    // Profile
    roleStudent: "Student",
    roleResearcher: "Forscher",
    universityPlaceholder: "Universität",
    noThumbnail: "Kein Vorschaubild",
    // Detail edit
    editPresentation: "Bearbeiten",
    saveChanges: "Änderungen speichern",
    changesSaved: "Änderungen gespeichert!",
    replaceThumbnail: "Thumbnail ersetzen",
    replaceHandout: "Handout ersetzen",
    downloadHandout: "Handout herunterladen",
    comment: "Kommentieren",
    // Keys used in PresentationDetail
    ratingsCount: "Bewertungen",
    commentsCount: "Kommentare",
    anonymous: "Anonym",
    notFound: "Präsentation nicht gefunden",
    toRate: "um zu bewerten.",
    toComment: "um zu kommentieren.",
    sourcesAndMeta: "Quellen & Metadaten",
    videoPresentation: "Video-Präsentation",
    statistics: "Statistiken",
  },
};

const LanguageContext = createContext({ lang: "en", t: translations.en, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("ph_lang") || "en");

  // Screen readers pick pronunciation from <html lang> (WCAG 3.1.1).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleSetLang = (l) => {
    setLang(l);
    localStorage.setItem("ph_lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], setLang: handleSetLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}