import budget from "@/assets/orcamento.json";

export default function createQuoteLines(entries, referenceFamily) {
  const family = budget.produtos.filter((product) => product.ref === referenceFamily);
  const grouped = new Map();

  for (const { product, quantity } of entries) {
    if (!product || !quantity) continue;
    const key = product.produto;
    const previous = grouped.get(key);
    if (previous) previous.unidades += quantity;
    else grouped.set(key, { product, unidades: quantity });
  }

  return [...grouped.values()].map(({ product, unidades }) => {
    const index = family.findIndex((item) => item.produto === product.produto);
    const preco = Number(product["preço"]) || 0;
    return {
      produto: product.produto,
      refCompleta: index >= 0 ? `${referenceFamily}.${index + 1}` : String(referenceFamily),
      unidades,
      preco,
      total: unidades * preco,
      isPortes: false,
    };
  });
}
