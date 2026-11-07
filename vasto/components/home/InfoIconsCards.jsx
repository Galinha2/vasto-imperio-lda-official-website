'use client';
import { TbTruckDelivery } from 'react-icons/tb';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { MdOutlineWorkspacePremium } from 'react-icons/md';
import { FaRankingStar } from 'react-icons/fa6';
import contentpt from '@/assets/contentpt.json';
import contenten from '@/assets/contenten.json';
import { useLanguage } from '../header/LanguageContext';
import s from './InfoIconsCards.module.css';
const iconMap = { TbTruckDelivery, FaMapMarkedAlt, MdOutlineWorkspacePremium, FaRankingStar };
export default function InfoIconsCards() {
 const { language } = useLanguage();
 const { title, text: items } = (language === 'pt' ? contentpt : contenten).homeInfoCards;
 return <aside data-surface-card className={s.panel} aria-labelledby="home-why-title">
  <header className={s.header}><p>{language === 'pt' ? 'Porquê a Vasto Império' : 'Why Vasto Império'}</p><h2 id="home-why-title">{title}</h2></header>
  <div className={s.list}>{items.map(card=>{const Icon=iconMap[card.icon];return <article key={card.title} className={s.item}><span className={s.icon}>{Icon&&<Icon aria-hidden="true"/>}</span><div><h3>{card.title}</h3><p>{card.subTitle}</p></div></article>;})}</div>
 </aside>;
}
