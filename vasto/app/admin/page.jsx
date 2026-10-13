import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/admin/auth.mjs";
import SalesDashboard from "@/components/admin/SalesDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) redirect("/admin/login");
  return <SalesDashboard />;
}
