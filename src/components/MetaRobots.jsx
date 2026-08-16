import { useEffect } from "react";

const OPEN_LICENSES = ["CC0 1.0", "CC BY 4.0"];

/**
 * Injects/updates a <meta name="robots"> tag in <head> based on the license.
 * - CC0 / CC BY 4.0 → index, follow
 * - Everything else → noindex, nofollow
 */
export default function MetaRobots({ license }) {
  useEffect(() => {
    const isOpen = OPEN_LICENSES.includes(license);
    const content = isOpen ? "index, follow" : "noindex, nofollow";

    let tag = document.querySelector('meta[name="robots"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "robots");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", content);

    return () => {
      if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
    };
  }, [license]);

  return null;
}