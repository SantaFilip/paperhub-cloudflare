// Claude helpers — the replacement for Base44's `integrations.Core.InvokeLLM`.
//
// Both helpers are optional: without ANTHROPIC_API_KEY they return null and the
// callers fall back to their deterministic paths (binary PDF parsing, CrossRef/
// OpenAlex/Unpaywall lookups). Nothing in the app depends on an LLM being there.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";

function client(env) {
  if (!env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/**
 * All text blocks joined. A web-search response is a sequence of blocks —
 * commentary, the search calls, then the answer — so reading only the first one
 * yields the preamble rather than the result.
 */
function allText(message) {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/** Parses a JSON response, tolerating a code fence or surrounding prose. */
function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through: with server tools the object arrives wrapped in commentary.
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * Reads DOIs and text out of a PDF that yielded nothing useful to the binary
 * parser (scans, image-only slides). Claude reads the PDF straight from its URL.
 */
export async function extractPdfWithClaude(env, fileUrl) {
  const anthropic = client(env);
  if (!anthropic) return null;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              dois: { type: "array", items: { type: "string" } },
              text: { type: "string" },
            },
            required: ["dois", "text"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "url", url: fileUrl } },
            {
              type: "text",
              text:
                "Extract every DOI in this document — bare (10.XXXX/...), as https://doi.org/ links, " +
                "in reference lists, footnotes, captions, anywhere. Also return a plain-text version " +
                "of the content, especially the references section. Return only what is in the " +
                "document; do not invent DOIs.",
            },
          ],
        },
      ],
    });

    if (message.stop_reason === "refusal") return null;

    const result = parseJson(allText(message));
    if (!result) return null;

    const dois = (result.dois || [])
      .map((d) => String(d).replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "").trim())
      .filter((d) => /^10\.\d{4,}\//.test(d))
      .map((d) => d.replace(/[.,;:!?)\]}>]+$/, "").trim());

    return { text: result.text || dois.join(" "), pages: 0, extractedDois: dois };
  } catch (error) {
    console.warn("Claude PDF extraction failed:", error.message);
    return null;
  }
}

/**
 * Looks up a paper's licence on the open web when the metadata APIs come back
 * empty. Uses the server-side web search tool, so no scraping code of our own.
 */
export async function lookupLicenseWithClaude(env, doi) {
  const anthropic = client(env);
  if (!anthropic) return null;

  const LICENSES = [
    "CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0", "CC BY-NC 4.0",
    "CC BY-NC-SA 4.0", "CC BY-ND 4.0", "CC BY-NC-ND 4.0", "All Rights Reserved",
  ];

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      output_config: {
        effort: "medium",
        // The prompt alone got searches but an empty final text block; a schema
        // forces the model to actually produce the answer.
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              found: { type: "boolean" },
              // anyOf rather than a ["string","null"] union — an enum may not
              // span two declared types.
              license: { anyOf: [{ type: "string", enum: LICENSES }, { type: "null" }] },
              license_url: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            required: ["found", "license", "license_url"],
            additionalProperties: false,
          },
        },
      },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
      messages: [
        {
          role: "user",
          content:
            `Find the licence of the scientific paper with DOI ${doi}. Check the publisher page ` +
            `and academic databases. Do not guess — if the licence is not clearly stated, ` +
            `return found=false.`,
        },
      ],
    });

    if (message.stop_reason === "refusal") return null;

    const result = parseJson(allText(message));
    if (!result) {
      console.warn("Claude licence lookup: no JSON in response");
      return null;
    }
    if (!result.found || !LICENSES.includes(result.license)) return null;
    return { found: true, license: result.license, license_url: result.license_url || null };
  } catch (error) {
    console.warn("Claude licence lookup failed:", error.message);
    return null;
  }
}
