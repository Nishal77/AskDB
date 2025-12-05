/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@askdb/ui', '@askdb/types'],
  output: 'standalone',
  
  // Performance optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optimize build performance
  experimental: {
    optimizeCss: true,
  },
  
  // Suppress hydration warnings for browser extension attributess
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Optimize Monaco Editor loading
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@monaco-editor/react': '@monaco-editor/react',
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;
