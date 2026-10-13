import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/admin/auth.mjs";
import AdminLogin from "@/components/admin/AdminLogin";

export const metadata = {
  title: "Administração",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (verifySession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/admin");
  return <AdminLogin />;
}
