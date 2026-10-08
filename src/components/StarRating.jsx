import { useState } from "react";
import { Star } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";

// Read-only: one image with a text alternative ("4 of 5 stars").
// Interactive: a radio group, so screen readers announce the choice and arrow
// keys change it (WAI-ARIA radio pattern).
export default function StarRating({ value = 0, onChange, readonly = false, size = "md" }) {
  const [hovered, setHovered] = useState(0);
  const { lang } = useLang();

  const sizes = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSize = sizes[size] || sizes.md;
  const rounded = Math.round(value * 10) / 10;
  const summary = lang === "de" ? `${rounded} von 5 Sternen` : `${rounded} out of 5 stars`;

  const starIcon = (filled) => (
    <Star
      aria-hidden="true"
      className={`${iconSize} transition-all duration-150 ${
        filled ? "fill-[#B45309] text-[#B45309]" : "fill-transparent text-slate-500"
      }`}
    />
  );

  if (readonly) {
    return (
      <div className="flex items-center gap-0.5" role="img" aria-label={summary}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{starIcon(value >= star)}</span>
        ))}
      </div>
    );
  }

  const select = (star) => onChange && onChange(star);
  const onKeyDown = (e) => {
    const current = value || 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); select(Math.min(5, current + 1)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); select(Math.max(1, current - 1)); }
  };

  return (
    <div
      className="flex items-center gap-0.5"
      role="radiogroup"
      aria-label={lang === "de" ? "Bewertung abgeben" : "Rate this presentation"}
      onKeyDown={onKeyDown}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || value) >= star;
        const checked = value === star;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={lang === "de" ? `${star} von 5 Sternen` : `${star} out of 5 stars`}
            tabIndex={checked || (!value && star === 1) ? 0 : -1}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => select(star)}
            className={`transition-all duration-150 cursor-pointer hover:scale-110 ${filled ? "star-pulse" : ""}`}
            style={{ minHeight: "44px", minWidth: "28px" }}
          >
            {starIcon(filled)}
          </button>
        );
      })}
    </div>
  );
}
