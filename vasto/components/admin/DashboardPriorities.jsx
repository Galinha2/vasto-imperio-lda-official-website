'use client';
import {useState} from 'react';
import Link from 'next/link';
import {IoArrowForwardOutline,IoAddOutline,IoCloudUploadOutline,IoChatbubblesOutline,IoWalletOutline,IoCubeOutline,IoTimeOutline,IoMailOutline,IoCallOutline,IoDocumentTextOutline} from 'react-icons/io5';
import {dashboardPriorities} from '@/lib/admin/dashboard-priorities.mjs';
import {salePeriodDate} from '@/lib/admin/sale-period.mjs';
import {useAdminChatUnread} from './AdminChatUnread';
import styles from './DashboardPriorities.module.css';
const tabs=[{id:'payment',label:'Pagamentos pendentes',icon:IoWalletOutline},{id:'delivery',label:'Por entregar',icon:IoCubeOutline},{id:'inactive',label:'Sem atualização há +14 dias',icon:IoTimeOutline,IoMailOutline,IoCallOutline,IoDocumentTextOutline}];
const emptyLabels={payment:'Não há pagamentos pendentes nas encomendas confirmadas.',delivery:'Todas as encomendas confirmadas estão entregues.',inactive:'Não há encomendas pendentes sem atualização há mais de 14 dias.',awaiting:'Não há orçamentos a aguardar resposta.',unsent:'Não há orçamentos a aguardar resposta sem envio de email registado.',missingContact:'Os registos em acompanhamento têm email ou telefone.',recent:'Não há novos registos nos últimos 7 dias.'};
const currency=new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'});
export default function DashboardPriorities({sales,loading,onImport,importing,onOpen}){
 const [active,setActive]=useState('payment');const [limit,setLimit]=useState(3);const {total}=useAdminChatUnread();
 const groups=dashboardPriorities(sales);const rows=groups[active];
 return <section className={`${styles.panel} admin-surface`} aria-labelledby="priorities-title">
  <header className={styles.header}><div><p className={styles.eyebrow}>O SEU DIA A DIA</p><h2 id="priorities-title">O que precisa de atenção</h2><p>Acompanhamento de todos os meses e anos</p></div><div className={styles.shortcuts}>
   <Link href="/admin/orcamentos"><IoAddOutline/>Novo orçamento</Link><button type="button" disabled={importing||loading} onClick={onImport}><IoCloudUploadOutline/>Importar PDF</button><Link href="/admin/conversas"><IoChatbubblesOutline/>Mensagens{total>0&&<span className={styles.unread}>{total}</span>}</Link>
  </div></header>
  <div role="tablist" aria-label="Pendências das encomendas" className={styles.tabs}>{tabs.map(({id,label,icon:Icon})=><button key={id} id={`priority-tab-${id}`} type="button" role="tab" aria-selected={active===id} aria-controls={`priority-panel-${id}`} onClick={()=>{setActive(id);setLimit(3);}}><Icon/>{label}<span>{loading?'—':groups[id].length}</span></button>)}</div>
  <div role="tabpanel" id={`priority-panel-${active}`} aria-labelledby={`priority-tab-${active}`} className={styles.body}>
   {active==='unsent'&&<p className={styles.hint}>Orçamentos a aguardar resposta, sem envio de email registado pelo painel. Envios feitos fora do site não aparecem neste registo.</p>}
   {active==='missingContact'&&<p className={styles.hint}>Registos em acompanhamento sem email nem telefone. Abra o orçamento para completar os contactos.</p>}
   {active==='payment'&&groups.deliveredUnpaid>0&&<p className={styles.hint}>{groups.deliveredUnpaid} {groups.deliveredUnpaid===1?'encomenda já entregue com pagamento pendente.':'encomendas já entregues com pagamento pendente.'} Aparecem primeiro.</p>}
   {loading?<p className={styles.empty}>A carregar as suas encomendas…</p>:!rows.length?<p className={styles.empty}>{emptyLabels[active]}</p>:<ul className={styles.list}>{rows.slice(0,limit).map(sale=><li key={sale.id}><button type="button" onClick={()=>onOpen(sale)}><div className={styles.customer}><strong>{sale.customerName}</strong><span>{sale.quoteNumber?`Orçamento ${sale.quoteNumber} · `:''}{new Date(`${salePeriodDate(sale)}T12:00:00`).toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</span></div><div className={styles.status}><span>{sale.status==='em_preparacao'?'A aguardar resposta':`${sale.paymentStatus==='pago'?'Pago':sale.paymentStatus==='entrada_paga'?'Entrada paga':'Por pagar'} · ${sale.deliveryStatus==='entregue'?'Entregue':'Por entregar'}`}</span><small>{currency.format(sale.total)} · Total com IVA</small></div><IoArrowForwardOutline aria-hidden="true"/></button></li>)}</ul>}
   {!loading&&rows.length>limit&&<button type="button" className={styles.more} onClick={()=>setLimit(n=>n+10)}>Mostrar mais {Math.min(10,rows.length-limit)} de {rows.length-limit} restantes</button>}
   {active==='payment'&&rows.length>0&&<p className={styles.footnote}>O valor apresentado é o total do orçamento; não representa o saldo em dívida após entradas.</p>}
  </div>
 </section>;
}
