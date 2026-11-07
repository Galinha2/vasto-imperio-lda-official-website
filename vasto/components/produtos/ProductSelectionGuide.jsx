import budget from "@/assets/orcamento.json";
import { productGuides } from "@/lib/product-guides";

export default function ProductSelectionGuide({ id, english = false }) {
  const guide = productGuides[id];
  if (!guide) return null;
  const entries = english ? guide.en : guide.pt;
  const shelves = id === "estante-carga-ligeira" ? budget.produtos.filter(p => /^Tabuleiro /.test(p.produto)) : [];
  return (
    <section className="bg-[#f5f5f7] px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-[1440px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--orange)">{english ? "Choose with confidence" : "Escolher com confiança"}</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">{english ? "The right solution for your day-to-day work." : "A solução certa para o seu dia a dia."}</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {entries.map(([title, text], i) => <article key={title} className="border-t border-[#dcdce1] pt-5">
            <span className="text-xs font-semibold text-(--orange)">0{i + 1}</span>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-[#1d1d1f]">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#626268]">{text}</p>
          </article>)}
        </div>
        {shelves.length > 0 && <div className="mt-9 overflow-hidden rounded-3xl border border-[#e0e0e5] bg-white">
          <h3 className="px-6 pt-6 text-lg font-semibold text-[#1d1d1f]">{english ? "Capacity by shelf" : "Capacidade por tabuleiro"}</h3>
          <p className="px-6 py-3 text-sm leading-6 text-[#626268]">{english ? "Catalogue limits for evenly distributed loads. These are per-shelf values; total bay capacity must be checked separately." : "Limites do catálogo para carga uniformemente distribuída. São valores por tabuleiro; a capacidade total da estante deve ser verificada separadamente."}</p>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f5f5f7] text-[#626268]"><tr><th className="px-6 py-3">{english ? "Length × depth" : "Comprimento × profundidade"}</th><th className="px-6 py-3">{english ? "Central reinforcements" : "Reforços centrais"}</th><th className="px-6 py-3">{english ? "Up to / shelf" : "Até / tabuleiro"}</th></tr></thead><tbody>{shelves.map(s => {const m=s.produto.match(/(\d+)x(\d+) mm.*?(\d+)Kg/i); if(!m)return null; return <tr key={s.produto} className="border-t border-[#ececef] text-[#44444a]"><td className="px-6 py-3">{Number(m[1])/1000} × {Number(m[2])/1000} m</td><td className="px-6 py-3">{s.produto.match(/c\/ (\d)/)?.[1] || "0"}</td><td className="px-6 py-3 font-semibold">{m[3]} kg</td></tr>;})}</tbody></table></div>
        </div>}
      </div>
    </section>
  );
}
