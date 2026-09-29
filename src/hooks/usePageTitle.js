import { useEffect } from "react";
import { formatTitle } from "@/components/a11y/RouteA11y";

/** Overrides the route's default document title once `page` is known. */
export default function usePageTitle(page) {
  useEffect(() => {
    if (page) document.title = formatTitle(page);
  }, [page]);
}
