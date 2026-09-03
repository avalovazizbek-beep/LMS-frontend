import type { MetadataRoute } from "next"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""
const SITE_URL = "https://lms.sies.uz"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [`${BASE_PATH}/`, `${BASE_PATH}/login`],
      // Deyarli hamma sahifa login talab qiladi — qidiruv tizimi baribir
      // login sahifasiga qaytariladi, shuning uchun ularni indekslashga
      // urinmasin (crawl budget'ni behuda sarflamasin).
      disallow: [`${BASE_PATH}/api/`, `${BASE_PATH}/dashboard`, `${BASE_PATH}/admin`],
    },
    sitemap: `${SITE_URL}${BASE_PATH}/sitemap.xml`,
  }
}
