'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { IoChatbubblesOutline, IoCloseOutline, IoArrowUp } from 'react-icons/io5';
import styles from './Chat.module.css';

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);
  const [pageVisible, setPageVisible] = useState(true);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const end = useRef(null);
  const launcher = useRef(null);
  const hidden = pathname.startsWith('/admin');
  useEffect(() => {
    if (hidden) return;
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch('/api/chat', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) { setThread(data.thread); setMessages(data.messages); setError(''); }
      } catch (error) { if (active) setError(error.message || 'Não foi possível ligar ao chat.'); }
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
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages.length, open]);
  function close() { setOpen(false); launcher.current?.focus(); }
  async function send(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, contact, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setThread(data.thread); setMessages(data.messages); setMessage('');
    } catch (error) { setError(error.message || 'Não foi possível enviar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  if (hidden) return null;
  return <div className={styles.widget}>
    {open && <section className={styles.panel} role="dialog" aria-labelledby="chat-title" onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <header className={styles.header}><div><p className={styles.eyebrow}>VASTO IMPÉRIO</p><h2 id="chat-title">Como podemos ajudar?</h2><p>Apoio da nossa equipa, aqui no site.</p></div><button type="button" onClick={close} aria-label="Fechar conversa"><IoCloseOutline size={25} /></button></header>
      <div className={styles.messages} role="log" aria-label="Mensagens da conversa" aria-live="polite">
        <div className={styles.welcome}>Vamos conversar.<br /><span>Conte-nos o que procura. A nossa equipa responde assim que possível.</span></div>
        {loading && <p>A ligar à conversa…</p>}
        {messages.map(item => <div key={item.id} className={`${styles.bubble} ${item.sender === 'visitor' ? styles.mine : styles.theirs}`}><small>{item.sender === 'staff' ? 'Equipa Vasto Império' : 'Você'}</small><p>{item.body}</p><time>{new Date(item.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</time></div>)}
        {messages.at(-1)?.sender === 'visitor' && <p role="status" className={styles.waiting}>Obrigado pela sua mensagem. Aguarde um pouco, por favor. A nossa equipa irá responder brevemente.</p>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className={styles.form}>
        {!thread && <div className={styles.identity}><label>O seu nome<input autoFocus required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label><label>Email (opcional)<input type="email" maxLength={160} autoComplete="email" value={contact} onChange={e => setContact(e.target.value)} /></label></div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <label htmlFor="site-chat-message" className={styles.messageLabel}>A sua mensagem</label>
        <div className={styles.compose}><textarea id="site-chat-message" required maxLength={2000} rows={2} placeholder="Escreva a sua mensagem…" value={message} onChange={e => setMessage(e.target.value)} /><button type="submit" disabled={busy || loading || !message.trim()} aria-label="Enviar mensagem"><IoArrowUp size={20} /></button></div>
        <p className={styles.privacy}>Se deixar um email e fechar o chat, enviamos a resposta por email. <a href="tel:+351928348117">Ligar agora</a></p>
      </form>
    </section>}
    <button ref={launcher} type="button" className={styles.launcher} aria-expanded={open} aria-haspopup="dialog" onClick={() => open ? close() : setOpen(true)}><IoChatbubblesOutline size={24} /><span>{open ? 'Fechar conversa' : unread ? (unread === 1 ? '1 mensagem recebida' : `${unread} mensagens recebidas`) : 'Fale connosco'}</span>{!open && unread > 0 && <span className={styles.unreadBadge} aria-hidden="true">{unread}</span>}</button>
    {!open && unread > 0 && <span className={styles.srOnly} role="status" aria-live="polite">{unread === 1 ? 'Tem 1 mensagem por ler. Abra o chat.' : `Tem ${unread} mensagens por ler. Abra o chat.`}</span>}
  </div>;
}
