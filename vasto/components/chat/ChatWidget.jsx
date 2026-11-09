'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IoChatbubblesOutline, IoCloseOutline, IoArrowUp } from 'react-icons/io5';
import styles from './Chat.module.css';
import ChatMessages from './ChatMessages';
import {prepareChatImage} from '@/lib/prepare-chat-image.mjs';
import {mergeChatMessages} from '@/lib/chat-sync.mjs';
import {CHAT_REPLY_WAIT_MS, unansweredSince} from '@/lib/chat-waiting.mjs';
import {IoCallOutline} from 'react-icons/io5';
import {IoImageOutline} from 'react-icons/io5';

export default function ChatWidget({ preview = false }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(preview);
  const [readIds, setReadIds] = useState([]);
  const [pageVisible, setPageVisible] = useState(true);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const endButton = useRef(null);
  const generation = useRef(0);
  const end = useRef(null);
  const followMessages = useRef(true);
  const launcher = useRef(null);
  const screen = useRef(null);
  const hidden = pathname.startsWith('/admin') && !preview;
  const [now, setNow] = useState(Date.now);
  const waitingSince = unansweredSince(messages);
  const delayed = waitingSince !== null && now - waitingSince >= CHAT_REPLY_WAIT_MS;
  useEffect(() => {
    if (waitingSince === null || !open || hidden) return;
    const update = () => setNow(Date.now());
    update();
    const timer = setTimeout(update, Math.max(0, waitingSince + CHAT_REPLY_WAIT_MS - Date.now()) + 20);
    document.addEventListener('visibilitychange', update);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', update); };
  }, [waitingSince, open, hidden]);
  useEffect(() => {
    if (hidden) return;
    const media = window.matchMedia('(max-width: 1023px) and (pointer: coarse), (max-width: 767px)');
    const viewport = window.visualViewport;
    const previousOverflow = document.body.style.overflow;
    const resize = () => {
      if (viewport && viewport.scale > 1.05) return;
      document.body.style.overflow = open && media.matches ? 'hidden' : previousOverflow;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportHeight = viewport?.height || window.innerHeight;
      screen.current?.style.setProperty('--visitor-chat-height', `${viewportHeight}px`);
      screen.current?.style.setProperty('--visitor-chat-top', `${viewportTop}px`);
      if (media.matches && !open) {
        const bottomOffset = Math.max(20, window.innerHeight - viewportTop - viewportHeight + 20);
        screen.current?.style.setProperty('--visitor-chat-bottom', `${bottomOffset}px`);
      } else {
        screen.current?.style.removeProperty('--visitor-chat-bottom');
      }
    };
    resize(); media.addEventListener('change', resize);
    viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize); window.addEventListener('scroll', resize, { passive: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener('change', resize); viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', resize);
    };
  }, [open, hidden]);
  useEffect(() => {
    if (hidden) return;
    let active = true;
    let pending = false;
    let syncThread = null, since = null;
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      const version = generation.current;
      try {
        const response = await fetch(`/api/chat${syncThread && since ? `?thread=${encodeURIComponent(syncThread)}&since=${encodeURIComponent(since)}` : ''}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active && version === generation.current) {
          setThread(data.thread);
          setMessages(current => data.incremental ? mergeChatMessages(current, data.messages) : data.messages);
          if (syncThread !== data.thread?.id) since = null;
          syncThread = data.thread?.id || null;
          since = data.messages.at(-1)?.created_at || since || new Date(0).toISOString();
          setError('');
        }
      } catch (error) { if (active && version === generation.current) setError(error.message || 'Não foi possível ligar ao chat.'); }
      finally { pending = false; if (active) setLoading(false); }
    }
    refresh();
    const timer = setInterval(refresh, 4000);
    const visible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [open, hidden]);
  useEffect(() => {
    function loadReadIds() {
      try {
        const saved = JSON.parse(localStorage.getItem('vasto-chat-read') || '[]');
        if (Array.isArray(saved)) setReadIds(saved.filter(id => typeof id === 'string').slice(-500));
      } catch { /* The counter still works when storage is unavailable. */ }
    }
    const visibility = () => setPageVisible(!document.hidden);
    const storage = event => { if (event.key === 'vasto-chat-read') loadReadIds(); };
    loadReadIds(); visibility();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('storage', storage);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(() => {
    if (!open || hidden || !pageVisible) return;
    const staffIds = messages.filter(item => item.sender === 'staff').map(item => item.id);
    if (staffIds.every(id => readIds.includes(id))) return;
    const next = [...new Set([...readIds, ...staffIds])].slice(-500);
    setReadIds(next);
    try { localStorage.setItem('vasto-chat-read', JSON.stringify(next)); } catch { /* Keep read state in memory. */ }
  }, [messages, open, hidden, pageVisible, readIds]);
  const unread = messages.filter(item => item.sender === 'staff' && !readIds.includes(item.id)).length;
  useEffect(() => {
    if (!open || hidden || !thread) return;
    function presence(isOpen) {
      const body = JSON.stringify({ action: 'presence', open: isOpen });
      if (!isOpen && navigator.sendBeacon) {
        navigator.sendBeacon('/api/chat', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
      }
    }
    const update = () => presence(!document.hidden);
    const leave = () => presence(false);
    update();
    const timer = setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pagehide', leave);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [open, hidden, !!thread]);
  useEffect(() => { if (followMessages.current || pendingMessage) end.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }, [messages.length, open, delayed, pendingMessage]);
  function close() { followMessages.current = true; setConfirmEnd(false); setOpen(false); launcher.current?.focus(); }
  function cancelEnd() {
    setConfirmEnd(false);
    requestAnimationFrame(() => endButton.current?.focus());
  }
  async function endConversation() {
    if (busy) return;
    setBusy(true); setError(''); generation.current++;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'end' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      generation.current++;
      setThread(null); setMessages([]); setName(''); setContact(''); setMessage(''); setEnded(true);
      close();
    } catch (error) { setError(error.message || 'Não foi possível terminar a conversa. Tente novamente.'); }
    finally { setBusy(false); }
  }
  async function sendImage(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    if (!thread && !name.trim()) { setError('Preencha o seu nome antes de enviar uma imagem.'); return; }
    if (!thread && contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) { setError('Indique um email válido ou deixe o campo vazio.'); return; }
    setBusy(true); setError('');
    try {
      const image = await prepareChatImage(file);
      const form = new FormData(); form.append('image', image, 'imagem.webp');
      form.append('name', name); form.append('contact', contact);
      const response = await fetch('/api/chat/images', {method:'POST', body:form});
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setThread(data.thread); setMessages(data.messages); setEnded(false);
    } catch (error) { setError(error.message || 'Não foi possível enviar a imagem.'); }
    finally { setBusy(false); }
  }
  async function send(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setPendingMessage(message.trim());
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, contact, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setThread(data.thread); setMessages(data.messages); setMessage(''); setEnded(false);
    } catch (error) { setError(error.message || 'Não foi possível enviar. Tente novamente.'); }
    finally { setBusy(false); setPendingMessage(''); }
  }
  if (hidden) return null;
  return <div ref={screen} className={`${styles.widget} ${open ? styles.widgetOpen : ''}`}>
    {open && <section className={styles.panel} role="dialog" aria-labelledby="chat-title" onKeyDown={e => { if (e.key === 'Escape') { if (confirmEnd) { e.stopPropagation(); cancelEnd(); } else close(); } }}>
      <header className={styles.header}><div><p className={styles.eyebrow}>APOIO AO CLIENTE</p><h2 id="chat-title">Vasto Império<span className={styles.brandDot} aria-hidden="true" /></h2><p>Estamos aqui para ajudar.</p></div><button type="button" onClick={close} aria-label="Fechar conversa"><IoCloseOutline size={25} /></button></header>
      <div className={styles.messages} onScroll={event => { const node = event.currentTarget; followMessages.current = node.scrollHeight - node.scrollTop - node.clientHeight < 90; }} role="log" aria-label="Mensagens da conversa" aria-live="polite">
        {!messages.length && <div className={styles.welcome}>Vamos conversar.<span>Conte-nos o que procura. A nossa equipa responde assim que possível.</span></div>}
        {!thread && <div className={styles.identity}><label>O seu nome<input form="visitor-chat-form" required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label><label>Email (opcional)<input form="visitor-chat-form" type="email" maxLength={160} autoComplete="email" value={contact} onChange={e => setContact(e.target.value)} /></label></div>}
        {ended && <p role="status" className={styles.waiting}>Conversa terminada. Se precisar de mais ajuda, pode iniciar uma nova abaixo.</p>}
        {loading && <p>A ligar à conversa…</p>}
        <ChatMessages messages={messages} sender="visitor" threadId={thread?.id} pending={pendingMessage}/>
        {waitingSince !== null && (delayed ? <div role="status" className={styles.delayNotice}>
          <strong>Pedimos desculpa pela demora.</strong>
          <p>Em períodos de maior procura, a resposta pode demorar um pouco mais. Iremos responder o mais breve possível. Se preferir, fale connosco por telefone.</p>
          <a href="tel:+351928348117" className={styles.delayCall}><IoCallOutline size={19}/><span>Ligar agora · +351 928 348 117</span></a>
        </div> : <p role="status" className={styles.waiting}>Recebemos a sua mensagem. A nossa equipa irá responder o mais breve possível. Obrigado por aguardar.</p>)}
        <div ref={end} />
      </div>
      <form id="visitor-chat-form" onSubmit={send} className={styles.form}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {confirmEnd ? <div className={styles.endConfirmation} role="group" aria-labelledby="end-chat-title" aria-describedby="end-chat-description">
          <h3 id="end-chat-title">Terminar esta conversa?</h3>
          <p id="end-chat-description">Pode iniciar uma nova conversa quando quiser. Se pretende apenas minimizar o chat, use o botão de fechar.</p>
          <div className={styles.endActions}><button type="button" autoFocus disabled={busy} onClick={cancelEnd}>Continuar conversa</button><button type="button" disabled={busy} onClick={endConversation} className={styles.confirmEndButton}>{busy ? 'A terminar…' : 'Terminar conversa'}</button></div>
        </div> : <>
        <label htmlFor="site-chat-message" className={styles.messageLabel}>A sua mensagem</label>
        <div className={styles.compose}><label className={`${styles.attachImage} ${busy ? styles.attachBusy : ''}`} title="Enviar imagem" aria-label="Enviar imagem"><IoImageOutline size={23}/><input id="visitor-chat-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={sendImage}/><span className={styles.srOnly}>Enviar imagem</span></label><textarea disabled={busy} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} id="site-chat-message" required maxLength={2000} rows={1} placeholder="Escreva a sua mensagem…" value={message} onChange={e => { setMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }} /><button type="submit" disabled={busy || loading || !message.trim()} aria-label="Enviar mensagem"><IoArrowUp size={20} /></button></div>
        {thread && <button ref={endButton} type="button" disabled={busy} onClick={() => setConfirmEnd(true)} className={styles.endConversation}>Terminar conversa</button>}
        </>}
        <p className={styles.privacy}>Se deixar um email e fechar o chat, enviamos a resposta por email. <a href="/politica-de-privacidade-e-cookies" target="_blank" rel="noopener noreferrer">Privacidade</a> · <a href="tel:+351928348117">Ligar agora</a></p>
      </form>
    </section>}
    <button ref={launcher} type="button" className={styles.launcher} aria-expanded={open} aria-haspopup="dialog" onClick={() => open ? close() : setOpen(true)}><IoChatbubblesOutline size={24} /><span>{open ? 'Fechar conversa' : unread ? (unread === 1 ? '1 mensagem recebida' : `${unread} mensagens recebidas`) : 'Fale connosco'}</span>{!open && unread > 0 && <span className={styles.unreadBadge} aria-hidden="true">{unread}</span>}</button>
    {!open && unread > 0 && <span className={styles.srOnly} role="status" aria-live="polite">{unread === 1 ? 'Tem 1 mensagem por ler. Abra o chat.' : `Tem ${unread} mensagens por ler. Abra o chat.`}</span>}
  </div>;
}
