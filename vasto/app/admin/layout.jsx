export const metadata = { title: "Administração", robots: { index: false, follow: false, nocache: true } };

export default function AdminLayout({ children }) {
  return <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">{children}</div>;
}
