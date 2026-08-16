import { useEffect } from "react";

/**
 * Injects a JSON-LD <script> tag into <head> for the lifetime of the component.
 * Re-renders with new `data` replace the script content. Removed on unmount.
 */
export default function JsonLd({ data }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [JSON.stringify(data)]);

  return null;
}