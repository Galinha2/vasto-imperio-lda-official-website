'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useLanguage} from '@/components/header/LanguageContext';
import {usePathname} from 'next/navigation';
import contentpt from '@/assets/contentpt.json';
import contenten from '@/assets/contenten.json';
import s from './Footer.module.css';
export default function Footer(){
 const pathname=usePathname();const {language}=useLanguage();const en=language==='en';const content=en?contenten:contentpt;const {phone,mail}=content.homeContacts.text[0];
 if(pathname==='/admin'||pathname.startsWith('/admin/')||pathname==='/orcamento/admin'||pathname==='/simulador/admin')return null;
 const groups=[
  {title:en?'Storage solutions':'Soluções',links:[[en?'Industrial racks':'Racks industriais','/racks-industriais'],[en?'Picking shelving':'Estantes picking','/estantes-picking'],[en?'Light-duty shelving':'Estantes ligeiras','/estante-carga-ligeira'],[en?'All products':'Todos os produtos','/produtos']]},
  {title:en?'Vasto Império':'Vasto Império',links:[[en?'About us':'Sobre nós','/sobre-nos'],[en?'Project support':'Apoio ao projeto','/apoio-ao-projeto'],[en?'Configure shelving':'Configurar estantes','/simulador/estantes'],[en?'Contacts':'Contactos','/contacto']]},
 ];
 return <footer className={s.footer}><div className={s.inner}><div className={s.top}>
  <div className={s.brand}><Link href="/" aria-label={en?'Vasto Império home':'Vasto Império — página inicial'}><Image src={content.header.logo} alt="Vasto Império" width={100} height={64}/></Link><p>{en?'Shelving, industrial racks and equipment to organise your space.':'Estantes, racks industriais e equipamentos para organizar o seu espaço.'}</p><small>Vasto Império Lda. · NIPC 508738873</small></div>
  {groups.map(group=><nav className={s.column} key={group.title} aria-label={group.title}><h2>{group.title}</h2><ul>{group.links.map(([label,href])=><li key={href}><Link href={href}>{label}</Link></li>)}</ul></nav>)}
  <div className={s.column}><h2>{en?'Talk to the team':'Fale com a equipa'}</h2><address><a href={`tel:${phone.replace(/\s/g,'')}`}>{phone}</a><a href={`mailto:${mail}`}>{mail}</a><span>Benedita · Viseu</span></address><Link className={s.quoteLink} href="/orcamento">{en?'Request a quotation':'Pedir orçamento'}<span aria-hidden="true">→</span></Link></div>
 </div><div className={s.bottom}><p className={s.copyright}>© {new Date().getFullYear()} Vasto Império. {en?'All rights reserved.':'Todos os direitos reservados.'}</p><nav className={s.legal} aria-label={en?'Legal information':'Informações legais'}>
  <Link href="/politica-de-privacidade-e-cookies">{en?'Privacy & Cookies Policy':'Política de Privacidade e Cookies'}</Link><Link href="/termos-e-condicoes-gerais">{en?'General Terms & Conditions':'Termos e Condições Gerais'}</Link><a href="https://www.livroreclamacoes.pt/inicio" target="_blank" rel="noopener noreferrer">{en?'Complaints Book':'Livro de Reclamações'}</a>
 </nav></div></div></footer>;
}
