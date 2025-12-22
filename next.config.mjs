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

  output: "export",

  //this will work on  the web  but on capacitor it will not work
  //you need to use the capacitor plugin to handle the proxy
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "http://13.50.108.254:3000/:path*",
      },
    ];
  },
   
};

export default nextConfig;
