// Packages a presentation as a ZIP with its licence paperwork, records the
// consent, and bumps the download counters. Anonymous downloads are allowed —
// presentations are public.
//
// Two steps, because a mobile browser cannot be handed a file the way a desktop
// one can:
//
//   POST  { presentation_id, mode, deliver: "url" }
//         Records the consent, bumps the counters, and returns a short-lived
//         signed URL. No file in the response.
//   GET   ?t=<token>
//         Verifies the token and streams the ZIP. Writes nothing, so a browser
//         may retry or prefetch it without double-counting a download.
//
// The client then navigates to that URL. Because the response carries
// Content-Disposition: attachment, every browser — iOS Safari included — saves
// it with its own download manager. The previous approach built a Blob and
// clicked a generated <a download>: Chrome on a desktop starts that download
// synchronously, but mobile browsers hand it off asynchronously, so revoking
// the object URL in the same tick killed it. iOS Safari also ignores the
// download attribute on blob: URLs outright.
//
// A POST without `deliver` still answers with the ZIP itself, so anything that
// called this endpoint directly keeps working.

import JSZip from "jszip";
import { getLicenseDetails } from "../../src/lib/licenseDetails.js";
import { blocksDownload } from "../../src/lib/licenseUtils.js";
import { signToken, verifyToken } from "../lib/auth.js";
import { serviceRole } from "../lib/entities.js";
import { readStoredFile } from "../lib/files.js";
import { HttpError, badRequest, forbidden, json, notFound, nowIso, readJson } from "../lib/util.js";

const CC_URLS = {
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  "CC BY-ND 4.0": "https://creativecommons.org/licenses/by-nd/4.0/",
  "CC BY-NC-ND 4.0": "https://creativecommons.org/licenses/by-nc-nd/4.0/",
};

// Long enough for a slow phone to follow the redirect, short enough that a
// leaked URL is worthless. The link grants no more than the public endpoint.
const LINK_TTL_SECONDS = 300;

const dateOnly = (iso) => (iso ? new Date(iso).toISOString().split("T")[0] : "");

async function loadPresentation(env, presentationId) {
  if (!presentationId) throw badRequest("presentation_id required");
  const rows = await serviceRole.list(env, "Presentations", { filter: { id: presentationId }, limit: 1 });
  const presentation = rows[0];
  if (!presentation) throw notFound("Presentation not found");
  // The detail page hides the button for these; refuse here too, so calling
  // the endpoint directly is not a way around it.
  if (blocksDownload(presentation)) {
    throw forbidden("This presentation may not be downloaded under its licence");
  }
  if (!presentation.file_url) throw badRequest("No file available");
  return presentation;
}

/**
 * Builds the ZIP.
 *
 * `actor` is who the paperwork names. On the GET leg it comes from the token
 * rather than the request: a browser navigation carries no Authorization
 * header, so reading the user from the request there would record every
 * signed-in download as "Anonymous".
 */
async function buildZip(env, presentation, { mode, actor, timestamp, licenseId }) {
  const appUrl = (env.APP_URL || "https://paperhub.io").replace(/\/$/, "");
  const uploadYear = presentation.created_date
    ? new Date(presentation.created_date).getFullYear()
    : new Date().getFullYear();
  const uploaderStr = presentation.uploader_name || "Anonymous";
  const license = presentation.license || "Unknown";

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
    `Downloaded by: ${actor.name || "Anonymous"}`,
    `User-ID:       ${actor.id || "n/a"}`,
    `Timestamp:     ${timestamp}`,
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
    paperhub_downloaded_by: actor.id || "anonymous",
    paperhub_download_timestamp: timestamp,
  };

  const zip = new JSZip();

  if (mode === "presentation" || mode === "both") {
    const content = await readStoredFile(env, presentation.file_url);
    // Better a clear error than a ZIP containing a broken file.
    if (!content) throw new HttpError(502, "The presentation file could not be read");
    const ext = presentation.file_url.split(".").pop().split("?")[0] || "pdf";
    zip.file(`presentation.${ext}`, content);
  }

  if ((mode === "handout" || mode === "both") && presentation.handout_url) {
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
      // The link is single-purpose and short-lived; nothing should cache it.
      "Cache-Control": "no-store",
    },
  });
}

/** GET leg: hand over the file for a token the POST leg issued. Writes nothing. */
async function serveSignedLink(request, env) {
  const token = new URL(request.url).searchParams.get("t");
  if (!token) throw badRequest("Missing download token");
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload || payload.purpose !== "download") {
    throw new HttpError(410, "This download link has expired. Please start the download again.");
  }
  const presentation = await loadPresentation(env, payload.pid);
  return buildZip(env, presentation, {
    mode: payload.mode,
    actor: { id: payload.uid || null, name: payload.uname || "Anonymous" },
    timestamp: payload.ts,
    licenseId: payload.lid,
  });
}

export default async function downloadPresentation(request, env, user) {
  if (request.method === "GET") return serveSignedLink(request, env);

  const { presentation_id, mode, deliver } = await readJson(request);
  const presentation = await loadPresentation(env, presentation_id);

  const dlMode = mode || "presentation";
  const downloadTimestamp = nowIso();
  const licenseId = `PH-${presentation.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const actor = { id: user?.id || null, name: user?.full_name || user?.email || "Anonymous" };

  await serviceRole.create(env, "DownloadConsents", {
    presentation_id: presentation.id,
    user_id: user?.id || null,
    user_name: actor.name,
    license: presentation.license || "CC0 1.0",
    download_mode: dlMode,
    timestamp: downloadTimestamp,
  });

  const downloadUpdates = { downloads: (presentation.downloads || 0) + 1 };
  if (dlMode === "handout" || dlMode === "both") {
    downloadUpdates.handout_downloads = (presentation.handout_downloads || 0) + 1;
  }
  await serviceRole.update(env, "Presentations", presentation.id, downloadUpdates);

  if (deliver === "url") {
    const token = await signToken(
      {
        purpose: "download",
        pid: presentation.id,
        mode: dlMode,
        uid: actor.id,
        uname: actor.name,
        ts: downloadTimestamp,
        lid: licenseId,
      },
      env.JWT_SECRET,
      LINK_TTL_SECONDS
    );
    return json({
      download_url: `/api/functions/downloadPresentation?t=${encodeURIComponent(token)}`,
      expires_in: LINK_TTL_SECONDS,
    });
  }

  // Legacy path: answer with the ZIP itself.
  return buildZip(env, presentation, {
    mode: dlMode,
    actor,
    timestamp: downloadTimestamp,
    licenseId,
  });
}
