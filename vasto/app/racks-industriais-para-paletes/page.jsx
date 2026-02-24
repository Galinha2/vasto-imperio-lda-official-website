import PromotionalPage from "../../components/produtos/PromotionalPage";
import racksData from "../../assets/contentpt.json";

function Page() {
  const produto = racksData.promotionalPages.find(
    (p) => p.id === "racks-industriais"
  );

  return <PromotionalPage produto={produto} />;
}

export default Page;