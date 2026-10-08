// PaperHub Worker — the whole backend in one entry point.
//
//   /api/auth/*       registration, login, profile, password reset
//   /api/entities/*   D1-backed CRUD (replaces base44.entities)
//   /api/files        R2 upload (replaces integrations.Core.UploadFile)
//   /files/*          public file serving from R2
//   /api/functions/*  the five ported Base44 functions
//   everything else   the React SPA, served from static assets

import { getUser, requireUser } from "./lib/auth.js";
import { createRecord, deleteRecord, listRecords, updateRecord } from "./lib/entities.js";
import { HttpError, badRequest, json, newId, notFound } from "./lib/util.js";
import { handleAuth } from "./routes/auth.js";
import { blocksDownload, hidesThumbnail } from "../src/lib/licenseUtils.js";

import downloadPresentation from "./functions/downloadPresentation.js";
import extractFileText from "./functions/extractFileText.js";
import extractPptxThumbnail from "./functions/extractPptxThumbnail.js";
import getPublicProfile from "./functions/getPublicProfile.js";
import lookupPaperLicense from "./functions/lookupPaperLicense.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Functions listed here run without a signed-in user. */
const FUNCTIONS = {
  extractFileText: { handler: extractFileText, auth: true },
  extractPptxThumbnail: { handler: extractPptxThumbnail, auth: true },
  lookupPaperLicense: { handler: lookupPaperLicense, auth: true },
  downloadPresentation: { handler: downloadPresentation, auth: false },
  getPublicProfile: { handler: getPublicProfile, auth: false },
};

const SAFE_EXTENSIONS = /\.(pdf|pptx|ppt|docx|doc|png|jpe?g|webp|gif|svg|txt|csv|md|zip)$/i;

/** R2 keys are generated, never taken from the client. */
function objectKey(filename) {
  const ext = (filename.match(SAFE_EXTENSIONS) || [""])[0].toLowerCase();
  const date = new Date();
  return `uploads/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${newId()}${ext}`;
}

async function handleUpload(request, env) {
  await requireUser(request, env);

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw badRequest("file field is required");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File too large (max 50 MB)");

  const key = objectKey(file.name || "upload");
  await env.FILES.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
      // Uploads are immutable: a new upload always gets a new key.
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const origin = env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return json({ file_url: `${origin}/files/${key}` });
}

/**
 * True if the key is the thumbnail of a presentation whose licence forbids a
 * preview image. The API already hides such URLs; this also stops links that
 * were shared or cached before the rule existed.
 */
async function isWithheldThumbnail(key, env) {
  if (!/\.(png|jpe?g|webp|gif)$/i.test(key)) return false;
  // Suffix match without LIKE: D1 rejects LIKE patterns longer than 50 bytes.
  const suffix = `/files/${key}`;
  const rows = await env.DB.prepare(
    "SELECT license FROM presentations WHERE substr(thumbnail_url, -length(?1)) = ?1"
  )
    .bind(suffix)
    .all();
  return (rows.results || []).some((row) => hidesThumbnail(row.license));
}

/**
 * True if the key belongs to a presentation whose files may not be handed out.
 * The detail page hides the download button for these, but the button was the
 * only thing stopping anyone: the record still carries `file_url`, and this
 * route served it to whoever asked. The rule has to live here to mean anything.
 */
async function isWithheldFile(key, env) {
  // Images are presentation thumbnails; isWithheldThumbnail already judged them.
  if (/\.(png|jpe?g|webp|gif)$/i.test(key)) return false;
  // Suffix match without LIKE: D1 rejects LIKE patterns longer than 50 bytes.
  const suffix = `/files/${key}`;
  const rows = await env.DB.prepare(
    "SELECT license, has_nd_restriction, is_author FROM presentations " +
      "WHERE substr(file_url, -length(?1)) = ?1 OR substr(handout_url, -length(?1)) = ?1"
  )
    .bind(suffix)
    .all();
  return (rows.results || []).some((row) => blocksDownload(row));
}

async function serveFile(key, env, request) {
  if (await isWithheldThumbnail(key, env)) throw notFound("File not found");
  if (await isWithheldFile(key, env)) throw notFound("File not found");
  const object = await env.FILES.get(key);
  if (!object) throw notFound("File not found");

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (request.headers.get("if-none-match") === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}

async function handleEntities(request, env, segments) {
  const [name, id] = segments;
  if (!name) throw notFound();
  const user = await getUser(request, env);

  if (request.method === "GET" && !id) {
    const params = new URL(request.url).searchParams;
    let filter = {};
    if (params.get("filter")) {
      try {
        filter = JSON.parse(params.get("filter"));
      } catch {
        throw badRequest("filter must be valid JSON");
      }
    }
    const records = await listRecords(
      env,
      name,
      { filter, sort: params.get("sort"), limit: params.get("limit"), skip: params.get("skip") },
      user
    );
    return json(records);
  }

  if (request.method === "POST" && !id) {
    return json(await createRecord(env, name, await request.json(), user), 201);
  }

  if ((request.method === "PATCH" || request.method === "PUT") && id) {
    return json(await updateRecord(env, name, id, await request.json(), user));
  }

  if (request.method === "DELETE" && id) {
    return json(await deleteRecord(env, name, id, user));
  }

  throw notFound();
}

async function handleFunction(request, env, name) {
  const entry = FUNCTIONS[name];
  if (!entry) throw notFound(`Unknown function: ${name}`);
  if (request.method !== "POST") throw new HttpError(405, "Method not allowed");

  const user = entry.auth ? await requireUser(request, env) : await getUser(request, env);
  return entry.handler(request, env, user);
}

async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith("/files/")) {
    return serveFile(decodeURIComponent(path.slice("/files/".length)), env, request);
  }

  if (path.startsWith("/api/")) {
    const segments = path.slice("/api/".length).split("/").filter(Boolean);
    const [group, ...rest] = segments;

    if (group === "auth") return handleAuth(request, env, rest.join("/"));
    if (group === "entities") return handleEntities(request, env, rest);
    if (group === "functions") return handleFunction(request, env, rest[0]);
    if (group === "files" && request.method === "POST") return handleUpload(request, env);
    if (group === "health") return json({ ok: true });

    throw notFound(`Unknown endpoint: ${path}`);
  }

  // Anything else is the SPA — the assets binding handles history fallback.
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message, ...(error.extra ? { extra_data: error.extra } : {}) }, error.status);
      }
      console.error("Unhandled error:", error.stack || error.message);
      return json({ error: "Internal error" }, 500);
    }
  },
};
