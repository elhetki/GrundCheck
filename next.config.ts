import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['neo4j-driver'],
  },
};

export default nextConfig;
