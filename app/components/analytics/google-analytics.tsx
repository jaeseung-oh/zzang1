"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackEvent, trackPageView } from "@/lib/analytics/ga";

export default function GoogleAnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams.toString();
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-ga-event]") : null;
      const eventName = target?.dataset.gaEvent;
      if (!eventName) return;

      trackEvent(eventName, {
        item_id: target.dataset.gaItemId,
        item_name: target.dataset.gaItemName,
        link_url: target instanceof HTMLAnchorElement ? target.href : undefined,
        location: target.dataset.gaLocation,
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
