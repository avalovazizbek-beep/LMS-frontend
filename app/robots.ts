import type { MetadataRoute } from "next"

const SITE_URL = "https://lms.sies.uz"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      // Deyarli hamma sahifa login talab qiladi — qidiruv tizimi baribir
      // login sahifasiga qaytariladi, shuning uchun ularni indekslashga
      // urinmasin (crawl budget'ni behuda sarflamasin).
      disallow: ["/api/", "/dashboard", "/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
