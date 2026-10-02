/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  // "X-Powered-By: Next.js" texnologiyani oshkor qiladi — xavfsizlik
  // skanerlari (audit) buni kamchilik deb belgilaydi.
  poweredByHeader: false,
  async headers() {
    return [
      // Barcha sahifalar uchun asosiy xavfsizlik sarlavhalari (audit talabi).
      // X-Frame-Options SAMEORIGIN: saytni begona sayt iframe'iga joylab
      // bo'lmaydi (clickjacking), o'z ichidagi iframe'lar ishlayveradi.
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // face-api.js model fayllari (~7MB) statik va hech qachon o'zgarmaydi —
      // brauzer ularni uzoq muddat keshda saqlasin, mobil tarmoqda har safar
      // qayta yuklamasin (agar model fayllari kelajakda almashtirilsa, fayl
      // nomlari ham o'zgarishi kerak, aks holda eski versiya keshda qolib ketadi).
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
  // Ilgari butun sayt /lms-samisi ostida (basePath) ishlardi — endi domen
  // ildizida (https://lms.sies.uz/login). Eski havolalar (xatcho'plar, Google
  // natijalari, HEMIS/Zoom sozlamalarida qolgan manzillar) buzilmasligi
  // uchun /lms-samisi/<yo'l> -> /<yo'l> ga yo'naltiriladi (query saqlanadi).
  // Hozircha vaqtinchalik (307): orqaga qaytish kerak bo'lsa brauzerlar bu
  // yo'naltirishni keshlab qolmasin. Barqaror ishlashiga ishonch hosil
  // bo'lgach permanent: true (308) qilinsin.
  async redirects() {
    return [
      // Faqat "/lms-samisi" o'zi — quyidagi qoida bo'sh :path bilan bo'sh
      // Location qaytarardi (brauzer shu joyda aylanib qoladi).
      {
        source: "/lms-samisi",
        destination: "/",
        permanent: false,
      },
      {
        source: "/lms-samisi/:path*",
        destination: "/:path*",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
