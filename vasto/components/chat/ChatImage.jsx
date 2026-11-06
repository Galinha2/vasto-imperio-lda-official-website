'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {IoCloseOutline} from 'react-icons/io5';
import styles from './Chat.module.css';

export default function ChatImage({image,threadId,messageId}){
 const [failed,setFailed]=useState(false);
 const [open,setOpen]=useState(false);
 const [previewFailed,setPreviewFailed]=useState(false);
 const dialog=useRef(null);
 const trigger=useRef(null);
 const expired=Date.now()>=Date.parse(image.expiresAt);
 useEffect(()=>{
  if(!open||expired)return;
  const node=dialog.current;
  if(!node)return;
  const overflow=document.body.style.overflow;
  node.showModal();document.body.style.overflow='hidden';
  return()=>{node.close();document.body.style.overflow=overflow;trigger.current?.focus({preventScroll:true});};
 },[open,expired]);
 if(expired)return <p className={styles.imageExpired}>Imagem expirada</p>;
 if(failed)return <p className={styles.imageExpired}>Não foi possível carregar a imagem. Volte a abrir a conversa para tentar novamente.</p>;
 const url=`/api/chat/images?thread=${encodeURIComponent(threadId)}&message=${encodeURIComponent(messageId)}`;
 return <>
  <button ref={trigger} type="button" className={styles.imageLink} aria-label="Ampliar imagem da conversa" aria-haspopup="dialog" onClick={()=>{setPreviewFailed(false);setOpen(true);}}><img src={url} alt="Imagem enviada na conversa" loading="lazy" onError={()=>setFailed(true)}/></button>
  {open&&createPortal(<dialog ref={dialog} className={styles.imageViewer} aria-label="Imagem da conversa" onCancel={event=>{event.preventDefault();event.stopPropagation();setOpen(false);}} onClose={()=>setOpen(false)} onKeyDown={event=>event.stopPropagation()}>
   <header className={styles.imageViewerHeader}><span>Imagem da conversa</span><button type="button" autoFocus onClick={()=>setOpen(false)} aria-label="Fechar imagem e voltar à conversa"><IoCloseOutline size={26}/></button></header>
   <div className={styles.imageViewerBody}>{previewFailed?<p role="alert">Não foi possível carregar a imagem. Feche e tente novamente.</p>:<img src={url} alt="Imagem ampliada da conversa" onError={()=>setPreviewFailed(true)}/>}</div>
  </dialog>,document.body)}
 </>;
}
