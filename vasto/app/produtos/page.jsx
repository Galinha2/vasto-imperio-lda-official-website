import ProductBanner from "@/components/produtos/ProductBanner"
import Products from "@/components/produtos/Products"
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Racks, Estantes e Porta-Paletes",
  description: "Conheça racks industriais, estantes metálicas, estantes de picking e porta-paletes da Vasto Império. Apoio em Viseu e Benedita, com entregas em Portugal.",
  path: "/produtos",
});

function page() {
    return (
        <div>
            <ProductBanner />
            <Products />
        </div>
    )
}

export default page
