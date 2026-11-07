'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useLanguage} from '@/components/header/LanguageContext';
import s from './ProjectGuide.module.css';
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
  <div className={s.choiceGrid}>{choices.map((c,index)=><article className={s.choiceCard} key={c.page}>
   <div className={s.choiceBody}><span className={s.choiceKicker}>{[en?'Pallet storage':'Carga paletizada',en?'Manual picking':'Recolha manual',en?'Everyday organisation':'Organização diária'][index]}</span><h3><Link href={c.page}>{c.title}</Link></h3><p>{c.use}</p></div>
   <Link href={c.page} className={s.choicePhoto} aria-label={`${en?'Explore':'Conhecer'} ${c.title}`}><Image src={c.image} alt={`${c.title} — ${en?'customer installation':'instalação em cliente'}`} fill sizes="(max-width:850px) 100vw, 33vw"/></Link>
   <div className={s.choiceActions}><Link href={c.sim} className={s.choicePrimary}>{en?'Configure':'Configurar'}<span aria-hidden="true">→</span></Link><Link href={`${c.page}#projetos-clientes`} className={s.choiceSecondary}>{en?'See installations':'Ver instalações'}<span aria-hidden="true">↗</span></Link></div>
  </article>)}</div>
  <div className={s.strip}><p>{en?'Not sure which solution fits? Send your space dimensions and describe your goods. Confirm the technical configuration, delivery and any installation needs before ordering.':'Não sabe qual escolher? Envie as medidas do espaço e descreva a mercadoria. Antes de encomendar, confirme a configuração técnica, o transporte e eventuais necessidades de montagem.'}</p><Link href="/apoio-ao-projeto">{en?'How your request works →':'Como funciona o seu pedido →'}</Link></div>
 </div></section>;
}
