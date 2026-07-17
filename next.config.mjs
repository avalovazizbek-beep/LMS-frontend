/** @type {import('next').NextConfig} */
const nextConfig = {
  // Faqat production build'da (Netlify: lms-samisi.uz/lms-samisi/...) ishlatiladi.
  // Lokal `next dev`da bo'sh qoladi, aks holda localhost:3000/ 404 beradi.
  basePath: process.env.NODE_ENV === 'production' ? '/lms-samisi' : '',
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
}

export default nextConfig
