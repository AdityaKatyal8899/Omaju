/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/sign-in',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/sign-up',
        permanent: true,
      },
    ];
  },
}

export default nextConfig
