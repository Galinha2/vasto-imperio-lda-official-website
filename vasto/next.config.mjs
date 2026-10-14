/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: true }];
  },
  async headers() {
    return ["/admin/:path*", "/orcamento/admin/:path*", "/simulador/admin/:path*", "/api/:path*"].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }));
  },
  serverExternalPackages: ["pdfjs-dist"],
  images: {
    unoptimized: true,
  },
  // output: 'export', // NÃO usar se queres Node.js para APIs
};

export default nextConfig;
