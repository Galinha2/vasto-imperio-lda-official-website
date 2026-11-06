'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/header/LanguageContext';
import { usePathname } from 'next/navigation';
import { IoCartOutline, IoCheckmarkOutline, IoTrashOutline, IoArrowForward, IoCloseOutline } from 'react-icons/io5';
import { CART_LIMIT, cartWithCurrentConfiguration, cartQuote, validCartEntry, normalizeCartEntry, cartEntryTitle } from '@/lib/simulator-cart.mjs';
import { captureCartDrawing, cartDrawing } from './cart-images';
import Image from 'next/image';
import {getSimulatorProductPhoto} from './SimulatorProductPhoto';
import styles from "./SimulatorCart.module.css";
import SimulatorCartEditor from "./SimulatorCartEditor";
import SimulatorOrderModal from './SimulatorOrderModal';

const CartContext = createContext(null);
export const useSimulatorCart = () => useContext(CartContext);
const money = value => new Intl.NumberFormat('pt-PT', { style:'currency', currency:'EUR' }).format(value);
export default function SimulatorCartProvider({ children }) {
  const pathname = usePathname();
  const admin = pathname.startsWith('/admin');
  return <CartState key={admin ? 'admin' : 'public'} admin={admin}>{children}</CartState>;
}
function CartState({ children, admin }) {
  const {language}=useLanguage();
  const english=language==='en';
  const [feedback,setFeedback]=useState(null);
  useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(null),6500);return()=>clearTimeout(timer);},[feedback]);
  function showCart(){setFeedback(null);setOpen(true);}
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
    setFeedback({id:next.id,label:cartEntryTitle(next),quantity:next.quantity});
    if(!admin)window.dispatchEvent(new Event('vasto:cart-added'));
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
  async function orderWith(entry) {
    if (!ready || busy) throw new Error('Aguarde um momento antes de enviar o pedido.');
    const current={...entry,id:crypto.randomUUID(),quantity:entry.baseQuantity || 1};
    if (!validCartEntry(current)) throw new Error('Confirme a configuração antes de encomendar.');
    const result=cartWithCurrentConfiguration(entriesRef.current,current);
    // Save the complete selection first; failures leave the cart available to retry.
    if (result.added) commit(result.entries);
    setBusy(true);setFeedback(null);setError('');
    try {
      const selected=result.entries;
      const image=await cartDrawing(selected);
      setCheckout({...cartQuote(selected),configurations:selected.map(({image,id,...item})=>item),image});
      setOpen(false);
    } finally {setBusy(false);}
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
  return <CartContext.Provider value={{entries, quote, add, edit, saveEdit, remove, change, ready, feedback, orderWith, show: showCart}}>
    {children}
    {feedback && !open && !editingEntry && !checkout && <div key={feedback.id} className={styles.addedToast}>
      <div className={styles.addedIcon} aria-hidden="true"><IoCheckmarkOutline size={20}/></div>
      <div className={styles.addedCopy}><div role="status"><strong>{english?'Added to your cart':'Adicionado ao carrinho'}</strong><p>{feedback.quantity} × {feedback.label}</p></div><button type="button" className={styles.viewCart} onClick={showCart}>{english?'View cart':'Ver carrinho'}<IoArrowForward size={14}/></button></div>
      <button type="button" className={styles.dismissToast} aria-label={english?'Dismiss confirmation':'Fechar confirmação'} onClick={()=>setFeedback(null)}><IoCloseOutline size={19}/></button>
    </div>}
    {editingEntry && <CartContext.Provider value={{entries, quote, add, edit, saveEdit, remove, change, ready, orderWith, editingId:editingEntry.id}}><SimulatorCartEditor key={editingEntry.id} entry={editingEntry} admin={admin} onClose={() => { setEditingEntry(null); if (!admin) setOpen(true); }} /></CartContext.Provider>}
    {open && !checkout && <div className={styles.overlay}>
      <section role="dialog" aria-modal="true" aria-labelledby="simulator-cart-title" className={styles.panel}>
        <header className={styles.header}><div><p className={styles.eyebrow}>A sua seleção</p><h2 id="simulator-cart-title">Rever o seu pedido</h2><p className={styles.subtitle}>{entries.length} {entries.length === 1 ? 'configuração, preparada à sua medida.' : 'configurações, preparadas à sua medida.'}</p></div><button type="button" className={styles.close} autoFocus onClick={() => setOpen(false)} aria-label="Fechar carrinho"><IoCloseOutline size={20} /></button></header>
        <div className={styles.body} role="region" aria-label="Artigos do carrinho" tabIndex={0}><div className={styles.listHeader}><h3>Artigos do pedido</h3><span>{entries.length} {entries.length === 1 ? 'configuração' : 'configurações'}</span></div>{error && <p role="alert" className={styles.error}>{error}</p>}<CartContents />{!entries.length && <p className={styles.empty}>Adicione uma configuração num dos simuladores.</p>}</div>
        <div className={styles.bottom}><p className={styles.summaryHeading}>Resumo do pedido</p><div className={styles.summaryRows}><p><span>Configurações</span><strong>{entries.length}</strong></p><p><span>IVA · 23%</span><strong>{money(quote.total * .23)}</strong></p></div><footer className={styles.footer}><div><p className={styles.totalLabel}>Total estimado</p><p className={styles.total}>{money(quote.total)}</p><p className={styles.tax}>Sem IVA · Transporte não incluído.</p><p className={styles.totalWithVat}>Com IVA: {money(quote.total * 1.23)}</p></div><button type="button" disabled={busy || !entries.length} onClick={prepareCheckout} className={styles.checkout}>{busy ? 'A preparar…' : 'Enviar pedido completo'}<IoArrowForward size={17} /></button></footer><button type="button" onClick={() => setOpen(false)} className={styles.continue}>Continuar a simular</button></div>
      </section>
    </div>}
    {checkout && <SimulatorOrderModal open onClose={() => {setCheckout(null); setOpen(false);}} {...checkout} details={checkout.details} imageSrc={checkout.image} cartOrder cartConfigurations={checkout.configurations} onSent={sent} />}
  </CartContext.Provider>;
}
export function CartContents() {
  const cart = useSimulatorCart();
  if (!cart) return null;
  return <ul className={styles.list}>{cart.entries.map((entry,index) => <li key={entry.id} className={styles.item}>
    <div className={styles.itemMedia}>
      <figure className={styles.drawingFigure}><div className={styles.preview}><img src={entry.image} alt={`Desenho ${index + 1}: ${entry.label}`} /></div><figcaption>O seu desenho</figcaption></figure>
      <CartProductPhoto entry={entry}/>
    </div>
    <div className={styles.content}><span className={styles.index}>Configuração {String(index+1).padStart(2,'0')}</span><h3 className={styles.title}>{cartEntryTitle(entry)}</h3>
      <div className={styles.controls}><label className={styles.quantityLabel} htmlFor={`cart-quantity-${entry.id}`}>Quantidade</label><div className={styles.quantity}><button type="button" disabled={entry.quantity <= 1} onClick={() => cart.change(entry.id,entry.quantity-1)} aria-label={`Diminuir quantidade da configuração ${index+1}`}>−</button><input id={`cart-quantity-${entry.id}`} type="number" min="1" step="1" aria-label={`Quantidade de ${entry.label} ${index+1}`} value={entry.quantity} onChange={event => cart.change(entry.id,Number(event.target.value))} onFocus={event => event.target.select()} /><button type="button" onClick={() => cart.change(entry.id,entry.quantity+1)} aria-label={`Aumentar quantidade da configuração ${index+1}`}>+</button></div><button type="button" onClick={() => cart.edit(entry)} className={styles.edit} aria-label={`Editar configuração ${index+1}`}>Editar</button></div>
      <details className={styles.details}><summary>Ver configuração</summary><p>{entry.details}</p></details>
    </div>
    <div className={styles.aside}><span className={styles.price}><small>Total da configuração</small>{money(cartQuote([entry]).total)}</span><button type="button" onClick={() => cart.remove(entry.id)} title="Remover configuração" aria-label={`Remover configuração ${index+1}`} className={styles.remove}><IoTrashOutline size={18} /><span>Remover</span></button></div>
  </li>)}</ul>;
}
function CartProductPhoto({entry}) {
  const photo=getSimulatorProductPhoto(entry.simulatorType,entry.configuration?.galvanized);
  if(!photo)return null;
  return <figure className={styles.realFigure}><div className={styles.realPreview}><Image src={photo.src} width={photo.width} height={photo.height} sizes="(max-width: 760px) 30vw, 210px" alt={photo.pt}/></div><figcaption>{entry.simulatorType==='picking'?photo.finishPt:'Fotografia de referência'}</figcaption></figure>;
}
export function AddToSimulatorCart({ quoteRef, getQuote, drawingRef, label, english = false, disabled = false, onOrder }) {
  const cart = useSimulatorCart();
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  async function add(orderNow = false) {
    if (busy) return;
    if (orderNow && !cart?.entries.length) { onOrder?.(); return; }
    setBusy(true); setNotice('');
    try {
      const quote = getQuote ? getQuote() : quoteRef.current;
      if (!quote || quote.unavailable || !quote.items?.length) throw new Error('Confirme a configuração antes de adicionar.');
      // Freeze data before awaiting the drawing capture.
      const snapshot = JSON.parse(JSON.stringify(quote));
      const entry = {label,simulatorType:snapshot.simulatorType,configuration:snapshot.configuration,...(snapshot.rowCount ? {baseQuantity:snapshot.rowCount} : {}),details:snapshot.details || '',items:snapshot.items,discountPercent:Number(snapshot.discountPercent || 0),image:await captureCartDrawing(drawingRef)};
      if (orderNow) { await cart.orderWith(entry); return; }
      if (cart.editingId) cart.saveEdit(cart.editingId,entry); else cart.add(entry);
      setNotice(english ? 'Added to cart.' : 'Adicionado ao carrinho.');
    } catch (failure) { setNotice(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="mt-3"><div className={onOrder ? styles.simulatorActions : undefined}><button type="button" disabled={disabled || busy || !cart?.ready} onClick={()=>add(false)} className={`${styles.addToCartPrimary} ${onOrder ? styles.addToCartBlue : ''}`}><IoCartOutline size={21}/>{busy ? (english ? 'Adding…' : 'A adicionar…') : (cart?.editingId ? (english ? 'Save cart changes' : 'Guardar alterações no carrinho') : (english ? 'Add to cart' : 'Adicionar ao carrinho'))}</button>{onOrder && <button type="button" disabled={disabled || busy || !cart?.ready} onClick={()=>add(true)} className={styles.addToCartPrimary}><IoArrowForward size={20}/>{busy ? (english?'Preparing…':'A preparar…') : (english?'Order':'Encomendar')}</button>}</div>{!cart?.editingId && <p className={styles.addToCartHint}>{english?'Combine different shelving configurations in one request.':'Junte diferentes estantes num único pedido.'}</p>}{notice && <p role="status" className="mt-2 text-xs text-[#6e6e73]">{notice}</p>}</div>;
}

export function SimulatorHeaderCart({english=false}) {
  const cart=useSimulatorCart();
  if(!cart?.ready || !cart.entries.length)return null;
  const count=cart.entries.length;
  const label=english?`Open cart · ${count} configurations`:`Abrir carrinho · ${count} configurações`;
  return <button type="button" className={`${styles.headerCart} ${cart.feedback ? styles.headerCartAdded : ''}`} onClick={cart.show} disabled={!cart.ready} aria-label={label} title={english?'Your cart':'O seu carrinho'} aria-haspopup="dialog"><span key={`icon-${cart.feedback?.id || 'idle'}`} className={`${styles.cartIconFrame} ${cart.feedback ? styles.cartConfirmed : ''}`} aria-hidden="true"><span className={styles.cartSymbol}><IoCartOutline size={20}/></span>{cart.feedback&&<svg className={styles.cartCheck} width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="m5 12 4.5 4.5L19 7" pathLength="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>{count>0&&<span key={`badge-${cart.feedback?.id || 'count'}`} className={`${styles.headerCartBadge} ${cart.feedback ? styles.cartCountUpdated : ''}`}>{count}</span>}</button>;
}
