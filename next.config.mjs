/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build vaqtidagi NEXT_PUBLIC_BASE_PATH orqali boshqariladi — shu bitta
  // repo turli joylashuvlarga (Netlify: /lms-samisi ostida, yoki o'z domeni:
  // bo'sh/root) moslashtirilishi uchun. Lokal `next dev`da bo'sh qoladi.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  // face-api.js model fayllari (~7MB) statik va hech qachon o'zgarmaydi —
  // brauzer ularni uzoq muddat keshda saqlasin, mobil tarmoqda har safar
  // qayta yuklamasin (agar model fayllari kelajakda almashtirilsa, fayl
  // nomlari ham o'zgarishi kerak, aks holda eski versiya keshda qolib ketadi).
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default nextConfig
