import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configuración específica para el servidor (donde corre Tesseract)
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'tesseract.js': 'tesseract.js'
      })
    }

    // Fallbacks para el cliente
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
      assert: false,
      http: false,
      https: false,
      os: false,
      url: false,
      zlib: false
    }

    return config
  },
  // Paquetes externos para componentes de servidor
  serverExternalPackages: ['tesseract.js']
};

export default nextConfig;
