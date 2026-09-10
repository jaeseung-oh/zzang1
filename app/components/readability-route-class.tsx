"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ReadabilityRouteClass() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    const normalizedPathname = pathname.replace(/\/$/, "") || "/";
    const printLikeRoutes = ["/certificate", "/prevention-documents", "/resources"];
    const shouldBoost = normalizedPathname !== "/" && !printLikeRoutes.some((route) => normalizedPathname === route || normalizedPathname.startsWith(route + "/"));
    document.body.classList.toggle("readability-boost", shouldBoost);
    return () => {
      document.body.classList.remove("readability-boost");
    };
  }, [pathname]);

  return null;
}
