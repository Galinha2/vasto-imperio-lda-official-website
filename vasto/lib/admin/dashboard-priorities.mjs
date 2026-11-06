import {isSaleInactive,lastSaleActivity} from './sale-activity.mjs';
export function dashboardPriorities(sales,now=Date.now()){
 const eligible=sales.filter(s=>!s.quoteNotSelected&&!s.mergedInto&&!s.mergeArchived);
 const confirmed=eligible.filter(s=>s.status==='confirmada');
 const awaiting=eligible.filter(s=>s.status==='em_preparacao');
 const pending=confirmed.filter(s=>s.paymentStatus!=='pago'||s.deliveryStatus!=='entregue');
 const oldestFirst=(a,b)=>(lastSaleActivity(a)??now)-(lastSaleActivity(b)??now)||String(a.id).localeCompare(String(b.id));
 return {
  payment:pending.filter(s=>s.paymentStatus!=='pago').sort((a,b)=>Number(b.deliveryStatus==='entregue')-Number(a.deliveryStatus==='entregue')||oldestFirst(a,b)),
  delivery:pending.filter(s=>s.deliveryStatus!=='entregue').sort(oldestFirst),
  inactive:pending.filter(s=>isSaleInactive(s,now)).sort(oldestFirst),
  awaiting:awaiting.sort(oldestFirst),
  unsent:awaiting.filter(s=>s.entryOrigin!=='cliente'&&!s.emailSentAt).sort(oldestFirst),
  missingContact:eligible.filter(s=>(s.status==='em_preparacao'||s.paymentStatus!=='pago'||s.deliveryStatus!=='entregue')&&!String(s.orderDetails?.email||'').trim()&&!String(s.customerPhone||s.orderDetails?.telefone||'').trim()).sort(oldestFirst),
  recent:eligible.filter(s=>{const time=Date.parse(s.uploadedAt);return Number.isFinite(time)&&time<=now&&now-time<=7*86400000;}).sort((a,b)=>Date.parse(b.uploadedAt)-Date.parse(a.uploadedAt)),
  deliveredUnpaid:pending.filter(s=>s.deliveryStatus==='entregue'&&s.paymentStatus!=='pago').length,
 };
}
