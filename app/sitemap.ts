import type { MetadataRoute } from "next"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ""
const SITE_URL = "https://lms.sies.uz"

// Tizim login talab qiladigan sahifalardan iborat — jamoat uchun ochiq
// yagona sahifa login. Shuning uchun sitemap ham shu bittasidan iborat.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}${BASE_PATH}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
