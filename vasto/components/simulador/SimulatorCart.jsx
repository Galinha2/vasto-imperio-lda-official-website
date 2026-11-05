'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IoBagOutline, IoTrashOutline } from 'react-icons/io5';
import { CART_LIMIT, cartQuote, validCartEntry, normalizeCartEntry, cartEntryTitle } from '@/lib/simulator-cart.mjs';
import { captureCartDrawing, cartDrawing } from './cart-images';
import SimulatorCartEditor from "./SimulatorCartEditor";
import SimulatorOrderModal from './SimulatorOrderModal';

const CartContext = createContext(null);
export const useSimulatorCart = () => useContext(CartContext);
const money = value => new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR' }).format(value);
const button = 'cursor-pointer rounded-full border border-[#e5e5e7] bg-white px-4 py-2.5 text-sm font-medium text-[#1d1d1f] transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-50';
export default function SimulatorCartProvider({ children }) {
  const pathname = usePathname();
  const admin = pathname.startsWith('/admin');
  return <CartState key={admin ? 'admin' : 'public'} admin={admin}>{children}</CartState>;
}
function CartState({ children, admin }) {
  const pathname = usePathname();
  const storageKey = admin ? 'vasto-simulator-cart-admin-v1' : 'vasto-simulator-cart-public-v1';
  const [entries, setEntries] = useState([]);
  const entriesRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const saved = Array.isArray(raw) ? raw.map(normalizeCartEntry) : raw;
      if (Array.isArray(saved) && saved.length <= CART_LIMIT && saved.every(validCartEntry)) { entriesRef.current = saved; setEntries(saved); }
    } catch { /* A new cart remains available if saved data is invalid. */ }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if ((!open && !editingEntry) || checkout) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, checkout, editingEntry]);
  function commit(next) {
    // Persist before changing state so quota failures never silently lose configurations.
    localStorage.setItem(storageKey, JSON.stringify(next));
    entriesRef.current = next; setEntries(next); setCheckout(null);
  }
  function add(entry) {
    if (!ready) throw new Error('O carrinho está a carregar. Tente novamente.');
    if (entriesRef.current.length >= CART_LIMIT) throw new Error(`Pode juntar até ${CART_LIMIT} configurações por pedido.`);
    const next = { ...entry, id: crypto.randomUUID(), quantity: entry.baseQuantity || 1 };
    if (!validCartEntry(next)) throw new Error('Não foi possível preparar esta configuração. Confirme as medidas.');
    try { commit([...entriesRef.current, next]); }
    catch { throw new Error('Não foi possível guardar o carrinho neste navegador. Verifique o espaço disponível.'); }
  }
  function edit(entry) { setOpen(false); setCheckout(null); setEditingEntry(entry); }
  function saveEdit(id, entry) {
    const original = entriesRef.current.find(item => item.id === id);
    if (!original) throw new Error('Esta configuração já não está no carrinho.');
    const updated = {...entry, id, quantity:entry.baseQuantity || original.quantity};
    if (!validCartEntry(updated)) throw new Error('Confirme as medidas da configuração.');
    commit(entriesRef.current.map(item => item.id === id ? updated : item));
    setEditingEntry(null);
    if (!admin) setOpen(true);
  }
  function change(id, quantity) {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return;
    try { commit(entriesRef.current.map(entry => entry.id === id ? {...entry, quantity} : entry)); setError(''); }
    catch { setError('Não foi possível guardar a alteração no carrinho.'); }
  }
  function remove(id) {
    try { commit(entriesRef.current.filter(entry => entry.id !== id)); setError(''); }
    catch { setError('Não foi possível remover a configuração.'); }
  }
  async function prepareCheckout() {
    if (busy || !entries.length) return;
    setBusy(true); setError('');
    try { setCheckout({ ...cartQuote(entries), configurations: entries.map(({image, id, ...entry}) => entry), image: await cartDrawing(entries) }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function sent() {
    try { localStorage.removeItem(storageKey); } catch { /* Do not turn a successful order into an error. */ }
    entriesRef.current = []; setEntries([]); setOpen(false);
  }
  const quote = cartQuote(entries);
  return <CartContext.Provider value={{entries, quote, add, edit, saveEdit, remove, change, ready, show: () => setOpen(true)}}>
    {children}
    {editingEntry && <CartContext.Provider value={{entries, quote, add, edit, saveEdit, remove, change, ready, editingId:editingEntry.id}}><SimulatorCartEditor key={editingEntry.id} entry={editingEntry} admin={admin} onClose={() => { setEditingEntry(null); if (!admin) setOpen(true); }} /></CartContext.Provider>}
    {!admin && entries.length > 0 && !pathname.startsWith('/admin') && <button type="button" onClick={() => setOpen(true)} className={`${button} fixed bottom-14 right-4 z-50 flex items-center gap-2 shadow-lg`} aria-label={`Abrir carrinho com ${entries.length} configurações`}><IoBagOutline />Carrinho <span className="rounded-full bg-[#007aff] px-2 py-0.5 text-xs text-white">{entries.length}</span></button>}
    {open && !checkout && <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/30 p-3 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="simulator-cart-title" className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-3xl bg-white p-5 shadow-xl sm:p-7"><header className="mb-5 flex items-center justify-between"><h2 id="simulator-cart-title" className="text-2xl font-semibold tracking-tight">O seu carrinho</h2><button type="button" className={button} autoFocus onClick={() => setOpen(false)} aria-label="Fechar carrinho">×</button></header><div className="min-h-0 overflow-y-auto"><CartContents />{!entries.length && <p className="py-8 text-sm text-[#86868b]">Adicione uma configuração num dos simuladores.</p>}</div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e5e7] pt-5"><p className="text-lg font-semibold">{money(quote.total)} <small className="text-xs font-normal text-[#86868b]">+ IVA · transporte não incluído</small></p><button type="button" disabled={busy || !entries.length} onClick={prepareCheckout} className={`${button} !bg-[#007aff] !text-white`}>{busy ? 'A preparar…' : 'Enviar pedido completo'}</button></footer><button type="button" onClick={() => setOpen(false)} className="mt-4 cursor-pointer text-sm text-[#007aff]">Continuar a simular</button></section></div>}
    {checkout && <SimulatorOrderModal open onClose={() => {setCheckout(null); setOpen(false);}} {...checkout} details={checkout.details} imageSrc={checkout.image} cartOrder cartConfigurations={checkout.configurations} onSent={sent} />}
  </CartContext.Provider>;
}
export function CartContents() {
  const cart = useSimulatorCart();
  if (!cart) return null;
  return <ul className="divide-y divide-[#e5e5e7]">{cart.entries.map((entry,index) => <li key={entry.id} className="flex gap-3 py-4"><img src={entry.image} alt={`Desenho ${index + 1}: ${entry.label}`} className="h-20 w-24 rounded-lg border border-[#e5e5e7] object-contain" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{index+1}. {cartEntryTitle(entry)}</h3><p className="mt-1 line-clamp-2 text-xs text-[#86868b]">{entry.details}</p><div className="mt-2 flex flex-wrap items-center gap-3"><label className="text-xs">Quantidade <input type="number" min="1" step="1" aria-label={`Quantidade de ${entry.label} ${index+1}`} value={entry.quantity} onChange={event => cart.change(entry.id,Number(event.target.value))} onFocus={event => event.target.select()} className="ml-2 w-20 rounded-lg border border-[#e5e5e7] p-1" /></label><span className="text-sm font-medium">{money(cartQuote([entry]).total)}</span></div><button type="button" onClick={() => cart.edit(entry)} className="cursor-pointer self-start rounded-full px-3 py-2 text-xs font-medium text-[#007aff] hover:bg-blue-50" aria-label={`Editar configuração ${index+1}`}>Editar</button></div><button type="button" onClick={() => cart.remove(entry.id)} aria-label={`Remover configuração ${index+1}`} className="cursor-pointer self-start rounded-full p-2 text-[#86868b] hover:bg-red-50 hover:text-red-600"><IoTrashOutline /></button></li>)}</ul>;
}
export function AddToSimulatorCart({ quoteRef, getQuote, drawingRef, label, english = false, disabled = false }) {
  const cart = useSimulatorCart();
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  async function add() {
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      const quote = getQuote ? getQuote() : quoteRef.current;
      if (!quote || quote.unavailable || !quote.items?.length) throw new Error('Confirme a configuração antes de adicionar.');
      // Freeze data before awaiting the drawing capture.
      const snapshot = JSON.parse(JSON.stringify(quote));
      const entry = {label,simulatorType:snapshot.simulatorType,configuration:snapshot.configuration,...(snapshot.rowCount ? {baseQuantity:snapshot.rowCount} : {}),details:snapshot.details || '',items:snapshot.items,discountPercent:Number(snapshot.discountPercent || 0),image:await captureCartDrawing(drawingRef)};
      if (cart.editingId) cart.saveEdit(cart.editingId,entry); else cart.add(entry);
      setNotice(english ? 'Added to cart.' : 'Adicionado ao carrinho.');
    } catch (failure) { setNotice(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="mt-3"><button type="button" disabled={disabled || busy || !cart?.ready} onClick={add} className={`${button} flex w-full items-center justify-center gap-2`}><IoBagOutline />{busy ? (english ? 'Adding…' : 'A adicionar…') : (cart?.editingId ? (english ? 'Save cart changes' : 'Guardar alterações no carrinho') : (english ? 'Add to cart' : 'Adicionar ao carrinho'))}</button>{notice && <p role="status" className="mt-2 text-xs text-[#6e6e73]">{notice}</p>}</div>;
}
