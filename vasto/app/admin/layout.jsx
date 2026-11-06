import "@/components/admin/AdminTheme.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/admin/auth.mjs";
import AdminNavigation from "@/components/admin/AdminNavigation";

export const metadata = {
  title: "Administração",
  manifest: "/admin.webmanifest?v=sales-start-2",
  appleWebApp: { capable: true, title: "Vasto Admin", statusBarStyle: "default" },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) redirect("/admin/login");
  return <AdminNavigation>{children}</AdminNavigation>;
}
