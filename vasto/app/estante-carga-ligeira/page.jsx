import { productStructuredData } from "@/lib/product-seo.mjs";
import PromotionalPage from "../../components/produtos/PromotionalPage";
import racksData from "../../assets/contentpt.json";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Estantes Metálicas de Carga Ligeira em Viseu",
  description: "Estantes metálicas modulares para arrumação manual em armazéns, oficinas e lojas. Apoio em Viseu e Benedita, com entregas em todo o Portugal. Peça orçamento.",
  path: "/estante-carga-ligeira",
});

function Page() {
  const produto = racksData.promotionalPages.find(
    (p) => p.id === "estante-carga-ligeira"
  );

  const product = racksData.productsShowcase.products.find(p => p.id === "estante-carga-ligeira");
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData(product, 'pt')).replace(/</g, "\\u003c") }} /><PromotionalPage produto={produto} /></>;
}

export default Page; 