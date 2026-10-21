import BudgetBuilder from "@/components/admin/BudgetBuilder";

export default async function AdminBudgetsPage({ searchParams }) {
  const { editar, duplicar } = await searchParams;
  return <main className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10"><BudgetBuilder editSaleId={editar || ""} duplicateSaleId={duplicar || ""} /></main>;
}
