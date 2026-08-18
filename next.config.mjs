/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build vaqtidagi NEXT_PUBLIC_BASE_PATH orqali boshqariladi — shu bitta
  // repo turli joylashuvlarga (Netlify: /lms-samisi ostida, yoki o'z domeni:
  // bo'sh/root) moslashtirilishi uchun. Lokal `next dev`da bo'sh qoladi.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}

export default nextConfig
