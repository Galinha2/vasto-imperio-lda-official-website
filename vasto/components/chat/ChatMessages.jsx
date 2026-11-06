'use client';
import { Fragment } from 'react';
import ChatImage from './ChatImage';
import styles from './Chat.module.css';

const day = value => new Date(value).toLocaleDateString('pt-PT');
export default function ChatMessages({ messages, sender, threadId, pending }) {
  return <>{messages.map((item, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const startsDay = !previous || day(previous.created_at) !== day(item.created_at);
    const grouped = !startsDay && previous.sender === item.sender && Date.parse(item.created_at) - Date.parse(previous.created_at) < 300000;
    const endsGroup = !next || next.sender !== item.sender || day(next.created_at) !== day(item.created_at) || Date.parse(next.created_at) - Date.parse(item.created_at) >= 300000;
    return <Fragment key={item.id}>
      {startsDay && <p className={styles.dateDivider}><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</time></p>}
      <div className={`${styles.bubble} ${item.sender === sender ? styles.mine : styles.theirs} ${grouped ? styles.grouped : ''} ${endsGroup ? styles.groupEnd : ''} ${item.image ? styles.imageBubble : ''}`}>
        <span className={styles.srOnly}>{item.sender === sender ? 'Você: ' : 'Mensagem recebida: '}</span>
        {item.image ? <ChatImage image={item.image} threadId={threadId} messageId={item.id}/> : <p>{item.body}</p>}
        <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString('pt-PT')}>{new Date(item.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</time>
      </div>
    </Fragment>;
  })}{pending && <div className={`${styles.bubble} ${styles.mine} ${styles.pending}`}><p>{pending}</p><span role="status">A enviar…</span></div>}</>;
}
