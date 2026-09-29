// Packages a presentation as a ZIP with its licence paperwork, records the
// consent, and bumps the download counters. Anonymous downloads are allowed —
// presentations are public.

import JSZip from "jszip";
import { getLicenseDetails } from "../../src/lib/licenseDetails.js";
import { serviceRole } from "../lib/entities.js";
import { readStoredFile } from "../lib/files.js";
import { HttpError, badRequest, notFound, nowIso, readJson } from "../lib/util.js";

const CC_URLS = {
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "CC BY-ND 4.0": "https://creativecommons.org/licenses/by-nd/4.0/",
  "CC BY-NC-ND 4.0": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
};

const dateOnly = (iso) => (iso ? new Date(iso).toISOString().split("T")[0] : "");

export default async function downloadPresentation(request, env, user) {
  const { presentation_id, mode } = await readJson(request);
  if (!presentation_id) throw badRequest("presentation_id required");

  const rows = await serviceRole.list(env, "Presentations", { filter: { id: presentation_id }, limit: 1 });
  const presentation = rows[0];
  if (!presentation) throw notFound("Presentation not found");
  if (!presentation.file_url) throw badRequest("No file available");

  const dlMode = mode || "presentation";
  const appUrl = (env.APP_URL || "https://paperhub.io").replace(/\/$/, "");
  const downloadTimestamp = nowIso();

  await serviceRole.create(env, "DownloadConsents", {
    presentation_id: presentation.id,
    user_id: user?.id || null,
    user_name: user?.full_name || user?.email || "Anonymous",
    license: presentation.license || "CC0 1.0",
    download_mode: dlMode,
    timestamp: downloadTimestamp,
  });

  const downloadUpdates = { downloads: (presentation.downloads || 0) + 1 };
  if (dlMode === "handout" || dlMode === "both") {
    downloadUpdates.handout_downloads = (presentation.handout_downloads || 0) + 1;
  }
  await serviceRole.update(env, "Presentations", presentation.id, downloadUpdates);

  // --- licence paperwork ---

  const uploadYear = presentation.created_date
    ? new Date(presentation.created_date).getFullYear()
    : new Date().getFullYear();
  const uploaderStr = presentation.uploader_name || "Anonymous";
  const license = presentation.license || "Unknown";
  const licenseId = `PH-${presentation.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  // The full terms travel with the file, in both site languages, so the licence
  // stays attached to the download and not only to the preview page.
  const termsBlock = (lang) => {
    const d = getLicenseDetails(license, lang);
    if (!d) return [];
    const de = lang === "de";
    return [
      `${license} — ${d.title}`,
      ...(d.allows.length ? [de ? `Erlaubt:` : `Permitted:`, ...d.allows.map((a) => `  + ${a}`)] : []),
      ...(d.conditions.length ? [de ? `Bedingungen:` : `Conditions:`, ...d.conditions.map((c) => `  - ${c}`)] : []),
      ...(d.note ? [d.note] : []),
      d.url ? `${de ? "Vollständiger Lizenztext" : "Full legal code"}: ${d.url}` : "",
      ``,
    ];
  };

  const licenseText = [
    `LICENSE`,
    `=======`,
    ``,
    `Title:     ${presentation.title}`,
    `Author:    ${uploaderStr}`,
    `License:   ${license}`,
    `Permalink: https://doi.org/${presentation.doi}`,
    `Source:    PaperHub — ${appUrl}`,
    `Date:      ${dateOnly(presentation.created_date)}`,
    ``,
    license === "CC0 1.0"
      ? `This work has been dedicated to the Public Domain. No rights reserved.`
      : license === "All Rights Reserved"
      ? `All rights reserved. No reuse without explicit written permission from the author.`
      : `This work is licensed under ${license}.`,
    ``,
    license !== "All Rights Reserved" && license !== "CC0 1.0"
      ? `When using this work, please credit:\n"${uploaderStr}" (${uploadYear}) via PaperHub — ${license}`
      : ``,
    ``,
    `LICENSE TERMS`,
    `-------------`,
    ...termsBlock("en"),
    `LIZENZBEDINGUNGEN`,
    `-----------------`,
    ...termsBlock("de"),
    presentation.ai_generated_content
      ? `AI NOTICE: The uploader declared that this presentation contains AI-generated content.`
      : ``,
  ].join("\n");

  const noticeText = [
    `NOTICE — Licensed via PaperHub`,
    `================================`,
    ``,
    `License-ID:    ${licenseId}`,
    `Title:         ${presentation.title}`,
    `License:       ${license}`,
    license === "All Rights Reserved"
      ? `RESTRICTED USE — No redistribution without author permission.`
      : license === "CC0 1.0"
      ? `PUBLIC DOMAIN — Free to use without restriction.`
      : `Licensed under ${license}. Attribution required.`,
    ``,
    `--- Download Record ---`,
    `Downloaded by: ${user ? user.full_name || user.email || user.id : "Anonymous"}`,
    `User-ID:       ${user?.id || "n/a"}`,
    `Timestamp:     ${downloadTimestamp}`,
    ``,
    `This record serves as proof of license acceptance.`,
    `PaperHub — ${appUrl}`,
  ].join("\n");

  const metadata = {
    "@context": "https://schema.org",
    "@type": "PresentationDigitalDocument",
    name: presentation.title,
    author: { "@type": "Person", name: uploaderStr },
    license: CC_URLS[license] || license,
    about: presentation.paper_title || presentation.title,
    identifier: `https://doi.org/${presentation.doi}`,
    datePublished: dateOnly(presentation.created_date),
    keywords: presentation.tags || "",
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "PaperHub" },
    paperhub_license_id: licenseId,
    paperhub_downloaded_by: user?.id || "anonymous",
    paperhub_download_timestamp: downloadTimestamp,
  };

  // --- ZIP ---

  const zip = new JSZip();

  if (dlMode === "presentation" || dlMode === "both") {
    const content = await readStoredFile(env, presentation.file_url);
    // Better a clear error than a ZIP containing a broken file.
    if (!content) throw new HttpError(502, "The presentation file could not be read");
    const ext = presentation.file_url.split(".").pop().split("?")[0] || "pdf";
    zip.file(`presentation.${ext}`, content);
  }

  if ((dlMode === "handout" || dlMode === "both") && presentation.handout_url) {
    const handout = await readStoredFile(env, presentation.handout_url);
    if (!handout) throw new HttpError(502, "The handout file could not be read");
    zip.file("handout.pdf", handout);
    zip.file(
      "HANDOUT_LICENSE.txt",
      [
        `HANDOUT: ${presentation.title}`,
        `LICENSE: ${presentation.handout_license || license}`,
        `AUTHOR: ${uploaderStr}`,
        `UPLOAD DATE: ${dateOnly(presentation.handout_uploaded_at)}`,
        `SOURCE: PaperHub (${appUrl})`,
        ``,
        `PAPER INFORMATION:`,
        `- Title: ${presentation.paper_title || ""}`,
        `- DOI: ${presentation.doi || ""}`,
        ``,
        presentation.handout_is_derived ? `ORIGINAL PRESENTATION:` : "",
        presentation.handout_is_derived ? `- Derived from presentation ID: ${presentation.id}` : "",
        ``,
        `LICENSE TERMS:`,
        `This handout is shared under ${presentation.handout_license || license} license.`,
      ].join("\n")
    );
  }

  zip.file("LICENSE.txt", licenseText);
  zip.file("NOTICE.txt", noticeText);
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  const baseName = presentation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baseName}.zip"`,
    },
  });
}
