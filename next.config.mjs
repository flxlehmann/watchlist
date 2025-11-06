/** @type {import('next').NextConfig} */
const nextConfig={reactStrictMode:true,experimental:{serverActions:{bodySizeLimit:'2mb'}}};
nextConfig.images = {
  remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' }]
};
export default nextConfig;
