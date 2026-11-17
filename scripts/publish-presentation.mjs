#!/usr/bin/env node
// Publishes reviewed presentation packages from publish-queue/ to PaperHub through its public API —
// the same calls the upload form makes (login → /api/files ×3 → Presentations.create).
//
// A package is a folder publish-queue/<slug>/ with paperhub-package.json (written by the deck pipeline's
// export step) and the three files it names. The script
//   - checks every file against the SHA-256 in the manifest,
//   - skips DOIs the account has already published (no duplicates on re-runs),
//   - looks the paper's licence up with the site's own lookupPaperLicense and refuses anything that is not
//     CC BY or CC0/public domain (fail closed, like the pipeline's licence policy),
//   - uploads, creates the record, reads it back, and writes published.json next to the manifest.
// Afterwards the three binaries are removed from the folder; the published files live in R2.
//
// Usage:  PAPERHUB_EMAIL=… PAPERHUB_PASSWORD=… node scripts/publish-presentation.mjs [queue-dir]
//         DRY_RUN=1 validates the packages and the licence without uploading anything.

import { createHash } from "node:crypto";
import { readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = (process.env.PAPERHUB_URL || "https://paperhub.io").replace(/\/$/, "");
const QUEUE = process.argv[2] || "publish-queue";
const DRY = process.env.DRY_RUN === "1";
const MANIFEST = "paperhub-package.json";
const MIME = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  handout: "application/pdf",
  thumb: "image/jpeg",
};

const bareDoi = (doi) =>
  String(doi || "").trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");

/** Licences the deck pipeline may republish under CC BY 4.0. */
function licenceAllowed(label) {
  const l = String(label || "").toUpperCase().replace(/[-_]/g, " ");
  if (/\b(NC|ND|SA)\b|NON ?COMMERCIAL|NO ?DERIV|SHARE ?ALIKE/.test(l)) return false;
  return /\bCC ?BY\b|CREATIVE ?COMMONS ATTRIBUTION|\bCC ?0\b|CC ZERO|PUBLIC ?DOMAIN/.test(l);
}

async function api(route, { method = "GET", token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  const response = await fetch(SITE + route, { method, headers, body: json ? JSON.stringify(json) : form });
  const type = response.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof body === "object" ? body.error : String(body).slice(0, 200);
    throw new Error(`${method} ${route} → HTTP ${response.status}: ${message}`);
  }
  return body;
}

async function loadPackage(dir) {
  const manifest = JSON.parse(await readFile(path.join(dir, MANIFEST), "utf8"));
  for (const key of ["doi", "title", "discipline", "presentation_license", "files"]) {
    if (!manifest[key]) throw new Error(`${dir}: ${MANIFEST} lacks ${key}`);
  }
  if (manifest.presentation_license !== "CC BY 4.0") throw new Error(`${dir}: only CC BY 4.0 packages are supported`);
  const files = {};
  for (const key of ["pptx", "handout", "thumb"]) {
    const entry = manifest.files[key];
    if (!entry?.name || !entry?.sha256) throw new Error(`${dir}: manifest entry for ${key} incomplete`);
    if (entry.name !== path.basename(entry.name)) throw new Error(`${dir}: ${key} must be a plain file name`);
    const buffer = await readFile(path.join(dir, entry.name));
    const digest = createHash("sha256").update(buffer).digest("hex");
    if (digest !== entry.sha256) throw new Error(`${dir}: ${entry.name} does not match its reviewed SHA-256`);
    if (buffer.length > 50 * 1024 * 1024) throw new Error(`${dir}: ${entry.name} exceeds 50 MB`);
    files[key] = { name: entry.name, buffer };
  }
  return { manifest, files };
}

async function publish(dir, session) {
  const { manifest, files } = await loadPackage(dir);
  const doi = bareDoi(manifest.doi);
  console.log(`\n▸ ${manifest.title}\n  DOI ${doi}`);

  const licence = await api("/api/functions/lookupPaperLicense", { method: "POST", token: session.token, json: { doi } });
  console.log(`  paper licence: ${licence.license || "not found"} (${licence.source || "–"})`);
  if (!licence.found || !licenceAllowed(licence.license)) {
    throw new Error(`${dir}: paper licence "${licence.license || "unknown"}" does not permit a CC BY republication`);
  }

  const own = await api(
    `/api/entities/Presentations?filter=${encodeURIComponent(JSON.stringify({ created_by_id: session.me.id }))}&limit=500`,
    { token: session.token }
  );
  const existing = own.filter((r) => bareDoi(r.doi) === doi);
  if (existing.length) {
    console.log(`  already published by this account: ${existing.map((r) => r.id).join(", ")} – skipped`);
    return { status: "already_exists", presentation_ids: existing.map((r) => r.id) };
  }
  if (DRY) {
    console.log("  DRY_RUN: package and licence OK, nothing uploaded");
    return { status: "dry_run" };
  }

  const urls = {};
  for (const [key, field] of [["pptx", "file_url"], ["handout", "handout_url"], ["thumb", "thumbnail_url"]]) {
    const form = new FormData();
    form.append("file", new Blob([files[key].buffer], { type: MIME[key] }), files[key].name);
    urls[field] = (await api("/api/files", { method: "POST", token: session.token, form })).file_url;
    console.log(`  uploaded ${files[key].name}`);
  }

  const record = await api("/api/entities/Presentations", {
    method: "POST",
    token: session.token,
    json: {
      title: manifest.title,
      ...urls,
      handout_is_derived: true,
      handout_status: "approved",
      handout_uploaded_at: new Date().toISOString(),
      doi,
      paper_title: manifest.paper_title || manifest.title,
      discipline: manifest.discipline,
      paper_type: manifest.paper_type || undefined,
      extra_papers: [],
      license: manifest.presentation_license,
      tags: manifest.tags || "",
      uploader_university: "",
      ai_generated_content: manifest.ai_generated_content !== false,
      is_author: false,
      authorship_verified: false,
      authorship_method: "unverified",
      authorship_matched_author: null,
      paper_license: licence.license,
      has_nd_restriction: false,
      avg_rating: 0,
      rating_count: 0,
      downloads: 0,
    },
  });

  const [check] = await api(
    `/api/entities/Presentations?filter=${encodeURIComponent(JSON.stringify({ id: record.id }))}&limit=1`,
    { token: session.token }
  );
  if (!check || bareDoi(check.doi) !== doi || check.file_url !== urls.file_url) {
    throw new Error(`${dir}: record ${record.id} could not be verified after creation`);
  }
  const url = `${SITE}/presentation/${record.id}`;
  console.log(`  published: ${url}`);
  return { status: "published", presentation_id: record.id, url };
}

async function main() {
  let entries;
  try {
    entries = await readdir(QUEUE, { withFileTypes: true });
  } catch {
    console.log(`No ${QUEUE}/ folder – nothing to publish.`);
    return;
  }
  const pending = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const dir = path.join(QUEUE, entry.name);
    const done = await stat(path.join(dir, "published.json")).then(() => true, () => false);
    const hasManifest = await stat(path.join(dir, MANIFEST)).then(() => true, () => false);
    if (hasManifest && !done) pending.push(dir);
  }
  if (!pending.length) {
    console.log("Queue is empty – nothing to publish.");
    return;
  }

  // Secrets pasted from a password manager or a note often carry a trailing line break or spaces.
  const rawEmail = process.env.PAPERHUB_EMAIL || "";
  const rawPassword = process.env.PAPERHUB_PASSWORD || "";
  const email = rawEmail.trim();
  const password = rawPassword.replace(/[\r\n]+$/, "");
  if (!email || !password) throw new Error("PAPERHUB_EMAIL and PAPERHUB_PASSWORD must be set (repository secrets)");
  if (email !== rawEmail) console.log("Note: removed spaces/line breaks around PAPERHUB_EMAIL.");
  if (password !== rawPassword) console.log("Note: removed a trailing line break from PAPERHUB_PASSWORD.");
  if (!email.includes("@")) throw new Error("PAPERHUB_EMAIL does not look like an e-mail address");
  let login;
  try {
    login = await api("/api/auth/login", { method: "POST", json: { email, password } });
  } catch (error) {
    if (/HTTP 401/.test(error.message)) {
      throw new Error(
        "PaperHub rejected the login (401). Check that you can sign in on paperhub.io with exactly these " +
          "credentials, then update the PAPERHUB_EMAIL / PAPERHUB_PASSWORD repository secrets." +
          (password !== password.trim() ? " The password starts or ends with a space – intended?" : "")
      );
    }
    throw error;
  }
  const session = { token: login.access_token, me: await api("/api/auth/me", { token: login.access_token }) };
  console.log(`Signed in as ${session.me.full_name || "the PaperHub account"}; ${pending.length} package(s) queued.`);

  let failed = 0;
  for (const dir of pending) {
    try {
      const result = await publish(dir, session);
      if (result.status === "dry_run") continue;
      await writeFile(
        path.join(dir, "published.json"),
        JSON.stringify({ ...result, published_at: new Date().toISOString() }, null, 2) + "\n"
      );
      // The files now live in R2; keep the repository small.
      const manifest = JSON.parse(await readFile(path.join(dir, MANIFEST), "utf8"));
      for (const key of ["pptx", "handout", "thumb"]) await rm(path.join(dir, manifest.files[key].name), { force: true });
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
