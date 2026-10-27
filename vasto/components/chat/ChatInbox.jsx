'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './Chat.module.css';
import { useAdminChatUnread } from '@/components/admin/AdminChatUnread';
import { IoChatbubbleOutline, IoArrowUp, IoChevronBack, IoTrashOutline } from 'react-icons/io5';
export default function ChatInbox() {
  const { counts, total, markRead, refresh: refreshUnread } = useAdminChatUnread();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState('');
  const [loading, setLoading] = useState(true);
  const end = useRef(null);
  const selection = useRef(null);
  const deletedIds = useRef(new Set());
  useEffect(() => {
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch('/api/admin/chat', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) { setThreads(data.threads.filter(thread => !deletedIds.current.has(thread.id))); setError(''); }
      } catch (error) { if (active) setError(error.message); }
      finally { pending = false; if (active) setLoading(false); }
    }
    refresh(); const timer = setInterval(refresh, 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    let pending = false;
    async function refresh() {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const response = await fetch(`/api/admin/chat?id=${selected.id}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active && !deletedIds.current.has(selected.id)) setMessages(data.messages);
      } catch (error) { if (active && !deletedIds.current.has(selected.id)) setError(error.message); }
      finally { pending = false; }
    }
    refresh(); const timer = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const read = () => { if (!document.hidden && selection.current === selected.id) void markRead(selected.id, messages); };
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, [selected, messages, markRead]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);
  async function send(event) {
    event.preventDefault(); if (busy || !selected) return;
    const id = selected.id;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (selection.current === id) { setMessages(data.messages); setMessage('');
        setDelivery(data.email?.status === 'sent' ? 'Resposta enviada no chat e aceite pelo servidor de email.' : data.email?.status === 'failed' ? 'Resposta guardada no chat, mas não foi possível enviar o email. Contacte o cliente através do contacto indicado.' : data.email?.status === 'no_email' ? 'Resposta enviada no chat. Este visitante não indicou um email válido.' : 'Resposta enviada no chat. O visitante tem a conversa aberta.'); }
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  async function removeConversation() {
    if (busy || !selected) return;
    const id = selected.id;
    if (!window.confirm(`Apagar a conversa com ${selected.name}? Todas as mensagens serão eliminadas definitivamente.`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/chat?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível apagar a conversa.');
      deletedIds.current.add(id);
      void refreshUnread();
      setThreads(current => current.filter(thread => thread.id !== id));
      if (selection.current === id) {
        selection.current = null;
        setSelected(null); setMessages([]); setMessage(''); setDelivery('');
      }
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <div className={styles.inbox}>
    <header className={styles.pageHeader}><div><h1>Conversas</h1><p role="status">{total ? `${total} ${total === 1 ? 'mensagem recebida por ler' : 'mensagens recebidas por ler'}` : 'Um espaço para estar mais perto dos seus clientes.'}</p></div><span className={styles.count}>{threads.length} {threads.length === 1 ? 'conversa' : 'conversas'}</span></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={`${styles.workspace} ${selected ? styles.workspaceSelected : ''}`}>
      <aside className={styles.threadList} aria-label="Conversas">
        <h2 className={styles.listHeading}>Mensagens do site</h2>
        {!threads.length && <p className={styles.emptyList}>{loading ? 'A carregar conversas…' : 'As novas conversas aparecem aqui.'}</p>}
        {threads.map(thread => <button key={thread.id} aria-pressed={selected?.id === thread.id} onClick={() => { selection.current = thread.id; setSelected(thread); setMessages([]); setMessage(''); setError(''); setDelivery(''); }} className={`${styles.thread} ${selected?.id === thread.id ? styles.threadActive : ''}`}><span className={styles.avatar} aria-hidden="true">{thread.name.slice(0, 1).toUpperCase()}</span><span className={styles.threadCopy}><span className={styles.threadTop}><strong>{thread.name}</strong><time>{new Date(thread.created_at).toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit'})}</time></span><span className={styles.threadContact}>{thread.contact || 'Visitante do site'}</span></span>{counts[thread.id] > 0 && <span className={styles.threadUnread} aria-label={`${counts[thread.id]} mensagens por ler`}>{counts[thread.id]}</span>}</button>)}
      </aside>
      {selected ? <section className={styles.conversation}>
        <header className={styles.conversationHeader}><button className={styles.back} aria-label="Voltar às conversas" onClick={() => { selection.current = null; setSelected(null); }}><IoChevronBack size={20} /></button><span className={styles.avatar} aria-hidden="true">{selected.name.slice(0,1).toUpperCase()}</span><div><h2>{selected.name}</h2><p>{selected.contact || 'Visitante do site'}</p></div><button type="button" className={styles.deleteChat} onClick={removeConversation} disabled={busy} aria-label="Apagar conversa" title="Apagar conversa"><IoTrashOutline size={18} /><span>Apagar</span></button></header>
        <div role="log" aria-live="polite" aria-label="Mensagens" className={styles.messages}>{messages.map(item => <div key={item.id} className={`${styles.bubble} ${item.sender === 'staff' ? styles.mine : styles.theirs}`}><small>{item.sender === 'staff' ? 'Equipa Vasto Império' : selected.name}</small><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString('pt-PT')}</time></div>)}<div ref={end} /></div>
        <form className={styles.form} onSubmit={send}><label htmlFor="staff-message" className={styles.messageLabel}>Responder a {selected.name}</label><div className={styles.compose}><textarea id="staff-message" required maxLength={2000} rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva uma mensagem…" /><button disabled={busy || !message.trim()} aria-label={busy ? 'A enviar mensagem' : 'Enviar mensagem'}><IoArrowUp size={20} /></button></div>{delivery && <p role="status" className={styles.delivery}>{delivery}</p>}</form>
      </section> : <div className={styles.empty}><span className={styles.emptyIcon}><IoChatbubbleOutline size={28} /></span><h2>Uma boa conversa começa aqui.</h2><p>Selecione uma conversa para acompanhar o pedido e responder ao cliente.</p></div>}
    </div>
  </div>;
}
