'use client';
import {useRef,useState} from 'react';
import {IoTrashOutline,IoNotificationsOffOutline,IoNotificationsOutline,IoEllipsisHorizontal} from 'react-icons/io5';
import styles from './Chat.module.css';
export default function SwipeChatThread({children,name,muted,open,onOpen,onDelete,onMute,disabled}){
 const start=useRef(null);const moved=useRef(false);const [offset,setOffset]=useState(null);
 const position=offset ?? (open==='delete'?-96:open==='mute'?96:0);
 function finish(event,cancel=false){
  if(!start.current)return;
  if(moved.current){onOpen(cancel?null:position < -45?'delete':position > 45?'mute':null);}
  start.current=null;setOffset(null);
 }
 return <div className={styles.swipeThread}>
  {open!=='menu'&&<div className={styles.swipeActions}>
   <button type="button" disabled={disabled} tabIndex={open==='mute'?0:-1} aria-hidden={open!=='mute'} className={styles.swipeMute} onClick={onMute}>{muted?<IoNotificationsOutline/>:<IoNotificationsOffOutline/>}{muted?'Reativar':'Silenciar'}</button>
   <button type="button" disabled={disabled} tabIndex={open==='delete'?0:-1} aria-hidden={open!=='delete'} className={styles.swipeDelete} onClick={onDelete}><IoTrashOutline/>Apagar</button>
  </div>}
  <div className={`${styles.swipeContent} ${offset!==null?styles.swipeDragging:''}`} style={{transform:`translateX(${position}px)`}}
   onPointerDown={event=>{if(disabled||event.button!==0)return;start.current={x:event.clientX,y:event.clientY,base:position};moved.current=false;}}
   onPointerMove={event=>{const origin=start.current;if(!origin)return;const dx=event.clientX-origin.x,dy=event.clientY-origin.y;if(!moved.current&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){start.current=null;return;}if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)){moved.current=true;event.currentTarget.setPointerCapture(event.pointerId);}if(moved.current)setOffset(Math.max(-96,Math.min(96,origin.base+dx)));}}
   onPointerUp={event=>finish(event)} onPointerCancel={event=>finish(event,true)}
   onClickCapture={event=>{if(moved.current){event.preventDefault();event.stopPropagation();moved.current=false;}}}>
    {children}
    <button type="button" disabled={disabled} className={styles.threadMore} aria-label={`Opções da conversa com ${name}`} aria-expanded={Boolean(open)} onClick={()=>onOpen(open?null:'menu')}><IoEllipsisHorizontal/></button>
  </div>
  {open==='menu'&&<div className={styles.threadActionMenu}><button type="button" disabled={disabled} onClick={onMute}>{muted?<IoNotificationsOutline/>:<IoNotificationsOffOutline/>}{muted?'Reativar notificações':'Silenciar neste dispositivo'}</button><button type="button" disabled={disabled} onClick={onDelete}><IoTrashOutline/>Apagar conversa</button></div>}
 </div>;
}
