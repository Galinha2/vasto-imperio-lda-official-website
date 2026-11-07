'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useLanguage} from '@/components/header/LanguageContext';
import s from './StorageGuide.module.css';
export default function StorageGuide(){
 const {language}=useLanguage();const en=language==='en';
 const choices=[
  {title:en?'Industrial racks':'Racks industriais',use:en?'Palletised goods handled with warehouse equipment.':'Mercadoria em paletes, movimentada com equipamento de armazém.',check:en?'Check pallet size, loaded weight, load height and aisle space.':'Confirme o tipo de palete, o peso carregado, a altura da carga e os corredores de circulação.',image:'/produtos/1-Paleco/instalacao-racks-home.webp',page:'/racks-industriais',sim:'/simulador/racks'},
  {title:en?'Picking shelving':'Estantes picking',use:en?'Boxes, components and goods picked by hand.':'Caixas, componentes e produtos com recolha manual.',check:en?'Choose shelf finish, useful depth and the weight distributed across each level.':'Escolha o tipo de tampo, a profundidade útil e o peso distribuído por nível.',image:'/produtos/estantes-picking/clientes/picking-pintada-perspetiva.webp',page:'/estantes-picking',sim:`/simulador/${en?'en':'pt'}/estantes-picking`},
  {title:en?'Light-duty shelving':'Estantes ligeiras',use:en?'Archives, small items and everyday organisation.':'Arquivo, pequenos artigos e organização do dia a dia.',check:en?'Check shelf dimensions and capacity for the items you plan to store.':'Confirme as dimensões e a capacidade do tabuleiro para os artigos a guardar.',image:'/produtos/prateleiras-ligeiras/cliente-ligeiras-1.webp',page:'/estante-carga-ligeira',sim:'/simulador/estantes-ligeiras'},
 ];
 return <section id="escolher-estantes" className={`${s.section} ${s.selection}`}><div className={s.inner}>
  <p className={s.eyebrow}>{en?'Real installations · A clearer choice':'Instalações reais · Escolha com confiança'}</p>
  <h2>{en?'Start with what you need to store.':'Comece pelo que precisa de guardar.'}</h2>
  <p className={s.lead}>{en?'Three shelving families, with photographs from our customer galleries. Choose your use, then configure dimensions and see a price estimate.':'Três famílias de estantes, com fotografias das nossas galerias de clientes. Escolha a utilização, configure as medidas e consulte uma estimativa de preço.'}</p>
  <div className={s.choiceGrid}>{choices.map((c,index)=><article data-surface-card className={s.choiceCard} key={c.page}>
   <Link href={c.page} className={s.choicePhoto} aria-label={`${en?'Explore':'Conhecer'} ${c.title}`}><Image src={c.image} alt={`${c.title} — ${en?'customer installation':'instalação em cliente'}`} fill sizes="(max-width:850px) 100vw, 33vw"/><span className={s.photoLabel}>{en?'Customer installation':'Instalação em cliente'}</span></Link>
   <div className={s.choiceBody}><span className={s.choiceKicker}>{[en?'Pallet storage':'Carga paletizada',en?'Manual picking':'Recolha manual',en?'Everyday organisation':'Organização diária'][index]}</span><h3><Link href={c.page}>{c.title}</Link></h3><p>{c.use}</p></div>
   <div className={s.choiceActions}><Link href={c.sim} className={s.choicePrimary}>{en?'Configure':'Configurar'}<span aria-hidden="true">→</span></Link><Link href={`${c.page}#projetos-clientes`} className={s.choiceSecondary}>{en?'See installations':'Ver instalações'}<span aria-hidden="true">↗</span></Link></div>
  </article>)}</div>
  <aside data-surface-card className={s.help} aria-labelledby="storage-help-title">
   <div className={s.helpIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 9a4 4 0 0 1 8 0c0 3-4 3-4 6"/><path d="M12 18v.5" strokeLinecap="round"/><circle cx="12" cy="12" r="10"/></svg></div>
   <div className={s.helpCopy}><h3 id="storage-help-title">{en?'Not sure which to choose?':'Não sabe qual escolher?'}</h3><p>{en?'Send your dimensions and tell us what you need to store. We will help you find the right solution.':'Envie as medidas do espaço e diga-nos o que pretende guardar. Ajudamos a encontrar a solução certa.'}</p><span>{en?'Technical configuration, delivery and assembly are confirmed with our team before ordering.':'Configuração técnica, transporte e montagem são confirmados com a nossa equipa antes de encomendar.'}</span></div>
   <Link href="/apoio-ao-projeto" className={s.helpLink}>{en?'How your request works':'Como funciona o seu pedido'}<span aria-hidden="true">→</span></Link>
  </aside>
 </div></section>;
}
