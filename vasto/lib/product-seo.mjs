export const productLandingPaths = {
  'racks-industriais': '/racks-industriais',
  'estante-carga-ligeira': '/estante-carga-ligeira',
  'estantes-picking': '/estantes-picking',
};
export const plainDescription = html => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export function productLanguagePaths(id) {
  const pt = productLandingPaths[id] || `/produtos/pt/${id}`;
  return { 'pt-PT': pt, 'en-US': `/produtos/en/${id}`, 'x-default': pt };
}
export function productStructuredData(product, lang) {
  return { '@context': 'https://schema.org', '@type': 'Product', name: product.text,
    description: plainDescription(product.description), image: [`https://vastoimperio.pt${product.image}`],
    url: `https://vastoimperio.pt${lang === 'pt' ? productLanguagePaths(product.id)['pt-PT'] : `/produtos/en/${product.id}`}`,
    brand: { '@type': 'Brand', name: 'Vasto Império' },
  };
}
