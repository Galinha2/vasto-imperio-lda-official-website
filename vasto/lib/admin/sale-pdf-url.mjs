// Only PDF revisions change this address; notes and workflow updates do not
// need to reload an open document.
export function salePdfUrl(sale, download = false) {
  const version = encodeURIComponent(String(sale.quoteRevision || 0));
  return `/api/admin/sales/${encodeURIComponent(sale.id)}/pdf?v=${version}${download ? "&download=1" : ""}`;
}
