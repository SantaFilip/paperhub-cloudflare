import { useState } from "react";
import { Star } from "lucide-react";

export default function StarRating({ value = 0, onChange, readonly = false, size = "md" }) {
  const [hovered, setHovered] = useState(0);

  const sizes = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSize = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            onClick={() => !readonly && onChange && onChange(star)}
            className={`transition-all duration-150 ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } ${filled ? "star-pulse" : ""}`}
            style={{ minHeight: readonly ? "auto" : "44px", minWidth: readonly ? "auto" : "28px" }}
          >
            <Star
              className={`${iconSize} transition-all duration-150 ${
                filled
                  ? "fill-[#B45309] text-[#B45309]"
                  : "fill-transparent text-slate-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}