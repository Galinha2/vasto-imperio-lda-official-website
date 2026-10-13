import content from "@/assets/contentpt.json";
import PromotionalPage from "@/components/produtos/PromotionalPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Estantes de Picking Metálicas em Viseu",
  description: "Configure estantes de picking metálicas com tampos em aglomerado ou metal. Soluções modulares para armazéns, com apoio em Viseu e Benedita e entrega em Portugal.",
  path: "/estantes-picking",
});

export default function EstantesPickingPage() {
  const product = content.productsShowcase.products.find(
    (item) => item.id === "estantes-picking",
  );

  if (!product) return <p className="px-5 py-24 text-center">Produto não encontrado</p>;

  return (
    <PromotionalPage
      produto={{
        id: product.id,
        title: product.text,
        subtitle:
          "Uma solução modular para organizar artigos e facilitar o acesso diário ao stock. Escolha as dimensões e configure a sua estante de acordo com o espaço disponível.",
        mainImage: product.image,
        features: product.images.slice(1, 3).map((image) => ({ image })),
        description: product.description,
        tabela: product.tabela,
        faq: [
          {
            q: "Posso configurar as dimensões da estante?",
            a: "Sim. No simulador pode escolher o comprimento, a altura, a profundidade e o número de níveis.",
          },
          {
            q: "Que tipos de tampo estão disponíveis?",
            a: "Pode escolher entre tampos em aglomerado e tampos metálicos, conforme a configuração disponível.",
          },
          {
            q: "Posso pedir uma configuração diferente?",
            a: "Sim. Envie-nos os detalhes do seu espaço e a nossa equipa ajuda a encontrar a solução adequada.",
          },
        ],
      }}
    />
  );
}
