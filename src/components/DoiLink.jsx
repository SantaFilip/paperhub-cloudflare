import { BadgeCheck } from "lucide-react";

export default function DoiLink({ doi, className = "" }) {
  if (!doi) return null;
  return (
    <a
      href={`https://doi.org/${doi}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-[#2563EB] hover:text-blue-800 underline underline-offset-2 transition-all group min-h-[44px] ${className}`}
    >
      <span className="doi-seal group-hover:scale-110 transition-transform duration-200">
        <BadgeCheck className="w-4 h-4 text-[#2563EB] group-hover:text-blue-800 flex-shrink-0" />
      </span>
      <span className="text-sm font-mono break-all">{doi}</span>
    </a>
  );
}