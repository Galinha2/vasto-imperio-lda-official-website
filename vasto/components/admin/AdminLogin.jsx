"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowForward, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, remember }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace("/admin"); router.refresh();
    } catch (failure) { setError(failure.message || "Não foi possível iniciar sessão. Tente novamente."); }
    finally { setBusy(false); }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,#e5edf8,transparent_68%)]" />
      <div className="relative w-full max-w-[440px]">
        <div className="mb-9 text-center">
          <img src="/favicon.png" alt="Vasto Império" width="64" height="64" className="mx-auto h-16 w-16 rounded-2xl object-contain" />
          <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-[#86868b]">VASTO IMPÉRIO</p>
        </div>
        <section className="site-glass rounded-[32px] border border-white bg-white/95 p-7 shadow-[0_24px_80px_rgba(30,45,70,0.08)] sm:p-10">
          <div className="mb-7">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-lg text-[#6e6e73]"><IoLockClosedOutline /></span>
            <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.055em]">Bem-vindo de volta.</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#86868b]">Inicie sessão para gerir as suas vendas.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-xs font-semibold text-[#6e6e73]">Utilizador<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#e5e5e7] bg-[#fbfbfd] px-4 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" /></label>
            <label className="block text-xs font-semibold text-[#6e6e73]">Palavra-passe<span className="relative mt-2 block"><input required type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e5e7] bg-[#fbfbfd] pl-4 pr-12 text-sm text-[#1d1d1f] outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10" /><button type="button" aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} onClick={() => setVisible(!visible)} className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-lg text-[#86868b]">{visible ? <IoEyeOffOutline /> : <IoEyeOutline />}</button></span></label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-[#6e6e73]">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={busy} className="h-4 w-4 accent-[#0071e3]" />
              <span>Memorizar sessão</span>
            </label>
            {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0071e3] text-sm font-semibold text-white transition hover:bg-[#0067ce] disabled:cursor-wait disabled:opacity-60">{busy ? "A iniciar sessão…" : "Iniciar sessão"}{!busy && <IoArrowForward />}</button>
          </form>
        </section>
        <p className="mt-7 text-center text-xs text-[#a1a1a6]">Área privada · Vasto Império</p>
      </div>
    </main>
  );
}
