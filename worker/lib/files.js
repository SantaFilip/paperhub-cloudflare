// Reading a stored upload.
//
// A Worker cannot fetch its own hostname — Cloudflare answers those subrequests
// with "error code: 1042" instead of the file. Since our own uploads live in R2
// and are merely *served* under /files/, we read them straight from the bucket
// and keep fetch() for genuinely external URLs.

/** Returns the file as an ArrayBuffer, or null if it could not be read. */
export async function readStoredFile(env, url) {
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.pathname.startsWith("/files/")) {
    const key = decodeURIComponent(parsed.pathname.slice("/files/".length));
    const object = await env.FILES.get(key);
    return object ? object.arrayBuffer() : null;
  }

  const response = await fetch(url);
  if (!response.ok) return null;
  return response.arrayBuffer();
}
