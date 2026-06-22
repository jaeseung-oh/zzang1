import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const publicPaths = [
  "/",
  "/about/",
  "/courses/",
  "/courses/dui-prevention/",
  "/guides/reflection-letter/",
  "/guides/prevention-plan/",
  "/terms/",
  "/privacy-policy/",
  "/refund-policy/",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-22T00:00:00.000Z");
  return publicPaths.map((path, index) => ({
    url: new URL(path, "https://resetedu.kr").toString(),
    lastModified,
    changeFrequency: index < 4 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : index < 4 ? 0.8 : 0.6,
  }));
}
