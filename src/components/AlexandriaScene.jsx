// Scenery for the public pages: the Library of Alexandria as the banner
// behind a page title and as the room behind the content. Everything here is
// ornament — aria-hidden, empty alt, no pointer events — so none of it reaches
// the accessibility tree or the tab order.

/**
 * The page banner. The wash that carries the text contrast lives in
 * `.ph-banner__scrim` in index.css; change that, not the type colours, when a
 * picture should come forward or recede. `className` takes a modifier such as
 * `ph-banner--slim` or `ph-banner--books`, which pick a different wash.
 */
export function AlexandriaBanner({ children, className = "", src = "/alexandria-banner.webp" }) {
  return (
    <div className={`ph-banner ${className}`.trim()}>
      <img
        className="ph-banner__art"
        src={src}
        alt=""
        aria-hidden="true"
        width="1672"
        height="941"
        // Above the fold on these routes, so it should not wait in the queue.
        fetchPriority="high"
        decoding="async"
      />
      <div className="ph-banner__scrim" aria-hidden="true" />
      <div className="ph-banner__content">{children}</div>
    </div>
  );
}

/**
 * A shelf of bound volumes: the page banner for Upload. `.ph-banner--books`
 * in index.css also pulls the crop down onto the spines, so the dark space
 * above them stays out of frame.
 */
export function AlexandriaBooks({ children }) {
  return (
    <AlexandriaBanner className="ph-banner--books" src="/alexandria-books.webp">
      {children}
    </AlexandriaBanner>
  );
}

/**
 * The room the content sits in. The picture and the parchment wash over it
 * both live in `.ph-backdrop` in index.css, so the element itself stays empty.
 * `variant="room"` swaps in the registry hall used by the sign-in pages.
 */
export function AlexandriaBackdrop({ variant }) {
  const cls = variant === "room" ? "ph-backdrop ph-backdrop--room" : "ph-backdrop";
  return <div className={cls} aria-hidden="true" />;
}
