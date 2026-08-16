// PowerPoint files ship a preview image in docProps/thumbnail.*; we lift it out
// so uploads get a cover image without rendering a slide.

import JSZip from "jszip";
import { readStoredFile } from "../lib/files.js";
import { badRequest, json, readJson } from "../lib/util.js";

export default async function extractPptxThumbnail(request, env) {
  const { file_url } = await readJson(request);
  if (!file_url) throw badRequest("file_url required");

  const content = await readStoredFile(env, file_url);
  if (!content) throw badRequest("Could not read the file");

  const zip = await JSZip.loadAsync(content);
  const thumbName = Object.keys(zip.files).find((name) =>
    /^docProps\/thumbnail\.(jpeg|jpg|png)$/i.test(name)
  );
  if (!thumbName) return json({ found: false });

  return json({
    found: true,
    data: await zip.files[thumbName].async("base64"),
    mimeType: thumbName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  });
}
