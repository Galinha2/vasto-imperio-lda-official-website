'use client';
import Link from 'next/link';
import {useId} from 'react';
import {FiPhone,FiMail,FiArrowUpRight} from 'react-icons/fi';
import {useLanguage} from '@/components/header/LanguageContext';
import contentpt from '@/assets/contentpt.json';
import contenten from '@/assets/contenten.json';
import s from './ContactDetails.module.css';
export default function ContactDetails({sectionBackground='gray',wide=true}){
 const headingId=useId();
 const {language}=useLanguage();const en=language==='en';const contacts=(en?contenten:contentpt).homeContacts;const {phone,mail}=contacts.text[0];
 return <section className={`${s.section} ${sectionBackground==='white'?s.white:s.gray}`} aria-labelledby={headingId}><div className={`${s.inner} ${wide?'':s.compact}`}>
  <div className={s.layout}><div className={s.intro}><span className={s.eyebrow}>{en?'Direct contact':'Contacto direto'}</span><h2 id={headingId}>{en?'Your project starts with a conversation.':'O seu projeto começa com uma conversa.'}</h2><p>{en?'Have a question about shelving, need to confirm dimensions or follow up on a quotation? Contact our team by phone or email.':'Tem uma dúvida sobre estantes, precisa de confirmar medidas ou de acompanhar um orçamento? Fale com a nossa equipa por telefone ou email.'}</p><div className={s.locations}>{contacts.text.map(c=><span key={c.location}>{c.location}</span>)}</div></div>
   <div><div data-surface-card className={s.contactList}><a className={s.contactRow} href={`tel:${phone.replace(/\s/g,'')}`}><span className={s.icon}><FiPhone aria-hidden="true"/></span><span className={s.copy}><small>{en?'Call the team':'Ligue à equipa'}</small><strong>{phone}</strong></span><FiArrowUpRight className={s.arrow} aria-hidden="true"/></a><a className={s.contactRow} href={`mailto:${mail}`}><span className={`${s.icon} ${s.emailIcon}`}><FiMail aria-hidden="true"/></span><span className={s.copy}><small>{en?'Email us':'Escreva-nos'}</small><strong>{mail}</strong></span><FiArrowUpRight className={s.arrow} aria-hidden="true"/></a></div><p className={s.note}>{en?'If you would like to visit us, contact the team first to confirm the location and availability.':'Se pretender visitar-nos, contacte primeiro a equipa para confirmar a localização e a disponibilidade.'}</p></div>
  </div>
  <div data-surface-card className={s.quote}><div><h3>{en?'Already have your measurements?':'Já tem as medidas do seu espaço?'}</h3><p>{en?'Send the dimensions and what you need to store. We will help you prepare a quotation, free of charge.':'Envie as dimensões e o que pretende armazenar. Ajudamos a preparar a sua proposta, com orçamento gratuito.'}</p></div><div className={s.actions}><Link href="/simulador/estantes" className={s.primary}>{en?'Configure and see price':'Configurar e ver preço'}<span aria-hidden="true">↗</span></Link><Link href={contacts.url} className={s.secondary}>{en?'Request a quotation':'Pedir orçamento'}<span aria-hidden="true">→</span></Link></div></div>
 </div></section>;
}
