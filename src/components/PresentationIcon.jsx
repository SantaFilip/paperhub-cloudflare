export default function PresentationIcon({ className = "w-4 h-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Monitor with rounded top */}
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      {/* Text bars */}
      <line x1="6" y1="7" x2="18" y2="7" strokeWidth="1.5" />
      <line x1="6" y1="11" x2="18" y2="11" strokeWidth="1.5" />
      <line x1="6" y1="13" x2="12" y2="13" strokeWidth="1.5" />
    </svg>
  );
}