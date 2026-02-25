import PromotionalPage from "../../components/produtos/PromotionalPage";
import racksData from "../../assets/contentpt.json";

function Page() {
  const produto = racksData.promotionalPages.find(
    (p) => p.id === "estante-carga-ligeira"
  );

  return <PromotionalPage produto={produto} />;
}

export default Page; 