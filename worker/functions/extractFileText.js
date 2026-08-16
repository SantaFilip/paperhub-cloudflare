import JSZip from "jszip";
import { readStoredFile } from "../lib/files.js";
import { extractPdfWithClaude } from "../lib/llm.js";

async function extractPptxPartText(zip, partName, relsBase) {
  const xml = await zip.files[partName].async('string');
  const xmlClean = xml.replace(/<p:notes[\s>][\s\S]*?<\/p:notes>/g, '');

  // Hyperlink targets live in the part's .rels file — capture DOI links not in visible text
  const relsName = partName.replace(relsBase, relsBase + '_rels/') + '.rels';
  const hyperlinkTargets = [];
  if (zip.files[relsName]) {
    const relsXml = await zip.files[relsName].async('string');
    const relMatches = [...relsXml.matchAll(/<Relationship\b[^>]*?\bId="([^"]+)"[^>]*?\bTarget="([^"]+)"[^>]*?\bTargetMode="External"/g)];
    for (const rm of relMatches) hyperlinkTargets.push(rm[2]);
  }

  // Join all <a:t> in document order WITHOUT inserting spaces — PowerPoint stores
  // whitespace inside <a:t>; inserting spaces between runs breaks DOIs spanning runs.
  const paragraphs = [];
  const paraMatches = [...xmlClean.matchAll(/<a:p[\s>][\s\S]*?<\/a:p>/g)];
  for (const paraMatch of paraMatches) {
    const paraXml = paraMatch[0];
    const tMatches = [...paraXml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)];
    const paraText = tMatches.map(m => m[1]).join('').trim();
    if (paraText) paragraphs.push(paraText);
  }

  const doiLinks = hyperlinkTargets.filter(u =>
    /doi\.org\/10\./.test(u) || /dx\.doi\.org\/10\./.test(u) || /^10\.\d{4,}\//.test(u)
  );
  return paragraphs.join('\n') + (doiLinks.length ? '\n' + doiLinks.join('\n') : '');
}

async function extractPptxText(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);

  const numSort = (a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(numSort);
  // Speaker notes live in separate files and may contain reference DOIs
  const notesFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
    .sort(numSort);

  const parts = [];
  for (const slideName of slideFiles) {
    parts.push(await extractPptxPartText(zip, slideName, 'ppt/slides/'));
  }
  for (const notesName of notesFiles) {
    parts.push(await extractPptxPartText(zip, notesName, 'ppt/notesSlides/'));
  }
  return { text: parts.join('\n'), pages: slideFiles.length };
}

async function decompressStream(data) {
  // Try deflate (zlib header) first, then deflate-raw
  for (const format of ['deflate', 'deflate-raw']) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      writer.write(data);
      writer.close();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) { out.set(c, offset); offset += c.length; }
      return new TextDecoder('latin1').decode(out);
    } catch {
      // try next format
    }
  }
  return null;
}

async function extractPdfTextFallback(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  const raw = new TextDecoder('latin1').decode(view);

  // Decompress all FlateDecode streams to find text in compressed content
  const textBlocks = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sm;
  const decompressPromises = [];
  while ((sm = streamPattern.exec(raw)) !== null) {
    const streamData = sm[1];
    // Check if the preceding obj has FlateDecode
    const before = raw.slice(Math.max(0, sm.index - 300), sm.index);
    if (before.includes('FlateDecode')) {
      const bytes = new Uint8Array(streamData.length);
      for (let i = 0; i < streamData.length; i++) bytes[i] = streamData.charCodeAt(i) & 0xff;
      decompressPromises.push(decompressStream(bytes));
    }
  }
  const decompressed = await Promise.all(decompressPromises);
  const text = raw + '\n' + decompressed.filter(Boolean).join('\n');

  let match;

  // BT...ET text blocks — extract both Tj (single string) and TJ (array) operators
  const btPattern = /BT[\s\S]*?ET/g;
  while ((match = btPattern.exec(text)) !== null) {
    const block = match[0];
    // Tj operator: (text) Tj
    for (const tjMatch of block.matchAll(/\(([^)]*)\)\s*Tj/g)) {
      textBlocks.push(tjMatch[1]);
    }
    // TJ operator: [(text)(text)...] TJ — extract all string parts
    for (const tjArrMatch of block.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const inner = tjArrMatch[1];
      for (const strMatch of inner.matchAll(/\(([^)]*)\)/g)) {
        textBlocks.push(strMatch[1]);
      }
    }
  }

  // URI link annotations (hyperlinked DOIs)
  const uriPattern = /\/URI\s*\(([^)]+)\)/g;
  while ((match = uriPattern.exec(text)) !== null) {
    textBlocks.push(match[1]);
  }
  // Raw https://doi.org/ strings anywhere in the binary stream
  const rawDoiPattern = /https?:\/\/doi\.org\/10\.[^\s\x00-\x1F\)>]{4,}/g;
  while ((match = rawDoiPattern.exec(text)) !== null) {
    textBlocks.push(match[0]);
  }
  // Bare DOIs (10.xxxx/...) directly in the binary stream (no URL prefix)
  const bareDoiPattern = /\b10\.\d{4,9}\/[^\s\x00-\x1F\)>\]"']{4,}/g;
  while ((match = bareDoiPattern.exec(text)) !== null) {
    textBlocks.push(match[0]);
  }

  const extractedText = textBlocks.join(' ');
  const pageCount = (text.match(/\/Type\s*\/Page[^s]/gi) || []).length || 1;
  return { text: extractedText.length > 10 ? extractedText : '', pages: pageCount };
}

// Image-only PDFs yield nothing to the binary parser — Claude reads those.
// Returns null when no API key is configured, and the caller carries on.
async function extractPdfWithLLM(fileUrl, env) {
  return extractPdfWithClaude(env, fileUrl);
}

async function extractPdfText(arrayBuffer, fileUrl, env) {
  // Run binary extraction and LLM extraction in parallel — always combine both
  const [binaryResult, llmResult] = await Promise.all([
    extractPdfTextFallback(arrayBuffer),
    fileUrl ? extractPdfWithLLM(fileUrl, env) : Promise.resolve(null)
  ]);

  const binaryDois = extractDOIsFromText(binaryResult.text || '');
  const llmDois = llmResult?.extractedDois || [];

  // Merge DOIs from both sources
  const allDois = [...new Set([...binaryDois, ...llmDois])];
  console.log(`Binary: ${binaryDois.length} DOIs, LLM: ${llmDois.length} DOIs, total unique: ${allDois.length}`);

  // Use LLM text if binary text is too short/empty, otherwise use binary text
  const text = (binaryResult.text && binaryResult.text.length > 100)
    ? binaryResult.text
    : (llmResult?.text || binaryResult.text || '');

  return {
    text,
    pages: binaryResult.pages || llmResult?.pages || 0,
    extractedDois: allDois
  };
}


// Find the bibliography section: anchor on the first DOI occurrence (after skipping 15% of text)
// or a known heading — whichever comes first.
function findBibliographySection(text) {
  const headings = [
    'Literaturverzeichnis','Referenzen','Quellen','Quellenverzeichnis',
    'Bibliografie','Bibliographie','Literatur','Weiterführende Literatur',
    'References','Bibliography','Works Cited','Cited Works','Literature','Sources',
  ];
  const headingRe = new RegExp(`\\b(${headings.join('|')})\\b`, 'i');
  const headingMatch = text.match(headingRe);

  const skipChars = Math.floor(text.length * 0.15);
  const doiRe = /(?:https?:\/\/doi\.org\/)?(10\.\d{4,9}\/[^\s"'<>{}|\\^`\[\]]{3,})/;
  const doiMatch = text.slice(skipChars).match(doiRe);
  const doiIndex = doiMatch ? skipChars + doiMatch.index : null;

  let foundAt = null;
  if (headingMatch && (doiIndex === null || headingMatch.index <= doiIndex)) {
    foundAt = headingMatch.index;
  } else if (doiIndex !== null) {
    foundAt = doiIndex;
  }

  if (foundAt !== null) {
    return { bibText: text.slice(foundAt), mainText: text.slice(0, foundAt) };
  }
  return null;
}

// Extract all DOIs from a text block — tolerant regex that handles backslash-escaped chars in raw streams
function extractDOIsFromText(text) {
  // Match both URL-prefixed and bare DOIs; allow backslash in the suffix (raw PDF streams use \\( etc.)
  const re = /(?:https?:\/\/(?:doi\.org|dx\.doi\.org)\/)?(10\.\d{4,9}\/[^\s"'<>{}`\[\]\x00-\x1F]{3,})/g;
  // Join DOIs split across a line break right after the slash (e.g. "10.1038/\nrest")
  const joined = text.replace(/(10\.\d{4,9}\/)\s+/g, '$1');
  // Normalize spaces around DOI delimiters to catch DOIs broken by inline spaces
  // in justified PDF text (e.g. "10 .1016 /j.lithos .2019 .105228")
  const normalized = text.replace(/\s+([./])/g, '$1').replace(/([./])\s+/g, '$1');
  const seen = new Set();
  for (const src of [text, joined, normalized]) {
    for (const m of src.matchAll(re)) {
      // Clean trailing punctuation and escape sequences — trailing : ! ? break CrossRef lookups
      let doi = m[1].replace(/\\+[\(\)\[\]]/g, '').replace(/[.,;:!?)\]}>\\]+$/, '').trim();
      // Strip trailing surname suffixes like ".Miladinova" that get appended when
      // the next reference starts immediately after the DOI (no whitespace separator).
      doi = doi.replace(/\.[A-Z][a-z]{2,}(?:[A-Z][a-z]+)*$/, '');
      if (doi.length >= 7) seen.add(doi);
    }
  }
  return [...seen];
}

// Given a DOI found in the bibliography text, extract the surrounding entry lines (~500 chars)
function getEntryContextForDOI(bibText, doi) {
  const escapedDoi = doi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:https?:\\/\\/doi\\.org\\/)?${escapedDoi}`);
  const m = bibText.match(re);
  if (!m) return bibText.slice(0, 500);
  const idx = m.index;
  // Take up to 600 chars before and 200 after the DOI occurrence as context
  return bibText.slice(Math.max(0, idx - 600), idx + 200);
}

// Search bibliography for entries that have no DOI (after known DOIs are excluded)
function extractNonDoiEntries(bibText, knownDois) {
  const knownTitles = new Set();
  const entries = [];
  const seen = new Set();

  // Pattern: numbered [N] or bullet, Author (Year). Title.
  const entryRe = /(?:^\s*\[?\d+\]?\s+|^[-•]\s+)?([A-ZÄÖÜ][A-Za-zäöüÄÖÜß'\-,&\s.]{2,60?}?)[,.]?\s+\((\d{4}[a-z]?)\)[,.]?\s+([A-Z][^.!?\n]{15,200})[.!?]/gm;
  let m;
  while ((m = entryRe.exec(bibText)) !== null) {
    const author = m[1].trim();
    const year = parseInt(m[2]);
    const title = m[3].trim();
    if (!/^(References|Bibliography|Sources|Quellen)/i.test(title) && year >= 1950 && year <= 2030 && title.length >= 15) {
      const key = `${year}|${title.slice(0, 40).toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ author, year, title, doiInEntry: null });
      }
    }
  }
  return entries;
}

// Fallback metadata sources for DOIs that CrossRef doesn't know (e.g. ResearchGate 10.13140/RG.2.2.*)
async function fetchDOIMetadataFallback(doi) {
  // DataCite — registrar for DOIs CrossRef doesn't cover (ResearchGate 10.13140/RG.*, datasets, etc.)
  try {
    const resp = await fetch(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`);
    if (resp.ok) {
      const data = await resp.json();
      const attrs = data?.data?.attributes || {};
      const titleObj = (attrs.titles || [])[0];
      const title = titleObj?.title || null;
      if (title) {
        const authors = (attrs.creators || []).slice(0, 2).map(c => c.name).filter(Boolean).join(", ");
        return { title, authors, year: attrs.publicationYear || null };
      }
    }
  } catch {}
  // Unpaywall — has title/year for many DOIs missing from CrossRef
  try {
    const resp = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=paperhub@paperhub.io`);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.title) {
        const authors = (data?.z_authors || []).slice(0, 2).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
        return { title: data.title, authors, year: data?.year || null };
      }
    }
  } catch {}
  // Semantic Scholar — has title/authors/year
  try {
    const resp = await fetch(`https://api.semanticscholar.org/graph/v1/paper/doi:${encodeURIComponent(doi)}?fields=title,authors,year`);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.title) {
        const authors = (data?.authors || []).slice(0, 2).map(a => a.name).filter(Boolean).join(", ");
        return { title: data.title, authors, year: data?.year || null };
      }
    }
  } catch {}
  return null;
}

// Query all 3 sources (CrossRef → Unpaywall → Semantic Scholar) for title/authors/year.
// License is resolved separately via fetchLicenseParallel which already uses all sources.
async function fetchDOIMetadata(doi) {
  try {
    const resp = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { "User-Agent": "PaperHub/1.0 (mailto:paperhub@example.com)" }
    });
    if (resp.ok) {
      const msg = (await resp.json()).message;
      const title = msg.title?.[0] || null;
      const authors = (msg.author || []).slice(0, 2).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
      const year = msg.issued?.["date-parts"]?.[0]?.[0] || null;
      if (title) return { doi, title, authors, year };
      // CrossRef has the record but no title — try fallback sources for the title
      const fb = await fetchDOIMetadataFallback(doi);
      if (fb?.title) return { doi, title: fb.title, authors: authors || fb.authors, year: year || fb.year };
      return { doi, title: null, authors, year };
    }
  } catch {}
  // CrossRef has no record at all — use fallback sources
  const fb = await fetchDOIMetadataFallback(doi);
  if (fb?.title) return { doi, title: fb.title, authors: fb.authors, year: fb.year };
  return { doi, title: null, authors: "", year: null };
}

function classifyLicense(url) {
  if (!url) return "unknown";
  if (url.includes("creativecommons.org/publicdomain") || url.includes("cc0")) return "open";
  if (url.includes("creativecommons.org/licenses/by/") && !url.includes("nc") && !url.includes("nd")) return "open";
  if (url.includes("creativecommons.org/licenses/by-sa") && !url.includes("nc") && !url.includes("nd")) return "open";
  if (url.includes("creativecommons.org/licenses/by-nc")) return "conditional";
  if (url.includes("creativecommons.org/licenses/by-nd") || url.includes("creativecommons.org/licenses/by-nc-nd")) return "restricted";
  if (url.includes("elsevier") || url.includes("springer") || url.includes("wiley") || url.includes("nature.com")) return "restricted";
  return "restricted";
}

// Fallback classification when CrossRef has the record but no explicit license array.
// Many publishers (Elsevier, Springer, Wiley, …) don't deposit license URLs to CrossRef,
// leaving all 3 sources without a classification → "unclear". This heuristic uses the
// publisher field to at least flag known paywalled vs. known open-access publishers.
function classifyByPublisher(publisher) {
  if (!publisher) return null;
  const p = publisher.toLowerCase();
  // Known Open Access publishers
  if (p.includes("frontiers") || p.includes("plos") || p.includes("mdpi") || p.includes("bmc") || p.includes("biomed central")) return "open";
  // Known paywalled publishers → restricted
  if (p.includes("elsevier") || p.includes("springer") || p.includes("wiley") || p.includes("taylor") || p.includes("francis") || p.includes("oxford university") || p.includes("cambridge university") || p.includes("nature") || p.includes("american geophysical union") || p.includes(" agu") || p.includes("ieee") || p.includes("sage") || p.includes("royal society of chemistry") || p.includes("rsc")) return "restricted";
  return null;
}

// Classify OpenAlex license field values (e.g. "cc-by", "cc-by-nc", "cc0")
function classifyOpenAlexLicense(lic) {
  if (!lic) return null;
  const l = lic.toLowerCase();
  if (l === "cc0") return "open";
  if (l === "cc-by") return "open";
  if (l === "cc-by-sa") return "open";
  if (l === "cc-by-nc" || l === "cc-by-nc-sa") return "conditional";
  if (l === "cc-by-nd" || l === "cc-by-nc-nd") return "restricted";
  return null;
}

async function fetchLicenseParallel(doi, controller) {
  if (!doi) return { status: "unknown", license: null, sources: [] };
  
  // Restriktivitäts-Reihenfolge (restrictive → offen)
  // unknown = 0: unbekannte Lizenz ist am restriktivsten (worst-case)
  // conditional (CC BY-NC) fehlte zuvor komplett → würde sonst auf 0 fallen
  const restrictivenesMap = {
    unknown: 0,
    proprietary: 1,
    restricted: 1,
    conditional: 2,
    green_oa: 3,
    open: 4
  };
  
  const queryAllSources = async () => {
    const results = [];
    
    // DOI Content Negotiation with CSL-JSON — publisher-served metadata that often
    // carries a license URL not deposited in CrossRef or Unpaywall.
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const fetchPromise = fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
        headers: { "Accept": "application/vnd.citationstyles.csl+json", "User-Agent": "PaperHub/1.0" },
        signal: controller.signal,
        redirect: "follow"
      });
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        const lic = data?.license || data?.["license-url"];
        if (lic) {
          const url = typeof lic === "string" ? lic : (lic.URL || lic.url || "");
          results.push({
            source: "DOI CSL-JSON",
            status: "found",
            license: url,
            classification: classifyLicense(url)
          });
        } else {
          results.push({ source: "DOI CSL-JSON", status: "no_license" });
        }
      }
    } catch {
      results.push({ source: "DOI CSL-JSON", status: "failed" });
    }
    
    // CrossRef (official publisher registry)
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const fetchPromise = fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
        headers: { "User-Agent": "PaperHub/1.0" },
        signal: controller.signal
      });
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      if (resp.ok) {
        const data = await resp.json();
        const licenses = data?.message?.license || [];
        if (licenses.length > 0) {
          // Scan ALL deposited license URLs, prefer Creative Commons over
          // TDM/publisher-specific URLs (Elsevier deposits both CC-BY and TDM).
          let bestUrl = null;
          for (const l of licenses) {
            const url = l.URL || "";
            if (!url) continue;
            const cls = classifyLicense(url);
            if (cls === "open" || cls === "conditional") { bestUrl = url; break; }
            if (!bestUrl) bestUrl = url;
          }
          results.push({
            source: "CrossRef",
            status: "found",
            license: bestUrl,
            classification: classifyLicense(bestUrl)
          });
        } else {
          // No explicit license deposited — classify by publisher as fallback
          const pubClass = classifyByPublisher(data?.message?.publisher);
          if (pubClass) {
            results.push({ source: "CrossRef", status: "found", license: `publisher:${data.message.publisher}`, classification: pubClass });
          } else {
            results.push({ source: "CrossRef", status: "no_license" });
          }
        }
      }
    } catch {
      results.push({ source: "CrossRef", status: "failed" });
    }
    
    // Unpaywall — use oa_status, NOT just is_oa. "bronze" means free-to-read with
    // NO license granting reuse rights → must be treated as restricted, not open.
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const fetchPromise = fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=paperhub@paperhub.io`, {
        signal: controller.signal
      });
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      if (resp.ok) {
        const data = await resp.json();
        const oaStatus = data?.oa_status;
        if (oaStatus === "gold" || oaStatus === "hybrid" || oaStatus === "green") {
          results.push({
            source: "Unpaywall",
            status: "found",
            isOpenAccess: true,
            oaStatus,
            hostType: data?.best_oa_location?.host_type || "unknown",
            classification: "open"
          });
        } else if (oaStatus === "bronze") {
          // Free to read on publisher page, but NO license → reuse not granted
          results.push({
            source: "Unpaywall",
            status: "found",
            isOpenAccess: true,
            oaStatus: "bronze",
            classification: "restricted"
          });
        } else {
          results.push({ source: "Unpaywall", status: "not_oa", oaStatus: oaStatus || "closed" });
        }
      }
    } catch {
      results.push({ source: "Unpaywall", status: "failed" });
    }
    
    // Semantic Scholar (preprint & OA detection)
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const fetchPromise = fetch(`https://api.semanticscholar.org/graph/v1/paper/doi:${encodeURIComponent(doi)}?fields=openAccessPdf`, {
        signal: controller.signal
      });
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.openAccessPdf?.url) {
          results.push({
            source: "Semantic Scholar",
            status: "found",
            openAccessPdf: true,
            classification: "open"
          });
        } else {
          results.push({ source: "Semantic Scholar", status: "no_pdf" });
        }
      }
    } catch {
      results.push({ source: "Semantic Scholar", status: "failed" });
    }

    // OpenAlex — broad coverage, explicit license field + oa_status
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const fetchPromise = fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`, {
        headers: { "User-Agent": "PaperHub/1.0 (mailto:paperhub@paperhub.io)" },
        signal: controller.signal
      });
      const resp = await Promise.race([fetchPromise, timeoutPromise]);
      if (resp.ok) {
        const data = await resp.json();
        const lic = data?.license;
        const oaStatus = data?.open_access?.oa_status;
        const classification = classifyOpenAlexLicense(lic);
        if (classification) {
          results.push({ source: "OpenAlex", status: "found", license: lic, oaStatus, classification });
        } else if (oaStatus === "gold" || oaStatus === "hybrid" || oaStatus === "green") {
          results.push({ source: "OpenAlex", status: "found", oaStatus, classification: "open" });
        } else {
          results.push({ source: "OpenAlex", status: "no_license", oaStatus: oaStatus || "closed" });
        }
      }
    } catch {
      results.push({ source: "OpenAlex", status: "failed" });
    }

    return results;
  };
  
  const sources = await queryAllSources();
  
  // Analysiere Konsistenz und bestimme Ergebnis
  const foundResults = sources.filter(s => s.status === "found");

  // Trenne echte Lizenz-Stimmen von reinen Zugangs-Indikatoren.
  // Eine Quelle stimmt nur bei, wenn sie eine explizite Lizenz-URL oder ein
  // explizites Lizenz-Feld meldet — NICHT wenn sie nur „free to read" signalisiert
  // (green OA, openAccessPdf).  publisher:… ist eine Heuristik, keine echte Lizenz.
  const hasLicenseVote = (s) =>
    s.license && !(typeof s.license === "string" && s.license.startsWith("publisher:"));
  const licenseVotes = foundResults.filter(hasLicenseVote);
  const classifications = licenseVotes.map(s => s.classification).filter(c => c);

  // CASE 1: Exactly one license source voted → trust it directly
  if (classifications.length === 1) {
    return {
      status: classifications[0],
      clarity: "clear",
      license: licenseVotes.find(s => s.license)?.license || null,
      sources,
      isConsistent: true,
      consistencyScore: `${licenseVotes.length}/${sources.length} Quellen`
    };
  }

  // CASE 1b: No explicit license source voted → UNKLAR
  // (access indicators like green OA say „free to read", NOT „free to reuse")
  if (classifications.length === 0) {
    return {
      status: "unclear",
      clarity: "unclear",
      license: null,
      sources,
      consistencyScore: `${licenseVotes.length}/${sources.length} Quellen`
    };
  }

  // Prüfe auf Konsistenz (nur unter echten Lizenz-Stimmen)
  const uniqueClassifications = [...new Set(classifications)];
  const isConsistent = uniqueClassifications.length === 1;

  // CASE 2: Konsistent → eindeutige Antwort
  if (isConsistent) {
    const leastRestrictive = classifications[0];
    return {
      status: leastRestrictive,
      clarity: "clear",
      license: licenseVotes.find(s => s.license)?.license || null,
      sources,
      isConsistent: true,
      consistencyScore: `${licenseVotes.length}/${sources.length} Quellen`,
      classifications: uniqueClassifications
    };
  }

  // CASE 3: Inkonsistent — zwei echte Lizenz-Quellen widersprechen sich → AMBIGUOUS
  const maxRestriveness = Math.max(...classifications.map(c => restrictivenesMap[c] || 0));
  const leastRestrictive = Object.entries(restrictivenesMap).find(
    ([_, v]) => v === maxRestriveness
  )?.[0] || "unknown";

  const hasRestricted = classifications.includes("restricted");
  const hasOpen = classifications.includes("open");
  const isMixedDanger = hasRestricted && hasOpen;

  return {
    status: leastRestrictive,
    clarity: "ambiguous",
    license: licenseVotes.find(s => s.license)?.license || null,
    sources,
    isConsistent: false,
    consistencyScore: `${licenseVotes.length}/${sources.length} Quellen`,
    isMixedDanger,
    classifications: uniqueClassifications
  };
}

async function resolveDOI(doi) {
  const meta = await fetchDOIMetadata(doi);
  const licenseController = new AbortController();
  setTimeout(() => licenseController.abort(), 15000);
  const licenseInfo = await fetchLicenseParallel(doi, licenseController);
  return {
    doi,
    title: meta.title || doi,
    authors: meta.authors || "",
    year: meta.year || null,
    status: licenseInfo.status,
    license: licenseInfo.license,
    isConsistent: licenseInfo.isConsistent,
    isMixedDanger: licenseInfo.isMixedDanger,
    clarity: licenseInfo.clarity,
  };
}

async function resolveNonDoiEntry(entry) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(`${entry.title} ${entry.year}`)}&rows=5`,
      { headers: { "User-Agent": "PaperHub/1.0 (mailto:paperhub@example.com)" }, signal: controller.signal }
    );
    if (!resp.ok) return { authors: entry.author, year: entry.year, title: entry.title, doi: null, status: "not_found" };
    const data = await resp.json();
    const items = data.message?.items || [];
    let bestMatch = null;
    for (const item of items) {
      const y = item.issued?.["date-parts"]?.[0]?.[0];
      if (y && Math.abs(y - entry.year) <= 1) { bestMatch = item; break; }
    }
    if (!bestMatch && items.length > 0) {
      const y = items[0].issued?.["date-parts"]?.[0]?.[0];
      if (y && Math.abs(y - entry.year) <= 2) bestMatch = items[0];
    }
    if (!bestMatch) return { authors: entry.author, year: entry.year, title: entry.title, doi: null, status: "not_found" };

    const doi = bestMatch.DOI || null;
    const resolvedTitle = bestMatch.title?.[0] || entry.title;
    const resolvedAuthors = (bestMatch.author || []).slice(0, 2).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
    const resolvedYear = bestMatch.issued?.["date-parts"]?.[0]?.[0] || entry.year;
    if (!doi) return { authors: resolvedAuthors, year: resolvedYear, title: resolvedTitle, doi: null, status: "not_found" };

    const licenseController = new AbortController();
    setTimeout(() => licenseController.abort(), 15000);
    const licenseInfo = await fetchLicenseParallel(doi, licenseController);
    return { doi, title: resolvedTitle, authors: resolvedAuthors, year: resolvedYear,
      status: licenseInfo.status, license: licenseInfo.license,
      isConsistent: licenseInfo.isConsistent, isMixedDanger: licenseInfo.isMixedDanger, clarity: licenseInfo.clarity };
  } catch {
    return { authors: entry.author, year: entry.year, title: entry.title, doi: null, status: "error" };
  }
}

export default async function extractFileText(request, env, user) {
  try {

    const { file_url, file_type } = await request.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const arrayBuffer = await readStoredFile(env, file_url);
    if (!arrayBuffer) return Response.json({ error: 'Could not read the file' }, { status: 400 });

    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
      return Response.json({ error: 'File too large (>50MB)' }, { status: 413 });
    }

    // Detect file type: prefer explicit file_type hint, then URL, then magic bytes
    const urlLower = file_url.toLowerCase();
    let isPptx = file_type === 'pptx' || urlLower.includes('.pptx');
    let isPdf = file_type === 'pdf' || urlLower.includes('.pdf');
    if (!isPptx && !isPdf) {
      // Magic bytes: PDF starts with %PDF, PPTX/ZIP starts with PK\x03\x04
      const header = new Uint8Array(arrayBuffer.slice(0, 4));
      if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) isPdf = true;
      else if (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) isPptx = true;
    }
    if (!isPdf && !isPptx) {
      return Response.json({ error: 'Only PDF and PPTX files are supported' }, { status: 400 });
    }

    // Step 1: Extract full text
    let fullText, pages, llmDois = [];
    try {
      const result = isPptx
        ? await extractPptxText(arrayBuffer)
        : await extractPdfText(arrayBuffer, file_url, env);
      fullText = result.text || '';
      pages = result.pages || 0;
      llmDois = result.extractedDois || [];
      if (!fullText || fullText.trim().length === 0) {
        if (llmDois.length === 0) return Response.json({ text: '', pages: 0, references: [] });
        // LLM found DOIs but no text — proceed with just the DOIs
        fullText = llmDois.join(' ');
      }
    } catch (extractErr) {
      console.error('Text extraction error:', extractErr.message);
      throw extractErr;
    }

    // Step 2: Extract DOIs directly from the full text + any LLM-extracted DOIs
    // Strip null bytes and control chars that break regex matching in binary PDF streams.
    const safeText = fullText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').slice(0, 500000);
    const allDoisSet = new Set([...extractDOIsFromText(safeText), ...llmDois]);
    const allDois = [...allDoisSet];
    console.log(`Found ${allDois.length} DOIs, resolving licenses...`);

    // Step 4: Resolve all DOIs in parallel — CrossRef gives us title, authors, year, license
    const doiResults = await Promise.all(allDois.slice(0, 80).map(doi => resolveDOI(doi)));

    // Step 5: Build set of known DOI-covered titles to avoid duplicates in the next pass
    const coveredDois = new Set(doiResults.map(r => r.doi).filter(Boolean));

    // Step 6: Scan for entries WITHOUT a DOI (only on readable text, skip binary blobs)
    const bibSection = findBibliographySection(safeText);
    const bibText = bibSection ? bibSection.bibText : safeText;
    const nonDoiEntries = extractNonDoiEntries(bibText, coveredDois).slice(0, 50);
    console.log(`Found ${nonDoiEntries.length} non-DOI entries to resolve`);

    // Resolve non-DOI entries in chunks
    const nonDoiResults = [];
    for (let i = 0; i < nonDoiEntries.length; i += 10) {
      const chunk = nonDoiEntries.slice(i, i + 10);
      const results = await Promise.all(chunk.map(entry => resolveNonDoiEntry(entry)));
      nonDoiResults.push(...results);
    }

    // Step 7: Combine, deduplicate by DOI
    const seenDois = new Set();
    const references = [];
    for (const r of [...doiResults, ...nonDoiResults]) {
      const key = r.doi || null;
      if (key && seenDois.has(key)) continue;
      if (key) seenDois.add(key);
      references.push(r);
    }

    return Response.json({ text: fullText, pages, references });
  } catch (error) {
    console.error('Function error:', error.message);
    return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
