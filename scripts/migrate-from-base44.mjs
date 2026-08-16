#!/usr/bin/env node
// Imports a Base44 export into D1 + R2.
//
//   node scripts/migrate-from-base44.mjs            # dry run, writes SQL only
//   node scripts/migrate-from-base44.mjs --apply    # uploads files + applies SQL
//   node scripts/migrate-from-base44.mjs --apply --local
//
// Expects one JSON file per entity in ./data (an array of records as exported
// from Base44): User.json, Presentations.json, Comments.json, Ratings.json,
// DownloadConsents.json, AuthorshipAuditLog.json.
//
// Files referenced by media.base44.com URLs are downloaded, re-uploaded to R2,
// and the stored URLs are rewritten to /files/... on the new domain. Passwords
// are not exportable from Base44 — imported users must use "forgot password"
// once to set one.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

const APPLY = process.argv.includes("--apply");
const LOCAL = process.argv.includes("--local");
const DATA_DIR = "data";
const CACHE_DIR = join(DATA_DIR, "files");
const SQL_OUT = join(DATA_DIR, "import.sql");
const BUCKET = "paperhub-files";
const APP_URL = (process.env.APP_URL || "https://paperhub.io").replace(/\/$/, "");

const bool = (v) => (v ? 1 : 0);
const nowIso = () => new Date().toISOString();

// R2 stores no content type unless we pass one, and the browser needs it to
// render thumbnails inline rather than downloading them.
const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
};

const sql = (value) => {
  if (value === undefined || value === null || value === "") return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(bool(value));
  return `'${String(value).replace(/'/g, "''")}'`;
};

function load(entity) {
  const path = join(DATA_DIR, `${entity}.json`);
  if (!existsSync(path)) {
    console.warn(`- ${entity}: no export found, skipping`);
    return [];
  }
  const records = JSON.parse(readFileSync(path, "utf8"));
  console.log(`- ${entity}: ${records.length} records`);
  return records;
}

// --- file migration ----------------------------------------------------------

const uploadedUrls = new Map();

async function migrateFile(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  if (!url.includes("base44")) return url; // already ours, or an external link
  if (uploadedUrls.has(url)) return uploadedUrls.get(url);

  const ext = extname(new URL(url).pathname) || "";
  const key = `uploads/legacy/${basename(new URL(url).pathname, ext)}${ext}`;
  const newUrl = `${APP_URL}/files/${key}`;

  if (APPLY) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const localPath = join(CACHE_DIR, key.replace(/\//g, "_"));
    if (!existsSync(localPath)) {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`  ! download failed (${response.status}): ${url}`);
        return url; // leave the old URL rather than pointing at nothing
      }
      writeFileSync(localPath, Buffer.from(await response.arrayBuffer()));
    }
    const contentType = CONTENT_TYPES[ext.toLowerCase()] || "application/octet-stream";
    execFileSync(
      "npx",
      [
        "wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
        "--file", localPath,
        "--content-type", contentType,
        ...(LOCAL ? ["--local"] : ["--remote"]),
      ],
      { stdio: "inherit", shell: process.platform === "win32" }
    );
  }

  uploadedUrls.set(url, newUrl);
  return newUrl;
}

// --- row builders ------------------------------------------------------------

function insert(table, row) {
  const cols = Object.keys(row);
  return `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => sql(row[c])).join(", ")});`;
}

const envelope = (r) => ({
  id: r.id,
  created_by_id: r.created_by_id ?? null,
  created_by: r.created_by ?? null,
  created_date: r.created_date || nowIso(),
  updated_date: r.updated_date || r.created_date || nowIso(),
});

async function main() {
  console.log(`Reading Base44 export from ./${DATA_DIR}`);
  const users = load("User");
  const presentations = load("Presentations");
  const comments = load("Comments");
  const ratings = load("Ratings");
  const consents = load("DownloadConsents");
  const auditLog = load("AuthorshipAuditLog");

  const statements = ["PRAGMA foreign_keys=OFF;"];

  for (const u of users) {
    statements.push(
      insert("users", {
        id: u.id,
        email: (u.email || "").toLowerCase(),
        password_hash: null, // not exportable — user must reset once
        full_name: u.full_name ?? null,
        email_verified: 1, // they were verified on Base44
        is_admin: bool(u.role === "admin"),
        role: ["student", "researcher", "lecturer"].includes(u.role) ? u.role : "student",
        university: u.university ?? null,
        points: u.points ?? 0,
        orcid_id: u.orcid_id ?? null,
        username: u.username ?? null,
        profile_visible: bool(u.profile_visible !== false),
        created_date: u.created_date || nowIso(),
        updated_date: u.updated_date || u.created_date || nowIso(),
      })
    );
  }

  for (const p of presentations) {
    statements.push(
      insert("presentations", {
        ...envelope(p),
        title: p.title,
        file_url: await migrateFile(p.file_url),
        video_url: p.video_url ?? null,
        handout_url: await migrateFile(p.handout_url),
        handout_license: p.handout_license ?? null,
        handout_status: p.handout_status ?? null,
        handout_is_derived: bool(p.handout_is_derived),
        handout_downloads: p.handout_downloads ?? 0,
        handout_uploaded_at: p.handout_uploaded_at ?? null,
        handout_uploaded_by: p.handout_uploaded_by ?? null,
        thumbnail_url: await migrateFile(p.thumbnail_url),
        doi: p.doi,
        paper_title: p.paper_title ?? null,
        paper_license: p.paper_license ?? null,
        has_nd_restriction: bool(p.has_nd_restriction),
        extra_papers: p.extra_papers ? JSON.stringify(p.extra_papers) : null,
        discipline: p.discipline,
        paper_type: p.paper_type ?? null,
        license: p.license,
        is_author: bool(p.is_author),
        authorship_verified: bool(p.authorship_verified),
        authorship_method: p.authorship_method ?? null,
        authorship_matched_author: p.authorship_matched_author ?? null,
        download_allowed: bool(p.download_allowed !== false),
        tags: p.tags ?? null,
        uploader_id: p.uploader_id ?? null,
        uploader_name: p.uploader_name ?? null,
        uploader_university: p.uploader_university ?? null,
        avg_rating: p.avg_rating ?? 0,
        rating_count: p.rating_count ?? 0,
        downloads: p.downloads ?? 0,
      })
    );
  }

  for (const c of comments) {
    statements.push(
      insert("comments", {
        ...envelope(c),
        presentation_id: c.presentation_id,
        user_id: c.user_id ?? null,
        user_name: c.user_name ?? null,
        user_university: c.user_university ?? null,
        text: c.text,
      })
    );
  }

  for (const r of ratings) {
    statements.push(
      insert("ratings", {
        ...envelope(r),
        presentation_id: r.presentation_id,
        user_id: r.user_id ?? null,
        score: r.score,
      })
    );
  }

  for (const d of consents) {
    statements.push(
      insert("download_consents", {
        ...envelope(d),
        presentation_id: d.presentation_id,
        user_id: d.user_id ?? null,
        user_name: d.user_name ?? null,
        license: d.license,
        download_mode: d.download_mode ?? null,
        timestamp: d.timestamp,
      })
    );
  }

  for (const a of auditLog) {
    statements.push(
      insert("authorship_audit_log", {
        ...envelope(a),
        presentation_id: a.presentation_id ?? null,
        user_id: a.user_id ?? null,
        user_email: a.user_email ?? null,
        user_name: a.user_name ?? null,
        doi: a.doi,
        claimed_author: bool(a.claimed_author),
        verification_method: a.verification_method ?? null,
        verification_result: bool(a.verification_result),
        matched_author_name: a.matched_author_name ?? null,
        email_quality_score: a.email_quality_score ?? null,
        orcid_id: a.orcid_id ?? null,
        timestamp: a.timestamp,
      })
    );
  }

  writeFileSync(SQL_OUT, statements.join("\n") + "\n");
  console.log(`\nWrote ${statements.length - 1} inserts to ${SQL_OUT}`);
  console.log(`Rewrote ${uploadedUrls.size} file URLs`);

  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to upload files and load the data.");
    return;
  }

  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "paperhub", "--file", SQL_OUT, LOCAL ? "--local" : "--remote"],
    { stdio: "inherit", shell: process.platform === "win32" }
  );
  console.log("\nImport complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
