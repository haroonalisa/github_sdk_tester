import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@github/copilot-sdk'],
  webpack: (config, { isServer }) => {
    // Treat the module as external so Webpack/Turbopack doesn't try to resolve `import.meta.resolve` statically
    if (isServer) {
      config.externals = [...(config.externals || []), '@github/copilot-sdk'];
    }
    return config;
  },
};

export default nextConfig;
