'use client';
import {useState} from 'react';
import styles from './Chat.module.css';
export default function ChatImage({image,threadId,messageId}){
 const [failed,setFailed]=useState(false);
 if(Date.now()>=Date.parse(image.expiresAt))return <p className={styles.imageExpired}>Imagem expirada</p>;
 if(failed)return <p className={styles.imageExpired}>Não foi possível carregar a imagem. Volte a abrir a conversa para tentar novamente.</p>;
 const url=`/api/chat/images?thread=${encodeURIComponent(threadId)}&message=${encodeURIComponent(messageId)}`;
 return <a href={url} target="_blank" rel="noopener noreferrer" className={styles.imageLink} aria-label="Abrir imagem da conversa"><img src={url} alt="Imagem enviada na conversa" loading="lazy"  onError={()=>setFailed(true)}/></a>;
}
