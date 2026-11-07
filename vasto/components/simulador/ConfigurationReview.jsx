'use client';
import { useState } from 'react';
import { configurationDimensions, estimatedTax, capacityConditions } from '@/lib/configuration-summary.mjs';
import { captureCartDrawing } from './cart-images';

export default function ConfigurationReview({ requested, effective, rows, total, english = false }) {
  const dimensions = configurationDimensions(requested, effective, rows);
  const meters = value => `${value.toLocaleString(english ? 'en-IE' : 'pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`;
  const money = value => new Intl.NumberFormat(english ? 'en-IE' : 'pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  return <div className="mt-5 space-y-4" data-configuration-review>
    <div className="rounded-2xl border border-[#dedee3] bg-[#fbfbfd] p-4 text-sm text-[#1d1d1f]">
      <div className="grid grid-cols-2 gap-3"><p><span className="block text-xs text-[#6e6e73]">{english ? 'Requested / row' : 'Pedido / fila'}</span><strong>{dimensions.valid ? meters(dimensions.requested) : '—'}</strong></p><p><span className="block text-xs text-[#6e6e73]">{english ? 'Actual / row' : 'Efetivo / fila'}</span><strong>{meters(dimensions.effective)}</strong></p></div>
      <p className={`mt-3 border-t border-[#e5e5e7] pt-3 text-xs leading-6 ${dimensions.difference ? 'font-semibold text-[#b7490b]' : 'text-[#626268]'}`}>
        {!dimensions.valid ? (english ? 'Enter a valid length.' : 'Introduza um comprimento válido.') : dimensions.difference ? `${english ? 'Difference' : 'Diferença'}: ${dimensions.difference > 0 ? '+' : '−'}${meters(Math.abs(dimensions.difference))}. ${english ? 'The modules produce a different length. Check the available space.' : 'A combinação de módulos resulta numa medida diferente. Confirme o espaço disponível.'}` : (english ? 'The actual length matches your request.' : 'O comprimento efetivo corresponde ao pedido.')}
      </p><p className="mt-1 text-xs leading-5 text-[#626268]">{english ? 'Actual dimensions include the structure allowed for by this configurator. Check installation clearances on site.' : 'A medida efetiva inclui a estrutura contabilizada neste configurador. Confirme as folgas de instalação no local.'}</p>
    </div>
    <p className="text-sm font-semibold text-[#424245]">{english ? 'Estimated with VAT' : 'Estimativa com IVA'}: {money(estimatedTax(total).gross)} <span className="block text-xs font-normal text-[#6e6e73]">{english ? '23% · mainland Portugal reference. Final tax subject to confirmation.' : 'Referência de 23% · Portugal continental. Tributação final sujeita a confirmação.'}</span></p>
    <details className="text-xs leading-6 text-[#626268]"><summary className="cursor-pointer font-semibold text-[#424245]">{english ? 'How to read the load capacity' : 'Como interpretar a capacidade de carga'}</summary><p className="mt-2">{capacityConditions[english ? 'en' : 'pt']}</p></details>

  </div>;
}

export function ConfigurationPdfDownload({ quoteRef, drawingRef, english = false }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function download() {
    setBusy(true); setError('');
    try {
      const quote = quoteRef.current;
      if (!quote || quote.unavailable) throw new Error(english ? 'Check the configuration first.' : 'Confirme primeiro a configuração.');
      const image = await captureCartDrawing(drawingRef, Infinity);
      const { default: exportPdf } = await import('@/lib/download-configuration-pdf');
      await exportPdf({ quote, image, english });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="mt-4" data-configuration-pdf>
    <button type="button" disabled={busy} onClick={download} className="w-full cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-4 py-3 text-sm font-semibold text-[#424245] transition hover:bg-[#f5f5f7] disabled:opacity-50">{busy ? (english ? 'Preparing PDF…' : 'A preparar PDF…') : (english ? 'Download configuration PDF' : 'Descarregar resumo em PDF')}</button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
