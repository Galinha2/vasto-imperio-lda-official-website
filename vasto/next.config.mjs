/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  images: {
    unoptimized: true,
  },
  // output: 'export', // NÃO usar se queres Node.js para APIs
};

export default nextConfig;
