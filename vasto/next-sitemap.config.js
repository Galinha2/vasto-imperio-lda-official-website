/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://vastoimperio.pt",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  // Avoid announcing every page as modified each time the application builds.
  autoLastmod: false,
  changefreq: false,
  priority: false,
  exclude: ["/produtos/pt/racks-industriais", "/produtos/pt/estante-carga-ligeira", "/produtos/pt/estantes-picking", "/admin", "/admin/*", "/orcamento/admin", "/simulador/admin", "/api/*", "/home", "/sucesso", "/simulador/estantes", "/simulador/en/*"],
  robotsTxtOptions: {
    policies: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
  },
  additionalPaths: async () => [{ loc: "/simulador/pt/estantes-picking" }],
};
