function Skeleton({ className = "" }) {
  return <span aria-hidden="true" className={`loading-skeleton block rounded-xl ${className}`} />;
}

function ImageSlot({ className = "" }) {
  return (
    <div className={`loading-image-placeholder relative flex items-center justify-center overflow-hidden rounded-[24px] ${className}`}>
      <span className="loading-spinner" />
    </div>
  );
}

function PageFrame({ label, children, className = "" }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={`min-h-[70vh] bg-[#f5f5f7] px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-12 ${className}`}>
      <span className="sr-only">{label}</span>
      <div className="mx-auto max-w-[1480px]">{children}</div>
    </div>
  );
}

export function HomeLoading() {
  return (
    <PageFrame label="A carregar a página inicial">
      <section className="grid min-h-[440px] gap-8 rounded-[32px] border border-[#e5e5e7] bg-white p-6 sm:p-10 lg:min-h-[560px] lg:grid-cols-2 lg:items-center lg:p-14">
        <div className="space-y-5">
          <Skeleton className="h-7 w-48 rounded-full" />
          <Skeleton className="h-12 w-full max-w-xl sm:h-16" />
          <Skeleton className="h-12 w-4/5 max-w-lg sm:h-16" />
          <Skeleton className="h-5 w-full max-w-lg" />
          <Skeleton className="h-5 w-3/4 max-w-md" />
          <div className="flex gap-3 pt-2"><Skeleton className="h-12 w-36 rounded-full" /><Skeleton className="h-12 w-40 rounded-full" /></div>
        </div>
        <ImageSlot className="h-[240px] sm:h-[320px] lg:h-[400px]" />
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.8fr_0.9fr]">
        <div className="grid gap-5 sm:grid-cols-2">{[0, 1].map((item) => <article key={item} className="rounded-[28px] bg-white p-4"><ImageSlot className="h-64" /><Skeleton className="mt-5 h-6 w-3/4" /><Skeleton className="mt-3 h-4 w-full" /></article>)}</div>
        <article className="space-y-4 rounded-[28px] bg-white p-6"><Skeleton className="h-7 w-3/4" />{[0, 1, 2, 3].map((item) => <div key={item} className="flex gap-3 rounded-2xl bg-[#f5f5f7] p-4"><Skeleton className="h-10 w-10 shrink-0 rounded-2xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /></div></div>)}</article>
      </section>
    </PageFrame>
  );
}

export function ProductsLoading() {
  return (
    <PageFrame label="A carregar o catálogo de produtos">
      <section className="grid min-h-[300px] gap-6 rounded-[32px] bg-white p-7 sm:p-10 lg:grid-cols-2 lg:items-center lg:p-14">
        <div className="space-y-4"><Skeleton className="h-6 w-40 rounded-full" /><Skeleton className="h-12 w-full max-w-lg" /><Skeleton className="h-5 w-4/5" /></div>
        <ImageSlot className="h-52 lg:h-64" />
      </section>
      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {["lg:col-span-2 lg:row-span-2", "", "", "", "lg:col-span-2", "", "", ""].map((size, i) => <article key={i} className={`flex min-h-[300px] flex-col overflow-hidden rounded-[28px] border border-[#e5e5e7] bg-white ${size}`}><ImageSlot className="m-3 flex-1" /><div className="space-y-3 border-t border-[#eee] p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></article>)}
      </section>
    </PageFrame>
  );
}

export function ProductDetailLoading() {
  return (
    <PageFrame label="A carregar os detalhes do produto">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4"><ImageSlot className="min-h-[380px] sm:min-h-[560px]" /><div className="grid grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map((item) => <ImageSlot key={item} className="h-20 sm:h-24" />)}</div></div>
        <article className="rounded-[30px] border border-[#e5e5e7] bg-white p-6 sm:p-9"><Skeleton className="h-5 w-36 rounded-full" /><Skeleton className="mt-5 h-10 w-full" /><Skeleton className="mt-2 h-10 w-4/5" /><Skeleton className="mt-6 h-4 w-full" /><Skeleton className="mt-2 h-4 w-5/6" /><div className="mt-10 space-y-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full rounded-2xl" />)}</div><Skeleton className="mt-8 h-12 w-48 rounded-full" /></article>
      </section>
    </PageFrame>
  );
}

export function SimulatorChooserLoading() {
  return (
    <PageFrame label="A carregar os simuladores">
      <header className="mb-8 max-w-3xl space-y-4"><Skeleton className="h-5 w-44 rounded-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-5 w-4/5" /></header>
      <div className="mb-8 flex flex-wrap gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-48 rounded-full" />)}</div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <article key={item} className="overflow-hidden rounded-[30px] border border-[#e5e5e7] bg-white"><ImageSlot className="h-56 rounded-none" /><div className="space-y-3 p-6"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-11 w-36 rounded-full" /></div></article>)}</div>
    </PageFrame>
  );
}

export function SimulatorConfigLoading({ kind = "picking" }) {
  const previewColor = kind === "racks" ? "bg-[#fff0e8]" : kind === "light" ? "bg-white" : "bg-[#f5f9ff]";
  return (
    <PageFrame label="A carregar o configurador de estantes" className="pt-10 lg:pt-14">
      <header className="mb-7 space-y-4"><Skeleton className="h-5 w-44 rounded-full" /><Skeleton className="h-11 w-3/4 max-w-2xl" /></header>
      <div className="mb-7 flex flex-wrap gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14 w-44 rounded-full" />)}</div>
      <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.5fr)]">
        <article className="space-y-5 rounded-[30px] border border-[#e5e5e7] bg-white p-6 sm:p-8"><Skeleton className="h-7 w-40" />{[0, 1, 2, 3, 4].map((item) => <div key={item} className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-12 w-full rounded-full" /></div>)}<div className="grid grid-cols-2 gap-3"><Skeleton className="h-12 rounded-full" /><Skeleton className="h-12 rounded-full" /></div></article>
        <article className="rounded-[30px] border border-[#e5e5e7] bg-white p-5 sm:p-7"><div className="flex justify-between"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-36" /></div><div className={`mt-6 flex min-h-[360px] items-center justify-center rounded-[24px] ${previewColor}`}><ImageSlot className="h-[280px] w-[80%] bg-transparent" /></div><div className="mt-5 flex gap-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-12 w-32 rounded-[20px]" />)}</div></article>
      </section>
    </PageFrame>
  );
}

export function HandlingLoading() {
  return (
    <PageFrame label="A carregar os equipamentos de movimentação de carga">
      <header className="mb-8 max-w-3xl space-y-4"><Skeleton className="h-5 w-48 rounded-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-5 w-4/5" /></header>
      <div className="mb-8 flex gap-3"><Skeleton className="h-14 w-48 rounded-full" /><Skeleton className="h-14 w-48 rounded-full" /></div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <article key={item} className="rounded-[30px] border border-[#e5e5e7] bg-white p-5"><ImageSlot className="h-64" /><Skeleton className="mt-5 h-6 w-3/4" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-5 h-11 w-40 rounded-full" /></article>)}</div>
    </PageFrame>
  );
}

export function BudgetLoading({ admin = false }) {
  return (
    <PageFrame label={admin ? "A carregar a gestão de orçamentos" : "A carregar o formulário de orçamento"}>
      <header className="mb-8 space-y-4"><Skeleton className="h-5 w-40 rounded-full" /><Skeleton className="h-11 w-3/4 max-w-2xl" /></header>
      {admin ? <section className="rounded-[28px] border border-[#e5e5e7] bg-white p-6"><div className="mb-6 flex justify-between"><Skeleton className="h-10 w-56 rounded-full" /><Skeleton className="h-10 w-36 rounded-full" /></div>{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="grid grid-cols-4 gap-4 border-t border-[#eee] py-5"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-8 w-20 rounded-full" /></div>)}</section> : <section className="grid gap-6 lg:grid-cols-[1fr_0.7fr]"><article className="grid gap-4 rounded-[30px] border border-[#e5e5e7] bg-white p-6 sm:grid-cols-2 sm:p-8">{[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <div key={item} className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-12 w-full rounded-full" /></div>)}<Skeleton className="h-12 w-40 rounded-full sm:col-span-2" /></article><ImageSlot className="min-h-[300px]" /></section>}
    </PageFrame>
  );
}

export function ContactLoading() {
  return (
    <PageFrame label="A carregar a página de contacto">
      <section className="grid min-h-[260px] gap-6 rounded-[30px] bg-white p-7 sm:p-10 lg:grid-cols-2 lg:items-center"><div className="space-y-4"><Skeleton className="h-5 w-40 rounded-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-4 w-4/5" /></div><ImageSlot className="h-48" /></section>
      <section className="mt-8 rounded-[32px] border border-[#e5e5e7] bg-white p-7 sm:p-10"><Skeleton className="mx-auto h-8 w-56" /><Skeleton className="mx-auto mt-3 h-4 w-80 max-w-full" /><div className="mt-8 grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <article key={item} className="space-y-4 rounded-[24px] bg-[#f5f5f7] p-6"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /></article>)}</div></section>
    </PageFrame>
  );
}

export function AboutLoading() {
  return (
    <PageFrame label="A carregar a página sobre nós">
      <section className="grid gap-8 rounded-[32px] border border-[#e5e5e7] bg-white p-6 sm:p-10 lg:grid-cols-2 lg:p-14"><ImageSlot className="min-h-[300px] lg:min-h-[440px]" /><div className="space-y-5 py-3"><Skeleton className="h-5 w-40 rounded-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-6 h-12 w-40 rounded-full" /></div></section>
      <section className="mt-8 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <article key={item} className="space-y-3 rounded-[24px] bg-white p-6"><Skeleton className="h-10 w-10 rounded-2xl" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /></article>)}</section>
    </PageFrame>
  );
}

export function SuccessLoading() {
  return (
    <PageFrame label="A carregar a confirmação do pedido" className="grid place-items-center">
      <section className="w-full max-w-2xl rounded-[32px] border border-[#e5e5e7] bg-white px-7 py-12 text-center sm:px-12"><span className="loading-skeleton mx-auto block h-16 w-16 rounded-full" /><Skeleton className="mx-auto mt-7 h-9 w-3/4" /><Skeleton className="mx-auto mt-4 h-4 w-full max-w-md" /><Skeleton className="mx-auto mt-2 h-4 w-4/5 max-w-sm" /><Skeleton className="mx-auto mt-8 h-12 w-44 rounded-full" /></section>
    </PageFrame>
  );
}
