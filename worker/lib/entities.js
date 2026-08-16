// Entity layer: the D1-backed replacement for base44.entities.*
//
// Each entity declares its table, its column types (so booleans/JSON round-trip
// like they did in Base44) and its row-level security rules. The rules mirror
// the `rls` blocks of the original Base44 entity schemas one-to-one.

import { badRequest, forbidden, newId, notFound, nowIso, unauthorized } from "./util.js";

const BOOL = "bool";
const NUM = "num";
const JSON_COL = "json";

export const ENTITIES = {
  Presentations: {
    table: "presentations",
    columns: {
      title: 1, file_url: 1, video_url: 1, handout_url: 1, handout_license: 1,
      handout_status: 1, handout_is_derived: BOOL, handout_downloads: NUM,
      handout_uploaded_at: 1, handout_uploaded_by: 1, thumbnail_url: 1, doi: 1,
      paper_title: 1, paper_license: 1, has_nd_restriction: BOOL, extra_papers: JSON_COL,
      discipline: 1, paper_type: 1, license: 1, is_author: BOOL,
      authorship_verified: BOOL, authorship_method: 1, authorship_matched_author: 1,
      download_allowed: BOOL, tags: 1, uploader_id: 1, uploader_name: 1,
      uploader_university: 1, avg_rating: NUM, rating_count: NUM, downloads: NUM,
    },
    required: ["title", "doi", "discipline", "license"],
    read: "public",
    create: "auth",
    write: "owner_or_admin",
  },
  Comments: {
    table: "comments",
    columns: { presentation_id: 1, user_id: 1, user_name: 1, user_university: 1, text: 1 },
    required: ["presentation_id", "text"],
    read: "public",
    create: "auth",
    write: "owner_or_admin",
  },
  Ratings: {
    table: "ratings",
    columns: { presentation_id: 1, user_id: 1, score: NUM },
    required: ["presentation_id", "score"],
    read: "public",
    create: "auth",
    write: "owner_or_admin",
  },
  DownloadConsents: {
    table: "download_consents",
    columns: { presentation_id: 1, user_id: 1, user_name: 1, license: 1, download_mode: 1, timestamp: 1 },
    required: ["presentation_id", "license", "timestamp"],
    read: "own_or_admin",
    create: "anyone",
    write: "admin",
  },
  AuthorshipAuditLog: {
    table: "authorship_audit_log",
    columns: {
      presentation_id: 1, user_id: 1, user_email: 1, user_name: 1, doi: 1,
      claimed_author: BOOL, verification_method: 1, verification_result: BOOL,
      matched_author_name: 1, email_quality_score: NUM, orcid_id: 1, timestamp: 1,
    },
    required: ["doi", "timestamp", "verification_result"],
    read: "own_or_admin",
    create: "auth",
    write: "admin",
  },
};

const ENVELOPE = ["id", "created_by_id", "created_by", "created_date", "updated_date"];

function entityOrThrow(name) {
  const entity = ENTITIES[name];
  if (!entity) throw notFound(`Unknown entity: ${name}`);
  return entity;
}

/** DB row -> API record (booleans as booleans, JSON columns parsed). */
function fromRow(entity, row) {
  if (!row) return null;
  const out = { ...row };
  for (const [col, type] of Object.entries(entity.columns)) {
    if (type === BOOL) out[col] = row[col] === null || row[col] === undefined ? row[col] : !!row[col];
    if (type === JSON_COL) {
      try {
        out[col] = row[col] ? JSON.parse(row[col]) : row[col];
      } catch {
        out[col] = null;
      }
    }
  }
  return out;
}

/** API value -> DB value for one column. */
function toDbValue(type, value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (type === BOOL) return value ? 1 : 0;
  if (type === JSON_COL) return typeof value === "string" ? value : JSON.stringify(value);
  if (type === NUM) return value === "" ? null : Number(value);
  return value;
}

const isAdmin = (user) => !!user?.is_admin;
const isOwner = (user, row) => !!user && (row.created_by_id === user.id || row.user_id === user.id);

function assertCanCreate(entity, user) {
  if (entity.create === "auth" && !user) throw unauthorized("Sign in required");
}

function assertCanWrite(entity, user, row) {
  if (entity.write === "admin" && !isAdmin(user)) throw forbidden();
  if (entity.write === "owner_or_admin" && !(isOwner(user, row) || isAdmin(user))) throw forbidden();
}

/** Extra WHERE clause enforcing read visibility (public / own records / admin). */
function readScope(entity, user) {
  if (entity.read === "public" || isAdmin(user)) return { sql: "", params: [] };
  if (!user) throw unauthorized();
  return { sql: " AND (created_by_id = ? OR user_id = ?)", params: [user.id, user.id] };
}

function buildFilter(entity, filter) {
  const clauses = [];
  const params = [];
  for (const [key, value] of Object.entries(filter || {})) {
    if (key !== "id" && !(key in entity.columns) && !ENVELOPE.includes(key)) {
      throw badRequest(`Cannot filter on unknown field: ${key}`);
    }
    if (value === null) {
      clauses.push(`${key} IS NULL`);
    } else {
      clauses.push(`${key} = ?`);
      params.push(toDbValue(entity.columns[key], value));
    }
  }
  return { sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "", params };
}

function buildSort(entity, sort) {
  if (!sort) return " ORDER BY created_date DESC";
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  if (!(field in entity.columns) && !ENVELOPE.includes(field)) throw badRequest(`Cannot sort on: ${field}`);
  return ` ORDER BY ${field} ${desc ? "DESC" : "ASC"}`;
}

export async function listRecords(env, name, { filter, sort, limit, skip } = {}, user = null) {
  const entity = entityOrThrow(name);
  const scope = readScope(entity, user);
  const where = buildFilter(entity, filter);
  const sql =
    `SELECT * FROM ${entity.table} WHERE 1=1${scope.sql}${where.sql}` +
    buildSort(entity, sort) +
    ` LIMIT ? OFFSET ?`;
  const params = [...scope.params, ...where.params, Math.min(Number(limit) || 100, 500), Number(skip) || 0];
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return results.map((row) => fromRow(entity, row));
}

export async function getRecord(env, name, id, user = null) {
  const rows = await listRecords(env, name, { filter: { id }, limit: 1 }, user);
  if (!rows.length) throw notFound();
  return rows[0];
}

/**
 * Recomputes a presentation's rating aggregate from the ratings table.
 *
 * Only a presentation's owner may write to its row, so a rater's client cannot
 * maintain these columns — anyone rating someone else's upload got a 403 and the
 * average silently stayed stale. Doing it here keeps the numbers right whoever
 * rates, and leaves the client with nothing to forge.
 */
async function syncRatingAggregate(env, presentationId) {
  if (!presentationId) return;
  await env.DB.prepare(
    `UPDATE presentations SET
       avg_rating   = COALESCE((SELECT ROUND(AVG(score), 1) FROM ratings WHERE presentation_id = ?), 0),
       rating_count = (SELECT COUNT(*) FROM ratings WHERE presentation_id = ?)
     WHERE id = ?`
  )
    .bind(presentationId, presentationId, presentationId)
    .run();
}

export async function createRecord(env, name, data, user = null) {
  const entity = entityOrThrow(name);
  assertCanCreate(entity, user);

  const record = {
    id: newId(),
    created_by_id: user?.id ?? null,
    created_by: user?.email ?? null,
    created_date: nowIso(),
    updated_date: nowIso(),
  };
  for (const [col, type] of Object.entries(entity.columns)) {
    const value = toDbValue(type, data[col]);
    if (value !== undefined) record[col] = value;
  }
  for (const field of entity.required) {
    if (record[field] === undefined || record[field] === null || record[field] === "") {
      throw badRequest(`Missing required field: ${field}`);
    }
  }

  const cols = Object.keys(record);
  await env.DB.prepare(
    `INSERT INTO ${entity.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`
  )
    .bind(...cols.map((c) => record[c]))
    .run();

  if (name === "Ratings") await syncRatingAggregate(env, record.presentation_id);

  return fromRow(entity, record);
}

export async function updateRecord(env, name, id, data, user = null) {
  const entity = entityOrThrow(name);
  const row = await env.DB.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).bind(id).first();
  if (!row) throw notFound();
  assertCanWrite(entity, user, row);

  const updates = { updated_date: nowIso() };
  for (const [col, type] of Object.entries(entity.columns)) {
    const value = toDbValue(type, data[col]);
    if (value !== undefined) updates[col] = value;
  }
  const cols = Object.keys(updates);
  await env.DB.prepare(`UPDATE ${entity.table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`)
    .bind(...cols.map((c) => updates[c]), id)
    .run();

  if (name === "Ratings") await syncRatingAggregate(env, row.presentation_id);

  return fromRow(entity, { ...row, ...updates });
}

export async function deleteRecord(env, name, id, user = null) {
  const entity = entityOrThrow(name);
  const row = await env.DB.prepare(`SELECT * FROM ${entity.table} WHERE id = ?`).bind(id).first();
  if (!row) throw notFound();
  assertCanWrite(entity, user, row);
  await env.DB.prepare(`DELETE FROM ${entity.table} WHERE id = ?`).bind(id).run();

  if (name === "Ratings") await syncRatingAggregate(env, row.presentation_id);

  return { success: true };
}

// --- service-role access (used by worker functions, bypasses RLS) ------------

export const serviceRole = {
  list: (env, name, opts) => listRecords(env, name, opts, { id: null, is_admin: 1 }),
  create: (env, name, data) => createRecord(env, name, data, { id: null, email: null, is_admin: 1 }),
  update: (env, name, id, data) => updateRecord(env, name, id, data, { id: null, is_admin: 1 }),
};
