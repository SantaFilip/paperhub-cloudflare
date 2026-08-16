// Public profile page data — the /u/:identifier route.
// Reads users directly (bypassing RLS) but only ever emits public fields.

import { serviceRole } from "../lib/entities.js";
import { badRequest, json, readJson } from "../lib/util.js";

const looksLikeId = (value) =>
  /^[a-f0-9]{20,}$/i.test(value) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default async function getPublicProfile(request, env) {
  const { identifier } = await readJson(request);
  if (!identifier) throw badRequest("identifier required");

  // Username lookup first unless the value is clearly an id — usernames are the
  // shareable form, ids only appear in links from presentation pages.
  let user = null;
  if (looksLikeId(identifier)) {
    user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(identifier).first();
  } else {
    user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(identifier).first();
    if (!user) {
      user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(identifier).first();
    }
  }

  if (!user) return json({ found: false });

  const name = user.full_name || user.email || "Scholar";
  const username = user.username || user.id;

  if (user.profile_visible === 0) {
    return json({ found: true, private: true, name, username });
  }

  const presentations = await serviceRole.list(env, "Presentations", {
    filter: { uploader_id: user.id },
    sort: "-created_date",
    limit: 50,
  });

  return json({
    found: true,
    private: false,
    name,
    username,
    university: user.university || null,
    orcid_id: user.orcid_id || null,
    role: user.role || null,
    stats: {
      count: presentations.length,
      totalDownloads: presentations.reduce((sum, p) => sum + (p.downloads || 0), 0),
    },
    presentations: presentations.map((p) => ({
      id: p.id,
      title: p.title,
      doi: p.doi || null,
      paper_title: p.paper_title || null,
      created_date: p.created_date,
      downloads: p.downloads || 0,
      discipline: p.discipline,
      thumbnail_url: p.thumbnail_url || null,
      has_handout: !!(p.handout_url && p.handout_status === "approved"),
      avg_rating: p.avg_rating || 0,
      rating_count: p.rating_count || 0,
    })),
  });
}
