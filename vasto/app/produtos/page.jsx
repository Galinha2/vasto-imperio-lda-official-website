import ProductBanner from "@/components/produtos/ProductBanner"
import Products from "@/components/produtos/Products"

export const metadata = {
  title: "Produtos | Vasto Império",
};

function page() {
    return (
        <div>
            <ProductBanner />
            <Products />
        </div>
    )
}

export default page
