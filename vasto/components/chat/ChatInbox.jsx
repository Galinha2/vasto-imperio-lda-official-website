'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './Chat.module.css';
import SwipeChatThread from './SwipeChatThread';
import {useAdminPreferences} from '@/components/admin/AdminPreferences';
import {IoNotificationsOffOutline} from 'react-icons/io5';
import ChatMessages from './ChatMessages';
import {prepareChatImage} from '@/lib/prepare-chat-image.mjs';
import {IoImageOutline} from 'react-icons/io5';
import { useAdminChatUnread } from '@/components/admin/AdminChatUnread';
import { IoChatbubbleOutline, IoArrowUp, IoChevronBack, IoTrashOutline } from 'react-icons/io5';
export default function ChatInbox() {
  const router = useRouter();
  const {preferences,update} = useAdminPreferences();
  const [swipe,setSwipe] = useState(null);
  const [deleteTarget,setDeleteTarget] = useState(null);
  function toggleMute(thread){const ids=preferences.mutedChatIds||[];update({mutedChatIds:ids.includes(thread.id)?ids.filter(id=>id!==thread.id):[...ids,thread.id]});setSwipe(null);}
  const screen = useRef(null);
  const searchParams = useSearchParams();
  const requestedChat = searchParams.get("chat");
  const { counts, total, markRead, refresh: refreshUnread } = useAdminChatUnread();
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [delivery, setDelivery] = useState('');
  const [loading, setLoading] = useState(true);
  const end = useRef(null);
  const followMessages = useRef(true);
  const selection = useRef(null);
  const deletedIds = useRef(new Set());
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px) and (pointer: coarse), (max-width: 767px)');
    const viewport = window.visualViewport;
    const previousOverflow = document.body.style.overflow;
    const resize = () => {
      if (viewport && viewport.scale > 1.05) return;
      document.body.style.overflow = media.matches ? 'hidden' : previousOverflow;
      screen.current?.style.setProperty('--chat-height', `${viewport?.height || window.innerHeight}px`);
      screen.current?.style.setProperty('--chat-top', `${viewport?.offsetTop || 0}px`);
    };
    resize();
    media.addEventListener('change', resize);
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = previousOverflow; media.removeEventListener('change', resize); viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); };
  }, []);
  function backToList() {
    selection.current = null; setPendingMessage(''); setSelected(null); setMessage(''); setDelivery(''); setError('');
    if (requestedChat) router.replace('/admin/conversas');
  }
  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(requestedChat || '')) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/admin/chat?id=${requestedChat}`, {cache:'no-store'});
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível abrir a conversa.');
        if (active && data.thread) { selection.current=data.thread.id; setSelected(data.thread); setMessages(data.messages); }
      } catch (failure) { if (active) setError(failure.message); }
    })();
    return () => { active=false; };
  }, [requestedChat]);
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
  useEffect(() => { if (followMessages.current || pendingMessage) end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, pendingMessage]);
  async function sendImage(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    if (!selected) return;
    const id = selected.id;
    setBusy(true); setError('');
    try {
      const image = await prepareChatImage(file);
      const form = new FormData(); form.append('image', image, 'imagem.webp');
      form.append('threadId', id);
      const response = await fetch('/api/chat/images', {method:'POST', body:form});
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      if (selection.current === id) { setMessages(data.messages); setDelivery('Imagem enviada.'); }
    } catch (error) { setError(error.message || 'Não foi possível enviar a imagem.'); }
    finally { setBusy(false); }
  }
  async function send(event) {
    event.preventDefault(); if (busy || !selected) return;
    const id = selected.id;
    setBusy(true); setError(''); setPendingMessage(message.trim());
    try {
      const response = await fetch('/api/admin/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (selection.current === id) { setMessages(data.messages); setMessage('');
        setDelivery(data.email?.status === 'sent' ? 'Resposta enviada no chat e aceite pelo servidor de email.' : data.email?.status === 'failed' ? 'Resposta guardada no chat, mas não foi possível enviar o email. Contacte o cliente através do contacto indicado.' : data.email?.status === 'no_email' ? 'Resposta enviada no chat. Este visitante não indicou um email válido.' : 'Resposta enviada no chat. O visitante tem a conversa aberta.'); }
    } catch (error) { setError(error.message); }
    finally { setBusy(false); setPendingMessage(''); }
  }
  async function removeConversation() {
    if (busy || !deleteTarget) return;
    const id = deleteTarget.id;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/chat?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível apagar a conversa.');
      deletedIds.current.add(id); setDeleteTarget(null); setSwipe(null);
      void refreshUnread();
      setThreads(current => current.filter(thread => thread.id !== id));
      if (selection.current === id) {
        selection.current = null;
        setSelected(null); setMessages([]); setMessage(''); setDelivery('');
      }
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <div ref={screen} className={`${styles.inbox} ${selected ? styles.inboxSelected : ''}`}>
    <header className={styles.pageHeader}><Link href="/admin" className={styles.mobileExit} aria-label="Voltar ao painel"><IoChevronBack size={22}/></Link><div><h1>Conversas</h1><p role="status">{total ? `${total} ${total === 1 ? 'mensagem recebida por ler' : 'mensagens recebidas por ler'}` : 'Um espaço para estar mais perto dos seus clientes.'}</p></div><span className={styles.count}>{threads.length} {threads.length === 1 ? 'conversa' : 'conversas'}</span></header>
    {error && !selected && <p role="alert" className={styles.error}>{error}</p>}
    {deleteTarget && <div className={styles.chatDeleteOverlay}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-chat-heading" className={styles.chatDeleteDialog}><h2 id="delete-chat-heading">Apagar a conversa com {deleteTarget.name}?</h2><p>Todas as mensagens serão eliminadas definitivamente.</p>{error&&<p role="alert">{error}</p>}<div className={styles.endActions}><button type="button" autoFocus disabled={busy} onClick={()=>setDeleteTarget(null)}>Cancelar</button><button type="button" disabled={busy} className={styles.confirmEndButton} onClick={removeConversation}>{busy?'A apagar…':'Apagar conversa'}</button></div></section></div>}
    <div className={`${styles.workspace} ${selected ? styles.workspaceSelected : ''}`}>
      <aside className={styles.threadList} aria-label="Conversas">
        <h2 className={styles.listHeading}>Mensagens do site</h2>
        {!threads.length && <p className={styles.emptyList}>{loading ? 'A carregar conversas…' : 'As novas conversas aparecem aqui.'}</p>}
        {threads.map(thread => <SwipeChatThread key={thread.id} name={thread.name} disabled={busy} muted={preferences.mutedChatIds?.includes(thread.id)} open={swipe?.id===thread.id?swipe.action:null} onOpen={action=>setSwipe(action?{id:thread.id,action}:null)} onMute={()=>toggleMute(thread)} onDelete={()=>setDeleteTarget(thread)}><button aria-pressed={selected?.id === thread.id} onClick={() => { followMessages.current = true; setPendingMessage(''); selection.current = thread.id; setSelected(thread); setMessages([]); setMessage(''); setError(''); setDelivery(''); }} className={`${styles.thread} ${selected?.id === thread.id ? styles.threadActive : ''}`}><span className={styles.avatar} aria-hidden="true">{thread.name.slice(0, 1).toUpperCase()}</span><span className={styles.threadCopy}><span className={styles.threadTop}><strong>{thread.name}</strong><time>{new Date(thread.created_at).toLocaleDateString('pt-PT', {day:'2-digit', month:'2-digit'})}</time></span><span className={styles.threadContact}>{preferences.mutedChatIds?.includes(thread.id)&&<IoNotificationsOffOutline aria-label="Silenciada neste dispositivo"/>}{thread.contact || 'Visitante do site'}</span></span>{counts[thread.id] > 0 && <span className={styles.threadUnread} aria-label={`${counts[thread.id]} mensagens por ler`}>{counts[thread.id]}</span>}</button></SwipeChatThread>)}
      </aside>
      {selected ? <section className={styles.conversation}>
        <header className={styles.conversationHeader}><button className={styles.back} aria-label="Voltar às conversas" onClick={backToList}><IoChevronBack size={20} /></button><span className={styles.avatar} aria-hidden="true">{selected.name.slice(0,1).toUpperCase()}</span><div><h2>{selected.name}</h2><p>{selected.contact || 'Visitante do site'}</p></div><button type="button" className={styles.deleteChat} onClick={()=>setDeleteTarget(selected)} disabled={busy} aria-label="Apagar conversa" title="Apagar conversa"><IoTrashOutline size={18} /><span>Apagar</span></button></header>
        <div onScroll={event => { const node = event.currentTarget; followMessages.current = node.scrollHeight - node.scrollTop - node.clientHeight < 90; }} role="log" aria-live="polite" aria-label="Mensagens" className={styles.messages}><ChatMessages messages={messages} sender="staff" threadId={selected.id} pending={pendingMessage}/><div ref={end} /></div>
        <form className={styles.form} onSubmit={send}>{error && <p role="alert" className={styles.error}>{error}</p>}<label htmlFor="staff-message" className={styles.messageLabel}>Responder a {selected.name}</label><div className={styles.compose}><label className={`${styles.attachImage} ${busy ? styles.attachBusy : ''}`} title="Enviar imagem" aria-label="Enviar imagem"><IoImageOutline size={23}/><input id="staff-chat-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={sendImage}/><span className={styles.srOnly}>Enviar imagem</span></label><textarea disabled={busy} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} id="staff-message" required maxLength={2000} rows={1} value={message} onChange={e => { setMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`; }} placeholder="Escreva uma mensagem…" /><button disabled={busy || !message.trim()} aria-label={busy ? 'A enviar mensagem' : 'Enviar mensagem'}><IoArrowUp size={20} /></button></div>{delivery && <p role="status" className={styles.delivery}>{delivery}</p>}</form>
      </section> : <div className={styles.empty}><span className={styles.emptyIcon}><IoChatbubbleOutline size={28} /></span><h2>Uma boa conversa começa aqui.</h2><p>Selecione uma conversa para acompanhar o pedido e responder ao cliente.</p></div>}
    </div>
  </div>;
}
