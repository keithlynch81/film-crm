/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Empty turbopack config to acknowledge Next.js 16 Turbopack default
  // Removed webpack config as desk-flow is now in separate directory
  turbopack: {},
}

module.exports = nextConfig