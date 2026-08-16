import { Shield } from "lucide-react";
import { getLicenseUrl } from "@/lib/licenseUtils";

// Compact badge for Browse cards and sidebars.
// When `asLink` is true and a CC license URL exists, renders as an
// <a rel="license"> anchor (used on the detail page for machine-readable licensing).
export default function LicenseBadge({ license, className = "", asLink = false }) {
  if (!license) return null;

  const url = asLink ? getLicenseUrl(license) : null;
  const isCC0 = license === "CC0 1.0";
  const isRestricted = license === "All Rights Reserved";

  const colorClass = isCC0
    ? "bg-green-50 text-green-700 border-green-200"
    : isRestricted
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  const inner = (
    <>
      <Shield className="w-3 h-3 flex-shrink-0" />
      {license}
    </>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="license noopener noreferrer"
        title={license}
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass} ${className}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass} ${className}`}
      title={license}
    >
      {inner}
    </span>
  );
}