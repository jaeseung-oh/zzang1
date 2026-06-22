import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/_next/static/", "/images/"],
        disallow: ["/admin/", "/docs/", "/api/"],
      },
    ],
    sitemap: "https://resetedu.kr/sitemap.xml",
    host: "https://resetedu.kr",
  };
}
