/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude desk-flow subdirectory from the build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/desk-flow/**', '**/node_modules/**'],
    }
    return config
  },
}

module.exports = nextConfig