function Spinner() {
  return (
    <span className="inline-flex items-center gap-2.5 text-sm text-[#6e6e73]" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d2d2d7] border-t-(--orange) motion-reduce:animate-none" aria-hidden="true" />
      <span>A carregar…</span>
    </span>
  );
}

export default Spinner;
