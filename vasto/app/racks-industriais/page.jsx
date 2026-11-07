import { productStructuredData } from "@/lib/product-seo.mjs";
import PromotionalPage from "../../components/produtos/PromotionalPage";
import racksData from "../../assets/contentpt.json";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Racks Industriais para Paletes em Viseu",
  description: "Racks metálicos para armazenagem de paletes em armazéns e indústria. Configure a solução com apoio da Vasto Império em Viseu e Benedita, com entrega em Portugal.",
  path: "/racks-industriais",
});

function Page() {
  const produto = racksData.promotionalPages.find(
    (p) => p.id === "racks-industriais"
  );

  const product = racksData.productsShowcase.products.find(p => p.id === "racks-industriais");
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData(product, 'pt')).replace(/</g, "\\u003c") }} /><PromotionalPage produto={produto} /></>;
}

export default Page;